-- 601 (statistics, session number): an index on order_item.visit_id.
--
-- The order statistics (GET /api/stats/orders, 2026-10-02) pick the visits of a period
-- and then look up their orders. order_item had indexes on patient_id, worklist_status
-- and pacs_modality but none on visit_id, so that lookup read the whole table for every
-- request - and so do the payment screen's per-visit sums of orders, which have the same
-- shape (WHERE o.visit_id = ...). The table only grows: every order ever written stays.
--
-- Adds an index only; no row changes. Safe to run again.
CREATE INDEX IF NOT EXISTS idx_oi_visit ON order_item (visit_id);
