import io
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple, Optional

import openpyxl
from openpyxl.styles import Alignment, PatternFill
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse

# =========================================================
#                    FASTAPI APP
# =========================================================

app = FastAPI(title="GiulHovot N8N Processor")


# ---------------------------------------------------------
#  Utils: header detection & helpers
# ---------------------------------------------------------


def normalize_header(value: Optional[str]) -> Optional[str]:
    """Normalize header text (strip spaces, convert to str)."""
    if value is None:
        return None
    return str(value).strip()


def detect_headers(ws, max_search_rows: int = 10) -> Tuple[int, Dict[str, int]]:
    """
    Find header row in a worksheet.
    Returns: (header_row_index, headers_dict)
    headers_dict: {header_text: column_index (1-based)}
    """
    for row in ws.iter_rows(min_row=1, max_row=max_search_rows):
        headers: Dict[str, int] = {}
        for cell in row:
            text = normalize_header(cell.value)
            if text:
                headers[text] = cell.column  # 1-based
        # считаем строку заголовком, если есть хоть что-то кроме None
        if headers:
            return row[0].row, headers

    # если ничего не нашли — считаем первую строку заголовком
    first_row = next(ws.iter_rows(min_row=1, max_row=1))
    headers = {
        normalize_header(c.value): c.column
        for c in first_row
        if normalize_header(c.value)
    }
    return 1, headers


def find_first(headers: Dict[str, int], candidates: List[str]) -> Optional[int]:
    """
    Возвращает первый индекс колонки, имя которой есть в candidates.
    """
    for name in candidates:
        if name in headers:
            return headers[name]
    return None


def normalize_key(value: Optional[str]) -> Optional[str]:
    """Нормализация ключа для поиска по имени/счёту."""
    if value is None:
        return None
    return str(value).strip().lower()


# ---------------------------------------------------------
#  Core processing
# ---------------------------------------------------------


def build_email_map(ws_help) -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    Строим две мапы:
    1. email_by_acc[account]
    2. email_by_name[normalized_name]
    """
    header_row, headers = detect_headers(ws_help)

    acc_candidates = [
        "חשבון",
        "מס ספק",
        "מס ספק/לקוח",
        "חשבון ספק",
        "חשבון לקוח",
    ]
    name_candidates = [
        "שם ספק",
        "שם לקוח",
        "תאור חשבון",
        "תיאור חשבון",
    ]
    email_candidates = [
        "מייל",
        "מייל ספק",
        "Email",
        "E-mail",
        "email",
        "e-mail",
    ]

    col_acc = find_first(headers, acc_candidates)
    col_name = find_first(headers, name_candidates)
    col_email = find_first(headers, email_candidates)

    email_by_acc: Dict[str, str] = {}
    email_by_name: Dict[str, str] = {}

    # если нет колонки email — возвращаем пустые мапы
    if col_email is None:
        return email_by_acc, email_by_name

    for row in ws_help.iter_rows(min_row=header_row + 1):
        email_cell = row[col_email - 1].value
        if not email_cell:
            continue
        email = str(email_cell).strip()

        if col_acc is not None:
            acc_val = row[col_acc - 1].value
            if acc_val:
                key_acc = normalize_key(acc_val)
                email_by_acc[key_acc] = email

        if col_name is not None:
            name_val = row[col_name - 1].value
            if name_val:
                key_name = normalize_key(name_val)
                email_by_name[key_name] = email

    return email_by_acc, email_by_name


def process_workbooks(file1_bytes: bytes, file2_bytes: Optional[bytes]) -> io.BytesIO:
    """
    Основная логика:
    - file1: гיול חובות
    - file2: файл мейлов (опционально)
    Возвращает BytesIO с новым Excel.
    """
    # --- загружаем книги ---
    wb_giul = openpyxl.load_workbook(io.BytesIO(file1_bytes), data_only=True)
    ws_giul = wb_giul.active

    email_by_acc: Dict[str, str] = {}
    email_by_name: Dict[str, str] = {}

    if file2_bytes:
        wb_help = openpyxl.load_workbook(io.BytesIO(file2_bytes), data_only=True)
        ws_help = wb_help.active
        email_by_acc, email_by_name = build_email_map(ws_help)

    # --- ищем заголовки в гיול ---
    header_row, headers = detect_headers(ws_giul)

    acc_candidates = [
        "חשבון",
        "מס ספק",
        "מס ספק/לקוח",
        "חשבון ספק",
        "חשבון לקוח",
    ]
    amt_candidates = [
        "חוב לחשבונית",
        "חוב החשבונית",   # как у тебя в некоторых קבצים
        "חוב החשבון",
        "יתרת חוב",
        "יתרה",
    ]
    name_candidates = [
        "שם ספק",
        "שם לקוח",
        "תאור חשבון",
        "תיאור חשבון",
    ]

    col_acc = find_first(headers, acc_candidates)
    col_amt = find_first(headers, amt_candidates)
    col_name = find_first(headers, name_candidates)

    if col_acc is None or col_amt is None:
        raise ValueError(
            "Не найдены колонки 'חשבון' или 'חוב לחשבונית/חוב החשבונית' "
            "в קובץ הגיול. "
            f"Заголовки, которые я ищу: {acc_candidates} / {amt_candidates}"
        )

    # --- создаём/ищем колонку для email ---
    max_col = ws_giul.max_column
    email_col_index = max_col + 1
    email_header_cell = ws_giul.cell(row=header_row, column=email_col_index)
    email_header_cell.value = "מייל"
    email_header_cell.alignment = Alignment(horizontal="center", vertical="center")
    email_header_cell.fill = PatternFill(
        start_color="FFE699", end_color="FFE699", fill_type="solid"
    )

    # --- обрабатываем строки гиюля ---
    for row in ws_giul.iter_rows(min_row=header_row + 1):
        acc_val = row[col_acc - 1].value
        debt_val = row[col_amt - 1].value

        # если нет долга – можно пропустить (по желанию)
        if debt_val in (None, 0, 0.0, ""):
            continue

        email_value: Optional[str] = None

        key_acc = normalize_key(acc_val) if acc_val is not None else None
        if key_acc and key_acc in email_by_acc:
            email_value = email_by_acc[key_acc]
        elif col_name is not None:
            name_val = row[col_name - 1].value
            key_name = normalize_key(name_val)
            if key_name and key_name in email_by_name:
                email_value = email_by_name[key_name]

        cell_email = row[email_col_index - 1]
        if email_value:
            cell_email.value = email_value
        else:
            cell_email.value = None  # или "" – как тебе удобнее

        cell_email.alignment = Alignment(horizontal="center", vertical="center")

    # --- готовим файл к отправке ---
    out_buf = io.BytesIO()
    wb_giul.save(out_buf)
    out_buf.seek(0)
    return out_buf


# =========================================================
#                    FASTAPI ENDPOINTS
# =========================================================

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "giulhovot",
        "message": "service is alive",
    }


@app.post("/process")
async def process_endpoint(
    file1: UploadFile = File(..., description="גיול חובות"),
    file2: Optional[UploadFile] = File(
        None, description="קובץ עזר עם מיילים (אופציונלי)"
    ),
):
    """
    Endpoint לקבלת שני קבצי Excel:
    - file1: גיול חובות
    - file2: קובץ מיילים (אופציונלי)
    מחזיר קובץ Excel מעובד.
    """
    try:
        file1_bytes = await file1.read()
        file2_bytes = await file2.read() if file2 is not None else None

        out_buf = process_workbooks(file1_bytes, file2_bytes)

        filename = "giul_automatia_1-7.xlsx"
        return StreamingResponse(
            out_buf,
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        # отправляем понятное сообщение об ошибке n8n-у
        return JSONResponse(
            {"error": str(e)},
            status_code=500,
        )
