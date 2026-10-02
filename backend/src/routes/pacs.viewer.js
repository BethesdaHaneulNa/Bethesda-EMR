// The PACS viewer, shown through the EMR (P-9, option C, 2026-09-29).
//
// The image window used to point the browser straight at Orthanc (:9090), which
// asks for the Orthanc admin login - a login that can delete images, which
// every doctor would have had to know, and which inside the EMR's iframe showed
// only a black pane. Now the iframe opens /api/pacs/viewer/... on the EMR and
// this router relays each request to Orthanc, adding that login here, on the
// server. Staff never see it, and the clinic network no longer needs port 9090.
//
// Stone is served exactly as Orthanc ships it. This relay never changes a byte of
// its pages or files and never adds code that calls into it (Orthanc and Stone are
// AGPLv3; the clinic uses them unmodified). What the EMR may use is Stone's own URL
// parameters (?study=A,B) and Stone's own buttons. The only pages of ours are the
// short notices sent INSTEAD of Stone when it has nothing to show.
//
// Who may: an iframe cannot send the EMR's bearer token, so GET /api/pacs/viewer-url
// (JWT + consultation) sets a short-lived signed cookie naming the user and the
// studies of the order they opened last (its own study and the same patient's
// others, to compare). Every request here re-checks that cookie, that the account
// is still active with the consultation permission, and that the path is one the
// Stone viewer needs for one of those studies - measured on the isolated stack:
// all GET, and every data request carries the StudyInstanceUID in its path or in
// the 0020000D filter. Anything else is refused, so one study's cookie cannot
// list or open another patient's images.

const express = require('express');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
// One address and one reachability check for the relay, Settings and the status
// screen: services/pacs-probe.js (the settings session's file).
const { DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');
const { pool } = require('../config/database');
const { effectivePerms } = require('../middleware/auth');

const router = express.Router();

const COOKIE = 'px_viewer';
const COOKIE_PATH = '/api/pacs/viewer/';
const COOKIE_MAX_AGE = 30 * 60;          // seconds
const MAX_STUDIES = 12;                   // the opened study + the same patient's others (compare)
const UID = '[0-9.]{1,64}';

// A key of its own, derived from JWT_SECRET: the cookie cannot be turned into a
// login token or the other way round, and no new secret has to be installed.
const KEY = crypto.createHmac('sha256', String(process.env.JWT_SECRET || ''))
  .update('bethesda-pacs-viewer-cookie-v1').digest();

const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  return body + '.' + b64u(crypto.createHmac('sha256', KEY).update(body).digest());
}

function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const want = crypto.createHmac('sha256', KEY).update(parts[0]).digest();
  const got = unb64u(parts[1]);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(unb64u(parts[0]).toString('utf8'));
    if (!p || typeof p.u !== 'number' || !Array.isArray(p.s) || typeof p.e !== 'number') return null;
    if (p.e < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch (e) { return null; }
}

function readCookie(req) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return '';
}

// Called by GET /api/pacs/viewer-url once it has checked the JWT and the
// consultation permission: the viewer cookie now opens this order's study and the
// same patient's other studies that viewer-url listed (to compare) - nothing else.
// Each call replaces the cookie: what was opened before (another patient, in
// another tab) stops loading. It never added up in a browser anyway - the cookie's
// path keeps it from being sent to /viewer-url - and one patient at a time is the
// rule worth having now that a cookie carries a patient's set of studies.
function grantViewerCookie(req, res, studyUids) {
  const studies = studyUids.filter(u => new RegExp('^' + UID + '$').test(u)).slice(0, MAX_STUDIES);
  const token = sign({ u: req.user.id, s: studies, e: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE });
  res.append('Set-Cookie', `${COOKIE}=${token}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`);
}

// The account behind a cookie, re-read at most every 30 s: deactivating someone
// or taking away consultation stops their open viewer within half a minute.
const accountCache = new Map();
async function accountAllows(userId) {
  const hit = accountCache.get(userId);
  if (hit && hit.until > Date.now()) return hit.ok;
  const r = await pool.query('SELECT role, permissions, status FROM staff WHERE id = $1', [userId]);
  const s = r.rows[0];
  const ok = !!s && s.status === 'active' && effectivePerms(s).includes('consultation');
  accountCache.set(userId, { ok, until: Date.now() + 30000 });
  return ok;
}

// Decode the path once and refuse anything that could step outside the list:
// '..' segments, backslashes, empty segments, and anything still percent-encoded
// after decoding (double encoding such as %252e).
function cleanPath(rawUrl) {
  const rawPath = String(rawUrl).split('?')[0];
  let p;
  try { p = decodeURIComponent(rawPath); } catch (e) { return null; }
  if (!p.startsWith('/') || /[\\%\0]/.test(p) || p.includes('//')) return null;
  if (p.split('/').some(seg => seg === '..' || seg === '.')) return null;
  return p;
}

const STATIC = /^\/stone-webviewer\/[A-Za-z0-9._\-\/]+$/;
const STUDY_PATH = new RegExp(
  '^/dicom-web/studies/(' + UID + ')' +
  '(?:/series/' + UID + '(?:/instances/' + UID + ')?)?' +
  '(?:/(?:metadata|rendered|thumbnail|frames/[0-9]{1,5}(?:,[0-9]{1,5}){0,999}(?:/rendered)?))?$');
const QUERY_PATH = /^\/dicom-web\/(?:studies|series|instances)$/;

// Which study a request is about, or null if it is not an allowed request at all.
// '' means "no study needed" (the viewer's own files).
function studyOf(path, query) {
  if (STATIC.test(path) || path === '/system') return '';
  const m = STUDY_PATH.exec(path);
  if (m) return m[1];
  if (QUERY_PATH.test(path)) {
    const q = query['0020000D'] || query['0020000d'] || query.StudyInstanceUID;
    if (typeof q === 'string' && new RegExp('^' + UID + '$').test(q)) return q;
  }
  return null;
}

// What to show inside the image window when the viewer cannot work - never a
// black pane. French first: it is what the clinic reads.
// Status codes: the EMR's nginx replaces any 502/503/504 from the backend with
// its own "API backend is not reachable" (proxy_intercept_errors), so this relay
// never answers with those. A page meant to be read is sent as 200; a failed
// image request as 424 (Failed Dependency) - which nginx leaves alone.
const PACS_DOWN = 424;
function explain(res, status, fr, ko, en) {
  res.status(status).type('html').send(
    '<!doctype html><meta charset="utf-8"><body style="background:#000;color:#cbd5e1;font:15px sans-serif;padding:24px;line-height:1.6">' +
    `<p>${fr}</p><p style="color:#94a3b8">${ko}</p><p style="color:#8290a3">${en}</p></body>`);
}
const NOT_PAIRED = [
  "Le serveur d'images n'est pas encore relié à ce dossier : l'administrateur doit lancer <b>pair-with-emr.ps1</b> dans le dossier du PACS.",
  '영상 서버가 EMR과 아직 짝이 맞지 않았습니다. 관리자가 PACS 폴더에서 <b>pair-with-emr.ps1</b>을 실행해야 합니다.',
  'The image server is not paired with the EMR yet: an administrator must run <b>pair-with-emr.ps1</b> in the PACS folder.'];
const UNREACHABLE = [
  "Le serveur d'images ne répond pas. Prévenez l'administrateur.",
  '영상 서버가 응답하지 않습니다. 관리자에게 알려 주세요.',
  'The image server is not answering. Tell the administrator.'];
const EXPIRED = [
  "La session d'affichage a expiré : fermez cette fenêtre et rouvrez l'image.",
  '영상 보기 시간이 끝났습니다. 창을 닫고 영상을 다시 여세요.',
  'The viewing session has expired: close this window and open the image again.'];

// The viewer page asked for a study this cookie does not open - typed or pasted
// into the address bar, or an old link. Its data would be refused one by one,
// leaving a black page with a spinner; say why instead (integration test
// 2026-09-30).
const NOT_OPENED = [
  "Cette image n'a pas été ouverte depuis une demande d'imagerie. Ouvrez-la avec le bouton 🖼 dans l'écran Consultation.",
  '이 영상은 진료 화면의 오더에서 연 것이 아닙니다. 진료 화면의 🖼 단추로 여세요.',
  'This study was not opened from an imaging order. Open it with the 🖼 button in the Consultation screen.'];
const NOT_ALLOWED = [
  "Ce compte ne peut plus ouvrir les images (compte désactivé ou sans accès à la consultation). Prévenez l'administrateur.",
  '이 계정으로는 영상을 열 수 없습니다(비활성 계정이거나 진료 권한 없음). 관리자에게 알려 주세요.',
  'This account can no longer open images (inactive, or no consultation access). Tell the administrator.'];
// A study made only of objects without a picture (a device's report, measurements,
// raw data - stored since UnknownSopClassAccepted, 2026-09-30) opens in Stone as a
// crossed-out eye and an empty pane, which reads as "images arrived but do not
// show". Say what it is instead. {n} = number of objects.
const NO_PICTURE = [
  "Cette demande n'a reçu que des données sans image ({n}) — par exemple un rapport ou des mesures envoyés par l'appareil. Il n'y a rien à afficher ; le compte-rendu peut être saisi à droite.",
  '이 검사에는 그림이 없는 자료만 왔습니다({n}개) — 장비가 보낸 보고서·측정값 같은 것. 보여 줄 영상이 없습니다. 판독은 오른쪽에 쓸 수 있습니다.',
  'Only data without a picture arrived for this order ({n}) — for example a report or measurements sent by the device. There is nothing to show; the reading can be written on the right.'];
// The image server has nothing under this order's study number: the exam is not done
// or not sent yet. Stone would open an empty window, which reads as a fault - and the
// list of the patient's exams now stays open under the image window, so a doctor
// going down it meets this often (2026-10-01).
const NOT_ARRIVED = [
  "Les images de cette demande ne sont pas encore arrivées. Elles apparaîtront ici quand l'examen aura été fait et envoyé par l'appareil : fermez cette fenêtre et rouvrez-la plus tard. Le compte-rendu peut être saisi à droite.",
  '이 검사의 영상이 아직 오지 않았습니다. 장비에서 촬영해 보내면 여기에 나옵니다 — 이 창을 닫았다가 나중에 다시 여세요. 판독은 오른쪽에 쓸 수 있습니다.',
  'The images for this order have not arrived yet. They will show here once the exam is done and sent by the device: close this window and open it again later. The reading can be written on the right.'];
// Same finding, but the EMR did note the arrival of these images: they were on the
// image server and are not any more (an EMR restored before its images, a PACS
// installed anew). "Not arrived yet" would contradict the list's «N image(s) reçue(s)».
const NOT_THERE = [
  "L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas. Prévenez l'administrateur : elles sont peut-être à restaurer depuis la sauvegarde des images.",
  'EMR에는 이 검사의 영상이 도착했다고 적혀 있는데, 영상 서버에는 그 영상이 없습니다. 관리자에게 알려 주세요 — 영상 백업에서 되살려야 할 수 있습니다.',
  'The EMR noted that these images arrived, but the image server does not have them. Tell the administrator: they may have to be restored from the image backup.'];
// A study brought in from another establishment's disc (pacs.import.js) has no order and
// no reading box: the two notices above, said for it.
const NO_PICTURE_OUTSIDE = [
  "Cet examen externe ne contient que des données sans image ({n}) — par exemple un rapport. Il n'y a rien à afficher.",
  '이 외부 검사에는 그림이 없는 자료만 있습니다({n}개) — 보고서 같은 것. 보여 줄 영상이 없습니다.',
  'This outside exam holds only data without a picture ({n}) — a report, for example. There is nothing to show.'];
const OUTSIDE_NOT_THERE = [
  "Ces images externes ont été importées dans ce dossier, mais le serveur d'images ne les a pas. Prévenez l'administrateur : elles sont peut-être à restaurer depuis la sauvegarde des images.",
  '이 외부 영상은 이 차트에 들여온 것으로 적혀 있는데, 영상 서버에는 없습니다. 관리자에게 알려 주세요 — 영상 백업에서 되살려야 할 수 있습니다.',
  'These outside images were brought into this chart, but the image server does not have them. Tell the administrator: they may have to be restored from the image backup.'];
function isPage(path) { return path === '/stone-webviewer/index.html'; }

// A small JSON call to Orthanc with the stored login, for the viewer's own checks.
// Resolves null on any failure: a check that cannot be made never blocks the viewer.
function orthancJson(cfg, path, method, body, timeoutMs) {
  return new Promise(resolve => {
    let url;
    try {
      const base = new URL(String(cfg.orthanc_url || DEFAULT_ORTHANC_URL));
      url = new URL(base.pathname.replace(/\/+$/, '') + path, base.origin);
    } catch (e) { return resolve(null); }
    const lib = url.protocol === 'https:' ? https : http;
    let done = false;
    const finish = v => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const req = lib.request(url, {
      method: method || 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from('admin:' + cfg.orthanc_password).toString('base64'), Accept: 'application/json', 'Content-Type': 'application/json' },
    }, up => {
      let data = '';
      up.setEncoding('utf8');
      up.on('data', c => { if (data.length < 2000000) data += c; });
      up.on('end', () => { if (up.statusCode !== 200) return finish(null); try { finish(JSON.parse(data)); } catch (e) { finish(null); } });
      up.on('error', () => finish(null));
    });
    const timer = setTimeout(() => { req.destroy(); finish(null); }, timeoutMs || 3000);
    req.on('error', () => finish(null));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Does any object of this study carry a picture? Orthanc records PixelDataOffset for
// every stored instance that has pixel data. Returns { picture: bool, count } or
// null when it cannot tell (then the viewer opens as usual). count 0 = Orthanc
// answered and has no such study. Looks at 30 objects at most: a study with a
// picture usually shows one among the first.
async function studyPictures(cfg, studyUid) {
  const ids = await orthancJson(cfg, '/tools/find', 'POST', { Level: 'Study', Query: { StudyInstanceUID: studyUid } });
  if (Array.isArray(ids) && ids.length === 0) return { picture: false, count: 0 };
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  const instances = await orthancJson(cfg, '/studies/' + ids[0] + '/instances');
  if (!Array.isArray(instances) || !instances.length) return null;
  for (const inst of instances.slice(0, 30)) {
    const meta = await orthancJson(cfg, '/instances/' + inst.ID + '/metadata?expand');
    if (!meta) return null;
    if (meta.PixelDataOffset) return { picture: true, count: instances.length };
  }
  return { picture: false, count: instances.length };
}

// Did the bridge report images for this study number? false when it cannot tell.
async function arrivalNoted(studyUid) {
  try {
    const r = await pool.query(
      `SELECT 1 FROM worklist_log
        WHERE (study_instance_uid = $1 OR image_study_uid = $1) AND images_received_at IS NOT NULL LIMIT 1`, [studyUid]);
    return r.rows.length > 0;
  } catch (e) { return false; }
}

// Is this study one that was brought in from a disc? false when it cannot tell.
async function broughtIn(studyUid) {
  try { return (await pool.query(`SELECT 1 FROM pacs_import WHERE study_uid = $1 AND state = 'done' LIMIT 1`, [studyUid])).rows.length > 0; }
  catch (e) { return false; }
}

// The EMR's helmet() gives every API response `script-src 'self'`, which stops
// the Stone viewer cold: it runs an inline script, compiles Vue templates with
// eval, and instantiates WebAssembly (seen on the isolated stack: EvalError, a
// blocked inline script, the .wasm never fetched, a black pane). Only the relay's
// responses get this policy instead - everything they serve comes from Orthanc's
// own Stone files through this router, and nothing may be loaded from elsewhere.
// Trade-off, written down in the PACS wiki: that code runs on the EMR's origin.
const VIEWER_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');
// Several exams in one window (?study=OPENED,OTHER,... to compare): Stone puts in its
// first pane the first series whose description (.../metadata) it receives, it asks
// for the descriptions in the order the exams' series lists (series?0020000D=) came
// back, and it has no parameter to say which exam comes first. Measured: another exam
// came up first about once in eight, and holding only its descriptions was not enough
// (when Stone asks for that one first it simply waits, then shows it).
// The window's title and its reading box belong to the opened order, so that exam must
// be the one that comes up. For a page with several exams the relay therefore answers
// in this order:
//   1. the opened exam's series list, then the other exams' series lists;
//   2. the opened exam's descriptions - but only once every list has gone out (Stone
//      builds its list of exams when the last one arrives; a description that arrives
//      before that opens nothing and the first pane stays empty);
//   3. the other exams' descriptions.
// Each wait is 1.5 s at most, so a problem here costs seconds, never the images. Only
// the timing of our own answers changes: Stone is served as it is, nothing is added
// to it and nothing calls into it.
const openedFirst = {
  pages: new Map(),                       // user:openedStudy -> { studies, listed:Set, described:bool }
  page(key, studies) {
    if (this.pages.size > 200) this.pages.clear();
    this.pages.set(key, { studies, listed: new Set(), described: false });
  },
  async until(test) {
    const end = Date.now() + 1500;
    while (!test() && Date.now() < end) await new Promise(r => setTimeout(r, 15));
  },
  // Before answering: wait for what must go out first.
  async before(key, study, path) {
    const p = this.pages.get(key);
    if (!p || p.studies.length < 2 || !study) return;
    const opened = p.studies[0];
    if (path === '/dicom-web/series') {
      if (study !== opened) await this.until(() => p.listed.has(opened));
    } else if (path.endsWith('/metadata')) {
      if (study === opened) await this.until(() => p.studies.every(u => p.listed.has(u)));
      else { await this.until(() => p.described); await new Promise(r => setTimeout(r, 40)); }
    }
  },
  // After an answer has gone out.
  after(key, study, path) {
    const p = this.pages.get(key);
    if (!p || !study) return;
    if (path === '/dicom-web/series') p.listed.add(study);
    else if (path.endsWith('/metadata') && study === p.studies[0]) p.described = true;
  },
};

function viewerHeaders(res) {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', VIEWER_CSP);
}

router.all('*', async (req, res) => {
  viewerHeaders(res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'Read only' });

  const path = cleanPath(req.url);
  if (!path) return res.status(400).json({ error: 'Bad path' });

  const grant = verify(readCookie(req));
  if (!grant) return isPage(path) ? explain(res, 401, ...EXPIRED) : res.status(401).json({ error: 'Viewer session missing or expired' });

  // Without ?study= Stone would list every study, which is refused anyway. The page
  // may name several - the opened one first, then the same patient's other exams to
  // compare it with (Stone's own ?study=A,B,...): each must be in the cookie.
  // ?patient= (Stone's "every study of this patient number") is never served: it is
  // Orthanc's answer, not the EMR's list - it would bring in studies the EMR flagged
  // as another patient's, cancelled ones, and any that merely carry the number.
  const pageStudies = isPage(path) ? String(req.query.study || '').split(',') : [];
  if (isPage(path) && (!pageStudies[0] || pageStudies.some(u => !grant.s.includes(u)) || req.query.patient !== undefined)) {
    return explain(res, 403, ...NOT_OPENED);
  }
  const study = studyOf(path, req.query);
  if (study === null || (study && !grant.s.includes(study))) {
    // The shape only, UIDs masked: enough to notice a Stone update calling
    // something new, without writing study numbers to the log.
    console.log('[pacs viewer] refused', req.method, path.replace(/[0-9.]{6,}/g, '<uid>'));
    return res.status(403).json({ error: 'Not allowed' });
  }

  // Several exams in one window: the opened one must come up first (see openedFirst).
  const examKey = grant.u + ':' + grant.s[0];
  await openedFirst.before(examKey, study, path);

  let cfg;
  try {
    if (!(await accountAllows(grant.u))) return isPage(path) ? explain(res, 401, ...NOT_ALLOWED) : res.status(401).json({ error: 'Account is inactive or lacks consultation' });
    cfg = (await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1')).rows[0] || {};
  } catch (e) { return res.status(PACS_DOWN).json({ error: 'Could not verify the account' }); }
  if (!cfg.orthanc_password) return isPage(path) ? explain(res, 200, ...NOT_PAIRED) : res.status(PACS_DOWN).json({ error: 'PACS not paired' });

  let target;
  try {
    const base = new URL(String(cfg.orthanc_url || DEFAULT_ORTHANC_URL));
    const qs = String(req.url).includes('?') ? String(req.url).slice(String(req.url).indexOf('?')) : '';
    target = new URL(base.pathname.replace(/\/+$/, '') + path + qs, base.origin);
  } catch (e) { return isPage(path) ? explain(res, 200, ...UNREACHABLE) : res.status(PACS_DOWN).json({ error: 'Bad PACS address' }); }

  if (isPage(path)) {
    openedFirst.page(examKey, pageStudies);
    const pics = await studyPictures(cfg, pageStudies[0]);
    const outside = pics && (pics.count === 0 || !pics.picture) ? await broughtIn(pageStudies[0]) : false;
    if (pics && pics.count === 0) return explain(res, 200, ...(outside ? OUTSIDE_NOT_THERE : (await arrivalNoted(pageStudies[0])) ? NOT_THERE : NOT_ARRIVED));
    if (pics && !pics.picture) return explain(res, 200, ...(outside ? NO_PICTURE_OUTSIDE : NO_PICTURE).map(t => t.replace('{n}', pics.count)));
  }

  const lib = target.protocol === 'https:' ? https : http;
  const upstream = lib.request(target, {
    method: req.method,
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin:' + cfg.orthanc_password).toString('base64'),
      Accept: req.headers.accept || '*/*',
    },
  }, up => {
    if (up.statusCode === 401) {
      // Orthanc refused the stored password: the PACS was re-installed or its
      // password changed without pairing again.
      up.resume();
      return isPage(path) ? explain(res, 200, ...NOT_PAIRED) : res.status(PACS_DOWN).json({ error: 'PACS refused the stored login' });
    }
    const headers = {};
    for (const [k, v] of Object.entries(up.headers)) {
      // Never pass on Orthanc's cookies or its login challenge (a browser login
      // box is exactly what this relay exists to remove).
      if (['set-cookie', 'www-authenticate', 'connection', 'keep-alive', 'transfer-encoding'].includes(k)) continue;
      headers[k] = v;
    }
    headers['cache-control'] = 'private, no-store';
    headers['content-security-policy'] = VIEWER_CSP;
    // An upstream 502-504 would be swapped by nginx for "backend not reachable";
    // pass it on as 424 so the log still says it was the image server.
    const code = up.statusCode || PACS_DOWN;
    res.writeHead([502, 503, 504].includes(code) ? PACS_DOWN : code, headers);
    up.on('end', () => openedFirst.after(examKey, study, path));
    up.pipe(res);
  });
  // Connect within 5 s (Orthanc down should say so quickly); once connected a
  // large study may take its time, up to 120 s without a byte.
  upstream.setTimeout(120000, () => upstream.destroy(new Error('timeout')));
  upstream.on('socket', s => {
    if (!s.connecting) return;
    const t = setTimeout(() => upstream.destroy(new Error('connect timeout')), 5000);
    s.once('connect', () => clearTimeout(t));
    s.once('close', () => clearTimeout(t));
  });
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    return isPage(path) ? explain(res, 200, ...UNREACHABLE) : res.status(PACS_DOWN).json({ error: 'PACS not reachable' });
  });
  req.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  upstream.end();
});

module.exports = { router, grantViewerCookie, orthancJson, _test: { sign, verify, cleanPath, studyOf } };
