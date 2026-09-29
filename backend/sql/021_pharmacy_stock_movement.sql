-- 021 (pharmacy, session number 401): stock movement ledger.
--
-- drug.stock_qty stays the current count; this table is the record of why it
-- changed: opening balance, goods received, dispensed, counted on the shelf
-- (adjust) and thrown away (discard). Every change goes through moveStock() in
-- pharmacy.routes.js, in the same transaction and under the same row lock as the
-- change itself, so drug.stock_qty always equals the last row's stock_after.
--
-- shortfall: dispensing stops the count at zero when more is handed out than the
-- record holds. The row keeps what left (qty) and how much the record was short,
-- so before + qty + shortfall = after holds on every row and the gap between shelf
-- and record is visible instead of lost.
--
-- Decided 2026-09-29 (wiki/decisions.md): record-keeping stock inside the EMR, no
-- expiry tracking, no dispense cancel, monthly stock report.
-- Adds a table and one opening row per drug; no existing value is changed.

CREATE TABLE IF NOT EXISTS stock_movement (
    id              SERIAL PRIMARY KEY,
    drug_id         INTEGER NOT NULL REFERENCES drug(id),
    kind            VARCHAR(10) NOT NULL
                    CHECK (kind IN ('opening','receive','dispense','adjust','discard')),
    qty             INTEGER NOT NULL,
    stock_before    INTEGER NOT NULL,
    stock_after     INTEGER NOT NULL,
    shortfall       INTEGER NOT NULL DEFAULT 0 CHECK (shortfall >= 0),
    prescription_id INTEGER REFERENCES prescription(id) ON DELETE SET NULL,
    consultation_id INTEGER REFERENCES consultation(id) ON DELETE SET NULL,
    staff_id        INTEGER REFERENCES staff(id),
    memo            TEXT,
    -- clock_timestamp(), not NOW(): NOW() is when the transaction began, and a
    -- dispense that waited for the drug row lock would be stamped before the one
    -- it waited for. Rows are ordered by id; this keeps the time in the same order.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (stock_after = stock_before + qty + shortfall),
    CHECK (stock_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_movement_drug_time ON stock_movement (drug_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_time      ON stock_movement (created_at);

-- Where the record starts: today's count for every drug, active or not.
INSERT INTO stock_movement (drug_id, kind, qty, stock_before, stock_after, memo)
SELECT d.id, 'opening', GREATEST(COALESCE(d.stock_qty, 0), 0), 0, GREATEST(COALESCE(d.stock_qty, 0), 0),
       'Start of the stock record'
  FROM drug d
 WHERE NOT EXISTS (SELECT 1 FROM stock_movement m WHERE m.drug_id = d.id);
