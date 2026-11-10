// A staff account has a department only when it is a doctor (the clinic's manager, from
// the site, 2026-11-10; admin.routes.js staffDepartment). Run against an ISOLATED stack only:
//
//   SE_ADMIN_PW=... node backend/test/settings.staffdept.mjs     (default http://127.0.0.1:9187)
//
// Checks: a doctor is refused without a department (POST and PUT) and with a hidden or
// unknown one; a doctor keeps a department that was hidden after it was chosen; any other
// role is stored without a department whatever is sent; changing a doctor to another role
// empties it and back to doctor asks for one; a deactivated doctor may have none.
// Node 18+. Exit 1 on failure.
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
const A = (await call('POST', '/auth/login', { login_id: 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!A) throw new Error('admin login failed');
const tag = crypto.randomBytes(3).toString('hex');
const REQUIRED = 'Choose the department of the doctor', BAD = 'The department of the doctor must be one of the active departments';

const depts = (await call('GET', '/admin/departments', null, A)).data;
const DEPT = depts[0].id;
let r = await call('POST', '/admin/departments', { code: ('H' + tag).slice(0, 6).toUpperCase(), name: 'Hidden ' + tag }, A);
const HID = r.data.id;
const acct = (suffix, extra) => ({ login_id: 'zsd' + tag + suffix, password: crypto.randomBytes(9).toString('base64url'), name: 'Staff dept ' + suffix, status: 'active', ...extra });

// ── a doctor needs one ──
r = await call('POST', '/admin/staff', acct('a', { role: 'doctor', permissions: ['consultation'] }), A);
check('POST doctor without a department → 400', r.status === 400 && r.data.error === REQUIRED, r);
r = await call('POST', '/admin/staff', acct('a', { role: 'doctor', permissions: ['consultation'], department_id: 99999999 }), A);
check('POST doctor with an unknown department → 400', r.status === 400 && r.data.error === BAD, r);
await call('PUT', '/admin/departments/' + HID, { is_active: false }, A);
r = await call('POST', '/admin/staff', acct('a', { role: 'doctor', permissions: ['consultation'], department_id: HID }), A);
check('POST doctor with a hidden department → 400', r.status === 400 && r.data.error === BAD, r);
await call('PUT', '/admin/departments/' + HID, { is_active: true }, A);
r = await call('POST', '/admin/staff', acct('a', { role: 'doctor', permissions: ['consultation'], department_id: HID }), A);
check('POST doctor with a department → 201, stored', r.status === 201 && r.data.department_id === HID, r);
const DOC = r.data;
const docBody = (extra) => ({ login_id: DOC.login_id, name: DOC.name, role: 'doctor', permissions: ['consultation'], status: 'active', department_id: HID, ...extra });

// ── the one it has stays valid after it is hidden ──
await call('PUT', '/admin/departments/' + HID, { is_active: false }, A);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ name: 'Renamed ' + tag }), A);
check('PUT doctor keeping a department hidden since → 200', r.status === 200 && r.data.department_id === HID && r.data.name === 'Renamed ' + tag, r);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: null }), A);
check('PUT doctor with the department emptied → 400', r.status === 400 && r.data.error === REQUIRED, r);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: DEPT }), A);
check('PUT doctor to another active department → 200', r.status === 200 && r.data.department_id === DEPT, r);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: HID }), A);
check('PUT doctor CHANGING to a hidden department → 400', r.status === 400 && r.data.error === BAD, r);

// ── other roles have none ──
r = await call('POST', '/admin/staff', acct('b', { role: 'nurse', permissions: ['consultation'], department_id: DEPT }), A);
check('POST nurse with a department sent → 201, stored without', r.status === 201 && r.data.department_id === null, r);
const NUR = r.data;
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ role: 'frontdesk', permissions: ['registration'], department_id: DEPT }), A);
check('doctor → frontdesk: the department is emptied', r.status === 200 && r.data.role === 'frontdesk' && r.data.department_id === null, r);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: undefined }), A);
check('frontdesk → doctor without a department → 400', r.status === 400 && r.data.error === REQUIRED, r);
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: DEPT }), A);
check('frontdesk → doctor with a department → 200', r.status === 200 && r.data.role === 'doctor' && r.data.department_id === DEPT, r);

// ── a deactivated doctor may have none (an old account being switched off) ──
r = await call('PUT', '/admin/staff/' + DOC.id, docBody({ department_id: null, status: 'inactive' }), A);
check('PUT doctor inactive without a department → 200', r.status === 200 && r.data.status === 'inactive' && r.data.department_id === null, r);

// tidy
await call('PUT', '/admin/staff/' + NUR.id, { login_id: NUR.login_id, name: NUR.name, role: 'nurse', permissions: ['consultation'], status: 'inactive' }, A);
await call('PUT', '/admin/departments/' + HID, { is_active: false }, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
