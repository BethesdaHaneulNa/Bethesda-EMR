// Images brought in from another establishment (director, 2026-10-02: «다른 병원에서 가져온
// cd나 usb … 우리쪽으로 업로드도 가능해?» - «그냥 영상판독 저거 클릭하면 뜨게»).
//
// From the consultation screen's imaging window the doctor picks the folder of a CD or a
// USB stick; the browser reads which studies it holds and sends the chosen one here, one
// DICOM file a request. This file is the server side:
//   GET  /api/pacs/import/target?patient_id=   today's consultation, the order code, the limits, the room left
//   POST /api/pacs/import/check                which of the disc's studies can be brought in
//   POST /api/pacs/import/begin                one study, onto one order (made by the screen through the
//                                              consultation's own POST /consultations/:id/orders)
//   PUT  /api/pacs/import/:id/instance         one image
//   POST /api/pacs/import/:id/finish           the images are tied to the order - in one transaction, with the change-log line
//   POST /api/pacs/import/:id/cancel           before it is finished: everything made is removed
//   POST /api/pacs/import/:id/undo             after it is finished: an import made by mistake is taken out again
//
// What is changed in an image is its patient number, name, birth date and sex (ours), its
// study number and accession (ours, by the same rule as our own orders). The picture, its
// compression, the series and image numbers, the institution and the dates stay; the
// number and name it came with are kept in the image (OtherPatientIDs, OtherPatientNames)
// and in table pacs_import.
//
// How it gets onto the image server - Orthanc's own REST only, one image at a time:
//   1. the file is stored as it is                     POST /instances
//   2. it must be of the announced study and patient   GET  /instances/{id}/simplified-tags
//   3. Orthanc makes the changed file (it stores none) POST /instances/{id}/modify
//   4. the changed file is stored                      POST /instances
//   5. the original is deleted                         DELETE /instances/{id}
// So what stands on the server under the number it came with is one image for a moment,
// never a study that could be taken for an arrived exam. Until `finish` nothing shows in
// any screen; an import that stops half-way is undone - by `cancel`, or by resumePending()
// (20 s after the server starts and every 5 minutes) when it has been silent for 30 minutes.
//
// Who: consultation (the button is in the consultation screen).
const express = require('express');
const { Readable } = require('stream');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const { todayLocal } = require('../utils/localDate');

const router = express.Router();
const mayImport = permMiddleware('consultation');
const mayUndo = permMiddleware('consultation', 'settings');

const ORDER_CODE = 'IMG-EXT';
const WARN_BYTES = 2 * 1024 * 1024 * 1024;      // a selection larger than this is warned about, not refused
const SPARE_BYTES = 5 * 1024 * 1024 * 1024;     // room that must stay free on the image server's disk
const SILENT_MINUTES = 30;                      // an import that has received nothing for this long is undone
const UID = /^[0-9.]{1,64}$/;

const WHY = {
  BAD_REQUEST: 'The request is not understood',
  NO_PATIENT: 'No such patient',
  NO_CONSULTATION: 'This patient has no consultation open today',
  NO_ORDER_CODE: 'The order code for outside images is missing',
  NOT_PAIRED: 'The image server is not set up',
  UNREACHABLE: 'The image server does not answer',
  NOT_FOUND: 'No such import',
  NOT_YOURS: 'This import was started by someone else',
  BAD_ORDER: 'This order cannot take outside images',
  ORDER_HAS_IMAGES: 'This order already has images',
  OURS: 'This exam was made here: it is already in the chart',
  HERE: 'This exam was already brought in for this patient',
  OTHER: 'These images are already in another patient\'s chart',
  ON_SERVER: 'The image server already holds this exam',
  BUSY: 'This exam is being brought in right now',
  NO_ROOM: 'Not enough room left on the image server',
  TOO_BIG_FILE: 'This file is larger than the limit for one file',
  NOT_DICOM: 'The image server did not take this file: it is not a DICOM image',
  NOT_OF_STUDY: 'This file is not of the exam that was announced',
  CHANGE_FAILED: 'The image server could not put the patient\'s number into this image',
  INCOMPLETE: 'Not every image has arrived',
  NOT_LOGGED: 'The change log could not be written: nothing is tied to the chart',
  CLOSED: 'This import is finished already',
  NOT_DONE: 'This import was not finished',
  HAS_READING: 'A reading was written on these images: remove it first',
};
// Refusals are 409 unless said otherwise - never 502/503/504, which the web server in
// front replaces with its own text (see pacs.export.js).
const HTTP = { BAD_REQUEST: 400, NO_PATIENT: 404, NOT_FOUND: 404, NOT_YOURS: 403, TOO_BIG_FILE: 413, NOT_LOGGED: 500 };
const refuse = (res, code, extra) => res.status(HTTP[code] || 409).json(Object.assign({ ok: false, code, error: WHY[code] }, extra || {}));
const text = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const intOf = v => (/^[0-9]{1,9}$/.test(String(v)) ? Number(v) : null);

async function config() {
  return (await pool.query('SELECT orthanc_url, orthanc_password, import_max_file_mb FROM pacs_config WHERE id = 1')).rows[0] || {};
}
const maxFileBytes = cfg => Math.max(1, Number(cfg.import_max_file_mb) || 1024) * 1024 * 1024;
function urlOf(cfg, path) {
  const base = new URL(String(cfg.orthanc_url || DEFAULT_ORTHANC_URL));
  return new URL(base.pathname.replace(/\/+$/, '') + path, base.origin);
}
const auth = cfg => 'Basic ' + Buffer.from('admin:' + cfg.orthanc_password).toString('base64');
// One call to the image server with a JSON body (or none). status 0 = no answer.
async function ox(cfg, method, path, body, timeout) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout || 15000);
  try {
    const headers = { Authorization: auth(cfg) };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    const r = await fetch(urlOf(cfg, path), { method, signal: ctl.signal, headers, body: body == null ? undefined : JSON.stringify(body) });
    const t = await r.text();
    let json = null;
    try { json = JSON.parse(t); } catch (e) { /* not JSON */ }
    return { status: r.status, json };
  } catch (e) { return { status: 0 }; } finally { clearTimeout(timer); }
}
// A DICOM file handed to the image server as it comes (never held here).
async function store(cfg, stream, signal) {
  try {
    const r = await fetch(urlOf(cfg, '/instances'), { method: 'POST', signal, duplex: 'half', body: stream, headers: { Authorization: auth(cfg), 'Content-Type': 'application/dicom' } });
    const t = await r.text();
    let json = null;
    try { json = JSON.parse(t); } catch (e) { /* not JSON */ }
    return { status: r.status, json };
  } catch (e) { return { status: 0 }; }
}

// ── the patient, the consultation, the order ─────────────────────────────
async function patientRow(id) {
  if (intOf(id) == null) return null;
  return (await pool.query(`SELECT id, chart_no, last_name, first_name, gender, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth FROM patient WHERE id = $1`, [id])).rows[0] || null;
}
const dicomName = p => [text(p.last_name, 60), text(p.first_name, 60)].filter(Boolean).join('^');
// The room left on the disk the image server stores on, as the worklist bridge last said
// it (every 15 s). null: not known - then room is not a reason to refuse.
async function freeBytes() {
  try {
    const r = await pool.query(`SELECT detail, last_seen > NOW() - interval '3 minutes' AS fresh FROM service_heartbeat WHERE name = 'worklist_bridge'`);
    const d = r.rows[0] && r.rows[0].fresh ? r.rows[0].detail : null;
    const n = d ? Number(d.storage_free_bytes) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (e) { return null; }
}
// An order of the outside-images code, of this patient, not cancelled, with no images yet.
async function orderRow(db, id) {
  const r = await db.query(
    `SELECT oi.id, oi.patient_id, oi.visit_id, oi.consultation_id, oi.order_code, oi.order_name, oi.status, oi.result_text,
            EXISTS (SELECT 1 FROM worklist_log w WHERE w.order_item_id = oi.id) AS has_images,
            EXISTS (SELECT 1 FROM pacs_import i WHERE i.order_item_id = oi.id AND i.state IN ('started', 'cleanup-pending')) AS importing
       FROM order_item oi WHERE oi.id = $1`, [id]);
  return r.rows[0] || null;
}

// GET /api/pacs/import/target?patient_id=
// What the screen needs before it lets anything be chosen. `consultation` is the one of
// today's visit (the screen makes the order in it); none -> the button says why.
router.get('/target', authMiddleware, mayImport, async (req, res) => {
  try {
    const p = await patientRow(req.query.patient_id);
    if (!p) return refuse(res, 'NO_PATIENT');
    const c = (await pool.query(
      `SELECT c.id, c.visit_id, c.status FROM consultation c WHERE c.patient_id = $1 AND c.consult_date = $2::date ORDER BY c.id DESC LIMIT 1`, [p.id, todayLocal()])).rows[0] || null;
    const code = (await pool.query(`SELECT id, code, name, name_en, price FROM order_code WHERE code = $1 AND COALESCE(is_active, TRUE) LIMIT 1`, [ORDER_CODE])).rows[0] || null;
    // an order of this consultation left empty by an import that did not finish: used again
    const empty = c ? (await pool.query(
      `SELECT oi.id FROM order_item oi
        WHERE oi.consultation_id = $1 AND oi.order_code = $2 AND oi.status IS DISTINCT FROM 'cancelled' AND COALESCE(oi.result_text, '') = ''
          AND NOT EXISTS (SELECT 1 FROM worklist_log w WHERE w.order_item_id = oi.id)
          AND NOT EXISTS (SELECT 1 FROM pacs_import i WHERE i.order_item_id = oi.id AND i.state IN ('started', 'cleanup-pending'))
        ORDER BY oi.id`, [c.id, ORDER_CODE])).rows.map(r => r.id) : [];
    const cfg = await config();
    let server = '';
    if (!cfg.orthanc_password) server = 'NOT_PAIRED';
    else if ((await ox(cfg, 'GET', '/system', null, 4000)).status !== 200) server = 'UNREACHABLE';
    res.json({ ok: true, patient: p, consultation: c ? { id: c.id, visit_id: c.visit_id, status: c.status } : null, order_code: code, empty_orders: empty,
               server, free_bytes: await freeBytes(), spare_bytes: SPARE_BYTES, max_file_bytes: maxFileBytes(cfg), warn_bytes: WARN_BYTES });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Where a study of the disc stands: '' (can be brought in) or the reason it cannot.
async function standing(cfg, patientId, uid) {
  const ours = await pool.query(`SELECT 1 FROM worklist_log WHERE study_instance_uid = $1 OR image_study_uid = $1 LIMIT 1`, [uid]);
  if (ours.rows.length) return { state: 'OURS' };
  const made = await pool.query(`SELECT 1 FROM pacs_import WHERE study_uid = $1 AND state <> 'rolled-back' LIMIT 1`, [uid]);
  if (made.rows.length) return { state: 'OURS' };                                    // (a disc we made, of a study we had brought in)
  const was = await pool.query(
    `SELECT patient_id, state, order_name, to_char(finished_at, 'YYYY-MM-DD') AS day FROM pacs_import
      WHERE source_study_uid = $1 AND state IN ('started', 'cleanup-pending', 'done') ORDER BY id DESC LIMIT 1`, [uid]);
  if (was.rows.length) {
    const w = was.rows[0];
    if (w.state !== 'done') return { state: 'BUSY' };
    return w.patient_id === patientId ? { state: 'HERE', imported_at: w.day, order_name: w.order_name } : { state: 'OTHER' };
  }
  const f = await ox(cfg, 'POST', '/tools/find', { Level: 'Study', Query: { StudyInstanceUID: uid } });
  if (f.status !== 200 || !Array.isArray(f.json)) return { state: 'UNREACHABLE' };
  if (f.json.length) return { state: 'ON_SERVER' };
  return { state: '' };
}

// POST /api/pacs/import/check  { patient_id, studies: [study_uid, ...] }
router.post('/check', authMiddleware, mayImport, async (req, res) => {
  try {
    const p = await patientRow((req.body || {}).patient_id);
    if (!p) return refuse(res, 'NO_PATIENT');
    const uids = Array.isArray((req.body || {}).studies) ? req.body.studies.map(String) : [];
    if (!uids.length || uids.length > 200 || uids.some(u => !UID.test(u))) return refuse(res, 'BAD_REQUEST');
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    const out = [];
    for (const uid of uids) out.push(Object.assign({ study_uid: uid }, await standing(cfg, p.id, uid)));
    res.json({ ok: true, studies: out });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pacs/import/begin
// { order_item_id, files, bytes, source: { study_uid, patient_id, patient_name, birth_date, sex, accession,
//   institution, study_date, description, modality }, confirm: { birth_differs, sex_differs } }
// One study, onto one order of the outside-images code. The study number and accession it
// will carry here are fixed now, by the rule of our own orders.
router.post('/begin', authMiddleware, mayImport, async (req, res) => {
  try {
    const b = req.body || {}, src = b.source || {};
    const orderId = intOf(b.order_item_id), files = intOf(b.files), bytes = Number(b.bytes);
    const uid = String(src.study_uid || '');
    if (orderId == null || !files || files > 100000 || !Number.isFinite(bytes) || bytes < 0 || !UID.test(uid)) return refuse(res, 'BAD_REQUEST');
    const o = await orderRow(pool, orderId);
    if (!o || o.order_code !== ORDER_CODE || o.status === 'cancelled') return refuse(res, 'BAD_ORDER');
    if (o.has_images) return refuse(res, 'ORDER_HAS_IMAGES');
    if (o.importing) return refuse(res, 'BUSY');
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    const st = await standing(cfg, o.patient_id, uid);
    if (st.state) return refuse(res, st.state, st);
    const free = await freeBytes();
    if (free != null && bytes * 2 + SPARE_BYTES > free) return refuse(res, 'NO_ROOM', { free_bytes: free, needed_bytes: bytes * 2 + SPARE_BYTES });
    const day = todayLocal().replace(/-/g, '');
    const row = (await pool.query(
      `INSERT INTO pacs_import (patient_id, order_item_id, order_name, study_uid, accession_no, source_study_uid, source_patient_id, source_patient_name,
                                source_birth_date, source_sex, source_accession, institution, study_date, description, modality, files_announced, detail, staff_id, staff_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id, study_uid, accession_no`,
      [o.patient_id, o.id, o.order_name, `1.2.826.0.1.3680043.${day}.${o.id}.${Math.floor(Math.random() * 10000)}`, `${day.slice(2)}-${o.id}`,
       uid, text(src.patient_id, 64), text(src.patient_name, 200), text(src.birth_date, 10), text(src.sex, 4), text(src.accession, 64),
       text(src.institution, 200), text(src.study_date, 10), text(src.description, 200), text(src.modality, 16), files,
       JSON.stringify({ bytes_announced: bytes, confirm: { birth_differs: !!(b.confirm || {}).birth_differs, sex_differs: !!(b.confirm || {}).sex_differs } }),
       req.user.id, req.user.name || null])).rows[0];
    res.json({ ok: true, import_id: row.id, study_uid: row.study_uid, accession_no: row.accession_no });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function openImport(req, res) {
  const id = intOf(req.params.id);
  const imp = id == null ? null : (await pool.query('SELECT * FROM pacs_import WHERE id = $1', [id])).rows[0];
  if (!imp) { refuse(res, 'NOT_FOUND'); return null; }
  if (imp.state !== 'started') { refuse(res, 'CLOSED', { state: imp.state }); return null; }
  if (imp.staff_id !== req.user.id) { refuse(res, 'NOT_YOURS'); return null; }
  return imp;
}

// PUT /api/pacs/import/:id/instance   (the body is one DICOM file)
router.put('/:id/instance', authMiddleware, mayImport, async (req, res) => {
  const ctl = new AbortController();
  req.on('aborted', () => ctl.abort());                     // the browser went away: stop asking the image server
  let cfg = null, original = '';
  try {
    const imp = await openImport(req, res);
    if (!imp) return req.resume();
    cfg = await config();
    if (!cfg.orthanc_password) { req.resume(); return refuse(res, 'NOT_PAIRED'); }
    const limit = maxFileBytes(cfg), said = Number(req.headers['content-length']);
    if (Number.isFinite(said) && said > limit) { req.resume(); return refuse(res, 'TOO_BIG_FILE', { max_file_bytes: limit }); }
    await pool.query('UPDATE pacs_import SET last_at = NOW() WHERE id = $1', [imp.id]);
    const p = await patientRow(imp.patient_id);

    // 1. as it is (counted as it passes: a file with no stated length must not slip past the limit)
    let seen = 0;
    req.on('data', chunk => { seen += chunk.length; if (seen > limit) ctl.abort(); });
    const up = await store(cfg, Readable.toWeb(req), ctl.signal);
    if (seen > limit) return refuse(res, 'TOO_BIG_FILE', { max_file_bytes: limit });
    if (up.status === 0) return refuse(res, 'UNREACHABLE');
    if (up.status !== 200 || !up.json || !up.json.ID) return refuse(res, 'NOT_DICOM');
    original = up.json.ID;
    // 2. is it of the study and the patient that were announced?
    const tags = await ox(cfg, 'GET', `/instances/${original}/simplified-tags`);
    const t = tags.json || {};
    if (tags.status !== 200 || String(t.StudyInstanceUID || '') !== imp.source_study_uid || text(t.PatientID, 64) !== imp.source_patient_id) {
      await ox(cfg, 'DELETE', `/instances/${original}`);
      return refuse(res, tags.status === 200 ? 'NOT_OF_STUDY' : 'UNREACHABLE');
    }
    // 3. the image server makes the changed file (it does not store it) ...
    const replace = { PatientID: p.chart_no, PatientName: dicomName(p), StudyInstanceUID: imp.study_uid, AccessionNumber: imp.accession_no };
    if (p.date_of_birth) replace.PatientBirthDate = p.date_of_birth.replace(/-/g, '');
    if (p.gender === 'M' || p.gender === 'F') replace.PatientSex = p.gender;
    if (imp.source_patient_id) replace.OtherPatientIDs = imp.source_patient_id;
    if (t.PatientName) replace.OtherPatientNames = String(t.PatientName);
    const changed = await fetch(urlOf(cfg, `/instances/${original}/modify`), {
      method: 'POST', signal: ctl.signal, headers: { Authorization: auth(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ Replace: replace, Remove: ['IssuerOfPatientID'], Keep: ['SeriesInstanceUID', 'SOPInstanceUID'], Force: true }),
    }).catch(() => null);
    if (!changed || changed.status !== 200 || !changed.body) {
      await ox(cfg, 'DELETE', `/instances/${original}`);
      return refuse(res, changed ? 'CHANGE_FAILED' : 'UNREACHABLE');
    }
    // 4. ... and takes it in under our numbers
    const put = await store(cfg, changed.body, ctl.signal);
    // 5. the one it came as is not kept
    if (!(put.json && put.json.ID === original)) await ox(cfg, 'DELETE', `/instances/${original}`);
    if (put.status !== 200 || !put.json || !put.json.ID) return refuse(res, put.status === 0 ? 'UNREACHABLE' : 'CHANGE_FAILED');
    const fresh = put.json.Status === 'Success';             // (the same image sent twice is counted once)
    const n = await pool.query(
      `UPDATE pacs_import SET files_received = files_received + $2, bytes_received = bytes_received + $3, last_at = NOW() WHERE id = $1 AND state = 'started' RETURNING files_received`,
      [imp.id, fresh ? 1 : 0, fresh ? seen : 0]);
    if (!n.rows.length) { await ox(cfg, 'DELETE', `/instances/${put.json.ID}`); return refuse(res, 'CLOSED'); }   // cancelled meanwhile
    res.json({ ok: true, received: n.rows[0].files_received, again: !fresh });
  } catch (err) {
    if (cfg && original) await ox(cfg, 'DELETE', `/instances/${original}`);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// What an import made on the image server is taken off it again: the study under our
// number (only if it carries this import's accession) and an image left under the number
// it came with (only if it carries the patient number it came with - when the import
// began the server held no study of that number). 'gone' or 'unreachable'.
async function removeFromServer(cfg, imp) {
  for (const [uid, mine] of [[imp.study_uid, st => (st.MainDicomTags || {}).AccessionNumber === imp.accession_no],
                             [imp.source_study_uid, st => text((st.PatientMainDicomTags || {}).PatientID, 64) === imp.source_patient_id && (st.MainDicomTags || {}).AccessionNumber !== imp.accession_no]]) {
    const f = await ox(cfg, 'POST', '/tools/find', { Level: 'Study', Query: { StudyInstanceUID: uid }, Expand: true });
    if (f.status !== 200 || !Array.isArray(f.json)) return 'unreachable';
    for (const st of f.json) {
      if (!mine(st)) continue;
      const d = await ox(cfg, 'DELETE', `/studies/${st.ID}`, null, 60000);
      if (d.status !== 200 && d.status !== 404) return 'unreachable';
    }
  }
  return 'gone';
}
async function rollBack(imp, why) {
  const cfg = await config();
  const state = cfg.orthanc_password && (await removeFromServer(cfg, imp)) === 'gone' ? 'rolled-back' : 'cleanup-pending';
  await pool.query(`UPDATE pacs_import SET state = $2, error = $3, finished_at = CASE WHEN $2 = 'rolled-back' THEN NOW() ELSE finished_at END WHERE id = $1 AND state IN ('started', 'cleanup-pending')`,
    [imp.id, state, text(why, 300)]);
  return state;
}

// POST /api/pacs/import/:id/cancel
router.post('/:id/cancel', authMiddleware, mayImport, async (req, res) => {
  try {
    const imp = await openImport(req, res);
    if (!imp) return;
    // closed first, so that an image still on its way is refused and removes itself
    await pool.query(`UPDATE pacs_import SET state = 'cleanup-pending' WHERE id = $1 AND state = 'started'`, [imp.id]);
    res.json({ ok: true, state: await rollBack(imp, text((req.body || {}).reason, 200) || 'cancelled') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pacs/import/:id/finish
// Checked against the image server, then one transaction: the order gets its images (a
// worklist line that was never "scheduled" - it cannot reach a device), the import is
// done, the change log has its line. No line, nothing tied.
router.post('/:id/finish', authMiddleware, mayImport, async (req, res) => {
  try {
    const imp = await openImport(req, res);
    if (!imp) return;
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    const p = await patientRow(imp.patient_id);
    const f = await ox(cfg, 'POST', '/tools/find', { Level: 'Study', Query: { StudyInstanceUID: imp.study_uid }, Expand: true });
    if (f.status !== 200 || !Array.isArray(f.json)) return refuse(res, 'UNREACHABLE');
    const st = f.json.length === 1 ? f.json[0] : null;
    const stat = st ? await ox(cfg, 'GET', `/studies/${st.ID}/statistics`) : null;
    const have = stat && stat.json ? Number(stat.json.CountInstances) || 0 : 0;
    if (!st || (st.MainDicomTags || {}).AccessionNumber !== imp.accession_no || text((st.PatientMainDicomTags || {}).PatientID, 64) !== p.chart_no
        || have !== imp.files_received || have !== imp.files_announced) {
      return refuse(res, 'INCOMPLETE', { on_server: have, received: imp.files_received, announced: imp.files_announced });
    }
    // nothing of the number it came with may be left (step 5 of the last image)
    if ((await removeFromServer(cfg, Object.assign({}, imp, { study_uid: '0' }))) !== 'gone') return refuse(res, 'UNREACHABLE');
    // can the image server draw each series? (a compression it cannot decode is kept, and said)
    const undrawn = [];
    for (const sid of (st.Series || []).slice(0, 60)) {
      const se = await ox(cfg, 'GET', `/series/${sid}`);
      const first = se.json && Array.isArray(se.json.Instances) ? se.json.Instances[0] : null;
      if (!first) continue;
      const tg = await ox(cfg, 'GET', `/instances/${first}/simplified-tags`);
      if (!tg.json || !tg.json.Rows) continue;               // not a picture (a report): nothing to draw
      const pic = await ox(cfg, 'GET', `/instances/${first}/frames/0/preview`, null, 30000);
      if (pic.status !== 200) undrawn.push(text((se.json.MainDicomTags || {}).SeriesDescription || (se.json.MainDicomTags || {}).Modality || sid, 80));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const o = (await client.query('SELECT id, patient_id, visit_id, order_name, order_code, status FROM order_item WHERE id = $1 FOR UPDATE', [imp.order_item_id])).rows[0];
      const taken = o ? (await client.query('SELECT 1 FROM worklist_log WHERE order_item_id = $1 LIMIT 1', [o.id])).rows.length : 0;
      if (!o || o.order_code !== ORDER_CODE || o.status === 'cancelled' || taken) { await client.query('ROLLBACK'); return refuse(res, taken ? 'ORDER_HAS_IMAGES' : 'BAD_ORDER'); }
      const modality = text(imp.modality, 10) || 'OT';
      await client.query(
        `INSERT INTO worklist_log (order_item_id, patient_id, modality, accession_no, study_instance_uid, scheduled_date, scheduled_time, status, completed_at,
                                   images_received_at, orthanc_study_id, image_count, image_patient_id, image_patient_name, patient_check)
         VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_TIME,'completed',NOW(),NOW(),$6,$7,$8,$9,'match')`,
        [o.id, o.patient_id, modality, imp.accession_no, imp.study_uid, st.ID, have, p.chart_no, dicomName(p)]);
      await client.query(`UPDATE order_item SET pacs_modality = $2, worklist_status = 'completed', updated_at = NOW() WHERE id = $1`, [o.id, modality]);
      const done = await client.query(
        `UPDATE pacs_import SET state = 'done', finished_at = NOW(), detail = detail || $2::jsonb WHERE id = $1 AND state = 'started' RETURNING id`,
        [imp.id, JSON.stringify({ undrawn })]);
      const from = [imp.institution, imp.study_date].filter(Boolean).join(', ');
      const logged = done.rows.length && await writeAudit(client, req, {
        action: ACTIONS.PACS_IMAGES_IMPORT, patient_id: o.patient_id, visit_id: o.visit_id, entity: 'order_item', entity_id: o.id,
        summary: `${have} image(s), ${(Number(imp.bytes_received) / 1048576).toFixed(1)} MB brought in: ${imp.modality} ${imp.description}`.trim() + (from ? ` (${from})` : '') + ` -> ${o.order_name} (${imp.accession_no})`,
        after: { image_count: have, size_mb: Math.round(Number(imp.bytes_received) / 104857.6) / 10, institution: imp.institution, study_date: imp.study_date, description: imp.description,
                 modality: imp.modality, came_as_patient_id: imp.source_patient_id, came_as_patient_name: imp.source_patient_name,
                 birth_date_differed: !!((imp.detail || {}).confirm || {}).birth_differs, sex_differed: !!((imp.detail || {}).confirm || {}).sex_differs, accession: imp.accession_no },
      });
      if (!logged) { await client.query('ROLLBACK'); return refuse(res, done.rows.length ? 'NOT_LOGGED' : 'CLOSED'); }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    res.json({ ok: true, order_item_id: imp.order_item_id, images: have, undrawn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pacs/import/:id/undo  { reason }
// An import that should not have been made (the wrong patient's disc): the study is taken
// off the image server and off the order, which stays, empty. Not while a reading stands
// on it. The change log says who and why.
router.post('/:id/undo', authMiddleware, mayUndo, async (req, res) => {
  try {
    const id = intOf(req.params.id);
    const imp = id == null ? null : (await pool.query('SELECT * FROM pacs_import WHERE id = $1', [id])).rows[0];
    if (!imp) return refuse(res, 'NOT_FOUND');
    if (imp.state !== 'done') return refuse(res, 'NOT_DONE', { state: imp.state });
    const o = imp.order_item_id ? (await pool.query('SELECT id, patient_id, visit_id, order_name, result_text FROM order_item WHERE id = $1', [imp.order_item_id])).rows[0] : null;
    if (o && String(o.result_text || '').trim()) return refuse(res, 'HAS_READING');
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    if ((await removeFromServer(cfg, imp)) !== 'gone') return refuse(res, 'UNREACHABLE');
    const reason = text((req.body || {}).reason, 300);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (o) {
        await client.query('DELETE FROM worklist_log WHERE order_item_id = $1 AND study_instance_uid = $2', [o.id, imp.study_uid]);
        await client.query(`UPDATE order_item SET pacs_modality = 'OT', updated_at = NOW() WHERE id = $1`, [o.id]);
      }
      await client.query(`UPDATE pacs_import SET state = 'undone', finished_at = NOW(), detail = detail || $2::jsonb WHERE id = $1`,
        [imp.id, JSON.stringify({ undone_by: req.user.name || '', undo_reason: reason })]);
      await writeAudit(client, req, {
        action: ACTIONS.PACS_IMAGES_IMPORT, patient_id: imp.patient_id, visit_id: o ? o.visit_id : null, entity: 'order_item', entity_id: imp.order_item_id,
        summary: `Taken out again: ${imp.files_received} image(s) ${imp.modality} ${imp.description}`.trim() + ` (${imp.accession_no})` + (reason ? ` - ${reason}` : ''),
        after: { undone: true, image_count: imp.files_received, accession: imp.accession_no, reason },
      });
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Imports that stopped: silent for SILENT_MINUTES, or waiting for the image server to
// come back so that what they made can be removed.
async function resumePending() {
  const out = { undone: 0, waiting: 0 };
  try {
    const r = await pool.query(
      `SELECT * FROM pacs_import WHERE state = 'cleanup-pending' OR (state = 'started' AND last_at < NOW() - ($1 || ' minutes')::interval) ORDER BY id`, [String(SILENT_MINUTES)]);
    for (const imp of r.rows) {
      if (imp.state === 'started') await pool.query(`UPDATE pacs_import SET state = 'cleanup-pending' WHERE id = $1 AND state = 'started'`, [imp.id]);
      if ((await rollBack(imp, imp.error || 'interrupted')) === 'rolled-back') out.undone++; else out.waiting++;
    }
  } catch (e) { console.error('[pacs] import clean-up:', e.message); }
  return out;
}
setTimeout(() => { resumePending(); }, 20000).unref();
setInterval(() => { resumePending(); }, 5 * 60000).unref();

// ── what other parts of the PACS module ask ──────────────────────────────
// The orders of a patient that carry outside images: order id -> where they came from.
async function externalByOrder(patientId) {
  const by = new Map();
  try {
    const r = await pool.query(
      `SELECT id, order_item_id, institution, study_date, description, modality, staff_name, to_char(finished_at, 'YYYY-MM-DD') AS imported_at, detail
         FROM pacs_import WHERE patient_id = $1 AND state = 'done' AND order_item_id IS NOT NULL`, [patientId]);
    r.rows.forEach(x => by.set(x.order_item_id, { import_id: x.id, institution: x.institution, study_date: x.study_date, description: x.description, modality: x.modality,
                                                  imported_at: x.imported_at, imported_by: x.staff_name || '', undrawn: (x.detail || {}).undrawn || [] }));
  } catch (e) { /* the table is not there yet (code merged before its migration): no order is marked */ }
  return by;
}
// SQL: this order carries outside images, or is taking them in right now.
const EXTERNAL_ON = col => `EXISTS (SELECT 1 FROM pacs_import pi WHERE pi.order_item_id = ${col} AND pi.state IN ('started', 'cleanup-pending', 'done'))`;
// Is a study number one an import is working on right now? (The bridge must not report it.)
async function importingNow(uid) {
  try { return (await pool.query(`SELECT 1 FROM pacs_import WHERE state IN ('started', 'cleanup-pending') AND (study_uid = $1 OR source_study_uid = $1) LIMIT 1`, [uid])).rows.length > 0; }
  catch (e) { return false; }
}
// Studies an import made on the image server and removed again: the image backup drops them.
async function removedStudies() {
  try { return (await pool.query(`SELECT study_uid FROM pacs_import WHERE state IN ('rolled-back', 'undone')`)).rows.map(r => r.study_uid); }
  catch (e) { return []; }
}

module.exports = { router, WHY, resumePending, externalByOrder, EXTERNAL_ON, importingNow, removedStudies, ORDER_CODE };
