-- 201 (consultation, session number; the coordinator renumbers it): a consultation note
-- with its author (decision 2026-09-30, the director with two doctor accounts).
--
-- The note of a visit was one column, consultation.note_text: a second doctor opening
-- the same visit typed into the same text, and nothing said who wrote what. The
-- consultation stays one row per visit (orders, prescriptions, billing, pharmacy, lab
-- and statistics all hang on it); only the note moves to its own table, ONE NOTE PER
-- DOCTOR PER CONSULTATION (decision (나): reopening the visit shows the doctor's own
-- note to carry on). A doctor edits only their own note (decision (가), admins too).
--
-- consultation.note_text is kept and no longer read or written, so an older backup
-- still restores; its text is copied here below.
CREATE TABLE IF NOT EXISTS consultation_note (
  id              SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
  visit_id        INTEGER REFERENCES visit(id),
  patient_id      INTEGER NOT NULL REFERENCES patient(id),
  author_id       INTEGER REFERENCES staff(id),     -- NULL only for a copied old note whose consultation had no doctor
  note_text       TEXT NOT NULL CHECK (btrim(note_text) <> ''),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,                      -- last change after the first save; NULL if never changed
  UNIQUE (consultation_id, author_id)
);
CREATE INDEX IF NOT EXISTS idx_consultation_note_patient ON consultation_note (patient_id, created_at DESC);

-- Old notes: one note per consultation that has text, written by the doctor who opened
-- it (consultation.doctor_id), at the consultation's time. The S/O/A/P columns an older
-- screen may have filled are put in front ("S: …"), so nothing is lost when an old
-- backup is restored. A consultation that already has a note from that doctor is left
-- alone, so this can run again.
INSERT INTO consultation_note (consultation_id, visit_id, patient_id, author_id, note_text, created_at, updated_at)
SELECT c.id, c.visit_id, c.patient_id, c.doctor_id, x.txt,
       COALESCE(c.created_at, NOW()),
       CASE WHEN c.updated_at > c.created_at THEN c.updated_at END
  FROM consultation c
  CROSS JOIN LATERAL (
    SELECT concat_ws(E'\n',
             CASE WHEN btrim(COALESCE(c.subjective, '')) <> '' THEN 'S: ' || c.subjective END,
             CASE WHEN btrim(COALESCE(c.objective, ''))  <> '' THEN 'O: ' || c.objective END,
             CASE WHEN btrim(COALESCE(c.assessment, '')) <> '' THEN 'A: ' || c.assessment END,
             CASE WHEN btrim(COALESCE(c.plan, ''))       <> '' THEN 'P: ' || c.plan END,
             NULLIF(btrim(COALESCE(c.note_text, '')), '')) AS txt
  ) x
 WHERE btrim(COALESCE(x.txt, '')) <> ''
   AND c.patient_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM consultation_note n
                    WHERE n.consultation_id = c.id AND n.author_id IS NOT DISTINCT FROM c.doctor_id);

-- Who wrote a prescription line (order lines already have ordered_by). Old lines: NULL,
-- not a guess - the screen shows a name only when a visit has lines from two doctors.
ALTER TABLE prescription ADD COLUMN IF NOT EXISTS prescribed_by INTEGER REFERENCES staff(id);

-- The vital signs stay one set per visit (decision 2026-09-30: often left empty, written
-- in the note instead); who saved them last, and when.
ALTER TABLE consultation ADD COLUMN IF NOT EXISTS vitals_by INTEGER REFERENCES staff(id);
ALTER TABLE consultation ADD COLUMN IF NOT EXISTS vitals_at TIMESTAMPTZ;
