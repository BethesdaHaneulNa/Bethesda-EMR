-- Carried-forward balances.
--
-- When a patient owes money from an earlier visit, the payment screen adds that
-- amount to the new bill as `previous_balance`. Before this migration the old
-- bill kept its own `outstanding`, so paying the new bill settled the debt in
-- cash but not in the data: the balance stayed on the account and every later
-- visit re-billed the same amount.
--
-- `carried_into_id` records that a bill's outstanding balance was absorbed by a
-- later bill. The old bill keeps its original `amount_paid` (so daily cash
-- totals for that date stay accurate) and its `outstanding` drops to 0, because
-- the debt now lives on the newer bill. Voiding the newer bill reverses this.

ALTER TABLE billing
  ADD COLUMN IF NOT EXISTS carried_into_id INTEGER REFERENCES billing(id);

CREATE INDEX IF NOT EXISTS idx_bill_carried_into ON billing(carried_into_id);
