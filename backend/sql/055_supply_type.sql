-- 055 (coordinator, 1.7.0): consumables ("supplies") as an order code type.
--
-- The clinic sells and counts disposables - gloves, needles, syringes, infusion sets,
-- sutures, drapes, dressings, antiseptics, tubes (153 lines in the site's own stock
-- workbook, 2026-11-07). They are neither drugs (no sig, no pharmacy dispensing) nor
-- procedures (they are things, counted on a shelf). A fifth order code type, 'supply':
--   - found in the consultation screen's order box like any order code, billed like a
--     procedure line (quantity x unit price), never in the payment screen's fee list;
--   - counted: order_code.stock_qty is the current count, supply_movement the record of
--     why it changed, the same shape as the pharmacy's stock_movement (021). A supply
--     put on a consultation is used (-), taken off or cancelled is returned (+); goods
--     received, shelf counts and discards go through the supply routes. Every change
--     happens in the same transaction, under the same row lock, so stock_qty always
--     equals the last row's stock_after.
-- Adds one type, three columns and a table; no existing value is changed.

ALTER TABLE order_code DROP CONSTRAINT IF EXISTS order_code_code_type_check;
ALTER TABLE order_code ADD CONSTRAINT order_code_code_type_check
    CHECK (code_type IN ('fee','lab','imaging','procedure','supply'));

-- stock_qty stays NULL on every other type: those are not counted.
ALTER TABLE order_code ADD COLUMN IF NOT EXISTS stock_qty INTEGER;
ALTER TABLE order_code ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;
-- The word the count is in ("Unit", "PACKS", "ROLL", "BOTTLE"), as the workbook has it.
ALTER TABLE order_code ADD COLUMN IF NOT EXISTS unit VARCHAR(20);

CREATE TABLE IF NOT EXISTS supply_movement (
    id              SERIAL PRIMARY KEY,
    order_code_id   INTEGER NOT NULL REFERENCES order_code(id),
    kind            VARCHAR(10) NOT NULL
                    CHECK (kind IN ('opening','receive','use','return','adjust','discard')),
    qty             INTEGER NOT NULL,
    stock_before    INTEGER NOT NULL,
    stock_after     INTEGER NOT NULL,
    -- 'use' stops the count at zero when more is used than the record holds, as the
    -- pharmacy's dispense does: qty keeps what left, shortfall how much the record
    -- was short, so before + qty + shortfall = after holds on every row.
    shortfall       INTEGER NOT NULL DEFAULT 0 CHECK (shortfall >= 0),
    -- The order line that used it; the line may be deleted later (SET NULL), the
    -- movement stays.
    order_item_id   INTEGER REFERENCES order_item(id) ON DELETE SET NULL,
    consultation_id INTEGER REFERENCES consultation(id) ON DELETE SET NULL,
    staff_id        INTEGER REFERENCES staff(id),
    memo            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK (stock_after = stock_before + qty + shortfall),
    CHECK (stock_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_supply_movement_code_time ON supply_movement (order_code_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_supply_movement_time      ON supply_movement (created_at);
