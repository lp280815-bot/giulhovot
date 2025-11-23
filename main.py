# main.py
import io
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import openpyxl

from giyul_logic import process_workbook

# לוגים של uvicorn מגיעים ל-Render
logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Giyul Chovot Processor")


@app.post("/process")
async def process_excel(file: UploadFile = File(...)):
    logger.info("=== קיבלתי בקשה ל־/process ===")
    logger.info(f"שם קובץ שהתקבל: {file.filename}")

    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        logger.error("הקובץ אינו קובץ Excel תקין")
        raise HTTPException(status_code=400, detail="Нужен файл Excel (.xlsx / .xlsm)")

    contents = await file.read()
    logger.info(f"גודל הקובץ שהתקבל: {len(contents)} bytes")

    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
        logger.info(f"גליונות בקובץ: {wb.sheetnames}")

        wb = process_workbook(wb)
        logger.info("process_workbook הסתיים בלי שגיאה")

    except Exception as e:
        logger.exception("❌ שגיאה בזמן עיבוד הקובץ")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки файла: {e}")

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    out_name = file.filename.rsplit(".", 1)[0] + "_processed.xlsx"
    logger.info(f"מעביר קובץ מעובד בשם: {out_name}")

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )
