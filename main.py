import io
from collections import defaultdict
from datetime import datetime
from typing import Optional

import openpyxl
from openpyxl.styles import PatternFill, Alignment
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse


# ================== FASTAPI APP ==================

app = FastAPI(title="GiulHovot N8N Processor")


@app.get("/")
async def root():
    return {"status": "ok", "service": "giulhovot", "message": "service is alive"}


# ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

GREEN_RGB = "FF00FF00"
ORANGE_RGB = "FFFFA500"
PURPLE_RGB = "FFCC99FF"
BLUE_RGB = "FFADD8E6"

GREEN_FILL = PatternFill(start_color=GREEN_RGB, end_color=GREEN_RGB, fill_type="solid")
ORANGE_FILL = PatternFill(start_color=ORANGE_RGB, end_color=ORANGE_RGB, fill_type="solid")
PURPLE_FILL = PatternFill(start_color=PURPLE_RGB, end_color=PURPLE_RGB, fill_type="solid")
BLUE_FILL = PatternFill(start_color=BLUE_RGB, end_color=BLUE_RGB, fill_type="solid")


def parse_amount(val):
    """Превращаем значение в float, игнорируя пустые/строковые с запятыми."""
    if val is None or val == "":
        raise ValueError("empty")
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s:
        raise ValueError("empty")
    s = s.replace(",", "")
    return float(s)


def detect_headers(ws):
    """
    Находим строку заголовков.
    Возвращает (номер строки, {имя_колонки: номер_колонки}).
    """
    candidates = [1, 2]
    chosen_row = None
    headers = {}

    for row_idx in candidates:
        row_cells = ws[row_idx]
        row_values = [str(c.value).strip() if c.value is not None else "" for c in row_cells]
        if any(row_values):
            tmp = {str(c.value).strip(): c.column for c in ws[row_idx] if c.value}
            chosen_row = row_idx
            headers = tmp
            break

    if chosen_row is None:
        chosen_row = 1
        headers = {str(c.value).strip(): c.column for c in ws[1] if c.value}

    return chosen_row, headers


def has_any_color(cell):
    return (
        cell.fill.fill_type == "solid"
        and cell.fill.start_color is not None
        and cell.fill.start_color.rgb in {GREEN_RGB, ORANGE_RGB, PURPLE_RGB, BLUE_RGB}
    )


def ensure_summary_sheet(wb, title, counts):
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


def build_email_mapping_from_bytes(helper_bytes: Optional[bytes]):
    """
    Книга с мейлами → {счёт/имя: email}
    """
    if not helper_bytes:
        return {}

    helper_file = io.BytesIO(helper_bytes)
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

    if col_acc is not None:
        for row in ws_help.iter_rows(min_row=header_row + 1):
            acc = row[col_acc - 1].value
            email = row[col_email - 1].value
            if acc and email:
                email_map[str(acc).strip()] = str(email).strip()

    if col_name is not None:
        for row in ws_help.iter_rows(min_row=header_row + 1):
            name = row[col_name - 1].value
            email = row[col_email - 1].value
            if name and email:
                email_map[str(name).strip()] = str(email).strip()

    return email_map


def process_workbook(wb, email_mapping=None):
    """
    Основная логика 1–7 по книге гиюля.
    email_mapping – {счёт или имя: email}, может быть None.
    """
    ws = wb.active

    header_row, headers = detect_headers(ws)

    col_acc = headers.get("חשבון")
    col_amt = headers.get("חוב לחשבונית")
    col_type = headers.get("סוג תנועה")
    col_name = headers.get("תאור חשבון") or headers.get("שם ספק") or headers.get("תיאור חשבון")
    col_pay = headers.get("תאריך תשלום")

    if col_acc is None or col_amt is None:
        raise ValueError("Не найдены колонки 'חשבון' или 'חוב לחשבונית'")

    if col_name is None:
        col_name = 3
    if col_pay is None:
        col_pay = 4

    data_start_row = header_row + 1
    company_name = ws["C1"].value if ws["C1"].value is not None else ""

    # ===== ЛОГИКА 1 – 100% внутри поставщика =====
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
                    prow[col_amt - 1].fill = GREEN_FILL
                    nrow[col_amt - 1].fill = GREEN_FILL
                    green_counts[acc] += 2
                    used_neg.add(ni)
                    break

    ensure_summary_sheet(wb, "התאמה 100%", green_counts)

    # ===== ЛОГИКА 3 – 80% внутри поставщика =====
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
                if abs(pval + nval) <= 2:
                    pc.fill = ORANGE_FILL
                    nc.fill = ORANGE_FILL
                    orange_counts[acc] += 2
                    used_neg.add(ni)
                    break

    ensure_summary_sheet(wb, "התאמה 80%", orange_counts)

    # ===== ЛОГИКА 5 – 80% глобально =====
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

    # ===== ЛОГИКА 6–7 – лист "מיילים לספק" =====
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
                    row[col_name - 1].value,
                    row[col_pay - 1].value,
                    row[col_amt - 1].value,
                    row[col_acc - 1].value,
                )
            )

    grouped_mail = defaultdict(list)
    for name, pay, debt, acc in rows_mail:
        grouped_mail[str(acc).strip()].append((name, pay, debt))

    if "מיילים לספק" in wb.sheetnames:
        ws_mail = wb["מיילים לספק"]
        for r in ws_mail.iter_rows():
            for c in r:
                c.value = None
    else:
        ws_mail = wb.create_sheet("מיילים לספק")

    ws_mail["A1"] = "שם ספק"
    ws_mail["B1"] = "טקסט מייל"
    ws_mail["C1"] = "מייל ספק"

    row_idx = 2
    for acc, entries in grouped_mail.items():
        name = entries[0][0]
        lines = []
        for _, pay, debt in entries:
            if isinstance(pay, datetime):
                date_str = pay.strftime("%d/%m/%y")
            else:
                date_str = str(pay) if pay else ""
            try:
                amount = abs(parse_amount(debt))
            except Exception:
                amount = debt
            lines.append(f"תאריך - {date_str}\nעל סכום - {amount}")

        combined_details = "\n".join(lines)
        msg = (
            f"שלום ל-{name}\n"
            f"חסרות לנו חשבוניות עבור תשלום:\n"
            f"{combined_details}\n"
            f"בתודה מראש,\n"
            f"הנהלת חשבונות של {company_name}"
        )

        ws_mail.cell(row_idx, 1, name)
        cell_msg = ws_mail.cell(row_idx, 2, msg)
        cell_msg.alignment = Alignment(wrap_text=True)

        supplier_email = ""
        if email_mapping:
            supplier_email = email_mapping.get(acc, "")
            if not supplier_email and name:
                supplier_email = email_mapping.get(str(name).strip(), "")
        if supplier_email:
            ws_mail.cell(row_idx, 3, supplier_email)

        row_idx += 1

    # RTL для всех листов
    for sh in wb.worksheets:
        sh.sheet_view.rightToLeft = True

    return wb


# ================== ЭНДПОИНТ ДЛЯ N8N ==================

@app.post("/process")
async def process_endpoint(
    file1: UploadFile = File(..., description="Основной файл гיול חובות"),
    file2: Optional[UploadFile] = File(None, description="Файл мיילים (опционально)"),
):
    """
    Принимает:
      - file1: обязательный XLSX гиюля
      - file2: опциональный XLSX с мейлами
    Возвращает готовый XLSX.
    """
    try:
        main_bytes = await file1.read()
        helper_bytes = await file2.read() if file2 is not None else None

        email_mapping = build_email_mapping_from_bytes(helper_bytes)

        wb = openpyxl.load_workbook(io.BytesIO(main_bytes), data_only=True)
        wb = process_workbook(wb, email_mapping=email_mapping)

        out_buf = io.BytesIO()
        wb.save(out_buf)
        out_buf.seek(0)

        filename = "giul_automatia_1-7.xlsx"

        return StreamingResponse(
            out_buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
