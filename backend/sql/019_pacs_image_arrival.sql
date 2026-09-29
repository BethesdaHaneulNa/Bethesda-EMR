-- What arrived in the PACS for a worklist entry.
--
-- Nothing used to tell the EMR that a study had been taken: an entry stayed
-- 'scheduled' all day, so finished patients stayed on the device's worklist
-- next to the ones still waiting -- more rows to pick the wrong patient from --
-- and the doctor could not tell "no images yet" from "images are there".
-- The worklist bridge now looks each entry up in Orthanc and reports once the
-- study is stable (POST /api/pacs/study-arrived); these columns hold what it
-- found. patient_check compares the PatientID inside the images with the
-- patient's chart number, decided by the EMR, not the bridge.
--
-- Columns only; no existing row is changed. Safe to run more than once.

ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS images_received_at TIMESTAMPTZ;
ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS orthanc_study_id   VARCHAR(64);
ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS image_count        INTEGER;
ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS image_patient_id   VARCHAR(64);
ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS image_patient_name VARCHAR(200);
ALTER TABLE worklist_log ADD COLUMN IF NOT EXISTS patient_check      VARCHAR(10);

ALTER TABLE worklist_log DROP CONSTRAINT IF EXISTS worklist_log_patient_check_check;
ALTER TABLE worklist_log ADD CONSTRAINT worklist_log_patient_check_check
  CHECK (patient_check IS NULL OR patient_check IN ('match', 'mismatch', 'missing'));
