-- 061 (1.7.13): the paper the receipts are printed on - A4 (as before) or A5, an A4 sheet
-- cut in two (148 x 210 mm), which the clinic asked for on site (2026-11-09). Set in
-- Settings -> Clinic; read by the receipt windows (frontend Receipt.jsx). Only the
-- receipt, the itemised statement and the summary receipt follow it; every other
-- document stays A4.
ALTER TABLE clinic ADD COLUMN IF NOT EXISTS receipt_paper VARCHAR(4) NOT NULL DEFAULT 'A4';
ALTER TABLE clinic DROP CONSTRAINT IF EXISTS clinic_receipt_paper_check;
ALTER TABLE clinic ADD CONSTRAINT clinic_receipt_paper_check CHECK (receipt_paper IN ('A4', 'A5'));
