import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

app = FastAPI()


@app.get("/")
async def healthcheck():
    """
    Простой health-check, чтобы видеть что сервис жив.
    """
    return {
        "status": "ok",
        "service": "giulhovot",
        "message": "service is alive"
    }


@app.post("/process")
async def process(
    file1: UploadFile = File(...),   # גיול חובות שוקי.N8N.xlsx
    file2: UploadFile = File(...),   # גיול חובות שוקי.N8N.מיילים.xlsx
):
    # ---------- 1. Читаем файлы ----------
    try:
        giyul = pd.read_excel(io.BytesIO(await file1.read()))
        emails = pd.read_excel(io.BytesIO(await file2.read()))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка чтения файлов: {e}"
        )

    # Нормализуем названия колонок
    giyul.columns = giyul.columns.astype(str).str.strip()
    emails.columns = emails.columns.astype(str).str.strip()

    # ---------- 2. Проверяем колонки в גיול ----------
    required_giyul = [
        "מטבע",
        "חשבון",
        "תאור חשבון",
        "תאריך תשלום",
        "ימי פיגור",
        "חשבונית",
        "חש. ספק",
        "סוג תנועה",
        "תאריך חשבונית",
        "פרטים",
        "מזהה מובנה",
        "סכום החשבונית",
        "חוב לחשבונית",
    ]

    missing = [c for c in required_giyul if c not in giyul.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"В גיול חסרות колонки: {', '.join(missing)}"
        )

    # ---------- 3. Находим колонку с e-mail ----------
    email_col = None
    possible_email_names = ["email", "Email", "E-mail", "e-mail", "מייל", "כתובת מייל"]

    for c in emails.columns:
        if any(p.lower() in c.lower() for p in possible_email_names):
            email_col = c
            break

    if email_col is None:
        raise HTTPException(
            status_code=400,
            detail="Во втором файле не найден столбец с email"
        )

    # ---------- 4. Общая колонка для соединения ----------
    join_candidates = ["חשבון", "מס ספק", "קוד ספק"]
    join_col = next(
        (c for c in join_candidates if c in giyul.columns and c in emails.columns),
        None
    )

    if join_col is None:
        raise HTTPException(
            status_code=400,
            detail="Нет общей колонки для соединения (ищу 'חשבון', 'מס ספק' или 'קוד ספק')"
        )

    # ---------- 5. Объединяем ----------
    result = giyul.merge(
        emails[[join_col, email_col]],
        on=join_col,
        how="left"
    )

    # ---------- 6. Отдаём готовый Excel ----------
    output = io.BytesIO()
    result.to_excel(output, index=False)
    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="giulhovot_result.xlsx"'
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
