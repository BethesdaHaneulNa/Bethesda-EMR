// What a visit holds on the consultation side, and finishing it.
//
// Shared with reception (visit.routes.js) so that both screens judge a visit by ONE rule
// (coordinator's decision, 2026-10-01): since opening a patient no longer starts the
// consultation, reception's own status buttons meet visits that are "waiting" and yet
// carry records, and visits "in consultation" that carry none. The contract - what each
// function promises - is in wiki/handoff/consultation.md, 「접수와의 약속」; change it there
// first, and tell reception.
//
// Every function takes `db`: a pg client inside the caller's transaction (or the pool for
// a plain read). None of them begins, commits or locks: the caller locks the visit row
// (SELECT ... FOR UPDATE) when the answer must still hold at the moment it acts on it.

// visitRecords(db, visitId) -> null when the visit does not exist, else
//   { consultation_id,   the visit's consultation row, null when it was never started
//     finished,          the doctor pressed Terminé (consultation 'completed' / 'signed')
//     notes,             a doctor's note (consultation_note), or text in the old note / S-O-A-P columns
//     vitals,            any vital sign saved
//     prescriptions,     a prescription line (dispensed or not)
//     orders,            an order line - a cancelled one too: it stays as the record of a result
//     diagnoses,
//     documents,         a document issued for the visit or its consultation (a voided one too)
//     bills,             a bill of the visit, whatever its status (a cancelled one too)
//     any }              true when at least one of the eight above is
// An empty consultation row alone (started, nothing written) is NOT a record: any = false.
const RECORDS_SQL = `
  SELECT c.id AS consultation_id,
         COALESCE(c.status IN ('completed', 'signed'), false) AS finished,
         (btrim(concat(c.note_text, c.subjective, c.objective, c.assessment, c.plan)) <> ''
            OR EXISTS (SELECT 1 FROM consultation_note n WHERE n.consultation_id = c.id)) AS notes,
         (c.bp_systolic IS NOT NULL OR c.bp_diastolic IS NOT NULL OR c.temperature IS NOT NULL
            OR c.pulse IS NOT NULL OR c.spo2 IS NOT NULL OR c.respiratory_rate IS NOT NULL
            OR c.weight IS NOT NULL OR c.height IS NOT NULL) AS vitals,
         EXISTS (SELECT 1 FROM prescription r WHERE r.consultation_id = c.id) AS prescriptions,
         EXISTS (SELECT 1 FROM order_item o WHERE o.consultation_id = c.id) AS orders,
         EXISTS (SELECT 1 FROM diagnosis d WHERE d.consultation_id = c.id) AS diagnoses,
         EXISTS (SELECT 1 FROM document_log dl WHERE dl.visit_id = v.id OR dl.consultation_id = c.id) AS documents,
         EXISTS (SELECT 1 FROM billing b WHERE b.visit_id = v.id) AS bills
    FROM visit v
    LEFT JOIN LATERAL (SELECT * FROM consultation x WHERE x.visit_id = v.id
                        ORDER BY x.created_at DESC, x.id DESC LIMIT 1) c ON true
   WHERE v.id = $1`;
const RECORD_KINDS = ['finished', 'notes', 'vitals', 'prescriptions', 'orders', 'diagnoses', 'documents', 'bills'];

async function visitRecords(db, visitId) {
  const r = await db.query(RECORDS_SQL, [visitId]);
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  row.any = RECORD_KINDS.some((k) => row[k]);
  return row;
}

// visitHasRecords(db, visitId) -> true when anything at all is recorded on the visit
// (visitRecords().any); false for a visit with nothing, and for a visit that does not exist.
// This is the test behind the consultation screen's "Remettre en attente".
async function visitHasRecords(db, visitId) {
  const r = await visitRecords(db, visitId);
  return !!(r && r.any);
}

// completeVisitConsultation(db, visitId) - what Terminé does, for the visit's consultation:
//   consultation.status = 'completed', completed_at = the FIRST time it was finished
//   (decision L9: the pharmacy lists patients in that order; finishing again after a
//   correction keeps the place), and visit.status = 'completed'.
// Returns { consultation_id, completed_at }, or null when the visit has no consultation
// row - nothing is changed then, and the caller sets the visit's status itself.
// No condition is checked (no diagnosis, note or dose is required to finish), and nothing
// is written to the change log, as for Terminé. The caller refuses a cancelled visit.
async function completeVisitConsultation(db, visitId) {
  const c = await db.query(
    `UPDATE consultation SET status = 'completed', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE visit_id = $1 RETURNING id AS consultation_id, completed_at`, [visitId]);
  if (c.rows.length === 0) return null;
  await db.query("UPDATE visit SET status = 'completed', updated_at = NOW() WHERE id = $1", [visitId]);
  return c.rows[0];
}

module.exports = { visitRecords, visitHasRecords, completeVisitConsultation };
