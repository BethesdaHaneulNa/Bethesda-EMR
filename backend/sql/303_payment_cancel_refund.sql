-- 303 (payment): was the money handed back when a receipt was cancelled? (M6, decided (다) 2026-09-29)
--
-- In Madagascar patients pay cash, so an overcharge is settled by a correction that
-- hands back only the difference; cancelling a whole receipt is rare. When it does
-- happen the cashier is now asked "did you give the money back?":
--   refunded_amount  the cash handed back when staff cancelled the receipt (its
--                    net_paid if yes, 0 if no). NULL = not asked: receipts cancelled
--                    before this migration, and receipts replaced by a correction.
--   replaced_by_id   the receipt a correction put in its place. A receipt cancelled
--                    by a correction is not a refund - its money moved to the new
--                    receipt (whose change_amount is what was handed back). Before
--                    this column the two kinds of cancellation could only be told
--                    apart by cancel_reason, which holds screen-language text.
--
-- Existing corrections are found from the replacement's note ("correction of R-…,
-- R-…"). Safe to run more than once.
ALTER TABLE billing ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(12,2);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS replaced_by_id INTEGER REFERENCES billing(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_refunded_amount_check') THEN
    ALTER TABLE billing ADD CONSTRAINT billing_refunded_amount_check
      CHECK (refunded_amount IS NULL OR refunded_amount >= 0);
  END IF;
END $$;

UPDATE billing b SET replaced_by_id = n.id
  FROM billing n
 WHERE b.payment_status = 'cancelled' AND b.replaced_by_id IS NULL
   AND n.visit_id = b.visit_id AND n.id > b.id
   AND n.note ~ ('^correction of (.*, )?' || b.receipt_no || '(,| |$)');
