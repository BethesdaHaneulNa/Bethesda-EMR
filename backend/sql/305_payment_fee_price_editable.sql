-- 305 (payment): a counter fee whose amount the cashier may type at the till.
--
-- The director (2026-10-01): "Document Fee - let us change the amount ourselves, right on
-- the payment screen." The fees added at the till under "Délivrance / Autres" (certificate,
-- CD copy, document fee) take their price from the order code; the document fee is not one
-- price - it depends on the document - so its line gets a box for the amount.
--
-- order_code.price_editable: TRUE = the payment screen lets the cashier change the amount
-- of this code's line before the receipt is saved. The code's price stays the amount the
-- box starts with. FALSE (every other code): the line is billed at the code's price, as
-- before. Only fee-type codes are offered at the till, so the flag means nothing elsewhere.
--
-- Set for the code DOC only. A box to tick it for another code belongs on the settings
-- screen (order codes) - asked of the settings session.

ALTER TABLE order_code ADD COLUMN IF NOT EXISTS price_editable BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE order_code SET price_editable = TRUE WHERE code = 'DOC' AND code_type = 'fee';
