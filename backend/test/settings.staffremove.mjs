// Removing for good a staff account that never served (the clinic's manager, 2026-11-10;
// admin.routes.js POST /admin/staff/:id/remove). Run against an ISOLATED stack only - it
// creates and removes staff, and registers a patient:
//
//   SE_ADMIN_PW=... node backend/test/settings.staffremove.mjs     (default http://127.0.0.1:9187)
//
// Checks: administrators only; never one's own account nor the one made at setup; an
// active account is refused (deactivate first); an account with a single record stays;
// an unused one is gone, its login is free again, and the change log says who removed
// what. Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') throw new Error('Refusing to run against ' + BASE);
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW');
async function call(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data; const text = await r.text(); try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let failed = 0;
function check(label, ok, got) { console.log((ok ? '  [ok]   ' : '  [FAIL] ') + label + (ok ? '' : '  -> ' + JSON.stringify(got))); if (!ok) failed++; }
const login = (id, pw) => call('POST', '/auth/login', { login_id: id, password: pw });
const A = (await login('admin', process.env.SE_ADMIN_PW)).data.token;
if (!A) throw new Error('admin login failed');
const tag = crypto.randomBytes(3).toString('hex');
const pw = () => crypto.randomBytes(9).toString('base64url');
const USED = 'This account has been used: it cannot be removed. Leave it deactivated.';
const staffList = async () => (await call('GET', '/admin/staff', null, A)).data;
const me = (await staffList()).find(s => s.login_id === 'admin');
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;

// an account made by mistake: never used (it only logged in once)
const p1 = pw();
const made = (await call('POST', '/admin/staff', { login_id: 'zrm' + tag, password: p1, name: 'Mistake ' + tag, role: 'nurse', permissions: ['consultation'], status: 'active' }, A)).data;
const M = (await login('zrm' + tag, p1)).data.token;
// settings permission without the admin role
const p2 = pw();
await call('POST', '/admin/staff', { login_id: 'zrs' + tag, password: p2, name: 'Settings ' + tag, role: 'frontdesk', permissions: ['registration', 'settings'], status: 'active' }, A);
const S = (await login('zrs' + tag, p2)).data.token;
// an account that worked: it registered a patient and a visit
const p3 = pw();
const worker = (await call('POST', '/admin/staff', { login_id: 'zrw' + tag, password: p3, name: 'Worker ' + tag, role: 'frontdesk', permissions: ['registration'], status: 'active' }, A)).data;
const W = (await login('zrw' + tag, p3)).data.token;
const pat = (await call('POST', '/patients', { last_name: 'Remove' + tag, first_name: 'Test', gender: 'F' }, W)).data;
const vis = await call('POST', '/visits', { patient_id: pat.id, visit_type: 'newVisit', department_id: DEPT }, W);
check('the working account registered a visit', vis.status === 201, vis);

let r = await call('POST', '/admin/staff/' + made.id + '/remove', {}, A);
check('an active account is refused: deactivate first (409)', r.status === 409 && r.data.error === 'Deactivate the account before removing it.', r);
await call('DELETE', '/admin/staff/' + made.id, null, A);
r = await call('POST', '/admin/staff/' + made.id + '/remove', {}, S);
check('settings permission without the admin role -> 403', r.status === 403 && r.data.error === 'Only an administrator can remove a staff account.', r);
r = await call('POST', '/admin/staff/' + me.id + '/remove', {}, A);
check('one\'s own account (and the setup administrator) -> 400', r.status === 400, r);
r = await call('POST', '/admin/staff/999999999/remove', {}, A);
const r404 = await call('POST', '/admin/staff/abc/remove', {}, A);
check('an unknown account, an id that is not a number -> 404', r.status === 404 && r404.status === 404, [r.status, r404.status]);

await call('DELETE', '/admin/staff/' + worker.id, null, A);
r = await call('POST', '/admin/staff/' + worker.id + '/remove', {}, A);
check('an account with a record stays: 409, with where it was used', r.status === 409 && r.data.error === USED && Array.isArray(r.data.places) && r.data.places.includes('visit.registered_by'), r);
check('…and it is still in the list, deactivated', (await staffList()).some(s => s.id === worker.id && s.status === 'inactive'));

r = await call('POST', '/admin/staff/' + made.id + '/remove', {}, A);
check('the unused, deactivated account is removed (200)', r.status === 200 && r.data.success === true, r);
check('it is gone from the list', !(await staffList()).some(s => s.id === made.id));
check('the login it had before no longer opens anything (401)', (await call('GET', '/visits/day', null, M)).status === 401 && (await login('zrm' + tag, p1)).status === 401);
check('a second click finds nothing (404)', (await call('POST', '/admin/staff/' + made.id + '/remove', {}, A)).status === 404);
const log = ((await call('GET', '/admin/audit?action=settings.staff.delete&limit=50', null, A)).data.rows || []).filter(x => String(x.entity_id) === String(made.id));
check('one change-log line: who removed which account', log.length === 1 && log[0].before_value && log[0].before_value.login_id === 'zrm' + tag && log[0].staff_name, log);
const again = await call('POST', '/admin/staff', { login_id: 'zrm' + tag, password: pw(), name: 'Again ' + tag, role: 'nurse', permissions: ['consultation'], status: 'active' }, A);
check('its login is free again', again.status === 201, again);

// tidy: what was made is left deactivated
await call('DELETE', '/admin/staff/' + again.data.id, null, A);
await call('POST', '/admin/staff/' + again.data.id + '/remove', {}, A);
const st = (await staffList()).find(s => s.login_id === 'zrs' + tag);
if (st) await call('DELETE', '/admin/staff/' + st.id, null, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
