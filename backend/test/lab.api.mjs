// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 환자·검사 항목·결과를 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Laboratory API (bug hunt round 6, 2026-11-10; the routes had only the flag checker):
// an order shows on the day's list, results are saved and flagged by the server, a value
// written as a range is judged by both ends, a second save replaces the first, texts that
// do not fit and ids that are not numbers are refused in words (400), and the item list
// refuses a low above its high. Uses the accounts reception.api.mjs made (run it first):
//   LB_TEST_BASE=http://127.0.0.1:9187/api node backend/test/lab.api.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.LB_TEST_BASE || 'http://127.0.0.1:9187/api';
if (/:9080(\/|$)/.test(BASE)) { console.error('Refusing to run against 9080 (the clinic\'s EMR).'); process.exit(2); }
const RC_CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + new URL(BASE).port + '.json');
if (!fs.existsSync(RC_CREDS)) { console.error('Run backend/test/reception.api.mjs on this stack first (it makes the test accounts).'); process.exit(2); }
const creds = JSON.parse(fs.readFileSync(RC_CREDS));

async function call(method, p, body, token) {
  const r = await fetch(BASE + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body === undefined || body === null ? undefined : JSON.stringify(body) });
  let data = null; try { data = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); if (!ok) fails++; }
const login = async (c) => (await call('POST', '/auth/login', { login_id: c.login_id, password: c.password })).data.token;

const A = await login(creds.admin), D = await login(creds.staff.doctor), F = await login(creds.staff.frontdesk), L = await login(creds.staff.lab);
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const tag = String(Date.now()).slice(-6);
const oc = (await call('POST', '/admin/order-codes', { code: 'ZLB' + tag, name: 'Examen test ' + tag, code_type: 'lab', group_name: 'Other', price: 3000, price_clinic: 3000 }, A)).data;
const made = await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: [
  { name: 'Leucocytes', unit: '/champ', ref_low: 0, ref_high: 5 },
  { name: 'Parasites', ref_text: 'Négatif' },
  { name: 'Hb', unit: 'g/dL', ref_low: 12, ref_high: 16 },
] }, A);
check('the item list of a panel is saved', made.status === 200 && made.data.length === 3, made);
const IT = made.data;
const keep = () => IT.map(i => ({ id: i.id, name: i.name, unit: i.unit, ref_low: i.ref_low, ref_high: i.ref_high, ref_text: i.ref_text }));

let n = 0;
async function order() {
  const p = (await call('POST', '/patients', { last_name: 'Labo' + tag, first_name: 'P' + (++n), gender: 'F', date_of_birth: '1990-05-05' }, F)).data;
  const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, F)).data;
  const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: p.id }, D)).data;
  const o = (await call('POST', '/consultations/' + c.id + '/orders', { order_code_id: oc.id, order_code: oc.code, order_name: oc.name, code_type: 'lab', quantity: 1, days: 1, unit_price: 3000 }, D)).data;
  return { p, v, c, o };
}
const rows = (vals) => IT.map((it, i) => ({ lab_test_item_id: it.id, name: it.name, value: vals[i] == null ? '' : vals[i], comment: '' }));
const saved = async (p) => { const m = {}; ((await call('GET', '/lab/patient/' + p.id + '/results', null, L)).data || []).forEach(r => { m[r.name] = [r.value, r.flag]; }); return m; };
const onList = async (which, visitId) => ((await call('GET', '/lab/day', null, L)).data[which] || []).some(g => g.visit_id === visitId);

// ── the order reaches the lab, the result is saved and flagged ──
const a = await order();
check('an order placed by the doctor is on the pending list at once (consultation still open)', await onList('pending', a.v.id));
const form = await call('GET', '/lab/order/' + a.o.id + '/items', null, L);
check('the entry form has the three items with this patient\'s references', form.status === 200 && form.data.items.length === 3 && form.data.items[1].choices.length >= 2, form.data && form.data.items);
check('nothing entered is refused', (await call('POST', '/lab/order/' + a.o.id + '/results', { results: rows([null, null, null]) }, L)).status === 400);
const s1 = await call('POST', '/lab/order/' + a.o.id + '/results', { results: rows(['8', 'negatif', '11,9']) }, L);
const r1 = await saved(a.p);
check('saved: 8 against 0-5 high, "negatif" against Négatif normal, 11,9 against 12-16 low (comma read as a decimal)', s1.status === 200 && r1.Leucocytes[1] === 'high' && r1.Parasites[1] === 'normal' && r1.Hb[1] === 'low' && r1.Hb[0] === '11,9', r1);
check('the order moved from pending to completed', !(await onList('pending', a.v.id)) && (await onList('completed', a.v.id)));
const s2 = await call('POST', '/lab/order/' + a.o.id + '/results', { results: rows(['2', 'Positif', '']) }, L);
const r2 = await saved(a.p);
check('a second save replaces the first; a row left empty is gone', s2.status === 200 && r2.Leucocytes[1] === 'normal' && r2.Parasites[1] === 'abnormal' && r2.Hb === undefined, r2);
check('the doctor cannot delete an order that has a result', (await call('DELETE', '/consultations/order/' + a.o.id, null, D)).status === 409);

// ── a value written as a range is judged by both ends ──
for (const [v, want] of [['3-8', ''], ['0-2', 'normal'], ['6-9', 'high'], ['2 à 4', 'normal'], ['2 a 4', 'normal']]) {
  const b = await order();
  await call('POST', '/lab/order/' + b.o.id + '/results', { results: rows([v, null, null]) }, L);
  const got = (await saved(b.p)).Leucocytes;
  check('"' + v + '" against 0-5 → ' + (want || 'no flag') + ' (it used to be read as its first number)', !!got && got[0] === v && (got[1] || '') === want, got);
}

// ── what does not fit is refused in words, and nothing is lost ──
const c = await order();
await call('POST', '/lab/order/' + c.o.id + '/results', { results: rows(['1', 'Négatif', '13']) }, L);
const long = 'Présence d\'œufs d\'Ascaris lumbricoides et de kystes d\'Entamoeba histolytica';
const tooLong = await call('POST', '/lab/order/' + c.o.id + '/results', { results: rows([null, long, null]) }, L);
check('a result of ' + long.length + ' characters → 400 naming the item, not the column\'s error', tooLong.status === 400 && /too long/.test(tooLong.data.error) && /Parasites/.test(tooLong.data.error), tooLong);
check('…and the results saved before are still there', Object.keys(await saved(c.p)).length === 3);
const inComment = await call('POST', '/lab/order/' + c.o.id + '/results', { results: [{ lab_test_item_id: IT[1].id, value: 'Positif', comment: long + ' — ' + 'c'.repeat(2000) }] }, L);
check('the long remark fits in the comment', inComment.status === 200);
const badRows = [
  await call('POST', '/lab/order/' + c.o.id + '/results', { results: [{ name: 'n'.repeat(200), value: '1' }] }, L),
  await call('POST', '/lab/order/' + c.o.id + '/results', { results: [{ name: 'x', value: '1', ref_low: 'abc' }] }, L),
  await call('POST', '/lab/order/' + c.o.id + '/results', { results: [{ name: 'x', value: '1', unit: 'u'.repeat(50) }] }, L),
];
check('a free row with a name or unit too long, or a reference that is not a number → 400', badRows.every(r => r.status === 400), badRows.map(r => r.status));
const badIds = [
  await call('POST', '/lab/order/abc/results', { results: [{ value: '1' }] }, L), await call('GET', '/lab/order/abc/items', null, L),
  await call('GET', '/lab/visit/abc/orders', null, L), await call('GET', '/lab/patient/abc/results', null, L),
  await call('GET', '/lab/day?date=2026-02-30', null, L), await call('GET', '/lab/test-items?order_code_id=abc', null, A),
];
check('an id that is not a number, a day that does not exist → 400', badIds.every(r => r.status === 400), badIds.map(r => r.status));
check('an order that is not a lab order cannot take results; an unknown one is 404', (await call('POST', '/lab/order/99999999/results', { results: [{ value: '1' }] }, L)).status === 404);

// ── the item list (Settings) ──
const badItems = [
  await call('POST', '/lab/test-items/save', { order_code_id: 'abc', items: [{ name: 'x' }] }, A),
  await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'n'.repeat(200) }]) }, A),
  await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'x', ref_low: 'abc' }]) }, A),
  await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'x', ref_low: 16, ref_high: 12 }]) }, A),
  await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'x', unit: 'u'.repeat(50) }]) }, A),
  await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'x', ref_text: 't'.repeat(100) }]) }, A),
];
const unknownCode = await call('POST', '/lab/test-items/save', { order_code_id: 99999999, items: [{ name: 'x' }] }, A);
check('items: a text id, a name / unit / reference text too long, a reference that is not a number, a low above its high → 400; an unknown code → 404', badItems.every(r => r.status === 400) && unknownCode.status === 404, badItems.map(r => r.status).concat([unknownCode.status]));
const after = (await call('GET', '/lab/test-items?order_code_id=' + oc.id, null, A)).data;
check('after the refusals the panel still has its three items, with the same ids', after.length === 3 && after.every((x, i) => x.id === IT[i].id), after.map(x => x.name));
const fine = await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep().concat([{ name: 'Glycémie', unit: 'g/L', ref_low: 0.7, ref_high: 1.1 }]) }, A);
check('a fourth item with a proper range is added', fine.status === 200 && fine.data.length === 4 && fine.data[3].name === 'Glycémie', fine.status);
check('the lab may read the items but not change them', (await call('GET', '/lab/test-items?order_code_id=' + oc.id, null, L)).status === 200 && (await call('POST', '/lab/test-items/save', { order_code_id: oc.id, items: keep() }, L)).status === 403);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
