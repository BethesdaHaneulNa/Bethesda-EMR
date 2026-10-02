const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { badAmounts } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { cancelWorklistForOrder } = require('./pacs.cancel');
const { visitRecords, visitHasRecords, completeVisitConsultation } = require('./consult.visit');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
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
// route-by-route table is in wiki/handoff/settings.md "S2".
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

// ── Change log (wiki/03-change-log.md, decision 2026-09-29) ──
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

// ── The waiting list's doctors (director, 2026-10-01) ──
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
// Opening a patient no longer starts anything. The director, with the clinic's staff on
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

// The first record on a visit still waiting puts it in consultation.
async function startVisit(db, consultationId) {
  await db.query(
    `UPDATE visit SET status = 'in_progress', updated_at = NOW()
      WHERE id = (SELECT visit_id FROM consultation WHERE id = $1) AND status IN ('registered', 'waiting')`,
    [consultationId]);
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
    const vis = await client.query('SELECT status, visit_date FROM visit WHERE id = $1 FOR UPDATE', [visit_id]);
    if (vis.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Visit not found' }); }
    if (vis.rows[0].status === 'cancelled') { await client.query('ROLLBACK'); return res.status(409).json({ error: VISIT_CANCELLED }); }

    // Reuse an existing consultation for this visit instead of creating duplicates
    // every time the doctor clicks the same waiting patient.
    // opened_by_name: the account that opened the consultation first - the chart header's
    // fallback when the visit has no doctor, as GET /patients/:id/history does.
    const existing = await client.query(CONSULT_FOR_SCREEN, [visit_id]);

    if (existing.rows.length > 0) {
      // A finished consultation leaves its visit finished (opening one from the Terminé
      // tab must not reopen it) - unless reception put that visit back to waiting: then
      // the doctor's start puts it in consultation like any waiting visit.
      const waiting = vis.rows[0].status === 'registered' || vis.rows[0].status === 'waiting';
      if (waiting || (existing.rows[0].status !== 'completed' && existing.rows[0].status !== 'signed')) {
        await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
      }
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }

    // First time this visit is opened for consultation.
    await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
    // consult_date is the visit's date, not today: a visit from an earlier day written
    // up late belongs on that day in the history and the statistics.
    const result = await client.query(
      `INSERT INTO consultation (visit_id, patient_id, doctor_id, department_id, consult_date)
       VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE)) RETURNING *`,
      [visit_id, patient_id, req.user.id, department_id || req.user.department_id, vis.rows[0].visit_date]
    );
    await client.query('COMMIT');
    result.rows[0].opened_by_name = req.user.name || null;
    res.status(201).json(result.rows[0]);
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
  const vals = sent.map(function (f) { return req.body[f]; });
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
  result.rows[0].vitals_by_name = await staffName(client, result.rows[0].vitals_by);
  if (vitalsSent.length && vitalsChanged) await startVisit(client, req.params.id);
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
// The director tried two doctor accounts on one visit: both typed into the same
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
  if (mine && mine !== prev) await startVisit(client, req.params.id);
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
  if (have.some((d) => (codeId && d.diagnosis_code_id === codeId) || String(d.diagnosis_name).trim().toLowerCase() === name.toLowerCase())) {
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
  await startVisit(client, req.params.id);
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

// Pack-unit drugs (H2-B, decided 2026-09-29; columns from the pharmacy's 025): a syrup,
// a cream, an inhaler is handed out by the bottle, tube or piece, so its line's
// total_qty is the COUNT the doctor writes (pack_qty), not dose x days. The daily
// dose, times and days stay on the line as the intake instructions only.
// The flag and the unit word are copied from the drug table when the line is written
// (as the price is), so marking the drug later does not change an existing line; what
// the screen sends for them is not used.
// pack_qty: a whole number of at least 1 (stock is counted in whole bottles); missing
// or blank is stored as NULL - the pharmacy then stops on "no total" and the bill has
// nothing to charge, rather than a wrong number going through.
const PACK_QTY_BAD = 'pack_qty must be a whole number of at least 1';
function packQty(v) {
  if (v === undefined || v === null || String(v).trim() === '') return { qty: null };
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return { bad: PACK_QTY_BAD };
  return { qty: n };
}

// POST /api/consultations/:id/prescriptions
router.post('/:id/prescriptions', canConsult, (req, res) => inTx(res, async (client) => {
  // total_qty from the client is ignored: the server works it out (rxTotal), or for a
  // pack-unit drug takes the count the doctor wrote (pack_qty).
  const { drug_id, drug_code, drug_name, dose, frequency, days, route, unit_price, memo } = req.body;
  if (blank(drug_name)) return [400, { error: 'drug_name is required' }];
  const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'unit_price']) || badRoute(route);
  if (invalid) return [400, { error: invalid }];
  const c = await consultOf(client, req.params.id);
  if (!c) return [404, { error: 'Consultation not found' }];
  let pack = { pack_unit: false, pack_label: null };
  if (drug_id) {
    const d = await client.query('SELECT pack_unit, pack_label FROM drug WHERE id = $1', [drug_id]);
    if (d.rows[0] && d.rows[0].pack_unit) pack = { pack_unit: true, pack_label: d.rows[0].pack_label || 'unit' };
  }
  let total = rxTotal(dose, days);
  if (pack.pack_unit) {
    const pq = packQty(req.body.pack_qty);
    if (pq.bad) return [400, { error: pq.bad }];
    total = pq.qty;
  }
  const result = await client.query(
    `INSERT INTO prescription (consultation_id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo,
                               pack_unit, pack_label, prescribed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [req.params.id, drug_id, drug_code, drug_name, blankNull(dose), intOrNull(frequency), intOrNull(days), route, total, unit_price, memo,
     pack.pack_unit, pack.pack_label, req.user.id]
  );
  const rx = result.rows[0];
  await recordEdit(client, req, c, 'prescription', rx, rx.drug_name, null, pick(rx, RX_LOG));
  await startVisit(client, req.params.id);
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
  // total_qty from the client is ignored: the server works it out (rxTotal), or for a
  // pack-unit line takes pack_qty.
  const { dose, frequency, days, route, memo, unit_price } = req.body;
  const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'unit_price']) || badRoute(route);
  if (invalid) return [400, { error: invalid }];
  const freq = intOrNull(frequency), nDays = intOrNull(days);
  const newDose = dose === undefined || dose === null || String(dose).trim() === '' ? null : Number(dose);
  const packSent = Object.prototype.hasOwnProperty.call(req.body, 'pack_qty');
  const pq = packSent ? packQty(req.body.pack_qty) : { qty: null };
  if (pq.bad) return [400, { error: pq.bad }];
  const got = await lockRx(client, req.params.rxId);
  if (got.refuse) return got.refuse;
  // A pack-unit line (the flag stored on the line): total_qty changes only when
  // pack_qty is sent; a new daily dose or number of days is instructions, not a count.
  // Any other line: total_qty is recomputed only when the dose, the times a day or the
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
           WHEN pack_unit THEN (CASE WHEN $10::boolean THEN $11::numeric ELSE total_qty END)
           WHEN (CASE WHEN dose ~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$' THEN dose::numeric END) IS DISTINCT FROM $9::numeric
             OR frequency IS DISTINCT FROM $2
             OR days IS DISTINCT FROM $3
             OR total_qty IS NULL
           THEN $6 ELSE total_qty END
     WHERE id=$8 RETURNING *`,
    [blankNull(dose), freq, nDays, route, memo, rxTotal(dose, nDays), unit_price, req.params.rxId, newDose, packSent, pq.qty]
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

// POST /api/consultations/:id/orders
router.post('/:id/orders', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { order_code_id, order_code, order_name, code_type, dose, frequency, days, quantity, unit_price, memo } = req.body;
    if (blank(order_name)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'order_name is required' }); }
    const invalid = badAmounts(req.body, ['frequency', 'days', 'quantity', 'unit_price']) || badOrderSig(dose);
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
        pacs_modality = oc.pacs_modality;
        // Station AE intentionally ignored by default. The EMR sends modality/order,
        // not a device assignment.
        station_ae = null;
        body_part = oc.body_part;
        worklist_enabled = oc.worklist_enabled;
      }
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
    await startVisit(client, req.params.id);
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
  const { dose, frequency, days, quantity, memo, unit_price } = req.body;
  const invalid = badAmounts(req.body, ['frequency', 'days', 'quantity', 'unit_price']) || badOrderSig(dose);
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

module.exports = router;
