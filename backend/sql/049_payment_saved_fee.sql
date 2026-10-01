-- 049 (payment; was session number 306): counter fees put on a visit and kept until the receipt is made.
--
-- The director (2026-10-01): "a Save button on the payment screen too - after adding
-- something under Délivrance / Autres one may have to wait instead of confirming right
-- away." The lines the cashier adds at the till (certificate, CD copy, document fee) lived
-- only on the screen: leaving the patient lost them, and another PC never saw them.
--
-- billing_saved_fee: one row per counter-fee line saved for a visit and NOT billed yet.
--   - It is not money: nothing here is a receipt, a balance, cash or a statistic. A row
--     becomes a billing_item line when a receipt is made, and is deleted in that same
--     transaction (POST /billing), so it cannot be billed twice.
--   - unit_price is the amount as saved - for a code whose amount the cashier may change
--     (order_code.price_editable) what was typed, otherwise the code's price that day. A
--     later change of the code's price or flag in Settings does not touch a saved row.
--   - item_code / item_name are copied from the code, as billing_item copies them, so a
--     code removed in Settings leaves the saved line readable.
--   - A visit with rows here has something to bill: the waiting list shows it (as a
--     supplement when the visit already has a receipt). Decided with the director.
--   - Rows go with the visit: deleting a visit deletes them. A cancelled visit keeps its
--     rows but is not listed and cannot be billed, as before.
-- Saving and removing lines is not written to the change log: saved_by / saved_at say who
-- left the line, and the receipt is the record of what was charged.

CREATE TABLE IF NOT EXISTS billing_saved_fee (
    id            SERIAL PRIMARY KEY,
    visit_id      INTEGER NOT NULL REFERENCES visit(id) ON DELETE CASCADE,
    order_code_id INTEGER REFERENCES order_code(id) ON DELETE SET NULL,
    item_code     VARCHAR(50) NOT NULL,
    item_name     VARCHAR(255) NOT NULL,
    quantity      NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    saved_by      INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    saved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_saved_fee_visit ON billing_saved_fee (visit_id);
