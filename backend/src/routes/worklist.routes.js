const express = require('express');
const { pool } = require('../config/database');
const { dicomDate } = require('../utils/localDate');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { presentedToken, bridgeTokenMatches } = require('./pacs.token');

const router = express.Router();

// allow a machine bridge in with the shared bridge_token (X-Bridge-Token header,
// or ?token=); otherwise require a normal JWT that holds one of `perms`. The
// placeholder token never counts -- see pacs.token.js.
// The login path is narrowed to settings (decision S2): no screen calls these
// routes, and they hand out or change patient worklist data.
function bridgeOrAuth(...perms) {
  const allowed = permMiddleware(...perms);
  return async function (req, res, next) {
    const token = presentedToken(req);
    if (token) {
      try {
        const r = await pool.query('SELECT bridge_token FROM pacs_config WHERE id = 1');
        if (r.rows[0] && bridgeTokenMatches(r.rows[0].bridge_token, token)) return next();
      } catch (e) { /* fall through to JWT */ }
    }
    return authMiddleware(req, res, () => allowed(req, res, next));
  };
}

// GET /api/worklist - query worklist entries (for equipment integration)
// No screen calls this today; consultation is the module that owns imaging orders (S2).
router.get('/', authMiddleware, permMiddleware('consultation'), async (req, res) => {
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
// The two tables name the waiting state differently ('scheduled' on the worklist,
// 'sent' on the order), and each has a CHECK. Unchecked, 'scheduled' updated the
// worklist and then failed on the order -- outside a transaction, leaving the two
// disagreeing. Nothing in the EMR calls this today; the arrival path is
// POST /api/pacs/study-arrived.
const WL_TO_ORDER_STATUS = { scheduled: 'sent', in_progress: 'in_progress', completed: 'completed', cancelled: 'cancelled' };

router.put('/:id/status', bridgeOrAuth('settings'), async (req, res) => {
  const status = String((req.body || {}).status || '');
  if (!WL_TO_ORDER_STATUS[status]) {
    return res.status(400).json({ error: 'status must be one of ' + Object.keys(WL_TO_ORDER_STATUS).join(', ') });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE worklist_log SET status = $1,
              completed_at = CASE WHEN $3 THEN COALESCE(completed_at, NOW()) ELSE NULL END
        WHERE id = $2 RETURNING *`,
      [status, req.params.id, status === 'completed']
    );
    if (!result.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Worklist entry not found' }); }
    await client.query('UPDATE order_item SET worklist_status = $1, updated_at = NOW() WHERE id = $2',
      [WL_TO_ORDER_STATUS[status], result.rows[0].order_item_id]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/worklist/dicom-mwl - DICOM C-FIND MWL compatible response (simplified JSON)
// This endpoint would be consumed by a DICOM MWL SCP bridge
router.get('/dicom-mwl', bridgeOrAuth('settings'), async (req, res) => {
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
      PatientBirthDate: dicomDate(r.date_of_birth),
      PatientSex: r.gender === 'M' ? 'M' : (r.gender === 'F' ? 'F' : ''),
      AccessionNumber: r.accession_no,
      StudyInstanceUID: r.study_instance_uid,
      Modality: r.modality,
      ScheduledStationAETitle: r.station_ae,
      ScheduledProcedureStepDescription: r.requested_procedure,
      ScheduledPerformingPhysicianName: '',
      ScheduledProcedureStepStartDate: dicomDate(r.scheduled_date),
      ScheduledProcedureStepStartTime: r.scheduled_time || '',
      BodyPartExamined: r.body_part || '',
    }));
    res.json(mwlEntries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
