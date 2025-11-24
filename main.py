from flask import Flask, request, jsonify
import pandas as pd
import io

app = Flask(__name__)

@app.route('/process', methods=['POST'])
def process_files():
    try:
        # Файлы ИМЕННО file1 и file2 !!!
        if 'file1' not in request.files or 'file2' not in request.files:
            return jsonify({"error": "Missing file1 or file2"}), 400

        file1 = request.files['file1']   # גיול חובות
        file2 = request.files['file2']   # קובץ מיילים

        # Читаем Excel
        df1 = pd.read_excel(file1)
        df2 = pd.read_excel(file2)

        # Требуемые названия колонок
        required_cols = [
            "מטבע", "חשבון", "תאור חשבון", "תאריך תשלום", "ימי פיגור",
            "חשבונית", "חש. ספק", "סוג תנועה", "תאריך חשבונית", "פרטים",
            "מזהה מובנה", "סכום החשבונית", "חוב לחשבונית"
        ]

        missing = [c for c in required_cols if c not in df1.columns]
        if missing:
            return jsonify({
                "error": "Не найдены колонки",
                "missing": missing,
                "found": list(df1.columns)
            }), 400

        # Соединяем по "חש. ספק"
        if "חש. ספק" not in df1.columns or "חש. ספק" not in df2.columns:
            return jsonify({"error": "В файле нет колонки 'חש. ספק' для объединения"}), 400

        df = df1.merge(df2, on="חש. ספק", how="left")

        # Возвращаем Excel
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False)
        buffer.seek(0)

        return buffer.getvalue(), 200, {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": "attachment; filename=processed.xlsx"
        }

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "giulhovot", "message": "service is alive"})
