const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { badAmounts } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { cancelWorklistForOrder } = require('./pacs.cancel');
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
const NOTE_FIELDS = ['subjective', 'objective', 'assessment', 'plan', 'note_text',
  'bp_systolic', 'bp_diastolic', 'temperature', 'pulse', 'spo2', 'respiratory_rate', 'weight', 'height'];
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

// POST /api/consultations - start or reopen consultation
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
    const existing = await client.query(
      `SELECT * FROM consultation
        WHERE visit_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [visit_id]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].status !== 'completed' && existing.rows[0].status !== 'signed') {
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
  const result = await client.query(
    `UPDATE consultation SET ${sets.concat(['updated_at=NOW()']).join(', ')} WHERE id=$${vals.length} RETURNING *`,
    vals
  );
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
    await client.query("UPDATE consultation SET status = 'completed', updated_at = NOW() WHERE id = $1", [req.params.id]);
    await client.query("UPDATE visit SET status = 'completed', updated_at = NOW() WHERE id = $1", [consult.rows[0].visit_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

// ── Diagnosis ──

// GET /api/consultations/:id/diagnoses
router.get('/:id/diagnoses', canConsult, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diagnosis WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

// POST /api/consultations/:id/diagnoses
router.post('/:id/diagnoses', canConsult, (req, res) => inTx(res, async (client) => {
  const { icd_code, diagnosis_name, diagnosis_type, sort_order } = req.body;
  if (blank(diagnosis_name)) return [400, { error: 'diagnosis_name is required' }];
  const c = await consultOf(client, req.params.id);
  if (!c) return [404, { error: 'Consultation not found' }];
  const result = await client.query(
    'INSERT INTO diagnosis (consultation_id, icd_code, diagnosis_name, diagnosis_type, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.id, icd_code, diagnosis_name, diagnosis_type || 'primary', sort_order || 0]
  );
  const dx = result.rows[0];
  await recordEdit(client, req, c, 'diagnosis', dx, dxLabel(dx), null, pick(dx, DX_LOG));
  return [201, dx];
}));

// DELETE /api/consultations/diagnosis/:dxId
router.delete('/diagnosis/:dxId', canConsult, (req, res) => inTx(res, async (client) => {
  const result = await client.query('DELETE FROM diagnosis WHERE id = $1 RETURNING *', [req.params.dxId]);
  const dx = result.rows[0];
  if (dx) await recordEdit(client, req, await consultOf(client, dx.consultation_id), 'diagnosis', dx, dxLabel(dx), pick(dx, DX_LOG), null);
  return [200, { success: true }];
}));

// ── Prescriptions ──

// GET /api/consultations/visit/:visitId/prescriptions  — 내원 단위 처방(문서 발급용)
router.get('/visit/:visitId/prescriptions', canReadRx, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rx.* FROM prescription rx
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
    const result = await pool.query('SELECT * FROM prescription WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
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
function rxTotal(dose, days) {
  const d = parseFloat(dose) || 0;
  const n = parseInt(days) || 1;
  return Math.round(d * n * 1000) / 1000;   // DECIMAL(10,3)
}

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
                               pack_unit, pack_label)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.params.id, drug_id, drug_code, drug_name, dose, frequency, days, route, total, unit_price, memo,
     pack.pack_unit, pack.pack_label]
  );
  const rx = result.rows[0];
  await recordEdit(client, req, c, 'prescription', rx, rx.drug_name, null, pick(rx, RX_LOG));
  return [201, rx];
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
  const freq = parseInt(frequency) || 1, nDays = parseInt(days) || 1;
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
    [dose, freq, nDays, route, memo, rxTotal(dose, nDays), unit_price, req.params.rxId, newDose, packSent, pq.qty]
  );
  const rx = result.rows[0];
  await recordEdit(client, req, await consultOf(client, rx.consultation_id), 'prescription', rx, rx.drug_name,
    pick(got.rx, RX_LOG), pick(rx, RX_LOG));
  return [200, rx];
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
// Lines saved before 201_consultation_order_total.sql were filled with their quantity.
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
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'quantity', 'unit_price']);
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

    const orderItem = oResult.rows[0];

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
      // Update order item worklist status
      await client.query("UPDATE order_item SET worklist_status = 'sent', worklist_sent_at = NOW() WHERE id = $1", [orderItem.id]);
    }

    await recordEdit(client, req, consult, 'order_item', orderItem, orderLabel(orderItem), null, pick(orderItem, ORDER_LOG));
    await client.query('COMMIT');
    res.status(201).json(orderItem);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally {
    client.release();
  }
});



// PUT /api/consultations/order/:orderId - update order item dosing/quantity details
router.put('/order/:orderId', canConsult, (req, res) => inTx(res, async (client) => {
  const { dose, frequency, days, quantity, memo, unit_price } = req.body;
  const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'quantity', 'unit_price']);
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

// GET /api/consultations/:id/orders
router.get('/:id/orders', canReadRx, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM order_item WHERE consultation_id = $1 ORDER BY created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
