-- 028 (pacs, session number 802): the StudyInstanceUID the images actually carry, when it is not the one the
-- worklist handed the device (P-4).
--
-- Some devices make up their own StudyInstanceUID and keep only the
-- AccessionNumber. The bridge then finds the study by accession and reports the
-- UID it found; the viewer must open that one, not the worklist's, or it shows
-- an empty study. NULL means the images carry the worklist's own UID.
--
-- Column only; no existing row is changed. Safe to run more than once.

ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS image_study_uid VARCHAR(128);
