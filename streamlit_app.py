import io
from collections import defaultdict
from datetime import datetime

import openpyxl
from openpyxl.styles import PatternFill, Alignment
import streamlit as st
import requests  # <<< חדש – בשביל N8N


# ========= הגדרות N8N =========
# להחליף ל-Webhook האמיתי שלך ב-N8N
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
            # אם עוד לא בחרנו – נשמור ככותרת זמנית
            if not headers:
                chosen_row = row_idx
                headers = tmp_headers

    if chosen_row is None:
        # fallback – נניח שורה 1
        chosen_row = 1
        headers = {str(c.value).strip(): c.column for c in ws[1] if c.value}

    return chosen_row, headers


# ---------- הגדרת צבעים ----------

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


# ---------- קריאת קובץ אקסל עזר (מיילים) ----------

def build_email_mapping(helper_file):
    """
    בונה מילון {שם ספק/חשבון -> מייל} מקובץ אקסל עזר.
    מחפש עמודות כמו:
    - 'שם ספק' / 'תאור חשבון' / 'תיאור חשבון'
    - 'חשבון'
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
        # אין עמודת מייל – לא בונים כלום
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
    email_mapping – מילון אופציונלי {שם ספק/חשבון -> מייל} מאקסל עזר.
    """
    ws = wb.active  # נניח שהגיליון הראשון הוא המקור

    # זיהוי כותרות
    header_row, headers = detect_headers(ws)

    col_acc = headers.get("חשבון")          # מס ספק
    col_amt = headers.get("חוב לחשבונית")   # סכום לתשלום
    col_type = headers.get("סוג תנועה")     # סוג תנועה
    col_name = headers.get("תאור חשבון") or headers.get("שם ספק") or headers.get("תיאור חשבון")
    col_pay = headers.get("תאריך תשלום")    # תאריך תשלום

    if col_acc is None or col_amt is None:
        raise ValueError("לא נמצאו עמודות 'חשבון' ו/או 'חוב לחשבונית'. ודאי ששמות הכותרות כתובים בדיוק כך.")

    # ברירות מחדל, למקרה שאין עמודות שם ספק/תאריך
    if col_name is None:
        col_name = 3
    if col_pay is None:
        col_pay = 4

    data_start_row = header_row + 1  # השורה שאחרי הכותרת

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
            for ni, (nval, nrow) in enumerate(neg):
                if ni in used_neg:
                    continue
                if abs(pval + nval) < 1e-6:
                    # צביעה בירוק
                    prow[col_amt - 1].fill = GREEN_FILL
                    nrow[col_amt - 1].fill = GREEN_FILL
                    green_counts[acc] += 2
                    used_neg.add(ni)
                    break

    ensure_summary_sheet(wb, "התאמה 100%", green_counts)

    # ===== לוגיקה 3 – כתום 80% בתוך ספק =====
    orange_counts = defaultdict(int)

    for acc, rows in groups.items():
        pos, neg = [], []
        for r in rows:
            cell = r[col_amt - 1]
            if has_any_color(cell):
                continue
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
            pc = prow[col_amt - 1]
            if has_any_color(pc):
                continue
            for ni, (nval, nrow) in enumerate(neg):
                if ni in used_neg:
                    continue
                nc = nrow[col_amt - 1]
                if has_any_color(nc):
                    continue
                if abs(pval + nval) <= 2:  # סטייה עד 2 ש"ח
                    pc.fill = ORANGE_FILL
                    nc.fill = ORANGE_FILL
                    orange_counts[acc] += 2
                    used_neg.add(ni)
                    break

    ensure_summary_sheet(wb, "התאמה 80%", orange_counts)

    # ===== לוגיקה 5 – סגול גלובלי =====
    purple_counts = defaultdict(int)
    eligible = []

    for row in ws.iter_rows(min_row=data_start_row):
        cell = row[col_amt - 1]
        if has_any_color(cell):
            continue
        try:
            v = parse_amount(cell.value)
        except Exception:
            continue
        if v == 0:
            continue
        acc = row[col_acc - 1].value
        eligible.append((v, acc, row))

    pos = [x for x in eligible if x[0] > 0]
    neg = [x for x in eligible if x[0] < 0]

    used_pos, used_neg = set(), set()

    for pi, (pval, pacc, prow) in enumerate(pos):
        if pi in used_pos:
            continue
        pc = prow[col_amt - 1]
        if has_any_color(pc):
            continue
        for ni, (nval, nacc, nrow) in enumerate(neg):
            if ni in used_neg:
                continue
            nc = nrow[col_amt - 1]
            if has_any_color(nc):
                continue
            if abs(pval + nval) <= 2:
                pc.fill = PURPLE_FILL
                nc.fill = PURPLE_FILL
                used_pos.add(pi)
                used_neg.add(ni)
                purple_counts[pacc] += 1
                purple_counts[nacc] += 1
                break

    ensure_summary_sheet(wb, "בדיקת ספקים", purple_counts)

    # ===== לוגיקה 6 – כחול: סוג תנועה 'העב' =====
    rows_mail = []

    for row in ws.iter_rows(min_row=data_start_row):
        if col_type is None:
            continue
        tval = row[col_type - 1].value
        tval = str(tval).strip() if tval is not None else ""
        cell = row[col_amt - 1]
        if tval == "העב" and not has_any_color(cell):
            cell.fill = BLUE_FILL
            rows_mail.append(
                (
                    row[col_name - 1].value,   # שם ספק
                    row[col_pay - 1].value,    # תאריך תשלום
                    row[col_amt - 1].value,    # חוב לחשבונית
                    row[col_acc - 1].value,    # חשבון (לקישור למיילים)
                )
            )

    # ===== לוגיקה 7 – גיליון 'מיילים לספק' + טקסט מייל + מייל ספק =====
    if "מיילים לספק" in wb.sheetnames:
        ws_mail = wb["מיילים לספק"]
        for r in ws_mail.iter_rows():
            for c in r:
                c.value = None
    else:
        ws_mail = wb.create_sheet("מיילים לספק")

    ws_mail["A1"] = "שם ספק"
    ws_mail["B1"] = "תאריך תשלום"
    ws_mail["C1"] = "חוב לחשבונית"
    ws_mail["D1"] = "טקסט מייל"
    ws_mail["E1"] = "מייל ספק"   # <<< עמודת המייל החדשה מאקסל עזר

    company_name = ws["C1"].value if ws["C1"].value is not None else ""

    row_idx = 2
    for name, pay, debt, acc in rows_mail:
        ws_mail.cell(row_idx, 1, name)

        # עיבוד תאריך
        if isinstance(pay, datetime):
            date_str = pay.strftime("%d/%m/%y")
        else:
            date_str = str(pay) if pay is not None else ""
        ws_mail.cell(row_idx, 2, date_str)

        # סכום בפלוס
        try:
            amount = abs(parse_amount(debt))
        except Exception:
            amount = debt
        ws_mail.cell(row_idx, 3, amount)

        # טקסט מייל רב-שורי
        msg = (
            f"שלום ל-{name}\n"
            f"חסרה לנו חשבונית עבור תשלום:\n"
            f"תאריך - {date_str}\n"
            f"על סכום - {amount}\n"
            f"בתודה מראש,\n"
            f"הנהלת חשבונות של {company_name}"
        )
        cell_msg = ws_mail.cell(row_idx, 4, msg)
        cell_msg.alignment = Alignment(wrap_text=True)

        # מייל ספק מאקסל עזר (אם קיים)
        supplier_email = ""
        if email_mapping:
            # קודם לפי חשבון, אם יש
            if acc is not None:
                supplier_email = email_mapping.get(str(acc).strip(), "")
            # אם לא מצא – לפי שם ספק
            if not supplier_email and name is not None:
                supplier_email = email_mapping.get(str(name).strip(), "")

        if supplier_email:
            ws_mail.cell(row_idx, 5, supplier_email)

        row_idx += 1

    # RTL לכל הגיליונות
    for sh in wb.worksheets:
        sh.sheet_view.rightToLeft = True

    return wb


# ---------- שליחת טריגר ל-N8N ----------

def trigger_n8n(client_name: str):
    """
    שולח טריגר ל-N8N עם שם לקוח.
    ה-N8N מקבל JSON: { "client_name": "<השם שהוזן>" }
    """
    if not N8N_WEBHOOK_URL or "YOUR-N8N-DOMAIN" in N8N_WEBHOOK_URL:
        raise RuntimeError("לא הוגדרה כתובת Webhook אמיתית ל-N8N (N8N_WEBHOOK_URL).")

    payload = {
        "client_name": client_name,
        "action": "giyul_chovot",
    }
    resp = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=15)
    resp.raise_for_status()
    return resp


# ---------- אפליקציית Streamlit ----------

def main():
    st.set_page_config(
        page_title="אוטומציית גיול חובות",
        page_icon="📊",
        layout="wide",
    )

    st.title("📊 אוטומציית גיול חובות – לוגיקות 1–7 + טריגר ל-N8N")

    # ==== קלט ל-N8N ====
    st.subheader("טריגר ל-N8N לפי שם לקוח")
    client_name = st.text_input("שם לקוח / ספק עבור N8N (למשל: שוקי טל, אילן גינון וכו')")

    col_trig1, col_trig2 = st.columns([1, 4])
    with col_trig1:
        if st.button("שלח טריגר ל-N8N"):
            if not client_name.strip():
                st.warning("נא למלא שם לקוח לפני שליחת טריגר.")
            else:
                try:
                    trigger_n8n(client_name.strip())
                    st.success(f"נשלח טריגר ל-N8N עבור: {client_name}")
                except Exception as e:
                    st.error(f"שליחת הטריגר ל-N8N נכשלה: {e}")

    st.markdown("---")

    # ==== חלק גיול חובות באקסל ====
    st.subheader("עיבוד קובץ גיול חובות (אקסל)")

    uploaded_file = st.file_uploader("בחרי קובץ Excel גיול חובות", type=["xlsx"])

    # אקסל עזר עם מיילים (אופציונלי)
    helper_file = st.file_uploader(
        "קובץ אקסל עזר עם כתובות מייל של ספקים (אופציונלי)",
        type=["xlsx"],
        key="helper_excel"
    )

    if uploaded_file is None:
        st.info("🔼 בחרי קובץ גיול חובות כדי להריץ לוגיקות 1–7.")
        return

    if st.button("הפעל אוטומציה על הקובץ"):
        try:
            email_mapping = None
            if helper_file is not None:
                email_mapping = build_email_mapping(helper_file)

            wb = openpyxl.load_workbook(uploaded_file)
            wb = process_workbook(wb, email_mapping=email_mapping)

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            st.success("✅ האוטומציה הסתיימה בהצלחה! ניתן להוריד את הקובץ המעודכן.")
            st.download_button(
                label="⬇️ הורדת קובץ גיול מעודכן",
                data=output,
                file_name="גיול_אוטומציה_1-7.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )

        except Exception as e:
            st.error(f"❌ שגיאה בעיבוד הקובץ: {e}")


if __name__ == "__main__":
    main()
