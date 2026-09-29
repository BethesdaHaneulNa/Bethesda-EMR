// The change log for staff accounts, and the read API (decided 2026-09-29,
// wiki/03-change-log.md). Run against an ISOLATED stack only - it creates staff:
//
//   SE_ADMIN_PW=... node backend/test/settings.audit.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.audit.mjs
//
// Checks: a line per real change and none for a save that changes nothing or is refused;
// the password never appears in any form; GET /api/admin/audit filters and pages, and
// is refused without the settings permission (that part: settings.access.mjs). Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW');

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

const A = (await call('POST', '/auth/login', { login_id: 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!A) throw new Error('admin login failed');
const tag = 'au' + crypto.randomBytes(3).toString('hex');
const pw1 = crypto.randomBytes(9).toString('base64url'), pw2 = crypto.randomBytes(9).toString('base64url');
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const log = async (q) => (await call('GET', '/admin/audit?' + q, null, A)).data;
const mine = async () => (await log('limit=200')).rows.filter(r => r.summary && r.summary.indexOf(tag) >= 0);

// create
const made = await call('POST', '/admin/staff', { login_id: tag, password: pw1, name: 'Audit ' + tag, role: 'frontdesk', permissions: ['registration', 'payment'] }, A);
check('create account', made.status === 201, made);
const id = made.data.id;
let rows = await mine();
check('one "created" line, with the account and its permissions', rows.length === 1 && rows[0].action === 'settings.staff.create'
  && rows[0].before_value === null && rows[0].after_value.login_id === tag && rows[0].after_value.permissions.join() === 'registration,payment', rows);
check('who did it: the admin, by name and role', rows[0].staff_name && rows[0].staff_role === 'admin', rows[0]);

const base = { login_id: tag, name: 'Audit ' + tag, role: 'frontdesk', permissions: ['registration', 'payment'], status: 'active' };
// nothing changed
await call('PUT', '/admin/staff/' + id, base, A);
check('saving without a change writes nothing', (await mine()).length === 1, (await mine()).length);
// same permissions, other order
await call('PUT', '/admin/staff/' + id, { ...base, permissions: ['payment', 'registration'] }, A);
check('same permissions in another order is not a change', (await mine()).length === 1, (await mine()).length);

// edit a field
await call('PUT', '/admin/staff/' + id, { ...base, name: 'Audit renamed ' + tag, phone: '034 00 000 00' }, A);
rows = await mine();
const edit = rows.find(r => r.action === 'settings.staff.edit');
check('an edit line with only the changed fields', edit && Object.keys(edit.after_value).sort().join() === 'name,phone'
  && edit.before_value.name === 'Audit ' + tag && edit.after_value.phone === '034 00 000 00', edit);

// permissions
await call('PUT', '/admin/staff/' + id, { ...base, name: 'Audit renamed ' + tag, phone: '034 00 000 00', permissions: ['registration', 'stats'] }, A);
rows = await mine();
const perm = rows.find(r => r.action === 'settings.staff.permissions');
check('a permissions line, before -> after', perm && perm.before_value.permissions.join() === 'registration,payment'
  && perm.after_value.permissions.join() === 'registration,stats', perm);
check('and no edit line for that save (nothing else changed)', rows.filter(r => r.action === 'settings.staff.edit').length === 1, rows.map(r => r.action));

// password
await call('PUT', '/admin/staff/' + id, { ...base, name: 'Audit renamed ' + tag, phone: '034 00 000 00', permissions: ['registration', 'stats'], password: pw2 }, A);
rows = await mine();
const pwLine = rows.find(r => r.action === 'settings.staff.password');
check('a password line, with no value at all', pwLine && pwLine.before_value === null && pwLine.after_value === null, pwLine);
const all = JSON.stringify(await log('limit=200'));
check('neither password, nor any hash, anywhere in the log', all.indexOf(pw1) < 0 && all.indexOf(pw2) < 0 && all.indexOf('$2a$') < 0 && !/password_hash/.test(all), 'found');
check('the new password works', (await call('POST', '/auth/login', { login_id: tag, password: pw2 })).status === 200);

// a refused change leaves no line: make this account the last settings admin? Simpler:
// the setup admin cannot be deactivated - refused, nothing written.
const before = (await log('limit=1')).total;
const adminRow = (await call('GET', '/admin/staff', null, A)).data.find(s => s.login_id === 'admin');
const refused = await call('DELETE', '/admin/staff/' + adminRow.id, null, A);
check('a refused change (setup admin deactivate) writes nothing', refused.status === 400 && (await log('limit=1')).total === before, refused.status);

// deactivate
await call('DELETE', '/admin/staff/' + id, null, A);
rows = await mine();
const off = rows.filter(r => r.action === 'settings.staff.edit').find(r => r.after_value.status === 'inactive');
check('deactivating is an edit line: status active -> inactive', off && off.before_value.status === 'active', off);

// read API
let r = await log('action=settings.staff.password&limit=200');
check('filter by action', r.rows.length > 0 && r.rows.every(x => x.action === 'settings.staff.password'), r.rows.map(x => x.action));
r = await log('action=settings&limit=200');
check('filter by module', r.rows.every(x => x.module === 'settings'), r.rows.map(x => x.module));
r = await log('staff_id=' + adminRow.id + '&limit=200');
check('filter by who', r.rows.length > 0 && r.rows.every(x => x.staff_id === adminRow.id), r.rows.length);
r = await log('from=' + today + '&to=' + today + '&limit=200');
check('filter by today (clinic date)', r.rows.some(x => (x.summary || '').indexOf(tag) >= 0), r.total);
r = await log('from=2000-01-01&to=2000-01-02');
check('a day with nothing -> empty', r.total === 0 && r.rows.length === 0, r.total);
r = await log('limit=2&page=1'); const r2 = await log('limit=2&page=2');
check('pages do not overlap, newest first', r.rows.length === 2 && r2.rows.length > 0 && r.rows[1].id > r2.rows[0].id
  && new Date(r.rows[0].at) >= new Date(r.rows[1].at), [r.rows.map(x => x.id), r2.rows.map(x => x.id)]);
r = await log('limit=5000');
check('at most 200 lines per page', r.limit === 200, r.limit);
// Refused without the settings permission: covered by settings.access.mjs (GET /admin/audit).
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
