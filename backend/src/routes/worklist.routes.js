const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// allow a machine bridge to read the worklist feed with the shared bridge_token
// (query ?token= or X-Bridge-Token header); otherwise require a normal JWT.
async function bridgeOrAuth(req, res, next) {
  const token = req.query.token || req.headers['x-bridge-token'];
  if (token) {
    try {
      const r = await pool.query('SELECT bridge_token FROM pacs_config WHERE id = 1');
      if (r.rows[0] && r.rows[0].bridge_token && token === r.rows[0].bridge_token) return next();
    } catch (e) { /* fall through to JWT */ }
  }
  return authMiddleware(req, res, next);
}

// GET /api/worklist - query worklist entries (for equipment integration)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { modality, station_ae, date, status } = req.query;
    let query = `SELECT wl.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender,
                 oi.order_name, oi.order_code
                 FROM worklist_log wl
                 JOIN patient p ON wl.patient_id = p.id
                 JOIN order_item oi ON wl.order_item_id = oi.id
                 WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (modality) { query += ` AND wl.modality = $${idx}`; params.push(modality); idx++; }
    if (station_ae) { query += ` AND wl.station_ae = $${idx}`; params.push(station_ae); idx++; }
    if (date) { query += ` AND wl.scheduled_date = $${idx}`; params.push(date); idx++; }
    else { query += ` AND wl.scheduled_date = CURRENT_DATE`; }
    if (status) { query += ` AND wl.status = $${idx}`; params.push(status); idx++; }
    query += ' ORDER BY wl.scheduled_time ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/worklist/:id/status - update worklist item status
router.put('/:id/status', bridgeOrAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const updates = { status };
    if (status === 'completed') updates.completed_at = new Date();
    const result = await pool.query(
      'UPDATE worklist_log SET status = $1, completed_at = $2 WHERE id = $3 RETURNING *',
      [status, updates.completed_at || null, req.params.id]
    );
    // Also update order_item
    if (result.rows.length > 0) {
      const wl = result.rows[0];
      await pool.query('UPDATE order_item SET worklist_status = $1, updated_at = NOW() WHERE id = $2', [status, wl.order_item_id]);
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/worklist/dicom-mwl - DICOM C-FIND MWL compatible response (simplified JSON)
// This endpoint would be consumed by a DICOM MWL SCP bridge
router.get('/dicom-mwl', bridgeOrAuth, async (req, res) => {
  try {
    const { modality, station_ae } = req.query;
    let query = `SELECT wl.accession_no, wl.study_instance_uid, wl.modality, wl.station_ae, wl.body_part,
                 wl.scheduled_date, wl.scheduled_time,
                 p.chart_no as patient_id, p.last_name, p.first_name, p.date_of_birth, p.gender,
                 oi.order_name as requested_procedure
                 FROM worklist_log wl
                 JOIN patient p ON wl.patient_id = p.id
                 JOIN order_item oi ON wl.order_item_id = oi.id
                 WHERE wl.status = 'scheduled' AND wl.scheduled_date = CURRENT_DATE`;
    const params = [];
    let idx = 1;
    if (modality) { query += ` AND wl.modality = $${idx}`; params.push(modality); idx++; }
    if (station_ae) { query += ` AND wl.station_ae = $${idx}`; params.push(station_ae); idx++; }
    query += ' ORDER BY wl.scheduled_time';
    const result = await pool.query(query, params);
    // Format as DICOM-like structure
    const mwlEntries = result.rows.map(r => ({
      PatientName: r.last_name + '^' + r.first_name,
      PatientID: r.patient_id,   // aliased from p.chart_no above
      PatientBirthDate: r.date_of_birth ? r.date_of_birth.toISOString().split('T')[0].replace(/-/g,'') : '',
      PatientSex: r.gender === 'M' ? 'M' : (r.gender === 'F' ? 'F' : ''),
      AccessionNumber: r.accession_no,
      StudyInstanceUID: r.study_instance_uid,
      Modality: r.modality,
      ScheduledStationAETitle: r.station_ae,
      ScheduledProcedureStepDescription: r.requested_procedure,
      ScheduledPerformingPhysicianName: '',
      ScheduledProcedureStepStartDate: r.scheduled_date ? r.scheduled_date.toISOString().split('T')[0].replace(/-/g,'') : '',
      ScheduledProcedureStepStartTime: r.scheduled_time || '',
      BodyPartExamined: r.body_part || '',
    }));
    res.json(mwlEntries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
