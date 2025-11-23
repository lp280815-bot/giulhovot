# main.py
import io
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import openpyxl

from giyul_logic import process_workbook

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Giyul Chovot Processor")


@app.post("/process")
async def process_excel(file: UploadFile = File(...)):
    logging.info(f"📥 Received file: {file.filename}")

    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        logging.error("❌ Wrong file type")
        raise HTTPException(status_code=400, detail="Нужен файл Excel (.xlsx / .xlsm)")

    try:
        contents = await file.read()
        logging.info(f"📄 File size: {len(contents)} bytes")

        wb = openpyxl.load_workbook(io.BytesIO(contents))
        logging.info("📘 Workbook loaded successfully")

        wb = process_workbook(wb)
        logging.info("⚙️ Workbook processed successfully")

    except Exception as e:
        logging.exception("🔥 ERROR while processing the workbook")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки файла: {str(e)}")

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    out_name = file.filename.rsplit(".", 1)[0] + "_processed.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
    )
