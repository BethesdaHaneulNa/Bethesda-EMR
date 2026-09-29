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
  creds = { admin: { login_id: 'phtest', password: crypto.randomBytes(9).toString('base64url') },
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

const drugs = (await call('GET', '/admin/drugs', null, A)).data;
const byCode = Object.fromEntries(drugs.map(d => [d.code, d]));
async function stock(code) { return (await call('GET', '/admin/drugs?q=' + code, null, A)).data.find(d => d.code === code).stock_qty; }

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

// Leave a few waiting patients for the screen check
if (process.argv.includes('--ui')) {
  await scenario('ALG-Screen', [['AMOX500', 21], ['PCM500', 15], ['SALB', 1]]);
  await scenario('Screen2', [['OMEP20', 14]]);
  console.log('screen patients created');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
