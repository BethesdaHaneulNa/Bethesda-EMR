-- 036 (payment, session number 304): statistics by cash - one row per movement of money (M9, decided (가) 2026-09-29).
--
-- The office manager chose to count money on the day it actually came in or went
-- out. Receipts alone cannot say that: correcting or cancelling a receipt moved its
-- whole amount to the day of the correction and left the first day at 0. This
-- table records each movement once, in the transaction that caused it, and is never
-- edited, so a day's total is the till and a past day never changes:
--   payment     +cash taken on a receipt (normal, extra charge, re-bill) - the cash
--               already at the till from a cancelled receipt it re-uses (held_used)
--   settlement  +cash taken on a balance settlement (M2)
--   correction  -cash handed back by a correction
--   cancel      -cash handed back when staff cancelled a receipt (M6 "Oui")
--   opening     receipts written before this table (see below)
-- Nothing moved, no row (amount is never 0). Written by billing.routes.js
-- writeCash(); read by statistics (wiki/handoff/payment.md, design memo).
--
-- billing.held_used: the cash a receipt took over from cancelled receipts of its
-- visit that were still at the till (a re-bill whose "amount received" box was
-- filled from them). Cash at the till for a visit =
--   sum over its cancelled receipts nothing replaced of (net_paid - refunded_amount)
--   - sum of held_used over its receipts.
-- Before this migration this was worked out from the order of events (a later receipt took it
-- over); existing receipts are filled the same way, so nothing shown changes.
--
-- Append only, like audit_log: UPDATE and TRUNCATE are always refused; DELETE only in
-- a transaction that ran SET LOCAL bethesda.cleanup = 'on' - the test-data cleanup
-- for a new PC (decision C) removes test patients with their rows. The application
-- never sets it.

CREATE TABLE IF NOT EXISTS cash_movement (
    id          SERIAL PRIMARY KEY,
    move_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    kind        VARCHAR(12) NOT NULL
                CHECK (kind IN ('payment','settlement','correction','cancel','opening')),
    amount      DECIMAL(12,2) NOT NULL CHECK (amount <> 0),
    billing_id  INTEGER NOT NULL REFERENCES billing(id),
    visit_id    INTEGER NOT NULL REFERENCES visit(id),
    patient_id  INTEGER NOT NULL REFERENCES patient(id),
    staff_id    INTEGER REFERENCES staff(id),
    memo        TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_movement_date    ON cash_movement (move_date, id);
CREATE INDEX IF NOT EXISTS idx_cash_movement_patient ON cash_movement (patient_id);
CREATE INDEX IF NOT EXISTS idx_cash_movement_billing ON cash_movement (billing_id);

CREATE OR REPLACE FUNCTION cash_movement_guard() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('bethesda.cleanup', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'cash_movement is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_movement_no_change ON cash_movement;
CREATE TRIGGER cash_movement_no_change
    BEFORE UPDATE OR DELETE ON cash_movement
    FOR EACH ROW EXECUTE FUNCTION cash_movement_guard();
DROP TRIGGER IF EXISTS cash_movement_no_truncate ON cash_movement;
CREATE TRIGGER cash_movement_no_truncate
    BEFORE TRUNCATE ON cash_movement
    FOR EACH STATEMENT EXECUTE FUNCTION cash_movement_guard();

ALTER TABLE billing ADD COLUMN IF NOT EXISTS held_used DECIMAL(12,2);

-- Receipts written before this migration: those whose held_used is still empty.
-- Receipts written after it get 0 or the amount (column default below), so running
-- this file again finds none and adds nothing.
CREATE TEMP TABLE old_bill ON COMMIT DROP AS
  SELECT id FROM billing WHERE held_used IS NULL;

-- held_used as the screen worked it out until now: a cancelled receipt nothing
-- replaced hands its kept cash to the first receipt of its visit written at or
-- after the cancellation.
UPDATE billing y SET held_used = COALESCE((
    SELECT SUM(x.net_paid - COALESCE(x.refunded_amount, 0))
      FROM billing x
     WHERE x.visit_id = y.visit_id AND x.id <> y.id
       AND x.payment_status = 'cancelled' AND x.replaced_by_id IS NULL
       AND y.created_at >= x.cancelled_at
       AND NOT EXISTS (SELECT 1 FROM billing z
                        WHERE z.visit_id = x.visit_id AND z.id <> x.id AND z.id <> y.id
                          AND z.created_at >= x.cancelled_at
                          AND (z.created_at < y.created_at OR (z.created_at = y.created_at AND z.id < y.id)))
  ), 0)
 WHERE y.id IN (SELECT id FROM old_bill);

ALTER TABLE billing ALTER COLUMN held_used SET DEFAULT 0;

-- Opening rows, on each receipt's own date, so past days keep the figure the
-- statistics showed (the receipts in force, net_paid) ...
INSERT INTO cash_movement (move_date, kind, amount, billing_id, visit_id, patient_id, staff_id, memo)
SELECT b.billing_date, 'opening', b.net_paid, b.id, b.visit_id, b.patient_id, b.cashier_id, 'receipt in force before 036'
  FROM billing b
 WHERE b.id IN (SELECT id FROM old_bill)
   AND b.payment_status <> 'cancelled' AND b.net_paid <> 0
   AND NOT EXISTS (SELECT 1 FROM cash_movement m WHERE m.billing_id = b.id AND m.kind = 'opening');

-- ... and cancelled receipts whose money is still at the till (nothing replaced
-- them, not handed back, no later receipt took it over), or a later re-bill that
-- re-uses it would make that money disappear from the record.
INSERT INTO cash_movement (move_date, kind, amount, billing_id, visit_id, patient_id, staff_id, memo)
SELECT b.billing_date, 'opening', b.net_paid - COALESCE(b.refunded_amount, 0), b.id, b.visit_id, b.patient_id, b.cashier_id,
       'cancelled before 036, money kept at the till'
  FROM billing b
 WHERE b.id IN (SELECT id FROM old_bill)
   AND b.payment_status = 'cancelled' AND b.replaced_by_id IS NULL
   AND b.net_paid - COALESCE(b.refunded_amount, 0) <> 0
   AND NOT EXISTS (SELECT 1 FROM billing z WHERE z.visit_id = b.visit_id AND z.id <> b.id AND z.created_at >= b.cancelled_at)
   AND NOT EXISTS (SELECT 1 FROM cash_movement m WHERE m.billing_id = b.id AND m.kind = 'opening');
