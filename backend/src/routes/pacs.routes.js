const express = require('express');
const { pool } = require('../config/database');
const { todayLocal, dicomDate } = require('../utils/localDate');
const { tcpCheck } = require('../utils/tcpCheck');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { presentedToken, bridgeTokenMatches, usableBridgeToken } = require('./pacs.token');
const { ORDER_CANCELLED } = require('./pacs.cancel');
const viewer = require('./pacs.viewer');
const { relinkLostStudies, patientCheck } = require('./pacs.relink');
const { isExam } = require('./pacs.exam');            // which orders are imaging exams
const move = require('./pacs.move');                 // images put under another order
const { probeOrthanc, DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');

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

// pacs_config as the settings screen may see it. The image server's password
// (orthanc_password, written only by pair-with-emr) never leaves the server:
// the screen learns only whether it is set.
function publicConfig(row) {
  const out = Object.assign({}, row || {});
  out.orthanc_password_set = !!out.orthanc_password;
  delete out.orthanc_password;
  return out;
}

function normalizeConfig(body) {
  const fields = [
    'worklist_scp_host','worklist_scp_ae','bridge_token','emr_base_url','pacs_viewer_url','facility_name','notes','orthanc_url'
  ];
  // orthanc_password is deliberately not here: only pair-with-emr sets it.
  const out = {};
  fields.forEach(k => { if (body[k] !== undefined) out[k] = String(body[k] || '').trim(); });
  if (body.worklist_scp_port !== undefined) out.worklist_scp_port = Number(body.worklist_scp_port) || 4242;
  if (body.auto_create_worklist !== undefined) out.auto_create_worklist = !!body.auto_create_worklist;
  return out;
}

// What the order-feed tab can be told, as fixed English strings that Settings.jsx
// (pxMessage) puts in the screen's language -- CHANGE ONE HERE, CHANGE IT THERE TOO.
// The raw driver text used to reach the screen ("value too long for type character
// varying(50)"), and a port like 70000 was stored and then broke the connection test.
const CONFIG_MAX = {
  worklist_scp_host: 100, worklist_scp_ae: 50, bridge_token: 100, emr_base_url: 200,
  pacs_viewer_url: 200, facility_name: 100, orthanc_url: 200,
};
const CONFIG_MSG = {
  port: 'DICOM port must be a whole number from 1 to 65535',
  saveFailed: 'Could not save the order feed settings',
  noHost: 'No PACS host set',
  server: 'Server error',
};
function configProblem(cfg) {
  for (const k of Object.keys(CONFIG_MAX)) {
    if (cfg[k] !== undefined && cfg[k].length > CONFIG_MAX[k]) return `${k} is too long (at most ${CONFIG_MAX[k]} characters)`;
  }
  const p = cfg.worklist_scp_port;
  if (p !== undefined && !(Number.isInteger(p) && p >= 1 && p <= 65535)) return CONFIG_MSG.port;
  return null;
}

// The viewer relay: its own auth (the cookie above), not the JWT.
router.use('/viewer', viewer.router);
// Moving the images of an order to another order of the same patient (pacs.move.js).
router.use('/', move.router);

// Settings UI. This carries the bridge token, which opens the patient feed, so
// it is for the settings permission only -- not every member of staff.
router.get('/config', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try { res.json(publicConfig(await ensureConfig())); }
  catch (err) { console.error('[pacs] read config:', err.message); res.status(500).json({ error: CONFIG_MSG.server }); }
});

router.put('/config', authMiddleware, permMiddleware('settings'), async (req, res) => {
  const cfg = normalizeConfig(req.body || {});
  const problem = configProblem(cfg);
  if (problem) return res.status(400).json({ error: problem });
  try {
    // A field left out of the request keeps its value. Writing it as NULL instead
    // would, for bridge_token, silently unpair the PACS on a partial save.
    const result = await pool.query(
      `UPDATE pacs_config SET
       worklist_scp_host=COALESCE($1, worklist_scp_host), worklist_scp_port=COALESCE($2, worklist_scp_port),
       worklist_scp_ae=COALESCE($3, worklist_scp_ae), bridge_token=COALESCE($4, bridge_token),
       emr_base_url=COALESCE($5, emr_base_url), pacs_viewer_url=COALESCE($6, pacs_viewer_url),
       auto_create_worklist=COALESCE($7, auto_create_worklist), facility_name=COALESCE($8, facility_name),
       notes=COALESCE($9, notes), orthanc_url=COALESCE(NULLIF($11, ''), orthanc_url), updated_by=$10, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [cfg.worklist_scp_host, cfg.worklist_scp_port, cfg.worklist_scp_ae,
       cfg.bridge_token, cfg.emr_base_url, cfg.pacs_viewer_url, cfg.auto_create_worklist, cfg.facility_name, cfg.notes, req.user.id,
       cfg.orthanc_url]
    );
    // Saved either way; the screen shows the answer next to the address field
    // when the EMR cannot reach the image server there (2026-09-30).
    const saved = result.rows[0];
    // Same check, same answer as the status line "pacs_relay" (services/pacs-probe.js):
    // { state: ok | refused | unknownHost | timeout | unauthorized | notOrthanc | badAddress, ... }.
    const url = saved.orthanc_url || DEFAULT_ORTHANC_URL;
    const orthanc_check = Object.assign({ url }, await probeOrthanc(url, saved.orthanc_password));
    res.json(Object.assign(publicConfig(saved), { orthanc_check }));
  } catch (err) { console.error('[pacs] save config:', err.message); res.status(500).json({ error: CONFIG_MSG.saveFailed }); }
});

// Route permissions follow the screens that call them (decision S2, 2026-09-29):
// the connection test lives in Settings only.
router.get('/test', authMiddleware, permMiddleware('settings'), async (req, res) => {
  try {
    const cfg = await ensureConfig();
    // ?target=orthanc: the EMR -> image server path the viewer uses (orthanc_url
    // + stored password), not the devices' DICOM port.
    if (req.query.target === 'orthanc') {
      const url = cfg.orthanc_url || DEFAULT_ORTHANC_URL;
      return res.json(Object.assign({ url }, await probeOrthanc(url, cfg.orthanc_password)));
    }
    const host = cfg.worklist_scp_host;
    const port = cfg.worklist_scp_port;
    // An empty host would quietly test the EMR container itself.
    if (!String(host || '').trim()) return res.json({ ok: false, host: '', port, message: CONFIG_MSG.noHost });
    res.json(await tcpCheck(host, port));
  } catch (err) { console.error('[pacs] connection test:', err.message); res.status(500).json({ error: CONFIG_MSG.server }); }
});

// worklist_log columns the screens need, and how they are handed out. `images`
// stays null until the bridge has reported the study (POST /study-arrived):
// "nothing arrived yet" is a different answer from "arrived, and it matches".
const WL_COLUMNS = `accession_no, study_instance_uid, images_received_at, image_count,
                    image_patient_id, image_patient_name, patient_check, image_study_uid`;
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
    // 'accession' when the device made up its own UID and the bridge found the
    // study by AccessionNumber (P-4) -- a weaker link, shown to the doctor.
    linked_by: w.image_study_uid && w.image_study_uid !== w.study_instance_uid ? 'accession' : 'uid',
  };
}

// The same patient's other imaging studies, to put next to the one being opened
// (director, 2026-10-01: two chest films of different dates must be comparable).
// Only what the EMR itself linked to this patient's orders, and only when it is
// sure whose images they are: arrived, the patient number in the images matches
// the chart (patient_check = 'match'), and the order was not cancelled. A study
// flagged as another patient's would sit in the viewer's list with no warning on
// it, so it is left out; it still opens from its own order, with its warning.
// Most recent first. `older` = ordered before the one being opened.
const MAX_COMPARE = 9;
// Exams ticked in the patient's imaging list, to open together (director, 2026-10-01).
const MAX_PICKED = 9;
const PICK_REFUSED = 'These exams cannot be compared together';
// The ticked order items -> the one that is "opened": the most recent of them (visit
// date, then order number). The window's title, the reading box and the first pane
// are that exam's - a doctor compares today's film with earlier ones, and it does not
// depend on the order of the ticks. null when the list is not 2..9 imaging orders of
// one and the same patient.
async function pickedOrders(raw) {
  const ids = [...new Set(String(raw || '').split(',').map(x => x.trim()).filter(Boolean))];
  if (ids.length < 2 || ids.length > MAX_PICKED || ids.some(x => !/^[0-9]{1,9}$/.test(x))) return null;
  const r = await pool.query(
    `SELECT oi.id, oi.patient_id FROM order_item oi JOIN visit v ON v.id = oi.visit_id
      WHERE oi.id = ANY($1::int[]) AND ${isExam('oi')} ORDER BY v.visit_date DESC, oi.id DESC`, [ids.map(Number)]);
  if (r.rows.length !== ids.length || r.rows.some(x => x.patient_id !== r.rows[0].patient_id)) return null;
  return { opened: r.rows[0].id, others: r.rows.slice(1).map(x => x.id) };
}
async function comparableStudies(orderItemId) {
  const r = await pool.query(
    `SELECT oi.id, oi.order_code, oi.order_name, oi.pacs_modality, v.visit_date, wl.body_part,
            COALESCE(wl.image_study_uid, wl.study_instance_uid) AS study,
            (v.visit_date, oi.id) < (mv.visit_date, me.id) AS older
       FROM order_item me
       JOIN visit mv ON mv.id = me.visit_id
       JOIN order_item oi ON oi.patient_id = me.patient_id AND oi.id <> me.id
       JOIN visit v ON v.id = oi.visit_id
       JOIN LATERAL (SELECT w.* FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) wl ON true
      WHERE me.id = $1 AND oi.status IS DISTINCT FROM 'cancelled'
        AND wl.images_received_at IS NOT NULL AND wl.patient_check = 'match'
        AND NOT ${move.OPEN_ON('oi.id')}
      ORDER BY v.visit_date DESC, oi.id DESC`, [orderItemId]);
  return r.rows.filter(x => x.study);
}
// Which of them the "compare" button offers first: the same exam (order code) just
// before this one; failing that the same exam just after; then the same device type
// and body part, before or after. null when nothing is alike - the doctor picks.
function previousAlike(me, others) {
  const same = x => x.order_code && x.order_code === me.order_code;
  const near = x => x.pacs_modality && x.pacs_modality === me.pacs_modality && x.body_part && x.body_part === me.body_part;
  const older = others.filter(x => x.older), newer = others.filter(x => !x.older).reverse();
  return older.find(same) || newer.find(same) || older.find(near) || newer.find(near) || null;
}

// Resolve the PACS viewer URL + reading for an imaging order (Stone Web Viewer by StudyInstanceUID).
// Only the consultation screen opens the viewer; the payment screen's readings
// list shows text and has no image button.
router.get('/viewer-url', authMiddleware, permMiddleware('consultation'), async (req, res) => {
  try {
    // The viewer is served by the EMR itself (pacs.viewer.js, P-9): the image
    // window opens a relative address and this response grants the short cookie
    // for this order's study. pacs_viewer_url (the old direct address) is kept in
    // the table but no longer used.
    const base = '/api/pacs/viewer';
    let study = '', accession = '', order_name = '', modality = '', reading = null, images = null;
    let order_status = '', cancelled_at = null, cancel_reason = '';
    let others = [], prev = null, order_code = '', visit_date = null, correcting = false;
    // ?order_item_ids=a,b,c : the exams ticked in the list, opened together. Every one
    // must be an exam this route would offer for comparison anyway - same patient, not
    // cancelled, images arrived, patient number matching - or nothing opens (409): a
    // tick cannot bring in what the compare button would not.
    let picked = null;
    if (req.query.order_item_ids !== undefined) {
      picked = await pickedOrders(req.query.order_item_ids);
      if (!picked) return res.status(409).json({ error: PICK_REFUSED });
    }
    const oid = picked ? picked.opened : req.query.order_item_id;
    if (oid) {
      // Images the server no longer has under the number noted here (a study corrected
      // in Orthanc's own screen gets a new one) are found again by accession first, for
      // this order and the patient's others - what follows reads the corrected lines.
      // A correction of this patient's images (pacs.move.js) that a restore from an older
      // backup disk undid on the image server is made again there first.
      await move.reapplyAfterRestore(req, oid);
      await relinkLostStudies(req, oid);
      const w = await pool.query(
        `SELECT ${WL_COLUMNS}, body_part FROM worklist_log WHERE order_item_id = $1 ORDER BY id DESC LIMIT 1`, [oid]);
      if (w.rows[0]) {
        // Open the study the images really carry (P-4); it is the worklist's own UID
        // unless the device made up a new one.
        study = w.rows[0].image_study_uid || w.rows[0].study_instance_uid || ''; accession = w.rows[0].accession_no || '';
        images = imagesOf(w.rows[0]);
        // Images are being moved to or from this order (pacs.move.js) and the EMR says it
        // has none: what the image server holds under its number right now - the original
        // not yet deleted, or a corrected study not yet checked - is not this order's.
        // Two orders exchanging their images are both closed until it is finished.
        const kind = study ? await move.openKindOn(pool, oid) : '';
        if (kind && (!images || kind === 'swap')) { study = ''; correcting = true; }
      }
      const o = await pool.query(
        `SELECT oi.order_name, oi.order_code, oi.pacs_modality, oi.result_text, oi.result_at, s.name AS result_by_name, v.visit_date, ${ORDER_CANCEL_COLUMNS}
           FROM order_item oi LEFT JOIN staff s ON s.id = oi.result_by LEFT JOIN visit v ON v.id = oi.visit_id WHERE oi.id = $1`, [oid]);
      if (o.rows[0]) {
        order_name = o.rows[0].order_name || ''; modality = o.rows[0].pacs_modality || ''; order_code = o.rows[0].order_code || ''; visit_date = o.rows[0].visit_date;
        order_status = o.rows[0].order_status || ''; cancelled_at = o.rows[0].cancelled_at; cancel_reason = o.rows[0].cancel_reason || '';
        reading = { result_text: o.rows[0].result_text || '', result_by_name: o.rows[0].result_by_name || '', result_at: o.rows[0].result_at };
      }
      if (picked) {
        const mine = w.rows[0] || {};
        const okMine = study && o.rows[0] && o.rows[0].order_status !== 'cancelled' && mine.images_received_at && mine.patient_check === 'match';
        const all = okMine ? (await comparableStudies(oid)).filter(x => x.study !== study) : [];
        others = all.filter(x => picked.others.includes(x.id));
        if (!okMine || others.length !== picked.others.length) return res.status(409).json({ error: PICK_REFUSED });
      } else if (study && o.rows[0]) {
        // A list that cannot be read never stops the image window: it opens alone.
        try {
          const all = (await comparableStudies(oid)).filter(x => x.study !== study);
          prev = previousAlike({ order_code, pacs_modality: o.rows[0].pacs_modality, body_part: w.rows[0].body_part }, all);
          // The offered one is always kept; the rest are the most recent, in date order.
          const kept = [...(prev ? [prev] : []), ...all.filter(x => x !== prev)]
            .filter((x, i, a) => a.findIndex(y => y.study === x.study) === i).slice(0, MAX_COMPARE);
          others = all.filter(x => kept.includes(x));
        } catch (e) { others = []; prev = null; }
      }
    }
    // (A bare ?study=<UID> used to be accepted too. Nothing calls it, and with the
    // viewer cookie it would open any study number - only an order grants now.)
    // No study to show (an imaging order that never went to the worklist): no URL
    // at all. Falling back to `base` opened the viewer's front page -- the list of
    // every patient in the PACS -- inside one patient's chart (P-18). has_viewer
    // is always true now (the EMR is the viewer), so the screen shows "nothing to
    // show for this order" rather than the old "no viewer address set".
    // The window opens on the order's own study, as it always did. The cookie also
    // opens the same patient's other studies, and `compare.url` is the address that
    // shows them all in Stone's list: its own ?study=OPENED,OTHER,... (director,
    // 2026-10-01, after trying Stone's ?patient= on the server: "that works well -
    // make this possible"). The doctor then splits the screen with Stone's layout
    // button and drags the exams into the panes. Never ?patient=: that asks Orthanc for
    // every study carrying that number, including ones the EMR flagged or never linked.
    // Stone itself is not changed or scripted - only its URL parameters are used.
    const page = `${base}/stone-webviewer/index.html?study=`;
    const url = study ? page + encodeURIComponent(study) : '';
    if (study) viewer.grantViewerCookie(req, res, [study, ...others.map(x => x.study)]);
    const shown = x => ({ order_name: x.order_name, modality: x.pacs_modality || '', visit_date: x.visit_date, same_exam: x.order_code === order_code });
    // prev: the one worth naming (same exam, the time before); others: all, most recent first.
    const compare = { count: others.length, url: others.length ? page + [study, ...others.map(x => x.study)].map(encodeURIComponent).join(',') : '',
      opened: { order_name, visit_date }, prev: prev ? shown(prev) : null, others: others.map(shown) };
    // A cancelled order's images stay viewable: they are part of the record.
    // order_item_id: whose reading this window writes (with ticks: the most recent one).
    res.json({ has_viewer: true, base, order_item_id: oid ? Number(oid) : null, picked: !!picked,
               study_instance_uid: study, accession, url, order_name, modality, visit_date, reading, images, compare,
               no_study: !study, correction_in_progress: correcting, order_status, cancelled: order_status === 'cancelled', cancelled_at, cancel_reason });
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
        WHERE id = $3 AND ${isExam('order_item')} AND status IS DISTINCT FROM 'cancelled' RETURNING id`,
      [req.body.result_text || '', req.user.id, req.params.orderItemId]
    );
    if (!r.rows.length) {
      const o = await pool.query(`SELECT status FROM order_item WHERE id = $1 AND ${isExam('order_item')}`, [req.params.orderItemId]);
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
      `SELECT oi.id, oi.visit_id, oi.order_code, oi.order_name, oi.pacs_modality, oi.result_text, oi.result_at,
              s.name AS result_by_name, v.visit_date,
              COALESCE(ob.name, vd.name) AS ordered_by_name, d.code AS dept_code, d.name AS dept_name,
              wl.accession_no, wl.study_instance_uid, wl.images_received_at, wl.image_count,
              wl.image_patient_id, wl.image_patient_name, wl.patient_check, wl.image_study_uid,
              ${ORDER_CANCEL_COLUMNS}
         FROM order_item oi
         JOIN visit v ON v.id = oi.visit_id
         LEFT JOIN staff s ON s.id = oi.result_by
         LEFT JOIN staff ob ON ob.id = oi.ordered_by
         LEFT JOIN staff vd ON vd.id = v.doctor_id
         LEFT JOIN department d ON d.id = v.department_id
         LEFT JOIN LATERAL (SELECT ${WL_COLUMNS} FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY id DESC LIMIT 1) wl ON true
        WHERE oi.patient_id = $1 AND ${isExam('oi')}
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
    // Not while the images of another order are being put under this one (pacs.move.js):
    // the device must not scan into a study number that is being filled, and the bridge
    // must not report the half-made study as this order's own.
    let where = `wl.scheduled_date = $1 AND wl.status = 'scheduled' AND NOT ${move.OPEN_ON('wl.order_item_id')}`;
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

// The nightly image backup (PACS image-backup.ps1, decision 41) reports here
// after every run: counts and disk space only, never patient data. Stored as the
// 'pacs_image_backup' heartbeat so the status screen can warn when the disk was
// missing, the run failed, the disk is nearly full, or no run has succeeded for
// too long (settings session's status.routes.js reads it). last_success is kept
// across failed runs, because "when did it last work" is the question.
router.post('/image-backup-report', async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const denied = bridgeDenied(cfg, req);
    if (denied) return res.status(401).json({ error: denied });
    const b = req.body || {};
    const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const ok = b.ok === true;
    const prev = await pool.query(`SELECT detail FROM service_heartbeat WHERE name = 'pacs_image_backup'`);
    const prevSuccess = prev.rows[0] && prev.rows[0].detail ? prev.rows[0].detail.last_success : null;
    const detail = {
      disk_found: b.disk_found === true,
      copied: num(b.copied), failed: num(b.failed), total_files: num(b.total_files),
      free_gb: num(b.free_gb), total_gb: num(b.total_gb),
      error: String(b.error || '').slice(0, 300),
      last_success: ok ? new Date().toISOString() : (prevSuccess || null),
    };
    // The EMR's own database backups, copied to the same disk by the same run
    // (image-backup.ps1 Copy-EmrBackups). Reported apart from the images: `ok`
    // above stays the images' result. Absent when an older script reports.
    const EMR_STATES = ['ok', 'not_found', 'none', 'failed', 'no_disk'];
    if (b.emr_backup !== undefined) {
      const prevEmrOk = prev.rows[0] && prev.rows[0].detail ? prev.rows[0].detail.emr_backup_last_ok : null;
      Object.assign(detail, {
        emr_backup: EMR_STATES.includes(b.emr_backup) ? b.emr_backup : 'failed',
        emr_backup_ok: b.emr_backup_ok === true,
        emr_backup_copied: num(b.emr_backup_copied), emr_backup_count: num(b.emr_backup_count),
        emr_backup_newest: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(b.emr_backup_newest || '')) ? b.emr_backup_newest : null,
        emr_backup_error: String(b.emr_backup_error || '').slice(0, 300),
        emr_backup_last_ok: b.emr_backup_ok === true ? new Date().toISOString() : (prevEmrOk || null),
      });
    }
    await pool.query(
      `INSERT INTO service_heartbeat (name, last_seen, ok, detail)
            VALUES ('pacs_image_backup', NOW(), $1, $2)
       ON CONFLICT (name) DO UPDATE SET last_seen = NOW(), ok = EXCLUDED.ok, detail = EXCLUDED.detail`,
      [ok, JSON.stringify(detail)]);
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
// now leave the list. (patientCheck: pacs.relink.js, which makes the same check when
// it finds a study again.)
// For the PACS's image backup (bridge token): the image files that are no longer on the
// image server because their images were put under another order (pacs.move.js). Study
// and image numbers only - no patient data.
router.get('/superseded-images', async (req, res) => {
  try {
    const cfg = await ensureConfig();
    const denied = bridgeDenied(cfg, req);
    if (denied) return res.status(401).json({ error: denied });
    res.json({ items: await move.supersededNow() });
  } catch (err) { console.error('[pacs] superseded images:', err.message); res.status(500).json({ error: 'Server error' }); }
});

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
  const byAccession = b.found_by === 'accession';
  const imageStudyUid = String(b.image_study_uid || '').slice(0, 128);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const w = await client.query(
      `SELECT wl.id, wl.order_item_id, wl.study_instance_uid, wl.accession_no, p.chart_no
         FROM worklist_log wl JOIN patient p ON p.id = wl.patient_id
        WHERE wl.id = $1 FOR UPDATE OF wl`, [worklistId]);
    if (!w.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Worklist entry not found' }); }
    const row = w.rows[0];
    // Images are being moved to or from this order: what is on the image server under
    // its number right now is not an arrival. The bridge asks again on its next cycle.
    const moving = await client.query(`SELECT 1 WHERE ${move.OPEN_ON('$1')}`, [row.order_item_id]);
    if (moving.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'A correction is in progress for this order' }); }
    // The UID is the link; a report for some other study must not land here.
    // A study found by accession (the device made up its own UID, P-4) must
    // carry this entry's accession number, and its own UID is kept apart.
    if (row.study_instance_uid !== uid || (byAccession && (!imageStudyUid || String(b.accession_no || '') !== row.accession_no))) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Study does not belong to this worklist entry' });
    }
    const check = patientCheck(imagePatientId, row.chart_no);
    await client.query(
      `UPDATE worklist_log
          SET status = CASE WHEN status = 'cancelled' THEN status ELSE 'completed' END,
              completed_at = COALESCE(completed_at, NOW()),
              images_received_at = COALESCE(images_received_at, NOW()),
              orthanc_study_id = $2, image_count = $3,
              image_patient_id = $4, image_patient_name = $5, patient_check = $6,
              image_study_uid = $7
        WHERE id = $1`,
      [worklistId, String(b.orthanc_study_id || '').slice(0, 64) || null, count,
       imagePatientId || null, imagePatientName || null, check,
       byAccession && imageStudyUid !== row.study_instance_uid ? imageStudyUid : null]);
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
