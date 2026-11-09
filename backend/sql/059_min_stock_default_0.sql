-- 059 (1.7.11): a new drug's minimum stock defaults to 0 = no low-stock warning until the
-- pharmacy sets one (clinic decision 2026-11-09: the minimums are set on site, item by item).
-- Existing rows are not changed here.
ALTER TABLE drug ALTER COLUMN min_stock SET DEFAULT 0;
