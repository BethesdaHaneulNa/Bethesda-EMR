-- 201 (consultation session): record who cancelled an order, when, and why.
--
-- Decision 3-B (2026-09-29): an order that already has a result (lab values, a reading,
-- an exam started) cannot be deleted - that would take the result with it - so when the
-- doctor tries to remove one, the screen offers to mark it cancelled instead. The result
-- stays on record; the order leaves the lab lists and the bill (lab and payment sessions).
-- order_item.status already allows 'cancelled' (001_schema.sql); these columns say who,
-- when and why. The reason is optional.
--
-- Adds columns only; no existing row changes. Safe to run more than once.
ALTER TABLE order_item ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ;
ALTER TABLE order_item ADD COLUMN IF NOT EXISTS cancelled_by  INTEGER REFERENCES staff(id);
ALTER TABLE order_item ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
