// ⚠ ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database. It creates
//   staff, patients, visits, order codes and orders.
//
// The phone's lists (/m, 1.7.11): GET /api/visits/today/lab-list, /today/orders-list,
// /today/imaging-list - read-only for any signed-in active account, today's visits only,
// cancelled visits left out - and lab results typed from the phone through the PC lab
// screen's own routes (GET /lab/order/:id/items, POST /lab/order/:id/results; permission
// 'lab', unchanged), which the doctor's side then reads as when typed on the PC.
//
//   MO_TEST_BASE=http://127.0.0.1:9195/api node backend/test/mobile.api.mjs
//
// Admin: its own saved login, else the one reception.api.mjs saved for the same port, else
// /auth/setup on a fresh stack. Needs Node 18+. Exit code 1 if any check fails.
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const BASE = process.env.MO_TEST_BASE || 'http://127.0.0.1:9195/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const PORT = new URL(BASE).port;
const CREDS = path.join(os.tmpdir(), 'bethesda-mo-test-' + PORT + '.json');
const RC_CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + PORT + '.json');

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
if (!creds.admin && fs.existsSync(RC_CREDS)) creds.admin = JSON.parse(fs.readFileSync(RC_CREDS)).admin;
if (!creds.admin) {
  const password = pw();
  const s = await call('POST', '/auth/setup', { password, name: 'MO Test Admin' });
  if (s.status !== 200) throw new Error('setup failed (stack already has an admin?) ' + JSON.stringify(s));
  creds.admin = { login_id: s.data.user.login_id, password };
}
fs.writeFileSync(CREDS, JSON.stringify(creds));
const adminLogin = await call('POST', '/auth/login', creds.admin);
if (adminLogin.status !== 200) throw new Error('admin login failed ' + JSON.stringify(adminLogin));
const A = adminLogin.data.token;

// ── accounts ──
const DOC_DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;   // a doctor has a department (2026-11-10)
const ACCOUNTS = {
  lab: { role: 'lab', permissions: ['lab'] },
  frontdesk: { role: 'frontdesk', permissions: ['registration', 'payment'] },
  doctor: { role: 'doctor', permissions: ['consultation', 'pharmacy'], department_id: DOC_DEPT },
  statsOnly: { role: 'frontdesk', permissions: ['stats'] },
};
const staffList = (await call('GET', '/admin/staff', null, A)).data;
const T = {}, ID = {};
for (const [key, acc] of Object.entries(ACCOUNTS)) {
  const login_id = 'mot_' + key.toLowerCase();
  if (!creds.staff[key]) creds.staff[key] = { login_id, password: pw() };
  const existing = staffList.find(s => s.login_id === login_id);
  if (existing) {
    await call('PUT', '/admin/staff/' + existing.id, { ...existing, ...acc, password: creds.staff[key].password, status: 'active' }, A);
    ID[key] = existing.id;
  } else {
    const c = await call('POST', '/admin/staff', { login_id, password: creds.staff[key].password, name: 'MO ' + key, status: 'active', ...acc }, A);
    if (c.status >= 300) throw new Error('could not create ' + key + ' ' + JSON.stringify(c));
    ID[key] = c.data.id;
  }
  const l = await call('POST', '/auth/login', creds.staff[key]);
  if (l.status !== 200) throw new Error('login failed for ' + key + ' ' + JSON.stringify(l));
  T[key] = l.data.token;
}
fs.writeFileSync(CREDS, JSON.stringify(creds));

// ── order codes of our own (the migrations no longer seed a clinic's list) ──
const tag = String(Date.now()).slice(-6);
const mkCode = async (code, name, code_type, extra) => {
  const r = await call('POST', '/admin/order-codes', { code, name, code_type, group_name: 'Other', price: 1000, price_clinic: 1000, ...(extra || {}) }, A);
  if (r.status >= 300) throw new Error('order code ' + code + ' ' + JSON.stringify(r));
  return r.data;
};
const LAB = await mkCode('MOL' + tag, 'Glycémie test ' + tag, 'lab');
const items = await call('POST', '/lab/test-items/save', { order_code_id: LAB.id, items: [{ name: 'Glucose', unit: 'g/L', ref_low: 0.7, ref_high: 1.1 }] }, A);
if (items.status >= 300) throw new Error('lab items ' + JSON.stringify(items));
const IMG = await mkCode('MOI' + tag, 'Radio thorax test ' + tag, 'imaging', { pacs_modality: 'CR', body_part: 'CHEST' });
const FEE = await mkCode('MOF' + tag, 'Pansement test ' + tag, 'procedure');

// ── a visit today with a lab, an imaging and a procedure order ──
const depts = (await call('GET', '/admin/departments', null, A)).data;
const P = (await call('POST', '/patients', { last_name: 'Mobile', first_name: 'M' + tag, gender: 'F', date_of_birth: '1990-01-01' }, A)).data;
const V = (await call('POST', '/visits', { patient_id: P.id, visit_type: 'newVisit', department_id: depts[0].id, allow_duplicate: true }, A)).data;
const C = (await call('POST', '/consultations', { visit_id: V.id, patient_id: P.id, department_id: depts[0].id }, T.doctor)).data;
const order = async (oc, type, memo) => (await call('POST', '/consultations/' + C.id + '/orders',
  { order_code_id: oc.id, order_code: oc.code, order_name: oc.name, code_type: type, quantity: 1, frequency: 1, days: 1, unit_price: 1000, memo }, T.doctor)).data;
const OL = await order(LAB, 'lab', 'à jeun');
const OI = await order(IMG, 'imaging', 'face');
const OP = await order(FEE, 'procedure');
if (!OL.id || !OI.id || !OP.id) throw new Error('orders not placed ' + JSON.stringify({ OL, OI, OP }));

// ── the lists: token only, any account ──
const LISTS = ['/visits/today/lab-list', '/visits/today/orders-list', '/visits/today/imaging-list'];
for (const p of LISTS) {
  const none = await call('GET', p);
  check('list ' + p + ': no token → 401', none.status === 401, { status: none.status });
  for (const who of ['statsOnly', 'frontdesk', 'lab']) {
    const r = await call('GET', p, null, T[who]);
    check('list ' + p + ': ' + who + ' → 200', r.status === 200 && Array.isArray(r.data), { status: r.status });
  }
}
// Today's, not cancelled: every visit in the lists is one of today's non-cancelled visits.
const todayIds = new Set((await call('GET', '/visits/today', null, A)).data.filter(v => v.status !== 'cancelled').map(v => v.id));
const labList = (await call('GET', '/visits/today/lab-list', null, T.statsOnly)).data;
const ordList = (await call('GET', '/visits/today/orders-list', null, T.statsOnly)).data;
const imgList = (await call('GET', '/visits/today/imaging-list', null, T.statsOnly)).data;
check('lists hold today\'s non-cancelled visits only', labList.every(v => todayIds.has(v.id)) && ordList.every(v => todayIds.has(v.id)) && imgList.every(o => todayIds.has(o.visit_id)),
  { lab: labList.filter(v => !todayIds.has(v.id)).length, orders: ordList.filter(v => !todayIds.has(v.id)).length, imaging: imgList.filter(o => !todayIds.has(o.visit_id)).length });
const lv = labList.find(v => v.id === V.id);
check('lab-list: the visit with its lab order, 1 pending / 0 done, imaging and procedure left out', lv && lv.pending === 1 && lv.done === 0 && lv.orders.length === 1 && lv.orders[0].order_item_id === OL.id && lv.chart_no === P.chart_no, { row: lv });
const ov = ordList.find(v => v.id === V.id);
check('orders-list: every order of the visit with type, status and memo', ov && ov.orders.length === 3 && ov.active === 3
  && ov.orders.some(o => o.order_item_id === OL.id && o.code_type === 'lab' && o.memo === 'à jeun' && o.status === 'ordered')
  && ov.orders.some(o => o.order_item_id === OI.id && o.code_type === 'imaging')
  && ov.orders.some(o => o.order_item_id === OP.id && o.code_type === 'procedure'), { row: ov && ov.orders.map(o => [o.code_type, o.status, o.memo]) });
const io = imgList.find(o => o.order_item_id === OI.id);
check('imaging-list: the imaging order with patient, device type and body part, memo; lab / procedure left out', io && io.modality === 'CR' && io.body_part === 'CHEST' && io.memo === 'face' && io.chart_no === P.chart_no && !imgList.some(o => o.order_item_id === OL.id || o.order_item_id === OP.id), { row: io });
check('imaging-list: sorted by ordered time', imgList.every((o, i) => i === 0 || new Date(imgList[i - 1].created_at) <= new Date(o.created_at)));

// ── lab results from the phone: the PC lab routes, 'lab' only ──
const fdItems = await call('GET', '/lab/order/' + OL.id + '/items', null, T.frontdesk);
const fdSave = await call('POST', '/lab/order/' + OL.id + '/results', { results: [{ lab_test_item_id: null, name: 'Glucose', value: '1.4' }] }, T.frontdesk);
const stSave = await call('POST', '/lab/order/' + OL.id + '/results', { results: [{ name: 'Glucose', value: '1.4' }] }, T.statsOnly);
check('saving a lab result without the lab permission → 403 (reading the items too)', fdSave.status === 403 && stSave.status === 403 && fdItems.status === 403, { save: fdSave.status, stats: stSave.status, items: fdItems.status });
const li = await call('GET', '/lab/order/' + OL.id + '/items', null, T.lab);
const it0 = li.data && li.data.items && li.data.items[0];
check('lab account reads the order\'s items with this patient\'s reference range', li.status === 200 && it0 && it0.name === 'Glucose' && Number(it0.ref_low) === 0.7 && Number(it0.ref_high) === 1.1 && it0.unit === 'g/L', { status: li.status, item: it0 });
// What the phone sends: the items as read, with the value typed (a French comma).
const sent = li.data.items.map(x => Object.assign({}, x, { value: '1,4', comment: 'tel.' }));
const save = await call('POST', '/lab/order/' + OL.id + '/results', { results: sent }, T.lab);
check('lab account saves from the phone path → 200', save.status === 200, { status: save.status, data: save.data });
const pcRes = (await call('GET', '/lab/patient/' + P.id + '/results', null, T.doctor)).data;
const r0 = Array.isArray(pcRes) && pcRes.find(r => r.order_item_id === OL.id);
check('the doctor\'s side (GET /lab/patient/:id/results) shows it as from the PC: value, flag high, who entered it', r0 && r0.value === '1,4' && r0.flag === 'high' && r0.comment === 'tel.' && r0.result_by === ID.lab && r0.result_by_name === 'MO lab' && r0.order_status === 'completed', { row: r0 && { value: r0.value, flag: r0.flag, by: r0.result_by_name, status: r0.order_status } });
const cOrders = (await call('GET', '/consultations/' + C.id + '/orders', null, T.doctor)).data;
const co = Array.isArray(cOrders) && cOrders.find(o => o.id === OL.id);
check('… and the consultation\'s orders show the lab order completed, with result_by / result_at', co && co.status === 'completed' && co.result_by === ID.lab && !!co.result_at, { order: co && { status: co.status, by: co.result_by } });
const lv2 = (await call('GET', '/visits/today/lab-list', null, T.statsOnly)).data.find(v => v.id === V.id);
check('lab-list then says 0 pending / 1 done', lv2 && lv2.pending === 0 && lv2.done === 1 && lv2.orders[0].status === 'completed', { row: lv2 && { pending: lv2.pending, done: lv2.done } });
const ov2 = (await call('GET', '/visits/today/orders-list', null, T.statsOnly)).data.find(v => v.id === V.id);
check('orders-list shows the lab order completed', ov2 && ov2.orders.find(o => o.order_item_id === OL.id).status === 'completed');

// A cancelled order: still in the orders list (marked), out of the lab list and its counts.
const OL2 = await order(LAB, 'lab');
await call('POST', '/consultations/order/' + OL2.id + '/cancel', { reason: 'test' }, T.doctor);
const del = await call('DELETE', '/consultations/order/' + OL2.id, null, T.doctor);
const lv3 = (await call('GET', '/visits/today/lab-list', null, T.lab)).data.find(v => v.id === V.id);
check('a lab order taken off in consultation is not in the lab list', lv3 && !lv3.orders.some(o => o.order_item_id === OL2.id) && lv3.pending === 0, { del: del.status, row: lv3 && lv3.orders.map(o => o.order_item_id) });

// Inactive account → 401 on the lists.
const offLogin = 'mot_off', offPw = pw();
const offOld = (await call('GET', '/admin/staff', null, A)).data.find(s => s.login_id === offLogin);
const offId = offOld ? offOld.id : (await call('POST', '/admin/staff', { login_id: offLogin, password: offPw, name: 'MO off', role: 'frontdesk', permissions: ['registration'], status: 'active' }, A)).data.id;
if (offOld) await call('PUT', '/admin/staff/' + offId, { ...offOld, password: offPw, status: 'active' }, A);
const offTok = (await call('POST', '/auth/login', { login_id: offLogin, password: offPw })).data.token;
const offRow = (await call('GET', '/admin/staff', null, A)).data.find(s => s.id === offId);
await call('PUT', '/admin/staff/' + offId, { ...offRow, status: 'inactive' }, A);
const offs = await Promise.all(LISTS.map(p => call('GET', p, null, offTok)));
check('an inactive account → 401 on the three lists', offs.every(r => r.status === 401), offs.map(r => r.status));

// Leave the visit finished, not in anybody's queue.
await call('PUT', '/consultations/' + C.id + '/complete', {}, T.doctor);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
