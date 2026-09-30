-- 030 (consultation, session number 201): the total of an order line, stored (decision ⑭, 2026-09-29).
--
-- An order line is billed like a prescription line: total = quantity (the "daily total"
-- column on screen) x days; the times a day are not multiplied (Korean style - the
-- day's amount already contains them). An injection once a day for 5 days = 1 · 1 · 5
-- -> 5. The consultation route works it out when a line is written or its quantity or
-- days change (consult.routes.js orderTotal), and payment reads this column only, so
-- the formula lives in one place (the lesson of the prescription total).
--
-- Existing lines keep what they meant: total_qty = quantity (NULL read as 1, as the
-- bill did). Nothing billed so far changes, so no paid visit comes back for a false
-- correction. On the running EMR on 2026-09-29 no order had days other than 1.
-- Safe to run more than once: only lines still without a total are filled.
ALTER TABLE order_item ADD COLUMN IF NOT EXISTS total_qty DECIMAL(10,3);
UPDATE order_item SET total_qty = COALESCE(quantity, 1) WHERE total_qty IS NULL;
