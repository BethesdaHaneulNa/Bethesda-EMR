const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { badPatient } = require('../utils/validate');

const router = express.Router();
router.use(authMiddleware);

// GET /api/patients - search/list
router.get('/', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patient WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/chart/:chartNo
router.get('/chart/:chartNo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patient WHERE chart_no = $1', [req.params.chartNo]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients - create new patient
router.post('/', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id
router.put('/:id', async (req, res) => {
  try {
    const { last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, reception_note } = req.body;
    const invalid = badPatient(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `UPDATE patient SET last_name=$1, first_name=$2, national_id=$3, date_of_birth=$4, gender=$5, phone=$6, mobile=$7, address=$8, city=$9, region=$10, blood_type=$11, allergies=$12, reception_note=COALESCE($13, reception_note), updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [last_name, first_name, national_id, date_of_birth, gender, phone, mobile, address, city, region, blood_type, allergies, (reception_note === undefined ? null : reception_note), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/history - consultation history
router.get('/:id/history', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/billing-history - receipt history
router.get('/:id/billing-history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, s.name as cashier_name
       FROM billing b LEFT JOIN staff s ON b.cashier_id = s.id
       WHERE b.patient_id = $1 ORDER BY b.billing_date DESC, b.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
