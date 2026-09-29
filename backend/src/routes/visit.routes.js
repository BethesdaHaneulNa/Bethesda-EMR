const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { VISIT_TYPES, VISIT_STATUSES } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');

const router = express.Router();
router.use(authMiddleware);

// GET /api/visits/today - today's queue
router.get('/today', async (req, res) => {
  try {
    const { status, doctor_id, department_id } = req.query;
    let query = `SELECT v.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.blood_type, p.allergies, p.reception_note, p.phone as patient_phone,
                 d.code as dept_code, d.name as dept_name, s.name as doctor_name
                 FROM visit v
                 JOIN patient p ON v.patient_id = p.id
                 LEFT JOIN department d ON v.department_id = d.id
                 LEFT JOIN staff s ON v.doctor_id = s.id
                 WHERE v.visit_date = CURRENT_DATE`;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND v.status = $${idx}`; params.push(status); idx++; }
    if (doctor_id) { query += ` AND v.doctor_id = $${idx}`; params.push(doctor_id); idx++; }
    if (department_id) { query += ` AND v.department_id = $${idx}`; params.push(department_id); idx++; }
    query += ' ORDER BY v.reception_time ASC, v.created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/visits/patient/:patientId - 환자의 전체 내원 이력 (외래 내역)
router.get('/patient/:patientId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.patient_id, v.visit_date, v.reception_time, v.visit_type, v.status,
              v.department_id, v.doctor_id,
              p.chart_no, p.last_name, p.first_name,
              d.code as dept_code, d.name as dept_name, s.name as doctor_name,
              b.id as billing_id, b.payment_status as bill_status, b.receipt_no, b.total_due
         FROM visit v
         JOIN patient p ON v.patient_id = p.id
         LEFT JOIN department d ON v.department_id = d.id
         LEFT JOIN staff s ON v.doctor_id = s.id
         LEFT JOIN LATERAL (
            SELECT id, payment_status, receipt_no, total_due
              FROM billing WHERE visit_id = v.id
              ORDER BY (payment_status <> 'cancelled') DESC, created_at DESC LIMIT 1
         ) b ON true
        WHERE v.patient_id = $1
        ORDER BY v.visit_date DESC, v.reception_time DESC`,
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// POST /api/visits - register new visit
router.post('/', async (req, res) => {
  try {
    const { patient_id, visit_type, department_id, doctor_id, chief_complaint, reception_memo } = req.body;
    // visit_type selects the consultation fee (newVisit -> C01, followUp -> C02 ...),
    // and the billing query falls back to the new-visit price for anything it does
    // not recognise, so an unknown value quietly overcharges the patient.
    if (!VISIT_TYPES.includes(String(visit_type))) {
      return res.status(400).json({ error: 'visit_type must be one of ' + VISIT_TYPES.join(', ') });
    }
    const now = new Date();
    const reception_time = now.toTimeString().split(' ')[0].substring(0,5);
    const result = await pool.query(
      `INSERT INTO visit (patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, status, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'waiting',$8) RETURNING *`,
      [patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// PUT /api/visits/:id/status - update visit status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VISIT_STATUSES.includes(String(status))) {
      return res.status(400).json({ error: 'status must be one of ' + VISIT_STATUSES.join(', ') });
    }
    // Cancelling is only for a patient still in the queue. Reception's list does
    // not refresh by itself, so the button can be pressed on a visit the doctor
    // has since opened; cancelling that would orphan its consultation, orders and
    // bill under a visit every other screen ignores.
    const result = await pool.query(
      `UPDATE visit SET status = $1::varchar, updated_at = NOW()
        WHERE id = $2 AND ($1::varchar <> 'cancelled' OR status IN ('registered', 'waiting'))
        RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      const found = await pool.query('SELECT status FROM visit WHERE id = $1', [req.params.id]);
      if (found.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
      return res.status(409).json({ error: 'Only a waiting visit can be cancelled', status: found.rows[0].status });
    }
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// PUT /api/visits/:id
// Only the fields present in the body are written. Reception sends what its form
// shows; payment sends visit_type alone. department_id/doctor_id sent as null (or
// '') clear the assignment - with the old COALESCE a doctor could never be removed.
// visit_type and status are NOT NULL in practice, so null there means "unchanged".
const VISIT_FIELDS = ['visit_type', 'department_id', 'doctor_id', 'chief_complaint', 'reception_memo', 'status'];
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    // Same checks as POST: visit_type picks the consultation fee, and billing
    // falls back to the new-visit price for anything it does not recognise.
    if (body.visit_type != null && !VISIT_TYPES.includes(String(body.visit_type))) {
      return res.status(400).json({ error: 'visit_type must be one of ' + VISIT_TYPES.join(', ') });
    }
    if (body.status != null && !VISIT_STATUSES.includes(String(body.status))) {
      return res.status(400).json({ error: 'status must be one of ' + VISIT_STATUSES.join(', ') });
    }
    const sets = [];
    const params = [];
    for (const field of VISIT_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      let value = body[field];
      if ((field === 'visit_type' || field === 'status') && value == null) continue;
      if ((field === 'department_id' || field === 'doctor_id') && value === '') value = null;
      params.push(value);
      sets.push(field + '=$' + params.length);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE visit SET ${sets.concat('updated_at=NOW()').join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

module.exports = router;
