import io
from collections import defaultdict
from datetime import datetime

import openpyxl
from openpyxl.styles import PatternFill, Alignment
import streamlit as st
import requests  # בשביל N8N


# ========= הגדרות N8N =========
# להחליף ל-Webhook האמיתי שלך ב-N8N אם צריך
N8N_WEBHOOK_URL = "https://riseelena.app.n8n.cloud/webhook/e134717f-c0ad-4e29-a354-1b6edbe1d1ce"


# ---------- כלי עזר ----------

def parse_amount(val):
    """המרת ערך לסכום מספרי (float) עם טיפול בריק ומפרידי אלפים."""
    if val is None or val == "":
        raise ValueError("empty")
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if s == "":
        raise ValueError("empty")
    s = s.replace(",", "")  # להסיר מפרידי אלפים
    return float(s)


def detect_headers(ws):
    """
    זיהוי שורת כותרות: מנסה שורה 1 ואז 2.
    מחזיר: (index של שורת כותרות, מילון {שם עמודה -> אינדקס עמודה})
    """
    candidates = [1, 2]
    chosen_row = None
    headers = {}

    for row_idx in candidates:
        row_cells = ws[row_idx]
        row_values = [str(c.value).strip() if c.value is not None else "" for c in row_cells]
        if any(v for v in row_values):
            tmp_headers = {str(c.value).strip(): c.column for c in ws[row_idx] if c.value}
            # עדיפות לשורה שיש בה גם "חשבון" וגם "חוב לחשבונית"
            if "חשבון" in tmp_headers and "חוב לחשבונית" in tmp_headers:
                chosen_row = row_idx
                headers = tmp_headers
                break
            if not headers:
                chosen_row = row_idx
                headers = tmp_headers

    if chosen_row is None:
        chosen_row = 1
        headers = {str(c.value).strip(): c.column for c in ws[1] if c.value}

    return chosen_row, headers


# ---------- צבעים ----------

GREEN_RGB = "FF00FF00"   # ירוק
ORANGE_RGB = "FFFFA500"  # כתום
PURPLE_RGB = "FFCC99FF"  # סגול
BLUE_RGB = "FFADD8E6"    # כחול

GREEN_FILL = PatternFill(start_color=GREEN_RGB, end_color=GREEN_RGB, fill_type="solid")
ORANGE_FILL = PatternFill(start_color=ORANGE_RGB, end_color=ORANGE_RGB, fill_type="solid")
PURPLE_FILL = PatternFill(start_color=PURPLE_RGB, end_color=PURPLE_RGB, fill_type="solid")
BLUE_FILL = PatternFill(start_color=BLUE_RGB, end_color=BLUE_RGB, fill_type="solid")


def cell_rgb(cell):
    try:
        return cell.fill.start_color.rgb
    except Exception:
        return None


def has_any_color(cell):
    """בודק אם לתא יש אחד מהצבעים של הלוגיקות."""
    return cell.fill.fill_type == "solid" and cell_rgb(cell) in {
        GREEN_RGB,
        ORANGE_RGB,
        PURPLE_RGB,
        BLUE_RGB,
    }


# ---------- גיליון סיכום ----------

def ensure_summary_sheet(wb, title, counts):
    """יצירה/ניקוי גיליון סיכום והזנת נתונים."""
    if title in wb.sheetnames:
        ws_sum = wb[title]
        for row in ws_sum.iter_rows():
            for c in row:
                c.value = None
    else:
        ws_sum = wb.create_sheet(title)

    ws_sum["A1"] = "מס ספק"
    ws_sum["B1"] = "כמות שורות מותאמות"

    r = 2
    for acc, cnt in counts.items():
        if acc is None or cnt <= 0:
            continue
        ws_sum.cell(r, 1, acc)
        ws_sum.cell(r, 2, cnt)
        r += 1


# ---------- קריאת אקסל עזר (מיילים) ----------

def build_email_mapping(helper_file):
    """
    בונה מילון {חשבון/שם ספק -> מייל} מקובץ עזר.
    מחפש עמודות:
    - 'חשבון' / 'מס ספק'
    - 'שם ספק' / 'תאור חשבון' / 'תיאור חשבון'
    - 'מייל' / 'מייל ספק' / 'Email' / 'E-mail'
    """
    wb_help = openpyxl.load_workbook(helper_file, data_only=True)
    ws_help = wb_help.active

    header_row, headers = detect_headers(ws_help)

    col_acc = headers.get("חשבון") or headers.get("מס ספק")
    col_name = headers.get("שם ספק") or headers.get("תאור חשבון") or headers.get("תיאור חשבון")
    col_email = (
        headers.get("מייל")
        or headers.get("מייל ספק")
        or headers.get("Email")
        or headers.get("E-mail")
    )

    email_map = {}

    if col_email is None:
        return email_map

    # לפי חשבון
    if col_acc is not None:
        for row in ws_help.iter_rows(min_row=header_row + 1):
            acc = row[col_acc - 1].value
            email = row[col_email - 1].value
            if acc and email:
                email_map[str(acc).strip()] = str(email).strip()

    # לפי שם ספק
    if col_name is not None:
        for row in ws_help.iter_rows(min_row=header_row + 1):
            name = row[col_name - 1].value
            email = row[col_email - 1].value
            if name and email:
                email_map[str(name).strip()] = str(email).strip()

    return email_map


# ---------- לוגיקות 1–7 ----------

def process_workbook(wb, email_mapping=None):
    """
    מריץ על ה-Workbook את כל הלוגיקות 1–7.
    email_mapping – מילון אופציונלי {חשבון/שם ספק -> מייל}.
    """
    ws = wb.active  # הגיליון הראשון הוא המקור

    # זיהוי כותרות
    header_row, headers = detect_headers(ws)

    col_acc = headers.get("חשבון")          # מס ספק
    col_amt = headers.get("חוב לחשבונית")   # סכום לתשלום
    col_type = headers.get("סוג תנועה")     # סוג תנועה
    col_name = headers.get("תאור חשבון") or headers.get("שם ספק") or headers.get("תיאור חשבון")
    col_pay = headers.get("תאריך תשלום")    # תאריך תשלום

    if col_acc is None or col_amt is None:
        raise ValueError("לא נמצאו עמודות 'חשבון' ו/או 'חוב לחשבונית'.")

    if col_name is None:
        col_name = 3
    if col_pay is None:
        col_pay = 4

    data_start_row = header_row + 1

    # שם החברה לכותרת מייל
    company_name = ws["C1"].value if ws["C1"].value is not None else ""

    # ===== לוגיקה 1 – ירוק 100% בתוך ספק =====
    groups = defaultdict(list)
    for row in ws.iter_rows(min_row=data_start_row):
        acc = row[col_acc - 1].value
        groups[acc].append(row)

    green_counts = defaultdict(int)

    for acc, rows in groups.items():
        pos, neg = [], []
        for r in rows:
            cell = r[col_amt - 1]
            try:
                v = parse_amount(cell.value)
            except Exception:
                continue
            if v > 0:
                pos.append((v, r))
            elif v < 0:
                neg.append((v, r))

        used_neg = set()
        for pval, prow in pos:
