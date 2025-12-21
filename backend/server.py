import io
import os
import logging
import uuid
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional

import openpyxl
from openpyxl.styles import PatternFill, Alignment
import requests
import aiofiles

from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========= N8N Configuration =========
N8N_WEBHOOK_URL = "https://riseelena.app.n8n.cloud/webhook/giulhovot-ijeaen7cc8ruf8ncxnr88d"

# ========= Colors Configuration =========
GREEN_RGB = "FF00FF00"
ORANGE_RGB = "FFFFA500"
PURPLE_RGB = "FFCC99FF"
BLUE_RGB = "FFADD8E6"

GREEN_FILL = PatternFill(start_color=GREEN_RGB, end_color=GREEN_RGB, fill_type="solid")
ORANGE_FILL = PatternFill(start_color=ORANGE_RGB, end_color=ORANGE_RGB, fill_type="solid")
PURPLE_FILL = PatternFill(start_color=PURPLE_RGB, end_color=PURPLE_RGB, fill_type="solid")
BLUE_FILL = PatternFill(start_color=BLUE_RGB, end_color=BLUE_RGB, fill_type="solid")


# ========= Pydantic Models =========
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierCreate(BaseModel):
    account_number: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class SupplierUpdate(BaseModel):
    account_number: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ProcessingHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    green_matches: int = 0
    orange_matches: int = 0
    purple_matches: int = 0
    blue_matches: int = 0
    total_rows: int = 0
    status: str = "completed"

class N8NTriggerRequest(BaseModel):
    client_name: str

class ProcessingStats(BaseModel):
    green_matches: int = 0
    orange_matches: int = 0
    purple_matches: int = 0
    blue_matches: int = 0
    total_rows: int = 0
    emails_generated: int = 0


# ========= Helper Functions =========
def parse_amount(val):
    """Convert value to numeric amount (float) with handling for empty and thousands separators."""
    if val is None or val == "":
        raise ValueError("empty")
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if s == "":
        raise ValueError("empty")
    s = s.replace(",", "")
    return float(s)


def detect_headers(ws):
    """Detect header row: tries row 1 then row 2."""
    candidates = [1, 2]
    chosen_row = None
    headers = {}

    for row_idx in candidates:
        row_cells = ws[row_idx]
        row_values = [str(c.value).strip() if c.value is not None else "" for c in row_cells]
        if any(v for v in row_values):
            tmp_headers = {str(c.value).strip(): c.column for c in ws[row_idx] if c.value}
            if "חשבון" in tmp_headers and "חוב לחשבונית" in tmp_headers:
                chosen_row = row_idx
                headers = tmp_headers
                break
            if not headers:
                chosen_row = row_idx
                headers = tmp_headers

    if chosen_row is None:
        chosen_row = 1
        headers = {str(c.value).strip(): c.column for c in ws[1] if c.value}

    return chosen_row, headers


def cell_rgb(cell):
    try:
        return cell.fill.start_color.rgb
    except Exception:
        return None


def has_any_color(cell):
    """Check if cell has one of the logic colors."""
    return cell.fill.fill_type == "solid" and cell_rgb(cell) in {
        GREEN_RGB, ORANGE_RGB, PURPLE_RGB, BLUE_RGB
    }


def ensure_summary_sheet(wb, title, counts):
    """Create/clean summary sheet and populate data."""
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


def build_email_mapping(helper_wb):
    """Build dictionary {account/supplier name -> email} from helper file."""
    ws_help = helper_wb.active
    header_row, headers = detect_headers(ws_help)

    col_acc = headers.get("חשבון") or headers.get("מס ספק")
    col_name = headers.get("שם ספק") or headers.get("תאור חשבון") or headers.get("תיאור חשבון")
    col_email = (
        headers.get("מייל") or headers.get("מייל ספק") or 
        headers.get("Email") or headers.get("E-mail")
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
    """Run all logics 1-7 on the workbook."""
    ws = wb.active
    header_row, headers = detect_headers(ws)

    col_acc = headers.get("חשבון")
    col_amt = headers.get("חוב לחשבונית")
    col_type = headers.get("סוג תנועה")
    col_name = headers.get("תאור חשבון") or headers.get("שם ספק") or headers.get("תיאור חשבון")
    col_pay = headers.get("תאריך תשלום")

    if col_acc is None or col_amt is None:
        raise ValueError("לא נמצאו עמודות 'חשבון' ו/או 'חוב לחשבונית'.")

    if col_name is None:
        col_name = 3
    if col_pay is None:
        col_pay = 4

    data_start_row = header_row + 1
    company_name = ws["C1"].value if ws["C1"].value is not None else ""

    # Statistics
    stats = ProcessingStats()

    # ===== Logic 1 - Green 100% within supplier =====
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
    stats.green_matches = sum(green_counts.values())

    # ===== Logic 3 - Orange 80% within supplier =====
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
    stats.orange_matches = sum(orange_counts.values())

    # ===== Logic 5 - Purple global =====
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
    stats.purple_matches = sum(purple_counts.values())

    # ===== Logic 6 - Blue: transaction type 'העב' + collect for emails =====
    rows_mail = []

    for row in ws.iter_rows(min_row=data_start_row):
        if col_type is None:
            continue
        tval = row[col_type - 1].value
        tval = str(tval).strip() if tval is not None else ""
        cell = row[col_amt - 1]
        if tval == "העב" and not has_any_color(cell):
            cell.fill = BLUE_FILL
            rows_mail.append((
                row[col_name - 1].value,
                row[col_pay - 1].value,
                row[col_amt - 1].value,
                row[col_acc - 1].value,
            ))

    stats.blue_matches = len(rows_mail)

    # ===== Logic 7 - Emails sheet grouped by account =====
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

    stats.emails_generated = row_idx - 2

    # RTL for all sheets
    for sh in wb.worksheets:
        sh.sheet_view.rightToLeft = True

    # Count total rows
    stats.total_rows = ws.max_row - header_row

    return wb, stats


# ========= API Routes =========

@api_router.get("/")
async def root():
    return {"message": "RISE Pro - Debt Aging Automation API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ========= Supplier Management =========

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier: SupplierCreate):
    supplier_obj = Supplier(**supplier.model_dump())
    doc = supplier_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.suppliers.insert_one(doc)
    return supplier_obj


@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers():
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    for s in suppliers:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if isinstance(s.get('updated_at'), str):
            s['updated_at'] = datetime.fromisoformat(s['updated_at'])
    return suppliers


@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if isinstance(supplier.get('created_at'), str):
        supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    if isinstance(supplier.get('updated_at'), str):
        supplier['updated_at'] = datetime.fromisoformat(supplier['updated_at'])
    return supplier


@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, update: SupplierUpdate):
    existing = await db.suppliers.find_one({"id": supplier_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.suppliers.update_one({"id": supplier_id}, {"$set": update_data})
    return await get_supplier(supplier_id)


@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted successfully"}


# ========= Processing History =========

@api_router.get("/processing-history", response_model=List[ProcessingHistory])
async def get_processing_history():
    history = await db.processing_history.find({}, {"_id": 0}).sort("processed_at", -1).to_list(100)
    for h in history:
        if isinstance(h.get('processed_at'), str):
            h['processed_at'] = datetime.fromisoformat(h['processed_at'])
    return history


# ========= N8N Trigger =========

@api_router.post("/trigger-n8n")
async def trigger_n8n(request: N8NTriggerRequest):
    if not N8N_WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="N8N Webhook URL not configured")
    
    payload = {
        "client_name": request.client_name,
        "action": "giyul_chovot",
    }
    
    try:
        resp = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=15)
        resp.raise_for_status()
        return {"success": True, "message": f"Trigger sent for: {request.client_name}"}
    except Exception as e:
        logger.error(f"N8N trigger failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger N8N: {str(e)}")


# ========= File Processing =========

@api_router.post("/process-excel")
async def process_excel(
    main_file: UploadFile = File(...),
    helper_file: Optional[UploadFile] = File(None)
):
    """Process debt aging Excel file with all logics."""
    try:
        # Read main file
        main_content = await main_file.read()
        wb = openpyxl.load_workbook(io.BytesIO(main_content))
        
        # Build email mapping if helper file provided
        email_mapping = None
        if helper_file:
            helper_content = await helper_file.read()
            helper_wb = openpyxl.load_workbook(io.BytesIO(helper_content), data_only=True)
            email_mapping = build_email_mapping(helper_wb)
        
        # Process workbook
        wb, stats = process_workbook(wb, email_mapping=email_mapping)
        
        # Save processing history
        history = ProcessingHistory(
            filename=main_file.filename or "unknown.xlsx",
            green_matches=stats.green_matches,
            orange_matches=stats.orange_matches,
            purple_matches=stats.purple_matches,
            blue_matches=stats.blue_matches,
            total_rows=stats.total_rows
        )
        history_doc = history.model_dump()
        history_doc['processed_at'] = history_doc['processed_at'].isoformat()
        await db.processing_history.insert_one(history_doc)
        
        # Save to buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Return file
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=processed_{main_file.filename}",
                "X-Stats-Green": str(stats.green_matches),
                "X-Stats-Orange": str(stats.orange_matches),
                "X-Stats-Purple": str(stats.purple_matches),
                "X-Stats-Blue": str(stats.blue_matches),
                "X-Stats-Total": str(stats.total_rows),
                "X-Stats-Emails": str(stats.emails_generated),
                "Access-Control-Expose-Headers": "X-Stats-Green,X-Stats-Orange,X-Stats-Purple,X-Stats-Blue,X-Stats-Total,X-Stats-Emails,Content-Disposition"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@api_router.post("/preview-excel")
async def preview_excel(file: UploadFile = File(...)):
    """Preview first few rows of uploaded Excel file."""
    try:
        content = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        ws = wb.active
        
        header_row, headers = detect_headers(ws)
        
        # Get first 10 data rows
        preview_data = []
        row_count = 0
        for row in ws.iter_rows(min_row=header_row + 1, max_row=header_row + 11):
            row_data = {}
            for header, col_idx in headers.items():
                cell_value = row[col_idx - 1].value
                if isinstance(cell_value, datetime):
                    cell_value = cell_value.strftime("%d/%m/%Y")
                row_data[header] = cell_value
            preview_data.append(row_data)
            row_count += 1
        
        total_rows = ws.max_row - header_row
        
        return {
            "headers": list(headers.keys()),
            "preview": preview_data,
            "total_rows": total_rows,
            "header_row": header_row
        }
        
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=f"Error previewing file: {str(e)}")


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Stats-Green", "X-Stats-Orange", "X-Stats-Purple", "X-Stats-Blue", "X-Stats-Total", "X-Stats-Emails", "Content-Disposition"]
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
