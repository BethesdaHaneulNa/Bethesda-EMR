-- 024 (laboratory, session number 501):
-- reference ranges by sex and age for a lab item (decision 4, 2026-09-29).
--
-- Adds only. No values are inserted: the Korean reference table in
-- wiki/reference/lab-reference-ranges-kr.md is a proposal, entered through
-- Settings once the director and the doctors have chosen. An item with no
-- rows here keeps using lab_test_item.ref_low/ref_high/ref_text as before.
--
-- A row applies when the patient's sex matches (NULL = both) and the age on the
-- test day is in [age_min, age_max) counted in age_unit (d/m/y, by the
-- calendar). A sex-specific row wins over a both-sexes row; rows of the same sex
-- may not overlap (the settings save refuses it), so at most one row applies.
-- The unit of the values is the item's unit -- there is deliberately no unit here.

CREATE TABLE IF NOT EXISTS lab_ref_range (
    id               SERIAL PRIMARY KEY,
    lab_test_item_id INTEGER NOT NULL REFERENCES lab_test_item(id) ON DELETE CASCADE,
    sex              VARCHAR(1) CHECK (sex IN ('M','F')),
    age_min          INTEGER CHECK (age_min >= 0),
    age_max          INTEGER CHECK (age_max > 0),
    age_unit         VARCHAR(1) NOT NULL DEFAULT 'y' CHECK (age_unit IN ('d','m','y')),
    ref_low          NUMERIC,
    ref_high         NUMERIC,
    ref_text         VARCHAR(60),
    note             VARCHAR(200),
    sort_order       INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lrr_item ON lab_ref_range(lab_test_item_id);

-- Which row was used for a saved result, e.g. "F · ≥18y"; NULL = the item's
-- default range. lab_result already keeps a copy of ref_low/ref_high/ref_text,
-- so editing the ranges later never changes what an old result was judged by.
ALTER TABLE lab_result ADD COLUMN IF NOT EXISTS ref_label VARCHAR(40);
