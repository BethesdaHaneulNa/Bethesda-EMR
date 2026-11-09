// First setup, login and staff input checks (2026-09-29: S3, S7, S9, S10, U5). Run
// against a FRESH isolated stack (the database has no administrator yet) - it runs the
// first setup itself, twice at once:
//
//   node backend/test/settings.login.mjs          (default http://127.0.0.1:9187)
//
// Keeps the admin password it chose in the OS temp folder, like settings.access.mjs, so
// the other scripts can run afterwards. Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
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

const st = await call('GET', '/auth/setup-status');
if (!st.data || st.data.needsSetup !== true) throw new Error('needs a fresh stack (no administrator yet)');

// ---- S9 + S3: two first-run screens at once, one asking for another login id
const pw1 = crypto.randomBytes(9).toString('base64url'), pw2 = crypto.randomBytes(9).toString('base64url');
const [a, b] = await Promise.all([
  call('POST', '/auth/setup', { login_id: 'boss', password: pw1, name: 'Setup A' }),
  call('POST', '/auth/setup', { login_id: 'chief', password: pw2, name: 'Setup B' }),
]);
const won = [a, b].filter(r => r.status === 200), lost = [a, b].filter(r => r.status === 403);
check('two setups at once: exactly one succeeds, the other is told setup is done', won.length === 1 && lost.length === 1, [a.status, b.status]);
check('the setup account is always "admin", whatever login id was sent', won[0] && won[0].data.user.login_id === 'admin', won[0] && won[0].data.user);
const adminPw = a.status === 200 ? pw1 : pw2;
const tmp = path => os.tmpdir() + '/' + path;
fs.writeFileSync(tmp('bethesda-se-access-9187.json'), JSON.stringify({ admin: adminPw }));
const A = (await login('admin', adminPw)).data.token;
const staff = (await call('GET', '/admin/staff', null, A)).data;
check('one administrator exists afterwards', staff.filter(s => s.role === 'admin').length === 1, staff.map(s => s.login_id));
check('a third setup is refused', (await call('POST', '/auth/setup', { password: 'another1' })).status === 403);

// ---- S7: login answers
check('right password -> 200', (await login('admin', adminPw)).status === 200);
let r = await login('admin', adminPw + 'x');
check('wrong password -> 401 "Invalid credentials"', r.status === 401 && r.data.error === 'Invalid credentials', r);
r = await login('nobody-' + Date.now(), 'x');
check('unknown login -> the same answer', r.status === 401 && r.data.error === 'Invalid credentials', r);
const pwX = crypto.randomBytes(9).toString('base64url');
const x = (await call('POST', '/admin/staff', { login_id: 'lx' + Date.now().toString(36), password: pwX, name: 'Login X', role: 'frontdesk', permissions: ['registration'] }, A)).data;
await call('DELETE', '/admin/staff/' + x.id, null, A);
r = await login(x.login_id, pwX + 'x');
check('inactive account, wrong password -> "Invalid credentials" (does not say the account exists)', r.status === 401 && r.data.error === 'Invalid credentials', r);
r = await login(x.login_id, pwX);
check('inactive account, right password -> "Account is inactive"', r.status === 401 && r.data.error === 'Account is inactive', r);

// ---- S10: staff input
r = await call('POST', '/admin/staff', { login_id: '  spaced' + Date.now().toString(36) + '  ', password: 'p', name: 'Spaced', role: 'lab', permissions: ['lab'] }, A);
check('login id stored without surrounding spaces', r.status === 201 && r.data.login_id === r.data.login_id.trim(), r.data);
const sp = r.data;
check('... and logs in without them', (await login(sp.login_id, 'p')).status === 200);
r = await call('POST', '/admin/staff', { login_id: 'bogus' + Date.now().toString(36), password: 'p', name: 'Bogus', role: 'lab', permissions: ['lab', 'superuser'] }, A);
check('an unknown permission -> 400 naming permissions', r.status === 400 && /^permissions must be one of/.test(r.data.error), r);
r = await call('PUT', '/admin/staff/' + sp.id, { ...sp, login_id: '   ', password: '' }, A);
check('PUT with an empty login id -> 400', r.status === 400 && r.data.error === 'login_id is required', r);
r = await call('PUT', '/admin/staff/' + sp.id, { ...sp, permissions: ['lab', 'nope'], password: '' }, A);
check('PUT with an unknown permission -> 400', r.status === 400, r);

// ---- S9: two demotions at once wait for each other (no error, admin kept)
const mk = async (n) => (await call('POST', '/admin/staff', { login_id: n + Date.now().toString(36), password: 'p', name: n, role: 'admin', permissions: ['settings'] }, A)).data;
const d1 = await mk('dA'), d2 = await mk('dB');
const [p1, p2] = await Promise.all([
  call('PUT', '/admin/staff/' + d1.id, { ...d1, role: 'frontdesk', permissions: ['registration'], password: '' }, A),
  call('PUT', '/admin/staff/' + d2.id, { ...d2, role: 'frontdesk', permissions: ['registration'], password: '' }, A),
]);
check('two demotions at once both finish (they queue on the lock)', p1.status === 200 && p2.status === 200, [p1.status, p2.status]);
check('the setup admin still logs in', (await login('admin', adminPw)).status === 200);

// ---- U5: app title
const clinic = (await call('GET', '/admin/clinic', null, A)).data;
r = await call('PUT', '/admin/clinic', { ...clinic, app_title: 'Bethesda Test' }, A);
check('app title can be changed', r.data.app_title === 'Bethesda Test', r.data);
r = await call('PUT', '/admin/clinic', { ...clinic, app_title: '   ' }, A);
check('an emptied app title goes back to "Bethesda EMR"', r.data.app_title === 'Bethesda EMR', r.data);
const { app_title: _t, ...noTitle } = clinic;
await call('PUT', '/admin/clinic', { ...clinic, app_title: 'Bethesda Test' }, A);
r = await call('PUT', '/admin/clinic', noTitle, A);
check('a save without app_title keeps it', r.data.app_title === 'Bethesda Test', r.data);
await call('PUT', '/admin/clinic', { ...clinic, app_title: 'Bethesda EMR' }, A);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
