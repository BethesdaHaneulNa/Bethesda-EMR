// Images that arrived without an order - "orphan" studies - put under the order they were
// taken for (the clinic's manager, 2026-11-09; what the site did by hand on 11-09 for order
// 219 and asked to have as a screen).
//
// The ultrasound was done without picking the patient from the device's worklist: the
// study reached the image server with the device's own patient number (LOGIQ: a date and
// a serial, "09112026001"), a typed name and birth date - often misspelt - no accession
// number and a study number no order knows. Nothing links it to the EMR, so the exam shows
// no images and the paper cannot be printed.
//
// What this does, through Orthanc's own REST (the Orthanc program is not changed), the way
// pacs.move.js moves images between orders:
//   1  the person CHOOSES, side by side: the study (what the images say - name, birth date,
//      sex, the device's date and time, how many images, a thumbnail) and the order (the
//      EMR's patient, birth date, exam). Nothing is matched automatically: the typed name
//      and birth date are not to be trusted, and neither is the device's clock (08:25 on a
//      study taken after a 09:15 registration) - it is shown, never used to filter.
//   2  Orthanc makes a corrected copy (KeepSource): the EMR's patient number, name, birth
//      date and sex, the order's accession and study number, the order's name as requested
//      procedure. Pictures, series, image numbers, dates stay.
//   3  the copy is checked against the original (same images, same pictures byte for byte -
//      pacs.move.js checkCorrected).
//   4  one EMR transaction: the order's worklist entry is marked arrived (as the bridge's
//      POST /study-arrived would), the change-log line is written -> 'emr-done'.
//   5  the original is deleted on the image server -> 'done'. If that fails the line stays
//      'emr-done' and resumePending() (at start, every five minutes) tries again; the
//      images are already under the order either way.
// Anything that fails before 4 is undone: the copy is removed, the original untouched.
//
// The bridge is not waited for: it reports only entries still scheduled and only once
// Orthanc calls the study stable (about a minute); the EMR writes the arrival itself. A
// study that is still arriving (not stable) is not offered. A study already linked to an
// order (by study number or by accession), one brought in from a disc (pacs_import) or one
// in a correction is not an orphan and is not listed.
//
// Who: doctors and administrators (consultation or settings permission), like a move.
//   GET  /api/pacs/orphans                 the orphan studies of the last 30 days
//   GET  /api/pacs/orphans/:id/preview     a thumbnail (PNG) of the study's first image
//   GET  /api/pacs/orphan-targets?date=    the imaging orders of a day that have no images
//   POST /api/pacs/orphans/attach          { orthanc_study_id, study_uid, order_item_id }
//   GET  /api/pacs/attaches/order/:id      the latest attach line of an order (the screen asks after a cut request)
const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const move = require('./pacs.move');
const { isExam, OPEN_ON } = require('./pacs.exam');

const router = express.Router();
const mayAttach = permMiddleware('consultation', 'settings');
const DAYS_BACK = 30;              // how far back the orphan list looks
const STALE_MINUTES = 30;          // a 'started' line silent for this long is undone by resumePending

const WHY = {
  NOT_FOUND:        'Imaging order not found',
  CANCELLED:        'A cancelled order',
  NO_WORKLIST:      'The order was never sent to the devices',
  TARGET_HAS_IMAGES:'This order already has images',
  BUSY:             'A correction is already in progress for this order or these images',
  UNREACHABLE:      'The image server is not answering',
  NOT_PAIRED:       'The image server is not paired with the EMR',
  NOT_ON_SERVER:    'The image server does not have these images',
  STILL_ARRIVING:   'The images are still arriving - try again in a minute',
  LINKED:           'These images already belong to an order',
  NOT_CORRECTED:    'Could not correct - the images are unchanged',
  BAD_REQUEST:      'The request is not understood',
};
const fail = (code, extra) => Object.assign({ ok: false, code, error: WHY[code] }, extra || {});
const UID = /^[0-9.]{1,64}$/;
const uidOk = u => UID.test(String(u || ''));

// ── what the EMR already knows about: not orphans ────────────────────────────
async function knownStudies() {
  const uids = new Set(), accs = new Set();
  const w = await pool.query(`SELECT study_instance_uid, image_study_uid, accession_no FROM worklist_log`);
  for (const r of w.rows) { if (r.study_instance_uid) uids.add(r.study_instance_uid); if (r.image_study_uid) uids.add(r.image_study_uid); if (r.accession_no) accs.add(r.accession_no); }
  try {
    const i = await pool.query(`SELECT study_uid, source_study_uid FROM pacs_import`);
    for (const r of i.rows) { if (r.study_uid) uids.add(r.study_uid); if (r.source_study_uid) uids.add(r.source_study_uid); }
  } catch (e) { /* an EMR before the import table */ }
  try {
    const a = await pool.query(`SELECT source_study_uid FROM pacs_study_attach WHERE state IN ('started', 'emr-done', 'done')`);
    for (const r of a.rows) if (r.source_study_uid) uids.add(r.source_study_uid);
  } catch (e) { /* before 064 */ }
  return { uids, accs };
}

function ymd(dicomDate) {
  const s = String(dicomDate || '');
  return /^\d{8}$/.test(s) ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : '';
}
function hm(dicomTime) {
  const s = String(dicomTime || '').replace(/[^0-9]/g, '');
  return s.length >= 4 ? s.slice(0, 2) + ':' + s.slice(2, 4) : '';
}
function dicomDate(d) {
  if (!d) return '';
  const s = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.replace(/-/g, '') : '';
}
function dicomSex(g) { return g === 'M' ? 'M' : g === 'F' ? 'F' : ''; }
function dicomName(p) { return [String(p.last_name || '').trim(), String(p.first_name || '').trim()].filter(Boolean).join('^'); }

// ── the orphan studies ───────────────────────────────────────────────────────
async function orphans(cfg) {
  const to = new Date(), from = new Date(Date.now() - DAYS_BACK * 86400000);
  const range = dicomDate(from) + '-' + dicomDate(to);
  const r = await move.ox(cfg, 'POST', '/tools/find', {
    Level: 'Study', Expand: true, Query: { StudyDate: range },
    RequestedTags: ['ModalitiesInStudy', 'NumberOfStudyRelatedInstances'],
  }, { timeout: 30000 });
  if (!r.status) return { error: 'UNREACHABLE' };
  if (r.status === 401 || r.status === 403) return { error: 'NOT_PAIRED' };
  if (r.status !== 200 || !Array.isArray(r.json)) return { error: 'UNREACHABLE' };
  const known = await knownStudies();
  const out = [];
  for (const s of r.json) {
    const main = s.MainDicomTags || {}, pat = s.PatientMainDicomTags || {}, req = s.RequestedTags || {};
    const uid = String(main.StudyInstanceUID || ''), acc = String(main.AccessionNumber || '').trim();
    if (!uidOk(uid) || known.uids.has(uid)) continue;
    if (acc && known.accs.has(acc)) continue;          // the device kept the accession: the bridge / relink will link it
    if (/^EXT-\d+$/.test(acc)) continue;                // brought in from a disc
    let count = Number(req.NumberOfStudyRelatedInstances);
    if (!Number.isFinite(count)) {
      const st = await move.ox(cfg, 'GET', '/studies/' + s.ID + '/statistics');
      count = st.status === 200 && st.json ? Number(st.json.CountInstances) || 0 : 0;
    }
    out.push({
      orthanc_study_id: String(s.ID), study_uid: uid, stable: !!s.IsStable,
      patient_id: String(pat.PatientID || '').trim().slice(0, 64),
      patient_name: String(pat.PatientName || '').replace(/\^/g, ' ').trim().slice(0, 200),
      birth_date: ymd(pat.PatientBirthDate), sex: String(pat.PatientSex || '').trim().slice(0, 1),
      study_date: ymd(main.StudyDate), study_time: hm(main.StudyTime),
      modalities: String(req.ModalitiesInStudy || '').replace(/\\/g, ' '),
      description: String(main.StudyDescription || '').trim().slice(0, 200),
      accession: acc, instances: count,
    });
  }
  out.sort((a, b) => (b.study_date + b.study_time).localeCompare(a.study_date + a.study_time));
  return { studies: out };
}

router.get('/orphans', authMiddleware, mayAttach, async (req, res) => {
  try {
    const cfg = await move.config();
    if (!cfg.orthanc_password) return res.status(424).json(fail('NOT_PAIRED'));
    const o = await orphans(cfg);
    if (o.error) return res.status(424).json(fail(o.error));
    res.json({ studies: o.studies, days: DAYS_BACK });
  } catch (err) { console.error('[pacs attach] orphans:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// A thumbnail of the study's first image, for telling studies apart on the screen.
router.get('/orphans/:id/preview', authMiddleware, mayAttach, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{8,64}$/i.test(req.params.id)) return res.status(400).end();
    const cfg = await move.config();
    const inst = await move.ox(cfg, 'GET', '/studies/' + req.params.id + '/instances');
    if (inst.status !== 200 || !Array.isArray(inst.json) || !inst.json.length) return res.status(404).end();
    const first = inst.json.slice().sort((a, b) => Number((a.MainDicomTags || {}).InstanceNumber || 0) - Number((b.MainDicomTags || {}).InstanceNumber || 0))[0];
    const img = await move.ox(cfg, 'GET', '/instances/' + first.ID + '/preview', null, { raw: true, timeout: 30000 });
    if (img.status !== 200) return res.status(404).end();
    res.set('Content-Type', 'image/png'); res.set('Cache-Control', 'private, max-age=300');
    res.send(img.buf);
  } catch (err) { res.status(500).end(); }
});

// ── the orders the images could go to ────────────────────────────────────────
const TARGET_SQL = `
  SELECT oi.id AS order_item_id, oi.order_name, oi.status, oi.pacs_modality, oi.patient_id, v.visit_date,
         p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender,
         wl.id AS wl_id, wl.accession_no, wl.study_instance_uid, wl.status AS wl_status, wl.modality AS wl_modality,
         wl.images_received_at, wl.scheduled_date
    FROM order_item oi
    JOIN patient p ON p.id = oi.patient_id
    LEFT JOIN visit v ON v.id = oi.visit_id
    LEFT JOIN LATERAL (SELECT w.* FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) wl ON true
   WHERE ${isExam('oi')}`;
const shownTarget = o => ({
  order_item_id: o.order_item_id, order_name: o.order_name, modality: String(o.pacs_modality || o.wl_modality || ''),
  visit_date: o.visit_date, chart_no: o.chart_no, patient_name: [o.last_name, o.first_name].filter(Boolean).join(' '),
  birth_date: o.date_of_birth, sex: o.gender || '', accession: o.accession_no || '',
});
// Why an order cannot take the images - or null.
async function targetBlock(db, o) {
  if (o.status === 'cancelled' || o.wl_status === 'cancelled') return 'CANCELLED';
  if (!o.wl_id || !o.study_instance_uid || !o.accession_no) return 'NO_WORKLIST';
  if (o.images_received_at) return 'TARGET_HAS_IMAGES';
  const busy = await db.query(`SELECT 1 WHERE ${OPEN_ON('$1')} OR EXISTS (SELECT 1 FROM pacs_study_attach a WHERE a.order_item_id = $1 AND a.state IN ('started', 'emr-done'))`, [o.order_item_id]);
  if (busy.rows.length) return 'BUSY';
  return null;
}

router.get('/orphan-targets', authMiddleware, mayAttach, async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? String(req.query.date) : todayLocal();
    const r = await pool.query(TARGET_SQL + ` AND (v.visit_date = $1 OR wl.scheduled_date = $1) ORDER BY p.last_name, p.first_name, oi.id`, [date]);
    const out = [];
    for (const o of r.rows) {
      const why = await targetBlock(pool, o);
      out.push(Object.assign(shownTarget(o), { can: !why, code: why, error: why ? WHY[why] : null }));
    }
    res.json({ date, targets: out });
  } catch (err) { console.error('[pacs attach] targets:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// ── the attach itself ────────────────────────────────────────────────────────
async function setState(id, state, more) {
  const m = more || {};
  await pool.query(
    `UPDATE pacs_study_attach SET state = $2::text, error = COALESCE($3::text, error), new_orthanc_id = COALESCE($4::text, new_orthanc_id),
            image_count = COALESCE($5::int, image_count), updated_at = NOW(), finished_at = CASE WHEN $2::text IN ('done', 'rolled-back', 'failed') THEN NOW() ELSE finished_at END
      WHERE id = $1`,
    [id, state, m.error || null, m.new_orthanc_id || null, m.image_count == null ? null : m.image_count]);
}

async function attach(req, body) {
  const b = body || {};
  if (!uidOk(b.study_uid) || !/^[0-9a-f-]{8,64}$/i.test(String(b.orthanc_study_id || '')) || !/^[0-9]{1,9}$/.test(String(b.order_item_id || ''))) return fail('BAD_REQUEST');
  const cfg = await move.config();
  if (!cfg.orthanc_password) return fail('NOT_PAIRED');
  const t = (await pool.query(TARGET_SQL + ' AND oi.id = $1', [b.order_item_id])).rows[0];
  if (!t) return fail('NOT_FOUND');
  const block = await targetBlock(pool, t);
  if (block) return fail(block);
  const known = await knownStudies();
  if (known.uids.has(b.study_uid)) return fail('LINKED');
  const src = await move.studyUnder(cfg, b.study_uid);
  if (src === undefined) return fail('UNREACHABLE');
  if (!src || src.id !== String(b.orthanc_study_id)) return fail('NOT_ON_SERVER');
  if (!src.stable) return fail('STILL_ARRIVING');
  if (src.accession && known.accs.has(src.accession)) return fail('LINKED');

  // Details of the source study, for the line and the change log.
  const st = await move.ox(cfg, 'GET', '/studies/' + src.id);
  const main = (st.json && st.json.MainDicomTags) || {}, pat = (st.json && st.json.PatientMainDicomTags) || {};
  const source = {
    uid: b.study_uid, orthanc_id: src.id, sops: src.instances.map(i => i.sop), count: src.instances.length,
    patient_id: String(pat.PatientID || '').trim().slice(0, 64), patient_name: String(pat.PatientName || '').replace(/\^/g, ' ').trim().slice(0, 200),
    birth_date: ymd(pat.PatientBirthDate), sex: String(pat.PatientSex || '').slice(0, 1), study_date: ymd(main.StudyDate), study_time: hm(main.StudyTime),
    description: String(main.StudyDescription || '').slice(0, 200),
  };
  const line = (await pool.query(
    `INSERT INTO pacs_study_attach (order_item_id, worklist_id, patient_id, order_name, accession_no, study_instance_uid,
                                    source_study_uid, source_orthanc_id, source_patient_id, source_patient_name, source_birth_date, image_count, detail, staff_id, staff_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [t.order_item_id, t.wl_id, t.patient_id, t.order_name, t.accession_no, t.study_instance_uid,
     source.uid, source.orthanc_id, source.patient_id || null, source.patient_name || null, source.birth_date || null, source.count,
     JSON.stringify({ source }), req.user ? req.user.id : null, req.user ? (req.user.name || req.user.login_id || null) : null])).rows[0];

  // 2-3. the corrected copy, checked
  const replace = {
    PatientID: t.chart_no, PatientName: dicomName(t), AccessionNumber: t.accession_no, StudyInstanceUID: t.study_instance_uid,
    RequestedProcedureDescription: t.order_name,
  };
  const dob = dicomDate(t.date_of_birth); if (dob) replace.PatientBirthDate = dob;
  const sex = dicomSex(t.gender); if (sex) replace.PatientSex = sex;
  const made = await move.makeChecked(cfg, source.uid, source.sops, replace, t.study_instance_uid, t.accession_no, t.chart_no);
  if (!made.id) {
    await setState(line.id, 'rolled-back', { error: made.wait || made.bad });
    return fail(made.wait && /not answering/.test(made.wait) ? 'UNREACHABLE' : 'NOT_CORRECTED', { detail: made.wait || made.bad });
  }

  // 4. the EMR's records, in one transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const w = await client.query('SELECT images_received_at, status FROM worklist_log WHERE id = $1 FOR UPDATE', [t.wl_id]);
    if (!w.rows.length || w.rows[0].images_received_at) {
      await client.query('ROLLBACK');
      await move.ox(cfg, 'DELETE', '/studies/' + made.id, null, { timeout: 60000 });
      await setState(line.id, 'rolled-back', { error: 'the order got images in the meantime' });
      return fail('TARGET_HAS_IMAGES');
    }
    await client.query(
      `UPDATE worklist_log
          SET status = CASE WHEN status = 'cancelled' THEN status ELSE 'completed' END, completed_at = COALESCE(completed_at, NOW()),
              images_received_at = NOW(), orthanc_study_id = $2, image_count = $3,
              image_patient_id = $4, image_patient_name = $5, patient_check = 'match', image_study_uid = NULL
        WHERE id = $1`, [t.wl_id, made.id, source.count, t.chart_no, dicomName(t)]);
    await client.query(`UPDATE order_item SET worklist_status = 'completed', updated_at = NOW() WHERE id = $1 AND worklist_status <> 'cancelled'`, [t.order_item_id]);
    await client.query(`UPDATE pacs_study_attach SET state = 'emr-done', new_orthanc_id = $2, updated_at = NOW() WHERE id = $1`, [line.id, made.id]);
    await writeAudit(client, req, {
      action: ACTIONS.PACS_STUDY_ATTACH, entity: 'order_item', entity_id: t.order_item_id, patient_id: t.patient_id, visit_id: null,
      summary: t.order_name + (t.accession_no ? ' (' + t.accession_no + ')' : ''),
      before: { study_uid: source.uid, image_patient_id: source.patient_id || null, image_patient_name: source.patient_name || null, birth_date: source.birth_date || null, image_count: source.count, accession_no: null },
      after:  { study_uid: t.study_instance_uid, image_patient_id: t.chart_no, image_patient_name: dicomName(t), birth_date: dicomDate(t.date_of_birth) ? ymd(dicomDate(t.date_of_birth)) : null, image_count: source.count, accession_no: t.accession_no },
    });
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    await move.ox(cfg, 'DELETE', '/studies/' + made.id, null, { timeout: 60000 });
    await setState(line.id, 'failed', { error: e.message });
    throw e;
  } finally { client.release(); }

  // 5. the original goes
  const gone = await move.deleteReplaced(cfg, source.uid, made.id, source.count);
  await setState(line.id, gone ? 'emr-done' : 'done', { error: gone || null, image_count: source.count });
  return { ok: true, state: gone ? 'emr-done' : 'done', order_item_id: t.order_item_id, image_count: source.count, id: line.id };
}

router.post('/orphans/attach', authMiddleware, mayAttach, async (req, res) => {
  try {
    const out = await attach(req, req.body);
    if (out.ok) return res.json(out);
    const status = out.code === 'NOT_FOUND' ? 404 : out.code === 'BAD_REQUEST' ? 400 : ['UNREACHABLE', 'NOT_PAIRED'].includes(out.code) ? 424 : 409;
    res.status(status).json(out);
  } catch (err) { console.error('[pacs attach]', err.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/attaches/order/:id', authMiddleware, mayAttach, async (req, res) => {
  try {
    if (!/^[0-9]{1,9}$/.test(req.params.id)) return res.status(400).json(fail('BAD_REQUEST'));
    const r = await pool.query(`SELECT id, state, error, image_count, created_at, finished_at FROM pacs_study_attach WHERE order_item_id = $1 ORDER BY id DESC LIMIT 1`, [req.params.id]);
    res.json(r.rows[0] || null);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── what a failure or a power cut left ───────────────────────────────────────
// 'emr-done': the images are under the order; only the original is still to delete.
// 'started' for more than STALE_MINUTES: the request died before the EMR was written; a
// copy under the order's number that the order does not point at is removed.
let resuming = false;
async function resumePending() {
  if (resuming) return;
  resuming = true;
  try {
    const cfg = await move.config();
    if (!cfg.orthanc_password) return;
    const r = await pool.query(`SELECT a.*, w.images_received_at, w.orthanc_study_id AS wl_orthanc_id FROM pacs_study_attach a LEFT JOIN worklist_log w ON w.id = a.worklist_id
                                 WHERE a.state = 'emr-done' OR (a.state = 'started' AND a.updated_at < NOW() - ($1 || ' minutes')::interval) ORDER BY a.id`, [String(STALE_MINUTES)]);
    for (const a of r.rows) {
      try {
        if (a.state === 'emr-done') {
          const gone = await move.deleteReplaced(cfg, a.source_study_uid, a.new_orthanc_id, a.image_count);
          await setState(a.id, gone ? 'emr-done' : 'done', { error: gone || null });
        } else {
          const copy = await move.studyUnder(cfg, a.study_instance_uid);
          if (copy === undefined) continue;
          if (copy && !a.images_received_at && copy.id !== a.wl_orthanc_id) await move.ox(cfg, 'DELETE', '/studies/' + copy.id, null, { timeout: 60000 });
          await setState(a.id, 'rolled-back', { error: a.error || 'interrupted' });
        }
      } catch (e) { console.error('[pacs attach] resuming line', a.id, e.message); }
    }
  } catch (e) {
    if (!/pacs_study_attach/.test(e.message)) console.error('[pacs attach] resume:', e.message);
  } finally { resuming = false; }
}
setTimeout(() => { resumePending(); }, 25000).unref();
setInterval(() => { resumePending(); }, 5 * 60000).unref();

module.exports = { router, attach, resumePending, orphans };
