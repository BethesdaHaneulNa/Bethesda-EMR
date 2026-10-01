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
// This file: moving to an order that has no images. Exchanging the images of two orders
// (both have some) follows.

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const { patientCheck } = require('./pacs.relink');
const { isExam } = require('./pacs.exam');

const router = express.Router();

// Who (director, 2026-10-01): doctors and administrators - the consultation permission
// or the settings permission. A reason is always required.
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
  SWAP_LATER:         'The other order has images too (exchanging two orders is not available yet)',
  BUSY:               'A correction is already in progress for one of these orders',
  REASON:             'A reason is required',
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
  if (to.images_received_at) return 'SWAP_LATER';
  // The reading goes with the images (director). A reading already written on the other
  // order would be overwritten: it has to be dealt with by a person first.
  if (!blank(from.result_text) && !blank(to.result_text)) return 'TARGET_HAS_READING';
  return null;
}
const OPEN_STATES = ['started', 'emr-done', 'cleanup-pending', 'undo-pending'];
// SQL: "a correction that is not finished involves this order item" (the feed and the
// arrival report use it). The four states are the table's own.
const OPEN_ON = col => `EXISTS (SELECT 1 FROM pacs_study_move pm WHERE pm.state IN ('started', 'emr-done', 'cleanup-pending', 'undo-pending')
                                 AND (pm.from_order_item_id = ${col} OR pm.to_order_item_id = ${col}))`;
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
    await writeAudit(client, req, {
      action: ACTIONS.PACS_STUDY_MOVE, patient_id: to.patient_id, visit_id: to.visit_id,
      entity: 'order_item', entity_id: to.id,
      summary: `${made.count} image(s): ${from.order_name} (${from.accession_no}) -> ${to.order_name} (${to.accession_no})`,
      before: { order_name: from.order_name, accession_no: from.accession_no },
      after: { order_name: to.order_name, accession_no: to.accession_no, image_count: made.count, reading_moved: reading, reason: move.reason },
    });
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
    await setState(move.id, 'cleanup-pending', 4, { superseded: [{ study_uid: d.old_study_uid, instances: d.source_sops || [] }] });
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

async function moveImages(req, fromId, toId, reason) {
  if (blank(reason)) return fail('REASON');
  const cfg = await config();
  if (!cfg.orthanc_password) return fail('NOT_PAIRED');

  // What the EMR knows.
  let from = await orderRow(pool, fromId), to = await orderRow(pool, toId);
  let why = sourceBlock(from) || targetBlock(from, to) || ((await openMoveOn(pool, [from.id, to.id])) ? 'BUSY' : null);
  if (why) return fail(why);

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
       String(reason).trim().slice(0, 500), JSON.stringify(detail), req.user.id || null, req.user.name || req.user.login_id || null])).rows[0];
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
        const state = (move.state === 'started' || move.state === 'undo-pending') ? await undo(move, move.error || 'interrupted') : await finish(move);
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
    const status = out.code === 'NOT_FOUND' ? 404 : out.code === 'REASON' ? 400 : ['UNREACHABLE', 'NOT_PAIRED'].includes(out.code) ? 424 : 409;
    res.status(status).json(out);
  } catch (err) { console.error('[pacs move]', err.message); res.status(500).json({ error: 'Server error' }); }
});

// The corrections of one patient (both orders show them), and the unfinished ones.
router.get('/moves/patient/:patientId', authMiddleware, permMiddleware('consultation', 'payment', 'settings'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, kind, state, from_order_item_id, to_order_item_id, from_order_name, to_order_name, from_accession, to_accession,
              image_count, reading_moved, reason, staff_name, created_at, finished_at, error
         FROM pacs_study_move WHERE patient_id = $1 ORDER BY id DESC LIMIT 100`, [req.params.patientId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Finish now what is waiting (the same thing the five-minute timer does).
router.post('/move/resume', authMiddleware, mayMove, async (req, res) => {
  try { res.json(await resumePending()); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { router, moveImages, resumePending, OPEN_ON, _test: { replacements, sourceBlock, targetBlock } };
