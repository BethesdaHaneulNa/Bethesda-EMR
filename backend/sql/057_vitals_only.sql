-- 057 (1.7.9, 2026-11-09): a consultation row that holds only the vital signs.
--
-- 1.7.8 let reception and phones type the vital signs (PUT /api/visits/:id/vitals). When
-- the visit had no consultation yet, that made the visit's consultation row - and the row
-- then looked like a consultation: at the clinic, an administrator typed the vitals of a
-- waiting visit and the patient's history showed "2026-11-09 Bethesda —", an empty
-- consultation under a non-doctor's name, and the waiting visit could no longer be
-- cancelled (a consultation with vital signs counted as a record).
--
-- vitals_only = TRUE: made by the vital-signs route, no doctor has acted on it yet. Such a
-- row is left out of the patient's history and is not a record (reception may cancel the
-- visit; the row is deleted with it). The doctor's first action - the start, any write,
-- Terminé - clears it and makes the doctor its doctor_id (consult.routes.js
-- claimConsultation). consultation.status keeps its CHECK (in_progress / completed /
-- signed), so the flag says it rather than a new status.
ALTER TABLE consultation ADD COLUMN IF NOT EXISTS vitals_only BOOLEAN NOT NULL DEFAULT FALSE;

-- The rows 1.7.8 made. Only a row nothing but the vital signs was written on, on a visit
-- that is still waiting: a doctor's start, and any doctor's write (note, diagnosis,
-- prescription, order, vitals saved from the consultation screen), moves the visit to
-- in_progress, and a document issued on a waiting visit does too - so a waiting visit
-- with such a row was never taken by a doctor. (A visit reception put back to waiting
-- loses its empty consultation row, and one with records cannot go back.) A visit in
-- consultation or finished is left alone, as is any row with a note, a diagnosis, a
-- prescription, an order, a document or text in the old note columns.
UPDATE consultation c SET vitals_only = TRUE
  FROM visit v
 WHERE v.id = c.visit_id
   AND v.status IN ('registered', 'waiting')
   AND c.status = 'in_progress'
   AND c.vitals_at IS NOT NULL
   AND btrim(concat(c.note_text, c.subjective, c.objective, c.assessment, c.plan)) = ''
   AND NOT EXISTS (SELECT 1 FROM consultation_note n WHERE n.consultation_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM diagnosis d WHERE d.consultation_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM prescription r WHERE r.consultation_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM order_item o WHERE o.consultation_id = c.id)
   AND NOT EXISTS (SELECT 1 FROM document_log dl WHERE dl.consultation_id = c.id OR dl.visit_id = v.id);
