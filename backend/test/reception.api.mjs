// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 직원·환자·내원을 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Reception API permission checks (decided 2026-09-29, S2): every route in
// patient.routes.js and visit.routes.js, called by one account per role, must pass
// exactly for the screens that call it and answer 403 for everyone else. A 403
// where "allowed" is expected means a screen would break; a pass where "denied" is
// expected means the route is open wider than decided.
//
//   node backend/test/reception.api.mjs            (default http://127.0.0.1:9181)
//   RC_TEST_BASE=http://127.0.0.1:9181/api node backend/test/reception.api.mjs
//
// On a fresh stack it creates the first admin through /auth/setup with a random
// password and keeps the logins in the OS temp folder, so later runs reuse them.
// On a stack that already has an admin, pass one: RC_TEST_LOGIN=… RC_TEST_PASSWORD=…
// Needs Node 18+ (global fetch). Exit code 1 if any check fails.
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const BASE = process.env.RC_TEST_BASE || 'http://127.0.0.1:9181/api';
// 9080 is the clinic's running EMR: this script creates staff, patients and visits there.
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + new URL(BASE).port + '.json');

async function call(method, p, body, token) {
  const r = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; }
const pw = () => crypto.randomBytes(9).toString('base64url');

// ── admin ──
let creds = fs.existsSync(CREDS) ? JSON.parse(fs.readFileSync(CREDS)) : { staff: {} };
if (process.env.RC_TEST_LOGIN) creds.admin = { login_id: process.env.RC_TEST_LOGIN, password: process.env.RC_TEST_PASSWORD };
if (!creds.admin) {
  creds.admin = { login_id: 'rctest', password: pw() };
  const s = await call('POST', '/auth/setup', { ...creds.admin, name: 'RC Test Admin' });
  if (s.status !== 200) throw new Error('setup failed (stack already has an admin? set RC_TEST_LOGIN/RC_TEST_PASSWORD) ' + JSON.stringify(s));
}
const adminLogin = await call('POST', '/auth/login', creds.admin);
if (adminLogin.status !== 200) throw new Error('admin login failed ' + JSON.stringify(adminLogin));
const A = adminLogin.data.token;

// ── one account per role. Permissions are sent explicitly: POST /admin/staff stores
// [] when none are given, not the role's defaults. Defaults mirror
// backend/src/middleware/permissions.js; payment-only and stats-only are the narrow
// accounts the office manager can make by unticking boxes.
const ACCOUNTS = {
  frontdesk: { role: 'frontdesk', permissions: ['registration', 'payment'] },
  doctor: { role: 'doctor', permissions: ['consultation'] },
  nurse: { role: 'nurse', permissions: ['registration', 'pharmacy', 'lab'] },
  pharmacy: { role: 'pharmacy', permissions: ['pharmacy'] },
  lab: { role: 'lab', permissions: ['lab'] },
  paymentOnly: { role: 'frontdesk', permissions: ['payment'] },
  statsOnly: { role: 'frontdesk', permissions: ['stats'] },
};
const staffList = (await call('GET', '/admin/staff', null, A)).data;
const T = { admin: A };
const ID = {};
for (const [key, acc] of Object.entries(ACCOUNTS)) {
  const login_id = 'rct_' + key.toLowerCase();
  if (!creds.staff[key]) creds.staff[key] = { login_id, password: pw() };
  const existing = staffList.find(s => s.login_id === login_id);
  if (existing) {
    // Reset permissions and password each run, so an earlier run or a hand edit cannot skew the result.
    await call('PUT', '/admin/staff/' + existing.id, { ...existing, ...acc, password: creds.staff[key].password, status: 'active' }, A);
    ID[key] = existing.id;
  } else {
    const c = await call('POST', '/admin/staff', { login_id, password: creds.staff[key].password, name: 'RC ' + key, status: 'active', ...acc }, A);
    if (c.status >= 300) throw new Error('could not create ' + key + ' ' + JSON.stringify(c));
    ID[key] = c.data.id;
  }
  const l = await call('POST', '/auth/login', creds.staff[key]);
  if (l.status !== 200) throw new Error('login failed for ' + key + ' ' + JSON.stringify(l));
  T[key] = l.data.token;
}
fs.writeFileSync(CREDS, JSON.stringify(creds));

// ── test data (as admin) ──
const P = (await call('POST', '/patients', { last_name: 'Permission', first_name: 'Test', gender: 'F' }, A)).data;
const V = (await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit' }, A)).data;
if (!P.id || !V.id) throw new Error('could not create test patient/visit');

// ── the table: route → permissions that must pass (OR) ──
const SEARCH = ['registration', 'consultation', 'payment', 'pharmacy', 'lab'];
const HISTORY = ['registration', 'consultation', 'payment', 'pharmacy'];
const ROUTES = [
  ['GET', '/patients?q=Permission', null, SEARCH],
  ['GET', '/patients/' + P.id, null, SEARCH],
  ['GET', '/patients/' + P.id + '/history', null, HISTORY],
  ['GET', '/patients/chart/' + P.chart_no, null, ['registration']],
  ['GET', '/patients/' + P.id + '/billing-history', null, ['payment']],
  ['POST', '/patients', { last_name: 'Permission', first_name: 'Created' }, ['registration']],
  ['PUT', '/patients/' + P.id, { last_name: 'Permission', first_name: 'Test' }, ['registration']],
  ['GET', '/visits/today', null, ['registration', 'consultation']],
  ['GET', '/visits/patient/' + P.id, null, ['registration', 'consultation', 'lab', 'payment']],
  ['POST', '/visits', { patient_id: P.id, visit_type: 'newVisit' }, ['registration']],
  ['PUT', '/visits/' + V.id + '/status', { status: 'waiting' }, ['registration']],
  // what the payment screen sends (Payment.jsx): visit_type alone
  ['PUT', '/visits/' + V.id, { visit_type: 'newVisit' }, ['registration', 'payment']],
  // what the reception screen sends; payment without registration must be refused, not trimmed
  ['PUT', '/visits/' + V.id, { visit_type: 'newVisit', reception_memo: 'x' }, ['registration']],
  ['PUT', '/visits/' + V.id, { chief_complaint: 'perm test', doctor_id: null }, ['registration']],
];
const permsOf = key => key === 'admin' ? SEARCH.concat(['stats', 'settings']) : ACCOUNTS[key].permissions;

for (const who of Object.keys(T)) {
  for (const [method, p, body, allowed] of ROUTES) {
    const shouldPass = permsOf(who).some(x => allowed.includes(x));
    const r = await call(method, p, body, T[who]);
    const label = who.padEnd(11) + ' ' + method.padEnd(4) + ' ' + p.replace(/\d+/g, ':id') + (body ? ' ' + Object.keys(body).join(',') : '');
    if (shouldPass) check(label + ' → allowed', r.status < 300, r.status < 300 ? undefined : { status: r.status, data: r.data });
    else check(label + ' → 403', r.status === 403, r.status === 403 ? undefined : { status: r.status });
  }
}

// ── S1: a permission granted in Settings applies to the same token at once ──
const before = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit' }, T.paymentOnly);
const staffRow = (await call('GET', '/admin/staff', null, A)).data.find(s => s.id === ID.paymentOnly);
await call('PUT', '/admin/staff/' + ID.paymentOnly, { ...staffRow, permissions: ['payment', 'registration'] }, A);
const after = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit' }, T.paymentOnly);
check('S1 payment-only 403 before registration is ticked', before.status === 403, { status: before.status });
check('S1 same token allowed right after ticking registration', after.status === 201, { status: after.status });
await call('PUT', '/admin/staff/' + ID.paymentOnly, { ...staffRow, permissions: ['payment'] }, A);

// Leave no queue behind: cancel the visits this run created.
const today = (await call('GET', '/visits/today', null, A)).data;
for (const v of today.filter(v => v.patient_id === P.id && (v.status === 'waiting' || v.status === 'registered'))) {
  await call('PUT', '/visits/' + v.id + '/status', { status: 'cancelled' }, A);
}

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
