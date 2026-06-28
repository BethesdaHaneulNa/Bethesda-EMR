const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/visits - register new visit
router.post('/', async (req, res) => {
  try {
    const { patient_id, visit_type, department_id, doctor_id, chief_complaint, reception_memo } = req.body;
    const now = new Date();
    const reception_time = now.toTimeString().split(' ')[0].substring(0,5);
    const result = await pool.query(
      `INSERT INTO visit (patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, status, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'waiting',$8) RETURNING *`,
      [patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/visits/:id/status - update visit status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE visit SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/visits/:id
router.put('/:id', async (req, res) => {
  try {
    const { visit_type, department_id, doctor_id, chief_complaint, reception_memo, status } = req.body;
    const result = await pool.query(
      `UPDATE visit SET visit_type=COALESCE($1,visit_type), department_id=COALESCE($2,department_id),
       doctor_id=COALESCE($3,doctor_id), chief_complaint=COALESCE($4,chief_complaint),
       reception_memo=COALESCE($5,reception_memo), status=COALESCE($6,status), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [visit_type, department_id, doctor_id, chief_complaint, reception_memo, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
