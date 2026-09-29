-- 201 (consultation session): when a consultation was finished (decision L9, 2026-09-29).
--
-- The pharmacy lists its patients in the order their consultations were finished. Set by
-- PUT /api/consultations/:id/complete the FIRST time the doctor presses Terminé; pressing
-- it again after reopening and editing the record keeps that first time
-- (COALESCE(completed_at, NOW()) in consult.routes.js), so a patient already waiting at
-- the pharmacy does not drop to the end of the list.
--
-- Consultations finished before this column existed get their last change time
-- (updated_at) - the nearest thing on record; for most it is the moment Terminé saved
-- the record. Only rows still without a value are filled. Safe to run more than once.
ALTER TABLE consultation ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
UPDATE consultation SET completed_at = COALESCE(updated_at, created_at)
 WHERE completed_at IS NULL AND status IN ('completed', 'signed');
CREATE INDEX IF NOT EXISTS idx_consult_completed_at ON consultation (completed_at);
