const express = require('express');
const { pool } = require('../config/database');
const { todayLocal, dicomDate } = require('../utils/localDate');
const { tcpCheck } = require('../utils/tcpCheck');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { presentedToken, bridgeTokenMatches, usableBridgeToken } = require('./pacs.token');
const { ORDER_CANCELLED } = require('./pacs.cancel');

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
  if (body.worklist_scp_port !== undefined) out.worklist_scp_port = Number(body.worklist_scp_port) || 4242;
  if (body.auto_create_worklist !== undefined) out.auto_create_worklist = !!body.auto_create_worklist;
  return out;
}

// Settings UI. This carries the bridge token, which opens the patient feed, so
// it is for the settings permission only -- not every member of staff.
router.get('/config', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try { res.json(await ensureConfig()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/config', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try {
    const cfg = normalizeConfig(req.body || {});
    // A field left out of the request keeps its value. Writing it as NULL instead
    // would, for bridge_token, silently unpair the PACS on a partial save.
    const result = await pool.query(
      `UPDATE pacs_config SET
       worklist_scp_host=COALESCE($1, worklist_scp_host), worklist_scp_port=COALESCE($2, worklist_scp_port),
       worklist_scp_ae=COALESCE($3, worklist_scp_ae), bridge_token=COALESCE($4, bridge_token),
       emr_base_url=COALESCE($5, emr_base_url), pacs_viewer_url=COALESCE($6, pacs_viewer_url),
       auto_create_worklist=COALESCE($7, auto_create_worklist), facility_name=COALESCE($8, facility_name),
       notes=COALESCE($9, notes), updated_by=$10, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [cfg.worklist_scp_host, cfg.worklist_scp_port, cfg.worklist_scp_ae,
       cfg.bridge_token, cfg.emr_base_url, cfg.pacs_viewer_url, cfg.auto_create_worklist, cfg.facility_name, cfg.notes, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route permissions follow the screens that call them (decision S2, 2026-09-29):
// the connection test lives in Settings only.
router.get('/test', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const host = cfg.worklist_scp_host;
    const port = cfg.worklist_scp_port;
    res.json(await tcpCheck(host, port));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// worklist_log columns the screens need, and how they are handed out. `images`
// stays null until the bridge has reported the study (POST /study-arrived):
// "nothing arrived yet" is a different answer from "arrived, and it matches".
const WL_COLUMNS = `accession_no, study_instance_uid, images_received_at, image_count,
                    image_patient_id, image_patient_name, patient_check`;
// Whether the imaging order was cancelled after it had a result (decision 3-B).
// cancelled_at / cancel_reason are added by the consultation session's
// migration; to_jsonb reads them without failing on a database that does not
// have them yet, so this can ship before that migration.
const ORDER_CANCEL_COLUMNS = `oi.status AS order_status,
       to_jsonb(oi)->>'cancelled_at' AS cancelled_at, to_jsonb(oi)->>'cancel_reason' AS cancel_reason`;

function imagesOf(w) {
  if (!w || !w.images_received_at) return null;
  return {
    received_at: w.images_received_at,
    count: w.image_count,
    patient_id: w.image_patient_id || '',
    patient_name: w.image_patient_name || '',
    patient_check: w.patient_check || '',
  };
}

// Resolve the PACS viewer URL + reading for an imaging order (Stone Web Viewer by StudyInstanceUID).
// Only the consultation screen opens the viewer; the payment screen's readings
// list shows text and has no image button.
router.get('/viewer-url', authMiddleware, permMiddleware('consultation'), async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const base = cfg.pacs_viewer_url ? String(cfg.pacs_viewer_url).replace(/\/+$/, '') : '';
    let study = '', accession = '', order_name = '', modality = '', reading = null, images = null;
    let order_status = '', cancelled_at = null, cancel_reason = '';
    if (req.query.order_item_id) {
      const oid = req.query.order_item_id;
      const w = await pool.query(
        `SELECT ${WL_COLUMNS} FROM worklist_log WHERE order_item_id = $1 ORDER BY id DESC LIMIT 1`, [oid]);
      if (w.rows[0]) {
        study = w.rows[0].study_instance_uid || ''; accession = w.rows[0].accession_no || '';
        images = imagesOf(w.rows[0]);
      }
      const o = await pool.query(
        `SELECT oi.order_name, oi.pacs_modality, oi.result_text, oi.result_at, s.name AS result_by_name, ${ORDER_CANCEL_COLUMNS}
           FROM order_item oi LEFT JOIN staff s ON s.id = oi.result_by WHERE oi.id = $1`, [oid]);
      if (o.rows[0]) {
        order_name = o.rows[0].order_name || ''; modality = o.rows[0].pacs_modality || '';
        order_status = o.rows[0].order_status || ''; cancelled_at = o.rows[0].cancelled_at; cancel_reason = o.rows[0].cancel_reason || '';
        reading = { result_text: o.rows[0].result_text || '', result_by_name: o.rows[0].result_by_name || '', result_at: o.rows[0].result_at };
      }
    } else if (req.query.study) { study = req.query.study; }
    // No study to show (an imaging order that never went to the worklist): no URL
    // at all. Falling back to `base` opened the viewer's front page -- the list of
    // every patient in the PACS -- inside one patient's chart (P-18). has_viewer
    // still says whether a viewer address is set, so the screen can tell "no
    // viewer configured" from "nothing to show for this order".
    const url = (base && study) ? `${base}/stone-webviewer/index.html?study=${encodeURIComponent(study)}` : '';
    // A cancelled order's images stay viewable: they are part of the record.
    res.json({ has_viewer: !!base, base, study_instance_uid: study, accession, url, order_name, modality, reading, images,
               no_study: !study, order_status, cancelled: order_status === 'cancelled', cancelled_at, cancel_reason });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save a radiology reading for an imaging order (doctors only).
// A cancelled order takes no new reading -- the laboratory refuses results for a
// cancelled test the same way. The condition sits in the UPDATE itself, so a
// cancel that lands at the same moment cannot be overwritten.
router.put('/reading/:orderItemId', authMiddleware, permMiddleware('consultation'), async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE order_item SET result_text = $1, result_by = $2, result_at = NOW(), updated_at = NOW()
        WHERE id = $3 AND code_type = 'imaging' AND status IS DISTINCT FROM 'cancelled' RETURNING id`,
      [req.body.result_text || '', req.user.id, req.params.orderItemId]
    );
    if (!r.rows.length) {
      const o = await pool.query(`SELECT status FROM order_item WHERE id = $1 AND code_type = 'imaging'`, [req.params.orderItemId]);
      if (o.rows[0] && o.rows[0].status === 'cancelled') return res.status(409).json({ error: ORDER_CANCELLED });
      return res.status(404).json({ error: 'Imaging order not found' });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All imaging readings for a patient (read-only; consultation and payment screens).
router.get('/readings/patient/:patientId', authMiddleware, permMiddleware('consultation', 'payment'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT oi.id, oi.order_code, oi.order_name, oi.pacs_modality, oi.result_text, oi.result_at,
              s.name AS result_by_name, v.visit_date,
              wl.accession_no, wl.study_instance_uid, wl.images_received_at, wl.image_count,
              wl.image_patient_id, wl.image_patient_name, wl.patient_check,
              ${ORDER_CANCEL_COLUMNS}
         FROM order_item oi
         JOIN visit v ON v.id = oi.visit_id
         LEFT JOIN staff s ON s.id = oi.result_by
         LEFT JOIN LATERAL (SELECT ${WL_COLUMNS} FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY id DESC LIMIT 1) wl ON true
        WHERE oi.patient_id = $1 AND oi.code_type = 'imaging'
        ORDER BY v.visit_date DESC, oi.id DESC`,
      [req.params.patientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Why a bridge request is refused, or '' if it is not. The two messages differ
// because they are fixed in different places: one in EMR Settings, the other in
// the PACS .env -- and the bridge log is where someone on site will read this.
function bridgeDenied(cfg, req) {
  if (!usableBridgeToken(cfg.bridge_token)) return 'Bridge token is not set in the EMR (Settings -> Order Feed)';
  if (!bridgeTokenMatches(cfg.bridge_token, presentedToken(req))) return 'Invalid bridge token';
  return '';
}

// Bridge feed for PacsBridge/SmartServer/import script. Uses token because external bridge may not use EMR login.
router.get('/worklist-feed', async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const denied = bridgeDenied(cfg, req);
    if (denied) return res.status(401).json({ error: denied });

    const date = req.query.date || todayLocal();
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
      birth_date: dicomDate(r.date_of_birth),
      sex: r.gender === 'M' ? 'M' : (r.gender === 'F' ? 'F' : ''),
      modality: r.modality,
      procedure_code: r.order_code,
      procedure_name: r.order_name,
      body_part: r.body_part || '',
      scheduled_date: dicomDate(r.scheduled_date),
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

// The bridge reports in after every sync. It runs in its own compose project
// with no port of its own, so nothing here can reach out and ask how it is
// doing -- without this the only record of a broken bridge is a line in a
// container log nobody reads. Same shared token as the feed above.
router.post('/bridge-heartbeat', async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const body = req.body || {};
    const denied = bridgeDenied(cfg, req);
    if (denied) return res.status(401).json({ error: denied });

    const detail = {
      synced: Number(body.synced) || 0,
      failed: Number(body.failed) || 0,
      poll_seconds: Number(body.poll_seconds) || 0,
      error: String(body.error || '').slice(0, 500),
      // Why the bridge could not ask Orthanc which studies arrived; '' when it
      // could. status.routes.js (settings) turns a non-empty one into a warning.
      arrivals_error: String(body.arrivals_error || '').slice(0, 300),
    };
    await pool.query(
      `INSERT INTO service_heartbeat (name, last_seen, ok, detail)
            VALUES ('worklist_bridge', NOW(), $1, $2)
       ON CONFLICT (name) DO UPDATE SET last_seen = NOW(), ok = EXCLUDED.ok, detail = EXCLUDED.detail`,
      [body.ok !== false, JSON.stringify(detail)]
    );
    res.json({ received: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// The bridge found this entry's study in Orthanc and it has stopped growing.
// Mark the entry done -- which takes it off the device worklist on the next
// cycle and locks the order against deletion (Consultation.jsx orderLocked) --
// and keep what the images say about the patient.
//
// The patient check is made here, against the chart number, not taken from the
// bridge: the bridge only reports what the DICOM header says. It catches images
// whose patient was typed or edited on the device. It cannot catch a
// technician who picked the wrong patient from the worklist: those images carry
// that patient's own details and look correct -- which is why finished entries
// now leave the list.
function samePatientId(a, b) {
  return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
}

router.post('/study-arrived', async (req, res) => {
  let cfg;
  try { cfg = await ensureConfig(); }
  catch (err) { return res.status(500).json({ error: err.message }); }
  const denied = bridgeDenied(cfg, req);
  if (denied) return res.status(401).json({ error: denied });

  const b = req.body || {};
  const worklistId = Number(b.worklist_id);
  const uid = String(b.study_instance_uid || '');
  if (!Number.isInteger(worklistId) || worklistId <= 0 || !uid) {
    return res.status(400).json({ error: 'worklist_id and study_instance_uid are required' });
  }
  const imagePatientId = String(b.patient_id || '').trim().slice(0, 64);
  const imagePatientName = String(b.patient_name || '').trim().slice(0, 200);
  const count = Number.isInteger(Number(b.instances)) && Number(b.instances) >= 0 ? Number(b.instances) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const w = await client.query(
      `SELECT wl.id, wl.order_item_id, wl.study_instance_uid, p.chart_no
         FROM worklist_log wl JOIN patient p ON p.id = wl.patient_id
        WHERE wl.id = $1 FOR UPDATE OF wl`, [worklistId]);
    if (!w.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Worklist entry not found' }); }
    const row = w.rows[0];
    // The UID is the link; a report for some other study must not land here.
    if (row.study_instance_uid !== uid) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Study does not belong to this worklist entry' });
    }
    const check = !imagePatientId ? 'missing' : (samePatientId(imagePatientId, row.chart_no) ? 'match' : 'mismatch');
    await client.query(
      `UPDATE worklist_log
          SET status = CASE WHEN status = 'cancelled' THEN status ELSE 'completed' END,
              completed_at = COALESCE(completed_at, NOW()),
              images_received_at = COALESCE(images_received_at, NOW()),
              orthanc_study_id = $2, image_count = $3,
              image_patient_id = $4, image_patient_name = $5, patient_check = $6
        WHERE id = $1`,
      [worklistId, String(b.orthanc_study_id || '').slice(0, 64) || null, count,
       imagePatientId || null, imagePatientName || null, check]);
    await client.query(
      `UPDATE order_item SET worklist_status = 'completed', updated_at = NOW()
        WHERE id = $1 AND worklist_status <> 'cancelled'`, [row.order_item_id]);
    await client.query('COMMIT');
    res.json({ received: true, patient_check: check });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
