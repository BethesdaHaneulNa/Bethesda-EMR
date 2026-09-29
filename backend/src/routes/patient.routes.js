const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { badPatient } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');

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
router.get('/', permMiddleware(...SEARCH_READERS), async (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    let query, params;
    if (q) {
      query = `SELECT * FROM patient WHERE is_active = true AND (
        chart_no ILIKE $1 OR last_name ILIKE $1 OR first_name ILIKE $1 OR national_id ILIKE $1 OR
        phone ILIKE $1 OR mobile ILIKE $1 OR
        CONCAT(last_name, ' ', first_name) ILIKE $1
      ) ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params = [`%${q}%`, limit, offset];
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
router.post('/', permMiddleware('registration'), async (req, res) => {
  try {
    const { last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note } = req.body;
    const invalid = badPatient(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    // Generate chart number
    const chartResult = await pool.query("SELECT generate_chart_no() as chart_no");
    const chart_no = chartResult.rows[0].chart_no;
    const result = await pool.query(
      `INSERT INTO patient (chart_no, last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [chart_no, last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// PUT /api/patients/:id
// Only the fields present in the body are written; a field left out keeps its
// value. This used to overwrite every column, so a screen that did not know a
// patient's address (the reception queue does not load it) wiped it by sending
// an empty string. Sending a field as '' or null still clears it on purpose.
// The name check still applies, so callers must send last_name/first_name.
router.put('/:id', permMiddleware('registration'), async (req, res) => {
  try {
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
    const result = await pool.query(
      `UPDATE patient SET ${sets.concat('updated_at=NOW()').join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
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
