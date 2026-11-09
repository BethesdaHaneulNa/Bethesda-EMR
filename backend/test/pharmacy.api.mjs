// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 환자를 만들고 실제로 재고를 뺍니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Pharmacy API checks: concurrent dispensing, lock order, the internal/external
// guard and the completed list. Run against an ISOLATED stack only — it creates
// test patients and dispenses them, which moves stock:
//
//   node backend/test/pharmacy.api.mjs            (default http://127.0.0.1:9184)
//   PH_TEST_BASE=http://127.0.0.1:9184/api node backend/test/pharmacy.api.mjs
//
// On a fresh stack it creates the first admin through /auth/setup with a random
// password and keeps the test logins in the OS temp folder, so later runs reuse
// them. Needs Node 18+ (global fetch). Exit code 1 if any check fails.
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ensureTestDrugs } from './pharmacy.testdrugs.mjs';
const BASE = process.env.PH_TEST_BASE || 'http://127.0.0.1:9184/api';
// 9080 is the clinic's running EMR: this script dispenses and moves real stock there.
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const CREDS = path.join(os.tmpdir(), 'bethesda-ph-test-' + new URL(BASE).port + '.json');

async function call(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; }

// ── accounts ──
let creds;
if (fs.existsSync(CREDS)) creds = JSON.parse(fs.readFileSync(CREDS));
else {
  // The setup account's login id is always "admin" (settings S3, a95891a).
  creds = { admin: { login_id: 'admin', password: crypto.randomBytes(9).toString('base64url') },
            ph2: { login_id: 'phtest2', password: crypto.randomBytes(9).toString('base64url') } };
  const s = await call('POST', '/auth/setup', { ...creds.admin, name: 'Test Admin' });
  if (s.status !== 200) throw new Error('setup failed ' + JSON.stringify(s));
  fs.writeFileSync(CREDS, JSON.stringify(creds));
}
const A = (await call('POST', '/auth/login', creds.admin)).data.token;
let p2 = await call('POST', '/auth/login', creds.ph2);
if (p2.status !== 200) {
  await call('POST', '/admin/staff', { ...creds.ph2, name: 'Test Pharmacist', role: 'pharmacy', permissions: ['pharmacy'], status: 'active' }, A);
  p2 = await call('POST', '/auth/login', creds.ph2);
}
const B = p2.data.token;

// Own test drugs (TST-<name>), not the seed examples that the real list will hide.
const byCode = await ensureTestDrugs(call, A, ['PCM500', 'AMOX500', 'METRO', 'OMEP20', 'LORAT', 'ZINC', 'FOLIC', 'SALB']);
async function stock(name) { const code = byCode[name].code; return (await call('GET', '/admin/drugs?q=' + code, null, A)).data.find(d => d.code === code).stock_qty; }

// patient → visit → consultation → rx lines → complete
async function scenario(label, lines) {
  const p = (await call('POST', '/patients', { last_name: 'TEST', first_name: label, gender: 'F', date_of_birth: '1990-01-01', allergies: label.startsWith('ALG') ? 'Penicilline' : null }, A)).data;
  const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit' }, A)).data;
  const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: p.id }, A)).data;
  const rx = [];
  for (const [code, qty] of lines) {
    const d = byCode[code];
    rx.push((await call('POST', '/consultations/' + c.id + '/prescriptions', { drug_id: d.id, drug_code: d.code, drug_name: d.name, dose: '1', frequency: 1, days: qty, route: 'PO', total_qty: qty, unit_price: d.unit_price }, A)).data);
  }
  await call('PUT', '/consultations/' + c.id + '/complete', {}, A);
  return { p, v, c, rx };
}

// T1 — same patient dispensed twice at the same moment
{
  const before = await stock('PCM500');
  const s = await scenario('T1', [['PCM500', 10]]);
  const [r1, r2] = await Promise.all([
    call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, A),
    call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, B),
  ]);
  const statuses = [r1.status, r2.status].sort();
  const loser = r1.status === 404 ? r1 : r2;
  check('T1 one succeeds, one refused', statuses[0] === 200 && statuses[1] === 404, statuses);
  check('T1 refusal carries the known text', loser.data.error === 'No pending prescriptions for this consultation', loser.data);
  check('T1 stock taken once', (await stock('PCM500')) === before - 10, { before, after: await stock('PCM500') });
}

// T2 — opposite drug order, many pairs at once (deadlock check)
{
  // Enough on the record first: earlier runs can leave these at 0, and then the
  // dispenses stop at zero with a shortfall and the -24 below no longer holds.
  for (const code of ['AMOX500', 'METRO']) {
    await call('POST', '/pharmacy/stock/' + byCode[code].id + '/count', { counted: 500, memo: 'test T2 start' }, A);
  }
  const bA = await stock('AMOX500'), bM = await stock('METRO');
  const pairs = [];
  for (let i = 0; i < 12; i++) {
    pairs.push(await scenario('T2a' + i, [['AMOX500', 1], ['METRO', 1]]));
    pairs.push(await scenario('T2b' + i, [['METRO', 1], ['AMOX500', 1]]));
  }
  const res = await Promise.all(pairs.map((s, i) => call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, i % 2 ? A : B)));
  const bad = res.filter(r => r.status !== 200);
  check('T2 all 24 dispenses succeed (no deadlock)', bad.length === 0, bad.slice(0, 3));
  check('T2 AMOX500 stock -24', (await stock('AMOX500')) === bA - 24, { bA, now: await stock('AMOX500') });
  check('T2 METRO stock -24', (await stock('METRO')) === bM - 24, { bM, now: await stock('METRO') });
}

// T3 — dispense-type guard, and external not deducted
{
  const bO = await stock('OMEP20'), bL = await stock('LORAT');
  const s = await scenario('T3', [['OMEP20', 5], ['LORAT', 3]]);
  const t1 = await call('PUT', '/pharmacy/prescription/' + s.rx[1].id + '/dispense-type', { dispense_type: 'external' }, B);
  check('T3 switch while waiting → 200', t1.status === 200 && t1.data.dispense_type === 'external', t1.status);
  await call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, B);
  check('T3 internal deducted, external not', (await stock('OMEP20')) === bO - 5 && (await stock('LORAT')) === bL);
  const t2 = await call('PUT', '/pharmacy/prescription/' + s.rx[0].id + '/dispense-type', { dispense_type: 'external' }, B);
  check('T3 switch after dispense → 409 with known text', t2.status === 409 && t2.data.error === 'Prescription already dispensed; dispense type can no longer change', t2);
  const t3 = await call('PUT', '/pharmacy/prescription/99999999/dispense-type', { dispense_type: 'external' }, B);
  check('T3 unknown line → 404', t3.status === 404, t3.status);
  const comp = (await call('GET', '/pharmacy/completed', null, B)).data.find(g => g.consultation_id === s.c.id);
  const ext = comp.prescriptions.find(r => r.id === s.rx[1].id);
  check('T3 completed list carries dispense_type', ext && ext.dispense_type === 'external', ext);
  check('T3 completed list carries unit_price and patient fields', comp.prescriptions[0].unit_price != null && comp.gender === 'F' && !!comp.date_of_birth);
}

// T4 — lines added after the first dispense, handed out by someone else: still one row
{
  const s = await scenario('T4', [['ZINC', 2]]);
  await call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, A);
  const d = byCode['FOLIC'];
  await call('POST', '/consultations/' + s.c.id + '/prescriptions', { drug_id: d.id, drug_code: d.code, drug_name: d.name, dose: '1', frequency: 1, days: 3, route: 'PO', total_qty: 3, unit_price: d.unit_price }, A);
  const pend = (await call('GET', '/pharmacy/pending', null, B)).data.filter(g => g.consultation_id === s.c.id);
  check('T4 added line shows in pending', pend.length === 1 && pend[0].rx_count == 1, pend.length);
  await call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, B);
  const rows = (await call('GET', '/pharmacy/completed', null, B)).data.filter(g => g.consultation_id === s.c.id);
  check('T4 one completed row for the consultation', rows.length === 1 && rows[0].rx_count == 2, rows.map(r => [r.rx_count, r.dispensed_by_name]));
  check('T4 both dispensers named', rows[0] && /Test Admin/.test(rows[0].dispensed_by_name) && /Test Pharmacist/.test(rows[0].dispensed_by_name), rows[0] && rows[0].dispensed_by_name);
}

// T5 — work date: both lists take ?date=YYYY-MM-DD, today when it is left out
{
  const day = await call('GET', '/pharmacy/day', null, B);
  check('T5 /day gives the server\'s today and the dispensing limit',
    day.status === 200 && /^\d{4}-\d{2}-\d{2}$/.test(day.data.today) && day.data.past_days === 7, day.data);
  const ids = r => JSON.stringify((r.data || []).map(g => g.consultation_id));
  const s = await scenario('T5', [['ZINC', 1]]);
  const pDef = await call('GET', '/pharmacy/pending', null, B);
  const pToday = await call('GET', '/pharmacy/pending?date=' + day.data.today, null, B);
  check('T5 pending without a date is today\'s', ids(pDef) === ids(pToday) && pDef.data.some(g => g.consultation_id === s.c.id));
  const pOld = await call('GET', '/pharmacy/pending?date=2000-01-01', null, B);
  check('T5 pending of another day does not hold today\'s visits', pOld.status === 200 && pOld.data.length === 0, pOld.data.length);
  await call('PUT', '/pharmacy/consultations/' + s.c.id + '/dispense', {}, B);
  const cToday = await call('GET', '/pharmacy/completed?date=' + day.data.today, null, B);
  const cOld = await call('GET', '/pharmacy/completed?date=2000-01-01', null, B);
  check('T5 completed lists what was dispensed that day', cToday.data.some(g => g.consultation_id === s.c.id) && cOld.data.length === 0);
  const bad = await Promise.all(['2026-02-31', 'yesterday', '01/10/2026'].flatMap(d =>
    ['pending', 'completed'].map(l => call('GET', '/pharmacy/' + l + '?date=' + encodeURIComponent(d), null, B))));
  check('T5 a date that is not a day → 400', bad.every(r => r.status === 400), bad.map(r => r.status));
}

// Leave a few waiting patients for the screen check
if (process.argv.includes('--ui')) {
  await scenario('ALG-Screen', [['AMOX500', 21], ['PCM500', 15], ['SALB', 1]]);
  await scenario('Screen2', [['OMEP20', 14]]);
  console.log('screen patients created');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
