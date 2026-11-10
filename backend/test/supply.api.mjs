// Supplies (consumables, 1.7.0) through the API, against an isolated stack:
//
//   SU_TEST_BASE=http://127.0.0.1:9189/api node backend/test/supply.api.mjs
//
// On a fresh stack it creates the first admin through /auth/setup with a random
// password and keeps the login in the OS temp folder, so later runs reuse it.
// Checks: two supplies it creates itself, receive / shelf count / discard with their
// ledger rows, a supply put on a consultation leaving the stock and coming back when
// the line's count changes or the line is deleted, the order-code form's supply fields,
// and the supply on the visit's bill.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE = process.env.SU_TEST_BASE || 'http://127.0.0.1:9189/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const CREDS = path.join(os.tmpdir(), 'bethesda-su-test-' + new URL(BASE).port + '.json');

async function call(method, p, body, token) {
  const r = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, data };
}
let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

let creds;
if (fs.existsSync(CREDS)) creds = JSON.parse(fs.readFileSync(CREDS));
else {
  creds = { admin: { login_id: 'admin', password: crypto.randomBytes(9).toString('base64url') } };
  const s = await call('POST', '/auth/setup', { ...creds.admin, name: 'Test Admin' });
  if (s.status !== 200) throw new Error('setup failed ' + JSON.stringify(s));
  fs.writeFileSync(CREDS, JSON.stringify(creds));
}
const A = (await call('POST', '/auth/login', creds.admin)).data.token;
if (!A) throw new Error('admin login failed');

// ── fixtures ──
// The test makes its own supplies: the repository ships no clinic supply list (056 is
// schema-only), so nothing here may depend on rows a particular site has.
console.log('fixtures');
const tag = String(Date.now()).slice(-6);
async function newSupply(code, name, price, min) {
  const res = await call('POST', '/admin/order-codes', { code, name, code_type: 'supply', group_name: 'Supply', price, price_clinic: price, unit: 'Unit', min_stock: min }, A);
  if (res.status !== 201) throw new Error('could not create ' + code + ' ' + JSON.stringify(res));
  return res.data;
}
const g0 = await newSupply('TST-GLV-' + tag, 'surgical glove 6,5', 2000, 6);
const b0x = await newSupply('TST-BND-' + tag, 'Elastic bandage 6"', 1000, 5);
check('first receive 56', (await call('POST', '/supply/stock/' + g0.id + '/receive', { qty: 56 }, A)).status === 200);
check('first receive 20', (await call('POST', '/supply/stock/' + b0x.id + '/receive', { qty: 20 }, A)).status === 200);
const list = (await call('GET', '/supply/stock', null, A)).data;
check('supplies listed', Array.isArray(list) && list.length >= 2, list && list.length);
const gloves = list.find(s => s.id === g0.id);
check('a name with a comma kept', gloves && gloves.name === 'surgical glove 6,5', gloves);
const band = list.find(s => s.id === b0x.id);
check('a name with a quote kept', band && band.name === 'Elastic bandage 6"', band);
check('unit, price, minimum as entered', gloves && gloves.unit === 'Unit' && Number(gloves.price) === 2000 && Number(gloves.min_stock) === 6, gloves);
const mv0 = (await call('GET', '/supply/stock/' + gloves.id + '/movements', null, A)).data;
const first = mv0[mv0.length - 1];
check('a receive of 56 at the start of the record', first && first.kind === 'receive' && first.stock_after === 56 && first.stock_before === 0, first);
check('record chained to the current count', mv0[0].stock_after === Number(gloves.stock_qty), { last: mv0[0], now: gloves.stock_qty });
const oc = (await call('GET', '/admin/order-codes?code_type=supply', null, A)).data;
check('order codes of type supply listed', oc.length >= 2 && oc.every(c => c.code_type === 'supply') && oc.some(c => c.id === g0.id), oc.length);

// ── receive / count / discard ──
console.log('receive / shelf count / discard');
async function stockOf(id) { return Number((await call('GET', '/supply/stock', null, A)).data.find(s => s.id === id).stock_qty); }
const before = await stockOf(gloves.id);
let r = await call('POST', '/supply/stock/' + gloves.id + '/receive', { qty: 10 }, A);
check('receive +10', r.status === 200 && r.data.stock_after === before + 10, r.data);
r = await call('POST', '/supply/stock/' + gloves.id + '/receive', { qty: 2.5 }, A);
check('receive refuses a fraction', r.status === 400, r.data);
r = await call('POST', '/supply/stock/' + gloves.id + '/count', { counted: before + 7 }, A);
check('count needs a note', r.status === 400, r.data);
r = await call('POST', '/supply/stock/' + gloves.id + '/count', { counted: before + 7, memo: 'shelf' }, A);
check('count sets the number', r.status === 200 && r.data.stock_after === before + 7 && r.data.movement.qty === -3, r.data);
r = await call('POST', '/supply/stock/' + gloves.id + '/discard', { qty: 1000, memo: 'torn' }, A);
check('discard more than recorded refused (409)', r.status === 409, r.data);
r = await call('POST', '/supply/stock/' + gloves.id + '/discard', { qty: 2, memo: 'torn' }, A);
check('discard -2', r.status === 200 && r.data.stock_after === before + 5, r.data);
const mv1 = (await call('GET', '/supply/stock/' + gloves.id + '/movements', null, A)).data;
check('ledger: the three rows, newest first, chained', mv1.length >= 4 && mv1[0].kind === 'discard' && mv1[1].kind === 'adjust' && mv1[2].kind === 'receive'
  && mv1[1].stock_after === mv1[0].stock_before && mv1[2].stock_after === mv1[1].stock_before, mv1.slice(0, 3).map(m => m.kind));
// A drug route must not touch a supply and vice versa.
r = await call('POST', '/supply/stock/999999/receive', { qty: 1 }, A);
check('unknown supply 404', r.status === 404, r.data);

// ── on a consultation ──
console.log('consultation');
const p = (await call('POST', '/patients', { last_name: 'SUPPLY', first_name: 'Test' + Date.now(), gender: 'M', date_of_birth: '1990-01-01' }, A)).data;
// A visit needs a department since 1.7.14 (this test still registered without one and failed from there on).
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, A)).data;
const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: p.id }, A)).data;
check('patient, visit, consultation', p.id && v.id && c.id, { p: p.id, v: v.id, c: c.id });
const s0 = await stockOf(gloves.id);
const line = (await call('POST', '/consultations/' + c.id + '/orders', {
  order_code_id: gloves.id, order_code: gloves.code, order_name: gloves.name, code_type: 'supply',
  dose: '', frequency: 1, days: 1, quantity: 2, unit_price: gloves.price,
}, A)).data;
check('supply line added', line && line.id && line.code_type === 'supply', line);
check('2 used', await stockOf(gloves.id) === s0 - 2);
// The pharmacy's dispensing lists read the prescription table only; a supply is an
// order_item, like a procedure, so the consultation must not appear there (the
// pharmacist counts supplies in the Supplies tab, never dispenses them).
const pend = await call('GET', '/pharmacy/pending', null, A);
const pendMine = (pend.data || []).filter(g => g.consultation_id === c.id);
check('supply order not in the pharmacy pending list (' + pend.status + ')', pend.status === 200 && pendMine.length === 0, pendMine);
const pendPt = await call('GET', '/pharmacy/patient/' + p.id + '/pending', null, A);
const pendPtGroups = Array.isArray(pendPt.data) ? pendPt.data : (pendPt.data && pendPt.data.groups) || [];
check('nor in the patient\'s pending prescriptions', pendPt.status === 200 && pendPtGroups.filter(g => g.consultation_id === c.id).length === 0, pendPt.data);
// quantity 2 -> 3 pieces: one more leaves
r = await call('PUT', '/consultations/order/' + line.id, { dose: '', frequency: 1, days: 1, quantity: 3, memo: '', unit_price: gloves.price }, A);
check('count changed 2 -> 3', r.status === 200 && Number(r.data.quantity) === 3, r.data && r.data.quantity);
check('one more used', await stockOf(gloves.id) === s0 - 3);
// days multiply the bill (⑭) and the pieces: 3 x 2 days = 6
r = await call('PUT', '/consultations/order/' + line.id, { dose: '', frequency: 1, days: 2, quantity: 3, memo: '', unit_price: gloves.price }, A);
check('3 x 2 days = 6 pieces', await stockOf(gloves.id) === s0 - 6);
// a save with nothing changed moves nothing
r = await call('PUT', '/consultations/order/' + line.id, { dose: '', frequency: 1, days: 2, quantity: 3, memo: 'note', unit_price: gloves.price }, A);
check('unchanged count moves nothing', await stockOf(gloves.id) === s0 - 6);
const mv2 = (await call('GET', '/supply/stock/' + gloves.id + '/movements', null, A)).data;
check('use rows carry the patient', mv2[0].kind === 'use' && mv2[0].chart_no && mv2[0].consultation_id === c.id, mv2[0]);
// a second supply line, then deleted: everything comes back
const line2 = (await call('POST', '/consultations/' + c.id + '/orders', {
  order_code_id: band.id, order_code: band.code, order_name: band.name, code_type: 'supply',
  dose: '', frequency: 1, days: 1, quantity: 1, unit_price: band.price,
}, A)).data;
const b0 = await stockOf(band.id);
r = await call('DELETE', '/consultations/order/' + line2.id, null, A);
check('line deleted', r.status === 200, r.data);
check('deleted line returned', await stockOf(band.id) === b0 + 1);
const mvb = (await call('GET', '/supply/stock/' + band.id + '/movements', null, A)).data;
check('return row, line reference cleared', mvb[0].kind === 'return' && mvb[0].order_item_id === null, mvb[0]);
// a cancel needs a result: a supply has none, so 409 and no movement (delete is the way)
r = await call('POST', '/consultations/order/' + line.id + '/cancel', { reason: 'x' }, A);
check('cancel without result refused (409)', r.status === 409, r.data);
check('no movement on the refused cancel', await stockOf(gloves.id) === s0 - 6);
// a procedure line touches no supply count
const proc = (await call('GET', '/admin/order-codes?code_type=procedure', null, A)).data[0];
if (proc) {
  await call('POST', '/consultations/' + c.id + '/orders', { order_code_id: proc.id, order_code: proc.code, order_name: proc.name, code_type: 'procedure', dose: '', frequency: 1, days: 1, quantity: 1, unit_price: proc.price }, A);
  check('a procedure line moves no supply', await stockOf(gloves.id) === s0 - 6);
}

// ── the bill ──
console.log('bill');
// The payment screen bills a supply line like a procedure line: quantity x days x unit
// price, item_type = its code_type (Payment.jsx chargeRows, billing.routes.js).
const items = await call('GET', '/billing/visit/' + v.id + '/items', null, A);
const sup = items.data && (items.data.orders || []).filter(o => o.code_type === 'supply');
check('supply line among the visit\'s orders (' + items.status + ')', items.status === 200 && sup && sup.length === 1 && Number(sup[0].total_qty) === 6, sup);

// ── the order-code form ──
console.log('order-code form');
r = await call('POST', '/admin/order-codes', { code: 'TST-SUP-' + String(Date.now()).slice(-6), name: 'Test supply', code_type: 'supply', group_name: 'Supply', price: 100, price_clinic: 100, unit: 'BOX', min_stock: 4 }, A);
check('new supply: count 0, unit, minimum', r.status === 201 && r.data.stock_qty === 0 && r.data.unit === 'BOX' && r.data.min_stock === 4, r.data);
const made = r.data;
r = await call('PUT', '/admin/order-codes/' + made.id, { ...made, code_type: 'procedure', min_stock: 9 }, A);
check('turned into a procedure: count and minimum gone', r.status === 200 && r.data.stock_qty === null && r.data.min_stock === 0 && r.data.unit === null, r.data);
r = await call('PUT', '/admin/order-codes/' + made.id, { ...made, code_type: 'supply', unit: 'PACKS', min_stock: 1 }, A);
check('back to a supply: count 0 again', r.status === 200 && r.data.stock_qty === 0 && r.data.unit === 'PACKS', r.data);
r = await call('POST', '/admin/order-codes', { code: 'TST-BAD', name: 'x', code_type: 'thing', price: 0 }, A);
check('unknown type refused', r.status === 400, r.data);
await call('DELETE', '/admin/order-codes/' + made.id, null, A);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
