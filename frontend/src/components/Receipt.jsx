import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { A4, ClinicHeader, L, fmtDate, printDocument, DOC_LABELS } from '../documents/shared.jsx';
import { packWord } from '../documents/rx-dosing.js';

// The payment receipt (수납 영수증). Owned by the payment module.
//
// Decided 2026-09-29 (wiki/decisions.md, H3): one receipt for right after payment
// and for reprints, printed from the stored bill only (billing + billing_item via
// GET /api/billing/:id/detail - never from figures the payment screen computed,
// which is how the old post-payment receipt came out blank with a 0 Ar total),
// always in French whatever the screen language, on A4.
//
// Labels keep the document engine's { ko, en, fr } shape (documents/shared.jsx) so
// the language is one argument, but the receipt is rendered with RECEIPT_LANG.

export var RECEIPT_LANG = 'fr';

// Paper. A4 prints through printDocument() (14 mm margins), leaving a body about
// 688 px wide. To move to an 80 mm receipt printer later, change this one place
// (about 272 px) and give it its own print window - printDocument() is A4 only.
export var RECEIPT_PAGE = { size: 'A4', widthPx: 688 };

var RL = {
  title:        { ko: '영수증', en: 'Receipt', fr: 'Reçu' },
  receiptNo:    { ko: '영수번호', en: 'Receipt No.', fr: 'N° de reçu' },
  date:         { ko: '일시', en: 'Date', fr: 'Date' },
  at:           { ko: ' ', en: ' at ', fr: ' à ' },
  cashier:      { ko: '수납자', en: 'Cashier', fr: 'Caissier' },
  patient:      { ko: '환자', en: 'Patient', fr: 'Patient' },
  visitDate:    { ko: '진료일', en: 'Visit date', fr: 'Date de consultation' },
  service:      { ko: '진료과', en: 'Department', fr: 'Service' },
  doctor:       { ko: '의사', en: 'Physician', fr: 'Médecin' },
  visitType:    { ko: '진료 종류', en: 'Visit type', fr: 'Type de consultation' },
  colName:      { ko: '항목', en: 'Item', fr: 'Désignation' },
  colCode:      { ko: '코드', en: 'Code', fr: 'Code' },
  colQty:       { ko: '수량', en: 'Qty', fr: 'Qté' },
  colUnit:      { ko: '단가', en: 'Unit price', fr: 'Prix unitaire' },
  colAmount:    { ko: '금액', en: 'Amount', fr: 'Montant' },
  noItems:      { ko: '항목 없음', en: 'No items', fr: 'Aucun article' },
  settlement:   { ko: '이전 미수 정산', en: 'Settlement of previous balance', fr: 'Règlement du solde antérieur' },
  settleOf:     { ko: '미수 수납 — 영수', en: 'Settlement of receipt', fr: 'Règlement du reçu' },
  subtotal:     { ko: '소계', en: 'Subtotal', fr: 'Sous-total' },
  discount:     { ko: '할인', en: 'Discount', fr: 'Remise' },
  prevBalance:  { ko: '이전 미수', en: 'Previous balance', fr: 'Solde antérieur' },
  receiptOf:    { ko: '영수', en: 'receipt', fr: 'reçu' },
  total:        { ko: '총 수납액', en: 'Total due', fr: 'Total à payer' },
  handed:       { ko: '받은 금액', en: 'Amount tendered', fr: 'Montant remis' },
  paidBefore:   { ko: '이미 받은 금액', en: 'Already received', fr: 'Déjà encaissé' },
  change:       { ko: '거스름돈', en: 'Change', fr: 'Monnaie rendue' },
  refunded:     { ko: '환불', en: 'Refunded to patient', fr: 'Remboursé au patient' },
  kept:         { ko: '실수납액', en: 'Amount received', fr: 'Montant encaissé' },
  outstanding:  { ko: '남은 미수', en: 'Balance due', fr: 'Reste à payer' },
  status:       { ko: '상태', en: 'Status', fr: 'Statut' },
  cancelled:    { ko: '취소됨', en: 'CANCELLED', fr: 'ANNULÉ' },
  cancelledOn:  { ko: '취소', en: 'Cancelled on', fr: 'Annulé le' },
  by:           { ko: '·', en: 'by', fr: 'par' },
  reason:       { ko: '사유', en: 'Reason', fr: 'Motif' },
  replaces:     { ko: '대신하는 영수', en: 'Replaces receipt(s)', fr: 'Remplace le(s) reçu(s)' },
  carriedInto:  { ko: '이 영수의 미수는 다음 영수로 이월됨', en: 'Balance carried to receipt', fr: 'Solde reporté sur le reçu' },
  of:           { ko: '', en: 'of', fr: 'du' },
  thanks:       { ko: '감사합니다', en: 'Thank you', fr: 'Merci de votre confiance.' },
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

function num(v) { return Number(v) || 0; }
// French writes thousands with a space (15 000 Ar), not a comma. A no-break space so an
// amount never wraps across two lines. Only the receipt - the screen keeps its format.
function money(n) { return Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ar'; }
function qty(n) { var v = num(n); return (Math.round(v * 1000) / 1000).toString(); }
function timeOf(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

// The printable page. `data` is the GET /api/billing/:id/detail response.
export function ReceiptDoc(props) {
  var lang = props.lang || RECEIPT_LANG;
  var b = (props.data && props.data.bill) || {};
  var items = (props.data && props.data.items) || [];
  var from = (props.data && props.data.carried_from) || [];
  var clinic = props.clinic;
  var cancelled = b.payment_status === 'cancelled';
  var replaces = replacedReceipts(b.note);
  var handed = num(b.amount_paid), change = num(b.change_amount), kept = num(b.net_paid);
  // A carried bill stays 'unpaid' in the data, but its debt is now on the later receipt.
  var statusKey = !cancelled && b.carried_into_receipt_no ? 'carried' : b.payment_status;
  // A settlement receipt (M2): no clinical amount, only an older balance. Same shape
  // the statistics use to tell it apart (billing.routes.js, POST /settle).
  var settlement = !items.length && num(b.consult_fee) + num(b.drug_total) + num(b.procedure_total) === 0 && num(b.previous_balance) > 0;
  var service = (b.dept_name_fr || b.dept_code || '') + (b.doctor_name ? ((b.dept_name_fr || b.dept_code) ? ' — ' : '') + L(RL.doctor, lang) + ' : ' + b.doctor_name : '');

  var cell = { border: '1px solid #999', padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
  var head = Object.assign({}, cell, { background: '#f0f0f0', fontWeight: 700, whiteSpace: 'nowrap' });
  var th = { borderBottom: '1.5px solid #111', padding: '5px 6px', fontSize: 12, textAlign: 'left', background: '#f0f0f0' };
  var td = { borderBottom: '1px solid #ddd', padding: '4px 6px', fontSize: 12, verticalAlign: 'top' };
  var right = { textAlign: 'right', whiteSpace: 'nowrap' };
  function Row(p) {
    return <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <td style={{ padding: '3px 0', fontSize: 13, fontWeight: p.bold ? 800 : 400 }}>{p.label}</td>
      <td style={Object.assign({ padding: '3px 0', fontSize: p.bold ? 14 : 13, fontWeight: p.bold ? 800 : 400 }, right)}>{p.value}</td>
    </tr>;
  }

  return (
    <A4 innerRef={props.innerRef}>
      <ClinicHeader clinic={clinic} lang={lang} title={L(RL.title, lang)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 10, gap: 12 }}>
        <div><b>{L(RL.receiptNo, lang)} :</b> {b.receipt_no || ''}</div>
        <div><b>{L(RL.date, lang)} :</b> {fmtDate(b.billing_date)}{timeOf(b.created_at) ? L(RL.at, lang) + timeOf(b.created_at) : ''}</div>
        {b.cashier_name ? <div><b>{L(RL.cashier, lang)} :</b> {b.cashier_name}</div> : null}
      </div>

      {cancelled ? (
        <div style={{ border: '2.5px solid #b00', color: '#b00', padding: '6px 10px', marginBottom: 12, textAlign: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
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

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody>
          <tr>
            <td style={head}>{L(RL.patient, lang)}</td>
            <td style={cell}>{(b.last_name || '') + ' ' + (b.first_name || '')}</td>
            <td style={head}>{L(DOC_LABELS.chartNo, lang)}</td>
            <td style={cell}>{b.chart_no || ''}</td>
          </tr>
          <tr>
            <td style={head}>{L(RL.visitDate, lang)}</td>
            <td style={cell} colSpan={service ? 1 : 3}>{fmtDate(b.visit_date)}{VISIT_TYPE[b.visit_type] ? ' — ' + L(VISIT_TYPE[b.visit_type], lang) : ''}</td>
            {service ? <td style={head}>{L(RL.service, lang)}</td> : null}
            {service ? <td style={cell}>{service}</td> : null}
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            <th style={th}>{L(RL.colName, lang)}</th>
            <th style={th}>{L(RL.colCode, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colQty, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colUnit, lang)}</th>
            <th style={Object.assign({}, th, right)}>{L(RL.colAmount, lang)}</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? items.map(function (it, i) {
            return <tr key={i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td style={td}>{it.item_name}</td>
              <td style={Object.assign({}, td, { color: '#444' })}>{it.item_code || ''}</td>
              <td style={Object.assign({}, td, right)}>{it.pack_label ? packWord(it, lang, num(it.quantity)) : qty(it.quantity)}</td>
              <td style={Object.assign({}, td, right)}>{money(it.unit_price)}</td>
              <td style={Object.assign({}, td, right)}>{money(it.total_price)}</td>
            </tr>;
          }) : settlement && from.length ? from.map(function (f, i) {
            return <tr key={'f' + i} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td style={td} colSpan={2}>{L(RL.settleOf, lang)} {f.receipt_no} {L(RL.of, lang)} {fmtDate(f.billing_date)}</td>
              <td style={Object.assign({}, td, right)}>1</td>
              <td style={Object.assign({}, td, right)}>{money(f.amount)}</td>
              <td style={Object.assign({}, td, right)}>{money(f.amount)}</td>
            </tr>;
          }) : settlement && settledNote(b.note) ? (
            // A cancelled or replaced settlement has lost its carry link; its note still names the receipt.
            <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td style={td} colSpan={2}>{L(RL.settleOf, lang)} {settledNote(b.note)}</td>
              <td style={Object.assign({}, td, right)}>1</td>
              <td style={Object.assign({}, td, right)}>{money(b.previous_balance)}</td>
              <td style={Object.assign({}, td, right)}>{money(b.previous_balance)}</td>
            </tr>
          ) : <tr><td colSpan={5} style={Object.assign({}, td, { fontStyle: 'italic' })}>{num(b.previous_balance) > 0 ? L(RL.settlement, lang) : L(RL.noItems, lang)}</td></tr>}
        </tbody>
      </table>

      {/* One block that never splits across pages: a long item list pushes it whole onto the next page. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <tbody>
            {/* Names the receipt when this block is pushed alone onto a second page. */}
            <tr><td colSpan={2} style={{ fontSize: 10.5, color: '#666', paddingBottom: 4, textAlign: 'right' }}>{b.receipt_no} · {(b.last_name || '') + ' ' + (b.first_name || '')}</td></tr>
            {settlement ? null : <Row label={L(RL.subtotal, lang)} value={money(b.subtotal)} />}
            {num(b.discount_amount) > 0 ? <Row label={L(RL.discount, lang)} value={'− ' + money(b.discount_amount)} /> : null}
            {num(b.previous_balance) > 0 && !settlement ? <Row label={L(RL.prevBalance, lang) + (from.length ? ' (' + from.map(function (f) { return L(RL.receiptOf, lang) + ' ' + f.receipt_no + ' ' + L(RL.of, lang) + ' ' + fmtDate(f.billing_date); }).join(', ') + ')' : '')} value={money(b.previous_balance)} /> : null}
            <tr><td colSpan={2} style={{ borderTop: '1.5px solid #111', padding: 0 }}></td></tr>
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
        <div style={{ fontSize: 12.5, marginTop: 10, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {L(RL.carriedInto, lang)} {b.carried_into_receipt_no}{b.carried_into_date ? ' ' + L(RL.of, lang) + ' ' + fmtDate(b.carried_into_date) : ''}.
        </div>
      ) : null}

      <div style={{ textAlign: 'center', marginTop: 26, fontSize: 12.5, pageBreakInside: 'avoid', breakInside: 'avoid' }}>{L(RL.thanks, lang)}</div>
    </A4>
  );
}

// Preview + print window. Loads the bill itself, so the caller only passes the id.
// `t` is the screen's translation table - the buttons follow the screen language,
// the receipt does not.
export function ReceiptModal(props) {
  var t = props.t || {};
  var ds = useState(null), data = ds[0], setData = ds[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var es = useState(''), err = es[0], setErr = es[1];
  var ref = useRef(null);

  useEffect(function () {
    var alive = true;
    setData(null); setErr('');
    if (!props.billingId) return;
    api.get('/billing/' + props.billingId + '/detail')
      .then(function (d) { if (alive) setData(d); })
      .catch(function (e) { if (alive) setErr(String(e && e.message || e)); });
    api.get('/admin/clinic').then(function (c) { if (alive) setClinic(c); }).catch(function () {});
    return function () { alive = false; };
  }, [props.billingId]);

  if (!props.billingId) return null;
  var no = data && data.bill ? data.bill.receipt_no : '';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#f5f5f5', borderRadius: 8, maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', padding: 12 }}>
          <div style={{ width: RECEIPT_PAGE.widthPx, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            {err ? <div style={{ padding: 30, color: '#b00' }}>{err}</div>
              : !data ? <div style={{ padding: 30, color: '#555' }}>{t.loading || '...'}</div>
              : <ReceiptDoc data={data} clinic={clinic} innerRef={ref} />}
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #ddd', display: 'flex', gap: 8, background: '#eee' }}>
          <button onClick={props.onClose} style={{ flex: 1, background: '#fff', border: '1px solid #ccc', borderRadius: 5, padding: '8px', cursor: 'pointer', fontSize: 14 }}>{t.close}</button>
          <button onClick={function () { printDocument(ref.current, 'Reçu ' + no, RECEIPT_LANG); }} disabled={!data} style={{ flex: 2, background: data ? '#10b981' : '#9ca3af', border: 'none', borderRadius: 5, padding: '8px', cursor: data ? 'pointer' : 'default', fontSize: 14, fontWeight: 700, color: '#fff' }}>🖨 {t.printReceipt}</button>
        </div>
      </div>
    </div>
  );
}
