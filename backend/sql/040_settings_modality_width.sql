-- 040 (settings; session number 701): room for any DICOM modality value.
--
-- The director, 2026-10-01: the rectoscope seen in Madagascar probably asks its worklist
-- with Modality "AS", which the order-code window did not offer. A device only receives
-- the worklist lines whose Modality is exactly the value it asks for, and what an older
-- device asks is only known on site - so the order code must be able to hold whatever the
-- device says. DICOM allows a code string of up to 16 characters (VR CS: A-Z, 0-9, _);
-- the three columns that carry the value were VARCHAR(10).
--
-- Widens three columns; no value changes, nothing is rewritten. Safe to run more than once.
ALTER TABLE order_code   ALTER COLUMN pacs_modality TYPE VARCHAR(16);
ALTER TABLE order_item   ALTER COLUMN pacs_modality TYPE VARCHAR(16);
ALTER TABLE worklist_log ALTER COLUMN modality      TYPE VARCHAR(16);
