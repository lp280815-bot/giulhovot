import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import io

app = FastAPI()


# --- Проверка, какой файл какой ---
def detect_file_type(df):
    cols = df.columns.astype(str)

    if "חשבון" in cols and "חוב לחשבונית" in cols:
        return "giyul"
    if "email" in cols or "מייל" in cols or "כתובת מייל" in cols:
        return "emails"
    return None


@app.post("/process")
async def process(file1: UploadFile = File(...), file2: UploadFile = File(...)):

    try:
        # Читаем оба файла в pandas
        df1 = pd.read_excel(io.BytesIO(await file1.read()))
        df2 = pd.read_excel(io.BytesIO(await file2.read()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка чтения файлов: {str(e)}")

    # Определяем что есть что
     # Файлы ИМЕННО file1 и file2 !!!
        if 'file1' not in request.files or 'file2' not in request.files:
            return jsonify({"error": "Missing file1 or file2"}), 400

        file1 = request.files['file1']   # גיול חובות
        file2 = request.files['file2']   # קובץ מיילים

    if type1 == type2:
        raise HTTPException(status_code=400, detail="Оба файла выглядят одинаковыми — не могу определить где גיול חובות и где מיילים")

    # Определение правильного назначения
    if type1 == "giyul":
        giyul = df1
        emails = df2
    else:
        giyul = df2
        emails = df1

    # Нормализация колонок
    giyul.columns = giyul.columns.astype(str).str.strip()
    emails.columns = emails.columns.astype(str).str.strip()

    # Проверяем нужные колонки
    required_giyul = ["חשבון", "חוב לחשבונית"]
    for col in required_giyul:
        if col not in giyul.columns:
            raise HTTPException(status_code=400,
                                detail=f"В גיול חסרה колонка '{col}'")

    # Находим колонку email автоматически
    email_col = None
    possible = ["email", "Email", "E-mail", "מייל", "כתובת מייל"]

    for c in emails.columns:
        if any(word in c for word in possible):
            email_col = c
            break

    if email_col is None:
        raise HTTPException(status_code=400, detail="Во втором файле не найден столбец email")

    # Соединение по номеру поставщика/счёта
    merge_cols = ["חשבון", "מס ספק", "קוד ספק"]

    join_col = None
    for col in merge_cols:
        if col in giyul.columns and col in emails.columns:
            join_col = col
            break

    if join_col is None:
        raise HTTPException(status_code=400,
                            detail="Нет общей колонки для соединения между файлами")

    # Объединение
    result = giyul.merge(emails[[join_col, email_col]], on=join_col, how="left")

    # Возвращаем результат
    return JSONResponse({
        "status": "ok",
        "message": "Файлы успешно обработаны",
        "rows": len(result),
        "columns": list(result.columns)
    })
