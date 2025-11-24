import io
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from openpyxl import load_workbook

# ⚠️ חשוב: בקובץ הזה ברֶפּו צריך להיות streamlit_app.py
# שבו מוגדרות הפונקציות build_email_mapping ו-process_workbook
from streamlit_app import build_email_mapping, process_workbook

app = FastAPI(title="giulhovot-n8n-service")

# לא חובה, אבל עוזר אם תרצי לגשת מהדפדפן / מכל מקום
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """
    בדיקה מהירה מהדפדפן – רק אומר שהשירות חי.
    """
    return {"status": "ok", "service": "giulhovot", "message": "service is alive"}


@app.get("/health")
async def health():
    """
    Healthcheck לרנדר / n8n.
    """
    return {"status": "healthy"}


@app.post("/process")
async def process_files(
    file1: UploadFile = File(..., description="קובץ גיול חובות"),
    file2: UploadFile = File(..., description="קובץ מיילים של ספקים"),
):
    """
    נקודת קצה ל-n8n:

    - file1 = גיול חובות (כמו ב-Streamlit)
    - file2 = קובץ אקסל עזר עם מיילים של ספקים

    הקוד:
    1. טוען את file1 ל-Workbook.
    2. בונה מיפוי מיילים מתוך file2 (build_email_mapping).
    3. מריץ על ה-Workbook את כל הלוגיקות 1–7 (process_workbook).
    4. מחזיר קובץ אקסל מעובד חזרה ל-n8n.
    """
    try:
        # --- קריאת הקבצים מה-request ---
        file1_bytes = await file1.read()
        file2_bytes = await file2.read()

        if not file1_bytes:
            raise HTTPException(status_code=400, detail="קובץ גיול חובות (file1) ריק או לא נקלט.")
        if not file2_bytes:
            raise HTTPException(status_code=400, detail="קובץ מיילים (file2) ריק או לא נקלט.")

        # --- טעינת Workbook של גיול חובות (file1) ---
        try:
            wb = load_workbook(io.BytesIO(file1_bytes), data_only=False)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"לא הצלחתי לקרוא את קובץ גיול החובות (file1) כ-Excel: {e}",
            )

        # --- בניית מיפוי המיילים מתוך file2 בעזרת הקוד הקיים ב-streamlit_app ---
        try:
            email_mapping = build_email_mapping(io.BytesIO(file2_bytes))
        except Exception as e:
            # אם יש טעות בכותרות / מבנה הקובץ – נחזיר 400 עם הסבר
            raise HTTPException(
                status_code=400,
                detail=f"שגיאה בקריאת קובץ המיילים (file2): {e}",
            )

        # --- הפעלת כל הלוגיקות 1–7 על ה-Workbook ---
        try:
            wb = process_workbook(wb, email_mapping=email_mapping)
        except HTTPException:
            # אם כבר הרמנו HTTPException בפנים – נעביר as-is
            raise
        except Exception as e:
            # כל שגיאה אחרת הופכת ל-400 עם טקסט מובן (לא 500 אנונימי ל-n8n)
            traceback.print_exc()
            raise HTTPException(
                status_code=400,
                detail=f"שגיאה בהרצת הלוגיקות על הקובץ: {e}",
            )

        # --- שמירת ה-Workbook לקובץ בזיכרון ---
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        # שם קובץ נחמד להורדה
        result_filename = "giulhovot_result.xlsx"

        return StreamingResponse(
            output,
            media_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            headers={"Content-Disposition": f'attachment; filename="{result_filename}"'},
        )

    except HTTPException:
        # כבר עטפנו עם הודעה ברורה
        raise
    except Exception as e:
        # כל דבר לא צפוי – 500 אמיתי, עם פירוט בטקסט (יעזור אם תראי בלוג של Render)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"},
        )
