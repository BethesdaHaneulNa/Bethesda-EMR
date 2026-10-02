// Images brought in from another establishment (a CD or a USB stick the patient carries).
//
// Director, 2026-10-02: «들여오기 프로그램에서 차트번호 입력하면 그 환자 것으로 외부 영상이 들어감 →
// 연동이나 판독소견은 안 적더라도 EMR 영상판독에서 26-00001로 조회하면 그 이름으로 들어와 있는 영상이
// 다 뜨게 하면 되는 것 아니냐». So an outside study hangs on the PATIENT, not on an order:
// no order, no consultation, no visit, no worklist line, no charge, no reading box (the
// doctor's opinion goes into the consultation note).
//
// Who brings them in: the program "Bethesda CD" (reception) - the chart number is typed,
// the disc's folder is chosen, the program reads which studies it holds and sends the
// chosen one here, one DICOM file a request. This file is the EMR's side of it, and what
// the EMR's own imaging window asks:
//   GET  /api/pacs/import/patient?chart_no=    who the patient is, the limits, the room left
//   POST /api/pacs/import/check                which of the disc's studies can be brought in
//   POST /api/pacs/import/begin                one study, for one patient
//   PUT  /api/pacs/import/:id/instance         one image
//   POST /api/pacs/import/:id/finish           the study is in the chart - one transaction, with the change-log line
//   POST /api/pacs/import/:id/cancel           before it is finished: everything made is removed
//   GET  /api/pacs/import/list?patient_id=     the patient's outside studies (the imaging window)
//   GET  /api/pacs/import/:id/viewer-url       opens one of them in the viewer (no order needed)
//   POST /api/pacs/import/:id/undo             after it is finished: an import made by mistake is taken out again
//   POST /api/pacs/import/resume               the clean-up of interrupted imports, asked for now
//
// The EMR shows the studies written in table pacs_import - never "whatever the image
// server holds under that patient number": a study a device sent with a mistyped number
// must not appear in a chart by itself.
//
// What is changed in an image: its patient number, name, birth date and sex (ours), its
// study number (a new one, of a branch no order uses) and its accession ('EXT-<n>', never
// the form of an order's). The picture, its compression, the series and image numbers, the
// institution and the dates stay; the number and name it came with are kept in the image
// (OtherPatientIDs, OtherPatientNames) and in table pacs_import.
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
// Who: bringing in and the list - consultation or payment (the same as copying to a disc:
// the program is one). Opening the images - consultation (the viewer's own rule). Taking
// an import out again - consultation or settings.
const express = require('express');
const { Readable } = require('stream');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const viewer = require('./pacs.viewer');

const router = express.Router();
const MAY_IMPORT = ['consultation', 'payment'];   // one place to change who may bring images in
const mayImport = permMiddleware(...MAY_IMPORT);
const mayOpen = permMiddleware('consultation');
const mayUndo = permMiddleware('consultation', 'settings');

const WARN_BYTES = 2 * 1024 * 1024 * 1024;      // a study larger than this is warned about, not refused
const SPARE_BYTES = 5 * 1024 * 1024 * 1024;     // room that must stay free on the image server's disk
const SILENT_MINUTES = 30;                      // an import that has received nothing for this long is undone
const UID = /^[0-9.]{1,64}$/;
// Study numbers given here: a branch of their own (orders use <root>.<day>.<order>.<n>,
// corrections <root>.9.7307.<n>).
const studyUidFor = id => `1.2.826.0.1.3680043.9.7308.${id}.${Date.now()}`;
const accessionFor = id => `EXT-${id}`;

const WHY = {
  BAD_REQUEST: 'The request is not understood',
  NO_PATIENT: 'No such patient',
  NOT_PAIRED: 'The image server is not set up',
  UNREACHABLE: 'The image server does not answer',
  NOT_FOUND: 'No such import',
  NOT_YOURS: 'This import was started by someone else',
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
  NOT_LOGGED: 'The change log could not be written: nothing is put in the chart',
  CLOSED: 'This import is finished already',
  NOT_DONE: 'This import was not finished',
  NO_REASON: 'Say why these images are taken out',
};
// Refusals are 409 unless said otherwise - never 502/503/504, which the web server in
// front replaces with its own text (see pacs.export.js).
const HTTP = { BAD_REQUEST: 400, NO_PATIENT: 404, NOT_FOUND: 404, NOT_YOURS: 403, TOO_BIG_FILE: 413, NOT_LOGGED: 500, NO_REASON: 400 };
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

// ── the patient ──────────────────────────────────────────────────────────
const PATIENT_COLUMNS = `id, chart_no, last_name, first_name, gender, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth`;
async function patientRow(id) {
  if (intOf(id) == null) return null;
  return (await pool.query(`SELECT ${PATIENT_COLUMNS} FROM patient WHERE id = $1`, [id])).rows[0] || null;
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
// What the screens say of one study brought in.
const SHOWN = `i.id, i.study_date, i.modality, i.description, i.institution, i.image_count, i.bytes_received, i.source_patient_id, i.source_patient_name,
               i.source_birth_date, i.source_sex, i.staff_name, i.finished_at, i.detail`;
const shown = x => ({
  id: x.id, study_date: x.study_date, modality: x.modality, description: x.description, institution: x.institution,
  image_count: x.image_count, bytes: Number(x.bytes_received) || 0, imported_at: x.finished_at, imported_by: x.staff_name || '',
  came_as: { patient_id: x.source_patient_id, patient_name: x.source_patient_name, birth_date: x.source_birth_date, sex: x.source_sex },
  birth_differed: !!((x.detail || {}).confirm || {}).birth_differs, sex_differed: !!((x.detail || {}).confirm || {}).sex_differs,
  undrawn: (x.detail || {}).undrawn || [],
});
async function importedOf(patientId) {
  const r = await pool.query(`SELECT ${SHOWN} FROM pacs_import i WHERE i.patient_id = $1 AND i.state = 'done' ORDER BY i.study_date DESC, i.id DESC`, [patientId]);
  return r.rows.map(shown);
}

// GET /api/pacs/import/patient?chart_no=
// What the program shows once the chart number is typed: who the patient is (to be checked
// by eye against the disc), whether the image server answers, the limits, the room left,
// and what was brought in for this patient before.
router.get('/patient', authMiddleware, mayImport, async (req, res) => {
  try {
    const chart = String(req.query.chart_no || '').trim();
    if (!chart || chart.length > 40) return refuse(res, 'BAD_REQUEST');
    const p = (await pool.query(`SELECT ${PATIENT_COLUMNS} FROM patient WHERE upper(btrim(chart_no)) = upper($1) LIMIT 2`, [chart])).rows;
    if (p.length !== 1) return refuse(res, 'NO_PATIENT');
    const cfg = await config();
    let server = '';
    if (!cfg.orthanc_password) server = 'NOT_PAIRED';
    else if ((await ox(cfg, 'GET', '/system', null, 4000)).status !== 200) server = 'UNREACHABLE';
    res.json({ ok: true, patient: p[0], server, free_bytes: await freeBytes(), spare_bytes: SPARE_BYTES, max_file_bytes: maxFileBytes(cfg), warn_bytes: WARN_BYTES,
               imported: await importedOf(p[0].id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Where a study of the disc stands: '' (can be brought in) or the reason it cannot.
async function standing(cfg, patientId, uid) {
  const ours = await pool.query(`SELECT 1 FROM worklist_log WHERE study_instance_uid = $1 OR image_study_uid = $1 LIMIT 1`, [uid]);
  if (ours.rows.length) return { state: 'OURS' };
  const made = await pool.query(`SELECT 1 FROM pacs_import WHERE study_uid = $1 AND state IN ('started', 'cleanup-pending', 'done') LIMIT 1`, [uid]);
  if (made.rows.length) return { state: 'OURS' };                                    // (a disc we made, of a study we had brought in)
  const was = await pool.query(
    `SELECT patient_id, state, to_char(finished_at, 'YYYY-MM-DD') AS day FROM pacs_import
      WHERE source_study_uid = $1 AND state IN ('started', 'cleanup-pending', 'done') ORDER BY id DESC LIMIT 1`, [uid]);
  if (was.rows.length) {
    const w = was.rows[0];
    if (w.state !== 'done') return { state: 'BUSY' };
    return w.patient_id === patientId ? { state: 'HERE', imported_at: w.day } : { state: 'OTHER' };
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
// { patient_id, files, bytes, source: { study_uid, patient_id, patient_name, birth_date, sex, accession,
//   institution, study_date, description, modality }, confirm: { birth_differs, sex_differs } }
// One study, for one patient. The study number and accession it will carry here are fixed now.
router.post('/begin', authMiddleware, mayImport, async (req, res) => {
  try {
    const b = req.body || {}, src = b.source || {};
    const files = intOf(b.files), bytes = Number(b.bytes);
    const uid = String(src.study_uid || '');
    if (!files || files > 100000 || !Number.isFinite(bytes) || bytes < 0 || !UID.test(uid)) return refuse(res, 'BAD_REQUEST');
    const p = await patientRow(b.patient_id);
    if (!p) return refuse(res, 'NO_PATIENT');
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    const st = await standing(cfg, p.id, uid);
    if (st.state) return refuse(res, st.state, st);
    // room: the image passes through the server twice (as it came, then changed) before the first is deleted
    const free = await freeBytes();
    if (free != null && bytes * 2 + SPARE_BYTES > free) return refuse(res, 'NO_ROOM', { free_bytes: free, needed_bytes: bytes * 2 + SPARE_BYTES });
    const id = Number((await pool.query(`SELECT nextval(pg_get_serial_sequence('pacs_import', 'id')) AS id`)).rows[0].id);
    const row = (await pool.query(
      `INSERT INTO pacs_import (id, patient_id, study_uid, accession_no, source_study_uid, source_patient_id, source_patient_name,
                                source_birth_date, source_sex, source_accession, institution, study_date, description, modality, files_announced, detail, staff_id, staff_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, study_uid, accession_no`,
      [id, p.id, studyUidFor(id), accessionFor(id),
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
  req.on('aborted', () => ctl.abort());                     // the program went away: stop asking the image server
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
  await pool.query(`UPDATE pacs_import SET state = $2::text, error = $3, finished_at = CASE WHEN $2::text = 'rolled-back' THEN NOW() ELSE finished_at END WHERE id = $1 AND state IN ('started', 'cleanup-pending')`,
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

const fromOf = imp => [imp.institution, imp.study_date].filter(Boolean).join(', ');
const whatOf = imp => [imp.modality, imp.description].filter(Boolean).join(' ');

// POST /api/pacs/import/:id/finish
// Checked against the image server, then one transaction: the import is done (the imaging
// window lists it from now on) and the change log has its line. No line, nothing in the chart.
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
      const done = await client.query(
        `UPDATE pacs_import SET state = 'done', finished_at = NOW(), image_count = $2, detail = detail || $3::jsonb WHERE id = $1 AND state = 'started' RETURNING id`,
        [imp.id, have, JSON.stringify({ undrawn })]);
      const logged = done.rows.length && await writeAudit(client, req, {
        action: ACTIONS.PACS_IMAGES_IMPORT, patient_id: imp.patient_id, entity: 'pacs_import', entity_id: imp.id,
        summary: `Outside images brought in: ${have} image(s), ${(Number(imp.bytes_received) / 1048576).toFixed(1)} MB - ${whatOf(imp)}`.trim() + (fromOf(imp) ? ` (${fromOf(imp)})` : ''),
        after: { image_count: have, size_mb: Math.round(Number(imp.bytes_received) / 104857.6) / 10, institution: imp.institution, study_date: imp.study_date, description: imp.description,
                 modality: imp.modality, came_as_patient_id: imp.source_patient_id, came_as_patient_name: imp.source_patient_name,
                 birth_date_differed: !!((imp.detail || {}).confirm || {}).birth_differs, sex_differed: !!((imp.detail || {}).confirm || {}).sex_differs, accession: imp.accession_no },
      });
      if (!logged) { await client.query('ROLLBACK'); return refuse(res, done.rows.length ? 'NOT_LOGGED' : 'CLOSED'); }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    res.json({ ok: true, import_id: imp.id, images: have, undrawn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pacs/import/list?patient_id=
// The patient's outside studies, the most recent study first - what the imaging window
// shows under the patient's own exams. Only imports that finished and were not taken out.
router.get('/list', authMiddleware, mayImport, async (req, res) => {
  try {
    const p = await patientRow(req.query.patient_id);
    if (!p) return refuse(res, 'NO_PATIENT');
    res.json({ ok: true, studies: await importedOf(p.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pacs/import/:id/viewer-url
// Opens one outside study in the viewer: the short cookie of pacs.viewer.js, granted for
// this study alone. (An order's GET /api/pacs/viewer-url grants by order; an outside study
// has none.)
router.get('/:id/viewer-url', authMiddleware, mayOpen, async (req, res) => {
  try {
    const id = intOf(req.params.id);
    const imp = id == null ? null : (await pool.query(`SELECT id, state, study_uid FROM pacs_import WHERE id = $1`, [id])).rows[0];
    if (!imp) return refuse(res, 'NOT_FOUND');
    if (imp.state !== 'done') return refuse(res, 'NOT_DONE', { state: imp.state });
    viewer.grantViewerCookie(req, res, [imp.study_uid]);
    res.json({ ok: true, import_id: imp.id, study_instance_uid: imp.study_uid, url: '/api/pacs/viewer/stone-webviewer/index.html?study=' + encodeURIComponent(imp.study_uid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pacs/import/:id/undo  { reason }
// An import that should not have been made (another patient's disc): the study is taken
// off the image server and out of the chart; the line stays in the table as 'undone' and
// the change log says who and why.
router.post('/:id/undo', authMiddleware, mayUndo, async (req, res) => {
  try {
    const id = intOf(req.params.id);
    const imp = id == null ? null : (await pool.query('SELECT * FROM pacs_import WHERE id = $1', [id])).rows[0];
    if (!imp) return refuse(res, 'NOT_FOUND');
    if (imp.state !== 'done') return refuse(res, 'NOT_DONE', { state: imp.state });
    const reason = text((req.body || {}).reason, 300);
    if (!reason) return refuse(res, 'NO_REASON');
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    if ((await removeFromServer(cfg, imp)) !== 'gone') return refuse(res, 'UNREACHABLE');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE pacs_import SET state = 'undone', undone_at = NOW(), undone_by = $2, undone_by_name = $3, undo_reason = $4 WHERE id = $1`,
        [imp.id, req.user.id, req.user.name || null, reason]);
      await writeAudit(client, req, {
        action: ACTIONS.PACS_IMAGES_IMPORT, patient_id: imp.patient_id, entity: 'pacs_import', entity_id: imp.id,
        summary: `Outside images taken out again: ${imp.image_count == null ? imp.files_received : imp.image_count} image(s) - ${whatOf(imp)}`.trim() + (fromOf(imp) ? ` (${fromOf(imp)})` : '') + ` - ${reason}`,
        after: { undone: true, image_count: imp.image_count, accession: imp.accession_no, reason },
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
// POST /api/pacs/import/resume - the same clean-up, asked for now (an administrator who
// does not want to wait for the next round).
router.post('/resume', authMiddleware, mayUndo, async (req, res) => {
  try { res.json(Object.assign({ ok: true }, await resumePending())); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── what other parts of the PACS module ask ──────────────────────────────
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

module.exports = { router, WHY, resumePending, importingNow, removedStudies, MAY_IMPORT };
