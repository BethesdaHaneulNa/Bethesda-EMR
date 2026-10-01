// Images that leave the clinic (director, 2026-10-01: «영상 인쇄, 영상 내려받기 둘 다 필요»).
//
// This file is the server side of it. For now: printing an exam's images on paper.
//   GET  /api/pacs/export/exam/:orderItemId   the pictures of one exam, in the order of the device
//   GET  /api/pacs/export/image?order_item_id=&instance=&w=   one picture, as JPEG
//   POST /api/pacs/export/printed             the change-log line of a print, before the paper is issued
//
// The pictures come from the image server's own REST (GET /instances/{id}/rendered) and
// are handed on as they are - Orthanc is not changed and nothing is stored here.
// Every answer is checked against the order: the exam must be this order's, the picture
// must be of this exam. What is refused, and why, is in WHY (the screens say the same in
// the user's language by `code`).
//
// Who: consultation and payment (coordinator, 2026-10-01 - the counter takes the fee for
// a copy and hands the paper over).
// An exam whose images say another patient number than the chart is refused: the paper
// would carry this patient's name over someone else's pictures.
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const { isExam, OPEN_ON } = require('./pacs.exam');

const router = express.Router();
const mayExport = permMiddleware('consultation', 'payment');

const WHY = {
  NOT_FOUND: 'No such imaging order',
  CANCELLED: 'The order is cancelled: its images are not given out',
  NO_IMAGES: 'No images have arrived for this order',
  IDENTITY: 'The patient number in the images does not match the chart',
  BUSY: 'The images of this order are being put under another order',
  NOT_PAIRED: 'The image server is not set up',
  UNREACHABLE: 'The image server does not answer',
  NOT_ON_SERVER: 'The images of this order are not on the image server',
  NOT_OF_EXAM: 'This picture is not of this exam',
  NOT_A_PICTURE: 'This item cannot be shown as a picture',
  BAD_REQUEST: 'The request is not understood',
  TOO_MANY: 'Too many pictures for one print',
  NOT_LOGGED: 'The change log could not be written: nothing is printed',
};
// The image server not answering is a 409 like the other refusals, never 502/503/504:
// the web server in front (frontend/nginx.conf) replaces those answers with its own
// "API backend is not reachable", and the screen would lose the `code`.
const HTTP = { NOT_FOUND: 404, NOT_ON_SERVER: 404, NOT_OF_EXAM: 403, NOT_A_PICTURE: 415, BAD_REQUEST: 400, TOO_MANY: 400, NOT_LOGGED: 500 };
const refuse = (res, code) => res.status(HTTP[code] || 409).json({ ok: false, code, error: WHY[code] });

const MAX_PRINT = 48;        // pictures on one paper (6 a page, 8 pages)
const MAX_WIDTH = 1600;      // a wider picture is made smaller by the image server; none is made larger
const ORTHANC_ID = /^[0-9a-f]{8}(-[0-9a-f]{8}){4}$/;
// Series that hold no picture: reports, key-object notes, presentation states, PDFs.
// A picture the image server cannot draw is refused when it is asked for, too.
const NOT_PICTURES = ['SR', 'KO', 'PR', 'DOC', 'PLAN', 'REG', 'FID', 'RTSTRUCT', 'RTPLAN', 'RTDOSE', 'RTRECORD', 'AU', 'ECG', 'HD'];

const linkOf = w => w.image_study_uid || w.study_instance_uid;
const number = s => { const n = parseInt(String(s == null ? '' : s).trim(), 10); return Number.isFinite(n) ? n : null; };

async function config() {
  return (await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1')).rows[0] || {};
}
// One call to the image server. status 0 = no answer at all. `raw` returns the bytes
// and the content type.
async function ox(cfg, method, path, body, opts) {
  const o = opts || {};
  let url;
  try {
    const base = new URL(String(cfg.orthanc_url || DEFAULT_ORTHANC_URL));
    url = new URL(base.pathname.replace(/\/+$/, '') + path, base.origin);
  } catch (e) { return { status: 0 }; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeout || 15000);
  try {
    const headers = { Authorization: 'Basic ' + Buffer.from('admin:' + cfg.orthanc_password).toString('base64') };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    if (o.accept) headers.Accept = o.accept;
    const r = await fetch(url, { method, signal: ctl.signal, headers, body: body === undefined || body === null ? undefined : JSON.stringify(body) });
    if (o.raw) return { status: r.status, type: r.headers.get('content-type') || '', buf: Buffer.from(await r.arrayBuffer()) };
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return { status: r.status, json, text };
  } catch (e) {
    return { status: 0 };
  } finally { clearTimeout(timer); }
}

// ── the exam ─────────────────────────────────────────────────────────────
async function examRow(id) {
  if (!/^[0-9]{1,9}$/.test(String(id))) return null;
  const r = await pool.query(
    `SELECT oi.id, oi.patient_id, oi.visit_id, oi.order_name, oi.status, oi.pacs_modality,
            wl.accession_no, wl.study_instance_uid, wl.image_study_uid, wl.images_received_at,
            wl.image_count, wl.patient_check, ${OPEN_ON('oi.id')} AS moving
       FROM order_item oi
       LEFT JOIN LATERAL (SELECT w.* FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) wl ON true
      WHERE oi.id = $1 AND ${isExam('oi')}`, [id]);
  return r.rows[0] || null;
}
// Why this exam's images are not given out ('' = they are). The list says the same
// before the button is pressed (RadiologyReadings.jsx imagesBlock).
function examBlock(e) {
  if (!e) return 'NOT_FOUND';
  if (e.status === 'cancelled') return 'CANCELLED';
  if (!e.images_received_at || !linkOf(e)) return 'NO_IMAGES';
  if (e.patient_check !== 'match') return 'IDENTITY';
  if (e.moving) return 'BUSY';
  return '';
}
// The exam's study on the image server: { cfg, study } or { code }.
async function studyOf(exam) {
  const cfg = await config();
  if (!cfg.orthanc_password) return { code: 'NOT_PAIRED' };
  const f = await ox(cfg, 'POST', '/tools/find', { Level: 'Study', Query: { StudyInstanceUID: linkOf(exam) }, Expand: true });
  if (f.status !== 200 || !Array.isArray(f.json)) return { code: 'UNREACHABLE' };
  if (f.json.length !== 1) return { code: 'NOT_ON_SERVER' };
  return { cfg, study: f.json[0] };
}

// The pictures of the study, as the device numbered them: series by series number,
// inside a series by instance number. A series of reports or notes holds no picture
// and is counted in `skipped`.
async function picturesOf(cfg, study) {
  const s = await ox(cfg, 'GET', '/studies/' + study.ID + '/series?expand');
  const i = await ox(cfg, 'GET', '/studies/' + study.ID + '/instances?expand');
  if (s.status !== 200 || i.status !== 200 || !Array.isArray(s.json) || !Array.isArray(i.json)) return null;
  const series = {};
  s.json.forEach(x => {
    const t = x.MainDicomTags || {};
    series[x.ID] = { no: number(t.SeriesNumber), desc: String(t.SeriesDescription || '').trim(), modality: String(t.Modality || '').trim().toUpperCase() };
  });
  const out = { images: [], skipped: 0 };
  i.json.forEach(x => {
    const se = series[x.ParentSeries] || { no: null, desc: '', modality: '' };
    if (NOT_PICTURES.indexOf(se.modality) >= 0) { out.skipped++; return; }
    const t = x.MainDicomTags || {};
    out.images.push({
      id: x.ID, series_id: x.ParentSeries, series: se.no, desc: se.desc, modality: se.modality,
      number: number(t.InstanceNumber), index: number(x.IndexInSeries), frames: number(t.NumberOfFrames) || 1,
    });
  });
  const big = 1e9, by = (a, b) => (a == null ? big : a) - (b == null ? big : b);
  out.images.sort((a, b) => by(a.series, b.series) || (a.series_id < b.series_id ? -1 : a.series_id > b.series_id ? 1 : 0)
    || by(a.number, b.number) || by(a.index, b.index) || (a.id < b.id ? -1 : 1));
  out.images.forEach(x => { delete x.series_id; delete x.index; });
  return out;
}

// GET /api/pacs/export/exam/:orderItemId
router.get('/exam/:orderItemId', authMiddleware, mayExport, async (req, res) => {
  try {
    const exam = await examRow(req.params.orderItemId);
    const why = examBlock(exam);
    if (why) return refuse(res, why);
    const at = await studyOf(exam);
    if (at.code) return refuse(res, at.code);
    const pics = await picturesOf(at.cfg, at.study);
    if (!pics) return refuse(res, 'UNREACHABLE');
    res.json({
      ok: true,
      exam: { id: exam.id, order_name: exam.order_name, modality: exam.pacs_modality || '', accession_no: exam.accession_no || '', images_received_at: exam.images_received_at },
      images: pics.images, skipped: pics.skipped, max: MAX_PRINT,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pacs/export/image?order_item_id=&instance=&w=
// One picture as JPEG, with the window the device saved in it (Orthanc's "rendered").
// Of an image with several frames, the first. A picture wider than `w` (at most
// MAX_WIDTH) is made smaller by the image server; a smaller one is sent as it is.
router.get('/image', authMiddleware, mayExport, async (req, res) => {
  try {
    const inst = String(req.query.instance || '');
    if (!ORTHANC_ID.test(inst)) return refuse(res, 'BAD_REQUEST');
    const exam = await examRow(req.query.order_item_id);
    const why = examBlock(exam);
    if (why) return refuse(res, why);
    const cfg = await config();
    if (!cfg.orthanc_password) return refuse(res, 'NOT_PAIRED');
    // The picture must be of this order's exam - never another patient's by a typed number.
    const st = await ox(cfg, 'GET', '/instances/' + inst + '/study');
    if (st.status === 0) return refuse(res, 'UNREACHABLE');
    if (st.status !== 200 || !st.json || (st.json.MainDicomTags || {}).StudyInstanceUID !== linkOf(exam)) return refuse(res, 'NOT_OF_EXAM');

    const want = Math.max(200, Math.min(MAX_WIDTH, number(req.query.w) || MAX_WIDTH));
    const tags = await ox(cfg, 'GET', '/instances/' + inst + '?requested-tags=Columns');
    const wide = tags.status === 200 && tags.json ? number((tags.json.RequestedTags || {}).Columns) : null;
    const pic = await ox(cfg, 'GET', '/instances/' + inst + '/rendered' + (wide && wide > want ? '?width=' + want : ''),
      null, { raw: true, accept: 'image/jpeg', timeout: 30000 });
    if (pic.status === 0) return refuse(res, 'UNREACHABLE');
    if (pic.status !== 200 || !/^image\/jpeg/i.test(pic.type) || !pic.buf.length) return refuse(res, 'NOT_A_PICTURE');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, no-store');
    res.send(pic.buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pacs/export/printed   { order_item_id, instances: [image server ids], per_page, lang }
// The change-log line of a print (pacs.images.print): who, whose, which exam, how many
// pictures. The screen calls it before it issues the paper (POST /api/documents) and
// prints only when this answered ok - no line, no paper. Every picture named must be of
// this exam.
router.post('/printed', authMiddleware, mayExport, async (req, res) => {
  try {
    const b = req.body || {};
    const ids = Array.isArray(b.instances) ? b.instances.map(String) : [];
    if (!ids.length || ids.some(x => !ORTHANC_ID.test(x)) || new Set(ids).size !== ids.length) return refuse(res, 'BAD_REQUEST');
    if (ids.length > MAX_PRINT) return refuse(res, 'TOO_MANY');
    const exam = await examRow(b.order_item_id);
    const why = examBlock(exam);
    if (why) return refuse(res, why);
    const at = await studyOf(exam);
    if (at.code) return refuse(res, at.code);
    const all = await ox(at.cfg, 'GET', '/studies/' + at.study.ID + '/instances');
    if (all.status !== 200 || !Array.isArray(all.json)) return refuse(res, 'UNREACHABLE');
    const mine = new Set(all.json.map(x => x.ID));
    if (ids.some(x => !mine.has(x))) return refuse(res, 'NOT_OF_EXAM');

    const logged = await writeAudit(pool, req, {
      action: ACTIONS.PACS_IMAGES_PRINT, patient_id: exam.patient_id, visit_id: exam.visit_id,
      entity: 'order_item', entity_id: exam.id,
      summary: ids.length + ' image(s) of ' + exam.order_name + (exam.accession_no ? ' (' + exam.accession_no + ')' : '') + ' printed',
      after: { order_name: exam.order_name, accession_no: exam.accession_no || null, image_count: ids.length,
        per_page: number(b.per_page), lang: String(b.lang || '').slice(0, 5) || null },
    });
    if (!logged) return refuse(res, 'NOT_LOGGED');
    res.json({ ok: true, image_count: ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router, WHY, _test: { examBlock, NOT_PICTURES } };
