-- Cash tendered is not revenue.
--
-- `amount_paid` holds what the patient handed over and `change_amount` what was
-- handed back, so the money the clinic actually keeps is the difference. Every
-- report summed `amount_paid` on its own, so paying a 3 000 bill with a 10 000
-- note recorded 10 000 of revenue and left the patient showing a 7 000 refund
-- owed -- on a list of people to reimburse. Paying with a large note is routine,
-- so daily and monthly takings drifted upward with normal use.
--
-- A generated column keeps the correct figure next to the raw ones and makes it
-- hard for a future query to forget the subtraction.

ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS net_paid NUMERIC(12,2)
  GENERATED ALWAYS AS (COALESCE(amount_paid,0) - COALESCE(change_amount,0)) STORED;
