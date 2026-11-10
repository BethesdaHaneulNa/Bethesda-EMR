// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 환자·내원·영수증을 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Payment API scenarios (bug hunt round 4, 2026-11-10). The billing routes had no test of
// their own. Each scenario makes its own patient and visit, bills it the way the screen
// does (lines from GET /billing/visit/:id/items), and checks the money afterwards:
//   A  a paid bill: receipt, off the waiting list, on the day's cash, no balance
//   B  the same request twice / stale / figures that do not add up are refused
//   C  part payment -> balance -> carried into the next visit's bill -> void restores it
//   D  settlement of a balance; too much is refused; voiding the settlement restores it
//   E  a line removed after payment: correction with the refund shown
//   F  a line added after payment: the supplement
//   G  cancel without handing the money back: the re-bill starts from the cash kept
//   H  a visit closed at reception without a consultation: on the day's list at 0, no fee
//   I  a previous balance carried only in part is refused (it charged the debt twice)
//   J  lines and figures that cannot be, ids and dates that are not: 400, never a 500
// Uses the accounts reception.api.mjs made (run that first on the same stack):
//   BL_TEST_BASE=http://127.0.0.1:9187/api node backend/test/billing.api.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BL_TEST_BASE || 'http://127.0.0.1:9187/api';
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
const num = (x) => Number(x) || 0;

const A = await login(creds.admin), D = await login(creds.staff.doctor), F = await login(creds.staff.frontdesk);   // frontdesk: registration + payment
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const tag = String(Date.now()).slice(-6);
const P1 = 20000, P2 = 7000, DRUGP = 300;
const oc1 = (await call('POST', '/admin/order-codes', { code: 'ZB1' + tag, name: 'Acte un ' + tag, code_type: 'procedure', group_name: 'Other', price: P1, price_clinic: P1 }, A)).data;
const oc2 = (await call('POST', '/admin/order-codes', { code: 'ZB2' + tag, name: 'Acte deux ' + tag, code_type: 'procedure', group_name: 'Other', price: P2, price_clinic: P2 }, A)).data;
const drug = (await call('POST', '/admin/drugs', { code: 'ZBD' + tag, name: 'Comprimé caisse ' + tag, unit: 'cp', price: DRUGP, price_clinic: DRUGP }, A)).data;
if (!oc1 || !oc1.id || !oc2 || !oc2.id || !drug || !drug.id) { console.error('could not make the test codes', oc1, oc2, drug); process.exit(2); }

let nPat = 0;
async function newPatient() { return (await call('POST', '/patients', { last_name: 'Caisse' + tag, first_name: 'P' + (++nPat), gender: 'F' }, F)).data; }
// A finished visit of `patient` with: order oc1 (x1), and - when withDrug - the drug 2/day for 3 days.
async function finishedVisit(patient, opt) {
  opt = opt || {};
  const v = (await call('POST', '/visits', { patient_id: patient.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, F)).data;
  const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: patient.id }, D)).data;
  const o = (await call('POST', '/consultations/' + c.id + '/orders', { order_code_id: oc1.id, order_code: oc1.code, order_name: oc1.name, code_type: 'procedure', quantity: 1, days: 1, unit_price: P1 }, D)).data;
  let rx = null;
  if (opt.withDrug) rx = (await call('POST', '/consultations/' + c.id + '/prescriptions', { drug_id: drug.id, drug_code: drug.code, drug_name: drug.name, dose: 2, frequency: 2, days: 3, unit_price: DRUGP }, D)).data;
  await call('PUT', '/consultations/' + c.id + '/complete', null, D);
  return { v, c, o, rx };
}
// The request the payment screen sends: what is not billed yet, from GET /visit/:id/items.
async function billBody(visit, patient, opt) {
  opt = opt || {};
  const it = (await call('GET', '/billing/visit/' + visit.id + '/items', null, F)).data;
  const billedQty = {}; (it.billed_items || []).forEach(b => { if (b.item_type !== 'consultation') billedQty[b.item_code || ''] = (billedQty[b.item_code || ''] || 0) + num(b.qty); });
  const lines = [];
  const feeCode = { newVisit: 'C01', followUp: 'C02', emergency: 'C03', referral: 'C04' }[it.visit_type];
  const fee = feeCode ? num(it.consult_prices[feeCode]) : 0;
  if (fee > 0 && !it.billed_consult) lines.push({ item_type: 'consultation', item_name: 'Consultation', item_code: '', quantity: 1, unit_price: fee, total_price: fee });
  (it.prescriptions || []).forEach(r => { const q = num(r.total_qty) - (billedQty[r.drug_code] || 0); if (q > 0) lines.push({ item_type: 'drug', item_name: r.drug_name, item_code: r.drug_code, quantity: q, unit_price: num(r.unit_price), total_price: q * num(r.unit_price) }); });
  (it.orders || []).forEach(o => { const full = num(o.total_qty != null ? o.total_qty : o.quantity); const q = full - (billedQty[o.order_code] || 0); if (q > 0) { billedQty[o.order_code] = (billedQty[o.order_code] || 0) + q; lines.push({ item_type: 'procedure', item_name: o.order_name, item_code: o.order_code, quantity: q, unit_price: num(o.unit_price), total_price: q * num(o.unit_price) }); } });
  const sum = (t) => lines.filter(l => l.item_type === t).reduce((s, l) => s + l.total_price, 0);
  const subtotal = lines.reduce((s, l) => s + l.total_price, 0);
  const prev = opt.previous_balance || 0, due = subtotal + prev;
  const handed = opt.handed === undefined ? due : opt.handed;
  const change = Math.max(0, handed - due), owed = Math.max(0, due - (handed - change));
  return { visit_id: visit.id, patient_id: patient.id, consult_fee: sum('consultation'), drug_total: sum('drug'), procedure_total: sum('procedure'), subtotal,
    discount_amount: 0, discount_type: 'amount', discount_value: 0, previous_balance: prev, total_due: due, amount_paid: handed, change_amount: change, outstanding: owed,
    payment_status: owed > 0.5 ? (handed - change > 0.5 ? 'partial' : 'unpaid') : 'paid', note: '', items: lines, expected_active_bill_ids: it.active_bill_ids, saved_fee_ids: [] };
}
const pendingRow = async (visitId) => ((await call('GET', '/billing/pending', null, F)).data || []).find(r => r.id === visitId) || null;
const balance = async (pid) => (await call('GET', '/billing/patient/' + pid + '/balance', null, F)).data;
const cashNet = async () => num((await call('GET', '/billing/cash-day', null, F)).data.net);
const detail = async (id) => (await call('GET', '/billing/' + id + '/detail', null, F)).data;
const FEE = num((await call('GET', '/billing/visit/0/items', null, F)).data.consult_prices.C01);

// ── A. a paid bill ──
const pa = await newPatient(), va = await finishedVisit(pa, { withDrug: true });
const totalA = FEE + P1 + 6 * DRUGP;
const waitA = await pendingRow(va.v.id);
check('A: the finished visit is on the waiting list', !!waitA && !waitA.needs_additional && !waitA.needs_refund, waitA && { add: waitA.needs_additional, ref: waitA.needs_refund });
const cash0 = await cashNet();
const bodyA = await billBody(va.v, pa, { handed: totalA + 5000 });
const billA = await call('POST', '/billing', bodyA, F);
check('A: paid with change → 201, a receipt number, the figures as sent', billA.status === 201 && /^R-\d{8}-\d{4}$/.test(billA.data.receipt_no) && num(billA.data.total_due) === totalA && num(billA.data.change_amount) === 5000 && num(billA.data.outstanding) === 0 && billA.data.payment_status === 'paid', { status: billA.status, data: billA.data });
check('A: off the waiting list, no balance, the day\'s cash up by the total (not by the change)', (await pendingRow(va.v.id)) === null && num((await balance(pa.id)).owed) === 0 && Math.abs((await cashNet()) - cash0 - totalA) < 0.01, { cash: (await cashNet()) - cash0 });
const detA = await detail(billA.data.id);
check('A: the receipt holds the three lines, and they add up to its total', detA.items.length === 3 && Math.abs(detA.items.reduce((s, i) => s + num(i.total_price), 0) - totalA) < 0.01, detA.items.map(i => [i.item_type, i.total_price]));

// ── B. refusals ──
const again = await call('POST', '/billing', bodyA, F);
check('B: the same request again → 409 BILL_CHANGED, no second receipt', again.status === 409 && /^BILL_CHANGED/.test(again.data.error), again);
const pb = await newPatient(), vb = await finishedVisit(pb);
const good = await billBody(vb.v, pb);
const wrongSum = await call('POST', '/billing', Object.assign({}, good, { total_due: good.total_due - 1000, amount_paid: good.total_due - 1000 }), F);
const wrongLine = await call('POST', '/billing', Object.assign({}, good, { items: good.items.map((l, i) => i ? l : Object.assign({}, l, { total_price: l.total_price + 500 })) }), F);
const negative = await call('POST', '/billing', Object.assign({}, good, { discount_amount: -100 }), F);
const otherPatient = await call('POST', '/billing', Object.assign({}, good, { patient_id: pa.id }), F);
const noExpected = await call('POST', '/billing', Object.assign({}, good, { expected_active_bill_ids: undefined }), F);
const paidButOwing = await call('POST', '/billing', Object.assign({}, good, { amount_paid: 0, change_amount: 0, outstanding: 0, payment_status: 'paid' }), F);
check('B: totals that do not add up, a negative amount, another patient, no expected list, "paid" with nothing received → refused', wrongSum.status === 400 && wrongLine.status === 400 && negative.status === 400 && otherPatient.status === 400 && noExpected.status === 409 && paidButOwing.status === 400, [wrongSum.status, wrongLine.status, negative.status, otherPatient.status, noExpected.status, paidButOwing.status]);
check('B: after the refusals the visit is still waiting, unbilled', !!(await pendingRow(vb.v.id)) && (await call('GET', '/billing/visit/' + vb.v.id + '/items', null, F)).data.active_bill_ids.length === 0);
const doctorPays = await call('POST', '/billing', good, D);
check('B: an account without the payment permission → 403', doctorPays.status === 403, doctorPays.status);

// ── C. part payment, carried into the next visit, void restores ──
const totalB = FEE + P1;
const partB = await call('POST', '/billing', await billBody(vb.v, pb, { handed: 10000 }), F);
check('C: part payment → partial, the rest owed', partB.status === 201 && partB.data.payment_status === 'partial' && num(partB.data.outstanding) === totalB - 10000 && num((await balance(pb.id)).owed) === totalB - 10000, partB.data && { st: partB.data.payment_status, out: partB.data.outstanding });
check('C: the part-paid visit left the waiting list (its balance is taken under the receipts)', (await pendingRow(vb.v.id)) === null);
const vb2 = await finishedVisit(pb);
const waitB2 = await pendingRow(vb2.v.id);
check('C: the next visit shows the balance as previous balance', !!waitB2 && num(waitB2.previous_balance) === totalB - 10000, waitB2 && waitB2.previous_balance);
const billB2 = await call('POST', '/billing', await billBody(vb2.v, pb, { previous_balance: totalB - 10000 }), F);
const oldAfter = (await detail(partB.data.id)).bill;
check('C: billed with the balance → the old receipt carries nothing more, the patient owes nothing', billB2.status === 201 && num(billB2.data.total_due) === totalB + (totalB - 10000) && num(oldAfter.outstanding) === 0 && oldAfter.carried_into_id === billB2.data.id && num((await balance(pb.id)).owed) === 0, { status: billB2.status, old: oldAfter.outstanding });
const twice = await call('POST', '/billing', Object.assign(await billBody(vb2.v, pb, { previous_balance: totalB - 10000 }), { expected_active_bill_ids: [] }), F);
check('C: the balance cannot be charged a second time', twice.status === 409, twice.status);
const voidOld = await call('PUT', '/billing/' + partB.data.id + '/void', { reason: 'test', refunded: true }, F);
check('C: the old receipt cannot be cancelled while a later one carries its balance → 409 BILL_CARRIED', voidOld.status === 409 && /^BILL_CARRIED/.test(voidOld.data.error), voidOld);
const noAnswer = await call('PUT', '/billing/' + billB2.data.id + '/void', { reason: 'test' }, F);
check('C: cancelling a receipt that took money asks whether it was handed back', noAnswer.status === 400, noAnswer.status);
const cashC = await cashNet();
const voidB2 = await call('PUT', '/billing/' + billB2.data.id + '/void', { reason: 'test', refunded: true }, F);
check('C: cancelled with the money handed back → the old balance is back, the cash goes down by what it took', voidB2.status === 200 && num((await detail(partB.data.id)).bill.outstanding) === totalB - 10000 && num((await balance(pb.id)).owed) === totalB - 10000 && Math.abs(cashC - (await cashNet()) - num(billB2.data.total_due)) < 0.01, { status: voidB2.status, cash: cashC - (await cashNet()) });
check('C: a cancelled receipt cannot be cancelled again', (await call('PUT', '/billing/' + billB2.data.id + '/void', { reason: 'x', refunded: false }, F)).status === 404);

// ── D. settlement ──
const owedB = totalB - 10000;
const tooMuch = await call('POST', '/billing/settle', { bill_ids: [partB.data.id], amount: owedB + 1000, expected_outstanding: owedB }, F);
const staleSettle = await call('POST', '/billing/settle', { bill_ids: [partB.data.id], amount: 1000, expected_outstanding: owedB - 5000 }, F);
check('D: more than is owed → 400; a stale balance → 409', tooMuch.status === 400 && staleSettle.status === 409, [tooMuch.status, staleSettle.status]);
const cashD = await cashNet();
const settle1 = await call('POST', '/billing/settle', { bill_ids: [partB.data.id], amount: 4000, expected_outstanding: owedB }, F);
check('D: part of the balance → a settlement receipt, the rest still owed, cash up by what came in', settle1.status === 201 && settle1.data.payment_status === 'partial' && num(settle1.data.outstanding) === owedB - 4000 && num((await balance(pb.id)).owed) === owedB - 4000 && Math.abs((await cashNet()) - cashD - 4000) < 0.01, settle1.data && { st: settle1.data.payment_status, out: settle1.data.outstanding });
const settleOldAgain = await call('POST', '/billing/settle', { bill_ids: [partB.data.id], amount: 1000, expected_outstanding: 0 }, F);
check('D: the receipt already settled cannot be settled again', settleOldAgain.status === 409, settleOldAgain);
const voidSettle = await call('PUT', '/billing/' + settle1.data.id + '/void', { reason: 'test', refunded: true }, F);
check('D: cancelling the settlement puts the whole balance back', voidSettle.status === 200 && num((await balance(pb.id)).owed) === owedB && Math.abs((await cashNet()) - cashD) < 0.01, { owed: (await balance(pb.id)).owed });

// ── E. a line removed after payment: correction ──
const pe = await newPatient(), ve = await finishedVisit(pe);
const extra = (await call('POST', '/consultations/' + ve.c.id + '/orders', { order_code_id: oc2.id, order_code: oc2.code, order_name: oc2.name, code_type: 'procedure', quantity: 1, days: 1, unit_price: P2 }, D)).data;
const billE = await call('POST', '/billing', await billBody(ve.v, pe), F);
const del = await call('DELETE', '/consultations/order/' + extra.id, null, D);
const waitE = await pendingRow(ve.v.id);
check('E: an order removed after payment puts the visit back on the list as a refund', billE.status === 201 && del.status === 200 && !!waitE && waitE.needs_refund === true && num(waitE.corr && waitE.corr.refund) === P2, { del: del.status, row: waitE && { ref: waitE.needs_refund, corr: waitE.corr } });
const prev = (await call('GET', '/billing/visit/' + ve.v.id + '/correction', null, F)).data;
check('E: the correction preview: refund = the removed line, nothing owed', num(prev.refund) === P2 && num(prev.outstanding) === 0 && num(prev.total_due) === FEE + P1, { refund: prev.refund, due: prev.total_due });
const staleCorr = await call('POST', '/billing/visit/' + ve.v.id + '/correct', { expected_active_bill_ids: prev.active_bill_ids, expected_refund: P2 + 1000, expected_outstanding: 0, reason: 'test' }, F);
const cashE = await cashNet();
const corr = await call('POST', '/billing/visit/' + ve.v.id + '/correct', { expected_active_bill_ids: prev.active_bill_ids, expected_refund: P2, expected_outstanding: 0, reason: 'test' }, F);
const oldE = (await detail(billE.data.id)).bill;
check('E: a stale figure is refused; the correction replaces the receipt and hands the refund back', staleCorr.status === 409 && corr.status === 201 && num(corr.data.total_due) === FEE + P1 && num(corr.data.change_amount) === P2 && oldE.payment_status === 'cancelled' && oldE.replaced_by_id === corr.data.id && Math.abs(cashE - (await cashNet()) - P2) < 0.01, { stale: staleCorr.status, corr: corr.status, cash: cashE - (await cashNet()) });
check('E: after the correction the visit is off the list and nothing is owed either way', (await pendingRow(ve.v.id)) === null && num((await balance(pe.id)).owed) === 0 && num((await balance(pe.id)).refund) === 0, await balance(pe.id));

// ── F. a line added after payment: supplement ──
const pf = await newPatient(), vf = await finishedVisit(pf);
const billF = await call('POST', '/billing', await billBody(vf.v, pf), F);
await call('POST', '/consultations/' + vf.c.id + '/orders', { order_code_id: oc2.id, order_code: oc2.code, order_name: oc2.name, code_type: 'procedure', quantity: 2, days: 1, unit_price: P2 }, D);
const waitF = await pendingRow(vf.v.id);
check('F: an order added after payment → the visit is back as a supplement of exactly that amount', billF.status === 201 && !!waitF && waitF.needs_additional === true && num(waitF.extra_due) === 2 * P2, waitF && { add: waitF.needs_additional, extra: waitF.extra_due });
const supBody = await billBody(vf.v, pf);
const sup = await call('POST', '/billing', supBody, F);
check('F: the supplement bills only the new line', sup.status === 201 && supBody.items.length === 1 && num(sup.data.total_due) === 2 * P2 && (await pendingRow(vf.v.id)) === null, { status: sup.status, lines: supBody.items.length, due: sup.data && sup.data.total_due });

// ── G. cancel without handing the money back: the re-bill starts from the cash kept ──
const pg = await newPatient(), vg = await finishedVisit(pg);
const billG = await call('POST', '/billing', await billBody(vg.v, pg), F);
const cashG = await cashNet();
const voidG = await call('PUT', '/billing/' + billG.data.id + '/void', { reason: 'test', refunded: false }, F);
const waitG = await pendingRow(vg.v.id);
check('G: cancelled, money kept → cash unchanged, the visit waits to be billed again with that cash as already received', voidG.status === 200 && Math.abs((await cashNet()) - cashG) < 0.01 && !!waitG && waitG.needs_rebill === true && num(waitG.prior_paid) === totalB, waitG && { rebill: waitG.needs_rebill, prior: waitG.prior_paid });
const rebill = await call('POST', '/billing', await billBody(vg.v, pg, { handed: totalB }), F);
check('G: billed again → no new cash is counted, and the kept cash is used up', rebill.status === 201 && Math.abs((await cashNet()) - cashG) < 0.01 && num((await detail(rebill.data.id)).bill.held_used) === totalB, { status: rebill.status, cash: (await cashNet()) - cashG });

// ── H. closed at reception without a consultation ──
const ph = await newPatient();
const vh = (await call('POST', '/visits', { patient_id: ph.id, visit_type: 'newVisit', department_id: DEPT }, F)).data;
const closed = await call('PUT', '/visits/' + vh.id + '/status', { status: 'completed' }, F);
const waitH = await pendingRow(vh.id);
const itemsH = (await call('GET', '/billing/visit/' + vh.id + '/items', null, F)).data;
// The day itself it stays on the list at 0 Ar - a certificate can be charged on it (manual,
// payment 5); from the next day it is gone, there being nothing to bill.
check('H: a visit closed without a consultation is "no fee": on the day\'s list, with nothing to bill', closed.status === 200 && closed.data.visit_type === 'none' && !!waitH && itemsH.visit_type === 'none' && itemsH.orders.length === 0 && itemsH.prescriptions.length === 0, { type: closed.data && closed.data.visit_type, onList: !!waitH });
const bodyH = await billBody(vh, ph);
const billH = await call('POST', '/billing', bodyH, F);
check('H: it can be closed at the till with a receipt of 0 and no line', bodyH.items.length === 0 && billH.status === 201 && num(billH.data.total_due) === 0 && (await pendingRow(vh.id)) === null, { lines: bodyH.items.length, status: billH.status });

// ── I. a previous balance carried only in part ──
// The screen always carries all that is owed. A request with less than the oldest receipt
// owes (a figure read before the balance changed) absorbed nothing: the new receipt
// charged it and the old one went on owing everything.
const pi = await newPatient(), vi1 = await finishedVisit(pi);
const partI = await call('POST', '/billing', await billBody(vi1.v, pi, { handed: 10000 }), F);
const owedI = num(partI.data.outstanding);
const vi2 = await finishedVisit(pi);
const lessI = await call('POST', '/billing', await billBody(vi2.v, pi, { previous_balance: owedI - 5000 }), F);
check('I: carrying less than the old receipt owes → 409 BILL_CHANGED, nothing written', lessI.status === 409 && /^BILL_CHANGED/.test(lessI.data.error) && num((await balance(pi.id)).owed) === owedI && !!(await pendingRow(vi2.v.id)), { status: lessI.status, owed: (await balance(pi.id)).owed });
const fullI = await call('POST', '/billing', await billBody(vi2.v, pi, { previous_balance: owedI }), F);
check('I: carrying all of it → 201, the patient owes nothing', fullI.status === 201 && num((await balance(pi.id)).owed) === 0, { status: fullI.status, owed: (await balance(pi.id)).owed });

// ── J. what cannot be → 400 ──
const pj = await newPatient(), vj = await finishedVisit(pj);
const goodJ = await billBody(vj.v, pj);
const withLines = (lines) => { const sub = lines.reduce((s, l) => s + (Number(l.total_price) || 0), 0); return Object.assign({}, goodJ, { items: lines, consult_fee: 0, drug_total: 0, procedure_total: sub, subtotal: sub, total_due: sub, amount_paid: sub, change_amount: 0, outstanding: 0, payment_status: 'paid' }); };
const jr = [
  await call('POST', '/billing', withLines([{ item_type: 'procedure', item_name: 'x', item_code: 'x', quantity: -1, unit_price: -20000, total_price: 20000 }]), F),
  await call('POST', '/billing', withLines([{ item_type: 'procedure', item_name: 'x', item_code: 'x', quantity: 1, unit_price: -5000, total_price: -5000 }, { item_type: 'procedure', item_name: 'y', item_code: 'y', quantity: 1, unit_price: 40000, total_price: 40000 }]), F),
  await call('POST', '/billing', withLines([{ item_type: 'procedure', quantity: 1, unit_price: 100, total_price: 100 }]), F),
  await call('POST', '/billing', withLines([{ item_type: '', item_name: 'x', quantity: 1, unit_price: 100, total_price: 100 }]), F),
  await call('POST', '/billing', Object.assign(withLines([]), { items: 'abc' }), F),
  await call('POST', '/billing', withLines([{ item_type: 'procedure', item_name: 'x', item_code: 'x', quantity: 1, unit_price: 1e13, total_price: 1e13 }]), F),
  await call('POST', '/billing', Object.assign({}, goodJ, { amount_paid: goodJ.amount_paid + 'abc' }), F),
  await call('POST', '/billing', Object.assign({}, goodJ, { visit_id: 'abc' }), F),
];
check('J: negative lines, a line without a name or type, a text for the list, a figure too large or with letters, a text id → 400', jr.every(r => r.status === 400), jr.map(r => r.status));
check('J: none of them left a receipt', (await call('GET', '/billing/visit/' + vj.v.id + '/items', null, F)).data.active_bill_ids.length === 0 && !!(await pendingRow(vj.v.id)));
const badIds = [
  await call('GET', '/billing/abc/detail', null, F), await call('GET', '/billing/visit/abc/items', null, F),
  await call('PUT', '/billing/abc/void', { reason: 'x', refunded: false }, F), await call('GET', '/billing/visit/abc/correction', null, F),
  await call('GET', '/billing/patient/abc/balance', null, F), await call('GET', '/billing/patient/abc/history', null, F),
  await call('GET', '/billing/cash-day?date=2026-13-45', null, F), await call('GET', '/billing/cash-day?date=2026-02-30', null, F),
  await call('GET', '/billing/completed?date=hello', null, F),
];
check('J: an id that is not a number, a day that does not exist → 400', badIds.every(r => r.status === 400), badIds.map(r => r.status));
check('J: the real ones still answer', (await call('GET', '/billing/' + billA.data.id + '/detail', null, F)).status === 200 && (await call('GET', '/billing/completed?date=' + billA.data.billing_date, null, F)).data.some(b => b.id === billA.data.id) && (await call('GET', '/billing/patient/' + pa.id + '/history', null, F)).status === 200);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
