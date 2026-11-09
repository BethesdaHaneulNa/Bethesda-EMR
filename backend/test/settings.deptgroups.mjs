// Departments hidden/shown and order-code groups as rows (the clinic's manager, 2026-11-09;
// migration 063). Run against an ISOLATED stack only:
//
//   SE_ADMIN_PW=... node backend/test/settings.deptgroups.mjs     (default http://127.0.0.1:9187)
//
// Checks: GET /admin/departments gives the active ones, ?all=1 every one; a department is
// hidden and shown with is_active alone (names untouched), the last active one cannot be
// hidden; the nine seeded groups are there with Other last; a group is added, renamed (its
// codes follow), hidden, shown, ordered, removed when empty and refused (409) when codes use
// it; Other cannot be hidden or removed; an order code with an unknown group is refused;
// changes are in the change log; no settings permission -> 403. Node 18+. Exit 1 on failure.
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
const tag = 'ZZ' + crypto.randomBytes(3).toString('hex').toUpperCase();

// ── departments ──
let r = await call('POST', '/admin/departments', { code: tag.slice(0, 6), name: 'Dept ' + tag, name_fr: 'Service ' + tag }, A);
check('a department is made', r.status === 201, r);
const D = r.data.id;
let active = (await call('GET', '/admin/departments', null, A)).data, all = (await call('GET', '/admin/departments?all=1', null, A)).data;
check('the plain list has it', active.some(d => d.id === D), active.map(d => d.code));
r = await call('PUT', '/admin/departments/' + D, { is_active: false }, A);
check('hidden with is_active alone; names untouched', r.status === 200 && r.data.is_active === false && r.data.name === 'Dept ' + tag, r.data);
active = (await call('GET', '/admin/departments', null, A)).data; all = (await call('GET', '/admin/departments?all=1', null, A)).data;
check('hidden: out of the plain list, in ?all=1', !active.some(d => d.id === D) && all.some(d => d.id === D && d.is_active === false), { active: active.length, all: all.length });
r = await call('PUT', '/admin/departments/' + D, { is_active: true }, A);
check('shown again', r.status === 200 && r.data.is_active === true, r.data);
// the floor: hide every other active department, then this one must be refused
const others = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.id !== D);
for (const d of others) await call('PUT', '/admin/departments/' + d.id, { is_active: false }, A);
r = await call('PUT', '/admin/departments/' + D, { is_active: false }, A);
check('the last active department cannot be hidden (400)', r.status === 400 && r.data.error === 'At least one department must stay active', r);
for (const d of others) await call('PUT', '/admin/departments/' + d.id, { is_active: true }, A);
const dlog = (await call('GET', '/admin/audit?action=settings.department&limit=200', null, A)).data.rows.filter(x => String(x.entity_id) === String(D));
check('hide and show are in the change log', dlog.length >= 2, dlog.length);
await call('PUT', '/admin/departments/' + D, { is_active: false }, A);

// ── groups ──
const groups = async () => (await call('GET', '/admin/order-groups', null, A)).data;
let g = await groups();
const nine = ['Consultation', 'Issuance', 'Laboratory', 'Radiology', 'Ultrasound', 'Endoscopy', 'Surgery', 'Supply', 'Other'];
check('the nine seeded groups are there', nine.every(n => g.some(x => x.name === n)), g.map(x => x.name));
check('Other is last and fixed', g[g.length - 1].name === 'Other' && g[g.length - 1].fixed === true, g[g.length - 1]);
r = await call('POST', '/admin/order-groups', { name: 'Dentisterie ' + tag }, A);
check('a group is added (201)', r.status === 201 && r.data.name === 'Dentisterie ' + tag, r);
r = await call('POST', '/admin/order-groups', { name: 'dentisterie ' + tag }, A);
check('the same name (any case) is refused (409)', r.status === 409, r);
r = await call('POST', '/admin/order-groups', { name: '' }, A);
check('an empty name -> 400', r.status === 400, r);
// a code in it, then rename: the code follows
r = await call('POST', '/admin/order-codes', { code: 'ZT' + tag, name: 'Test ' + tag, code_type: 'procedure', group_name: 'Dentisterie ' + tag, price: 1000, price_clinic: 1000 }, A);
check('an order code in the new group', r.status === 201 && r.data.group_name === 'Dentisterie ' + tag, r);
const OC = r.data.id;
r = await call('POST', '/admin/order-codes', { code: 'ZU' + tag, name: 'Test ' + tag, code_type: 'procedure', group_name: 'NoSuch ' + tag, price: 1000, price_clinic: 1000 }, A);
check('an order code with an unknown group is refused (400)', r.status === 400 && r.data.error === 'Unknown order-code group', r);
r = await call('PUT', '/admin/order-groups/' + encodeURIComponent('Dentisterie ' + tag), { name: 'Dentaire ' + tag }, A);
check('renamed', r.status === 200 && r.data.name === 'Dentaire ' + tag && r.data.code_count === 1, r.data);
const oc = (await call('GET', '/admin/order-codes', null, A)).data.find(x => x.id === OC);
check('the code followed the rename', oc && oc.group_name === 'Dentaire ' + tag, oc && oc.group_name);
r = await call('PUT', '/admin/order-groups/' + encodeURIComponent('Dentaire ' + tag), { is_hidden: true }, A);
check('hidden', r.status === 200 && r.data.is_hidden === true, r.data);
r = await call('DELETE', '/admin/order-groups/' + encodeURIComponent('Dentaire ' + tag), null, A);
check('a group on a code is not removed (409, with the number)', r.status === 409 && r.data.code_count === 1, r);
r = await call('PUT', '/admin/order-groups/Other', { is_hidden: true }, A);
check('Other cannot be hidden (400)', r.status === 400, r);
r = await call('DELETE', '/admin/order-groups/Other', null, A);
check('Other cannot be removed (400)', r.status === 400, r);
g = await groups();
const order = g.map(x => x.name); const i = order.indexOf('Dentaire ' + tag); order.splice(i, 1); order.unshift('Dentaire ' + tag);
r = await call('PUT', '/admin/order-groups/order', { names: order }, A);
check('the order is saved', r.status === 200 && r.data[0].name === 'Dentaire ' + tag, r.data && r.data.map(x => x.name));
r = await call('PUT', '/admin/order-groups/order', { names: order.slice(1) }, A);
check('an order missing a group is refused (400)', r.status === 400, r);
await call('DELETE', '/admin/order-codes/' + OC, null, A);
r = await call('DELETE', '/admin/order-groups/' + encodeURIComponent('Dentaire ' + tag), null, A);
check('an empty group is removed', r.status === 200, r);
const glog = (await call('GET', '/admin/audit?action=settings.order.group&limit=200', null, A)).data.rows.filter(x => String(x.summary || '').indexOf(tag) >= 0);
check('add, rename, hide, remove are in the change log', glog.length >= 4, glog.length);

// ── permissions ──
const sid = 'zz' + tag.toLowerCase();
await call('POST', '/admin/staff', { login_id: sid, password: 'test1234', name: 'No settings ' + tag, role: 'pharmacy', permissions: ['pharmacy'] }, A);
const S = (await call('POST', '/auth/login', { login_id: sid, password: 'test1234' })).data.token;
if (S) {
  check('groups are readable by anyone signed in', (await call('GET', '/admin/order-groups', null, S)).status === 200);
  check('no settings permission -> 403 on POST groups', (await call('POST', '/admin/order-groups', { name: 'x' + tag }, S)).status === 403);
  check('no settings permission -> 403 on PUT department', (await call('PUT', '/admin/departments/' + D, { is_active: true }, S)).status === 403);
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
