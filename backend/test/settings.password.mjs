// A member of staff changes their own password: POST /api/auth/password (decided
// 2026-09-29 - initial password stays, no forced change, no minimum length). Run
// against an ISOLATED stack only - it creates staff:
//
//   SE_ADMIN_PW=... node backend/test/settings.password.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.password.mjs
//
// Checks: the current password is required and checked (a wrong one is 400, never 401,
// which would send the screen to the login page); the old password stops working and
// the new one works; a one-character password is accepted; an account with no
// permissions can do it; one change-log line with no value; an inactive account
// cannot. Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW (and SE_ADMIN_ID if not "admin")');

async function call(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; const text = await r.text(); try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let failed = 0;
function check(label, ok, got) {
  console.log((ok ? '  [ok]   ' : '  [FAIL] ') + label + (ok ? '' : '  -> ' + JSON.stringify(got)));
  if (!ok) failed++;
}
const login = (id, pw) => call('POST', '/auth/login', { login_id: id, password: pw });

const A = (await login(process.env.SE_ADMIN_ID || 'admin', process.env.SE_ADMIN_PW)).data.token;
if (!A) throw new Error('admin login failed');

// A test account with no permissions at all: changing your password needs none.
const id = 'pw' + crypto.randomBytes(3).toString('hex');
const pw1 = crypto.randomBytes(9).toString('base64url');
const pw2 = crypto.randomBytes(9).toString('base64url');
const made = await call('POST', '/admin/staff', { login_id: id, password: pw1, name: 'Password ' + id, role: 'frontdesk', permissions: [], status: 'active' }, A);
if (made.status !== 201) throw new Error('could not create test staff: ' + made.status);
const T = (await login(id, pw1)).data.token;

let r = await call('POST', '/auth/password', { current_password: pw1 + 'x', new_password: pw2 }, T);
check('wrong current password -> 400 (not 401), with the fixed message', r.status === 400 && r.data.error === 'The current password is not correct', r);
check('... and the old password still works', (await login(id, pw1)).status === 200);
r = await call('POST', '/auth/password', { current_password: pw1, new_password: '' }, T);
check('empty new password -> 400', r.status === 400 && r.data.error === 'password is required', r);
r = await call('POST', '/auth/password', { new_password: pw2 }, T);
check('missing current password -> 400', r.status === 400, r);
r = await call('POST', '/auth/password', { current_password: pw1, new_password: pw2 });
check('no token -> 401', r.status === 401, r);

r = await call('POST', '/auth/password', { current_password: pw1, new_password: pw2 }, T);
check('right current password, no permissions needed -> 200', r.status === 200 && r.data.success === true, r);
check('the old password no longer logs in', (await login(id, pw1)).status === 401);
const T2 = (await login(id, pw2)).data.token;
check('the new password logs in', !!T2);
check('the token from before the change still works (other screens are not thrown out)', (await call('GET', '/auth/me', null, T)).status === 200);

r = await call('POST', '/auth/password', { current_password: pw2, new_password: 'z' }, T2);
check('a one-character password is accepted (no minimum length)', r.status === 200, r);
check('... and logs in', (await login(id, 'z')).status === 200);

const log = (await call('GET', '/admin/audit?action=settings.staff.password&limit=200', null, A)).data;
const mine = (log.rows || []).filter(x => String(x.entity_id) === String(made.data.id));   // entity_id is stored as text
check('two changes -> two settings.staff.password lines, written by the person themselves',
  mine.length === 2 && mine.every(x => x.staff_id === made.data.id && x.entity === 'staff'), mine);
check('no refused attempt left a line', mine.length === 2);
const text = JSON.stringify(mine);
check('no password or hash in the lines', mine.every(x => x.before_value === null && x.after_value === null) &&
  ![pw1, pw2, '"z"'].some(p => text.includes(p)) && !/\$2[aby]\$/.test(text), mine);

// Inactive: the server refuses the account on every request (S1), so this cannot run.
await call('DELETE', '/admin/staff/' + made.data.id, null, A);
r = await call('POST', '/auth/password', { current_password: 'z', new_password: pw1 }, T2);
check('an inactive account cannot change it (401 from the session check)', r.status === 401, r);
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
