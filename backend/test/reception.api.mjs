// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 직원·환자·내원을 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Reception API checks.
// 1. Permissions (decided 2026-09-29, S2): every route in patient.routes.js and
//    visit.routes.js, called by one account per role, must pass exactly for the
//    screens that call it and answer 403 for everyone else. A 403 where "allowed" is
//    expected means a screen would break; a pass where "denied" is expected means the
//    route is open wider than decided.
// 2. Duplicate warnings (decided 2026-09-29, reception ④): same-name lookup and the
//    same-day second-visit check.
// 3. Patient search (⑯): name order, literal % and _, limit/offset parsing.
// 4. Patient field checks (⑬): gender M/F only, birth date YYYY-MM-DD on the calendar.
// 5. Chart numbers (⑱): this year's prefix, and twenty patients created at once get
//    twenty different, consecutive numbers. The year change and numbers past 99,999
//    are checked in SQL: backend/test/reception.chartno.sql.
// 6. Vital signs from reception and the phone (2026-11-09): PUT/GET /visits/:id/vitals -
//    any signed-in active account may, the visit stays waiting, the doctor finds the same
//    consultation row.
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
  // Setup picks the login id itself (always 'admin' since S3), so keep the one it returns,
  // and save at once: if a later step throws, the next run can still log in.
  const password = pw();
  const s = await call('POST', '/auth/setup', { password, name: 'RC Test Admin' });
  if (s.status !== 200) throw new Error('setup failed (stack already has an admin? set RC_TEST_LOGIN/RC_TEST_PASSWORD) ' + JSON.stringify(s));
  creds.admin = { login_id: s.data.user.login_id, password };
  fs.writeFileSync(CREDS, JSON.stringify(creds));
}
const adminLogin = await call('POST', '/auth/login', creds.admin);
if (adminLogin.status !== 200) throw new Error('admin login failed ' + JSON.stringify(adminLogin));
const A = adminLogin.data.token;
// A visit needs a department (the clinic's manager, 2026-11-09): the first active one.
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;

// ── one account per role. Permissions are sent explicitly: POST /admin/staff stores
// [] when none are given, not the role's defaults. Defaults mirror
// backend/src/middleware/permissions.js; payment-only and stats-only are the narrow
// accounts the office manager can make by unticking boxes.
const ACCOUNTS = {
  frontdesk: { role: 'frontdesk', permissions: ['registration', 'payment'] },
  doctor: { role: 'doctor', permissions: ['consultation', 'pharmacy'], department_id: DEPT },   // pharmacy added by decision 2026-09-29; a doctor has a department (2026-11-10)
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
const missingDept = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit' }, A);
check('a visit without a department is refused (400 DEPARTMENT_REQUIRED)', missingDept.status === 400 && missingDept.data.code === 'DEPARTMENT_REQUIRED' && missingDept.data.error === 'department_id is required', { status: missingDept.status, data: missingDept.data });
const unknownDept = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: 999999 }, A);
check('a visit with an unknown department is refused (400 BAD_DEPARTMENT)', unknownDept.status === 400 && unknownDept.data.code === 'BAD_DEPARTMENT', { status: unknownDept.status, data: unknownDept.data });
const V = (await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: DEPT }, A)).data;
if (!P.id || !V.id) throw new Error('could not create test patient/visit');
const clearDept = await call('PUT', '/visits/' + V.id, { department_id: null, doctor_id: null, chief_complaint: 'x' }, A);
check('the edit form cannot clear the department (400 DEPARTMENT_REQUIRED)', clearDept.status === 400 && clearDept.data.code === 'DEPARTMENT_REQUIRED', { status: clearDept.status, data: clearDept.data });
const keepType = await call('PUT', '/visits/' + V.id, { visit_type: 'followUp' }, A);
check('a body without department_id (payment: visit type alone) still goes through', keepType.status === 200, { status: keepType.status, data: keepType.data });

// ── the table: route → permissions that must pass (OR) ──
const SEARCH = ['registration', 'consultation', 'payment', 'pharmacy', 'lab'];
const HISTORY = ['registration', 'consultation', 'payment', 'pharmacy'];
const ROUTES = [
  ['GET', '/patients?q=Permission', null, SEARCH],
  ['GET', '/patients/' + P.id, null, SEARCH],
  ['GET', '/patients/' + P.id + '/history', null, HISTORY],
  ['GET', '/patients/chart/' + P.chart_no, null, ['registration']],
  ['GET', '/patients/similar?last_name=Permission&first_name=Test', null, ['registration']],
  ['GET', '/patients/' + P.id + '/billing-history', null, ['payment']],
  ['POST', '/patients', { last_name: 'Permission', first_name: 'Created' }, ['registration']],
  ['PUT', '/patients/' + P.id, { last_name: 'Permission', first_name: 'Test' }, ['registration']],
  ['GET', '/visits/today', null, ['registration', 'consultation']],
  ['GET', '/visits/day', null, ['registration', 'consultation']],
  ['GET', '/visits/patient/' + P.id, null, ['registration', 'consultation', 'lab', 'payment']],
  // allow_duplicate: the test patient is registered again and again today
  ['POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, ['registration']],
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

// ── ④ same-name lookup: name only, case / spaces / order ignored ──
const ids = r => Array.isArray(r.data) ? r.data.map(x => x.id) : [];
const sim1 = await call('GET', '/patients/similar?last_name=' + encodeURIComponent('  permission ') + '&first_name=TEST', null, A);
check('④ similar: case and spaces ignored', sim1.status === 200 && ids(sim1).includes(P.id), { status: sim1.status });
const sim2 = await call('GET', '/patients/similar?last_name=Test&first_name=Permission', null, A);
check('④ similar: swapped order matches', ids(sim2).includes(P.id));
const sim3 = await call('GET', '/patients/similar?last_name=Permission&first_name=Other', null, A);
check('④ similar: a different first name does not match', !ids(sim3).includes(P.id));
const sim4 = await call('GET', '/patients/similar?last_name=Permission', null, A);
check('④ similar: one name missing gives an empty list', sim4.status === 200 && ids(sim4).length === 0);
check('④ similar: rows carry chart, birth date, phone, last visit', sim1.data[0] && ['chart_no', 'date_of_birth', 'phone', 'last_visit_date'].every(k => k in sim1.data[0]));

// ── ④ accents are ignored (Hélène = Helene), both ways ──
const stamp = String(Date.now());
const PA = (await call('POST', '/patients', { last_name: 'Rabé', first_name: 'Hélène' + stamp }, A)).data;
const PB = (await call('POST', '/patients', { last_name: 'Rakotoarisoa', first_name: 'Noel' + stamp }, A)).data;
const acc1 = await call('GET', '/patients/similar?last_name=RABE&first_name=' + encodeURIComponent('helene' + stamp), null, A);
check('④ similar: stored with accents, typed without', ids(acc1).includes(PA.id), { status: acc1.status });
const acc2 = await call('GET', '/patients/similar?last_name=' + encodeURIComponent('Noël' + stamp) + '&first_name=' + encodeURIComponent('RAKOTOARISOA'), null, A);
check('④ similar: stored without accents, typed with (and swapped)', ids(acc2).includes(PB.id), { status: acc2.status });
const acc3 = await call('GET', '/patients/similar?last_name=Rabe&first_name=' + encodeURIComponent('Helena' + stamp), null, A);
check('④ similar: a different letter still does not match', !ids(acc3).includes(PA.id));

// ⑯b phone search by digits (1.7.3): a number stored with dashes is found by its digits,
// by a dashed piece, and by the old space-separated writing; a 2-digit query does not scan phones.
const PH = (await call('POST', '/patients', { last_name: 'Phone', first_name: 'Dash' + stamp, phone: '034-12-345-67 / 033-45-678-90' }, A)).data;
const ph1 = await call('GET', '/patients?q=0341234567', null, A);
check('⑯b phone: digits only find a dashed number', ph1.status === 200 && ids(ph1).includes(PH.id), { status: ph1.status });
const ph2 = await call('GET', '/patients?q=' + encodeURIComponent('45-678'), null, A);
check('⑯b phone: a dashed piece of the second number', ids(ph2).includes(PH.id));
const ph3 = await call('GET', '/patients?q=' + encodeURIComponent('034 12 345'), null, A);
check('⑯b phone: the old space-separated writing', ids(ph3).includes(PH.id));
const ph4 = await call('GET', '/patients?q=' + encodeURIComponent('999 99 999 99'), null, A);
check('⑯b phone: another number does not match', ph4.status === 200 && !ids(ph4).includes(PH.id));

// ── ④ same-day second visit: warn (409) unless confirmed ──
const P2 = (await call('POST', '/patients', { last_name: 'Duplicate', first_name: 'Day' + Date.now() }, A)).data;
const d1 = await call('POST', '/visits', { patient_id: P2.id, visit_type: 'newVisit', department_id: DEPT }, A);
const d2 = await call('POST', '/visits', { patient_id: P2.id, visit_type: 'newVisit', department_id: DEPT }, A);
const d3 = await call('POST', '/visits', { patient_id: P2.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, A);
check('④ first visit today is registered', d1.status === 201, { status: d1.status });
check('④ second visit without confirmation → 409', d2.status === 409 && d2.data.error === 'Patient already registered today', { status: d2.status, data: d2.data });
check('④ second visit confirmed (allow_duplicate) → 201', d3.status === 201, { status: d3.status });
for (const v of [d1.data, d3.data]) if (v && v.id) await call('PUT', '/visits/' + v.id + '/status', { status: 'cancelled' }, A);
const d4 = await call('POST', '/visits', { patient_id: P2.id, visit_type: 'newVisit', department_id: DEPT }, A);
check('④ only cancelled visits today → no warning', d4.status === 201, { status: d4.status });
if (d4.data && d4.data.id) await call('PUT', '/visits/' + d4.data.id + '/status', { status: 'cancelled' }, A);

// ── ⑯ patient search: either name order, % and _ literal, limit read as a number ──
const byName = (await call('GET', '/patients?q=' + encodeURIComponent('Test Permission'), null, A));
check('⑯ search "first last" order finds the patient', ids(byName).includes(P.id), { status: byName.status });
const byName2 = (await call('GET', '/patients?q=' + encodeURIComponent('permission   test'), null, A));
check('⑯ search "last first", case and extra spaces ignored', ids(byName2).includes(P.id));
const under = await call('GET', '/patients?q=_', null, A);
check('⑯ "_" is a character, not "any letter"', under.status === 200 && !ids(under).includes(P.id));
const pct = await call('GET', '/patients?q=' + encodeURIComponent('%'), null, A);
check('⑯ "%" is a character, not "anything"', pct.status === 200 && !ids(pct).includes(P.id));
const badLimit = await call('GET', '/patients?q=Permission&limit=abc&offset=-5', null, A);
check('⑯ limit/offset that are not numbers fall back to the defaults', badLimit.status === 200 && ids(badLimit).includes(P.id), { status: badLimit.status });
const one = await call('GET', '/patients?limit=1', null, A);
check('⑯ limit=1 returns at most one', one.status === 200 && one.data.length <= 1);
const huge = await call('GET', '/patients?limit=100000', null, A);
check('⑯ limit is capped at 200', huge.status === 200 && huge.data.length <= 200);

// ── ⑩ work date: /visits/day answers with the day it shows and the server's today ──
const wd0 = await call('GET', '/visits/day', null, A);
check('⑩ /visits/day without a date is today', wd0.status === 200 && wd0.data.date === wd0.data.today && /^\d{4}-\d{2}-\d{2}$/.test(wd0.data.today) && Array.isArray(wd0.data.visits), { status: wd0.status, date: wd0.data && wd0.data.date });
check('⑩ today\'s list carries visit_date and has_active_bill', wd0.data.visits.every(v => String(v.visit_date).slice(0, 10) === wd0.data.today && 'has_active_bill' in v));
const y = new Date(wd0.data.today + 'T00:00:00'); y.setDate(y.getDate() - 1);
const yd = y.toLocaleDateString('en-CA');
const wd1 = await call('GET', '/visits/day?date=' + yd, null, A);
check('⑩ /visits/day?date=yesterday shows that day and still says what today is', wd1.status === 200 && wd1.data.date === yd && wd1.data.today === wd0.data.today && wd1.data.visits.every(v => String(v.visit_date).slice(0, 10) === yd), { date: wd1.data && wd1.data.date });
const wd2 = await call('GET', '/visits/day?date=29-09-2026', null, A);
check('⑩ a date not in YYYY-MM-DD form → 400', wd2.status === 400, { status: wd2.status });

// ── ⑱ chart numbers: this year's prefix, no duplicates when desks create patients at once ──
{
  const yy = wd0.data.today.slice(2, 4);
  const stamp = Date.now();
  const many = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    call('POST', '/patients', { last_name: 'Chart', first_name: 'Race' + stamp + '-' + i, gender: 'M' }, A)));
  const charts = many.map(r => r.data && r.data.chart_no);
  check('⑱ 20 patients created at once: all 201', many.every(r => r.status === 201), { statuses: many.map(r => r.status) });
  check('⑱ numbers carry this year\'s prefix ' + yy + '-', charts.every(c => typeof c === 'string' && c.startsWith(yy + '-')), { sample: charts.slice(0, 3) });
  check('⑱ 20 different numbers', new Set(charts).size === 20);
  const nums = charts.map(c => parseInt(String(c).split('-')[1], 10)).sort((a, b) => a - b);
  check('⑱ and consecutive (no gaps between them)', nums[19] - nums[0] === 19, { first: nums[0], last: nums[19] });
  const nextOne = await call('POST', '/patients', { last_name: 'Chart', first_name: 'After' + stamp, gender: 'F' }, A);
  check('⑱ the next patient gets the next number', parseInt(String(nextOne.data.chart_no).split('-')[1], 10) === nums[19] + 1, { chart_no: nextOne.data.chart_no });
}

// ── ⑳ waiting → completed without a consultation becomes "no fee"; in progress → completed keeps its type ──
const P20 = (await call('POST', '/patients', { last_name: 'Complete', first_name: 'Direct' + Date.now(), gender: 'F' }, A)).data;
const W = (await call('POST', '/visits', { patient_id: P20.id, visit_type: 'followUp', department_id: DEPT }, A)).data;
const w2 = await call('PUT', '/visits/' + W.id + '/status', { status: 'completed' }, A);
check('⑳ waiting → completed sets visit_type none', w2.status === 200 && w2.data.visit_type === 'none', { status: w2.status, visit_type: w2.data && w2.data.visit_type });
const I = (await call('POST', '/visits', { patient_id: P20.id, visit_type: 'followUp', department_id: DEPT, allow_duplicate: true }, A)).data;
await call('PUT', '/visits/' + I.id + '/status', { status: 'in_progress' }, A);
const i2 = await call('PUT', '/visits/' + I.id + '/status', { status: 'completed' }, A);
check('⑳ in progress → completed keeps its visit type', i2.status === 200 && i2.data.visit_type === 'followUp', { visit_type: i2.data && i2.data.visit_type });
const back = await call('PUT', '/visits/' + W.id + '/status', { status: 'waiting' }, A);
check('⑳ completed → waiting does not change the type again', back.status === 200 && back.data.visit_type === 'none');
await call('PUT', '/visits/' + W.id + '/status', { status: 'cancelled' }, A);

// ── ⑬ gender and birth date are refused with a clear 400, not a database error ──
const put = body => call('PUT', '/patients/' + P.id, Object.assign({ last_name: 'Permission', first_name: 'Test' }, body), A);
const g = await put({ gender: 'O' });
check('⑬ gender O → 400 "gender must be one of M, F"', g.status === 400 && g.data.error === 'gender must be one of M, F', { status: g.status, data: g.data });
for (const bad of ['2020-02-30', '1990-5-3', '1990-13-01', 'yesterday']) {
  const r = await put({ date_of_birth: bad });
  check('⑬ birth date ' + bad + ' → 400 date_of_birth…', r.status === 400 && String(r.data.error).indexOf('date_of_birth') === 0, { status: r.status, data: r.data });
}
const leap = await put({ date_of_birth: '2024-02-29' });
check('⑬ 2024-02-29 (a leap day) is accepted', leap.status === 200 && leap.data.date_of_birth === '2024-02-29', { status: leap.status });
const newO = await call('POST', '/patients', { last_name: 'Gender', first_name: 'Other', gender: 'O' }, A);
check('⑬ POST with gender O → 400', newO.status === 400, { status: newO.status });
await put({ date_of_birth: null, gender: 'F' });

// ── S1: a permission granted in Settings applies to the same token at once ──
const before = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, T.paymentOnly);
const staffRow = (await call('GET', '/admin/staff', null, A)).data.find(s => s.id === ID.paymentOnly);
await call('PUT', '/admin/staff/' + ID.paymentOnly, { ...staffRow, permissions: ['payment', 'registration'] }, A);
const after = await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, T.paymentOnly);
check('S1 payment-only 403 before registration is ticked', before.status === 403, { status: before.status });
check('S1 same token allowed right after ticking registration', after.status === 201, { status: after.status });
await call('PUT', '/admin/staff/' + ID.paymentOnly, { ...staffRow, permissions: ['payment'] }, A);

// ── Transfer: PUT /visits/:id/transfer (2026-09-30, the office manager's request) ──
// Who may: registration or consultation. Refusals carry a code. One change-log line per
// move; reception's own PUT /:id writes the same line when department/doctor change.
const depts = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false);
if (depts.length < 2) throw new Error('need two active departments for the transfer checks');
const [DA, DB] = depts;
const PT = (await call('POST', '/patients', { last_name: 'Transfer', first_name: 'T' + Date.now(), gender: 'M' }, A)).data;
const VT = (await call('POST', '/visits', { patient_id: PT.id, visit_type: 'newVisit', department_id: DA.id }, A)).data;
const tr = (who, body, id) => call('PUT', '/visits/' + (id || VT.id) + '/transfer', body, T[who] || who);
// Each allowed account moves the visit to the other department, so every call is a change.
let cur = DA.id;
for (const who of Object.keys(T)) {
  const next = cur === DA.id ? DB.id : DA.id;
  const r = await tr(who, { department_id: next, doctor_id: null });
  const may = permsOf(who).some(x => x === 'registration' || x === 'consultation');
  if (may) { check('transfer ' + who.padEnd(11) + ' → allowed', r.status === 200, r.status === 200 ? undefined : { status: r.status, data: r.data }); if (r.status === 200) cur = next; }
  else check('transfer ' + who.padEnd(11) + ' → 403', r.status === 403, { status: r.status });
}
const toDoc = await tr(A, { department_id: DA.id === cur ? DB.id : DA.id, doctor_id: ID.doctor, reason: 'test reason' });
check('transfer answers the queue row (dept_code, doctor_name)', toDoc.status === 200 && toDoc.data.dept_code && toDoc.data.doctor_name === 'RC doctor', { status: toDoc.status, data: toDoc.data && { dept_code: toDoc.data.dept_code, doctor_name: toDoc.data.doctor_name } });
if (toDoc.status === 200) cur = toDoc.data.department_id;
const same = await tr(A, { department_id: cur, doctor_id: ID.doctor });
check('transfer to the same department and doctor → 400 NO_CHANGE', same.status === 400 && same.data.code === 'NO_CHANGE', { status: same.status, data: same.data });
const badDept = await tr(A, { department_id: 999999, doctor_id: null });
check('transfer to a department that does not exist → 400 BAD_DEPARTMENT', badDept.status === 400 && badDept.data.code === 'BAD_DEPARTMENT', { status: badDept.status, data: badDept.data });
const noDept = await tr(A, { department_id: null, doctor_id: ID.doctor });
check('transfer without a department → 400 BAD_DEPARTMENT', noDept.status === 400 && noDept.data.code === 'BAD_DEPARTMENT', { status: noDept.status });
const notDoc = await tr(A, { department_id: cur, doctor_id: ID.nurse });
check('transfer to an account that is not a doctor → 400 BAD_DOCTOR', notDoc.status === 400 && notDoc.data.code === 'BAD_DOCTOR', { status: notDoc.status, data: notDoc.data });
const textDoc = await tr(A, { department_id: cur, doctor_id: 'abc' });
check('transfer with doctor_id "abc" → 400 BAD_DOCTOR', textDoc.status === 400 && textDoc.data.code === 'BAD_DOCTOR', { status: textDoc.status });
const missing = await tr(A, { department_id: cur, doctor_id: null }, 99999999);
check('transfer of a visit that does not exist → 404 VISIT_NOT_FOUND', missing.status === 404 && missing.data.code === 'VISIT_NOT_FOUND', { status: missing.status, data: missing.data });
const VC = (await call('POST', '/visits', { patient_id: PT.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
await call('PUT', '/visits/' + VC.id + '/status', { status: 'cancelled' }, A);
const canc = await tr(A, { department_id: DB.id, doctor_id: null }, VC.id);
check('transfer of a cancelled visit → 409 VISIT_CANCELLED', canc.status === 409 && canc.data.code === 'VISIT_CANCELLED', { status: canc.status, data: canc.data });
// The change log: one visit.transfer line per move, with the reason.
const logOf = async () => { const r = await call('GET', '/admin/audit?action=visit.transfer&patient=' + encodeURIComponent(PT.last_name), null, A); const rows = Array.isArray(r.data) ? r.data : (r.data.rows || r.data.items || []); return rows.filter(x => String(x.visit_id) === String(VT.id)); };
const lines = await logOf();
const moves = Object.keys(T).filter(w => permsOf(w).some(x => x === 'registration' || x === 'consultation')).length + 1;
check('change log: one visit.transfer line per move (' + moves + ')', lines.length === moves, { lines: lines.length });
check('change log: the reason is kept', lines.some(x => JSON.stringify(x.after_value || x.after || {}).indexOf('test reason') >= 0));
// Reception's form (PUT /:id): a doctor change writes the same line; saving unchanged writes none.
await call('PUT', '/visits/' + VT.id, { department_id: cur, doctor_id: null, chief_complaint: 'form save' }, A);
await call('PUT', '/visits/' + VT.id, { department_id: cur, doctor_id: null, chief_complaint: 'form save again' }, A);
const lines2 = await logOf();
check('PUT /:id changing the doctor writes one more line, an unchanged save none', lines2.length === moves + 1, { lines: lines2.length });
// The paid-visit refusal of PUT /:id (409 VISIT_BILLED) needs a bill row - checked on the
// isolated stack with a DB script (the project notes 4절). Its 404 carries a code too.
const formMissing = await call('PUT', '/visits/99999999', { chief_complaint: 'x' }, A);
check('PUT /:id of a visit that does not exist → 404 VISIT_NOT_FOUND', formMissing.status === 404 && formMissing.data.code === 'VISIT_NOT_FOUND', { status: formMissing.status, data: formMissing.data });
await call('PUT', '/visits/' + VT.id + '/status', { status: 'cancelled' }, A);

// ── One field (2026-10-01): reception's memo is the visit's complaint. reception_memo is no
// longer written; a screen from before the update that still sends it loses nothing. ──
const PM = (await call('POST', '/patients', { last_name: 'Memo', first_name: 'M' + Date.now(), gender: 'M' }, A)).data;
const m1 = await call('POST', '/visits', { patient_id: PM.id, visit_type: 'newVisit', department_id: DEPT, chief_complaint: 'Toux\nFièvre depuis 3 jours' }, T.frontdesk);
check('memo: several lines are kept as typed, reception_memo stays empty', m1.status === 201 && m1.data.chief_complaint === 'Toux\nFièvre depuis 3 jours' && m1.data.reception_memo == null, { status: m1.status, cc: m1.data.chief_complaint, memo: m1.data.reception_memo });
const m2 = await call('POST', '/visits', { patient_id: PM.id, visit_type: 'newVisit', department_id: DEPT, chief_complaint: 'Toux', reception_memo: 'Payer demain', allow_duplicate: true }, T.frontdesk);
check('memo: an old screen sending both (POST) → memo appended to the complaint', m2.status === 201 && m2.data.chief_complaint === 'Toux\nPayer demain' && m2.data.reception_memo == null, { cc: m2.data.chief_complaint, memo: m2.data.reception_memo });
const m3 = await call('PUT', '/visits/' + m2.data.id, { chief_complaint: 'Toux', reception_memo: 'Payer demain' }, T.frontdesk);
const m4 = await call('PUT', '/visits/' + m2.data.id, { chief_complaint: 'Toux\nPayer demain', reception_memo: 'Payer demain' }, T.frontdesk);
check('memo: … and the same save again (PUT) does not add the line twice', m3.status === 200 && m3.data.chief_complaint === 'Toux\nPayer demain' && m4.data.chief_complaint === 'Toux\nPayer demain' && m4.data.reception_memo == null, { m3: m3.data.chief_complaint, m4: m4.data.chief_complaint });
const m5 = await call('PUT', '/visits/' + m1.data.id, { reception_memo: 'Rappeler la famille' }, T.frontdesk);
const m6 = await call('PUT', '/visits/' + m1.data.id, { reception_memo: 'Rappeler la famille' }, T.frontdesk);
check('memo: reception_memo sent alone is appended to the stored complaint, once', m5.status === 200 && m5.data.chief_complaint === 'Toux\nFièvre depuis 3 jours\nRappeler la famille' && m6.data.chief_complaint === m5.data.chief_complaint && m6.data.reception_memo == null, { m5: m5.data.chief_complaint, m6: m6.data.chief_complaint });
const mDay = (await call('GET', '/visits/day', null, A)).data.visits.find(v => v.id === m1.data.id);
const mToday = (await call('GET', '/visits/today', null, A)).data.find(v => v.id === m1.data.id);
const mList = (await call('GET', '/visits/patient/' + PM.id, null, A)).data.find(v => v.id === m1.data.id);
check('memo: /visits/day, /visits/today and /visits/patient/:id all give the text in chief_complaint', [mDay, mToday, mList].every(v => v && v.chief_complaint === m5.data.chief_complaint), { day: mDay && mDay.chief_complaint, today: mToday && mToday.chief_complaint, list: mList && mList.chief_complaint });
for (const v of [m1.data, m2.data]) await call('PUT', '/visits/' + v.id + '/status', { status: 'cancelled' }, A);

// ── Status buttons judge by what the visit holds (2026-10-01, with the consultation session's
// consult.visit.js). A started consultation with nothing written is "empty"; a vital sign,
// a document, a finished consultation... is a record. ──
const PS = (await call('POST', '/patients', { last_name: 'Status', first_name: 'S' + Date.now(), gender: 'F' }, A)).data;
const sv = async (type) => (await call('POST', '/visits', { patient_id: PS.id, visit_type: type || 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
const st = (id, status, who) => call('PUT', '/visits/' + id + '/status', { status }, who || T.frontdesk);
const start = async (v) => (await call('POST', '/consultations', { visit_id: v.id, patient_id: PS.id, department_id: DA.id }, A)).data;
const consultOf = async (v) => (await call('GET', '/consultations/visit/' + v.id, null, A)).data.consultation;   // null when none
// (A) in consultation with a vital sign: not back to waiting, and so never cancelled.
const VA = await sv(); const cA = await start(VA);
await call('PUT', '/consultations/' + cA.id, { bp_systolic: 120 }, A);
const a1 = await st(VA.id, 'waiting');
check('status (A) in consultation with a record → back to waiting refused, 409 VISIT_HAS_RECORDS', a1.status === 409 && a1.data.code === 'VISIT_HAS_RECORDS' && a1.data.error === 'The visit has records; it cannot go back to waiting', { status: a1.status, data: a1.data });
const a2 = await st(VA.id, 'cancelled');
check('status (A) … and cancelling it → 409 VISIT_NOT_WAITING (same message as before)', a2.status === 409 && a2.data.code === 'VISIT_NOT_WAITING' && a2.data.error === 'Only a waiting visit can be cancelled', { status: a2.status, data: a2.data });
// (C) in consultation → completed from reception finishes the consultation as Terminé does.
const a3 = await st(VA.id, 'completed');
const cA2 = await consultOf(VA);
check('status (C) in consultation → completed: type kept, consultation completed with completed_at', a3.status === 200 && a3.data.visit_type === 'newVisit' && a3.data.has_records === true && cA2 && cA2.status === 'completed' && !!cA2.completed_at, { status: a3.status, visit_type: a3.data && a3.data.visit_type, consultation: cA2 && { status: cA2.status, completed_at: cA2.completed_at } });
const a4 = await st(VA.id, 'waiting');
check('status: a visit the doctor finished → back to waiting refused', a4.status === 409 && a4.data.code === 'VISIT_HAS_RECORDS', { status: a4.status, data: a4.data });
// Started, nothing written: goes back to waiting and the empty consultation row is gone.
const VE = await sv(); await start(VE);
const e1 = await st(VE.id, 'waiting');
const cE = await consultOf(VE);
check('status: started but empty → back to waiting, empty consultation row deleted', e1.status === 200 && e1.data.status === 'waiting' && e1.data.has_records === false && !(cE && cE.id), { status: e1.status, consultation: cE && cE.id });
const e2 = await st(VE.id, 'cancelled');
check('status: … and then cancelled', e2.status === 200 && e2.data.status === 'cancelled', { status: e2.status, data: e2.data && e2.data.code });
// Started, nothing written, completed from reception: the doctor did see the patient.
const VF = await sv('followUp'); await start(VF);
const f1 = await st(VF.id, 'completed');
const cF = await consultOf(VF);
check('status: started but empty → completed keeps the type and finishes the consultation', f1.status === 200 && f1.data.visit_type === 'followUp' && cF && cF.status === 'completed', { visit_type: f1.data && f1.data.visit_type, consultation: cF && cF.status });
// (B) waiting, but with a record (a document issued without starting): completing keeps the fee type; cancelling is refused.
const VB = await sv();
const docB = await call('POST', '/documents', { template_code: 'certificate', template_name: 'Certificat médical', patient_id: PS.id, visit_id: VB.id, payload: {} }, A);
const b0 = await st(VB.id, 'cancelled');
// (Issuing a document is about to move a waiting visit to "in consultation" - consultation
// session, coordinator's decision. The cancel is refused either way; only the code differs.)
check('status (A′) a visit with a document → cancel refused (409 VISIT_HAS_RECORDS, or VISIT_NOT_WAITING once the document starts the visit)', docB.status === 201 && b0.status === 409 && (b0.data.code === 'VISIT_HAS_RECORDS' || b0.data.code === 'VISIT_NOT_WAITING'), { doc: docB.status, status: b0.status, data: b0.data });
const b1 = await st(VB.id, 'completed');
check('status (B) waiting with a record → completed keeps visit_type (not none)', b1.status === 200 && b1.data.visit_type === 'newVisit' && b1.data.has_records === true, { status: b1.status, visit_type: b1.data && b1.data.visit_type });
// No consultation at all: unchanged behaviour, and the mistake can be undone.
const VN = await sv();
const n1 = await st(VN.id, 'completed');
const n2 = await st(VN.id, 'waiting');
const n3 = await st(VN.id, 'cancelled');
check('status: nothing recorded → completed is "no fee", back to waiting and cancel still work', n1.status === 200 && n1.data.visit_type === 'none' && n1.data.has_records === false && n2.status === 200 && n3.status === 200, { n1: n1.status, type: n1.data && n1.data.visit_type, n2: n2.status, n3: n3.status });
// The general save is no longer a way around these rules.
const VS = await sv();
const s1 = await call('PUT', '/visits/' + VS.id, { status: 'cancelled' }, T.frontdesk);
const s2 = await call('PUT', '/visits/' + VS.id, { status: null, chief_complaint: 'x' }, T.frontdesk);
check('PUT /:id with a status → 400 STATUS_NOT_HERE; status null is still "unchanged"', s1.status === 400 && s1.data.code === 'STATUS_NOT_HERE' && s2.status === 200 && s2.data.status !== 'cancelled', { s1: s1.status, data: s1.data, s2: s2.status });
const missS = await st(99999999, 'waiting');
check('PUT /:id/status of a visit that does not exist → 404 VISIT_NOT_FOUND', missS.status === 404 && missS.data.code === 'VISIT_NOT_FOUND', { status: missS.status });
await st(VS.id, 'cancelled', A);

// ── Vital signs typed at reception or on a phone (clinic manager, 2026-11-09): PUT/GET
// /visits/:id/vitals. Reception (registration) may, the doctor's screen finds them on the
// visit's one consultation row, and typing them starts nothing. ──
const PV = (await call('POST', '/patients', { last_name: 'Vitals', first_name: 'V' + Date.now(), gender: 'F' }, A)).data;
const VV = (await call('POST', '/visits', { patient_id: PV.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
const vitals1 = { bp_systolic: 120, bp_diastolic: 80, temperature: 36.5, pulse: 72, spo2: 98, respiratory_rate: 16, weight: 61.5, height: 158 };
const g0 = await call('GET', '/visits/' + VV.id + '/vitals', null, T.frontdesk);
check('vitals: GET before anything typed → 200, all empty, no consultation row', g0.status === 200 && g0.data.consultation_id === null && g0.data.temperature === null && g0.data.visit_status === 'waiting', { status: g0.status, data: g0.data });
const v1 = await call('PUT', '/visits/' + VV.id + '/vitals', vitals1, T.frontdesk);
const visAfter = (await call('GET', '/visits/today', null, A)).data.find(v => v.id === VV.id);
check('vitals: frontdesk PUT on a waiting visit → 200, vitals_by_name set', v1.status === 200 && v1.data.vitals_by_name === 'RC frontdesk' && !!v1.data.vitals_at && !!v1.data.consultation_id, { status: v1.status, data: v1.data });
check('vitals: … the visit is still waiting (the consultation is not started)', v1.data.visit_status === 'waiting' && visAfter && visAfter.status === 'waiting', { status: visAfter && visAfter.status });
check('vitals: … /visits/today carries vitals_at for the ✓', visAfter && !!visAfter.vitals_at);
const cV = await consultOf(VV);
check('vitals: … the consultation row exists with the values', cV && cV.id === v1.data.consultation_id && cV.bp_systolic === 120 && cV.bp_diastolic === 80 && Number(cV.temperature) === 36.5 && cV.pulse === 72 && cV.spo2 === 98 && cV.respiratory_rate === 16 && Number(cV.weight) === 61.5 && Number(cV.height) === 158, { consultation: cV });
const v2 = await call('PUT', '/visits/' + VV.id + '/vitals', { ...vitals1, temperature: '36.5' }, T.frontdesk);
check('vitals: the same values again → vitals_at unchanged', v2.status === 200 && v2.data.vitals_at === v1.data.vitals_at, { a: v1.data.vitals_at, b: v2.data.vitals_at });
const v3 = await call('PUT', '/visits/' + VV.id + '/vitals', { temperature: '37,2' }, T.nurse);
check('vitals: nurse (registration) changes one field, comma decimal → 200, others kept, vitals_by is the nurse', v3.status === 200 && Number(v3.data.temperature) === 37.2 && v3.data.pulse === 72 && v3.data.vitals_by_name === 'RC nurse' && v3.data.vitals_at !== v1.data.vitals_at, { status: v3.status, data: v3.data });
const bad1 = await call('PUT', '/visits/' + VV.id + '/vitals', { pulse: 'abc' }, T.frontdesk);
const bad2 = await call('PUT', '/visits/' + VV.id + '/vitals', { temperature: 365 }, T.frontdesk);
const bad3 = await call('PUT', '/visits/' + VV.id + '/vitals', { spo2: 97.5 }, T.frontdesk);
check('vitals: not a number / out of range / not whole → 400 naming the field', bad1.status === 400 && /^pulse /.test(bad1.data.error) && bad2.status === 400 && /^temperature /.test(bad2.data.error) && bad3.status === 400 && /^spo2 /.test(bad3.data.error), { bad1: bad1.data, bad2: bad2.data, bad3: bad3.data });
// The doctor's screen: opening reads the same row; starting finds it (no second row) and takes it over.
const dOpen = await call('GET', '/consultations/visit/' + VV.id, null, T.doctor);
check('vitals: the doctor opening the visit (GET /consultations/visit/:id) sees the same values and who typed them', dOpen.status === 200 && dOpen.data.visit_status === 'waiting' && dOpen.data.consultation && dOpen.data.consultation.id === v1.data.consultation_id && Number(dOpen.data.consultation.temperature) === 37.2 && dOpen.data.consultation.bp_systolic === 120 && dOpen.data.consultation.vitals_by_name === 'RC nurse', { status: dOpen.status, data: dOpen.data && dOpen.data.consultation });
const dStart = await call('POST', '/consultations', { visit_id: VV.id, patient_id: PV.id, department_id: DA.id }, T.doctor);
const dAfter = await call('GET', '/consultations/visit/' + VV.id, null, T.doctor);
check('vitals: the doctor\'s start returns the SAME row (no second consultation) and puts the visit in consultation', dStart.status === 200 && dStart.data.id === v1.data.consultation_id && dAfter.data.visit_status === 'in_progress' && Number(dStart.data.weight) === 61.5, { status: dStart.status, id: dStart.data && dStart.data.id, want: v1.data.consultation_id, visit: dAfter.data.visit_status });
check('vitals: … and the doctor takes the row over from reception (doctor_id)', dStart.data.doctor_id === ID.doctor && dStart.data.opened_by_name === 'RC doctor', { doctor_id: dStart.data.doctor_id, opened_by: dStart.data.opened_by_name });
const v4 = await call('PUT', '/visits/' + VV.id + '/vitals', { pulse: 80 }, T.frontdesk);
check('vitals: reception may still correct them while the visit is in consultation', v4.status === 200 && v4.data.pulse === 80 && v4.data.visit_status === 'in_progress', { status: v4.status, data: v4.data });
// Refusals.
const VX = (await call('POST', '/visits', { patient_id: PV.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
// Any signed-in, active member of staff may (clinic manager, 2026-11-09): no module permission needed.
const VO = (await call('POST', '/visits', { patient_id: PV.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
const anyOk = [];
for (const who of ['paymentOnly', 'statsOnly', 'lab', 'pharmacy']) {
  const put = await call('PUT', '/visits/' + VO.id + '/vitals', { pulse: 60 + anyOk.length }, T[who]);
  const get = await call('GET', '/visits/' + VO.id + '/vitals', null, T[who]);
  const list = await call('GET', '/visits/today/vitals-list', null, T[who]);
  anyOk.push({ who, put: put.status, get: get.status, list: list.status, row: Array.isArray(list.data) && list.data.some(v => v.id === VO.id && v.chart_no && 'vitals_at' in v && 'reception_time' in v) });
}
check('vitals: accounts without reception/consultation (payment only, stats only, lab, pharmacy) → 200 on GET, PUT and the phone list', anyOk.every(x => x.put === 200 && x.get === 200 && x.list === 200 && x.row), anyOk);
const lst = (await call('GET', '/visits/today/vitals-list', null, T.statsOnly)).data;
check('vitals: the phone list holds waiting and in-consultation visits only, with vitals_at', lst.some(v => v.id === VO.id && v.status === 'waiting' && !!v.vitals_at) && lst.some(v => v.id === VV.id && v.status === 'in_progress') && lst.every(v => ['registered', 'waiting', 'in_progress'].includes(v.status)), { n: lst.length });
const noTok1 = await call('PUT', '/visits/' + VO.id + '/vitals', vitals1);
const noTok2 = await call('GET', '/visits/today/vitals-list');
// An account switched off after signing in: its token is refused at once (S1).
const offLogin = 'rct_vitals_off';
const offPw = pw();
const offOld = staffList.find(s => s.login_id === offLogin);
const offId = offOld ? offOld.id : (await call('POST', '/admin/staff', { login_id: offLogin, password: offPw, name: 'RC vitals off', role: 'frontdesk', permissions: ['registration'], status: 'active' }, A)).data.id;
if (offOld) await call('PUT', '/admin/staff/' + offId, { ...offOld, password: offPw, status: 'active' }, A);
const offTok = (await call('POST', '/auth/login', { login_id: offLogin, password: offPw })).data.token;
const offStaff = (await call('GET', '/admin/staff', null, A)).data.find(s => s.id === offId);
await call('PUT', '/admin/staff/' + offId, { ...offStaff, status: 'inactive' }, A);
const off1 = await call('PUT', '/visits/' + VO.id + '/vitals', vitals1, offTok);
const off2 = await call('GET', '/visits/today/vitals-list', null, offTok);
check('vitals: no token, or an inactive account → 401', noTok1.status === 401 && noTok2.status === 401 && !!offTok && off1.status === 401 && off2.status === 401, { noTok: [noTok1.status, noTok2.status], inactive: [off1.status, off2.status] });
await call('PUT', '/visits/' + VO.id + '/status', { status: 'completed' }, A);
const empty = await call('PUT', '/visits/' + VX.id + '/vitals', { temperature: null }, T.frontdesk);
check('vitals: only empty fields on a visit with no row → 200 and no empty consultation row made', empty.status === 200 && empty.data.consultation_id === null && !(await consultOf(VX)), { data: empty.data });
// ── 1.7.9: the row the vitals route makes is vitals_only - not a consultation (on site,
// 1.7.8 showed "2026-11-09 Bethesda —" in the history and refused the cancel). ──
const histIds = async () => { const h = await call('GET', '/patients/' + PV.id + '/history', null, T.frontdesk); return Array.isArray(h.data) ? h.data.map(x => x.id) : null; };
await call('PUT', '/visits/' + VX.id + '/vitals', { pulse: 70 }, A);   // the admin account, as on site
const cVX = await consultOf(VX);
const hVX = await histIds();
check('vitals-only: the row is marked vitals_only, holds the entering account, and is absent from the patient history', cVX && cVX.vitals_only === true && cVX.status === 'in_progress' && hVX && !hVX.includes(cVX.id), { consultation: cVX && { id: cVX.id, vitals_only: cVX.vitals_only }, history: hVX });
const cx1 = await st(VX.id, 'cancelled');
// A cancelled visit cannot be opened (409): bring it back to waiting to look, then cancel again.
await st(VX.id, 'waiting');
const cVX2 = await call('GET', '/consultations/visit/' + VX.id, null, A);
await st(VX.id, 'cancelled');
check('vitals-only: the waiting visit can still be cancelled (200) and the vitals-only row is deleted', cx1.status === 200 && cx1.data.status === 'cancelled' && cx1.data.has_records === false && cVX2.data && cVX2.data.consultation === null, { cx1: cx1.status, data: cx1.data && cx1.data.code, consultation: cVX2.data && cVX2.data.consultation && cVX2.data.consultation.id });
// Once a doctor writes (a note here), it is a consultation: flag cleared, the doctor's, in the history, and the 409 rule is back.
const VN2 = (await call('POST', '/visits', { patient_id: PV.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
await call('PUT', '/visits/' + VN2.id + '/vitals', { temperature: 38.1 }, T.frontdesk);
const open2 = await call('GET', '/consultations/visit/' + VN2.id, null, T.doctor);
const cid2 = open2.data && open2.data.consultation && open2.data.consultation.id;
check('vitals-only: the doctor opening the visit gets the vitals (flag still set, visit still waiting)', !!cid2 && Number(open2.data.consultation.temperature) === 38.1 && open2.data.consultation.vitals_only === true && open2.data.visit_status === 'waiting', { data: open2.data && open2.data.consultation });
const note2 = await call('PUT', '/consultations/' + cid2 + '/note', { note_text: 'Fièvre, vu.' }, T.doctor);
const after2 = (await call('GET', '/consultations/visit/' + VN2.id, null, T.doctor)).data;
const hN2 = await histIds();
check('vitals-only: after the doctor saves a note → vitals_only false, doctor_id the doctor, in the history', note2.status === 200 && after2.consultation.vitals_only === false && after2.consultation.doctor_id === ID.doctor && after2.consultation.id === cid2 && Number(after2.consultation.temperature) === 38.1 && hN2 && hN2.includes(cid2), { note: note2.status, consultation: after2.consultation && { vitals_only: after2.consultation.vitals_only, doctor_id: after2.consultation.doctor_id }, history: hN2 });
const cx3 = await st(VN2.id, 'cancelled');
check('vitals-only: … and cancelling it is refused again (409)', cx3.status === 409, { status: cx3.status, data: cx3.data });
// The doctor's Terminé on a vitals-only row also makes it the doctor's (and so a record).
const VN3 = (await call('POST', '/visits', { patient_id: PV.id, visit_type: 'newVisit', department_id: DA.id, allow_duplicate: true }, A)).data;
const put3 = await call('PUT', '/visits/' + VN3.id + '/vitals', { pulse: 77 }, T.frontdesk);
const done3 = await call('PUT', '/consultations/' + put3.data.consultation_id + '/complete', {}, T.doctor);
const after3 = (await call('GET', '/consultations/visit/' + VN3.id, null, A)).data;
check('vitals-only: the doctor pressing Terminé clears the flag and takes doctor_id', done3.status === 200 && after3.consultation.vitals_only === false && after3.consultation.doctor_id === ID.doctor && after3.visit_status === 'completed', { done: done3.status, consultation: after3.consultation && { vitals_only: after3.consultation.vitals_only, doctor_id: after3.consultation.doctor_id }, visit: after3.visit_status });
const c404 = await call('PUT', '/visits/' + VX.id + '/vitals', vitals1, T.frontdesk);
const g404 = await call('GET', '/visits/' + VX.id + '/vitals', null, T.frontdesk);
const n404 = await call('PUT', '/visits/99999999/vitals', vitals1, T.frontdesk);
check('vitals: a cancelled visit, or one that does not exist → 404', c404.status === 404 && g404.status === 404 && n404.status === 404, { put: c404.status, get: g404.status, missing: n404.status });
await call('PUT', '/visits/' + VV.id + '/status', { status: 'completed' }, A);

// ── Bug hunt 2026-11-10 (reception round) ──
{   // its own scope: the names below must not meet the ones above
// 1. The patient search ignores accents, as the same-name check does.
const accS = String(Date.now());
const PACC = (await call('POST', '/patients', { last_name: 'Rakotomalala' + accS, first_name: 'Hélène Zoé', gender: 'F' }, A)).data;
const accFind = async q => ((await call('GET', '/patients?q=' + encodeURIComponent(q), null, A)).data || []).some(x => x.id === PACC.id);
check('search: "Helene" finds Hélène (accents ignored)', await accFind('Helene') && await accFind('HELENE ZOE') && await accFind('zoe'));
check('search: full name in either order, without accents', await accFind('Rakotomalala' + accS + ' Helene') && await accFind('helene zoe rakotomalala' + accS));
check('search: with the accents it still finds, and an unrelated word does not', await accFind('Hélène') && !(await accFind('Helena' + accS)));
// 2. POST /patients: '' for the sex or the birth date means "not known", as in PUT.
const emptyG = await call('POST', '/patients', { last_name: 'Vide' + accS, first_name: 'Genre', gender: '', date_of_birth: '' }, A);
check('POST /patients with gender "" and date_of_birth "" → created, both null', emptyG.status === 201 && emptyG.data.gender === null && emptyG.data.date_of_birth === null, { status: emptyG.status, data: emptyG.data && { gender: emptyG.data.gender, dob: emptyG.data.date_of_birth, error: emptyG.data.error } });
// 3. A visit is registered to a department that is not hidden and, when one is given, an active doctor.
const allDepts = (await call('GET', '/admin/departments?all=1', null, A)).data;
const hideMe = allDepts.filter(d => d.is_active !== false && d.id !== DEPT).slice(-1)[0];
await call('PUT', '/admin/departments/' + hideMe.id, { is_active: false }, A);
const hidPost = await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: hideMe.id }, A);
check('POST /visits to a hidden department → 400 BAD_DEPARTMENT', hidPost.status === 400 && hidPost.data.code === 'BAD_DEPARTMENT', { status: hidPost.status, data: hidPost.data });
await call('PUT', '/admin/departments/' + hideMe.id, { is_active: true }, A);
const BH_VH = (await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: hideMe.id }, A)).data;
await call('PUT', '/admin/departments/' + hideMe.id, { is_active: false }, A);
const hidKeep = await call('PUT', '/visits/' + BH_VH.id, { department_id: hideMe.id, doctor_id: null, chief_complaint: 'memo after the department was hidden' }, A);
check('PUT /visits/:id on a visit whose department was hidden later: the same department still saves', hidKeep.status === 200 && hidKeep.data.chief_complaint === 'memo after the department was hidden', { status: hidKeep.status, data: hidKeep.data && hidKeep.data.error });
const BH_VO = (await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, A)).data;
const hidMove = await call('PUT', '/visits/' + BH_VO.id, { department_id: hideMe.id }, A);
check('PUT /visits/:id changing to a hidden department → 400 BAD_DEPARTMENT', hidMove.status === 400 && hidMove.data.code === 'BAD_DEPARTMENT', { status: hidMove.status });
await call('PUT', '/admin/departments/' + hideMe.id, { is_active: true }, A);
const notDoc = await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: DEPT, doctor_id: ID.frontdesk, allow_duplicate: true }, A);
check('POST /visits with a doctor_id that is not a doctor → 400 BAD_DOCTOR', notDoc.status === 400 && notDoc.data.code === 'BAD_DOCTOR', { status: notDoc.status, data: notDoc.data });
const txtDoc = await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: DEPT, doctor_id: 'abc', allow_duplicate: true }, A);
const okDoc = await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: DEPT, doctor_id: ID.doctor, allow_duplicate: true }, A);
const noDocE = await call('POST', '/visits', { patient_id: PACC.id, visit_type: 'newVisit', department_id: DEPT, doctor_id: '', allow_duplicate: true }, A);
check('POST /visits: doctor_id "abc" → 400 BAD_DOCTOR; an active doctor → 201; "" → 201 without a doctor', txtDoc.status === 400 && txtDoc.data.code === 'BAD_DOCTOR' && okDoc.status === 201 && okDoc.data.doctor_id === ID.doctor && noDocE.status === 201 && noDocE.data.doctor_id === null, { txt: txtDoc.status, ok: okDoc.status, empty: noDocE.status });
const putBadDoc = await call('PUT', '/visits/' + BH_VO.id, { doctor_id: ID.frontdesk }, A);
const putSameDoc = await call('PUT', '/visits/' + okDoc.data.id, { doctor_id: ID.doctor, chief_complaint: 'same doctor' }, A);
check('PUT /visits/:id: changing to a non-doctor → 400 BAD_DOCTOR; re-sending the stored doctor → 200', putBadDoc.status === 400 && putBadDoc.data.code === 'BAD_DOCTOR' && putSameDoc.status === 200, { bad: putBadDoc.status, same: putSameDoc.status });
for (const v of [BH_VH, BH_VO, okDoc.data, noDocE.data]) await call('PUT', '/visits/' + v.id + '/status', { status: 'cancelled' }, A);
}

// Leave no queue behind: cancel the visits this run created.
const today = (await call('GET', '/visits/today', null, A)).data;
for (const v of today.filter(v => v.patient_id === P.id && (v.status === 'waiting' || v.status === 'registered'))) {
  await call('PUT', '/visits/' + v.id + '/status', { status: 'cancelled' }, A);
}

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
