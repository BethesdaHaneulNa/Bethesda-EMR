-- 034 (pharmacy): columns for a drug list imported from another stock program.
--
-- dosage_form    the drug's form (Tablet, Syrup, ...), see frontend/src/documents/drug-info.js
-- import_check   what is still to check on an imported drug: [{ "k": kind, "d": detail }].
--                The Stock tab and the settings drug tab show it until someone marks it
--                checked (import_check_done_at / _by). The list itself is kept.
--
-- Schema only. A clinic's own drug list and opening stock are site data and are not part
-- of this repository; load them with your own SQL after the first start.

ALTER TABLE drug ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(30);
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check JSONB;
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check_done_at TIMESTAMPTZ;
ALTER TABLE drug ADD COLUMN IF NOT EXISTS import_check_done_by INTEGER REFERENCES staff(id);
