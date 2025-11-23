import io
import logging
from urllib.parse import quote

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, PlainTextResponse
import openpyxl

from giyul_logic import process_workbook


# ───────────────── ЛОГИРОВАНИЕ ─────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("giyul")

# ───────────────── ПРИЛОЖЕНИЕ ─────────────────
app = FastAPI(title="Giyul Chovot Processor")


@app.get("/", response_class=PlainTextResponse)
async def root():
    """Простой health-check для Render / браузера."""
    return "Giyul Chovot Processor is running"


@app.post("/process")
async def process_excel(file: UploadFile = File(...)):
    """
    Принимает Excel-файл, запускает все логики 1–7
    и возвращает обработанный Excel.
    """
    logger.info("Received file: %s (%s)", file.filename, file.content_type)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл не имеет имени")

    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=400,
            detail="Нужен файл Excel (.xlsx / .xlsm)",
        )

    # Читаем и обрабатываем книгу
    try:
        contents = await file.read()
        logger.info("File size: %d bytes", len(contents))

        wb = openpyxl.load_workbook(io.BytesIO(contents))
        wb = process_workbook(wb)
    except HTTPException:
        # Уже корректно сформированный HTTP-ответ
        raise
    except Exception as e:
        logger.exception("Ошибка при обработке файла")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки файла: {e}")

    # Сохраняем результат в память
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # Формируем имя файла результата
    original_name = file.filename.rsplit("/", 1)[-1]  # если клиент прислал путь
    base, _dot, _ext = original_name.partition(".")
    out_name = f"{base}_processed.xlsx"

    # ───────────────── ФИКС ИВРИТА В ЗАГОЛОВКЕ ─────────────────
    # Starlette кодирует заголовки в latin-1, поэтому напрямую иврит ломает всё.
    # Делаем ASCII-fallback + корректный UTF-8 вариант по RFC 5987.
    ascii_name = "processed.xlsx"          # безопасное имя
    utf8_name = quote(out_name)            # кодируем оригинальное имя

    headers = {
        "Content-Disposition": (
            f"attachment; filename={ascii_name}; "
            f"filename*=UTF-8''{utf8_name}"
        )
    }

    logger.info("Sending processed file as: %s", out_name)

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers=headers,
    )
