const express = require('express');
const net = require('net');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();

async function ensureConfig() {
  await pool.query(`CREATE TABLE IF NOT EXISTS pacs_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    worklist_scp_host VARCHAR(100) DEFAULT '',
    worklist_scp_port INTEGER DEFAULT 4242,
    worklist_scp_ae VARCHAR(50) DEFAULT 'MEDCONNECT',
    bridge_token VARCHAR(100) DEFAULT 'change-me-bridge-token',
    emr_base_url VARCHAR(200) DEFAULT '',
    pacs_viewer_url VARCHAR(200) DEFAULT '',
    auto_create_worklist BOOLEAN DEFAULT TRUE,
    facility_name VARCHAR(100) DEFAULT 'Bethesda Clinic',
    notes TEXT,
    updated_by INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS emr_base_url VARCHAR(200) DEFAULT ''`);
  await pool.query(`ALTER TABLE pacs_config ADD COLUMN IF NOT EXISTS pacs_viewer_url VARCHAR(200) DEFAULT ''`);
  await pool.query(`INSERT INTO pacs_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const r = await pool.query('SELECT * FROM pacs_config WHERE id = 1');
  return r.rows[0];
}

function normalizeConfig(body) {
  const fields = [
    'worklist_scp_host','worklist_scp_ae','bridge_token','emr_base_url','pacs_viewer_url','facility_name','notes'
  ];
  const out = {};
  fields.forEach(k => { if (body[k] !== undefined) out[k] = String(body[k] || '').trim(); });
  if (body.worklist_scp_port !== undefined) out.worklist_scp_port = Number(body.worklist_scp_port) || 10004;
  if (body.auto_create_worklist !== undefined) out.auto_create_worklist = !!body.auto_create_worklist;
  return out;
}

function tcpCheck(host, port, timeoutMs = 3000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let done = false;
    function finish(ok, message) {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (e) {}
      resolve({ ok, host, port, message });
    }
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true, 'TCP connection succeeded'));
    socket.once('timeout', () => finish(false, 'Connection timed out'));
    socket.once('error', err => finish(false, err.message));
    socket.connect(port, host);
  });
}

// Authenticated settings UI
router.get('/config', authMiddleware, async (req, res) => {
  try { res.json(await ensureConfig()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/config', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try {
    const cfg = normalizeConfig(req.body || {});
    const result = await pool.query(
      `UPDATE pacs_config SET
       worklist_scp_host=$1, worklist_scp_port=$2, worklist_scp_ae=$3,
       bridge_token=$4, emr_base_url=$5, pacs_viewer_url=$6, auto_create_worklist=$7, facility_name=$8, notes=$9,
       updated_by=$10, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [cfg.worklist_scp_host, cfg.worklist_scp_port, cfg.worklist_scp_ae,
       cfg.bridge_token, cfg.emr_base_url, cfg.pacs_viewer_url, cfg.auto_create_worklist, cfg.facility_name, cfg.notes, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/test', authMiddleware, async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const host = cfg.worklist_scp_host;
    const port = cfg.worklist_scp_port;
    res.json(await tcpCheck(host, port));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Resolve the PACS viewer URL + reading for an imaging order (Stone Web Viewer by StudyInstanceUID).
router.get('/viewer-url', authMiddleware, async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const base = cfg.pacs_viewer_url ? String(cfg.pacs_viewer_url).replace(/\/+$/, '') : '';
    let study = '', accession = '', order_name = '', modality = '', reading = null;
    if (req.query.order_item_id) {
      const oid = req.query.order_item_id;
      const w = await pool.query(
        'SELECT accession_no, study_instance_uid FROM worklist_log WHERE order_item_id = $1 ORDER BY id DESC LIMIT 1', [oid]);
      if (w.rows[0]) { study = w.rows[0].study_instance_uid || ''; accession = w.rows[0].accession_no || ''; }
      const o = await pool.query(
        'SELECT oi.order_name, oi.pacs_modality, oi.result_text, oi.result_at, s.name AS result_by_name FROM order_item oi LEFT JOIN staff s ON s.id = oi.result_by WHERE oi.id = $1', [oid]);
      if (o.rows[0]) {
        order_name = o.rows[0].order_name || ''; modality = o.rows[0].pacs_modality || '';
        reading = { result_text: o.rows[0].result_text || '', result_by_name: o.rows[0].result_by_name || '', result_at: o.rows[0].result_at };
      }
    } else if (req.query.study) { study = req.query.study; }
    const url = (base && study) ? `${base}/stone-webviewer/index.html?study=${encodeURIComponent(study)}` : base;
    res.json({ has_viewer: !!base, base, study_instance_uid: study, accession, url, order_name, modality, reading });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save a radiology reading for an imaging order (doctors only).
router.put('/reading/:orderItemId', authMiddleware, permMiddleware('consultation'), async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE order_item SET result_text = $1, result_by = $2, result_at = NOW(), updated_at = NOW() WHERE id = $3 AND code_type = $4 RETURNING id',
      [req.body.result_text || '', req.user.id, req.params.orderItemId, 'imaging']
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Imaging order not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All imaging readings for a patient (read-only view for any staff).
router.get('/readings/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT oi.id, oi.order_code, oi.order_name, oi.pacs_modality, oi.result_text, oi.result_at,
              s.name AS result_by_name, v.visit_date,
              wl.accession_no, wl.study_instance_uid
         FROM order_item oi
         JOIN visit v ON v.id = oi.visit_id
         LEFT JOIN staff s ON s.id = oi.result_by
         LEFT JOIN LATERAL (SELECT accession_no, study_instance_uid FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY id DESC LIMIT 1) wl ON true
        WHERE oi.patient_id = $1 AND oi.code_type = 'imaging'
        ORDER BY v.visit_date DESC, oi.id DESC`,
      [req.params.patientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bridge feed for PacsBridge/SmartServer/import script. Uses token because external bridge may not use EMR login.
router.get('/worklist-feed', async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const token = req.query.token || req.header('x-bridge-token');
    if (!cfg.bridge_token || token !== cfg.bridge_token) return res.status(401).json({ error: 'Invalid bridge token' });

    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const params = [date];
    let idx = 2;
    let where = `wl.scheduled_date = $1 AND wl.status = 'scheduled'`;
    if (req.query.modality) { where += ` AND wl.modality = $${idx++}`; params.push(req.query.modality); }
    // station_ae is intentionally not used as a default filter. EMR exports the
    // modality/order; PACS/SmartServer and the existing worklist decide device routing.
    if (req.query.station_ae) { where += ` AND wl.station_ae = $${idx++}`; params.push(req.query.station_ae); }

    const result = await pool.query(
      `SELECT wl.id as worklist_id, wl.accession_no, wl.study_instance_uid, wl.modality,
              wl.station_ae, wl.body_part, wl.scheduled_date, wl.scheduled_time,
              p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender,
              oi.order_code, oi.order_name, oi.memo
         FROM worklist_log wl
         JOIN patient p ON wl.patient_id = p.id
         JOIN order_item oi ON wl.order_item_id = oi.id
        WHERE ${where}
        ORDER BY wl.scheduled_time ASC, wl.id ASC`,
      params
    );

    const rows = result.rows.map(r => ({
      worklist_id: r.worklist_id,
      accession_no: r.accession_no,
      patient_id: r.chart_no,
      patient_name: [r.last_name, r.first_name].filter(Boolean).join(' '),
      dicom_patient_name: `${r.last_name || ''}^${r.first_name || ''}`,
      birth_date: r.date_of_birth ? r.date_of_birth.toISOString().slice(0,10).replace(/-/g,'') : '',
      sex: r.gender === 'M' ? 'M' : (r.gender === 'F' ? 'F' : ''),
      modality: r.modality,
      procedure_code: r.order_code,
      procedure_name: r.order_name,
      body_part: r.body_part || '',
      scheduled_date: r.scheduled_date ? r.scheduled_date.toISOString().slice(0,10).replace(/-/g,'') : '',
      scheduled_time: String(r.scheduled_time || '').replace(/:/g,'').slice(0,6),
      study_instance_uid: r.study_instance_uid,
      memo: r.memo || ''
    }));

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const headers = Object.keys(rows[0] || {worklist_id:'',accession_no:'',patient_id:'',patient_name:'',dicom_patient_name:'',birth_date:'',sex:'',modality:'',procedure_code:'',procedure_name:'',body_part:'',scheduled_date:'',scheduled_time:'',study_instance_uid:'',memo:''});
      const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
      res.setHeader('Content-Type','text/csv; charset=utf-8');
      return res.send(csv);
    }
    res.json({ config: { worklist_scp_host: cfg.worklist_scp_host, worklist_scp_port: cfg.worklist_scp_port, worklist_scp_ae: cfg.worklist_scp_ae }, count: rows.length, rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
