# Test Results - Payment Date Calculation Fix

## Context
Testing the fix for payment date calculation inconsistency between the "Create Payment List" modal and the "Ready for Payment" table.

## Business Logic
1. תאריך חשבונית + תנאי תשלום = תאריך בסיס (Invoice date + payment terms = base date)
2. התשלום תמיד ב-10 לחודש (Payment is always on the 10th of the month)
3. אם ה-10 כבר עבר - מעבירים לחודש הבא (If the 10th has already passed, move to next month)

## Payment Terms Mapping
- 01: שוטף (1 month)
- 02: שוטף + 15 (1 month)
- 03: שוטף + 30 (2 months)
- 04: שוטף + 45 (2 months)
- 05: שוטף + 60 (3 months)
- 06: שוטף + 90 (4 months)
- 07: שוטף + 120 (5 months)
- 08: מזומן (0 months - immediate)

## Test Scenarios to Verify
1. Create a supplier with payment terms "05" (שוטף + 60)
2. Process a file that creates rows in "special" category
3. Open Payment modal from special category
4. Verify payment date calculation in modal
5. Move item to "Ready for Payment"
6. Verify the SAME payment date appears in "Ready for Payment" table

## Critical Fix Applied
- Backend: `/api/move-row` now preserves `payment_terms` when moving rows
- Frontend: Unified `calculatePaymentDate` function used everywhere
- Backend: Both `generate-payment` and `export-ready-payment` endpoints use same logic

## Testing Protocol
Test the full end-to-end flow with specific payment terms to verify consistency.
