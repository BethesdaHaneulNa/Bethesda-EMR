// Bringing a deactivated staff account back (U2, decided 2026-09-29: administrators
// only, logged). Run against an ISOLATED stack only - it creates staff:
//
//   SE_ADMIN_PW=... node backend/test/settings.reactivate.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.reactivate.mjs
//
// Checks: the account comes back as it was (same password and permissions); one change-
// log line status inactive -> active; a second click writes nothing; an account with
// the settings permission but not the admin role is refused, through the button's
// route and through the edit form's PUT alike. Node 18+. Exit code 1 if any check fails.
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
const tag = crypto.randomBytes(3).toString('hex');
const pw = () => crypto.randomBytes(9).toString('base64url');
const linesFor = async (id) => ((await call('GET', '/admin/audit?action=settings.staff.edit&limit=200', null, A)).data.rows || [])
  .filter(x => String(x.entity_id) === String(id));

// The account to deactivate and bring back.
const p1 = pw();
const made = (await call('POST', '/admin/staff', { login_id: 're' + tag, password: p1, name: 'Reactivate ' + tag, role: 'lab', permissions: ['lab', 'stats'], status: 'active' }, A)).data;
// Settings permission without the admin role.
const p2 = pw();
const front = (await call('POST', '/admin/staff', { login_id: 'rf' + tag, password: p2, name: 'Front ' + tag, role: 'frontdesk', permissions: ['registration', 'settings'], status: 'active' }, A)).data;
const F = (await login('rf' + tag, p2)).data.token;

await call('DELETE', '/admin/staff/' + made.id, null, A);
check('deactivated: cannot log in', (await login('re' + tag, p1)).status === 401);

let r = await call('POST', '/admin/staff/' + made.id + '/reactivate', {}, F);
check('settings permission without the admin role -> 403 with the fixed message',
  r.status === 403 && r.data.error === 'Only an administrator can reactivate a staff account.', r);
r = await call('PUT', '/admin/staff/' + made.id, { ...made, status: 'active', password: '' }, F);
check('... and the edit form cannot go round it (PUT status active -> 403)', r.status === 403, r);
r = await call('PUT', '/admin/staff/' + made.id, { ...made, phone: '034 11 111 11', status: 'inactive', password: '' }, F);
check('... while editing the inactive account without reactivating it still works', r.status === 200 && r.data.status === 'inactive', r);
check('still cannot log in after those', (await login('re' + tag, p1)).status === 401);

const before = (await linesFor(made.id)).length;
r = await call('POST', '/admin/staff/' + made.id + '/reactivate', {}, A);
check('an administrator reactivates -> 200', r.status === 200 && r.data.success === true && !r.data.unchanged, r);
const L = await login('re' + tag, p1);
check('logs in with the same password as before', L.status === 200, L.status);
check('same role and permissions as before', L.data.user && L.data.user.role === 'lab' &&
  JSON.stringify(L.data.user.permissions) === JSON.stringify(['lab', 'stats']), L.data.user);
const lines = await linesFor(made.id);
const last = lines[0];
check('one change-log line: status inactive -> active, nothing else',
  lines.length === before + 1 && last.before_value && last.before_value.status === 'inactive' &&
  last.after_value.status === 'active' && Object.keys(last.after_value).length === 1, last);

r = await call('POST', '/admin/staff/' + made.id + '/reactivate', {}, A);
check('a second click: 200, unchanged, no new line', r.status === 200 && r.data.unchanged === true &&
  (await linesFor(made.id)).length === before + 1, r);
r = await call('POST', '/admin/staff/999999999/reactivate', {}, A);
check('unknown account -> 404', r.status === 404, r);
r = await call('POST', '/admin/staff/' + made.id + '/reactivate', {}, L.data.token);
check('without the settings permission -> 403', r.status === 403, r);

// Leave nothing active behind.
await call('DELETE', '/admin/staff/' + made.id, null, A);
await call('DELETE', '/admin/staff/' + front.id, null, A);
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
