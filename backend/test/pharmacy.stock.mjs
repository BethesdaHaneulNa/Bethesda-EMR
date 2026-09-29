// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 계정·환자를 만들고 실제로 재고를 바꿉니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Stock ledger checks (pharmacy stock step 1): receive / count / discard, the
// shortfall on dispensing, dispensing and receiving the same drug at once, a stock
// change made outside the ledger (settings screen), who may call what, and that
// every drug's ledger is an unbroken chain ending at drug.stock_qty.
//
//   node backend/test/pharmacy.stock.mjs            (default http://127.0.0.1:9184)
//   PH_TEST_BASE=http://127.0.0.1:9184/api node backend/test/pharmacy.stock.mjs
//
// Uses the logins kept by pharmacy.api.mjs (run that one first on a fresh stack).
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const BASE = process.env.PH_TEST_BASE || 'http://127.0.0.1:9184/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const CREDS = path.join(os.tmpdir(), 'bethesda-ph-test-' + new URL(BASE).port + '.json');
if (!fs.existsSync(CREDS)) throw new Error('Run backend/test/pharmacy.api.mjs first (it creates the test logins)');
const creds = JSON.parse(fs.readFileSync(CREDS));

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
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; }

const A = (await call('POST', '/auth/login', creds.admin)).data.token;

// Test accounts by role: nurse (pharmacy+lab+registration), doctor (consultation),
// frontdesk (registration+payment), stats only.
async function account(key, role, permissions) {
  if (!creds[key]) {
    creds[key] = { login_id: 'st' + key + crypto.randomBytes(3).toString('hex'), password: crypto.randomBytes(9).toString('base64url') };
    const r = await call('POST', '/admin/staff', { ...creds[key], name: 'Test ' + key, role, permissions, status: 'active' }, A);
    if (r.status >= 300) throw new Error('could not create ' + key + ': ' + JSON.stringify(r.data));
    fs.writeFileSync(CREDS, JSON.stringify(creds));
  }
  return (await call('POST', '/auth/login', creds[key])).data.token;
}
const NURSE = await account('nurse', 'nurse', ['registration', 'pharmacy', 'lab']);
const DOC = await account('doctor', 'doctor', ['consultation']);
const DESK = await account('desk', 'frontdesk', ['registration', 'payment']);
const STATS = await account('stats', 'admin', ['stats']);

const drugs = (await call('GET', '/pharmacy/stock', null, NURSE)).data;
check('stock list (nurse) 200 with drugs', Array.isArray(drugs) && drugs.length > 0, drugs.length);
const D = Object.fromEntries(drugs.map(d => [d.code, d]));
const stockOf = async code => (await call('GET', '/pharmacy/stock?q=' + code, null, NURSE)).data.find(d => d.code === code).stock_qty;
const moves = async id => (await call('GET', '/pharmacy/stock/' + id + '/movements', null, NURSE)).data;

// ── permissions ──
check('doctor may list stock', (await call('GET', '/pharmacy/stock', null, DOC)).status === 200);
check('doctor may not open the dispensing queue', (await call('GET', '/pharmacy/pending', null, DOC)).status === 403);
check('front desk may not list stock', (await call('GET', '/pharmacy/stock', null, DESK)).status === 403);
check('stats-only may not receive', (await call('POST', '/pharmacy/stock/' + D.ZINC.id + '/receive', { qty: 1 }, STATS)).status === 403);
check('nurse may open the dispensing queue', (await call('GET', '/pharmacy/pending', null, NURSE)).status === 200);

// ── receive / count / discard ──
{
  const id = D.ZINC.id; const s0 = await stockOf('ZINC');
  const r = await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 50, memo: 'Mission team box 12' }, NURSE);
  check('receive +50', r.status === 200 && r.data.stock_after === s0 + 50, r.data);
  check('receive by doctor works too', (await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 1 }, DOC)).status === 200);
  check('receive 0 refused', (await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 0 }, NURSE)).status === 400);
  check('receive 2.5 refused', (await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 2.5 }, NURSE)).status === 400);
  const now = await stockOf('ZINC');
  check('count without note refused', (await call('POST', '/pharmacy/stock/' + id + '/count', { counted: now }, NURSE)).status === 400);
  const same = await call('POST', '/pharmacy/stock/' + id + '/count', { counted: now, memo: 'shelf check' }, NURSE);
  check('count equal to record: recorded with 0', same.status === 200 && same.data.movement.qty === 0 && same.data.stock_after === now, same.data.movement);
  const lower = await call('POST', '/pharmacy/stock/' + id + '/count', { counted: now - 7, memo: 'shelf check' }, NURSE);
  check('count lower: adjust -7', lower.status === 200 && lower.data.movement.qty === -7, lower.data.movement);
  const tooMany = await call('POST', '/pharmacy/stock/' + id + '/discard', { qty: now + 100, memo: 'broken' }, NURSE);
  check('discard more than record: 409', tooMany.status === 409 && /Cannot discard more/.test(tooMany.data.error), tooMany.data);
  check('discard without reason refused', (await call('POST', '/pharmacy/stock/' + id + '/discard', { qty: 1 }, NURSE)).status === 400);
  const dis = await call('POST', '/pharmacy/stock/' + id + '/discard', { qty: 3, memo: 'wet box' }, NURSE);
  check('discard 3', dis.status === 200 && dis.data.movement.qty === -3, dis.data.movement);
  check('unknown drug 404', (await call('POST', '/pharmacy/stock/99999999/receive', { qty: 1 }, NURSE)).status === 404);
}

// patient -> visit -> consultation -> one line -> complete
async function prescribe(code, dose, days, label) {
  const d = D[code];
  const p = (await call('POST', '/patients', { last_name: 'STOCK', first_name: label, gender: 'M', date_of_birth: '1990-01-01' }, A)).data;
  const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit' }, A)).data;
  const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: p.id }, A)).data;
  await call('POST', '/consultations/' + c.id + '/prescriptions', { drug_id: d.id, drug_code: d.code, drug_name: d.name, dose, frequency: 1, days, route: 'QD', unit_price: d.unit_price }, A);
  await call('PUT', '/consultations/' + c.id + '/complete', {}, A);
  return c.id;
}

// ── dispensing with a shortfall ──
{
  const id = D.FOLIC.id;
  await call('POST', '/pharmacy/stock/' + id + '/count', { counted: 3, memo: 'test: only 3 on the shelf' }, NURSE);
  const cid = await prescribe('FOLIC', '1', 8, 'short');          // total 8 (daily total x days)
  const r = await call('PUT', '/pharmacy/consultations/' + cid + '/dispense', null, NURSE);
  const sh = (r.data.shortages || [])[0];
  check('dispense 8 with 3 on record: shortage reported', r.status === 200 && sh && sh.requested === 8 && sh.available === 3 && sh.missing === 5, r.data.shortages);
  const m = (await moves(id))[0];
  check('ledger: dispense -8, 3 -> 0, shortfall 5, linked', m.kind === 'dispense' && m.qty === -8 && m.stock_before === 3 && m.stock_after === 0 && m.shortfall === 5 && m.consultation_id === cid && !!m.chart_no, m);
}

// ── dispensing and receiving the same drug at once ──
{
  const id = D.IRON.id;
  await call('POST', '/pharmacy/stock/' + id + '/count', { counted: 200, memo: 'test start' }, NURSE);
  const cids = []; for (let i = 0; i < 10; i++) cids.push(await prescribe('IRON', '1', 3, 'conc' + i));   // 10 x 3
  const jobs = cids.map((cid, i) => call('PUT', '/pharmacy/consultations/' + cid + '/dispense', null, i % 2 ? NURSE : A));
  for (let i = 0; i < 10; i++) jobs.push(call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 5, memo: 'concurrent ' + i }, i % 2 ? NURSE : DOC));
  const res = await Promise.all(jobs);
  check('20 concurrent calls all succeed', res.every(r => r.status === 200), res.filter(r => r.status !== 200).map(r => r.data));
  check('IRON = 200 - 30 + 50 = 220', (await stockOf('IRON')) === 220, await stockOf('IRON'));
  const bridges = (await moves(id)).filter(m => /outside/i.test(m.memo || '')).length;
  check('no outside-change rows invented by the concurrency', bridges === 0, bridges);
}

// ── stock changed outside the ledger (settings screen) ──
{
  const id = D.LORAT.id; const d = (await call('GET', '/admin/drugs?q=LORAT', null, A)).data.find(x => x.code === 'LORAT');
  const before = d.stock_qty;
  const put = await call('PUT', '/admin/drugs/' + id, { ...d, stock_qty: before + 11, stock_expected: before }, A);
  check('settings saves stock directly (until settings stops writing it)', put.status === 200 && put.data.stock_qty === before + 11, put.status);
  await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 2, memo: 'after settings edit' }, NURSE);
  const [rcv, bridge] = await moves(id);
  check('outside change bridged by an adjust row first', bridge.kind === 'adjust' && bridge.qty === 11 && bridge.stock_after === before + 11 && /outside/i.test(bridge.memo || ''), bridge);
  check('then the receive continues from it', rcv.kind === 'receive' && rcv.stock_before === before + 11 && rcv.stock_after === before + 13, rcv);
}

// ── every drug: chain unbroken and ends at stock_qty ──
{
  const all = (await call('GET', '/pharmacy/stock', null, NURSE)).data;
  let broken = [];
  for (const d of all) {
    const rows = (await moves(d.id)).slice().reverse();         // oldest first
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.stock_after !== r.stock_before + r.qty + r.shortfall) broken.push(d.code + ' row ' + r.id + ' sum');
      if (i > 0 && r.stock_before !== rows[i - 1].stock_after) broken.push(d.code + ' gap before row ' + r.id);
    }
    if (rows.length && rows[rows.length - 1].stock_after !== d.stock_qty) broken.push(d.code + ' last != stock_qty');
  }
  check('ledger chain intact for all ' + all.length + ' drugs', broken.length === 0, broken.slice(0, 5));
}

// ── monthly report (step 3): this month's rows add up and end at today's count ──
{
  const d = new Date();
  const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const rep = await call('GET', '/pharmacy/stock/report?month=' + month, null, NURSE);
  const stock = (await call('GET', '/pharmacy/stock', null, NURSE)).data;
  check('report 200 for this month', rep.status === 200 && Array.isArray(rep.data.rows), rep.status);
  check('every row adds up', rep.data.rows.every(r => r.ok), rep.data.rows.filter(r => !r.ok).map(r => r.code));
  const off = rep.data.rows.filter(r => { const s = stock.find(x => x.id === r.drug_id); return s && s.stock_qty !== r.end; });
  check('month end = current stock for every drug', off.length === 0, off.map(r => r.code));
  check('report: stats-only 200, front desk 403', (await call('GET', '/pharmacy/stock/report?month=' + month, null, STATS)).status === 200 && (await call('GET', '/pharmacy/stock/report?month=' + month, null, DESK)).status === 403);
  check('report: bad month 400', (await call('GET', '/pharmacy/stock/report?month=2026-13', null, NURSE)).status === 400);
  check('report: a month long before the record is empty', (await call('GET', '/pharmacy/stock/report?month=2000-01', null, NURSE)).data.rows.length === 0);
}

console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
