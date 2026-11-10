const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { badAmounts } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { cancelWorklistForOrder } = require('./pacs.cancel');
// Which orders are imaging exams (the phone's imaging list, 1.7.11) - the PACS's one rule.
const { isExam } = require('./pacs.exam');
// A supply line (code_type 'supply', 1.7.0) moves the supply's count: used when put
// on, returned when taken off or cancelled, the difference when its count changes.
// Each call runs in this route's transaction, under the order code's row lock.
const { useSupply, returnSupply, resupplyDiff } = require('./supply.routes');
const { visitRecords, visitHasRecords, completeVisitConsultation } = require('./consult.visit');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { defaultPermsForRole } = require('../middleware/permissions');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// Writing prescriptions and orders is the doctor's job. The menu already hides this
// screen from other roles, but the menu is not a lock - a pharmacy or cashier account
// could still post prescriptions straight to these endpoints.
const canConsult = permMiddleware('consultation');
// Reading them: the screens that show a visit's prescriptions and orders -
// consultation, and payment / pharmacy through PatientChart and the document window
// (DocumentModal reads /visit/:id/prescriptions to fill a new document). Lab and
// reception open documents read-only with no visit context, so they never call these.
// Decision S2 (2026-09-29): the server checks what the screens already check; the
// route-by-route table is in the project notes "S2".
const canReadRx = permMiddleware('consultation', 'payment', 'pharmacy');

// Fields the tables require. Left out, they used to reach the database and come back
// as a 500 carrying the driver's not-null message; checked here they are a 400 that
// says which field. (Other constraint errors go through sendDbError below.)
function blank(v) { return v === undefined || v === null || String(v).trim() === ''; }
// prescription.route is VARCHAR(10): a longer sig was a 500 "value too long".
const ROUTE_MAX = 10;
function badRoute(route) {
  return !blank(route) && String(route).length > ROUTE_MAX
    ? 'route (sig) must be at most ' + ROUTE_MAX + ' characters' : null;
}

// Refusals the consultation screen recognises and translates. Keep these strings in
// step with LOCK_MESSAGES in frontend/src/pages/Consultation.jsx.
const RX_DISPENSED = 'Prescription already dispensed';
const ORDER_HAS_RESULT = 'Order already has a result';
const VISIT_CANCELLED = 'Visit was cancelled';
const ORDER_CANCELLED = 'Order is cancelled';
const ORDER_NO_RESULT = 'Order has no result';
const DX_DUPLICATE = 'Diagnosis already on this consultation';

// ── Change log (the project notes, decision 2026-09-29) ──
// Written here: an order cancelled or deleted, a prescription deleted, and any edit to
// a FINISHED consultation record (note and vital signs, diagnoses, prescriptions,
// orders). Past records stay editable (decision ⑫); the log is what keeps track.
// "Finished", read inside the same transaction as the change, is either of:
//   - the doctor pressed Terminer: consultation.status 'completed' (or 'signed').
//     Nothing sets it back, so reopening a finished consultation and changing it counts;
//   - the visit is from another day than today (clinic date, todayLocal): a record
//     from an earlier day changed later, even if Terminer was never pressed.
// The many saves of a consultation still open today are ordinary work and are not logged.
// note_text is no longer one of them: the note is one row per doctor in consultation_note
// (PUT /:id/note, below). The S/O/A/P columns stay writable as before; no screen sends them.
const NOTE_FIELDS = ['subjective', 'objective', 'assessment', 'plan',
  'bp_systolic', 'bp_diastolic', 'temperature', 'pulse', 'spo2', 'respiratory_rate', 'weight', 'height'];
const VITAL_FIELDS = ['bp_systolic', 'bp_diastolic', 'temperature', 'pulse', 'spo2', 'respiratory_rate', 'weight', 'height'];
// A screen still loaded from before the change sends its note here. Dropping it quietly
// would lose the doctor's text, so it is refused and the screen says so.
const NOTE_ELSEWHERE = 'The note is saved with PUT /consultations/:id/note';
const RX_LOG = ['drug_code', 'drug_name', 'dose', 'frequency', 'days', 'route', 'total_qty', 'unit_price', 'memo', 'status', 'pack_label'];
const ORDER_LOG = ['order_code', 'order_name', 'code_type', 'dose', 'frequency', 'days', 'quantity', 'total_qty', 'unit_price', 'memo', 'status'];
const DX_LOG = ['icd_code', 'diagnosis_name', 'diagnosis_type'];

// An empty string counts as no value: the screen sends memo '' where the row had NULL,
// and that is not a change anyone needs to read about.
function pick(row, keys) {
  if (!row) return null;
  const o = {};
  keys.forEach(function (k) { o[k] = row[k] === undefined || row[k] === '' ? null : row[k]; });
  return o;
}
function orderLabel(o) { return [o.order_code, o.order_name].filter(Boolean).join(' '); }
function dxLabel(d) { return [d.icd_code, d.diagnosis_name].filter(Boolean).join(' '); }

// The consultation a change belongs to (patient and visit for the log line), with
// finished = whether an edit to it is logged.
async function consultOf(db, consultationId) {
  const r = await db.query(
    `SELECT c.id, c.visit_id, c.patient_id, c.status,
            (c.status IN ('completed','signed') OR v.visit_date <> $2::date) IS TRUE AS finished
       FROM consultation c LEFT JOIN visit v ON v.id = c.visit_id
      WHERE c.id = $1`,
    [consultationId, todayLocal()]);
  return r.rows[0] || null;
}
function recordEdit(client, req, c, entity, row, summary, before, after) {
  if (!c || !c.finished) return false;
  return writeAudit(client, req, {
    action: ACTIONS.CONSULT_RECORD_EDIT, patient_id: c.patient_id, visit_id: c.visit_id,
    entity: entity, entity_id: row.id, summary: summary, before: before, after: after,
  });
}

// One transaction for a change and its log line: both are saved or neither.
// fn(client) returns [status, body]; a status of 300 or more rolls back. The response
// goes out only after COMMIT, so a failed commit is reported as the error it is.
async function inTx(res, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query(out[0] < 300 ? 'COMMIT' : 'ROLLBACK');
    res.status(out[0]).json(out[1]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e2) { /* connection already out of the transaction */ }
    sendDbError(res, err);
  } finally {
    client.release();
  }
}

// Whether an order has produced something that must stay on record: lab values, a
// written reading, or an imaging study the modality has started. Such an order cannot
// be deleted (the result would go with it) and can be marked cancelled instead.
async function orderProduced(client, orderId, resultText) {
  if (String(resultText || '').trim() !== '') return true;
  const r = await client.query(
    `SELECT EXISTS (SELECT 1 FROM lab_result WHERE order_item_id = $1)
         OR EXISTS (SELECT 1 FROM worklist_log WHERE order_item_id = $1
                                                 AND status IN ('in_progress','completed')) AS yes`,
    [orderId]);
  return r.rows[0].yes;
}

// ── The waiting list's doctors (clinic manager, 2026-10-01) ──
// Which doctors' patients the signed-in account's waiting list shows (migration
// consultation_queue_filter). No row = the rule the screen always had: a doctor sees
// their own patients and the patients with no doctor, any other account sees all.
// Only ever the signed-in account's: the id comes from the token. A preference, like
// the theme - not written to the change log.
// These paths are declared before PUT /:id, which would otherwise take them.
function queueFilterBody(row) {
  if (!row) return { custom: false };
  return { custom: true, all_doctors: row.all_doctors, doctor_ids: row.doctor_ids || [], unassigned: row.unassigned };
}

// GET /api/consultations/queue-filter -> { custom:false } | { custom:true, all_doctors, doctor_ids, unassigned }
router.get('/queue-filter', canConsult, async (req, res) => {
  try {
    const r = await pool.query('SELECT all_doctors, doctor_ids, unassigned FROM consultation_queue_filter WHERE staff_id = $1', [req.user.id]);
    res.json(queueFilterBody(r.rows[0]));
  } catch (err) { sendDbError(res, err); }
});

// PUT /api/consultations/queue-filter { all_doctors, doctor_ids: [id], unassigned }
// Ids that are not a doctor's account are dropped (a doctor removed since the window was
// opened). A choice that would show nobody - no doctor and not the patients without a
// doctor - is refused (400): the list would be empty with nothing on screen to say why.
router.put('/queue-filter', canConsult, async (req, res) => {
  try {
    const b = req.body || {};
    const all = b.all_doctors === true;
    const unassigned = b.unassigned === true;
    const ids = Array.isArray(b.doctor_ids) ? b.doctor_ids : null;
    if (!ids || ids.length > 500 || ids.some((x) => !Number.isInteger(x) || x <= 0)) {
      return res.status(400).json({ error: 'doctor_ids must be a list of staff ids' });
    }
    const known = all ? { rows: [] }
      : await pool.query("SELECT id FROM staff WHERE id = ANY($1::int[]) AND role = 'doctor' ORDER BY id", [ids]);
    const kept = known.rows.map((r) => r.id);
    if (!all && kept.length === 0 && !unassigned) return res.status(400).json({ error: 'Choose at least one doctor' });
    const r = await pool.query(
      `INSERT INTO consultation_queue_filter (staff_id, all_doctors, doctor_ids, unassigned)
       VALUES ($1, $2, $3::int[], $4)
       ON CONFLICT (staff_id) DO UPDATE SET all_doctors = EXCLUDED.all_doctors, doctor_ids = EXCLUDED.doctor_ids,
                                            unassigned = EXCLUDED.unassigned, updated_at = NOW()
       RETURNING all_doctors, doctor_ids, unassigned`,
      [req.user.id, all, kept, unassigned]);
    res.json(queueFilterBody(r.rows[0]));
  } catch (err) { sendDbError(res, err); }
});

// DELETE /api/consultations/queue-filter - back to the default rule.
router.delete('/queue-filter', canConsult, async (req, res) => {
  try {
    await pool.query('DELETE FROM consultation_queue_filter WHERE staff_id = $1', [req.user.id]);
    res.json({ custom: false });
  } catch (err) { sendDbError(res, err); }
});

// ── Waiting / in consultation (decision (다), 2026-10-01) ──
//
// Opening a patient no longer starts anything. The clinic's manager, with the clinic's staff on
// the running EMR: a visit only clicked on - and left - read "in consultation" from then
// on, with nothing recorded, and reception could neither tell nor cancel it. Now:
//   - opening reads (GET /visit/:visitId, below): no consultation row is made and the
//     visit keeps its status;
//   - the doctor starts the consultation (POST /, the "Commencer" button), or the first
//     thing saved starts it (the screen calls POST / before its first write; startVisit()
//     in the write routes covers a consultation that exists on a visit still waiting);
//   - a consultation started by mistake goes back to waiting while NOTHING is recorded
//     (PUT /visit/:visitId/waiting): its empty row is removed, so nothing is left in the
//     patient's history, and reception can cancel the visit again.
const VISIT_NOT_STARTED = 'Visit is not in consultation';
const VISIT_HAS_RECORDS = 'Consultation has records';

// The first record on a visit still waiting puts it in consultation. `user` is the
// account writing (req.user, always one with the consultation permission: every caller
// is behind canConsult). Every doctor-side write comes through here, so this is also where
// a vitals-only row becomes the doctor's consultation (claimConsultation, below).
async function startVisit(db, consultationId, user) {
  const r = await db.query(
    `UPDATE visit SET status = 'in_progress', updated_at = NOW()
      WHERE id = (SELECT visit_id FROM consultation WHERE id = $1) AND status IN ('registered', 'waiting')`,
    [consultationId]);
  await claimConsultation(db, consultationId, user, r.rowCount > 0);
}

// ── Vitals-only rows (1.7.9, 2026-11-09) ──
// In 1.7.8 the row reception made for the vital signs looked like any consultation: on
// site, an administrator typed the vitals of a waiting visit and the patient's history
// showed "2026-11-09 Bethesda —", an empty consultation under a non-doctor's name, and
// the visit could no longer be cancelled. Now that row is marked consultation.vitals_only
// (migration 057): it is left out of the patient's history and does not count as a record
// (consult.visit.js), so reception can still cancel the visit - the row is then deleted,
// it holds only the vitals. The status CHECK allows only in_progress / completed /
// signed, so the flag, not a status, says it.
// The doctor's first action on the visit - the start (POST /), any write (startVisit),
// Terminé - makes it a real consultation: the flag is cleared and the doctor becomes
// doctor_id, in the same UPDATE. `justStarted`: the visit has just left the waiting list -
// then a 1.7.8 row that was not marked (see takeOverConsultation) is handed over too.
async function claimConsultation(db, consultationId, user, justStarted) {
  if (!user || user.id == null) return;
  const r = await db.query(
    'UPDATE consultation SET vitals_only = FALSE, doctor_id = $1 WHERE id = $2 AND vitals_only RETURNING id',
    [user.id, consultationId]);
  if (r.rowCount === 0 && justStarted) await takeOverConsultation(db, consultationId, user);
}

// A consultation row made by reception typing the vital signs (PUT /api/visits/:id/vitals,
// 2026-11-09) carries that account in doctor_id, because the column is NOT NULL and
// reception is who made it. doctor_id is "who opened the consultation" for the chart's
// fallback, and the prescriber the lab and pharmacy lists show - so when a doctor then
// starts the visit, the doctor takes the place. Only an account that may not consult at
// all is replaced: a doctor or an administrator who typed the vitals (on the phone, say)
// did open it. Called only at the moment the visit leaves the waiting list. Since 1.7.9
// vitals_only (claimConsultation) does this for every new row; this stays for rows 1.7.8
// made that migration 057 could not mark.
async function takeOverConsultation(db, consultationId, user) {
  if (!user || user.id == null) return;
  const r = await db.query(
    `SELECT s.id, s.role, s.permissions FROM consultation c JOIN staff s ON s.id = c.doctor_id WHERE c.id = $1`,
    [consultationId]);
  const holder = r.rows[0];
  if (!holder || holder.id === user.id) return;
  const perms = Array.isArray(holder.permissions) ? holder.permissions : defaultPermsForRole(holder.role);
  if (perms.indexOf('consultation') >= 0) return;
  await db.query('UPDATE consultation SET doctor_id = $1 WHERE id = $2', [user.id, consultationId]);
}

// The one INSERT of a consultation row: the doctor's start (POST /) and reception's
// vital signs (PUT /api/visits/:id/vitals) both make it here, so a visit never gets a
// second row (there is also a UNIQUE index on visit_id). `visit` needs id, patient_id,
// visit_date. consult_date is the visit's date, not today: a visit from an earlier day
// written up late belongs on that day in the history and the statistics.
// vitalsOnly: made by the vital-signs route, not by a doctor (1.7.9, claimConsultation).
async function insertConsultation(db, visit, doctorId, departmentId, vitalsOnly) {
  const r = await db.query(
    `INSERT INTO consultation (visit_id, patient_id, doctor_id, department_id, consult_date, vitals_only)
     VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6) RETURNING *`,
    [visit.id, visit.patient_id, doctorId, departmentId || null, visit.visit_date, !!vitalsOnly]);
  return r.rows[0];
}

const CONSULT_FOR_SCREEN = `SELECT c.*, (SELECT s.name FROM staff s WHERE s.id = c.vitals_by) AS vitals_by_name,
              (SELECT s.name FROM staff s WHERE s.id = c.doctor_id) AS opened_by_name
         FROM consultation c
        WHERE c.visit_id = $1
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 1`;

// GET /api/consultations/visit/:visitId - what opening a patient reads: the visit's
// status as it is now and its consultation, null when none was started. Changes nothing.
// other_records: the visit has a document or a bill - records the screen does not load,
// so it knows not to offer "back to waiting" (the server would refuse it).
// A cancelled visit is refused as before (it could be picked from the patient's visits).
router.get('/visit/:visitId', canConsult, async (req, res) => {
  try {
    const vis = await pool.query('SELECT id, status FROM visit WHERE id = $1', [req.params.visitId]);
    if (vis.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    if (vis.rows[0].status === 'cancelled') return res.status(409).json({ error: VISIT_CANCELLED });
    const c = await pool.query(CONSULT_FOR_SCREEN, [req.params.visitId]);
    const rec = await visitRecords(pool, req.params.visitId);
    res.json({ visit_status: vis.rows[0].status, consultation: c.rows[0] || null,
      other_records: !!(rec && (rec.documents || rec.bills)) });
  } catch (err) { sendDbError(res, err); }
});

// PUT /api/consultations/visit/:visitId/waiting - back to the waiting list.
// Only a visit in consultation with nothing recorded: no note, prescription, order,
// diagnosis, vital sign, document or bill - visitHasRecords (consult.visit.js), the one
// test reception's status buttons use too. Anything recorded -> 409 (finish or cancel is
// the way then). The empty consultation row goes with it. No change-log line: nothing
// that was recorded is lost, and the log has no action for a status change.
router.put('/visit/:visitId/waiting', canConsult, (req, res) => inTx(res, async (client) => {
  const vis = await client.query('SELECT id, status FROM visit WHERE id = $1 FOR UPDATE', [req.params.visitId]);
  if (vis.rows.length === 0) return [404, { error: 'Visit not found' }];
  if (vis.rows[0].status !== 'in_progress') return [409, { error: VISIT_NOT_STARTED }];
  if (await visitHasRecords(client, req.params.visitId)) return [409, { error: VISIT_HAS_RECORDS }];
  await client.query('DELETE FROM consultation WHERE visit_id = $1', [req.params.visitId]);
  const r = await client.query("UPDATE visit SET status = 'waiting', updated_at = NOW() WHERE id = $1 RETURNING id, status", [req.params.visitId]);
  return [200, r.rows[0]];
}));

// POST /api/consultations - START the consultation of a visit (or reopen it for writing):
// makes the consultation row when there is none and puts the visit in consultation.
router.post('/', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { visit_id, patient_id, department_id } = req.body;

    if (!visit_id || !patient_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'visit_id and patient_id are required' });
    }

    // A cancelled visit stays cancelled. Opening one (it can be picked from the patient's
    // visit list) used to create a consultation and flip the visit to in_progress,
    // bringing back a visit reception had cancelled. The row is locked so a
    // cancellation landing at the same moment is seen.
    const vis = await client.query('SELECT id, status, visit_date, patient_id FROM visit WHERE id = $1 FOR UPDATE', [visit_id]);
    if (vis.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Visit not found' }); }
    if (vis.rows[0].status === 'cancelled') { await client.query('ROLLBACK'); return res.status(409).json({ error: VISIT_CANCELLED }); }
    // The consultation belongs to the visit's patient (bug hunt 2026-11-10): the row took
    // patient_id from the request, so a wrong id filed the consultation - notes, vitals,
    // prescriptions - in another patient's history and left it out of the right one.
    if (String(vis.rows[0].patient_id) !== String(patient_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'patient_id is not the patient of this visit', code: 'PATIENT_MISMATCH' });
    }

    // Reuse an existing consultation for this visit instead of creating duplicates
    // every time the doctor clicks the same waiting patient.
    // opened_by_name: the account that opened the consultation first - the chart header's
    // fallback when the visit has no doctor, as GET /patients/:id/history does.
    // The row can also have been made by reception typing the vital signs (2026-11-09):
    // it is the same row, found here, and the doctor writes on it.
    let existing = await client.query(CONSULT_FOR_SCREEN, [visit_id]);

    if (existing.rows.length > 0) {
      // A finished consultation leaves its visit finished (opening one from the Terminé
      // tab must not reopen it) - unless reception put that visit back to waiting: then
      // the doctor's start puts it in consultation like any waiting visit.
      const waiting = vis.rows[0].status === 'registered' || vis.rows[0].status === 'waiting';
      if (waiting || (existing.rows[0].status !== 'completed' && existing.rows[0].status !== 'signed')) {
        await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
      }
      // The doctor's start makes a vitals-only row the doctor's consultation (1.7.9).
      await claimConsultation(client, existing.rows[0].id, req.user, waiting);
      existing = await client.query(CONSULT_FOR_SCREEN, [visit_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }

    // First time this visit is opened for consultation.
    await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
    const row = await insertConsultation(client, { id: visit_id, patient_id: vis.rows[0].patient_id, visit_date: vis.rows[0].visit_date },
      req.user.id, department_id || req.user.department_id);
    await client.query('COMMIT');
    row.opened_by_name = req.user.name || null;
    res.status(201).json(row);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

// PUT /api/consultations/:id - save consultation note
router.put('/:id', canConsult, (req, res) => inTx(res, async (client) => {
  if (Object.prototype.hasOwnProperty.call(req.body, 'note_text')) return [400, { error: NOTE_ELSEWHERE }];
  // Only the fields present in the request are written. The screen sends the note and
  // the vital signs; setting every other column from an absent key wrote NULL into
  // subjective/objective/assessment/plan/weight/height on every save. A key sent as
  // null still clears its field (an emptied vital sign).
  const sent = NOTE_FIELDS.filter(function (f) { return Object.prototype.hasOwnProperty.call(req.body, f); });
  // The vital signs go through the same reading as reception's and the phone's (readVitals,
  // below; bug hunt 2026-11-10): this route wrote whatever came - 99 °C, SpO2 150, a
  // systolic of -5 - and '' was a database error. Now '36,5' is 36.5, '' empties the field,
  // and a slip of the finger is refused with the field's name.
  const rv = readVitals(req.body);
  if (rv.error) return [400, { error: rv.error }];
  const vals = sent.map(function (f) { return Object.prototype.hasOwnProperty.call(rv.values, f) ? rv.values[f] : req.body[f]; });
  const sets = sent.map(function (f, i) { return f + '=$' + (i + 1); });
  const prev = await client.query('SELECT * FROM consultation WHERE id = $1 FOR UPDATE', [req.params.id]);
  if (prev.rows.length === 0) return [404, { error: 'Not found' }];
  vals.push(req.params.id);
  let result = await client.query(
    `UPDATE consultation SET ${sets.concat(['updated_at=NOW()']).join(', ')} WHERE id=$${vals.length} RETURNING *`,
    vals
  );
  // Who saved the vital signs last, and when - only when one of them really changed.
  const vitalsSent = sent.filter(function (f) { return VITAL_FIELDS.indexOf(f) >= 0; });
  const vitalsChanged = JSON.stringify(pick(prev.rows[0], vitalsSent)) !== JSON.stringify(pick(result.rows[0], vitalsSent));
  if (vitalsSent.length && vitalsChanged) {
    result = await client.query(
      'UPDATE consultation SET vitals_by = $1, vitals_at = NOW() WHERE id = $2 RETURNING *', [req.user.id, req.params.id]);
  }
  // The doctor saving the vitals starts the visit, as before; so does a note column
  // (S/O/A/P - no screen sends them now): either makes a vitals-only row the doctor's (1.7.9).
  const otherSent = sent.some(function (f) { return VITAL_FIELDS.indexOf(f) < 0; });
  if ((vitalsSent.length && vitalsChanged) || otherSent) {
    await startVisit(client, req.params.id, req.user);
    result = await client.query('SELECT * FROM consultation WHERE id = $1', [req.params.id]);
  }
  result.rows[0].vitals_by_name = await staffName(client, result.rows[0].vitals_by);
  // Both sides are read back from the table, so '36.5' and 36.5 do not count as a change.
  await recordEdit(client, req, await consultOf(client, req.params.id), 'consultation', prev.rows[0], 'note',
    pick(prev.rows[0], sent), pick(result.rows[0], sent));
  return [200, result.rows[0]];
}));

// PUT /api/consultations/:id/complete - complete consultation
router.put('/:id/complete', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const consult = await client.query('SELECT visit_id FROM consultation WHERE id = $1', [req.params.id]);
    if (consult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    // A visit reception cancelled stays cancelled: a waiting visit can carry a consultation
    // (reception put it back to waiting), be cancelled, and still be open on a doctor's screen.
    const vis = await client.query('SELECT status FROM visit WHERE id = $1 FOR UPDATE', [consult.rows[0].visit_id]);
    if (vis.rows.length && vis.rows[0].status === 'cancelled') { await client.query('ROLLBACK'); return res.status(409).json({ error: VISIT_CANCELLED }); }
    // The doctor pressing Terminé on a vitals-only row: it is the doctor's consultation (1.7.9).
    await claimConsultation(client, req.params.id, req.user, false);
    // Finishing is one function (consult.visit.js): reception's "in consultation ->
    // finished" button goes the same way, so completed_at (decision L9) is set there too.
    await completeVisitConsultation(client, consult.rows[0].visit_id);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

async function staffName(db, id) {
  if (id == null) return null;
  const r = await db.query('SELECT name FROM staff WHERE id = $1', [id]);
  return r.rows[0] ? r.rows[0].name : null;
}

// ── Notes: one per doctor per consultation (decisions 2026-09-30) ──
//
// The clinic's manager tried two doctor accounts on one visit: both typed into the same
// consultation.note_text and nothing said who wrote what. Now each doctor has their own
// note on the visit (consultation_note, UNIQUE consultation + author): the screen's note
// box is "my note for this visit", saved with PUT /:id/note, and the chart on the right
// lists every doctor's note under their name.

// Who may change a note: its author, and nobody else - not an administrator either
// (decision (가), 2026-09-30). The one place this rule lives.
function canEditNote(user, note) {
  return !!user && !!note && note.author_id != null && note.author_id === user.id;
}

async function notesOf(db, consultationId, userId) {
  const r = await db.query(
    `SELECT n.id, n.consultation_id, n.visit_id, n.patient_id, n.author_id, s.name AS author_name,
            n.note_text, n.created_at, n.updated_at
       FROM consultation_note n LEFT JOIN staff s ON s.id = n.author_id
      WHERE n.consultation_id = $1
      ORDER BY n.created_at, n.id`, [consultationId]);
  return r.rows.map(function (n) { n.mine = n.author_id != null && n.author_id === userId; return n; });
}

// GET /api/consultations/:id/notes - every doctor's note on this consultation
router.get('/:id/notes', canConsult, async (req, res) => {
  try { res.json(await notesOf(pool, req.params.id, req.user.id)); }
  catch (err) { sendDbError(res, err); }
});

// PUT /api/consultations/:id/note {note_text} - write or change MY note on this
// consultation. The author is the signed-in account and nothing else: there is no id
// in the request, so no way to point at another doctor's note. An empty text empties
// my note - the row goes, so the chart shows no empty entry. On a finished
// consultation (Terminé pressed, or a visit from another day) the change is logged,
// as any change to a finished record.
router.put('/:id/note', canConsult, (req, res) => inTx(res, async (client) => {
  if (typeof req.body.note_text !== 'string') return [400, { error: 'note_text is required' }];
  const text = req.body.note_text;
  // One save at a time per consultation: two saves of the same doctor (two tabs) must
  // not both insert.
  const cons = await client.query('SELECT id, visit_id, patient_id FROM consultation WHERE id = $1 FOR UPDATE', [req.params.id]);
  if (!cons.rows.length) return [404, { error: 'Not found' }];
  const c = await consultOf(client, req.params.id);
  const had = await client.query(
    'SELECT * FROM consultation_note WHERE consultation_id = $1 AND author_id = $2 FOR UPDATE', [req.params.id, req.user.id]);
  const prev = had.rows[0] || null;
  if (prev && !canEditNote(req.user, prev)) return [403, { error: 'Only its author can change a note' }];
  const empty = text.trim() === '';
  let mine = null;
  if (prev && empty) {
    await client.query('DELETE FROM consultation_note WHERE id = $1', [prev.id]);
    await recordEdit(client, req, c, 'consultation_note', prev, 'note', { note_text: prev.note_text }, { note_text: null });
  } else if (prev) {
    if (prev.note_text === text) {
      mine = prev;
    } else {
      const u = await client.query(
        'UPDATE consultation_note SET note_text = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [text, prev.id]);
      mine = u.rows[0];
      await recordEdit(client, req, c, 'consultation_note', mine, 'note', { note_text: prev.note_text }, { note_text: text });
    }
  } else if (!empty) {
    const i = await client.query(
      `INSERT INTO consultation_note (consultation_id, visit_id, patient_id, author_id, note_text)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [cons.rows[0].id, cons.rows[0].visit_id, cons.rows[0].patient_id, req.user.id, text]);
    mine = i.rows[0];
    await recordEdit(client, req, c, 'consultation_note', mine, 'note', null, { note_text: text });
  }
  if (mine && mine !== prev) await startVisit(client, req.params.id, req.user);
  const notes = await notesOf(client, req.params.id, req.user.id);
  return [200, { note: mine ? notes.filter(function (n) { return n.id === mine.id; })[0] : null, notes: notes }];
}));

// ── Diagnosis ──

// The diagnoses of a consultation (2026-10-02; the table and POST / DELETE existed, the
// screen did not). One PRIMARY diagnosis and any number of secondary ones:
//   - the first diagnosis entered is the primary one;
//   - making another one primary (POST with diagnosis_type 'primary', or PUT) makes the
//     old primary secondary;
//   - removing the primary promotes the oldest remaining line.
// A line is picked from the list of frequent diagnoses (diagnosis_code_id; it keeps its
// own copy of the code and of the name as the doctor saw it) or typed freely (no code).
// Who may change them, and what is logged, is as for prescriptions: any account with the
// consultation permission, on any consultation; a change to a FINISHED consultation makes
// a change-log line (recordEdit). Every write answers with the consultation's whole list,
// so the screen never has to work out the primary / secondary shuffle itself.
const DX_COLUMNS = `d.id, d.consultation_id, d.diagnosis_code_id, d.icd_code, d.diagnosis_name, d.diagnosis_type,
       d.sort_order, d.created_by, d.created_at,
       dc.name_en, dc.name_fr, dc.name_ko`;
// Primary first, then in the order they were entered. The list row's three names come
// along so a screen in another language shows the diagnosis in its own.
async function diagnosesOf(db, consultationId) {
  const r = await db.query(
    `SELECT ${DX_COLUMNS}
       FROM diagnosis d LEFT JOIN diagnosis_code dc ON dc.id = d.diagnosis_code_id
      WHERE d.consultation_id = $1
      ORDER BY (d.diagnosis_type = 'primary') DESC, d.sort_order, d.id`, [consultationId]);
  return r.rows;
}
const DX_NAME_MAX = 300, DX_CODE_MAX = 20;

// GET /api/consultations/diagnosis-codes - the list of frequent diagnoses the screen
// searches: active rows in list order. [{id, code, name_en, name_fr, name_ko, sort_order}]
// (Settings manages the list through its own routes; this is the read for consultation.)
router.get('/diagnosis-codes', canConsult, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, code, name_en, name_fr, name_ko, sort_order FROM diagnosis_code WHERE is_active ORDER BY sort_order, id');
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/consultations/patient/:patientId/diagnoses - every diagnosis of the patient's
// consultations, for the chart (each row names its consultation). Read by the screens
// that read prescriptions and orders.
router.get('/patient/:patientId/diagnoses', canReadRx, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ${DX_COLUMNS}
         FROM diagnosis d
         JOIN consultation c ON c.id = d.consultation_id
         LEFT JOIN diagnosis_code dc ON dc.id = d.diagnosis_code_id
        WHERE c.patient_id = $1
        ORDER BY d.consultation_id, (d.diagnosis_type = 'primary') DESC, d.sort_order, d.id`, [req.params.patientId]);
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/consultations/:id/diagnoses
router.get('/:id/diagnoses', canConsult, async (req, res) => {
  try { res.json(await diagnosesOf(pool, req.params.id)); } catch (err) { sendDbError(res, err); }
});

// POST /api/consultations/:id/diagnoses { diagnosis_code_id?, icd_code?, diagnosis_name, diagnosis_type? }
// -> 201 { diagnosis, diagnoses }. The same list row, or the same words, twice on one
// consultation -> 409.
router.post('/:id/diagnoses', canConsult, (req, res) => inTx(res, async (client) => {
  const b = req.body || {};
  const name = String(b.diagnosis_name == null ? '' : b.diagnosis_name).trim();
  const code = blank(b.icd_code) ? null : String(b.icd_code).trim();
  if (!name) return [400, { error: 'diagnosis_name is required' }];
  if (name.length > DX_NAME_MAX) return [400, { error: 'diagnosis_name must be at most ' + DX_NAME_MAX + ' characters' }];
  if (code && code.length > DX_CODE_MAX) return [400, { error: 'icd_code must be at most ' + DX_CODE_MAX + ' characters' }];
  if (!blank(b.diagnosis_type) && b.diagnosis_type !== 'primary' && b.diagnosis_type !== 'secondary') {
    return [400, { error: "diagnosis_type must be 'primary' or 'secondary'" }];
  }
  let codeId = null;
  if (!blank(b.diagnosis_code_id)) {
    const known = await client.query('SELECT id FROM diagnosis_code WHERE id = $1', [parseInt(b.diagnosis_code_id, 10) || 0]);
    if (known.rows.length === 0) return [400, { error: 'diagnosis_code_id is not in the list' }];
    codeId = known.rows[0].id;
  }
  // The consultation row is locked: two additions at once must not both become primary.
  const lock = await client.query('SELECT id FROM consultation WHERE id = $1 FOR UPDATE', [req.params.id]);
  if (lock.rows.length === 0) return [404, { error: 'Consultation not found' }];
  const c = await consultOf(client, req.params.id);
  const have = await diagnosesOf(client, req.params.id);
  // The same words: case, repeated spaces and accents aside ("Fièvre  typhoïde" = "fievre typhoide").
  const dxWords = (x) => String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (have.some((d) => (codeId && d.diagnosis_code_id === codeId) || dxWords(d.diagnosis_name) === dxWords(name))) {
    return [409, { error: DX_DUPLICATE }];
  }
  const hasPrimary = have.some((d) => d.diagnosis_type === 'primary');
  const type = !hasPrimary || b.diagnosis_type === 'primary' ? 'primary' : 'secondary';
  if (type === 'primary' && hasPrimary) {
    for (const d of have.filter((x) => x.diagnosis_type === 'primary')) {
      await client.query("UPDATE diagnosis SET diagnosis_type = 'secondary' WHERE id = $1", [d.id]);
      await recordEdit(client, req, c, 'diagnosis', d, dxLabel(d), pick(d, DX_LOG), pick(Object.assign({}, d, { diagnosis_type: 'secondary' }), DX_LOG));
    }
  }
  const order = have.reduce((m, d) => Math.max(m, d.sort_order || 0), 0) + 1;
  const result = await client.query(
    `INSERT INTO diagnosis (consultation_id, diagnosis_code_id, icd_code, diagnosis_name, diagnosis_type, sort_order, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, codeId, code, name, type, order, req.user.id]);
  const dx = result.rows[0];
  await recordEdit(client, req, c, 'diagnosis', dx, dxLabel(dx), null, pick(dx, DX_LOG));
  await startVisit(client, req.params.id, req.user);
  return [201, { diagnosis: dx, diagnoses: await diagnosesOf(client, req.params.id) }];
}));

// PUT /api/consultations/diagnosis/:dxId { diagnosis_type: 'primary' } - make this line
// the primary diagnosis; the one that was becomes secondary. -> { diagnoses }
router.put('/diagnosis/:dxId', canConsult, (req, res) => inTx(res, async (client) => {
  if (!req.body || req.body.diagnosis_type !== 'primary') return [400, { error: "diagnosis_type must be 'primary'" }];
  const found = await client.query('SELECT * FROM diagnosis WHERE id = $1', [req.params.dxId]);
  const dx = found.rows[0];
  if (!dx) return [404, { error: 'Diagnosis not found' }];
  await client.query('SELECT id FROM consultation WHERE id = $1 FOR UPDATE', [dx.consultation_id]);
  const c = await consultOf(client, dx.consultation_id);
  const have = await diagnosesOf(client, dx.consultation_id);
  for (const d of have) {
    const want = d.id === dx.id ? 'primary' : 'secondary';
    if (d.diagnosis_type === want) continue;
    await client.query('UPDATE diagnosis SET diagnosis_type = $1 WHERE id = $2', [want, d.id]);
    await recordEdit(client, req, c, 'diagnosis', d, dxLabel(d), pick(d, DX_LOG), pick(Object.assign({}, d, { diagnosis_type: want }), DX_LOG));
  }
  return [200, { diagnoses: await diagnosesOf(client, dx.consultation_id) }];
}));

// DELETE /api/consultations/diagnosis/:dxId -> { success, diagnoses }. Removing the
// primary diagnosis makes the oldest remaining line primary.
router.delete('/diagnosis/:dxId', canConsult, (req, res) => inTx(res, async (client) => {
  const found = await client.query('SELECT consultation_id FROM diagnosis WHERE id = $1', [req.params.dxId]);
  if (found.rows.length === 0) return [200, { success: true, diagnoses: [] }];
  const consultationId = found.rows[0].consultation_id;
  await client.query('SELECT id FROM consultation WHERE id = $1 FOR UPDATE', [consultationId]);
  const result = await client.query('DELETE FROM diagnosis WHERE id = $1 RETURNING *', [req.params.dxId]);
  const dx = result.rows[0];
  const c = await consultOf(client, consultationId);
  if (dx) await recordEdit(client, req, c, 'diagnosis', dx, dxLabel(dx), pick(dx, DX_LOG), null);
  const left = await diagnosesOf(client, consultationId);
  if (left.length && !left.some((d) => d.diagnosis_type === 'primary')) {
    const next = left.slice().sort((x, y) => (x.sort_order - y.sort_order) || (x.id - y.id))[0];
    await client.query("UPDATE diagnosis SET diagnosis_type = 'primary' WHERE id = $1", [next.id]);
    await recordEdit(client, req, c, 'diagnosis', next, dxLabel(next), pick(next, DX_LOG), pick(Object.assign({}, next, { diagnosis_type: 'primary' }), DX_LOG));
  }
  return [200, { success: true, diagnoses: await diagnosesOf(client, consultationId) }];
}));

// ── Prescriptions ──

// GET /api/consultations/visit/:visitId/prescriptions  — 내원 단위 처방(문서 발급용)
router.get('/visit/:visitId/prescriptions', canReadRx, async (req, res) => {
  try {
    const result = await pool.query(
      // dosage_form: the drug's form (034 import), read now rather than copied - it only
      // chooses the unit word of the sentence (rx-dosing.js: "1 gél. x 3 fois/jour"), never
      // an amount, so a corrected form should show at once on old lines too.
      `SELECT rx.*, (SELECT d.dosage_form FROM drug d WHERE d.id = rx.drug_id) AS dosage_form
         FROM prescription rx
         JOIN consultation c ON c.id = rx.consultation_id
        WHERE c.visit_id = $1 ORDER BY rx.sort_order, rx.id`,
      [req.params.visitId]
    );
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/consultations/:id/prescriptions
router.get('/:id/prescriptions', canReadRx, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rx.*, (SELECT d.dosage_form FROM drug d WHERE d.id = rx.drug_id) AS dosage_form,
              (SELECT s.name FROM staff s WHERE s.id = rx.prescribed_by) AS prescribed_by_name
         FROM prescription rx WHERE rx.consultation_id = $1 ORDER BY rx.sort_order`, [req.params.id]);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

// The one place the total of a prescription line is worked out. The clinic prescribes
// the Korean way: `dose` is the DAILY total (일총투여), `frequency` how many times a day
// it is split into, `days` how long. So 3.000 / 3 / 7 is three tablets a day, one at a
// time, for a week: 21. Frequency only divides the day's amount for the label (one
// dose = dose / frequency, shown on screen); it does not change the total.
// Until 2026-09-29 the screen sent dose x frequency x days, three times too much on a
// TID line; rows saved then keep their total (see the PUT below).
// Everything else - the pharmacy's stock deduction, the bill, the drug statistics -
// reads total_qty as stored, so the formula lives here and nowhere else.
// A daily dose or number of days left empty gives NO total (NULL), never 0 and never
// "1 day" (decision B, 2026-09-29: drugs have no default dose any more, so a line
// added from the search starts empty). The pharmacy stops on a line with no total and
// the cashier's list flags it, so nothing goes out as 0 tablets / 0 charged or as one
// day's worth the doctor never wrote.
function rxTotal(dose, days) {
  const d = parseFloat(dose);
  const n = parseInt(days);
  if (!(d > 0) || !(n > 0)) return null;
  return Math.round(d * n * 1000) / 1000;   // DECIMAL(10,3)
}
// An empty field is stored empty (NULL): times and days used to be filled with 1 here,
// which turned a blank the doctor had not filled into a silent "once a day, 1 day".
function blankNull(v) { return v === undefined || v === null || String(v).trim() === '' ? null : v; }
// The drug's dosage form on a prescription row the screen gets back from a write, as the
// two reads above give it.
async function withForm(db, row) {
  if (!row) return row;
  const d = row.drug_id ? await db.query('SELECT dosage_form FROM drug WHERE id = $1', [row.drug_id]) : { rows: [] };
  row.dosage_form = d.rows[0] ? d.rows[0].dosage_form : null;
  // The name of who wrote the line: the screen shows it when two doctors prescribed on one visit.
  row.prescribed_by_name = await staffName(db, row.prescribed_by);
  return row;
}
function intOrNull(v) { const n = parseInt(v); return Number.isFinite(n) ? n : null; }

// Amounts as typed (bug hunt 2026-11-10, with the vital signs of round 2). A French keyboard
// types the decimal with a comma: "1,5" was refused with "dose must be a number" - the row
// then kept its OLD dose on the server while the screen showed the new one until the alert
// was read. A plain decimal number with a comma is read as that number; the text is trimmed
// ("  2 " was stored with its spaces) and anything else Number() would take - "1e2", "0x10",
// " " - stays for badAmounts or is refused here, so the dose column holds what the pharmacy
// can read. Used for a prescription's daily dose and an order's quantity.
function typedAmount(v) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  return /^\d+,\d+$/.test(s) ? s.replace(',', '.') : s;
}
function badPlainNumber(field, v) {
  if (v === undefined || v === null || v === '') return null;
  return typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v)) ? null : field + ' must be a number';
}
// A PUT writes the fields it is sent and leaves the others as they are (bug hunt
// 2026-11-10): both line routes set every column from the body, so a body without a field
// emptied it - PUT {frequency: 2} wiped the dose, the days and the total of a prescription,
// PUT {} put an order back to 1 x 1 and its bill with it. The screen always sends the whole
// row, so nothing was lost there; any other caller would have. `stored` is the locked row.
function withStored(body, stored, fields) {
  const out = Object.assign({}, body || {});
  fields.forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = stored[k]; });
  return out;
}

// Pack-unit drugs (columns from the pharmacy's 025): a syrup, a cream, an inhaler is
// handed out by the bottle, tube or piece. Since 1.7.16 (the clinic's manager, 2026-11-09:
// « 2 · 1 · 1 means two go out ») its total is worked out like any other line - daily
// total x days - and the number fields ARE the count; the intake instructions go in the
// sig or the memo. Until then the count was a separate pack_qty (migration 062 converts
// the open lines). What stays special: the count must be a whole number of bottles - a
// line whose product is not whole is refused, not rounded. The flag and the unit word are
// copied from the drug table when the line is written (as the price is), so marking the
// drug later does not change an existing line; what the screen sends for them is not used.
const PACK_TOTAL_BAD = 'the pack-unit total (daily total x days) must be a whole number of at least 1';
function badPackTotal(total) { return total !== null && !(Number.isInteger(total) && total >= 1); }

// POST /api/consultations/:id/prescriptions
router.post('/:id/prescriptions', canConsult, (req, res) => inTx(res, async (client) => {
  // total_qty from the client is ignored: the server works it out (rxTotal), for a
  // pack-unit drug too (a whole number of bottles, or refused).
  req.body.dose = typedAmount(req.body.dose);
  const { drug_id, drug_code, drug_name, dose, frequency, days, route, unit_price, memo } = req.body;
  if (blank(drug_name)) return [400, { error: 'drug_name is required' }];
  const invalid = badPlainNumber('dose', dose) || badAmounts(req.body, ['dose', 'frequency', 'days', 'unit_price']) || badRoute(route);
  if (invalid) return [400, { error: invalid }];
  const c = await consultOf(client, req.params.id);
  if (!c) return [404, { error: 'Consultation not found' }];
  let pack = { pack_unit: false, pack_label: null };
  if (drug_id) {
    const d = await client.query('SELECT pack_unit, pack_label FROM drug WHERE id = $1', [drug_id]);
    if (d.rows[0] && d.rows[0].pack_unit) pack = { pack_unit: true, pack_label: d.rows[0].pack_label || 'unit' };
  }
  const total = rxTotal(dose, days);
  if (pack.pack_unit && badPackTotal(total)) return [400, { error: PACK_TOTAL_BAD }];
  const result = await client.query(
    `INSERT INTO prescription (consultation_id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo,
                               pack_unit, pack_label, prescribed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [req.params.id, drug_id, drug_code, drug_name, blankNull(dose), intOrNull(frequency), intOrNull(days), route, total, unit_price, memo,
     pack.pack_unit, pack.pack_label, req.user.id]
  );
  const rx = result.rows[0];
  await recordEdit(client, req, c, 'prescription', rx, rx.drug_name, null, pick(rx, RX_LOG));
  await startVisit(client, req.params.id, req.user);
  return [201, await withForm(client, rx)];
}));

// Once the pharmacy has handed the drug over, its stock is already deducted. Changing
// or deleting the line afterwards would move the bill but not the shelf, so the two
// would disagree for good. The row is read FOR UPDATE first: the pharmacy's dispense
// updates the same row, so it either lands before (and is seen here) or waits.
// status can be NULL (the column only has a default); NULL is not dispensed.
async function lockRx(client, rxId) {
  const r = await client.query('SELECT * FROM prescription WHERE id = $1 FOR UPDATE', [rxId]);
  if (r.rows.length === 0) return { refuse: [404, { error: 'Not found' }] };
  if (r.rows[0].status === 'dispensed') return { refuse: [409, { error: RX_DISPENSED }] };
  return { rx: r.rows[0] };
}

// PUT /api/consultations/prescription/:rxId - update prescription details
router.put('/prescription/:rxId', canConsult, (req, res) => inTx(res, async (client) => {
  // total_qty from the client is ignored: the server works it out (rxTotal).
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'dose')) req.body.dose = typedAmount(req.body.dose);
  const invalid = badPlainNumber('dose', (req.body || {}).dose) || badAmounts(req.body || {}, ['dose', 'frequency', 'days', 'unit_price']) || badRoute((req.body || {}).route);
  if (invalid) return [400, { error: invalid }];
  const got = await lockRx(client, req.params.rxId);
  if (got.refuse) return got.refuse;
  // Fields not sent keep what the line holds (withStored); unit_price already did (COALESCE).
  const { dose, frequency, days, route, memo, unit_price } = withStored(req.body, got.rx, ['dose', 'frequency', 'days', 'route', 'memo']);
  const freq = intOrNull(frequency), nDays = intOrNull(days);
  const newDose = dose === undefined || dose === null || String(dose).trim() === '' ? null : Number(dose);
  // A pack-unit line (the flag stored on the line) must come out as whole bottles.
  if (got.rx.pack_unit && badPackTotal(rxTotal(dose, nDays))) return [400, { error: PACK_TOTAL_BAD }];
  // total_qty is recomputed only when the dose, the times a day or the
  // days really changed (compared as numbers: "3" and "3.000" are the same dose), or
  // when it is empty (a line saved with no total gets one when it is saved again - the
  // payment session's request). The screen saves a row whenever a field loses focus,
  // so without this an old visit opened after the formula change would have its
  // totals cut to a third just by clicking through them - and a visit already paid for
  // would show up for a refund. In the comparison the columns are the row's values
  // before this UPDATE.
  const result = await client.query(
    `UPDATE prescription
     SET dose=$1, frequency=$2, days=$3, route=$4, memo=$5, unit_price=COALESCE($7, unit_price),
         total_qty = CASE
           WHEN (CASE WHEN dose ~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$' THEN dose::numeric END) IS DISTINCT FROM $9::numeric
             OR frequency IS DISTINCT FROM $2
             OR days IS DISTINCT FROM $3
             OR total_qty IS NULL
           THEN $6 ELSE total_qty END
     WHERE id=$8 RETURNING *`,
    [blankNull(dose), freq, nDays, route, memo, rxTotal(dose, nDays), unit_price, req.params.rxId, newDose]
  );
  const rx = result.rows[0];
  await recordEdit(client, req, await consultOf(client, rx.consultation_id), 'prescription', rx, rx.drug_name,
    pick(got.rx, RX_LOG), pick(rx, RX_LOG));
  return [200, await withForm(client, rx)];
}));

// DELETE /api/consultations/prescription/:rxId - always logged (not only when finished)
router.delete('/prescription/:rxId', canConsult, (req, res) => inTx(res, async (client) => {
  const got = await lockRx(client, req.params.rxId);
  if (got.refuse) return got.refuse;
  const rx = got.rx;
  await client.query('DELETE FROM prescription WHERE id = $1', [rx.id]);
  const c = await consultOf(client, rx.consultation_id);
  await writeAudit(client, req, {
    action: ACTIONS.PRESCRIPTION_DELETE, patient_id: c && c.patient_id, visit_id: c && c.visit_id,
    entity: 'prescription', entity_id: rx.id, summary: rx.drug_name, before: pick(rx, RX_LOG), after: null,
  });
  return [200, { success: true }];
}));

// ── Order Items (Lab, Imaging, Procedures) ──

// The one place the total of an ORDER line is worked out (decision ⑭, 2026-09-29):
// quantity (the "daily total" column on screen) x days, the same Korean rule as a
// prescription - the times a day are not multiplied. An injection once a day for 5 days,
// 1 · 1 · 5, is billed 5 times. Payment reads order_item.total_qty and nothing else.
// A blank quantity counts as 1, a blank or bad number of days as 1; a quantity of 0
// stays 0 (nothing billed - decided with payment, which used to read 0 as 1 on screen).
// Lines saved before 030_consultation_order_total.sql were filled with their quantity.
function orderQty(q) { return q === undefined || q === null || String(q).trim() === '' ? 1 : Number(q); }
function orderTotal(quantity, days) {
  const q = orderQty(quantity);
  const n = parseInt(days) || 1;
  return Math.round(q * n * 1000) / 1000;   // DECIMAL(10,3)
}

const ORDER_KINDS = ['fee', 'lab', 'imaging', 'procedure', 'supply'];   // order_code's CHECK (055)

// POST /api/consultations/:id/orders
router.post('/:id/orders', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    req.body.quantity = typedAmount(req.body.quantity);
    const { order_code_id, order_code, order_name, dose, frequency, days, quantity, unit_price, memo } = req.body;
    let code_type = req.body.code_type;
    if (blank(order_name)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'order_name is required' }); }
    const invalid = badPlainNumber('quantity', quantity) || badAmounts(req.body, ['frequency', 'days', 'quantity', 'unit_price']) || badOrderSig(dose);
    if (invalid) { await client.query('ROLLBACK'); return res.status(400).json({ error: invalid }); }
    // Get consultation info
    const consult = await consultOf(client, req.params.id);
    if (!consult) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Consultation not found' }); }
    const { visit_id, patient_id } = consult;

    // Get order code details for order-feed mapping.
    // The visible order window stays unified. For PACS/SmartServer, the EMR exports
    // the order type and modality; station AE is optional and is not auto-assigned.
    let pacs_modality = null, station_ae = null, body_part = null, worklist_enabled = false;
    if (order_code_id) {
      const ocResult = await client.query('SELECT * FROM order_code WHERE id = $1', [order_code_id]);
      if (ocResult.rows.length > 0) {
        const oc = ocResult.rows[0];
        // The kind of the line is the order code's (bug hunt 2026-11-10): it came from the
        // request alone, so one line could be an imaging order for the device list (the
        // modality below is read from the table) and something else for the lab's and the
        // cashier's lists, which read order_item.code_type.
        code_type = oc.code_type;
        pacs_modality = oc.pacs_modality;
        // Station AE intentionally ignored by default. The EMR sends modality/order,
        // not a device assignment.
        station_ae = null;
        body_part = oc.body_part;
        worklist_enabled = oc.worklist_enabled;
      }
    }

    // A line without an order code must still be one of the kinds the lists know.
    if (ORDER_KINDS.indexOf(String(code_type)) < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'code_type must be one of ' + ORDER_KINDS.join(', ') });
    }

    // pacs_config and its one row come from 001_schema.sql. (This used to re-create the
    // table on every order, with another clinic's old defaults; removed 2026-09-29.)
    // No row at all reads as the default, auto_create_worklist on.
    const cfgResult = await client.query('SELECT * FROM pacs_config WHERE id = 1');
    const cfg = cfgResult.rows[0] || {};
    // Do not auto-fill station AE from device names. Multiple US rooms/devices can
    // share the same US order pool; assignment belongs to PACS/Worklist/workflow.
    station_ae = station_ae || null;
    if (cfg.auto_create_worklist === false) worklist_enabled = false;

    const oResult = await client.query(
      `INSERT INTO order_item (consultation_id, visit_id, patient_id, order_code_id, order_code, order_name, code_type,
       dose, frequency, days, quantity, total_qty, unit_price, pacs_modality, station_ae, body_part, ordered_by, memo,
       worklist_status, scheduled_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_DATE) RETURNING *`,
      // Blank quantity / times / days are stored as 1, never NULL, so what the screen
      // shows (1 · 1 · 1 for a lab order) is what is stored and billed.
      [req.params.id, visit_id, patient_id, order_code_id, order_code, order_name, code_type,
       dose, parseInt(frequency) || 1, parseInt(days) || 1, orderQty(quantity), orderTotal(quantity, days),
       unit_price, pacs_modality, station_ae, body_part, req.user.id, memo,
       worklist_enabled ? 'pending' : 'completed']
    );

    let orderItem = oResult.rows[0];
    await useSupply(client, orderItem, req.user.id);

    // If worklist enabled, create worklist log entry
    if (worklist_enabled && pacs_modality) {
      const today = todayLocal().replace(/-/g, '');
      // DICOM AccessionNumber is VR=SH (max 16 chars). order_item.id is globally
      // unique, so 'YYMMDD-<orderId>' is unique, traceable and well under 16 chars.
      const accession = `${today.slice(2)}-${orderItem.id}`;
      const studyUid = `1.2.826.0.1.3680043.${today}.${orderItem.id}.${Math.floor(Math.random() * 10000)}`;
      await client.query(
        `INSERT INTO worklist_log (order_item_id, patient_id, modality, station_ae, body_part, accession_no, study_instance_uid, scheduled_date, scheduled_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,CURRENT_TIME)`,
        [orderItem.id, patient_id, pacs_modality, station_ae || null, body_part, accession, studyUid]
      );
      // Update order item worklist status. The row sent back is the updated one: the
      // screen shows "Envoyé" from worklist_sent_at, and the insert's row did not have it,
      // so the doctor saw only 🖼 until the patient was opened again (imaging-day test
      // 2026-09-30, B) - the screen's 30 s refresh also waits for that field.
      const upd = await client.query(
        "UPDATE order_item SET worklist_status = 'sent', worklist_sent_at = NOW() WHERE id = $1 RETURNING *", [orderItem.id]);
      orderItem = upd.rows[0];
    }

    await recordEdit(client, req, consult, 'order_item', orderItem, orderLabel(orderItem), null, pick(orderItem, ORDER_LOG));
    await startVisit(client, req.params.id, req.user);
    await client.query('COMMIT');
    orderItem.ordered_by_name = req.user.name || null;
    res.status(201).json(orderItem);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});



// An ORDER line's `dose` is its sig - the box under Posologie / 용법 on an order row -
// and is text ("PRN", "QD", "après repas"), at most the column's 20 characters. It was
// checked as a number like a prescription's daily dose (the 400 checks of 2026-09-29),
// so a word typed there was refused with "dose must be a number" and the only thing the
// box could hold was the meaningless "1.000" copied from the order code. Nothing reads
// it as an amount: an order is billed by quantity x days (orderTotal).
function badOrderSig(v) {
  return v != null && String(v).length > 20 ? 'dose (the sig of an order) must be at most 20 characters' : null;
}

// PUT /api/consultations/order/:orderId - update order item dosing/quantity details
router.put('/order/:orderId', canConsult, (req, res) => inTx(res, async (client) => {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'quantity')) req.body.quantity = typedAmount(req.body.quantity);
  const invalid = badPlainNumber('quantity', (req.body || {}).quantity) || badAmounts(req.body || {}, ['frequency', 'days', 'quantity', 'unit_price']) || badOrderSig((req.body || {}).dose);
  if (invalid) return [400, { error: invalid }];
  // A cancelled order is a record: its quantity and notes no longer change (and it is
  // out of the bill, so a change would mean nothing anyway). Locked and checked here,
  // so the cancel route cannot land between the check and the write. status can be
  // NULL (the column only has a default); NULL is not cancelled.
  const prev = await client.query('SELECT * FROM order_item WHERE id = $1 FOR UPDATE', [req.params.orderId]);
  if (prev.rows.length === 0) return [404, { error: 'Not found' }];
  if (prev.rows[0].status === 'cancelled') return [409, { error: ORDER_CANCELLED }];
  // total_qty is worked out again only when the quantity or the days really changed
  // (as numbers), or when it is missing - the screen saves a row on every blur, and an
  // old line must not change its bill by being clicked through (same rule as the
  // prescription PUT).
  const was = prev.rows[0];
  // Fields not sent keep what the line holds (withStored); unit_price already did (COALESCE).
  const { dose, frequency, days, quantity, memo, unit_price } = withStored(req.body, was, ['dose', 'frequency', 'days', 'quantity', 'memo']);
  const q = orderQty(quantity), nDays = parseInt(days) || 1;
  const changed = was.total_qty === null || Number(was.quantity) !== q || (parseInt(was.days) || 1) !== nDays;
  const result = await client.query(
    `UPDATE order_item
     SET dose=$1, frequency=$2, days=$3, quantity=$4, memo=$5, unit_price=COALESCE($6, unit_price),
         total_qty = CASE WHEN $8::boolean THEN $9::numeric ELSE total_qty END, updated_at=NOW()
     WHERE id=$7 RETURNING *`,
    [dose, parseInt(frequency) || 1, nDays, q, memo, unit_price, req.params.orderId, changed, orderTotal(q, nDays)]
  );
  const o = result.rows[0];
  await resupplyDiff(client, was, o, req.user.id);
  await recordEdit(client, req, await consultOf(client, o.consultation_id), 'order_item', o, orderLabel(o),
    pick(prev.rows[0], ORDER_LOG), pick(o, ORDER_LOG));
  return [200, o];
}));

// POST /api/consultations/order/:orderId/cancel  {reason}
// Decision 3-B (2026-09-29). An order with a result cannot be deleted; the doctor who
// tries is offered this instead. The order is marked cancelled - out of the lab lists
// and the bill (lab and payment sessions read status) - and its result stays on record.
// - locked FOR UPDATE, like the lab's result save, so the two are ordered: a result
//   saved first makes this a cancel, a cancel first makes the lab's save refuse (409);
// - an order with nothing produced gets 409: delete it instead, so the two paths never
//   blur into each other;
// - already cancelled: returned as it is (a second click, or two screens);
// - no undo (decision: order it again if cancelled by mistake);
// - imaging the same way (decision 38-3, switched on 2026-09-29 after the PACS merge):
//   its worklist entry still waiting on the modality is cancelled too, in this
//   transaction, by PACS's cancelWorklistForOrder (pacs.cancel.js) - it leaves the
//   bridge feed within one cycle. A study already taken stays 'completed' as a record.
// - logged (ORDER_CANCEL), in the same transaction.
router.post('/order/:orderId/cancel', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oi = await client.query('SELECT * FROM order_item WHERE id = $1 FOR UPDATE', [req.params.orderId]);
    if (oi.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const prev = oi.rows[0];
    if (prev.status === 'cancelled') { await client.query('ROLLBACK'); return res.json(prev); }
    if (!(await orderProduced(client, req.params.orderId, prev.result_text))) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: ORDER_NO_RESULT });
    }
    const reason = String((req.body && req.body.reason) || '').trim().slice(0, 500) || null;
    // Before the order's own UPDATE, so the row returned below carries the worklist
    // status this sets. Harmless for an order with no worklist entry (a lab order).
    await cancelWorklistForOrder(client, prev.id);
    const r = await client.query(
      `UPDATE order_item
          SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1, cancel_reason = $2, updated_at = NOW()
        WHERE id = $3 RETURNING *`,
      [req.user.id, reason, req.params.orderId]);
    await returnSupply(client, prev, req.user.id, reason);
    await writeAudit(client, req, {
      action: ACTIONS.ORDER_CANCEL, patient_id: prev.patient_id, visit_id: prev.visit_id,
      entity: 'order_item', entity_id: prev.id, summary: orderLabel(prev),
      before: { status: prev.status, cancel_reason: null, worklist_status: prev.worklist_status },
      after: { status: 'cancelled', cancel_reason: reason, worklist_status: r.rows[0].worklist_status },
    });
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

// DELETE /api/consultations/order/:orderId
router.delete('/order/:orderId', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // An order that has produced something is a record, not a request any more.
    // lab_result and worklist_log both hang off order_item with ON DELETE CASCADE, so
    // deleting a resulted order would silently take the lab values, the imaging
    // accession and the radiology reading with it. Refuse instead.
    // FOR UPDATE first: a lab result being saved right now needs a key lock on this
    // row, so it either finishes before the check below sees it, or waits and then
    // fails on the missing order - never lands on an order we are deleting.
    const oi = await client.query('SELECT * FROM order_item WHERE id = $1 FOR UPDATE', [req.params.orderId]);
    if (oi.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const prev = oi.rows[0];
    if (await orderProduced(client, req.params.orderId, prev.result_text)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: ORDER_HAS_RESULT });
    }
    // An unstarted worklist entry goes with the order (the FK cascades; explicit so
    // the intent is visible here).
    await client.query('DELETE FROM worklist_log WHERE order_item_id = $1', [req.params.orderId]);
    // Before the line goes: the movement row points at it (SET NULL once deleted).
    if (prev.status !== 'cancelled') await returnSupply(client, prev, req.user.id);
    await client.query('DELETE FROM order_item WHERE id = $1', [req.params.orderId]);
    // Always logged (ORDER_DELETE), not only on a finished consultation.
    await writeAudit(client, req, {
      action: ACTIONS.ORDER_DELETE, patient_id: prev.patient_id, visit_id: prev.visit_id,
      entity: 'order_item', entity_id: prev.id, summary: orderLabel(prev), before: pick(prev, ORDER_LOG), after: null,
    });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

// GET /api/consultations/:id/billed-codes - the drug and order codes of this visit that are
// on a bill still in force (not cancelled). The screen asks just before removing a line, to
// add "already paid - the cashier will refund" to its question (integration test,
// 2026-09-29). Matched by code, as the cashier matches what is already billed.
router.get('/:id/billed-codes', canConsult, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT bi.item_code
         FROM billing_item bi
         JOIN billing b ON b.id = bi.billing_id
         JOIN consultation c ON c.visit_id = b.visit_id
        WHERE c.id = $1 AND b.payment_status <> 'cancelled'
          AND bi.item_type NOT IN ('consultation', 'fee') AND COALESCE(bi.item_code, '') <> ''`,
      [req.params.id]);
    res.json(r.rows.map(function (x) { return x.item_code; }));
  } catch (err) { sendDbError(res, err); }
});

// GET /api/consultations/:id/orders
router.get('/:id/orders', canReadRx, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, (SELECT s.name FROM staff s WHERE s.id = o.ordered_by) AS ordered_by_name
         FROM order_item o WHERE o.consultation_id = $1 ORDER BY o.created_at`, [req.params.id]);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

// ── Vital signs typed at reception or on a phone (clinic manager, on site, 2026-11-09) ──
//
// The vital signs are taken where there is no PC: the nurse or the receptionist types
// them on the reception screen (button 「Signes vitaux」 on a queue row) or on a phone
// (/m), and the doctor finds them already filled. They are the consultation's own
// columns, so the doctor's screen needs nothing new:
//   - the row is the visit's ONE consultation row: found if the doctor already started,
//     made here (insertConsultation) if not - and the doctor's start (POST /) then finds
//     it instead of making a second one;
//   - entering them starts nothing: no startVisit, the visit stays waiting. (The doctor's
//     own PUT /:id does start the visit; reception typing a temperature is not the doctor
//     seeing the patient.) A row made here is vitals_only (1.7.9): not in the patient's
//     history, not a record (reception can still cancel the visit, the row goes with it),
//     until the doctor acts on the visit (claimConsultation);
//   - vitals_by / vitals_at say who and when, only when a value really changed;
//   - the change log: recordEdit, the same rule as the doctor's edits - written when the
//     consultation is finished (Terminé pressed). A visit from another day is refused here.
// Mounted on /api/visits (index.js): GET and PUT /api/visits/:id/vitals, and
// GET /api/visits/today/vitals-list for the phone page.
// Who may: ANY signed-in, active member of staff, whatever their role or ticked modules
// (clinic manager, 2026-11-09 - whoever is beside the patient takes the vital signs). So these
// routes check the token only (authMiddleware: an inactive account is refused there, 401);
// vitals_by and the change log still say who typed.
// A visit that is cancelled, from another day, or does not exist -> 404.
// Loose limits, only to catch a slip of the finger (a weight typed in the height box,
// 365 for 36.5). Whole numbers where the column is INTEGER; one decimal is kept by the
// table for temperature, weight and height.
const VITAL_LIMITS = {
  bp_systolic: { min: 30, max: 300, integer: true },
  bp_diastolic: { min: 10, max: 250, integer: true },
  temperature: { min: 25, max: 45, integer: false },
  pulse: { min: 10, max: 300, integer: true },
  spo2: { min: 30, max: 100, integer: true },
  respiratory_rate: { min: 2, max: 100, integer: true },
  weight: { min: 0.2, max: 500, integer: false },
  height: { min: 20, max: 260, integer: false },
};
const VITALS_NOT_FOUND = 'Visit not found';

// The fields sent, as values for the table: { sent: [...], values: {...} } or { error }.
// null or '' empties a field; a number or a numeric string ('36.5', and '36,5' as a
// French phone keyboard types it) is kept; anything else is refused.
function readVitals(body) {
  const sent = VITAL_FIELDS.filter(function (f) { return body && Object.prototype.hasOwnProperty.call(body, f); });
  const values = {};
  for (const f of sent) {
    let v = body[f];
    if (v === null || (typeof v === 'string' && v.trim() === '')) { values[f] = null; continue; }
    if (typeof v === 'string') v = v.trim().replace(',', '.');
    if ((typeof v !== 'number' && typeof v !== 'string') || (typeof v === 'string' && !/^-?\d+(\.\d+)?$/.test(v))) {
      return { error: f + ' must be a number' };
    }
    const n = Number(v);
    const lim = VITAL_LIMITS[f];
    if (!isFinite(n)) return { error: f + ' must be a number' };
    if (lim.integer && !Number.isInteger(n)) return { error: f + ' must be a whole number' };
    if (n < lim.min || n > lim.max) return { error: f + ' must be between ' + lim.min + ' and ' + lim.max };
    values[f] = n;
  }
  return { sent: sent, values: values };
}

// The visit, when vitals may be typed on it: not cancelled, and today's (the queue's
// today, CURRENT_DATE - the day /visits/today and /visits/day list).
async function vitalsVisit(db, id, lock) {
  if (!/^\d{1,9}$/.test(String(id))) return null;
  const r = await db.query(
    `SELECT id, patient_id, status, visit_date, department_id FROM visit
      WHERE id = $1 AND status <> 'cancelled' AND visit_date = CURRENT_DATE` + (lock ? ' FOR UPDATE' : ''), [id]);
  return r.rows[0] || null;
}

// The answer of both routes: the eight values, who typed them and when, the visit status.
async function vitalsBody(db, visit, c) {
  const o = { visit_id: visit.id, visit_status: visit.status, consultation_id: c ? c.id : null };
  VITAL_FIELDS.forEach(function (f) { o[f] = c && c[f] != null ? c[f] : null; });
  o.vitals_by = c ? c.vitals_by || null : null;
  o.vitals_by_name = c ? await staffName(db, c.vitals_by) : null;
  o.vitals_at = c ? c.vitals_at || null : null;
  return o;
}

const vitalsRouter = express.Router();

// GET /api/visits/today/vitals-list - the phone page's list: today's waiting and
// in-consultation visits, every department and doctor, with only what the list shows
// (GET /visits/today needs reception or consultation, and carries the whole patient row).
// Same order as the queues: by registration time.
vitalsRouter.get('/today/vitals-list', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.id, p.chart_no, p.last_name, p.first_name, v.status, v.reception_time,
              (SELECT c.vitals_at FROM consultation c WHERE c.visit_id = v.id
                ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS vitals_at
         FROM visit v JOIN patient p ON p.id = v.patient_id
        WHERE v.visit_date = CURRENT_DATE AND v.status IN ('registered', 'waiting', 'in_progress')
        ORDER BY v.reception_time ASC, v.created_at ASC`);
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// ── The phone's other lists (1.7.11, clinic manager on site) ──
// /m became the tool wherever there is no PC: besides the vital signs, the lab's orders,
// every order of a visit, and the imaging orders - each for TODAY only (the database's
// CURRENT_DATE, as the queues), visits cancelled at reception left out. They are read-only
// lists for any signed-in, active member of staff (token only, like the vitals list):
// what was ordered and where it stands, never a result value. Typing a lab result from
// the phone goes through the PC lab screen's own routes (lab.routes.js GET
// /order/:id/items and POST /order/:id/results, permission 'lab'), unchanged.

// GET /api/visits/today/lab-list - today's visits that have lab orders, each with its
// lab orders (not the cancelled ones) and how many are pending / done.
vitalsRouter.get('/today/lab-list', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.id, v.status, v.reception_time, p.chart_no, p.last_name, p.first_name,
              COUNT(*) FILTER (WHERE o.status <> 'completed')::int AS pending,
              COUNT(*) FILTER (WHERE o.status = 'completed')::int AS done,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code, 'order_name', o.order_name,
                'status', o.status, 'result_at', o.result_at, 'memo', o.memo) ORDER BY o.id) AS orders,
              MIN(o.created_at) AS first_order_at
         FROM visit v
         JOIN patient p ON p.id = v.patient_id
         JOIN order_item o ON o.visit_id = v.id AND o.code_type = 'lab' AND o.status <> 'cancelled'
        WHERE v.visit_date = CURRENT_DATE AND v.status <> 'cancelled'
        GROUP BY v.id, p.id
        ORDER BY MIN(o.created_at) ASC, v.id ASC`);
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/visits/today/orders-list - today's visits that have orders, each with every
// order the doctor placed (fee, lab, imaging, procedure, supply; cancelled ones too, marked
// so): name, type, status, memo, when.
vitalsRouter.get('/today/orders-list', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.id, v.status, v.reception_time, p.chart_no, p.last_name, p.first_name,
              COUNT(*) FILTER (WHERE o.status <> 'cancelled')::int AS active,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code, 'order_name', o.order_name,
                'code_type', o.code_type, 'status', o.status, 'memo', o.memo, 'dose', o.dose,
                'quantity', o.quantity, 'worklist_status', o.worklist_status, 'result_at', o.result_at,
                'created_at', o.created_at) ORDER BY o.id) AS orders
         FROM visit v
         JOIN patient p ON p.id = v.patient_id
         JOIN order_item o ON o.visit_id = v.id
        WHERE v.visit_date = CURRENT_DATE AND v.status <> 'cancelled'
        GROUP BY v.id, p.id
        ORDER BY v.reception_time ASC NULLS LAST, v.id ASC`);
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/visits/today/imaging-list - today's imaging orders of every visit (the PACS's
// rule: imaging type, or any order carrying a device type), oldest first: patient, exam,
// body part and device type (the order's copy, else its order code's), memo, the order's
// status, whether the worklist was sent and whether images arrived (the latest worklist
// entry: images_received_at, image_count).
vitalsRouter.get('/today/imaging-list', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id AS order_item_id, o.visit_id, o.order_code, o.order_name, o.code_type, o.status, o.memo,
              o.worklist_status, o.worklist_sent_at, o.created_at,
              COALESCE(NULLIF(o.pacs_modality, ''), oc.pacs_modality) AS modality,
              COALESCE(NULLIF(o.body_part, ''), oc.body_part) AS body_part,
              p.chart_no, p.last_name, p.first_name, v.status AS visit_status,
              wl.status AS worklist_log_status, wl.sent_at AS worklist_log_sent_at,
              wl.images_received_at, wl.image_count
         FROM order_item o
         JOIN visit v ON v.id = o.visit_id
         JOIN patient p ON p.id = o.patient_id
         LEFT JOIN order_code oc ON oc.id = o.order_code_id
         LEFT JOIN LATERAL (SELECT w.status, w.sent_at, w.images_received_at, w.image_count
                              FROM worklist_log w WHERE w.order_item_id = o.id
                             ORDER BY w.id DESC LIMIT 1) wl ON true
        WHERE v.visit_date = CURRENT_DATE AND v.status <> 'cancelled' AND ${isExam('o')}
        ORDER BY o.created_at ASC, o.id ASC`);
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/visits/:id/vitals
vitalsRouter.get('/:id/vitals', authMiddleware, async (req, res) => {
  try {
    const visit = await vitalsVisit(pool, req.params.id, false);
    if (!visit) return res.status(404).json({ error: VITALS_NOT_FOUND });
    const c = await pool.query(CONSULT_FOR_SCREEN, [visit.id]);
    res.json(await vitalsBody(pool, visit, c.rows[0]));
  } catch (err) { sendDbError(res, err); }
});

// PUT /api/visits/:id/vitals { bp_systolic, bp_diastolic, temperature, pulse, spo2,
// respiratory_rate, weight, height } - any of them; the ones left out are not touched.
vitalsRouter.put('/:id/vitals', authMiddleware, (req, res) => inTx(res, async (client) => {
  const read = readVitals(req.body || {});
  if (read.error) return [400, { error: read.error }];
  // The visit row lock: the doctor's start (POST /) takes it too, so the two cannot both
  // make a consultation row for the visit.
  const visit = await vitalsVisit(client, req.params.id, true);
  if (!visit) return [404, { error: VITALS_NOT_FOUND }];
  const found = await client.query(
    'SELECT * FROM consultation WHERE visit_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE', [visit.id]);
  let prev = found.rows[0] || null;
  const sent = read.sent;
  // Nothing to write: no field sent, or only empty fields on a visit with no row yet -
  // no empty consultation row is made for that.
  const anyValue = sent.some(function (f) { return read.values[f] != null; });
  if (!sent.length || (!prev && !anyValue)) return [200, await vitalsBody(client, visit, prev)];
  if (!prev) {
    // doctor_id is NOT NULL: the account typing, until a doctor starts the visit
    // (claimConsultation). The department is the visit's.
    // vitals_only (1.7.9): not a consultation until a doctor acts on it (claimConsultation).
    prev = await insertConsultation(client, visit, req.user.id, visit.department_id || req.user.department_id, true);
  }
  const vals = sent.map(function (f) { return read.values[f]; });
  const sets = sent.map(function (f, i) { return f + '=$' + (i + 1); });
  vals.push(prev.id);
  let row = (await client.query(
    `UPDATE consultation SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING *`, vals)).rows[0];
  // Both sides read back from the table, so 36.5 and '36.5' are not a change.
  const changed = JSON.stringify(pick(prev, sent)) !== JSON.stringify(pick(row, sent));
  if (changed) {
    row = (await client.query(
      'UPDATE consultation SET vitals_by = $1, vitals_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.user.id, row.id])).rows[0];
    await recordEdit(client, req, await consultOf(client, row.id), 'consultation', prev, 'note',
      pick(prev, sent), pick(row, sent));
  }
  return [200, await vitalsBody(client, visit, row)];
}));

module.exports = router;
// Mounted on /api/visits by index.js.
module.exports.vitalsRouter = vitalsRouter;
