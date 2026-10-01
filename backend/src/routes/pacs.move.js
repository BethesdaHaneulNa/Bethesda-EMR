// Images taken under the wrong order of the same patient, put under the right one
// (director, 2026-10-01; design: wiki/reference/study-reassign-design.md).
//
// The technician picked "Carotid US" on the device and scanned the abdomen: the images
// carry the Carotid order's study number, accession and name. The image server's data is
// what goes to another hospital, so it is the image server's data that is corrected -
// through Orthanc's own REST API (POST /studies/{id}/modify, DELETE /studies/{id}); the
// Orthanc program is not changed - and the EMR's records follow.
//
// The rule that keeps the pictures safe: THE ORIGINAL IS DELETED ONLY AFTER THE CORRECTED
// STUDY HAS BEEN CHECKED AND THE EMR POINTS AT IT.
//
//   0  a line in pacs_study_move, state 'started'
//   1  Orthanc makes the corrected study (KeepSource: the original stays)
//   2  the corrected study is checked against the original: same images, same pictures
//   3  one EMR transaction: arrival record, reading and change-log line move to the
//      right order -> 'emr-done'
//   4  the original is deleted on the image server
//   5  the order the images left goes back on the device worklist -> 'done'
//
// Anything that fails before 3 is undone (the corrected study is removed, nothing else
// changed). From 3 on the correction is finished forward: resumePending() - at server
// start and every five minutes - picks up what a failure or a power cut left.
//
// Moving to an order that has no images is the above. When the other order has images
// too the two are exchanged, through a temporary number - see "exchanging" below.

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const { patientCheck } = require('./pacs.relink');
const { isExam, OPEN_ON } = require('./pacs.exam');

const router = express.Router();

// Who (director, 2026-10-01): doctors and administrators - the consultation permission
// or the settings permission. A reason may be typed and need not be ("no need to always
// write why - but the log must always be there"): the change-log line is written in the
// same transaction as the EMR's records, and if it cannot be written nothing is moved.
const mayMove = permMiddleware('consultation', 'settings');

// What the screen is told. `code` is what it translates; `error` is the same in plain
// English for the log and for a screen that does not know the code yet.
const WHY = {
  NOT_FOUND:          'Imaging order not found',
  SAME_ORDER:         'The two orders are the same',
  OTHER_PATIENT:      'The two orders are not the same patient\'s',
  CANCELLED:          'A cancelled order',
  OTHER_TYPE:         'The two orders are not of the same device type',
  NO_IMAGES:          'This order has no images to move',
  IDENTITY:           'The images of this order carry a patient warning; settle whose they are first',
  NO_WORKLIST:        'The other order was never sent to the devices',
  TARGET_HAS_READING: 'The other order already has a reading of its own',
  BUSY:               'A correction is already in progress for one of these orders',
  UNREACHABLE:        'The image server is not answering',
  NOT_PAIRED:         'The image server is not paired with the EMR',
  NOT_ON_SERVER:      'The image server does not have these images',
  STILL_ARRIVING:     'The images are still arriving - try again in a minute',
  TARGET_EXISTS:      'The image server already has a study for the other order',
  NOT_CORRECTED:      'Could not correct - the images are unchanged',
  CHANGED_MEANWHILE:  'One of the orders changed in the meantime - the images are unchanged',
};
const fail = (code, extra) => Object.assign({ ok: false, code, error: WHY[code] }, extra || {});

const MAX_TAGS_READ = 500;   // instances whose tags are read to decide what to rename
const MAX_PIXELS = 40;       // instances whose picture is compared byte for byte
const linkOf = w => w.image_study_uid || w.study_instance_uid;
const blank = s => String(s || '').trim() === '';

// ── Orthanc ──────────────────────────────────────────────────────────────────
async function config() {
  return (await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1')).rows[0] || {};
}
// One call. status 0 = no answer at all. `raw` returns the bytes.
async function ox(cfg, method, path, body, opts) {
  const o = opts || {};
  let url;
  try {
    const base = new URL(String(cfg.orthanc_url || DEFAULT_ORTHANC_URL));
    url = new URL(base.pathname.replace(/\/+$/, '') + path, base.origin);
  } catch (e) { return { status: 0 }; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeout || 10000);
  try {
    const r = await fetch(url, {
      method, signal: ctl.signal,
      headers: { Authorization: 'Basic ' + Buffer.from('admin:' + cfg.orthanc_password).toString('base64'), 'Content-Type': 'application/json' },
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
    });
    if (o.raw) return { status: r.status, buf: Buffer.from(await r.arrayBuffer()) };
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return { status: r.status, json, text };
  } catch (e) {
    return { status: 0 };
  } finally { clearTimeout(timer); }
}
const findStudies = (cfg, query) => ox(cfg, 'POST', '/tools/find', { Level: 'Study', Query: query, Expand: true });

// The images of a study: [{ id, sop, size }] or null.
async function instancesOf(cfg, studyId) {
  const r = await ox(cfg, 'GET', '/studies/' + studyId + '/instances');
  if (r.status !== 200 || !Array.isArray(r.json)) return null;
  return r.json.map(i => ({ id: String(i.ID), sop: String((i.MainDicomTags || {}).SOPInstanceUID || ''), size: Number(i.FileSize) || 0 }));
}

// ── the two orders ───────────────────────────────────────────────────────────
const ORDER_SQL = `
  SELECT oi.id, oi.patient_id, oi.visit_id, oi.order_name, oi.status, oi.pacs_modality,
         oi.result_text, oi.result_by, oi.result_at, ${isExam('oi')} AS exam, v.visit_date,
         wl.id AS wl_id, wl.accession_no, wl.study_instance_uid, wl.image_study_uid, wl.status AS wl_status,
         wl.modality AS wl_modality, wl.images_received_at, wl.image_count, wl.orthanc_study_id,
         wl.image_patient_id, wl.image_patient_name, wl.patient_check, wl.completed_at, p.chart_no
    FROM order_item oi
    JOIN patient p ON p.id = oi.patient_id
    LEFT JOIN visit v ON v.id = oi.visit_id
    LEFT JOIN LATERAL (SELECT w.* FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) wl ON true`;
async function orderRow(db, id) {
  if (!/^[0-9]{1,9}$/.test(String(id))) return null;
  return (await db.query(ORDER_SQL + ' WHERE oi.id = $1', [id])).rows[0] || null;
}
const typeOf = o => String(o.pacs_modality || o.wl_modality || '');

// Why the images of `from` cannot be moved at all - or null.
function sourceBlock(from) {
  if (!from || !from.exam) return 'NOT_FOUND';
  if (from.status === 'cancelled') return 'CANCELLED';
  if (!from.images_received_at || !linkOf(from)) return 'NO_IMAGES';
  if (from.patient_check !== 'match') return 'IDENTITY';
  return null;
}
// Why they cannot go to `to` - or null. What the EMR knows; the image server is asked later.
function targetBlock(from, to) {
  if (!to || !to.exam) return 'NOT_FOUND';
  if (to.id === from.id) return 'SAME_ORDER';
  if (to.patient_id !== from.patient_id) return 'OTHER_PATIENT';
  if (to.status === 'cancelled') return 'CANCELLED';
  // Same device type only: a device sees only the worklist lines of its own type, so
  // orders of different types cannot be mixed up on it (director, 2026-10-01).
  if (!typeOf(from) || typeOf(from) !== typeOf(to)) return 'OTHER_TYPE';
  if (!to.wl_id || !to.study_instance_uid || !to.accession_no) return 'NO_WORKLIST';
  // The other order has images too: the two are exchanged, readings with them. Its
  // images must be the patient's beyond doubt as well.
  if (to.images_received_at) return to.patient_check === 'match' && linkOf(to) ? null : 'IDENTITY';
  // The reading goes with the images (director). A reading already written on an order
  // without images would be overwritten: it has to be dealt with by a person first.
  if (!blank(from.result_text) && !blank(to.result_text)) return 'TARGET_HAS_READING';
  return null;
}
const OPEN_STATES = ['started', 'emr-done', 'cleanup-pending', 'undo-pending'];
// The kind of the unfinished correction this order is part of: 'move', 'swap' or ''.
async function openKindOn(db, orderItemId) {
  const r = await db.query(
    `SELECT kind FROM pacs_study_move WHERE state = ANY($1::text[]) AND (from_order_item_id = $2 OR to_order_item_id = $2) ORDER BY id DESC LIMIT 1`,
    [OPEN_STATES, orderItemId]);
  return r.rows[0] ? r.rows[0].kind : '';
}
async function openMoveOn(db, ids) {
  const r = await db.query(
    `SELECT id FROM pacs_study_move WHERE state = ANY($1::text[]) AND (from_order_item_id = ANY($2::int[]) OR to_order_item_id = ANY($2::int[])) LIMIT 1`,
    [OPEN_STATES, ids]);
  return r.rows.length > 0;
}

// ── what is renamed inside the images ────────────────────────────────────────
// Always the study number and the accession. The names and request identifiers a device
// copied from the worklist are replaced when at least one image carries the wrong
// order's value and no image carries anything else: a device's own wording (its protocol
// name) is what was really done and stays. Orthanc writes a replaced tag into every
// image of the study, so an image that did not have it gets the right value - better
// than leaving the wrong order's number in some of them. Nothing about the patient, the
// series or the pictures is touched.
function replacements(from, to, tags) {
  const R = { StudyInstanceUID: to.study_instance_uid, AccessionNumber: to.accession_no };
  if (!tags || !tags.length) return R;
  const only = (values, wrong) => !!wrong && values.some(v => v === wrong) && values.every(v => v === wrong || v === undefined || v === null || v === '');
  const top = k => tags.map(t => (t || {})[k]);
  if (only(top('StudyDescription'), from.order_name)) R.StudyDescription = to.order_name;
  if (only(top('RequestedProcedureDescription'), from.order_name)) R.RequestedProcedureDescription = to.order_name;
  if (only(top('RequestedProcedureID'), from.accession_no)) R.RequestedProcedureID = to.accession_no;
  // Inside RequestAttributesSequence, by Orthanc's path syntax ([*] = every item): images
  // without the sequence are left without it.
  const items = [];
  for (const t of tags) if (t && Array.isArray(t.RequestAttributesSequence)) for (const it of t.RequestAttributesSequence) items.push(it || {});
  const sub = k => items.map(it => it[k]);
  if (only(sub('ScheduledProcedureStepDescription'), from.order_name)) R['RequestAttributesSequence[*].ScheduledProcedureStepDescription'] = to.order_name;
  if (only(sub('ScheduledProcedureStepID'), from.accession_no)) R['RequestAttributesSequence[*].ScheduledProcedureStepID'] = to.accession_no;
  if (only(sub('RequestedProcedureID'), from.accession_no)) R['RequestAttributesSequence[*].RequestedProcedureID'] = to.accession_no;
  return R;
}

// ── step 2: is the corrected study the original, renamed? ────────────────────
// Same number of images, the same image numbers, each made from the original image of
// that number, about the same size, and - for the first MAX_PIXELS - the same picture
// byte for byte. Returns '' or what is wrong.
async function checkCorrected(cfg, source, newId, want) {
  const st = await ox(cfg, 'GET', '/studies/' + newId);
  if (st.status !== 200 || !st.json) return 'the corrected study cannot be read (' + st.status + ')';
  const main = st.json.MainDicomTags || {}, pat = st.json.PatientMainDicomTags || {};
  if (main.StudyInstanceUID !== want.study_uid) return 'study number is not the one asked for';
  if (main.AccessionNumber !== want.accession) return 'accession is not the one asked for';
  if (String(pat.PatientID || '') !== String(want.patient_id || '')) return 'patient number changed';
  const same = await findStudies(cfg, { StudyInstanceUID: want.study_uid });
  if (same.status !== 200 || !Array.isArray(same.json) || same.json.length !== 1 || same.json[0].ID !== newId) return 'more than one study carries the new number';
  const made = await instancesOf(cfg, newId);
  if (!made) return 'the images of the corrected study cannot be listed';
  if (made.length !== source.length) return 'number of images differs (' + made.length + ' / ' + source.length + ')';
  const bySop = new Map(source.map(i => [i.sop, i]));
  let compared = 0;
  for (const n of made) {
    const o = bySop.get(n.sop);
    if (!o) return 'an image number is not one of the original\'s';
    bySop.delete(n.sop);
    if (Math.abs(n.size - o.size) > Math.max(4096, o.size * 0.02)) return 'an image changed size';
    const meta = await ox(cfg, 'GET', '/instances/' + n.id + '/metadata?expand');
    if (meta.status !== 200 || !meta.json || meta.json.ModifiedFrom !== o.id) return 'an image was not made from the original of the same number';
    if (compared < MAX_PIXELS) {
      compared++;
      const a = await ox(cfg, 'GET', '/instances/' + o.id + '/frames/0/raw', null, { raw: true, timeout: 30000 });
      const b = await ox(cfg, 'GET', '/instances/' + n.id + '/frames/0/raw', null, { raw: true, timeout: 30000 });
      if (!a.status || !b.status) return 'the pictures cannot be read';
      if (a.status !== b.status) return 'a picture cannot be read the same way';
      if (a.status === 200 && crypto.createHash('sha1').update(a.buf).digest('hex') !== crypto.createHash('sha1').update(b.buf).digest('hex')) return 'a picture differs';
    }
  }
  return '';
}

// ── the line in pacs_study_move ──────────────────────────────────────────────
async function setState(id, state, step, more) {
  const m = more || {};
  await pool.query(
    `UPDATE pacs_study_move
        SET state = $2::text, step = $3, error = $4, updated_at = NOW(),
            detail = detail || $5::jsonb,
            superseded = COALESCE($6::jsonb, superseded),
            finished_at = CASE WHEN $2::text IN ('done', 'rolled-back', 'failed') THEN NOW() ELSE finished_at END
      WHERE id = $1`,
    [id, state, step, m.error ? String(m.error).slice(0, 500) : null, JSON.stringify(m.detail || {}), m.superseded ? JSON.stringify(m.superseded) : null]);
}
const say = (...a) => console.log('[pacs move]', ...a);

// ── step 3: the EMR's records, in one transaction ────────────────────────────
// The right order gets the arrival record - the time the images really arrived is kept -
// and the reading; the order the images left keeps nothing of them, and stays
// 'completed' (off the device worklist) until the original is gone from the image
// server, so the bridge cannot attach it again.
async function recordInEmr(req, move, made) {
  const d = move.detail;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Both worklist lines, locked, lowest id first.
    await client.query('SELECT id FROM worklist_log WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[d.from_wl_id, d.to_wl_id]]);
    const from = await orderRow(client, move.from_order_item_id), to = await orderRow(client, move.to_order_item_id);
    if (!from || !to || from.wl_id !== d.from_wl_id || to.wl_id !== d.to_wl_id
        || from.status === 'cancelled' || to.status === 'cancelled'
        || !from.images_received_at || linkOf(from) !== d.old_study_uid || to.images_received_at
        || (!blank(from.result_text) && !blank(to.result_text))) {
      await client.query('ROLLBACK');
      return 'CHANGED_MEANWHILE';
    }
    const check = patientCheck(made.patient_id, to.chart_no);
    await client.query(
      `UPDATE worklist_log
          SET status = CASE WHEN status = 'cancelled' THEN status ELSE 'completed' END,
              completed_at = COALESCE($2, NOW()), images_received_at = $3, orthanc_study_id = $4, image_count = $5,
              image_patient_id = $6, image_patient_name = $7, patient_check = $8, image_study_uid = NULL
        WHERE id = $1`,
      [to.wl_id, from.completed_at, from.images_received_at, made.id, made.count, made.patient_id || null, made.patient_name || null, check]);
    await client.query(`UPDATE order_item SET worklist_status = 'completed', updated_at = NOW() WHERE id = $1 AND worklist_status <> 'cancelled'`, [to.id]);
    await client.query(
      `UPDATE worklist_log
          SET images_received_at = NULL, orthanc_study_id = NULL, image_count = NULL, image_patient_id = NULL,
              image_patient_name = NULL, patient_check = NULL, image_study_uid = NULL
        WHERE id = $1`, [from.wl_id]);
    const reading = !blank(from.result_text);
    if (reading) {
      await client.query('UPDATE order_item SET result_text = $2, result_by = $3, result_at = $4, updated_at = NOW() WHERE id = $1',
        [to.id, from.result_text, from.result_by, from.result_at]);
      await client.query('UPDATE order_item SET result_text = NULL, result_by = NULL, result_at = NULL, updated_at = NOW() WHERE id = $1', [from.id]);
    }
    // The log line is part of the correction: no line, no correction (writeAudit never
    // throws - it answers whether the line was written).
    const logged = await writeAudit(client, req, {
      action: ACTIONS.PACS_STUDY_MOVE, patient_id: to.patient_id, visit_id: to.visit_id,
      entity: 'order_item', entity_id: to.id,
      summary: `${made.count} image(s): ${from.order_name} (${from.accession_no}) -> ${to.order_name} (${to.accession_no})`,
      before: { order_name: from.order_name, accession_no: from.accession_no },
      after: Object.assign({ order_name: to.order_name, accession_no: to.accession_no, kind: 'move', image_count: made.count, reading_moved: reading },
                           blank(move.reason) ? {} : { reason: move.reason }),
    });
    if (!logged) throw new Error('the change-log line could not be written');
    await client.query(
      `UPDATE pacs_study_move SET state = 'emr-done', step = 3, reading_moved = $2, error = NULL, updated_at = NOW() WHERE id = $1`, [move.id, reading]);
    await client.query('COMMIT');
    return '';
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[pacs move] EMR records:', e.message);
    return 'NOT_CORRECTED';
  } finally {
    client.release();
  }
}

// ── undo (before step 3): remove the corrected study, if this correction made it ──
async function undo(move, why) {
  const d = move.detail, cfg = await config();
  const found = await findStudies(cfg, { StudyInstanceUID: d.new_study_uid });
  if (found.status !== 200 || !Array.isArray(found.json)) {
    await setState(move.id, 'undo-pending', move.step, { error: why || 'image server not answering' });
    return 'undo-pending';
  }
  const pending = async () => { await setState(move.id, 'undo-pending', move.step, { error: why || 'image server not answering' }); return 'undo-pending'; };
  for (const s of found.json) {
    // Only what was made from the original's images, and only while the original is whole.
    const alive = await ox(cfg, 'GET', '/system');
    if (alive.status !== 200) return pending();
    const made = await instancesOf(cfg, s.ID), orig = d.old_orthanc_id ? await instancesOf(cfg, d.old_orthanc_id) : null;
    const ours = [];
    if (made) for (const n of made) {
      const meta = await ox(cfg, 'GET', '/instances/' + n.id + '/metadata?expand');
      if (!meta.status) return pending();
      ours.push(meta.status === 200 && meta.json && (d.source_instances || []).includes(meta.json.ModifiedFrom));
    }
    if (!made || !orig || orig.length !== d.image_count || ours.some(x => !x)) {
      await setState(move.id, 'failed', move.step, { error: 'a study with the new number is there and is not removed: ' + (why || '') });
      say('line', move.id, 'needs a person: a study carries the new number and could not be recognised as this correction\'s');
      return 'failed';
    }
    const del = await ox(cfg, 'DELETE', '/studies/' + s.ID, null, { timeout: 60000 });
    if (del.status !== 200 && del.status !== 404) {
      await setState(move.id, 'undo-pending', move.step, { error: why || 'the corrected study could not be removed' });
      return 'undo-pending';
    }
  }
  await setState(move.id, 'rolled-back', move.step, { error: why || null });
  say('line', move.id, 'undone - the images are as they were', why ? '(' + why + ')' : '');
  return 'rolled-back';
}

// ── steps 4 and 5 (after the EMR is right): forward only ─────────────────────
async function finish(move) {
  const d = move.detail, cfg = await config();
  if (move.step < 4) {
    // The corrected study must still be whole before the original goes.
    const made = d.new_orthanc_id ? await instancesOf(cfg, d.new_orthanc_id) : null;
    if (!made || made.length !== d.image_count) {
      await setState(move.id, 'cleanup-pending', 3, { error: made ? 'the corrected study is not whole; the original is kept' : 'image server not answering' });
      return 'cleanup-pending';
    }
    const orig = await findStudies(cfg, { StudyInstanceUID: d.old_study_uid });
    if (orig.status !== 200 || !Array.isArray(orig.json)) {
      await setState(move.id, 'cleanup-pending', 3, { error: 'image server not answering' });
      return 'cleanup-pending';
    }
    for (const s of orig.json) {
      const del = await ox(cfg, 'DELETE', '/studies/' + s.ID, null, { timeout: 60000 });
      const gone = del.status === 200 || del.status === 404 ? await ox(cfg, 'GET', '/studies/' + s.ID) : { status: 0 };
      if (gone.status !== 404) {
        await setState(move.id, 'cleanup-pending', 3, { error: 'the original study could not be deleted (' + del.status + ')' });
        return 'cleanup-pending';
      }
    }
    await setState(move.id, 'cleanup-pending', 4, { superseded: [{ study_uid: d.old_study_uid, instances: d.source_sops || [], replaced_by: d.new_study_uid }] });
  }
  // 5. The exam of the order the images left has not been done: back on the device list
  //    (the feed lists today's 'scheduled' lines).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const w = await client.query(
      `UPDATE worklist_log SET status = 'scheduled', completed_at = NULL, scheduled_date = $2
        WHERE id = $1 AND status = 'completed' AND images_received_at IS NULL
          AND EXISTS (SELECT 1 FROM order_item oi WHERE oi.id = worklist_log.order_item_id AND oi.status IS DISTINCT FROM 'cancelled')
        RETURNING order_item_id`, [d.from_wl_id, todayLocal()]);
    if (w.rows.length) await client.query(`UPDATE order_item SET worklist_status = 'sent', updated_at = NOW() WHERE id = $1 AND worklist_status <> 'cancelled'`, [w.rows[0].order_item_id]);
    await client.query(`UPDATE pacs_study_move SET state = 'done', step = 5, error = NULL, updated_at = NOW(), finished_at = NOW() WHERE id = $1`, [move.id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    await setState(move.id, 'cleanup-pending', 4, { error: 'the first order could not be put back on the worklist: ' + e.message });
    return 'cleanup-pending';
  } finally { client.release(); }
  say('line', move.id, 'done -', d.image_count, 'image(s)', move.from_accession, '->', move.to_accession);
  return 'done';
}

// ── the whole of it, for one request ─────────────────────────────────────────
const working = new Set();     // move ids being worked on in this process

async function moveImages(req, fromId, toId, reasonTyped) {
  const reason = String(reasonTyped || '').trim().slice(0, 500);     // optional
  const cfg = await config();
  if (!cfg.orthanc_password) return fail('NOT_PAIRED');

  // What the EMR knows.
  let from = await orderRow(pool, fromId), to = await orderRow(pool, toId);
  let why = sourceBlock(from) || targetBlock(from, to) || ((await openMoveOn(pool, [from.id, to.id])) ? 'BUSY' : null);
  if (why) return fail(why);
  if (to.images_received_at) return swapImages(req, cfg, from, to, reason);

  // What the image server has. Nothing has been touched yet.
  const src = await findStudies(cfg, { StudyInstanceUID: linkOf(from) });
  if (src.status !== 200 || !Array.isArray(src.json)) return fail('UNREACHABLE');
  if (src.json.length !== 1) return fail('NOT_ON_SERVER');
  if (!src.json[0].IsStable) return fail('STILL_ARRIVING');
  for (const q of [{ StudyInstanceUID: to.study_instance_uid }, { AccessionNumber: to.accession_no }]) {
    const there = await findStudies(cfg, q);
    if (there.status !== 200 || !Array.isArray(there.json)) return fail('UNREACHABLE');
    if (there.json.length) return fail('TARGET_EXISTS');
  }
  const study = src.json[0], srcId = String(study.ID);
  const source = await instancesOf(cfg, srcId);
  if (!source || !source.length) return fail('UNREACHABLE');
  const tags = [];
  if (source.length <= MAX_TAGS_READ) {
    for (const i of source) {
      const t = await ox(cfg, 'GET', '/instances/' + i.id + '/tags?simplify');
      if (t.status !== 200 || !t.json) return fail('UNREACHABLE');
      tags.push(t.json);
    }
  }
  const replace = replacements(from, to, tags);

  // 0. The line. Taken under a lock on both worklist lines, so that two people (or two
  //    clicks) cannot start on the same order.
  let move;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM worklist_log WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[from.wl_id, to.wl_id]]);
    from = await orderRow(client, fromId); to = await orderRow(client, toId);
    why = sourceBlock(from) || targetBlock(from, to) || (linkOf(from) !== study.MainDicomTags.StudyInstanceUID ? 'CHANGED_MEANWHILE' : null)
      || ((await openMoveOn(client, [from.id, to.id])) ? 'BUSY' : null);
    if (why) { await client.query('ROLLBACK'); return fail(why); }
    const detail = {
      from_wl_id: from.wl_id, to_wl_id: to.wl_id,
      old_study_uid: linkOf(from), new_study_uid: to.study_instance_uid, old_orthanc_id: srcId,
      image_count: source.length, source_instances: source.map(i => i.id), source_sops: source.map(i => i.sop),
      replaced: Object.keys(replace), tags_read: tags.length,
    };
    move = (await client.query(
      `INSERT INTO pacs_study_move (kind, state, step, patient_id, from_order_item_id, to_order_item_id, from_order_name, to_order_name,
                                    from_accession, to_accession, image_count, reason, detail, staff_id, staff_name)
       VALUES ('move', 'started', 0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [from.patient_id, from.id, to.id, from.order_name, to.order_name, from.accession_no, to.accession_no, source.length,
       reason, JSON.stringify(detail), req.user.id || null, req.user.name || req.user.login_id || null])).rows[0];
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[pacs move] starting:', e.message);
    return fail('NOT_CORRECTED');
  } finally { client.release(); }

  working.add(move.id);
  try {
    // 1. The corrected study. The series and image numbers stay (Keep): they are the same
    //    images - only which study they belong to is put right. The original stays.
    const mod = await ox(cfg, 'POST', '/studies/' + srcId + '/modify',
      { Replace: replace, Keep: ['SeriesInstanceUID', 'SOPInstanceUID'], Force: true, KeepSource: true, Synchronous: true },
      { timeout: 10 * 60000 });
    if (mod.status !== 200 || !mod.json || !mod.json.ID) {
      const state = await undo(move, 'the image server did not make the corrected study (' + mod.status + ')');
      return fail(mod.status ? 'NOT_CORRECTED' : 'UNREACHABLE', { move_id: move.id, state });
    }
    const newId = String(mod.json.ID);
    await setState(move.id, 'started', 1, { detail: { new_orthanc_id: newId } });
    move.step = 1; move.detail.new_orthanc_id = newId;

    // 2. Checked before anything else changes.
    const pat = study.PatientMainDicomTags || {};
    const wrong = await checkCorrected(cfg, source, newId, { study_uid: to.study_instance_uid, accession: to.accession_no, patient_id: pat.PatientID || '' });
    if (wrong) {
      const state = await undo(move, 'the corrected study did not check out: ' + wrong);
      return fail('NOT_CORRECTED', { move_id: move.id, state });
    }
    await setState(move.id, 'started', 2);
    move.step = 2;

    // 3. The EMR's records.
    const emr = await recordInEmr(req, move, { id: newId, count: source.length, patient_id: String(pat.PatientID || '').trim().slice(0, 64), patient_name: String(pat.PatientName || '').trim().slice(0, 200) });
    if (emr) {
      const state = await undo(move, 'the EMR records could not be written');
      return fail(emr, { move_id: move.id, state });
    }
    move.step = 3; move.state = 'emr-done';

    // 4-5. The original goes; the first order returns to the device list. If this cannot
    //      be done now the correction itself stands - resumePending() finishes it.
    const state = await finish(move);
    return { ok: true, move_id: move.id, state, kind: 'move', image_count: source.length, reading_moved: !blank(from.result_text),
             from: { order_item_id: from.id, order_name: from.order_name }, to: { order_item_id: to.id, order_name: to.order_name } };
  } catch (e) {
    // A fault of ours half way: nothing is decided here - the line says where it stopped
    // and resumePending() undoes or finishes it.
    console.error('[pacs move] line', move.id, e.message);
    return fail('NOT_CORRECTED', { move_id: move.id, state: 'unknown' });
  } finally { working.delete(move.id); }
}

// ── exchanging the images of two orders ──────────────────────────────────────
// Both orders have images, each the other's (the technician did the two exams with the
// lines the wrong way round). A study cannot simply take the other's number - Orthanc
// would pour the images into the study that is already there - so the first one goes
// through a temporary number:
//
//   1  A (under order 1) -> temporary T, checked      2  A deleted
//   3  B (under order 2) -> order 1's number, checked 4  B deleted
//   5  T -> order 2's number, checked                 6  T deleted
//   7  one EMR transaction: the two arrival records and the two readings change places
//
// Every deletion comes after the copy it is replaced by has been checked, so each
// picture is at every moment in at least one checked study. Until A is deleted (2) a
// failure is undone; after that the exchange is finished forward - the two orders stay
// closed to the image window, the bridge and comparisons until it is.
const tmpUid = id => '1.2.826.0.1.3680043.9.7307.' + id + '.' + Date.now();

// The study under `uid`: { id, instances, patient_id, patient_name, stable } - null when
// it is not there exactly once, undefined when the image server cannot be asked.
async function studyUnder(cfg, uid) {
  const r = await findStudies(cfg, { StudyInstanceUID: uid });
  if (r.status !== 200 || !Array.isArray(r.json)) return undefined;
  if (r.json.length !== 1) return null;
  const instances = await instancesOf(cfg, r.json[0].ID);
  if (!instances) return undefined;
  const pat = r.json[0].PatientMainDicomTags || {};
  return { id: String(r.json[0].ID), instances, stable: !!r.json[0].IsStable, accession: (r.json[0].MainDicomTags || {}).AccessionNumber || '',
           patient_id: String(pat.PatientID || '').trim().slice(0, 64), patient_name: String(pat.PatientName || '').trim().slice(0, 200) };
}
const sameSops = (instances, sops) => instances.length === sops.length && instances.every(i => sops.includes(i.sop));

// Make the study `wantUid` out of the study `srcUid` and check it. Safe to call again
// after an interruption: a copy that is already there is checked, an unfinished one is
// removed and made again. Returns { id } | { wait: why } (try again later) | { bad: why }.
async function makeChecked(cfg, srcUid, sops, replace, wantUid, wantAcc, patientId) {
  const dest = await studyUnder(cfg, wantUid);
  if (dest === undefined) return { wait: 'image server not answering' };
  const src = await studyUnder(cfg, srcUid);
  if (src === undefined) return { wait: 'image server not answering' };
  const want = { study_uid: wantUid, accession: wantAcc, patient_id: patientId };
  if (dest) {
    if (src) {
      const wrong = await checkCorrected(cfg, src.instances, dest.id, want);
      if (!wrong) return { id: dest.id };
      // An unfinished copy of ours: its source is whole, so it goes and is made again.
      if (!sameSops(src.instances, sops)) return { bad: 'the source study is not the one this exchange started with' };
      const del = await ox(cfg, 'DELETE', '/studies/' + dest.id, null, { timeout: 60000 });
      if (del.status !== 200 && del.status !== 404) return { wait: 'an unfinished copy could not be removed (' + del.status + ')' };
    } else {
      // The source is gone: it was deleted after this copy had been checked.
      return sameSops(dest.instances, sops) && dest.accession === wantAcc ? { id: dest.id } : { bad: 'the source is gone and the copy is not whole' };
    }
  }
  if (!src) return { bad: 'the source study is not on the image server' };
  if (!sameSops(src.instances, sops)) return { bad: 'the source study is not the one this exchange started with' };
  const mod = await ox(cfg, 'POST', '/studies/' + src.id + '/modify',
    { Replace: replace, Keep: ['SeriesInstanceUID', 'SOPInstanceUID'], Force: true, KeepSource: true, Synchronous: true }, { timeout: 10 * 60000 });
  if (!mod.status) return { wait: 'image server not answering' };
  if (mod.status !== 200 || !mod.json || !mod.json.ID) return { wait: 'the image server did not make the copy (' + mod.status + ')' };
  const wrong = await checkCorrected(cfg, src.instances, String(mod.json.ID), want);
  if (wrong) {
    await ox(cfg, 'DELETE', '/studies/' + mod.json.ID, null, { timeout: 60000 });
    return { wait: 'the copy did not check out: ' + wrong };
  }
  return { id: String(mod.json.ID) };
}

// Delete the study under `uid` - only while the copy `keepId` holds `count` images.
// Returns '' or why not (try again later).
async function deleteReplaced(cfg, uid, keepId, count) {
  const kept = await instancesOf(cfg, keepId);
  if (!kept || kept.length !== count) return kept ? 'the copy is not whole; nothing is deleted' : 'image server not answering';
  const old = await findStudies(cfg, { StudyInstanceUID: uid });
  if (old.status !== 200 || !Array.isArray(old.json)) return 'image server not answering';
  for (const s of old.json) {
    if (String(s.ID) === keepId) continue;
    const del = await ox(cfg, 'DELETE', '/studies/' + s.ID, null, { timeout: 60000 });
    const gone = del.status === 200 || del.status === 404 ? await ox(cfg, 'GET', '/studies/' + s.ID) : { status: 0 };
    if (gone.status !== 404) return 'a replaced study could not be deleted (' + del.status + ')';
  }
  return '';
}

// 7. The EMR's records: the two orders exchange arrival record and reading.
async function recordSwapInEmr(req, move) {
  const d = move.detail;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM worklist_log WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[d.from_wl_id, d.to_wl_id]]);
    const o1 = await orderRow(client, move.from_order_item_id), o2 = await orderRow(client, move.to_order_item_id);
    if (!o1 || !o2 || o1.wl_id !== d.from_wl_id || o2.wl_id !== d.to_wl_id) { await client.query('ROLLBACK'); return 'the orders are not what they were'; }
    const put = (row, study, id, other) => client.query(
      `UPDATE worklist_log
          SET completed_at = $2, images_received_at = $3, orthanc_study_id = $4, image_count = $5,
              image_patient_id = $6, image_patient_name = $7, patient_check = $8, image_study_uid = NULL
        WHERE id = $1`,
      [row.wl_id, other.completed_at, other.images_received_at, id, study.count, study.patient_id || null, study.patient_name || null, patientCheck(study.patient_id, row.chart_no)]);
    await put(o1, d.b, d.b1_id, o2);     // order 1 now has what was under order 2
    await put(o2, d.a, d.a2_id, o1);
    const readings = !blank(o1.result_text) || !blank(o2.result_text);
    if (readings) {
      const say1 = [o2.result_text, o2.result_by, o2.result_at], say2 = [o1.result_text, o1.result_by, o1.result_at];
      await client.query('UPDATE order_item SET result_text = $2, result_by = $3, result_at = $4, updated_at = NOW() WHERE id = $1', [o1.id].concat(say1));
      await client.query('UPDATE order_item SET result_text = $2, result_by = $3, result_at = $4, updated_at = NOW() WHERE id = $1', [o2.id].concat(say2));
    }
    // No log line, no exchange of the records (it is tried again later).
    const logged = await writeAudit(client, req || { user: { id: move.staff_id, name: move.staff_name } }, {
      action: ACTIONS.PACS_STUDY_MOVE, patient_id: move.patient_id, visit_id: o2.visit_id,
      entity: 'order_item', entity_id: o2.id,
      summary: `${d.a.count} image(s) <-> ${d.b.count} image(s): ${o1.order_name} (${o1.accession_no}) <-> ${o2.order_name} (${o2.accession_no})`,
      before: { order_name: o1.order_name, accession_no: o1.accession_no, image_count: d.a.count },
      after: Object.assign({ order_name: o2.order_name, accession_no: o2.accession_no, kind: 'swap', image_count: d.b.count, readings_exchanged: readings },
                           blank(move.reason) ? {} : { reason: move.reason }),
    });
    if (!logged) throw new Error('the change-log line could not be written');
    const superseded = [{ study_uid: d.a.uid, instances: d.a.sops, replaced_by: d.o2.uid }, { study_uid: d.b.uid, instances: d.b.sops, replaced_by: d.o1.uid },
                        { study_uid: d.tmp_uid, instances: d.a.sops, replaced_by: d.o2.uid }];
    await client.query(
      `UPDATE pacs_study_move SET state = 'done', step = 7, reading_moved = $2, superseded = $3::jsonb, error = NULL, updated_at = NOW(), finished_at = NOW() WHERE id = $1`,
      [move.id, readings, JSON.stringify(superseded)]);
    await client.query('COMMIT');
    return '';
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[pacs move] EMR records (exchange):', e.message);
    return 'the EMR records could not be written';
  } finally { client.release(); }
}

// From where the line says it stopped, to the end. Returns the line's state.
async function advanceSwap(req, move) {
  const d = move.detail, cfg = await config();
  const o1 = d.o1, o2 = d.o2;
  const stop = async (why, bad) => {
    // Before A is deleted nothing is lost by going back; after, only forward.
    if (move.step < 2) return undo(move, why);
    const state = bad ? 'failed' : 'cleanup-pending';
    await setState(move.id, state, move.step, { error: why });
    if (bad) say('line', move.id, 'needs a person:', why);
    return state;
  };
  const made = async (step, key, r) => {
    if (r.wait || r.bad) return stop(r.wait || r.bad, !!r.bad);
    d[key] = r.id; move.step = step;
    await setState(move.id, 'started', step, { detail: { [key]: r.id } });
    return '';
  };
  const gone = async (step, why) => {
    if (why) return stop(why, false);
    move.step = step;
    await setState(move.id, 'started', step);
    return '';
  };
  let out;
  if (move.step < 1 && (out = await made(1, 't_id', await makeChecked(cfg, d.a.uid, d.a.sops, { StudyInstanceUID: d.tmp_uid, AccessionNumber: d.tmp_accession }, d.tmp_uid, d.tmp_accession, d.a.patient_id)))) return out;
  if (move.step < 2 && (out = await gone(2, await deleteReplaced(cfg, d.a.uid, d.t_id, d.a.count)))) return out;
  if (move.step < 3 && (out = await made(3, 'b1_id', await makeChecked(cfg, d.b.uid, d.b.sops, d.replace_b, o1.uid, o1.accession, d.b.patient_id)))) return out;
  if (move.step < 4 && (out = await gone(4, await deleteReplaced(cfg, d.b.uid, d.b1_id, d.b.count)))) return out;
  if (move.step < 5 && (out = await made(5, 'a2_id', await makeChecked(cfg, d.tmp_uid, d.a.sops, d.replace_a, o2.uid, o2.accession, d.a.patient_id)))) return out;
  if (move.step < 6 && (out = await gone(6, await deleteReplaced(cfg, d.tmp_uid, d.a2_id, d.a.count)))) return out;
  const emr = await recordSwapInEmr(req, move);
  if (emr) return stop(emr, false);
  say('line', move.id, 'done - exchanged', d.a.count, 'and', d.b.count, 'image(s)', move.from_accession, '<->', move.to_accession);
  return 'done';
}

async function swapImages(req, cfg, from, to, reason) {
  // What the image server has. Nothing has been touched yet.
  const A = await studyUnder(cfg, linkOf(from)), B = await studyUnder(cfg, linkOf(to));
  if (A === undefined || B === undefined) return fail('UNREACHABLE');
  if (!A || !B || !A.instances.length || !B.instances.length) return fail('NOT_ON_SERVER');
  if (!A.stable || !B.stable) return fail('STILL_ARRIVING');
  const read = async study => {
    const tags = [];
    if (study.instances.length <= MAX_TAGS_READ) for (const i of study.instances) {
      const t = await ox(cfg, 'GET', '/instances/' + i.id + '/tags?simplify');
      if (t.status !== 200 || !t.json) return null;
      tags.push(t.json);
    }
    return tags;
  };
  const tagsA = await read(A), tagsB = await read(B);
  if (!tagsA || !tagsB) return fail('UNREACHABLE');

  let move;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM worklist_log WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[from.wl_id, to.wl_id]]);
    const f = await orderRow(client, from.id), t = await orderRow(client, to.id);
    const why = sourceBlock(f) || targetBlock(f, t) || (linkOf(f) !== linkOf(from) || linkOf(t) !== linkOf(to) || !t.images_received_at ? 'CHANGED_MEANWHILE' : null)
      || ((await openMoveOn(client, [f.id, t.id])) ? 'BUSY' : null);
    if (why) { await client.query('ROLLBACK'); return fail(why); }
    const pack = (study, uid) => ({ uid, orthanc_id: study.id, count: study.instances.length, ids: study.instances.map(i => i.id), sops: study.instances.map(i => i.sop),
                                    patient_id: study.patient_id, patient_name: study.patient_name });
    const ins = await client.query(
      `INSERT INTO pacs_study_move (kind, state, step, patient_id, from_order_item_id, to_order_item_id, from_order_name, to_order_name,
                                    from_accession, to_accession, image_count, reason, detail, staff_id, staff_name)
       VALUES ('swap', 'started', 0, $1, $2, $3, $4, $5, $6, $7, $8, $9, '{}', $10, $11) RETURNING *`,
      [f.patient_id, f.id, t.id, f.order_name, t.order_name, f.accession_no, t.accession_no, A.instances.length,
       reason, req.user.id || null, req.user.name || req.user.login_id || null]);
    move = ins.rows[0];
    const a = pack(A, linkOf(f)), b = pack(B, linkOf(t)), tmp = tmpUid(move.id);
    move.detail = {
      from_wl_id: f.wl_id, to_wl_id: t.wl_id, a, b,
      o1: { uid: f.study_instance_uid, accession: f.accession_no }, o2: { uid: t.study_instance_uid, accession: t.accession_no },
      tmp_uid: tmp, tmp_accession: 'TMP-' + move.id,
      // A's images take order 2's names, B's take order 1's.
      replace_a: replacements(f, t, tagsA), replace_b: replacements(t, f, tagsB),
      // what undo() looks at, should it stop before A is deleted
      new_study_uid: tmp, old_orthanc_id: a.orthanc_id, image_count: a.count, source_instances: a.ids,
    };
    await client.query('UPDATE pacs_study_move SET detail = $2::jsonb WHERE id = $1', [move.id, JSON.stringify(move.detail)]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[pacs move] starting an exchange:', e.message);
    return fail('NOT_CORRECTED');
  } finally { client.release(); }

  working.add(move.id);
  try {
    const state = await advanceSwap(req, move);
    if (state === 'done' || state === 'cleanup-pending') {
      return { ok: true, move_id: move.id, state, kind: 'swap', image_count: move.detail.a.count, other_image_count: move.detail.b.count,
               reading_moved: !blank(from.result_text) || !blank(to.result_text),
               from: { order_item_id: from.id, order_name: from.order_name }, to: { order_item_id: to.id, order_name: to.order_name } };
    }
    return fail('NOT_CORRECTED', { move_id: move.id, state });
  } catch (e) {
    console.error('[pacs move] line', move.id, e.message);
    return fail('NOT_CORRECTED', { move_id: move.id, state: 'unknown' });
  } finally { working.delete(move.id); }
}

// ── what a failure, a restart or a power cut left ────────────────────────────
// 'started' / 'undo-pending': the EMR was not changed -> the corrected study is removed.
// 'emr-done' / 'cleanup-pending': the EMR is right -> the original is deleted and the
// first order returns to the worklist.
let resuming = false;
async function resumePending() {
  if (resuming) return { skipped: true };
  resuming = true;
  const out = [];
  try {
    const r = await pool.query(`SELECT * FROM pacs_study_move WHERE state = ANY($1::text[]) ORDER BY id`, [OPEN_STATES]);
    for (const move of r.rows) {
      if (working.has(move.id)) continue;
      working.add(move.id);
      try {
        let state;
        if (move.kind === 'swap') {
          // Undone only while the first study (A) is still whole; once it has been deleted
          // the exchange can only be finished.
          let back = move.step < 2;
          if (back) {
            const A = await studyUnder(await config(), move.detail.a.uid);
            if (A === undefined) { out.push({ id: move.id, was: move.state, state: move.state }); continue; }
            back = !!A && A.instances.length === move.detail.a.count && A.instances.every(i => move.detail.a.sops.includes(i.sop));
            if (!back) move.step = Math.max(move.step, 1);
          }
          state = back ? await undo(move, move.error || 'interrupted') : await advanceSwap(null, move);
        } else {
          state = (move.state === 'started' || move.state === 'undo-pending') ? await undo(move, move.error || 'interrupted') : await finish(move);
        }
        out.push({ id: move.id, was: move.state, state });
      } catch (e) {
        console.error('[pacs move] resuming line', move.id, e.message);
      } finally { working.delete(move.id); }
    }
  } catch (e) {
    // The table is not there yet (an EMR older than the migration): nothing to resume.
    if (!/pacs_study_move/.test(e.message)) console.error('[pacs move] resume:', e.message);
  } finally { resuming = false; }
  return { resumed: out };
}
setTimeout(() => { resumePending(); }, 20000).unref();
setInterval(() => { resumePending(); }, 5 * 60000).unref();

// ── for the image backup: which image files are no longer on the image server ──
// The backup disk keeps one file per image, under its study number
// (images/<StudyInstanceUID>/<SOPInstanceUID>.dcm), and never deletes. After a correction
// the files under the old number would bring the wrong study back at a restore, so the
// backup sets them aside (PACS repository: image-backup.ps1, restore-image-backup.ps1).
// The corrections are replayed in order: what one supersedes is gone, what one makes is
// there again - images moved away and later moved back are not in the answer.
// [{ study_uid, all, instances, replaced_by }] - `all` = every file under that number (a
// line put in by hand without the image numbers); `replaced_by` = the study number the
// images were given (the backup sets a file aside only when its replacement is on the disk).
async function supersededNow() {
  const r = await pool.query(`SELECT kind, detail, superseded FROM pacs_study_move WHERE superseded <> '[]'::jsonb ORDER BY id`);
  const gone = new Map(), whole = new Set(), now = new Map();
  const uidOk = u => /^[0-9.]{1,64}$/.test(String(u || ''));
  for (const m of r.rows) {
    const d = m.detail || {};
    for (const e of (Array.isArray(m.superseded) ? m.superseded : [])) {
      if (!e || !uidOk(e.study_uid)) continue;
      if (uidOk(e.replaced_by)) now.set(e.study_uid, e.replaced_by);
      const sops = (Array.isArray(e.instances) ? e.instances : []).filter(uidOk);
      if (!sops.length) { whole.add(e.study_uid); continue; }
      if (!gone.has(e.study_uid)) gone.set(e.study_uid, new Set());
      sops.forEach(x => gone.get(e.study_uid).add(x));
    }
    const made = m.kind === 'swap'
      ? [[d.o1 && d.o1.uid, d.b && d.b.sops], [d.o2 && d.o2.uid, d.a && d.a.sops]]
      : [[d.new_study_uid, d.source_sops]];
    for (const [uid, sops] of made) {
      if (!uid) continue;
      whole.delete(uid);
      if (gone.has(uid)) (sops || []).forEach(x => gone.get(uid).delete(x));
    }
  }
  const items = [];
  whole.forEach(uid => items.push({ study_uid: uid, all: true, instances: [], replaced_by: now.get(uid) || '' }));
  gone.forEach((set, uid) => { if (set.size && !whole.has(uid)) items.push({ study_uid: uid, all: false, instances: [...set], replaced_by: now.get(uid) || '' }); });
  return items;
}

// ── routes (/api/pacs/...) ───────────────────────────────────────────────────
// The orders the images of one order could go to, each with what stands in the way.
router.get('/move-targets', authMiddleware, mayMove, async (req, res) => {
  try {
    const from = await orderRow(pool, req.query.order_item_id);
    if (!from || !from.exam) return res.status(404).json(fail('NOT_FOUND'));
    const block = sourceBlock(from) || ((await openMoveOn(pool, [from.id])) ? 'BUSY' : null);
    const others = await pool.query(ORDER_SQL + ` WHERE oi.patient_id = $1 AND oi.id <> $2 AND ${isExam('oi')} ORDER BY v.visit_date DESC NULLS LAST, oi.id DESC`, [from.patient_id, from.id]);
    // The report sheets already issued for this exam (they left the clinic as they were).
    const issued = await pool.query(
      `SELECT doc_no, issued_at FROM document_log
        WHERE template_code = 'imaging-report' AND voided IS NOT TRUE AND patient_id = $1 AND payload->>'order_item_id' = $2 ORDER BY issued_at`,
      [from.patient_id, String(from.id)]);
    const shown = o => ({ order_item_id: o.id, order_name: o.order_name, modality: typeOf(o), visit_date: o.visit_date, accession: o.accession_no || '',
                          image_count: o.images_received_at ? o.image_count : null, has_reading: !blank(o.result_text) });
    res.json({
      source: Object.assign(shown(from), { can: !block, code: block, error: block ? WHY[block] : null, issued_reports: issued.rows }),
      targets: others.rows.map(o => {
        const why = block ? null : targetBlock(from, o);
        return Object.assign(shown(o), { kind: o.images_received_at ? 'swap' : 'move', can: !block && !why, code: why, error: why ? WHY[why] : null });
      }),
    });
  } catch (err) { console.error('[pacs move] targets:', err.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/move', authMiddleware, mayMove, async (req, res) => {
  try {
    const b = req.body || {};
    const out = await moveImages(req, b.from_order_item_id, b.to_order_item_id, b.reason);
    if (out.ok) return res.json(out);
    const status = out.code === 'NOT_FOUND' ? 404 : ['UNREACHABLE', 'NOT_PAIRED'].includes(out.code) ? 424 : 409;
    res.status(status).json(out);
  } catch (err) { console.error('[pacs move]', err.message); res.status(500).json({ error: 'Server error' }); }
});

// The corrections of one patient (both orders show them), and the unfinished ones.
router.get('/moves/patient/:patientId', authMiddleware, permMiddleware('consultation', 'payment', 'settings'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, kind, state, from_order_item_id, to_order_item_id, from_order_name, to_order_name, from_accession, to_accession,
              image_count, (detail->'b'->>'count')::int AS other_image_count, reading_moved, reason, staff_name, created_at, finished_at, error
         FROM pacs_study_move WHERE patient_id = $1 ORDER BY id DESC LIMIT 100`, [req.params.patientId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Finish now what is waiting (the same thing the five-minute timer does).
router.post('/move/resume', authMiddleware, mayMove, async (req, res) => {
  try { res.json(await resumePending()); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { router, moveImages, resumePending, supersededNow, OPEN_ON, openKindOn, _test: { replacements, sourceBlock, targetBlock } };
