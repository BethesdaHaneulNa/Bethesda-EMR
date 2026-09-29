-- 027 (payment, session number 301): index for looking bills up by visit.
--
-- The waiting list (GET /api/billing/pending) runs several sub-queries per visit
-- that find the visit's bills by visit_id (billed total, active bill, cancelled
-- bill, previous payment), and the items / correction / settlement routes do the
-- same. billing had indexes on patient_id, billing_date, payment_status and
-- carried_into_id but none on visit_id, so each of those scanned the whole table -
-- fine with a few hundred bills, slow after a few years. Adds an index only; no
-- data changes. Safe to run twice.

CREATE INDEX IF NOT EXISTS idx_bill_visit ON billing(visit_id);
