const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { badPatient } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');
const { writeAudit, ACTIONS, changedOnly } = require('../utils/audit');

const router = express.Router();
router.use(authMiddleware);

// Who may call what (decided 2026-09-29, S2: the server enforces the same module
// permissions as the screens). A read admits every screen that calls it - through
// the shared parts too: PatientFinder (search) is on reception, consultation,
// payment, pharmacy and lab; DocumentModal (GET /:id) on the same five;
// PatientChart (/:id/history) on payment and pharmacy. Writes are reception's.
// permMiddleware passes if the account holds ANY of the listed permissions.
// Check the callers again (grep "/patients" in frontend/src) before narrowing one.
const SEARCH_READERS = ['registration', 'consultation', 'payment', 'pharmacy', 'lab'];
const HISTORY_READERS = ['registration', 'consultation', 'payment', 'pharmacy'];

// Columns PUT may change. chart_no is deliberately absent: it is the patient's
// identity in every other module and on the imaging devices (DICOM PatientID).
const PATIENT_FIELDS = ['last_name', 'first_name', 'national_id', 'date_of_birth', 'gender', 'phone', 'mobile',
  'address', 'city', 'region', 'blood_type', 'allergies', 'reception_note'];

// GET /api/patients - search/list
// q matches chart number, either name, national id, phones, and the full name in
// either order ("Rakoto Jean" or "Jean Rakoto" - the desk gives them both ways).
// % and _ in q are searched as the characters they are, not as wildcards; the
// escape character is ! so no backslash has to survive a JS template literal.
// limit (1-200, default 50) and offset are read as numbers; anything else falls
// back to the default instead of reaching Postgres as text.
function intParam(v, dflt, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(Math.max(n, min), max);
}
router.get('/', permMiddleware(...SEARCH_READERS), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().replace(/\s+/g, ' ');
    const limit = intParam(req.query.limit, 50, 1, 200);
    const offset = intParam(req.query.offset, 0, 0, 1000000);
    let query, params;
    if (q) {
      query = `SELECT * FROM patient WHERE is_active = true AND (
        chart_no ILIKE $1 ESCAPE '!' OR last_name ILIKE $1 ESCAPE '!' OR first_name ILIKE $1 ESCAPE '!' OR
        national_id ILIKE $1 ESCAPE '!' OR phone ILIKE $1 ESCAPE '!' OR mobile ILIKE $1 ESCAPE '!' OR
        CONCAT(last_name, ' ', first_name) ILIKE $1 ESCAPE '!' OR
        CONCAT(first_name, ' ', last_name) ILIKE $1 ESCAPE '!'
      ) ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params = ['%' + q.replace(/[!%_]/g, '!$&') + '%', limit, offset];
    } else {
      query = 'SELECT * FROM patient WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      params = [limit, offset];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/patients/similar?last_name=&first_name= - same-name patients, for the
// warning before a new chart is created (decided 2026-09-29, reception ④: warn only,
// and the same person is judged by name alone). Case, surrounding and repeated
// spaces are ignored, and a swapped order also matches, since first and last name
// are often given the other way round at the desk. Accents are ignored too (Hélène =
// Helene), because the same name is typed both ways; the letters folded are the ones
// French and Malagasy names use, in FOLD below - both sides go through the same SQL,
// so the screen and the database cannot disagree about what "the same" means.
// Declared before /:id, which would otherwise take "similar" for an id.
router.get('/similar', permMiddleware('registration'), async (req, res) => {
  try {
    const norm = function (v) { return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase(); };
    const last = norm(req.query.last_name);
    const first = norm(req.query.first_name);
    if (!last || !first) return res.json([]);
    // [[:space:]] rather than \s: inside a JS template literal "\s" loses its
    // backslash and Postgres would replace the letter s instead.
    const FOLD = function (sql) {
      return "translate(lower(regexp_replace(trim(" + sql + "), '[[:space:]]+', ' ', 'g')), " +
        "'àâäáãåæçéèêëíìîïñóòôöõøœúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')";
    };
    const LAST = FOLD('p.last_name');
    const FIRST = FOLD('p.first_name');
    const Q1 = FOLD('$1::text');
    const Q2 = FOLD('$2::text');
    const result = await pool.query(
      `SELECT p.id, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.phone, p.mobile,
              (SELECT MAX(v.visit_date) FROM visit v WHERE v.patient_id = p.id AND v.status <> 'cancelled') AS last_visit_date
         FROM patient p
        WHERE p.is_active = true
          AND ( (${LAST} = ${Q1} AND ${FIRST} = ${Q2}) OR (${LAST} = ${Q2} AND ${FIRST} = ${Q1}) )
        ORDER BY p.created_at DESC
        LIMIT 10`,
      [last, first]
    );
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/patients/:id
router.get('/:id', permMiddleware(...SEARCH_READERS), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patient WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/patients/chart/:chartNo
// No screen calls this; kept for reception.
router.get('/chart/:chartNo', permMiddleware('registration'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patient WHERE chart_no = $1', [req.params.chartNo]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// POST /api/patients - create new patient
// The chart number and the row go in one transaction: generate_chart_no() takes an
// advisory lock held until COMMIT and counts this year's numbers from the patient
// table (migration 101), so a second desk creating a patient at the same moment
// waits and then sees this one. Outside a transaction the lock would be released
// before the INSERT and two patients could get the same number.
router.post('/', permMiddleware('registration'), async (req, res) => {
  const { last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note } = req.body;
  const invalid = badPatient(req.body);
  if (invalid) return res.status(400).json({ error: invalid });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const chartResult = await client.query('SELECT generate_chart_no() AS chart_no');
    const chart_no = chartResult.rows[0].chart_no;
    const result = await client.query(
      `INSERT INTO patient (chart_no, last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [chart_no, last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note || null]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (e) { /* connection already gone */ } }
    sendDbError(res, err);
  } finally {
    if (client) client.release();
  }
});

// PUT /api/patients/:id
// Only the fields present in the body are written; a field left out keeps its
// value. This used to overwrite every column, so a screen that did not know a
// patient's address (the reception queue does not load it) wiped it by sending
// an empty string. Sending a field as '' or null still clears it on purpose.
// The name check still applies, so callers must send last_name/first_name.
//
// Every change is written to the change log (decided 2026-09-29, wiki/03-change-log.md):
// reception.patient.edit with the fields that differ, old and new. Registering a new
// patient is ordinary work and is not logged. Reception saves the patient's details
// on every registration, so a save that changes nothing must write nothing: an empty
// box arrives as '' where the row holds NULL, and those count as the same here.
function auditView(row) {
  const v = {};
  PATIENT_FIELDS.forEach(function (f) {
    const x = row[f];
    v[f] = (x === null || x === undefined) ? (f === 'date_of_birth' ? null : '') : x;
  });
  return v;
}
router.put('/:id', permMiddleware('registration'), async (req, res) => {
  const invalid = badPatient(req.body);
  if (invalid) return res.status(400).json({ error: invalid });
  const sets = [];
  const params = [];
  for (const field of PATIENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) continue;
    let value = req.body[field];
    // DATE and the gender CHECK reject '', which only ever means "not known".
    if ((field === 'date_of_birth' || field === 'gender') && value === '') value = null;
    params.push(value);
    sets.push(field + '=$' + params.length);
  }
  params.push(req.params.id);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // The row as it was, locked so the "before" in the log is what this save replaced.
    const old = await client.query('SELECT * FROM patient WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (old.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient not found' });
    }
    const result = await client.query(
      `UPDATE patient SET ${sets.concat('updated_at=NOW()').join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    const before = auditView(old.rows[0]);
    const after = auditView(result.rows[0]);
    const cut = changedOnly(before, after);
    // Never blocks the save: writeAudit logs its own failure and returns false.
    await writeAudit(client, req, {
      action: ACTIONS.PATIENT_EDIT,
      patient_id: result.rows[0].id,
      entity: 'patient', entity_id: result.rows[0].id,
      summary: Object.keys(cut.after || {}).join(', '),   // which fields, for the reader scanning the list
      before: before, after: after,
    });
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (e) { /* connection already gone */ } }
    sendDbError(res, err);
  } finally {
    if (client) client.release();
  }
});

// GET /api/patients/:id/history - consultation history
router.get('/:id/history', permMiddleware(...HISTORY_READERS), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, d.code as dept_code, d.name as dept_name, s.name as doctor_name
       FROM consultation c
       LEFT JOIN department d ON c.department_id = d.id
       LEFT JOIN staff s ON c.doctor_id = s.id
       WHERE c.patient_id = $1 ORDER BY c.consult_date DESC, c.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/patients/:id/billing-history - receipt history
// No screen calls this; receipts belong to payment.
router.get('/:id/billing-history', permMiddleware('payment'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, s.name as cashier_name
       FROM billing b LEFT JOIN staff s ON b.cashier_id = s.id
       WHERE b.patient_id = $1 ORDER BY b.billing_date DESC, b.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

module.exports = router;
