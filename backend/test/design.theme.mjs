// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 직원을 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// /api/theme (design session, migration 037): the screen an account chose.
//  1. Only when signed in.
//  2. A new account starts dark.
//  3. Only 'dark', 'light' and 'paper' are stored; anything else is 400 and changes nothing.
//  4. One's own account only: an id in the request is ignored, another account is untouched.
//  5. Nothing is written to the change log.
//  6. What /admin/staff answers (reported, not judged - see the hand-off note).
//
//   DS_TEST_LOGIN=admin DS_TEST_PASSWORD=... node backend/test/design.theme.mjs
//   DS_TEST_BASE=http://127.0.0.1:9189/api  (default)
// Needs Node 18+ (global fetch). Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.DS_TEST_BASE || 'http://127.0.0.1:9189/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
async function call(method, p, body, token) {
  const r = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; }

if (!process.env.DS_TEST_LOGIN || !process.env.DS_TEST_PASSWORD) throw new Error('set DS_TEST_LOGIN and DS_TEST_PASSWORD (the isolated stack\'s admin)');
const adminLogin = await call('POST', '/auth/login', { login_id: process.env.DS_TEST_LOGIN, password: process.env.DS_TEST_PASSWORD });
if (adminLogin.status !== 200) throw new Error('admin login failed ' + adminLogin.status);
const A = adminLogin.data.token;

// a second account, new for this run
const login2 = 'dstest' + crypto.randomBytes(3).toString('hex'); const pw2 = crypto.randomBytes(9).toString('base64url');
const made = await call('POST', '/admin/staff', { login_id: login2, password: pw2, name: 'DS Theme Test', role: 'frontdesk' }, A);
check('a second account can be made for the test', made.status === 201, made.status);
const B = (await call('POST', '/auth/login', { login_id: login2, password: pw2 })).data.token;

const auditBefore = await call('GET', '/admin/audit', undefined, A);
const auditCount = d => Array.isArray(d) ? d.length : (d && (d.total != null ? d.total : (d.rows || d.items || []).length));

// 1
check('GET without a token is 401', (await call('GET', '/theme')).status === 401);
check('PUT without a token is 401', (await call('PUT', '/theme', { theme: 'light' })).status === 401);
check('PUT with a broken token is 401', (await call('PUT', '/theme', { theme: 'light' }, 'not-a-token')).status === 401);

// 2
const first = await call('GET', '/theme', undefined, B);
check('a new account starts dark', first.status === 200 && first.data.theme === 'dark', first.data);

// 3
await call('PUT', '/theme', { theme: 'dark' }, A);
for (const bad of [{ theme: 'purple' }, { theme: '' }, { theme: null }, { theme: 1 }, { theme: ['light'] }, { theme: { a: 1 } }, { theme: 'Light' }, { theme: ' light' }, { theme: 'Paper' }, { theme: 'papier' }, {}, { colour: 'light' }]) {
  const r = await call('PUT', '/theme', bad, A);
  check('refused: ' + JSON.stringify(bad), r.status === 400, r.status);
}
check('after the refusals the value is unchanged', (await call('GET', '/theme', undefined, A)).data.theme === 'dark');
const set = await call('PUT', '/theme', { theme: 'light' }, A);
check('light is stored', set.status === 200 && set.data.theme === 'light', set.data);
check('and read back', (await call('GET', '/theme', undefined, A)).data.theme === 'light');
check('a new login reads the same', (await call('GET', '/theme', undefined, (await call('POST', '/auth/login', { login_id: process.env.DS_TEST_LOGIN, password: process.env.DS_TEST_PASSWORD })).data.token)).data.theme === 'light');
const setP = await call('PUT', '/theme', { theme: 'paper' }, A);
check('paper is stored (the check of migration 043 allows it)', setP.status === 200 && setP.data.theme === 'paper', setP.data);
check('and read back', (await call('GET', '/theme', undefined, A)).data.theme === 'paper');
await call('PUT', '/theme', { theme: 'light' }, A);

// 4
check('the other account is untouched', (await call('GET', '/theme', undefined, B)).data.theme === 'dark');
const sneaky = await call('PUT', '/theme', { theme: 'light', id: adminLogin.data.user.id, staff_id: adminLogin.data.user.id, login_id: process.env.DS_TEST_LOGIN }, B);
check('an id in the request is ignored: the sender\'s own account changes', sneaky.status === 200 && (await call('GET', '/theme', undefined, B)).data.theme === 'light');
await call('PUT', '/theme', { theme: 'dark' }, A);
check('... and the named account does not', (await call('GET', '/theme', undefined, A)).data.theme === 'dark' && (await call('GET', '/theme', undefined, B)).data.theme === 'light');
check('an account without any module permission may still choose', sneaky.status === 200);

// 5
const auditAfter = await call('GET', '/admin/audit', undefined, A);
check('nothing about the theme in the change log', JSON.stringify(auditAfter.data).indexOf('theme') < 0 && auditCount(auditAfter.data) - auditCount(auditBefore.data) <= 0, { before: auditCount(auditBefore.data), after: auditCount(auditAfter.data) });

// 6
const staff = await call('GET', '/admin/staff', undefined, A);
const hasTheme = Array.isArray(staff.data) && staff.data.some(s => 'theme' in s);
console.log('NOTE  /admin/staff ' + (hasTheme ? 'NOW CARRIES a "theme" field on each row (it selects s.*)' : 'does not carry a theme field'));
const login = await call('POST', '/auth/login', { login_id: login2, password: pw2 });
console.log('NOTE  /auth/login user ' + ('theme' in (login.data.user || {}) ? 'carries' : 'does not carry') + ' theme; /auth/me ' + ('theme' in ((await call('GET', '/auth/me', undefined, B)).data || {}) ? 'carries' : 'does not carry') + ' theme');

// tidy: the test account is switched off, the admin is left dark
await call('PUT', '/theme', { theme: 'dark' }, A);
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
