const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/documents/patient/:id  — 발급 이력 (최신순)
router.get('/patient/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, s.name AS issued_by_name
         FROM document_log d
         LEFT JOIN staff s ON d.issued_by = s.id
        WHERE d.patient_id = $1
        ORDER BY d.issued_at DESC, d.id DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/documents/:id  — 단건 (재출력)
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, s.name AS issued_by_name
         FROM document_log d
         LEFT JOIN staff s ON d.issued_by = s.id
        WHERE d.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/documents  — 발급(저장). 발급번호 자동 부여.
// body { template_code, template_name, patient_id, visit_id, consultation_id, lang, payload }
router.post('/', async (req, res) => {
  try {
    const { template_code, template_name, patient_id, visit_id, consultation_id, lang, payload } = req.body;
    if (!template_code || !patient_id) {
      return res.status(400).json({ error: 'template_code and patient_id required' });
    }
    const noRow = await pool.query('SELECT generate_doc_no() AS doc_no');
    const docNo = noRow.rows[0].doc_no;
    const r = await pool.query(
      `INSERT INTO document_log
         (doc_no, template_code, template_name, patient_id, visit_id, consultation_id, lang, payload, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [docNo, template_code, template_name || null, patient_id,
       visit_id || null, consultation_id || null, lang || 'fr',
       JSON.stringify(payload || {}), req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/documents/:id/void  — 발급 취소 (이력은 남기고 무효 표시)
router.post('/:id/void', async (req, res) => {
  try {
    const { reason } = req.body;
    const r = await pool.query(
      `UPDATE document_log
          SET voided = TRUE, void_reason = $1, voided_at = NOW(), voided_by = $2
        WHERE id = $3
        RETURNING *`,
      [reason || null, req.user.id, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
