import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { A4, ClinicHeader, L, fmtDate, printDocument, DOC_LABELS } from '../documents/shared.jsx';
import { packWord } from '../documents/rx-dosing.js';

// The papers of a payment (수납 영수증). Owned by the payment module.
//
// Decided 2026-09-29 (wiki/decisions.md, H3): printed from the stored bill only
// (billing + billing_item via GET /api/billing/:id/detail - never from figures the
// payment screen computed, which is how the old post-payment receipt came out blank with
// a 0 Ar total), always in French whatever the screen language, on A4.
//
// Decided 2026-10-02 (the director, wiki/reference/payment-receipt-split-design.md): the
// one receipt that carried every item is split in two, as at the director's hospital.
//   ReceiptDoc    - the receipt given to the patient: one amount per category, no item
//                   names, then the same totals as before and a place for the stamp.
//   StatementDoc  - the detailed statement: every item, grouped by category. It says it is
//                   not a receipt and carries no payment.
//   SummaryDoc    - several receipts of one patient printed as one receipt: the receipts
//                   listed, the categories added up, billed = received + still owed.
// Printing reads; it never writes a receipt, an amount or a cash row. No paper is marked
// "duplicate" (decided the same day).
//
// Labels keep the document engine's { ko, en, fr } shape (documents/shared.jsx) so the
// language is one argument, but the papers are rendered with RECEIPT_LANG.

export var RECEIPT_LANG = 'fr';

// Paper. A4 prints through printDocument() (14 mm margins), leaving a body about
// 688 px wide. To move to an 80 mm receipt printer later, change this one place
// (about 272 px) and give it its own print window - printDocument() is A4 only.
export var RECEIPT_PAGE = { size: 'A4', widthPx: 688 };

var RL = {
  title:        { ko: '영수증', en: 'Receipt', fr: 'Reçu' },
  stTitle:      { ko: '세부내역서', en: 'Itemised statement', fr: 'Relevé détaillé des prestations' },
  sumTitle:     { ko: '영수증 (합산)', en: 'Summary receipt', fr: 'Reçu récapitulatif' },
  receiptNo:    { ko: '영수번호', en: 'Receipt No.', fr: 'N° de reçu' },
  receiptOne:   { ko: '영수번호', en: 'Receipt No.', fr: 'Reçu n°' },
  receiptMany:  { ko: '영수번호', en: 'Receipts No.', fr: 'Reçus n°' },
  date:         { ko: '일시', en: 'Date', fr: 'Date' },
  at:           { ko: ' ', en: ' at ', fr: ' à ' },
  cashier:      { ko: '수납자', en: 'Cashier', fr: 'Caissier' },
  printedOn:    { ko: '인쇄', en: 'Printed on', fr: 'Imprimé le' },
  printedBy:    { ko: '인쇄한 직원', en: 'Printed by', fr: 'Par' },
  patient:      { ko: '환자', en: 'Patient', fr: 'Patient' },
  visitDate:    { ko: '진료일', en: 'Visit date', fr: 'Date de consultation' },
  period:       { ko: '기간', en: 'Period', fr: 'Période' },
  visitOf:      { ko: '진료', en: 'Visit of', fr: 'Consultation du' },
  visitsFrom:   { ko: '진료', en: 'Visits from', fr: 'Consultations du' },
  to:           { ko: '~', en: 'to', fr: 'au' },
  nReceipts:    { ko: '장', en: 'receipts', fr: 'reçus' },
  service:      { ko: '진료과', en: 'Department', fr: 'Service' },
  doctor:       { ko: '의사', en: 'Physician', fr: 'Médecin' },
  visitType:    { ko: '진료 종류', en: 'Visit type', fr: 'Type de consultation' },
  colCat:       { ko: '분류', en: 'Services', fr: 'Prestations' },
  colCatSum:    { ko: '분류 (위 영수증의 합)', en: 'Services (total of the receipts above)', fr: 'Prestations (total des reçus ci-dessus)' },
  colDate:      { ko: '일자', en: 'Date', fr: 'Date' },
  colName:      { ko: '항목', en: 'Item', fr: 'Désignation' },
  colCode:      { ko: '코드', en: 'Code', fr: 'Code' },
  colQty:       { ko: '수량', en: 'Qty', fr: 'Qté' },
  colUnit:      { ko: '단가', en: 'Unit price', fr: 'Prix unitaire' },
  colAmount:    { ko: '금액', en: 'Amount', fr: 'Montant' },
  colReceiptDate: { ko: '영수 날짜', en: 'Receipt date', fr: 'Date du reçu' },
  colVisitOf:   { ko: '진료일', en: 'Visit of', fr: 'Consultation du' },
  colBilled:    { ko: '청구', en: 'Billed', fr: 'Facturé' },
  colReceived:  { ko: '받은 돈', en: 'Received', fr: 'Encaissé' },
  colOwed:      { ko: '남은 미수', en: 'Balance due', fr: 'Reste à payer' },
  carriedTo:    { ko: '넘어감 →', en: 'carried to', fr: 'reporté sur' },
  noItems:      { ko: '항목 없음', en: 'No items', fr: 'Aucun article' },
  settlement:   { ko: '이전 미수 정산', en: 'Settlement of previous balance', fr: 'Règlement du solde antérieur' },
  settleOf:     { ko: '미수 수납 — 영수', en: 'Settlement of receipt', fr: 'Règlement du reçu' },
  subtotal:     { ko: '소계', en: 'Subtotal', fr: 'Sous-total' },
  discount:     { ko: '할인', en: 'Discount', fr: 'Remise' },
  prevBalance:  { ko: '이전 미수', en: 'Previous balance', fr: 'Solde antérieur' },
  prevOutside:  { ko: '이전 미수 (여기 없는 영수에서)', en: 'Previous balance (receipts not listed here)', fr: 'Solde antérieur (reçus hors de ce récapitulatif)' },
  receiptOf:    { ko: '영수', en: 'receipt', fr: 'reçu' },
  total:        { ko: '총 수납액', en: 'Total due', fr: 'Total à payer' },
  billedTotal:  { ko: '청구 합계', en: 'Total billed', fr: 'Total facturé' },
  handed:       { ko: '받은 금액', en: 'Amount tendered', fr: 'Montant remis' },
  paidBefore:   { ko: '이미 받은 금액', en: 'Already received', fr: 'Déjà encaissé' },
  change:       { ko: '거스름돈', en: 'Change', fr: 'Monnaie rendue' },
  refunded:     { ko: '환불', en: 'Refunded to patient', fr: 'Remboursé au patient' },
  kept:         { ko: '실수납액', en: 'Amount received', fr: 'Montant encaissé' },
  outstanding:  { ko: '남은 미수', en: 'Balance due', fr: 'Reste à payer' },
  carriedOut:   { ko: '다른 영수로 넘어간 미수', en: 'Balance carried to other receipts', fr: 'Solde reporté sur d’autres reçus' },
  status:       { ko: '상태', en: 'Status', fr: 'Statut' },
  cancelled:    { ko: '취소됨', en: 'CANCELLED', fr: 'ANNULÉ' },
  cancelledOn:  { ko: '취소', en: 'Cancelled on', fr: 'Annulé le' },
  by:           { ko: '·', en: 'by', fr: 'par' },
  reason:       { ko: '사유', en: 'Reason', fr: 'Motif' },
  replaces:     { ko: '대신하는 영수', en: 'Replaces receipt(s)', fr: 'Remplace le(s) reçu(s)' },
  carriedInto:  { ko: '이 영수의 미수는 다음 영수로 이월됨', en: 'Balance carried to receipt', fr: 'Solde reporté sur le reçu' },
  of:           { ko: '', en: 'of', fr: 'du' },
  stamp:        { ko: '도장 · 서명', en: 'Stamp and signature', fr: 'Cachet et signature' },
  thanks:       { ko: '감사합니다', en: 'Thank you', fr: 'Merci de votre confiance.' },
  onRequest:    { ko: '세부내역서는 요청하시면 드립니다.', en: 'The itemised statement is given on request.', fr: 'Le détail des prestations (relevé détaillé) est remis sur demande.' },
  itemsTotal:   { ko: '항목 합계', en: 'Total of services', fr: 'Total des prestations' },
  netBilled:    { ko: '청구액', en: 'Net billed', fr: 'Net facturé' },
  notReceipt:   { ko: '이 내역서는 영수증이 아닙니다', en: 'This statement is not a receipt', fr: 'Ce relevé n’est pas un reçu' },
  notReceipt2:  { ko: ' : 진료 · 약의 내역이며 수납을 증명하지 않습니다. 수납 : ', en: ': it lists the services and does not prove payment. Payment: see ', fr: ' : il détaille les prestations et ne prouve pas le paiement. Paiement : voir ' },
  theReceipt:   { ko: '영수증', en: 'receipt No.', fr: 'le reçu n°' },
  theReceipts:  { ko: '영수증', en: 'receipts No.', fr: 'les reçus n°' },
  sumNote:      { ko: '이미 발행한 영수증을 모은 종이입니다. 원래 영수증을 대신하지 않으며 수납을 기록하지 않습니다.', en: 'This summary gathers receipts already issued. It does not replace them and records no payment.', fr: 'Ce récapitulatif réunit des reçus déjà émis. Il ne remplace pas les reçus d’origine et n’enregistre aucun paiement.' },
};
var STATUS = {
  paid:      { ko: '전액 수납', en: 'Paid', fr: 'Payé' },
  partial:   { ko: '부분 수납', en: 'Partially paid', fr: 'Paiement partiel' },
  unpaid:    { ko: '미수', en: 'Unpaid', fr: 'Impayé' },
  cancelled: { ko: '취소', en: 'Cancelled', fr: 'Annulé' },
  waived:    { ko: '면제', en: 'Waived', fr: 'Exonéré' },
  waiting:   { ko: '대기', en: 'Waiting', fr: 'En attente' },
  carried:   { ko: '이월됨', en: 'Carried forward', fr: 'Reporté' },
};
var VISIT_TYPE = {
  newVisit:  { ko: '초진', en: 'New visit', fr: 'Nouvelle consultation' },
  followUp:  { ko: '재진', en: 'Follow-up', fr: 'Consultation de suivi' },
  emergency: { ko: '응급', en: 'Emergency', fr: 'Urgence' },
  referral:  { ko: '의뢰', en: 'Referral', fr: 'Référence' },
};

// The categories of the receipt (decided 2026-10-02): a bill line's item_type, as it is
// stored. No new data and no setting - an old receipt prints by the same rule. The order
// here is the order on paper. `mixed` is only for a bill whose lines do not add up to its
// subtotal (none should exist since the server checks it, M3): its stored parts are used.
var CATS = ['consultation', 'drug', 'lab', 'imaging', 'procedure', 'fee', 'other', 'mixed'];
var CAT = {
  consultation: { ko: '진찰료', en: 'Consultation', fr: 'Consultation' },
  drug:         { ko: '약', en: 'Medicines', fr: 'Médicaments' },
  lab:          { ko: '검사', en: 'Laboratory tests', fr: 'Analyses de laboratoire' },
  imaging:      { ko: '영상', en: 'Imaging', fr: 'Imagerie' },
  procedure:    { ko: '처치', en: 'Procedures and care', fr: 'Actes et soins' },
  fee:          { ko: '서류 · 기타', en: 'Documents and other fees', fr: 'Documents et frais divers' },
  other:        { ko: '기타', en: 'Other', fr: 'Autres' },
  mixed:        { ko: '검사 · 처치 · 기타', en: 'Tests, procedures and other fees', fr: 'Examens, actes et autres frais' },
};

function num(v) { return Number(v) || 0; }
// French writes thousands with a space (15 000 Ar), not a comma. A no-break space so an
// amount never wraps across two lines. Only the papers - the screen keeps its format.
// (Written as the escape for U+00A0, so that an editor cannot turn it into an ordinary space unnoticed.)
function plain(n) { return Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
function money(n) { return plain(n) + '\u00a0Ar'; }
function qty(n) { var v = num(n); return (Math.round(v * 1000) / 1000).toString(); }
function timeOf(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function stampNow(lang) {
  var d = new Date();
  return d.toLocaleDateString('en-CA') + L(RL.at, lang) + timeOf(d);
}
// A correction bill's note is written by the server: "correction of R-..., R-... · refund N".
function replacedReceipts(note) {
  var m = /^correction of ([^·]+)/.exec(String(note || ''));
  return m ? m[1].trim() : '';
}

// A settlement bill's note is written by the server: "settlement of R-..., R-...".
function settledNote(note) {
  var m = /^settlement of (.+)$/.exec(String(note || ''));
  return m ? m[1].trim() : '';
}
function catOf(it) { var k = String((it && it.item_type) || ''); return CAT[k] && k !== 'mixed' ? k : 'other'; }
function itemsOf(d) { return (d && d.items) || []; }
function itemsSum(d) { return itemsOf(d).reduce(function (s, it) { return s + num(it.total_price); }, 0); }
// A settlement receipt (M2): no clinical amount, only an older balance. Same shape
// the statistics use to tell it apart (billing.routes.js, POST /settle).
function isSettlement(d) {
  var b = (d && d.bill) || {};
  return !itemsOf(d).length && num(b.consult_fee) + num(b.drug_total) + num(b.procedure_total) === 0 && num(b.previous_balance) > 0;
}

// One amount per category for a bill: [{ key, amount }] in paper order, zero ones left out.
// From the bill's lines; their sum is the bill's subtotal (the server refuses a bill whose
// lines do not add up). Should an old bill disagree, its stored parts are used so that the
// rows above "Sous-total" always add up to it.
export function categoriesOf(d) {
  var b = (d && d.bill) || {};
  var sums = {};
  if (itemsOf(d).length && Math.abs(itemsSum(d) - num(b.subtotal)) <= 0.5) {
    itemsOf(d).forEach(function (it) { var k = catOf(it); sums[k] = (sums[k] || 0) + num(it.total_price); });
  } else {
    sums.consultation = num(b.consult_fee); sums.drug = num(b.drug_total); sums.mixed = num(b.procedure_total);
  }
  return CATS.filter(function (k) { return Math.abs(sums[k] || 0) > 0.0001; }).map(function (k) { return { key: k, amount: sums[k] }; });
}

// Several receipts of one patient as one: what the summary receipt prints.
//   billed      the services of the receipts (subtotal - discount each) plus a previous
//               balance that came from receipts NOT in the list. A balance carried from
//               one listed receipt to another is counted once - on the receipt it came
//               from - not again in the later receipt's total.
//   received    the cash each receipt kept (net_paid).
//   outstanding what each still owes (a carried receipt owes nothing itself).
//   carriedOut  a listed receipt's balance that moved to a receipt not in the list.
//   ok          billed = received + outstanding + carriedOut, and the categories add up
//               to the subtotal. When this does not hold the summary is not printed - the
//               screen says to print the receipts one by one.
export function combineReceipts(list) {
  var numbers = {};
  list.forEach(function (d) { numbers[d.bill.receipt_no] = true; });
  var sums = {}, out = { rows: [], subtotal: 0, discount: 0, prevOutside: 0, received: 0, outstanding: 0, carriedOut: 0 };
  list.forEach(function (d) {
    var b = d.bill;
    categoriesOf(d).forEach(function (c) { sums[c.key] = (sums[c.key] || 0) + c.amount; });
    var inside = (d.carried_from || []).filter(function (f) { return numbers[f.receipt_no]; }).reduce(function (s, f) { return s + num(f.amount); }, 0);
    var movedOut = b.payment_status !== 'cancelled' && b.carried_into_receipt_no && !numbers[b.carried_into_receipt_no] ? Math.max(0, num(b.total_due) - num(b.net_paid)) : 0;
    out.subtotal += num(b.subtotal); out.discount += num(b.discount_amount);
    out.prevOutside += num(b.previous_balance) - inside;
    out.received += num(b.net_paid); out.outstanding += num(b.outstanding); out.carriedOut += movedOut;
    out.rows.push({ bill: b, billed: num(b.subtotal) - num(b.discount_amount), received: num(b.net_paid), outstanding: num(b.outstanding) });
  });
  out.categories = CATS.filter(function (k) { return Math.abs(sums[k] || 0) > 0.0001; }).map(function (k) { return { key: k, amount: sums[k] }; });
  out.billed = out.subtotal - out.discount + out.prevOutside;
  out.ok = !list.some(function (d) { return d.bill.payment_status === 'cancelled'; }) &&
    Math.abs(out.billed - out.received - out.outstanding - out.carriedOut) <= 0.5 &&
    Math.abs(out.categories.reduce(function (s, c) { return s + c.amount; }, 0) - out.subtotal) <= 0.5;
  return out;
}

// oldest visit first, then the order the receipts were made
function visitDay(d) { return fmtDate(d.bill.visit_date || d.bill.billing_date); }
function byVisit(a, b) {
  var x = visitDay(a), y = visitDay(b);
  return x < y ? -1 : x > y ? 1 : a.bill.id - b.bill.id;
}
function serviceOf(b, lang) {
  return (b.dept_name_fr || b.dept_code || '') + (b.doctor_name ? ((b.dept_name_fr || b.dept_code) ? ' — ' : '') + L(RL.doctor, lang) + ' : ' + b.doctor_name : '');
}

// ── shared pieces ──
var cell = { border: '1px solid #999', padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap' });
// A name is printed whole. It wraps between words, and a word with no space that is wider
// than its cell (a 41-letter surname pushed this table past the page) breaks inside. Only
// the cells that hold names: the chart number and the date keep their one line.
var nameCell = Object.assign({}, cell, { overflowWrap: 'anywhere' });
var th = { borderBottom: '1.5px solid #111', padding: '5px 6px', fontSize: 12, textAlign: 'left', background: '#f0f0f0' };
var td = { borderBottom: '1px solid #ddd', padding: '4px 6px', fontSize: 12, verticalAlign: 'top' };
var right = { textAlign: 'right', whiteSpace: 'nowrap' };
var noSplit = { pageBreakInside: 'avoid', breakInside: 'avoid' };

function Row(p) {
  return <tr style={noSplit}>
    <td style={{ padding: '3px 0', fontSize: 13, fontWeight: p.bold ? 800 : 400 }}>{p.label}</td>
    <td style={Object.assign({ padding: '3px 0', fontSize: p.bold ? 14 : 13, fontWeight: p.bold ? 800 : 400 }, right)}>{p.value}</td>
  </tr>;
}
function Rule() { return <tr><td colSpan={2} style={{ borderTop: '1.5px solid #111', padding: 0 }}></td></tr>; }
function MetaRow(p) { return <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 12.5, marginBottom: 10, gap: '2px 12px' }}>{p.children}</div>; }
function PatientBox(p) {
  var b = p.bill, lang = p.lang, service = serviceOf(b, lang);
  return <table style={Object.assign({ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }, noSplit)}>
    <tbody>
      <tr>
        <td style={head}>{L(RL.patient, lang)}</td>
        <td style={nameCell}>{(b.last_name || '') + ' ' + (b.first_name || '')}</td>
        <td style={head}>{L(DOC_LABELS.chartNo, lang)}</td>
        <td style={cell}>{b.chart_no || ''}</td>
      </tr>
      {p.period ? (
        <tr>
          <td style={head}>{L(RL.period, lang)}</td>
          <td style={cell} colSpan={3}>{p.period}</td>
        </tr>
      ) : (
        <tr>
          <td style={head}>{L(RL.visitDate, lang)}</td>
          <td style={cell} colSpan={service ? 1 : 3}>{fmtDate(b.visit_date)}{VISIT_TYPE[b.visit_type] ? ' — ' + L(VISIT_TYPE[b.visit_type], lang) : ''}</td>
          {service ? <td style={head}>{L(RL.service, lang)}</td> : null}
          {service ? <td style={nameCell}>{service}</td> : null}
        </tr>
      )}
    </tbody>
  </table>;
}
function CategoryTable(p) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
    <thead><tr><th style={th}>{p.title}</th><th style={Object.assign({}, th, right)}>{L(RL.colAmount, p.lang)}</th></tr></thead>
    <tbody>{p.children}</tbody>
  </table>;
}
function catRows(categories, lang) {
  return categories.map(function (c) {
    return <tr key={c.key} style={noSplit}><td style={td}>{L(CAT[c.key], lang)}</td><td style={Object.assign({}, td, right)}>{money(c.amount)}</td></tr>;
  });
}
// Receipt numbers one after the other; a number is never cut at its hyphens.
function noList(numbers) {
  return numbers.map(function (n, i) { return <span key={i}><span style={{ whiteSpace: 'nowrap' }}>{n}</span>{i < numbers.length - 1 ? ', ' : ''}</span>; });
}
function StampBox(p) {
  return <div style={Object.assign({ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }, noSplit)}>
    <div style={{ width: 250, height: 78, border: '1px solid #999', fontSize: 11, color: '#555', padding: '4px 8px', boxSizing: 'border-box' }}>{L(RL.stamp, p.lang)}</div>
  </div>;
}

// ── the receipt: one bill, amounts per category. `data` is GET /api/billing/:id/detail. ──
export function ReceiptDoc(props) {
  var lang = props.lang || RECEIPT_LANG;
  var b = (props.data && props.data.bill) || {};
  var from = (props.data && props.data.carried_from) || [];
  var clinic = props.clinic;
  var cancelled = b.payment_status === 'cancelled';
  var replaces = replacedReceipts(b.note);
  var handed = num(b.amount_paid), change = num(b.change_amount), kept = num(b.net_paid);
  // A carried bill stays 'unpaid' in the data, but its debt is now on the later receipt.
  var statusKey = !cancelled && b.carried_into_receipt_no ? 'carried' : b.payment_status;
  var settlement = isSettlement(props.data);
  var cats = categoriesOf(props.data);

  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={clinic} lang={lang} title={L(RL.title, lang)} />

      <MetaRow>
        <div><b>{L(RL.receiptNo, lang)} :</b> {b.receipt_no || ''}</div>
        <div><b>{L(RL.date, lang)} :</b> {fmtDate(b.billing_date)}{timeOf(b.created_at) ? L(RL.at, lang) + timeOf(b.created_at) : ''}</div>
        {b.cashier_name ? <div><b>{L(RL.cashier, lang)} :</b> {b.cashier_name}</div> : null}
      </MetaRow>

      {cancelled ? (
        <div style={Object.assign({ border: '2.5px solid #b00', color: '#b00', padding: '6px 10px', marginBottom: 12, textAlign: 'center' }, noSplit)}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>{L(RL.cancelled, lang)}</div>
          <div style={{ fontSize: 12 }}>
            {b.cancelled_at ? L(RL.cancelledOn, lang) + ' ' + fmtDate(String(b.cancelled_at)) + ' ' + timeOf(b.cancelled_at) : ''}
            {b.cancelled_by_name ? ' ' + L(RL.by, lang) + ' ' + b.cancelled_by_name : ''}
            {b.cancel_reason ? ' — ' + L(RL.reason, lang) + ' : ' + b.cancel_reason : ''}
          </div>
          {num(b.refunded_amount) > 0 ? <div style={{ fontSize: 13, fontWeight: 800 }}>{L(RL.refunded, lang)} : {money(b.refunded_amount)}</div> : null}
        </div>
      ) : null}
      {replaces ? <div style={{ fontSize: 12.5, marginBottom: 10 }}><b>{L(RL.replaces, lang)} :</b> {replaces}</div> : null}

      <PatientBox bill={b} lang={lang} />

      <CategoryTable title={L(RL.colCat, lang)} lang={lang}>
        {cats.length ? catRows(cats, lang)
          : settlement && from.length ? from.map(function (f, i) {
            return <tr key={'f' + i} style={noSplit}>
              <td style={td}>{L(RL.settleOf, lang)} {f.receipt_no} {L(RL.of, lang)} {fmtDate(f.billing_date)}</td>
              <td style={Object.assign({}, td, right)}>{money(f.amount)}</td>
            </tr>;
          }) : settlement && settledNote(b.note) ? (
            // A cancelled or replaced settlement has lost its carry link; its note still names the receipt.
            <tr style={noSplit}>
              <td style={td}>{L(RL.settleOf, lang)} {settledNote(b.note)}</td>
              <td style={Object.assign({}, td, right)}>{money(b.previous_balance)}</td>
            </tr>
          ) : <tr><td colSpan={2} style={Object.assign({}, td, { fontStyle: 'italic' })}>{num(b.previous_balance) > 0 ? L(RL.settlement, lang) : L(RL.noItems, lang)}</td></tr>}
      </CategoryTable>

      <div style={Object.assign({ display: 'flex', justifyContent: 'flex-end' }, noSplit)}>
        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <tbody>
            {settlement ? null : <Row label={L(RL.subtotal, lang)} value={money(b.subtotal)} />}
            {num(b.discount_amount) > 0 ? <Row label={L(RL.discount, lang)} value={'− ' + money(b.discount_amount)} /> : null}
            {num(b.previous_balance) > 0 && !settlement ? <Row label={L(RL.prevBalance, lang) + (from.length ? ' (' + from.map(function (f) { return L(RL.receiptOf, lang) + ' ' + f.receipt_no + ' ' + L(RL.of, lang) + ' ' + fmtDate(f.billing_date); }).join(', ') + ')' : '')} value={money(b.previous_balance)} /> : null}
            <Rule />
            <Row label={L(RL.total, lang)} value={money(b.total_due)} bold />
            {handed !== kept ? <Row label={L(replaces ? RL.paidBefore : RL.handed, lang)} value={money(handed)} /> : null}
            {change > 0 ? <Row label={L(replaces ? RL.refunded : RL.change, lang)} value={money(change)} /> : null}
            <Row label={L(RL.kept, lang)} value={money(kept)} />
            {num(b.outstanding) > 0 ? <Row label={L(RL.outstanding, lang)} value={money(b.outstanding)} bold /> : null}
            <Row label={L(RL.status, lang)} value={STATUS[statusKey] ? L(STATUS[statusKey], lang) : (b.payment_status || '')} />
          </tbody>
        </table>
      </div>

      {b.carried_into_receipt_no ? (
        <div style={Object.assign({ fontSize: 12.5, marginTop: 10 }, noSplit)}>
          {L(RL.carriedInto, lang)} {b.carried_into_receipt_no}{b.carried_into_date ? ' ' + L(RL.of, lang) + ' ' + fmtDate(b.carried_into_date) : ''}.
        </div>
      ) : null}

      <StampBox lang={lang} />
      <div style={Object.assign({ textAlign: 'center', marginTop: 20, fontSize: 12.5 }, noSplit)}>
        {L(RL.thanks, lang)}
        {cats.length ? <div style={{ color: '#555' }}>{L(RL.onRequest, lang)}</div> : null}
      </div>
    </A4>
  );
}

// ── the detailed statement: every item of one receipt, or of several of one patient ──
// `list` is an array of details. One receipt: grouped by category. Several: one block per
// receipt, oldest visit first, grouped by category inside. Receipts with no line (a
// settlement) have nothing to list and only appear among the receipt numbers.
export function StatementDoc(props) {
  var lang = props.lang || RECEIPT_LANG;
  var list = (props.list || []).slice().sort(byVisit);
  var first = (list[0] && list[0].bill) || {};
  var many = list.length > 1;
  var days = list.map(visitDay).filter(Boolean).sort();
  var numbers = list.map(function (d) { return d.bill.receipt_no; });
  var total = list.reduce(function (s, d) { return s + itemsSum(d); }, 0);
  var discount = list.reduce(function (s, d) { return s + num(d.bill.discount_amount); }, 0);
  var anyItem = list.some(function (d) { return itemsOf(d).length; });
  var catHead = Object.assign({}, td, { background: '#f7f7f7', fontWeight: 700, borderBottom: '1px solid #999' });
  var dayHead = Object.assign({}, td, { background: '#e9e9e9', fontWeight: 800, borderTop: '1.5px solid #111', borderBottom: '1px solid #111' });
  // a head row stays with the line under it when the table runs onto another page
  var keepWithNext = { pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakAfter: 'avoid', breakAfter: 'avoid' };

  function block(d) {
    var b = d.bill, rows = [];
    var groups = CATS.map(function (k) { return { key: k, items: itemsOf(d).filter(function (it) { return catOf(it) === k; }) }; }).filter(function (g) { return g.items.length; });
    if (!groups.length) return rows;
    if (many) {
      rows.push(<tr key={'d' + b.id} style={keepWithNext}>
        <td style={Object.assign({}, dayHead, { overflowWrap: 'anywhere' })} colSpan={5}>{[visitDay(d), [b.dept_name_fr || b.dept_code, b.doctor_name].filter(Boolean).join(', '), L(RL.receiptOf, lang) + ' ' + b.receipt_no].filter(Boolean).join(' — ')}</td>
        <td style={Object.assign({}, dayHead, right)}>{money(itemsSum(d))}</td>
      </tr>);
    }
    groups.forEach(function (g) {
      var sum = g.items.reduce(function (s, it) { return s + num(it.total_price); }, 0);
      rows.push(<tr key={'c' + b.id + g.key} style={keepWithNext}>
        <td style={catHead} colSpan={5}>{L(CAT[g.key], lang)}</td>
        <td style={Object.assign({}, catHead, right)}>{many ? plain(sum) : money(sum)}</td>
      </tr>);
      g.items.forEach(function (it) {
        rows.push(<tr key={'i' + it.id} style={noSplit}>
          <td style={Object.assign({}, td, { whiteSpace: 'nowrap' })}>{visitDay(d)}</td>
          <td style={Object.assign({}, td, { color: '#444', whiteSpace: 'nowrap' })}>{it.item_code || ''}</td>
          <td style={Object.assign({}, td, { overflowWrap: 'anywhere' })}>{it.item_name}</td>
          <td style={Object.assign({}, td, right)}>{plain(it.unit_price)}</td>
          <td style={Object.assign({}, td, right)}>{it.pack_label ? packWord(it, lang, num(it.quantity)) : qty(it.quantity)}</td>
          <td style={Object.assign({}, td, right)}>{plain(it.total_price)}</td>
        </tr>);
      });
    });
    return rows;
  }

  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={L(RL.stTitle, lang)} />

      <MetaRow>
        <div style={{ overflowWrap: 'anywhere' }}><b>{L(many ? RL.receiptMany : RL.receiptOne, lang)} :</b> {noList(numbers)}</div>
        <div><b>{L(RL.printedOn, lang)} :</b> {props.printedAt || stampNow(lang)}</div>
      </MetaRow>

      <PatientBox bill={first} lang={lang} period={many ? (days[0] === days[days.length - 1] ? days[0] : days[0] + ' — ' + days[days.length - 1]) : ''} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            <th style={th}>{L(RL.colDate, lang)}</th>
            <th style={th}>{L(RL.colCode, lang)}</th>
            <th style={th}>{L(RL.colName, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colUnit, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colQty, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colAmount, lang)}</th>
          </tr>
        </thead>
        <tbody>
          {anyItem ? list.map(block) : <tr><td colSpan={6} style={Object.assign({}, td, { fontStyle: 'italic' })}>{L(RL.noItems, lang)}</td></tr>}
        </tbody>
      </table>

      {/* One block that never splits across pages: a long item list pushes it whole onto the
          next page - the totals together with the note under them, so that the note never
          stands alone on a last page. */}
      <div style={noSplit}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
            <tbody>
              {/* Names the paper when this block is pushed alone onto another page. */}
              <tr><td colSpan={2} style={{ fontSize: 10.5, color: '#666', paddingBottom: 4, textAlign: 'right', overflowWrap: 'anywhere' }}>{noList(numbers)} · {(first.last_name || '') + ' ' + (first.first_name || '')}</td></tr>
              <Row label={L(RL.itemsTotal, lang)} value={money(total)} />
              {discount > 0 ? <Row label={L(RL.discount, lang)} value={'− ' + money(discount)} /> : null}
              <Rule />
              <Row label={L(RL.netBilled, lang)} value={money(total - discount)} bold />
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 12, marginTop: 14, border: '1px solid #999', padding: '6px 10px', overflowWrap: 'anywhere' }}>
          <b>{L(RL.notReceipt, lang)}</b>{L(RL.notReceipt2, lang)}{L(many ? RL.theReceipts : RL.theReceipt, lang)} {noList(numbers)}.
        </div>
      </div>
    </A4>
  );
}

// ── the summary receipt: several receipts of one patient printed as one ──
// `list` is an array of details (none cancelled); see combineReceipts() for the sums.
// It carries no "duplicate" mark (decided 2026-10-02); what it is shows in its title, the
// list of receipt numbers and dates, the print date and the note at the bottom.
export function SummaryDoc(props) {
  var lang = props.lang || RECEIPT_LANG;
  var list = (props.list || []).slice().sort(byVisit);
  var first = (list[0] && list[0].bill) || {};
  var c = combineReceipts(list);
  var days = list.map(visitDay).filter(Boolean).sort();
  var period = (days[0] === days[days.length - 1] ? L(RL.visitOf, lang) + ' ' + days[0] : L(RL.visitsFrom, lang) + ' ' + days[0] + ' ' + L(RL.to, lang) + ' ' + days[days.length - 1]) +
    ' (' + list.length + ' ' + L(RL.nReceipts, lang) + ')';

  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={props.clinic} lang={lang} title={L(RL.sumTitle, lang)} />

      <MetaRow>
        <div><b>{L(RL.printedOn, lang)} :</b> {props.printedAt || stampNow(lang)}</div>
        {props.printedBy ? <div style={{ overflowWrap: 'anywhere' }}><b>{L(RL.printedBy, lang)} :</b> {props.printedBy}</div> : null}
      </MetaRow>

      <PatientBox bill={first} lang={lang} period={period} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            <th style={th}>{L(RL.receiptNo, lang)}</th>
            <th style={th}>{L(RL.colReceiptDate, lang)}</th>
            <th style={th}>{L(RL.colVisitOf, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colBilled, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colReceived, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colOwed, lang)}</th>
          </tr>
        </thead>
        <tbody>
          {c.rows.map(function (r) {
            var b = r.bill;
            return <tr key={b.id} style={noSplit}>
              <td style={Object.assign({}, td, { whiteSpace: 'nowrap' })}>{b.receipt_no}</td>
              <td style={td}>{fmtDate(b.billing_date)}</td>
              <td style={td}>{fmtDate(b.visit_date)}</td>
              <td style={Object.assign({}, td, right)}>{plain(r.billed)}</td>
              <td style={Object.assign({}, td, right)}>{plain(r.received)}</td>
              <td style={Object.assign({}, td, right)}>{b.carried_into_receipt_no ? L(RL.carriedTo, lang) + ' ' + b.carried_into_receipt_no : plain(r.outstanding)}</td>
            </tr>;
          })}
        </tbody>
      </table>

      <CategoryTable title={L(RL.colCatSum, lang)} lang={lang}>
        {c.categories.length ? catRows(c.categories, lang)
          : <tr><td colSpan={2} style={Object.assign({}, td, { fontStyle: 'italic' })}>{L(RL.settlement, lang)}</td></tr>}
      </CategoryTable>

      {/* The totals, the stamp box and the note stay on one page together. */}
      <div style={noSplit}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 330 }}>
            <tbody>
              <Row label={L(RL.subtotal, lang)} value={money(c.subtotal)} />
              {c.discount > 0 ? <Row label={L(RL.discount, lang)} value={'− ' + money(c.discount)} /> : null}
              {c.prevOutside > 0.0001 ? <Row label={L(RL.prevOutside, lang)} value={money(c.prevOutside)} /> : null}
              <Rule />
              <Row label={L(RL.billedTotal, lang)} value={money(c.billed)} bold />
              <Row label={L(RL.kept, lang)} value={money(c.received)} />
              {c.carriedOut > 0.0001 ? <Row label={L(RL.carriedOut, lang)} value={money(c.carriedOut)} /> : null}
              <Row label={L(RL.outstanding, lang)} value={money(c.outstanding)} bold />
            </tbody>
          </table>
        </div>

        <StampBox lang={lang} />
        <div style={{ fontSize: 12, marginTop: 14, border: '1px solid #999', padding: '6px 10px' }}>{L(RL.sumNote, lang)}</div>
      </div>
    </A4>
  );
}

// ── windows ──
var shade = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' };
var frame = { background: '#f5f5f5', borderRadius: 8, maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
var paper = { width: RECEIPT_PAGE.widthPx, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' };
// The up-down bar is always there, so the window is sized with it; with 'auto' it appeared
// after the sizing and brought a left-right bar with nothing to scroll.
var scroller = { overflowX: 'auto', overflowY: 'scroll' };
function tabStyle(on) { return { padding: '7px 14px', borderRadius: '6px 6px 0 0', fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none', background: on ? '#fff' : '#e2e5ea', color: on ? '#111' : '#555' }; }
function closeBtn() { return { flex: 1, background: '#fff', color: '#111', border: '1px solid #ccc', borderRadius: 5, padding: '8px', cursor: 'pointer', fontSize: 14 }; }
// (#047857 with white text reads at 5.5:1; the green it replaced, #10b981, was 2.5:1.)
function printBtn(on) { return { flex: 2, background: on ? '#047857' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 5, padding: '8px', cursor: on ? 'pointer' : 'default', fontSize: 14, fontWeight: 800 }; }

// One receipt: preview + print. Loads the bill itself, so the caller only passes the id.
// Two tabs - the receipt first, the detailed statement beside it; the print button prints
// the one shown. `t` is the screen's translation table - the tabs and buttons follow the
// screen language, the papers do not.
export function ReceiptModal(props) {
  var t = props.t || {};
  var ds = useState(null), data = ds[0], setData = ds[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var es = useState(''), err = es[0], setErr = es[1];
  var vs = useState('receipt'), view = vs[0], setView = vs[1];
  var ref = useRef(null);

  useEffect(function () {
    var alive = true;
    setData(null); setErr(''); setView('receipt');
    if (!props.billingId) return;
    api.get('/billing/' + props.billingId + '/detail')
      .then(function (d) { if (alive) setData(d); })
      .catch(function (e) { if (alive) setErr(String(e && e.message || e)); });
    api.get('/admin/clinic').then(function (c) { if (alive) setClinic(c); }).catch(function () {});
    return function () { alive = false; };
  }, [props.billingId]);

  if (!props.billingId) return null;
  var no = data && data.bill ? data.bill.receipt_no : '';
  var hasItems = !!(data && itemsOf(data).length);   // a settlement receipt has no statement
  var showing = view === 'statement' && hasItems ? 'statement' : 'receipt';
  var names = { receipt: t.py_docReceipt || L(RL.title, RECEIPT_LANG), statement: t.py_docStatement || L(RL.stTitle, RECEIPT_LANG) };
  return (
    <div style={shade}>
      <div style={frame}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px 0' }}>
          <button onClick={function () { setView('receipt'); }} style={tabStyle(showing === 'receipt')}>{names.receipt}</button>
          {hasItems ? <button onClick={function () { setView('statement'); }} style={tabStyle(showing === 'statement')}>{names.statement}</button> : null}
        </div>
        <div style={Object.assign({ padding: '0 12px 12px' }, scroller)}>
          <div style={paper}>
            {err ? <div style={{ padding: 30, color: '#b00' }}>{err}</div>
              : !data ? <div style={{ padding: 30, color: '#555' }}>{t.loading || '...'}</div>
              : showing === 'statement' ? <StatementDoc list={[data]} clinic={clinic} innerRef={ref} />
              : <ReceiptDoc data={data} clinic={clinic} innerRef={ref} />}
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #ddd', display: 'flex', gap: 8, background: '#eee' }}>
          <button onClick={props.onClose} style={closeBtn()}>{t.close}</button>
          <button onClick={function () { printDocument(ref.current, (showing === 'statement' ? 'Relevé ' : 'Reçu ') + no, RECEIPT_LANG); }} disabled={!data} style={printBtn(!!data)}>{'🖨 ' + String(t.py_printThis || '{doc}').replace('{doc}', names[showing])}</button>
        </div>
      </div>
    </div>
  );
}

// The papers a selection of receipts makes. doc: 'receipt' | 'statement' | 'both'.
// grouping: 'all' (one paper for all), 'each' (one per receipt), 'visit_day' (receipts of
// the same visit date together). A group of one is the plain receipt / statement of that
// receipt; a group of several is the summary receipt / one statement. Returns
// [{ kind, list, ok }] - ok false when a summary's sums do not hold.
export function reprintPapers(list, doc, grouping) {
  var sorted = (list || []).slice().sort(byVisit), groups = [];
  if (grouping === 'each') groups = sorted.map(function (d) { return [d]; });
  else if (grouping === 'visit_day') {
    var by = {};
    sorted.forEach(function (d) { var k = visitDay(d); if (!by[k]) { by[k] = []; groups.push(by[k]); } by[k].push(d); });
  } else groups = [sorted];
  var out = [];
  groups.forEach(function (g) {
    if (doc !== 'statement') out.push(g.length > 1 ? { kind: 'summary', list: g, ok: combineReceipts(g).ok } : { kind: 'receipt', list: g, ok: true });
    if (doc !== 'receipt' && g.some(function (d) { return itemsOf(d).length; })) out.push({ kind: 'statement', list: g, ok: true });
  });
  return out;
}

// Several receipts of one patient printed again (the receipt list's tick boxes). Reads
// them in one request - the server refuses receipts of different patients - shows the
// papers one under the other, and prints them as one job, each on its own page.
//   props: ids, doc, grouping, printedBy, t, onClose
export function ReprintModal(props) {
  var t = props.t || {};
  var ds = useState(null), list = ds[0], setList = ds[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var es = useState(''), err = es[0], setErr = es[1];
  var ref = useRef(null);
  var key = (props.ids || []).join(',');

  useEffect(function () {
    var alive = true;
    setList(null); setErr('');
    if (!key) return;
    api.get('/billing/receipts?ids=' + key)
      .then(function (r) { if (alive) setList((r && r.receipts) || []); })
      .catch(function (e) { if (alive) setErr(String(e && e.message || e)); });
    api.get('/admin/clinic').then(function (c) { if (alive) setClinic(c); }).catch(function () {});
    return function () { alive = false; };
  }, [key]);

  if (!key) return null;
  var papers = list ? reprintPapers(list, props.doc, props.grouping) : [];
  var bad = papers.filter(function (p) { return !p.ok; });
  var ready = !!list && !err && papers.length > 0 && !bad.length;
  var combined = papers.some(function (p) { return p.list.length > 1; });
  var printedAt = stampNow(RECEIPT_LANG);
  function print() {
    if (!ready) return;
    // Decided 2026-10-02: a change-log line only when receipts are printed together. It is
    // not waited for - a line that cannot be written must not stop the printing.
    if (combined) { try { api.post('/billing/receipts/print-log', { ids: props.ids, document: props.doc, grouping: props.grouping }).catch(function () {}); } catch (e) { /* never stops the print */ } }
    printDocument(ref.current, 'Reçus ' + (list[0] ? (list[0].bill.chart_no || '') : ''), RECEIPT_LANG);
  }
  var box = Object.assign({}, paper, { padding: 30, boxSizing: 'border-box', overflowWrap: 'anywhere' });
  return (
    <div style={shade}>
      <div style={frame}>
        <div style={Object.assign({ padding: 12 }, scroller)}>
          {err ? <div style={Object.assign({}, box, { color: '#b00' })}>{String(err).indexOf('RECEIPTS_MIXED') === 0 ? (t.py_reprintMixed || err) : err}</div>
            : !list ? <div style={Object.assign({}, box, { color: '#555' })}>{t.loading || '...'}</div>
            : bad.length ? <div style={Object.assign({}, box, { color: '#b00' })}>
                {t.py_reprintCannot || 'These receipts cannot be printed as one.'}
                <div style={{ marginTop: 8, color: '#333', fontSize: 13 }}>{bad.map(function (p) { return p.list.map(function (d) { return d.bill.receipt_no; }).join(', '); }).join(' · ')}</div>
              </div>
            : !papers.length ? <div style={Object.assign({}, box, { color: '#555' })}>{t.py_reprintNothing || L(RL.noItems, RECEIPT_LANG)}</div>
            : <div style={paper}>
                {/* What is printed is this node: the papers and nothing of the window. Each
                    paper starts a page of its own; the grey gap between them is for the screen. */}
                <div ref={ref}>
                  <style>{'@media print{.receipt-gap{display:none}}'}</style>
                  {papers.map(function (p, i) {
                    var last = i === papers.length - 1;
                    return <div key={i}>
                      <div style={{ pageBreakAfter: last ? 'auto' : 'always', breakAfter: last ? 'auto' : 'page' }}>
                        {p.kind === 'summary' ? <SummaryDoc list={p.list} clinic={clinic} printedAt={printedAt} printedBy={props.printedBy} />
                          : p.kind === 'statement' ? <StatementDoc list={p.list} clinic={clinic} printedAt={printedAt} />
                          : <ReceiptDoc data={p.list[0]} clinic={clinic} />}
                      </div>
                      {last ? null : <div className="receipt-gap" style={{ height: 14, background: '#c9ced6' }}></div>}
                    </div>;
                  })}
                </div>
              </div>}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #ddd', display: 'flex', gap: 8, background: '#eee' }}>
          <button onClick={props.onClose} style={closeBtn()}>{t.close}</button>
          <button onClick={print} disabled={!ready} style={printBtn(ready)}>{'🖨 ' + String(t.py_printPapers || '{n}').replace('{n}', papers.length)}</button>
        </div>
      </div>
    </div>
  );
}
