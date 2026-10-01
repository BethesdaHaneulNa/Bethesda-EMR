// Bill one visit the way the payment screen does - for building test data.
//
// The figures are made by the same steps as frontend/src/pages/Payment.jsx (chargeRows,
// discountAmt, totalDue, doConfirmNow, confirmCorrectionNow, voidConfirmNow, settleAllNow):
// the server's answers are read, the lines and totals are built as the screen builds them,
// and the same body is posted to the same routes. Nothing is written to the database
// directly. If the screen's sums change, change them here too (wiki/modules/payment.md 3.1).
//
// Run inside the api container:
//   node pay-visit.js <visit_id> <mode> [values] [options]
//
// Modes (what the cashier would do on the screen):
//   paid                     "Exact", then Confirm            - paid in full
//   partial <amount>         type less than the total, Confirm - the rest stays unpaid
//   overpay <amount>         type more than the total, Confirm - change is given back
//   unpaid                   the red "Unpaid" button           - nothing received
//   discount <n|n%> [paid | partial <amount> | overpay <amount> | unpaid]
//                            fill the discount box, then pay. The box takes an amount only: n% is
//                            worked out here (rounded percent of the subtotal) and typed as an amount
//   correct                  a visit marked "Correction": apply the correction the screen shows
//   void <billing_id> <refunded|kept> [reason]
//                            cancel a receipt of this visit; refunded = the money was handed back
//   settle                   "settle all": every unpaid receipt of this visit's patient, one new receipt per visit
//   settle-bill <billing_id> [amount]
//                            take money for one unpaid receipt (all of it, or part)
//   save-fee <CODE[:amount][,CODE...] | none>
//                            the Save button of the counter fees: keep these lines on the visit
//                            without billing (they replace what was saved; none removes them)
//   show                     print what the screen would show, write nothing
//
// Counter fees saved on a visit (the Save button) are on its bill when it is opened, as on the
// screen: every pay mode bills them, together with any --fee lines, and the receipt takes
// them off the saved list. A visit already billed with saved fees is billed as a supplement.
//
// A visit already billed whose doctor added something is billed again with the same
// command: only what is new is charged (the screen's "Supplement"). A visit whose receipt
// was cancelled is billed again the same way ("Re-bill").
//
// Options:
//   --type=newVisit|followUp|none   the consultation selector (default: what the visit has)
//   --fee=CODE[,CODE]               counter fees added at the till (certificate, CD ...), one each
//   --fee=CODE:amount               ... with the amount typed by the cashier - only for a code whose
//                                   amount the screen lets the cashier change (order_code.price_editable,
//                                   the document fee DOC)
//   --as=login_id                   the cashier (default: the first active admin account)
//   --yes-zero-price                answer "yes" to "N item(s) without a price - bill anyway?"
//   --port=3000                     the api's port (default: PORT, then 3000)
//
// Last line printed: receipt · total · received · change · unpaid · status.
// Refused: "REFUSED <http status> <message>" and exit code 1.

const path = require('path');
const APP = process.env.APP_DIR || '/app';
const { pool } = require(path.join(APP, 'src/config/database'));
const { generateToken } = require(path.join(APP, 'src/middleware/auth'));

const args = process.argv.slice(2);
const opt = {};
const pos = [];
args.forEach(function (a) {
  const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a);
  if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a);
});
const BASE = 'http://localhost:' + (opt.port || process.env.PORT || 3000) + '/api';
const CONSULT_FEE_CODES = ['C01', 'C02', 'C03', 'C04'];
const VTYPE_CODE = { newVisit: 'C01', followUp: 'C02', emergency: 'C03', referral: 'C04' };

let token = null;
class Refused extends Error { constructor(status, text) { super(text); this.status = status; } }
async function call(method, url, body) {
  const r = await fetch(BASE + url, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch (e) { data = text; }
  if (!r.ok) throw new Refused(r.status, (data && data.error) || text);
  return data;
}
function num(v) { return parseFloat(v) || 0; }
function fmt(n) { return String(Math.round(num(n) * 100) / 100); }
function usage(msg) { console.error((msg ? msg + '\n' : '') + 'usage: node pay-visit.js <visit_id> <paid|partial|overpay|unpaid|discount|correct|void|settle|settle-bill|save-fee|show> [values] [--type= --fee= --as= --yes-zero-price --port=]'); process.exit(2); }

// one line for a saved receipt, read back from the server
async function printBill(id, label) {
  const d = await call('GET', '/billing/' + id + '/detail');
  const b = d.bill;
  console.log((label ? label + ' ' : '') + b.receipt_no + ' · total ' + fmt(b.total_due) + ' · received ' + fmt(b.amount_paid) +
    ' · change ' + fmt(b.change_amount) + ' · unpaid ' + fmt(b.outstanding) + ' · ' + b.payment_status);
}

// ── the screen's sums (Payment.jsx) ──
function rxQty(r) { return (r.total_qty == null || r.total_qty === '') ? null : (parseFloat(r.total_qty) || 0); }
function orderQty(o) {
  const v = (o.total_qty != null && o.total_qty !== '') ? o.total_qty : (o.quantity != null && o.quantity !== '') ? o.quantity : 1;
  const n = parseFloat(v); return isNaN(n) ? 0 : n;
}
function chargeRows(bi, consultFee, extraItems) {
  const rows = [];
  const billed = bi.billed_items || [];
  const billedConsultAmt = billed.filter(function (b) { return b.item_type === 'consultation'; }).reduce(function (s, b) { return s + num(b.amount); }, 0);
  const consultCharge = consultFee - billedConsultAmt;
  if (consultCharge > 0.0001) rows.push({ item_type: 'consultation', item_name: 'Consultation', item_code: '', quantity: 1, unit_price: consultCharge, total_price: consultCharge });
  const bm = {};
  billed.forEach(function (b) { if (b.item_type === 'consultation') return; const k = (b.item_code || ''); bm[k] = (bm[k] || 0) + num(b.qty); });
  (bi.prescriptions || []).forEach(function (rx) {
    const qty = rxQty(rx); if (qty == null) return; const up = num(rx.unit_price);
    const was = bm[rx.drug_code] || 0; const nq = qty - was; bm[rx.drug_code] = Math.max(0, was - qty);
    if (nq > 0.0001) rows.push({ item_type: 'drug', item_name: rx.drug_name, item_code: rx.drug_code, quantity: nq, unit_price: up, total_price: nq * up });
  });
  (bi.orders || []).forEach(function (o) {
    const qty = orderQty(o); const up = num(o.unit_price);
    const was = bm[o.order_code] || 0; const nq = qty - was; bm[o.order_code] = Math.max(0, was - qty);
    if (nq > 0.0001) rows.push({ item_type: o.code_type || 'procedure', item_name: o.order_name, item_code: o.order_code, quantity: nq, unit_price: up, total_price: nq * up });
  });
  extraItems.forEach(function (it) { const qty = parseFloat(it.quantity) || 1, up = num(it.unit_price); rows.push({ item_type: 'fee', item_name: it.name, item_code: it.code, quantity: qty, unit_price: up, total_price: qty * up }); });
  return rows;
}

// how the money is taken: {status, typed} - what the cashier typed and which button
function payMode(words, totalDue) {
  const mode = words[0] || 'paid';
  if (mode === 'paid') return { button: 'confirm', typed: totalDue };            // "Exact"
  if (mode === 'unpaid') return { button: 'unpaid', typed: 0 };
  if (mode === 'partial' || mode === 'overpay') {
    const amt = Number(words[1]);
    if (!(amt > 0)) usage(mode + ' needs the amount received');
    if (mode === 'partial' && !(amt < totalDue)) throw new Refused(0, 'partial ' + amt + ' is not less than the total ' + fmt(totalDue) + ' - use paid or overpay');
    if (mode === 'overpay' && !(amt > totalDue)) throw new Refused(0, 'overpay ' + amt + ' is not more than the total ' + fmt(totalDue) + ' - use paid or partial');
    return { button: 'confirm', typed: amt };
  }
  usage('unknown way to pay: ' + mode);
}

// "CODE[:amount],CODE..." -> the lines "+ add" puts under the counter fees
async function feeLines(text) {
  const fc = (await call('GET', '/admin/order-codes?code_type=fee')).filter(function (c) { return CONSULT_FEE_CODES.indexOf(c.code) < 0; });
  return String(text).split(',').map(function (wantRaw) {
    const parts = wantRaw.trim().split(':');
    const want = parts[0];
    const c = fc.find(function (x) { return x.code === want; });
    if (!c) throw new Refused(0, 'no counter fee with code ' + want + ' (have: ' + fc.map(function (x) { return x.code; }).join(', ') + ')');
    let price = num(c.price_clinic || c.price);
    if (parts.length > 1) {
      // the amount box exists only on a line whose code is price_editable; empty or 0 is refused
      if (!c.price_editable) throw new Refused(0, 'the amount of ' + c.code + ' cannot be changed at the till (its code is not price_editable)');
      price = parseFloat(String(parts[1]).replace(/[^0-9.]/g, '')) || 0;
    }
    if (c.price_editable && !(price > 0)) throw new Refused(0, 'no amount for ' + c.name + ' - the screen asks for an amount or for the line to be removed');
    return { order_code_id: c.id, code: c.code, name: c.name, quantity: 1, unit_price: price };
  });
}

// The Save button of the counter fees: the lines given replace what was saved for the visit.
async function saveFees(visitId, words) {
  if (!words[1]) usage('save-fee needs CODE[:amount][,CODE...] or none');
  const bi = await call('GET', '/billing/visit/' + visitId + '/items');
  const lines = words[1] === 'none' ? [] : await feeLines(words[1]);
  const r = await call('PUT', '/billing/visit/' + visitId + '/saved-fees', {
    items: lines.map(function (it) { return { id: null, order_code_id: it.order_code_id, unit_price: it.unit_price }; }),
    expected_saved_ids: (bi.saved_fees || []).map(function (f) { return f.id; }),
  });
  const now = r.saved_fees || [];
  console.log('saved for visit ' + visitId + ': ' + (now.length ? now.map(function (f) { return f.item_code + ' ' + fmt(f.unit_price); }).join(', ') : 'nothing') +
    ' · total ' + fmt(now.reduce(function (a, f) { return a + num(f.quantity) * num(f.unit_price); }, 0)) + ' · not billed');
}

async function billVisit(visitId, words) {
  // the row of the waiting list when the visit is on it (any day) - it carries the
  // carried balance and the correction / re-bill marks; otherwise the bare visit
  const pending = await call('GET', '/billing/pending');
  let sel = pending.find(function (x) { return String(x.id) === String(visitId); });
  if (!sel) {
    const v = (await pool.query('SELECT id, patient_id, visit_type FROM visit WHERE id = $1', [visitId])).rows[0];
    if (!v) throw new Refused(404, 'no visit ' + visitId);
    sel = v;
  }
  if (sel.needs_refund && words[0] !== 'show') throw new Refused(0, 'this visit is marked Correction (items were removed after payment): the screen shows the correction, not a bill - use mode "correct"');
  const bi = await call('GET', '/billing/visit/' + visitId + '/items');
  const vType = opt.type || bi.visit_type || sel.visit_type || 'newVisit';
  if (opt.type && ['newVisit', 'followUp', 'none'].indexOf(opt.type) < 0) usage('--type is newVisit, followUp or none');
  const prices = bi.consult_prices || {};
  const code = VTYPE_CODE[vType] || 'C01';
  const consultFee = vType === 'none' ? 0 : (prices[code] != null ? num(prices[code]) : 0);
  if (vType !== 'none' && prices[code] == null) console.error('warning: consultation code ' + code + ' not found - the consultation counts 0 (the screen shows a yellow notice)');

  // counter fees: the lines saved on the visit (the Save button) come up with the visit, as
  // on the screen; then the ones chosen at the till now
  const saved = bi.saved_fees || [];
  let extraItems = saved.map(function (f) { return { saved_id: f.id, order_code_id: f.order_code_id, code: f.item_code, name: f.item_name, quantity: parseFloat(f.quantity) || 1, unit_price: num(f.unit_price) }; });
  if (opt.fee) extraItems = extraItems.concat(await feeLines(opt.fee));

  const missing = (bi.prescriptions || []).filter(function (r) { return rxQty(r) == null; });
  const rows = chargeRows(bi, consultFee, extraItems);
  const subtotal = rows.reduce(function (s, r) { return s + r.total_price; }, 0);
  const additional = !!(bi.billed_consult || (bi.billed_items && bi.billed_items.length > 0));

  // discount box
  let discount = { type: 'amount', value: 0 };
  let payWords = words;
  if (words[0] === 'discount') {
    const raw = String(words[1] || '');
    const m = /^(\d+(?:\.\d+)?)(%?)$/.exec(raw);
    if (!m) usage('discount needs an amount (2000) or a percent (10%)');
    // the screen's box is an amount; a percent is what the cashier would work out and type
    discount = { type: 'amount', value: m[2] ? Math.round(subtotal * Number(m[1]) / 100) : Number(m[1]) };
    payWords = words.slice(2);
  }
  const discountAmt = Number(discount.value) || 0;
  const prevBal = num(sel.previous_balance);
  const totalDue = Math.max(0, subtotal - discountAmt + prevBal);

  if (words[0] === 'show') {
    console.log('visit ' + visitId + ' · type ' + vType + ' · ' + (sel.needs_refund ? 'CORRECTION pending' : sel.needs_rebill ? 're-bill (held ' + fmt(sel.prior_paid) + ')' : additional ? 'supplement' : 'first bill'));
    rows.forEach(function (r) { console.log('  ' + r.item_type + ' ' + (r.item_code || '-') + ' ' + r.item_name + ' × ' + r.quantity + ' @ ' + r.unit_price + ' = ' + r.total_price); });
    if (saved.length) console.log('  (saved at the till, not billed yet: ' + saved.map(function (f) { return f.item_code + ' ' + fmt(f.unit_price); }).join(', ') + ')');
    if (missing.length) console.log('  MISSING QUANTITY (billing is blocked): ' + missing.map(function (r) { return r.drug_name; }).join(', '));
    console.log('subtotal ' + fmt(subtotal) + ' · carried balance ' + fmt(prevBal) + ' · total ' + fmt(totalDue));
    return;
  }

  // the checks doConfirmNow makes before posting
  if (missing.length) throw new Refused(0, 'total quantity missing for: ' + missing.map(function (r) { return r.drug_name; }).join(', ') + ' - the screen blocks billing until the doctor saves the prescription again');
  if (additional && subtotal <= 0.0001) throw new Refused(0, 'already paid in full: nothing new to charge for this visit');
  const zero = rows.filter(function (r) { return r.item_type !== 'consultation' && r.item_type !== 'fee' && !(r.unit_price > 0); }).map(function (r) { return r.item_name; });
  if (zero.length && !opt['yes-zero-price']) throw new Refused(0, zero.length + ' item(s) without a price (' + zero.join(', ') + ') - the screen asks "bill anyway?"; add --yes-zero-price to answer yes');

  const pay = payMode(payWords, totalDue);
  const typed = pay.typed;
  // the green button picks the status from what was typed; the red one is "unpaid"
  const status = pay.button === 'unpaid' ? 'unpaid' : (typed >= totalDue ? 'paid' : (typed > 0 ? 'partial' : 'unpaid'));
  const unpaid = status === 'unpaid';
  const change = Math.max(0, typed - totalDue);
  const outstanding = Math.max(0, totalDue - typed);
  const sum = function (pick) { return rows.filter(pick).reduce(function (s, r) { return s + r.total_price; }, 0); };

  const result = await call('POST', '/billing', {
    visit_id: sel.id, patient_id: sel.patient_id,
    consult_fee: sum(function (r) { return r.item_type === 'consultation'; }),
    drug_total: sum(function (r) { return r.item_type === 'drug'; }),
    procedure_total: sum(function (r) { return r.item_type !== 'consultation' && r.item_type !== 'drug'; }),
    subtotal: subtotal, discount_amount: discountAmt, discount_type: discount.type,
    discount_value: Number(discount.value) || 0, previous_balance: prevBal, total_due: totalDue,
    amount_paid: unpaid ? 0 : typed, change_amount: unpaid ? 0 : change,
    outstanding: unpaid ? totalDue : (status === 'paid' ? 0 : outstanding), payment_status: status,
    note: '',   // the screen has no note box
    items: rows.map(function (r) { return { item_type: r.item_type, item_name: r.item_name, item_code: r.item_code, quantity: r.quantity, unit_price: r.unit_price, total_price: r.total_price }; }),
    expected_active_bill_ids: bi.active_bill_ids || [],
    saved_fee_ids: saved.map(function (f) { return f.id; }),
  });
  // the screen then writes the consultation type it billed back onto the visit
  try { await call('PUT', '/visits/' + sel.id, { visit_type: vType }); } catch (e) { /* as the screen: ignored */ }
  await printBill(result.id, additional ? 'supplement' : sel.needs_rebill ? 're-bill' : '');
}

async function correctVisit(visitId) {
  const corr = await call('GET', '/billing/visit/' + visitId + '/correction');
  const result = await call('POST', '/billing/visit/' + visitId + '/correct', {
    expected_active_bill_ids: corr.active_bill_ids,
    expected_refund: corr.refund, expected_outstanding: corr.outstanding,
    reason: 'Correction',
  });
  console.log('correction: to hand back ' + fmt(corr.refund) + ' · stays unpaid ' + fmt(corr.outstanding));
  await printBill(result.id, 'correction');
}

async function voidBill(visitId, words) {
  const billId = words[1];
  const how = words[2];
  if (!billId || ['refunded', 'kept'].indexOf(how) < 0) usage('void needs <billing_id> and refunded (the money was handed back) or kept (it stays at the till)');
  const b = (await pool.query('SELECT visit_id, receipt_no FROM billing WHERE id = $1', [billId])).rows[0];
  if (!b) throw new Refused(404, 'no receipt with id ' + billId);
  if (String(b.visit_id) !== String(visitId)) throw new Refused(0, 'receipt ' + b.receipt_no + ' belongs to visit ' + b.visit_id + ', not ' + visitId);
  const reason = words.slice(3).join(' ') || 'Test';
  await call('PUT', '/billing/' + billId + '/void', { reason: reason, refunded: how === 'refunded' });
  await printBill(billId, 'cancelled');
}

async function patientOf(visitId) {
  const v = (await pool.query('SELECT patient_id FROM visit WHERE id = $1', [visitId])).rows[0];
  if (!v) throw new Refused(404, 'no visit ' + visitId);
  return v.patient_id;
}

// "settle all" on the receipts tab: one settlement receipt per visit
async function settleAll(visitId) {
  const pid = await patientOf(visitId);
  const receipts = await call('GET', '/billing/patient/' + pid + '/history');
  const bills = receipts.filter(function (b) { return b.payment_status !== 'cancelled' && num(b.outstanding) > 0; });
  if (!bills.length) throw new Refused(0, 'this patient has no unpaid receipt');
  const byVisit = {}, order = [];
  bills.forEach(function (b) { const k = String(b.visit_id); if (!byVisit[k]) { byVisit[k] = []; order.push(k); } byVisit[k].push(b); });
  for (let i = 0; i < order.length; i++) {
    const group = byVisit[order[i]];
    const owe = group.reduce(function (a, b) { return a + num(b.outstanding); }, 0);
    const s1 = await call('POST', '/billing/settle', { bill_ids: group.map(function (b) { return b.id; }), amount: owe, expected_outstanding: owe });
    await printBill(s1.id, 'settlement');
  }
}

// "take the unpaid amount" on one receipt
async function settleOne(visitId, words) {
  const billId = words[1];
  if (!billId) usage('settle-bill needs <billing_id>');
  const pid = await patientOf(visitId);
  const receipts = await call('GET', '/billing/patient/' + pid + '/history');
  const b = receipts.find(function (x) { return String(x.id) === String(billId); });
  if (!b) throw new Refused(0, 'receipt ' + billId + ' is not one of the receipts of this visit\'s patient');
  const out = num(b.outstanding);
  const amt = words[2] === undefined ? out : (parseFloat(words[2]) || 0);
  if (amt <= 0) throw new Refused(0, 'enter an amount');
  if (amt > out + 0.5) throw new Refused(0, 'cannot be more than the unpaid amount: ' + fmt(out));
  const settled = await call('POST', '/billing/settle', { bill_ids: [b.id], amount: amt, expected_outstanding: out });
  await printBill(settled.id, 'settlement');
}

(async function main() {
  const visitId = pos[0], words = pos.slice(1);
  if (!visitId || !/^\d+$/.test(visitId) || !words.length) usage();
  const who = opt.as
    ? (await pool.query("SELECT * FROM staff WHERE login_id = $1 AND status = 'active'", [opt.as])).rows[0]
    : (await pool.query("SELECT * FROM staff WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1")).rows[0];
  if (!who) { console.error('no active account' + (opt.as ? ' ' + opt.as : ' with the admin role')); process.exit(2); }
  token = generateToken(who);
  const mode = words[0];
  if (['paid', 'partial', 'overpay', 'unpaid', 'discount', 'show'].indexOf(mode) >= 0) await billVisit(visitId, words);
  else if (mode === 'correct') await correctVisit(visitId);
  else if (mode === 'save-fee') await saveFees(visitId, words);
  else if (mode === 'void') await voidBill(visitId, words);
  else if (mode === 'settle') await settleAll(visitId);
  else if (mode === 'settle-bill') await settleOne(visitId, words);
  else usage('unknown mode: ' + mode);
})().then(function () { return pool.end(); }).catch(function (err) {
  if (err instanceof Refused) console.log('REFUSED ' + (err.status || '-') + ' ' + err.message);
  else console.error(err);
  pool.end().then(function () { process.exit(1); });
});
