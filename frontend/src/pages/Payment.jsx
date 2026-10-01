import { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';
import { PatientChart } from '../components/PatientChart.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
import { RadiologyReadings } from '../components/RadiologyReadings.jsx';
import { ReceiptModal } from '../components/Receipt.jsx';
import { packWord } from '../documents/rx-dosing.js';

// Amounts: French puts a non-breaking space between thousands (« 108 850 »), as the
// receipt and the pharmacy screen do; Korean and English a comma. What is typed in
// an amount box is left as typed.
function fmtAmount(n, lang){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? '\u00a0' : ','); }
function ymd(d){ if(!d) return ''; return String(d).split('T')[0]; }

export default function PaymentPage() {
  var langCtx = useLang(); var t = langCtx.t;
  function fmtAr(n){ return fmtAmount(n, langCtx.lang); }
  var ps = useState([]), pending = ps[0], setPending = ps[1];
  var cs = useState([]), completed = cs[0], setCompleted = cs[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];
  var bis = useState(null), billItems = bis[0], setBillItems = bis[1];
  var dbs = useState(null), doneBill = dbs[0], setDoneBill = dbs[1];
  var paid = useState(''), amountPaid = paid[0], setAmountPaid = paid[1];
  var ds = useState({type:'amount',value:0}), discount = ds[0], setDiscount = ds[1];
  var ns = useState(''), payNote = ns[0], setPayNote = ns[1];
  var rids = useState(null), receiptId = rids[0], setReceiptId = rids[1];   // bill whose receipt is open
  var rqs = useState([]), receiptQueue = rqs[0], setReceiptQueue = rqs[1];   // more receipts to show after it (settle all)
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var ts = useState('waiting'), tab = ts[0], setTab = ts[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var vts = useState('newVisit'), vType = vts[0], setVType = vts[1];
  var exs = useState([]), extraItems = exs[0], setExtraItems = exs[1];
  var fcs = useState([]), feeCodes = fcs[0], setFeeCodes = fcs[1];
  var rt2 = useState('chart'), rightTab2 = rt2[0], setRightTab2 = rt2[1];
  var rcps = useState([]), receipts = rcps[0], setReceipts = rcps[1];
  var sbs = useState(null), settleBill = sbs[0], setSettleBill = sbs[1];
  var vds = useState(null), voidDlg = vds[0], setVoidDlg = vds[1];   // {bill, reason} - the cancel dialog (M6)
  var cds = useState(null), cashDay = cds[0], setCashDay = cds[1];          // GET /cash-day (M9)
  var sis = useState(false), showInactive = sis[0], setShowInactive = sis[1]; // cancelled / replaced receipts folded
  // Work date (2026-10-01, asked for by the office manager), as on the reception screen:
  // the lists show one day's visits, today by default. "Today" comes from the server
  // (GET /cash-day), never the PC's clock. While the screen follows today a reload after
  // midnight moves to the new day; a date staff picked stays put. Earlier days' visits
  // still to settle are not mixed into today's list but kept under one folded line.
  // Money is unchanged: a payment taken while a past date is shown is dated today.
  var wds = useState(''), workDate = wds[0], setWorkDate = wds[1];
  var tds = useState(''), serverToday = tds[0], setServerToday = tds[1];
  var workRef = useRef({ date: '', follow: true });
  var sps = useState(false), showPast = sps[0], setShowPast = sps[1];
  var viewingPast = !!(workDate && serverToday && workDate < serverToday);
  function chooseWorkDate(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))) return;
    if(serverToday && date > serverToday) date = serverToday;   // nothing is billed ahead
    workRef.current = { date: date, follow: date === serverToday };
    setWorkDate(date); setShowPast(false);
    setSel(null); setBillItems(null); setDoneBill(null);   // a visit of the other day is not left open
    loadLists();
  }
  function shiftWorkDate(days){
    var d = new Date((workDate || serverToday) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    chooseWorkDate(d.toLocaleDateString('en-CA'));
  }
  function dayOf(v){ return v && v.visit_date ? ymd(v.visit_date).slice(0,10) : ''; }
  var sams = useState(''), settleAmt = sams[0], setSettleAmt = sams[1];
  var pbs = useState({owed:0,refund:0}), patBalance = pbs[0], setPatBalance = pbs[1];
  var fos = useState(false), finderOpen = fos[0], setFinderOpen = fos[1];
  var dcs = useState(false), docOpen = dcs[0], setDocOpen = dcs[1];
  var rxs2 = useState(false), rxOpen = rxs2[0], setRxOpen = rxs2[1];
  var chs2 = useState(false), chartOpen = chs2[0], setChartOpen = chs2[1];
  var rdo2 = useState(false), readingsOpen = rdo2[0], setReadingsOpen = rdo2[1];
  var cps2 = useState({}), consultPrices = cps2[0], setConsultPrices = cps2[1];
  // Every button that writes money goes through once(): while one request is in
  // flight the others are refused and shown disabled. A second click used to store
  // a second receipt. The ref, not the state, is the real guard - state updates
  // are not visible to a click handled before the next render.
  var crs = useState(null), corr = crs[0], setCorr = crs[1];   // correction preview from the server
  var busyRef = useRef(false);
  var bzs = useState(false), busy = bzs[0], setBusy = bzs[1];
  async function once(fn){
    if(busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  }
  // "BILL_CARRIED: R-..." - the bill's balance already moved to a later receipt.
  function carriedText(template, err){ return template.split('{receipt}').join(String(err && err.message || '').replace(/^BILL_CARRIED:\s*/,'')); }
  function isCarried(err){ return String(err && err.message).indexOf('BILL_CARRIED')===0; }
  // A refused settlement means the receipt list on screen was stale: reload it.
  async function payRefused(err){
    alert(carriedText(t.py_payCarried, err));
    setSettleBill(null); setSettleAmt('');
    var pid = sel?sel.patient_id:null;
    if(pid){ try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){}
             try { setPatBalance(await api.get('/billing/patient/'+pid+'/balance')); } catch(e){} }
  }
  function showError(err){
    if(String(err && err.message).indexOf('BILL_CARRIED')===0){
      alert(t.py_correctionCarried.split('{receipt}').join(String(err.message).replace(/^BILL_CARRIED:\s*/,'')));
      return;
    }
    if(String(err && err.message).indexOf('VISIT_CANCELLED')===0){ alert(t.py_visitCancelled); return; }
    if(String(err && err.message).indexOf('QTY_MISSING')===0){
      alert(t.py_qtyMissingBlock.replace('{names}', String(err.message).replace(/^QTY_MISSING:\s*/,'')));
      return;
    }
    if(String(err && err.message).indexOf('BILL_CHANGED')===0){
      alert(t.py_billChanged);
      setSel(null); setBillItems(null); loadLists();
      return;
    }
    alert('Error: '+err.message);
  }
  var CONSULT_FEE_CODES = ['C01','C02','C03','C04'];
  var VTYPE_CODE = { newVisit:'C01', followUp:'C02', emergency:'C03', referral:'C04' };

  var bd='var(--border)',bd2='var(--border-2)',scBg='var(--panel-head)',pn='var(--panel)',tx='var(--text)',t2='var(--text-2)',t3='var(--text-3)';
  var L = {
    waitingPay: t.waitingPay || (langCtx.lang==='ko'?'수납 대기':langCtx.lang==='fr'?'En attente':'Payment Waiting'),
    completedPay: t.completedPay || (langCtx.lang==='ko'?'수납 완료':langCtx.lang==='fr'?'Payé aujourd’hui':'Paid Today'),
    todayPaid: langCtx.lang==='ko'?'오늘 수납 완료':langCtx.lang==='fr'?'Paiements du jour':'Today\'s payments',
    paidListHint: langCtx.lang==='ko'?'오늘 수납된 건을 확인하는 화면입니다.':langCtx.lang==='fr'?'Liste des paiements finalisés aujourd’hui.':'Review payments completed today.',
    receiptNo: langCtx.lang==='ko'?'영수번호':langCtx.lang==='fr'?'Reçu':'Receipt No.',
    cashier: langCtx.lang==='ko'?'수납자':langCtx.lang==='fr'?'Caissier':'Cashier',
    selectWaiting: langCtx.lang==='ko'?'수납할 환자를 선택하세요':langCtx.lang==='fr'?'Sélectionnez un patient à encaisser':'Select a patient to bill',
    selectCompleted: langCtx.lang==='ko'?'수납 완료 건을 선택하세요':langCtx.lang==='fr'?'Sélectionnez un paiement':'Select a completed payment',
    noCompleted: langCtx.lang==='ko'?'오늘 수납 완료된 건이 없습니다.':langCtx.lang==='fr'?'Aucun paiement aujourd’hui.':'No completed payments today.',
    leaveUnpaid: langCtx.lang==='ko'?'미수 처리':langCtx.lang==='fr'?'Impayé':'Leave Unpaid',
    exact: langCtx.lang==='ko'?'정확히':langCtx.lang==='fr'?'Exact':'Exact',
    billDetail: langCtx.lang==='ko'?'수납 상세':langCtx.lang==='fr'?'Détail paiement':'Payment Detail',
    item: langCtx.lang==='ko'?'항목':langCtx.lang==='fr'?'Article':'Item',
    qty: langCtx.lang==='ko'?'수량':langCtx.lang==='fr'?'Qté':'Qty',
    unitPrice: langCtx.lang==='ko'?'단가':langCtx.lang==='fr'?'Prix':'Unit',
    total: langCtx.lang==='ko'?'합계':langCtx.lang==='fr'?'Total':'Total'
  };

  useEffect(function(){ loadLists(); },[]);
  // Quiet refresh (2026-10-01): the lists and the day follow the server every 30 s and
  // when the tab comes back, as reception and pharmacy do - a screen left open overnight
  // no longer shows yesterday as today. It does not touch the open patient or the bill
  // being typed, and it is skipped while a payment is being saved.
  useEffect(function(){
    function tick(){ if(!document.hidden && !busyRef.current) loadLists(true); }
    var id = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return function(){ clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  },[]);
  useEffect(function(){ setSel(null); setBillItems(null); setDoneBill(null); },[tab]);
  useEffect(function(){
    var pid = sel ? sel.patient_id : null;
    if(!pid){ setReceipts([]); setPatBalance({owed:0,refund:0}); return; }
    api.get('/billing/patient/'+pid+'/history').then(function(r){ setReceipts(r||[]); }).catch(function(){ setReceipts([]); });
    api.get('/billing/patient/'+pid+'/balance').then(function(b){ setPatBalance(b||{owed:0,refund:0}); }).catch(function(){ setPatBalance({owed:0,refund:0}); });
  },[sel]);

  // quiet === true: the 30 s refresh - no "loading" over the list, the fee codes are not
  // read again. (The refresh button passes its click event, which is not `true`.)
  async function loadLists(quiet){
    quiet = quiet === true;
    if(!quiet) setLoading(true);
    try {
      var data = await api.get('/billing/pending');
      var cd = null; try { cd = await api.get('/billing/cash-day'); } catch(e){}
      var today = (cd && (cd.today || cd.date)) || '';
      setPending(data);
      setServerToday(today);
      if(workRef.current.follow || !workRef.current.date) workRef.current = { date: today, follow: true };
      var wd = workRef.current.date;
      setWorkDate(wd);
      var done = await api.get('/billing/completed' + (wd ? '?date=' + wd : ''));
      if(wd && today && wd !== today){ try { cd = await api.get('/billing/cash-day?date=' + wd); } catch(e){ cd = null; } }
      // the date may have been changed while this was read: the later read owns the lists
      if(workRef.current.date === wd){ setCompleted(done); setCashDay(cd); }
      if(!quiet){
        try {
          var fc = await api.get('/admin/order-codes?code_type=fee');
          setFeeCodes((fc||[]).filter(function(c){ return CONSULT_FEE_CODES.indexOf(c.code)<0; }));
        } catch(e){ setFeeCodes([]); }
      }
    } catch(err){ if(!quiet) console.error(err); }
    if(!quiet) setLoading(false);
  }

  function matches(v){
    if(!q) return true;
    var s=q.toLowerCase();
    return String((v.first_name||'')+' '+(v.last_name||'')).toLowerCase().indexOf(s)>=0 || String(v.chart_no||'').toLowerCase().indexOf(s)>=0 || String(v.receipt_no||'').toLowerCase().indexOf(s)>=0;
  }

  async function selectVisit(v){
    setSel(v); setDoneBill(null);
    setDiscount({type:'amount',value:0}); setPayNote('');
    setExtraItems([]);
    // 영수취소 후 재수납이면, 취소분에서 이미 받은 금액을 이월(중복 청구 방지)
    var carried = (v && v.needs_rebill) ? (parseFloat(v.prior_paid)||0) : 0;
    setAmountPaid(carried>0 ? String(carried) : '');
    try {
      var bi = await api.get('/billing/visit/'+v.id+'/items');
      setBillItems(bi);
      setConsultPrices((bi && bi.consult_prices) || {});
      if(v && v.needs_refund) loadCorrection(v.id); else setCorr(null);
      setVType((bi && bi.visit_type) || v.visit_type || 'newVisit');
    }
    catch(err){ setBillItems(null); setVType(v.visit_type||'newVisit'); }
  }

  async function selectCompleted(b){
    setSel(b); setBillItems(null);
    try { setDoneBill(await api.get('/billing/'+b.id+'/detail')); }
    catch(err){ console.error(err); setDoneBill({bill:b,items:[]}); }
  }

  // The fee comes from the server with the visit's items - the same stored price the
  // waiting list and the correction use (L2). No price of its own on the screen: a
  // code the server cannot find counts as 0 and is pointed out (consultFeeMissing).
  // The waiting list's line for a visit flagged for correction: what the correction
  // will do (server, buildCorrection) - not "charged before minus charges now".
  function corrLine(v){
    var c = v.corr;
    if(!c || c.error) return t.py_listSeeCorrection;
    if(c.refund > 0.5) return t.py_listRefund+': '+fmtAr(c.refund)+' Ar';
    if(c.outstanding > 0.5) return t.py_listOwed+': '+fmtAr(c.outstanding)+' Ar';
    return t.py_listNoDiff;
  }
  function consultCode(){ return VTYPE_CODE[vType] || 'C01'; }
  function consultFee(){
    if(!sel) return 0;
    if(vType==='none') return 0;
    var p = consultPrices[consultCode()];
    return p != null ? p : 0;
  }
  function consultFeeMissing(){ return !!(sel && billItems && vType!=='none' && consultPrices[consultCode()]==null); }
  // A prescription line's quantity is total_qty as consultation saved it - billing
  // keeps no formula of its own. null means it is missing: shown as a warning and
  // billing is refused (never counted as 0 without anyone noticing).
  function rxQty(r){ return (r.total_qty==null || r.total_qty==='') ? null : (parseFloat(r.total_qty)||0); }
  // An order line's count is total_qty as consultation stored it (⑭: quantity x days,
  // migration 030); older rows fall back to quantity, then 1. 0 is 0 - no "|| 1".
  function orderQty(o){
    var v = (o.total_qty!=null && o.total_qty!=='') ? o.total_qty : (o.quantity!=null && o.quantity!=='') ? o.quantity : 1;
    var n = parseFloat(v); return isNaN(n) ? 0 : n;
  }
  function missingQtyRx(){ return (billItems?.prescriptions||[]).filter(function(r){ return rxQty(r)==null; }); }
  // Drug and order lines billed at unit price 0. Pointed out, not refused: a free
  // line can be deliberate, but drugs imported without a price are 0 on every line
  // prescribed before the price was set (the line keeps the price it was given).
  // Outside prescriptions are not billed at all and the consultation line is left out.
  function noPriceLines(){
    return (billItems?.prescriptions||[]).filter(function(r){ return rxQty(r)!=null && !(parseFloat(r.unit_price)>0); }).map(function(r){ return r.drug_name; })
      .concat((billItems?.orders||[]).filter(function(o){ return !(parseFloat(o.unit_price)>0); }).map(function(o){ return o.order_name; }));
  }
  function drugTotal(){ return (billItems?.prescriptions||[]).reduce(function(s,r){ return s + (rxQty(r)||0) * (parseFloat(r.unit_price)||0); },0); }
  function procTotal(){ return (billItems?.orders||[]).reduce(function(s,o){ return s + orderQty(o) * (parseFloat(o.unit_price)||0); },0); }
  function extraTotal(){ return extraItems.reduce(function(s,it){ return s + (parseFloat(it.unit_price)||0)*(parseFloat(it.quantity)||1); },0); }

  // 이 내원이 이미 수납된 적이 있나(→ 추가 청구 모드)
  // The new receipt is dated today. On today's lists it shows under "paid today"; while
  // a past date is shown it is not on that day's list, so the screen stays where it is.
  function afterBilled(){
    if(workRef.current.follow) setTab('completed');
    else { setSel(null); setBillItems(null); }
  }
  function isAdditional(){ return !!(billItems && (billItems.billed_consult || (billItems.billed_items && billItems.billed_items.length>0))); }
  function billedTotal(){ return (billItems?.billed_items||[]).reduce(function(s,b){ return s+(parseFloat(b.amount)||0); },0); }
  // 실제로 청구할 항목 = 현재 항목 − 이미 청구된 항목(코드·수량 차감). 일반 수납이면 전체가 그대로 나옴.
  function chargeRows(){
    var rows = [];
    var billedConsultAmt = (billItems?.billed_items||[]).filter(function(b){return b.item_type==='consultation';}).reduce(function(s,b){return s+(parseFloat(b.amount)||0);},0);
    var consultCharge = consultFee() - billedConsultAmt; // 첫 수납이면 전액, 진료비 인상이면 차액, 동일하면 0
    if(consultCharge > 0.0001){
      rows.push({item_type:'consultation',item_name:'Consultation',item_code:'',quantity:1,unit_price:consultCharge,total_price:consultCharge});
    }
    var bm = {};
    (billItems?.billed_items||[]).forEach(function(b){ if(b.item_type==='consultation') return; var k=(b.item_code||''); bm[k]=(bm[k]||0)+(parseFloat(b.qty)||0); });
    (billItems?.prescriptions||[]).forEach(function(rx){
      var qty=rxQty(rx); if(qty==null) return; var up=parseFloat(rx.unit_price)||0;
      var billed=bm[rx.drug_code]||0; var nq=qty-billed; bm[rx.drug_code]=Math.max(0,billed-qty);
      if(nq>0.0001) rows.push({item_type:'drug',item_name:rx.drug_name,item_code:rx.drug_code,quantity:nq,unit_price:up,total_price:nq*up});
    });
    (billItems?.orders||[]).forEach(function(o){
      var qty=orderQty(o); var up=parseFloat(o.unit_price)||0;
      var billed=bm[o.order_code]||0; var nq=qty-billed; bm[o.order_code]=Math.max(0,billed-qty);
      if(nq>0.0001) rows.push({item_type:o.code_type||'procedure',item_name:o.order_name,item_code:o.order_code,quantity:nq,unit_price:up,total_price:nq*up});
    });
    extraItems.forEach(function(it){ var qty=parseFloat(it.quantity)||1, up=parseFloat(it.unit_price)||0; rows.push({item_type:'fee',item_name:it.name,item_code:it.code,quantity:qty,unit_price:up,total_price:qty*up}); });
    return rows;
  }
  function chargeTotal(){ return chargeRows().reduce(function(s,r){ return s+r.total_price; },0); }
  function subtotal(){ return chargeTotal(); }
  // already fully billed and nothing new to charge → nothing to confirm (avoid a 0 Ar receipt)
  function nothingToCharge(){ return isAdditional() && subtotal() <= 0.0001; }
  function prevBal(){ return parseFloat(sel?.previous_balance)||0; }
  function discountAmt(){ if(discount.type==='percent') return Math.round(subtotal()*(Number(discount.value)||0)/100); return Number(discount.value)||0; }
  function totalDue(){ return Math.max(0,subtotal()-discountAmt()+prevBal()); }
  function amtPaidNum(){ return Number(amountPaid)||0; }
  function changeAmt(){ return Math.max(0,amtPaidNum()-totalDue()); }
  function outstandingAmt(){ return Math.max(0,totalDue()-amtPaidNum()); }

  function addFeeItem(codeId){
    var c = feeCodes.filter(function(x){ return String(x.id)===String(codeId); })[0];
    if(!c) return;
    setExtraItems(function(p){ return p.concat([{ order_code_id:c.id, code:c.code, name:c.name, quantity:1, unit_price:parseFloat(c.price_clinic||c.price)||0 }]); });
  }
  function removeFeeItem(idx){ setExtraItems(function(p){ return p.filter(function(_,i){ return i!==idx; }); }); }

  // viaConfirm: reached from the green confirm button with nothing in the cash box.
  function doConfirm(status, viaConfirm){ return once(function(){ return doConfirmNow(status, viaConfirm); }); }
  async function doConfirmNow(status, viaConfirm){
    var mq = missingQtyRx();
    if(mq.length){ alert(t.py_qtyMissingBlock.replace('{names}', mq.map(function(r){ return r.drug_name; }).join(', '))); return; }
    // only lines charged now: an additional charge does not ask again about lines already billed
    var zero = chargeRows().filter(function(r){ return r.item_type!=='consultation' && r.item_type!=='fee' && !(r.unit_price>0); }).map(function(r){ return r.item_name; });
    if(zero.length && !window.confirm(t.py_noPriceConfirm.replace('{n}', zero.length).replace('{names}', zero.join(', ')))) return;
    if(status==='paid' && amtPaidNum()<totalDue()){ alert(t.py_amountInsufficient); return; }
    // "Unpaid" means nothing was received, so the whole total stays owed. It used to
    // subtract whatever sat in the cash box from the debt while recording 0 received.
    if(status==='unpaid' && totalDue()>0){
      var msg = amtPaidNum()>0 ? t.py_unpaidIgnoresAmount : (viaConfirm ? t.py_unpaidConfirm : null);
      if(msg && !window.confirm(msg.replace('{paid}',fmtAr(amtPaidNum())).replace('{total}',fmtAr(totalDue())))) return;
    }
    var unpaid = status==='unpaid';
    try {
      var rows = chargeRows();
      var items = rows.map(function(r){ return {item_type:r.item_type,item_name:r.item_name,item_code:r.item_code,quantity:r.quantity,unit_price:r.unit_price,total_price:r.total_price}; });
      var cFee = rows.filter(function(r){return r.item_type==='consultation';}).reduce(function(s,r){return s+r.total_price;},0);
      var dTot = rows.filter(function(r){return r.item_type==='drug';}).reduce(function(s,r){return s+r.total_price;},0);
      var pTot = rows.filter(function(r){return r.item_type!=='consultation'&&r.item_type!=='drug';}).reduce(function(s,r){return s+r.total_price;},0);
      var result = await api.post('/billing',{
        visit_id:sel.id, patient_id:sel.patient_id,
        consult_fee:cFee, drug_total:dTot, procedure_total:pTot,
        subtotal:subtotal(), discount_amount:discountAmt(), discount_type:discount.type,
        discount_value:Number(discount.value)||0, previous_balance:prevBal(), total_due:totalDue(),
        amount_paid:unpaid?0:amtPaidNum(), change_amount:unpaid?0:changeAmt(),
        outstanding:unpaid?totalDue():(status==='paid'?0:outstandingAmt()), payment_status:status,
        note:payNote, items:items,
        expected_active_bill_ids:(billItems && billItems.active_bill_ids) || [],
      });
      // 수납에서 바꾼 진료비 종류를 내원 기록에도 반영 — only once the bill is saved, so a
      // refused payment does not leave the visit's type changed (L4).
      if(sel && sel.id){ try { await api.put('/visits/'+sel.id, { visit_type:vType }); } catch(e){} }
      setReceiptId(result.id); await loadLists(); afterBilled();
    } catch(err){ showError(err); }
  }

  // 정정(환불): the server replaces the visit's active bills with one bill for what
  // the visit costs now, keeping the cash actually received, the discount, carried
  // balances and counter fees (billing.routes.js, buildCorrection). The screen only
  // shows the server's figures and sends them back, so the refund handed over is
  // the one that was shown - if anything changed meanwhile the server refuses.
  async function loadCorrection(visitId){
    setCorr(null);
    try { setCorr(await api.get('/billing/visit/'+visitId+'/correction')); }
    catch(err){ setCorr({ error: String(err && err.message || '') }); }
  }
  function confirmCorrection(){ return once(confirmCorrectionNow); }
  async function confirmCorrectionNow(){
    if(!sel || !corr || corr.error){ return; }
    var line = corr.refund>0 ? t.py_refundHandBack.replace('{amount}',fmtAr(corr.refund))
             : corr.outstanding>0 ? t.py_remainsOwed.replace('{amount}',fmtAr(corr.outstanding))
             : t.py_noDifference;
    if(!window.confirm(t.py_correctionConfirm+'\n\n'+line)) return;
    try {
      var result = await api.post('/billing/visit/'+sel.id+'/correct',{
        expected_active_bill_ids:corr.active_bill_ids,
        expected_refund:corr.refund, expected_outstanding:corr.outstanding,
        reason:(t.correctionBadge||'정정'),
      });
      setReceiptId(result.id); await loadLists(); afterBilled();
    } catch(err){ showError(err); }
  }

  // Cancelling a receipt (M6, decided (다) 2026-09-29): the dialog says an overcharge
  // is a correction, asks for a reason, and asks whether the money taken was handed
  // back - the server records it (refunded_amount) and a re-bill starts from what the
  // till still holds.
  function voidReceipt(b){
    // Its balance lives on a later receipt now; that one has to be voided first.
    // Said before the dialog - the server refuses it anyway (BILL_CARRIED).
    if(b.carried_into_id){
      var into = (receipts||[]).filter(function(x){ return x.id===b.carried_into_id; })[0];
      alert(t.py_voidCarried.split('{receipt}').join(into ? into.receipt_no : ('#'+b.carried_into_id)));
      return;
    }
    setVoidDlg({ bill:b, reason:'' });
  }
  function heldOn(b){ return b.net_paid!=null ? (parseFloat(b.net_paid)||0) : (parseFloat(b.amount_paid)||0)-(parseFloat(b.change_amount)||0); }
  function voidConfirm(refunded){ return once(function(){ return voidConfirmNow(refunded); }); }
  async function voidConfirmNow(refunded){
    if(!voidDlg) return;
    var b = voidDlg.bill, reason = voidDlg.reason;
    try {
      await api.put('/billing/'+b.id+'/void',{ reason:reason, refunded:refunded });
      setVoidDlg(null);
      var pid = sel?sel.patient_id:null;
      if(pid){ try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){} }
      await loadLists();
      alert(t.voidDone || '영수 취소됨 / Cancelled');
    } catch(err){
      if(isCarried(err)){ setVoidDlg(null); alert(carriedText(t.py_voidCarried, err)); var p2 = sel?sel.patient_id:null; if(p2){ try { setReceipts(await api.get('/billing/patient/'+p2+'/history')); } catch(e){} } return; }
      showError(err);
    }
  }

  function reprint(b){ setReceiptId(b.id); }

  function settleConfirm(){ return once(settleConfirmNow); }
  async function settleConfirmNow(){
    if(!settleBill) return;
    var amt = parseFloat(settleAmt)||0;
    var out = parseFloat(settleBill.outstanding)||0;
    if(amt<=0){ alert(t.enterAmount||'금액을 입력하세요'); return; }
    if(amt>out+0.5){ alert((t.maxOutstanding||'미수액보다 클 수 없습니다')+': '+fmtAr(out)+' Ar'); return; }
    try {
      // M2: the payment goes on a new receipt dated today (POST /settle), not onto the old bill.
      var settled = await api.post('/billing/settle', { bill_ids:[settleBill.id], amount: amt, expected_outstanding: out });
      setSettleBill(null); setSettleAmt('');
      setReceiptId(settled.id);
      var pid = sel?sel.patient_id:null;
      if(pid){ try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){}
               try { setPatBalance(await api.get('/billing/patient/'+pid+'/balance')); } catch(e){} }
      await loadLists();
    } catch(err){ if(isCarried(err)) await payRefused(err); else showError(err); }
  }

  function settleAll(){ return once(settleAllNow); }
  async function settleAllNow(){
    var pid = sel?sel.patient_id:null; if(!pid) return;
    var bills = (receipts||[]).filter(function(b){ return b.payment_status!=='cancelled' && (parseFloat(b.outstanding)||0) > 0; });
    if(!bills.length) return;
    var total = bills.reduce(function(a,b){ return a+(parseFloat(b.outstanding)||0); },0);
    // One settlement receipt per visit, so each visit's department and doctor keep
    // their own share of the money (statistics asked for this).
    var byVisit = {}, order = [];
    bills.forEach(function(b){ var k=String(b.visit_id); if(!byVisit[k]){ byVisit[k]=[]; order.push(k); } byVisit[k].push(b); });
    if(!window.confirm((t.settleAllConfirm||'전체 미수를 일괄 수납합니다')+'\n'+(t.outstanding||'미수')+': '+fmtAr(total)+' Ar\n'+t.py_settleAllReceipts.replace('{n}', order.length))) return;
    var made = [];
    try {
      for(var i=0;i<order.length;i++){
        var group = byVisit[order[i]];
        var owe = group.reduce(function(a,b){ return a+(parseFloat(b.outstanding)||0); },0);
        var s1 = await api.post('/billing/settle', { bill_ids: group.map(function(b){ return b.id; }), amount: owe, expected_outstanding: owe });
        made.push(s1.id);
      }
      try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){}
      try { setPatBalance(await api.get('/billing/patient/'+pid+'/balance')); } catch(e){}
      await loadLists();
    } catch(err){ if(isCarried(err)) await payRefused(err); else showError(err); }
    // show every receipt that was made, one after another (also those made before an error)
    if(made.length){ setReceiptId(made[0]); setReceiptQueue(made.slice(1)); }
  }

  // Status words in the screen language, not the stored code (L1). cancelled gets its
  // own grey look rather than falling into the orange of "partial".
  function statusLabel(s){ var k={paid:'py_stPaid',partial:'py_stPartial',unpaid:'py_stUnpaid',cancelled:'py_stCancelled',waived:'py_stWaived',waiting:'py_stWaiting'}[s]; return k&&t[k]?t[k]:s; }
  function statusBadge(s){
    if(s==='cancelled') return <span style={{background:'var(--text-3-a22)',color:'var(--text-2)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:700}}>{statusLabel(s)}</span>;
    var paid=s==='paid', unpaid=s==='unpaid';
    return <span style={{background:paid?'var(--ok-a18)':unpaid?'var(--danger-a18)':'var(--warn-a18)',color:paid?'var(--ok-text)':unpaid?'var(--danger-ink)':'var(--warn-text)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:700}}>{statusLabel(s)}</span>;
  }

  // A receipt's badge, and the line under it: a correction replaced it (not a staff
  // cancellation), or its balance was taken on a later receipt (a settlement or a
  // carry) - then its own "partial" and balance are history, not what is owed.
  function billBadge(b){
    var chip = function(bg, fg, text){ return <span style={{background:bg,color:fg,borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:700}}>{text}</span>; };
    if(b.payment_status==='cancelled' && b.replaced_by_receipt_no) return chip('var(--violet-2-a18)','var(--violet-text-2)',t.py_stReplaced);
    if(b.payment_status!=='cancelled' && b.carried_into_receipt_no) return chip('var(--text-3-a22)','var(--text-2)',t.py_stCarried);
    return statusBadge(b.payment_status);
  }
  function billNote(b){
    if(b.payment_status==='cancelled' && b.replaced_by_receipt_no) return t.py_replacedBy.replace('{receipt}', b.replaced_by_receipt_no);
    if(b.payment_status!=='cancelled' && b.carried_into_receipt_no) return t.py_carriedTo.replace('{receipt}', b.carried_into_receipt_no);
    return null;
  }

  function listData(){ return (tab==='waiting'?pending:completed).filter(matches); }
  // The paid-today list: receipts in force first (their number is the tab's count),
  // cancelled and replaced ones folded underneath.
  function dayCount(){ return workDate ? pending.filter(function(v){ return dayOf(v)===workDate; }).length : pending.length; }
  function listRows(){
    var all = listData();
    if(tab!=='completed'){
      if(!workDate) return all;
      var day = all.filter(function(v){ return dayOf(v)===workDate; });
      if(viewingPast) return day;
      var past = all.filter(function(v){ return dayOf(v) && dayOf(v) < workDate; });
      return (past.length ? [{ __pastToggle:true, id:'past', n:past.length }] : []).concat(showPast ? past : []).concat(day);
    }
    var live = all.filter(function(b){ return b.payment_status!=='cancelled'; });
    return showInactive ? live.concat(all.filter(function(b){ return b.payment_status==='cancelled'; })) : live;
  }
  function inactiveCount(){ return tab==='completed' ? listData().filter(function(b){ return b.payment_status==='cancelled'; }).length : 0; }

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'var(--bg)',color:tx,height:'100vh',display:'flex',flexDirection:'column',fontSize:16}}>
      <TopBar />
      <div style={{background:'var(--panel-2)',borderBottom:'1px solid '+bd,padding:'6px 8px',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
        <button onClick={function(){setTab('waiting')}} style={{background:tab==='waiting'?'var(--accent)':'var(--chip)',color:tab==='waiting'?'var(--on-fill)':'var(--text-max)',border:'1px solid '+(tab==='waiting'?'var(--accent-text)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:'pointer'}}>{L.waitingPay} ({dayCount()})</button>
        <button onClick={function(){setTab('completed')}} style={{background:tab==='completed'?'var(--ok)':'var(--chip)',color:tab==='completed'?'var(--on-fill)':'var(--text-max)',border:'1px solid '+(tab==='completed'?'var(--ok-text)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:'pointer'}}>{viewingPast ? t.py_paidOn.replace('{date}', workDate) : L.completedPay} ({completed.filter(function(b){ return b.payment_status!=='cancelled'; }).length})</button>
        <button onClick={function(){setFinderOpen(true)}} style={{background:'var(--chip)',color:'var(--text-soft)',border:'1px solid '+bd2,borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:'pointer'}}>🔍 {t.findPatient}</button>
        <button onClick={function(){ if(sel) setDocOpen(true); }} disabled={!sel} style={{background:sel?'var(--teal-deep)':'var(--chip)',color:sel?'var(--on-fill-teal)':'var(--text-4)',border:'1px solid '+(sel?'var(--teal-ink)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>📄 {t.documents}</button>
        <button onClick={function(){ if(sel) setRxOpen(true); }} disabled={!sel} style={{background:sel?'var(--warn-strong)':'var(--chip)',color:sel?'var(--on-fill-amber)':'var(--text-4)',border:'1px solid '+(sel?'var(--warn-ink)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>💊 {t.outsideRx}</button>
        <button onClick={function(){ if(sel) setChartOpen(true); }} disabled={!sel} style={{background:sel?'var(--violet-strong)':'var(--chip)',color:sel?'var(--on-fill-violet)':'var(--text-4)',border:'1px solid '+(sel?'var(--violet-2)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>📋 {t.chartViewer||'차트뷰어'}</button>
        <button onClick={function(){ if(sel) setReadingsOpen(true); }} disabled={!sel} style={{background:sel?'var(--violet-deep)':'var(--chip)',color:sel?'var(--on-fill-violet)':'var(--text-4)',border:'1px solid '+(sel?'var(--violet-ink)':bd2),borderRadius:6,padding:'6px 9px',fontSize:14,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>🩻 {t.reading||'판독소견'}</button>
        <div style={{flex:1}}></div>
        {tab==='waiting'&&sel&&billItems&&!sel.needs_refund&&sel.status!=='cancelled'?(nothingToCharge()?(
          <span style={{color:'var(--ok-text)',fontSize:14,fontWeight:800,padding:'7px 14px'}}>✓ {t.alreadySettled||'이미 수납 완료'}</span>
        ):(<>
          <button onClick={function(){doConfirm('unpaid')}} disabled={busy} style={{opacity:busy?0.5:1,background:'var(--danger-a20)',color:'var(--danger-text)',border:'1px solid var(--danger-a40)',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:14,fontWeight:700}}>{L.leaveUnpaid}</button>
          <button onClick={function(){doConfirm(amtPaidNum()>=totalDue()?'paid':(amtPaidNum()>0?'partial':'unpaid'), true)}} disabled={busy} style={{opacity:busy?0.5:1,background:'linear-gradient(135deg,var(--ok),var(--ok-strong))',color:'var(--on-fill)',border:'none',borderRadius:6,padding:'7px 16px',cursor:busy?'wait':'pointer',fontSize:15,fontWeight:800}}>{busy?'…':t.confirmPayment}</button>
        </>)):null}
        <button onClick={loadLists} style={{background:'var(--chip)',color:tx,border:'1px solid '+bd2,borderRadius:6,padding:'7px 12px',cursor:'pointer'}}>↻</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(230px,300px) minmax(0,1fr) minmax(240px,300px)',flex:1,minHeight:0}}>
        <div style={{borderRight:'1px solid '+bd,display:'flex',flexDirection:'column',background:pn}}>
          <div style={{padding:'7px 9px',borderBottom:'1px solid '+bd,background:viewingPast?'var(--warn-a14)':'var(--panel-2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontSize:12,fontWeight:700,color:viewingPast?'var(--warn-text)':t2,whiteSpace:'nowrap'}}>{t.rc_workDate}</span>
              <button type="button" title={t.rc_prevDay} aria-label={t.rc_prevDay} onClick={function(){shiftWorkDate(-1)}} disabled={!workDate} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'4px 8px',cursor:'pointer',fontSize:13}}>◀</button>
              <input type="date" value={workDate} max={serverToday||undefined} onChange={function(e){chooseWorkDate(e.target.value)}} style={{flex:1,minWidth:0,background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:5,padding:'4px 6px',color:tx,fontSize:14,colorScheme:'var(--scheme)'}} />
              <button type="button" title={t.rc_nextDay} aria-label={t.rc_nextDay} onClick={function(){shiftWorkDate(1)}} disabled={!workDate||!serverToday||workDate>=serverToday} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'4px 8px',cursor:'pointer',fontSize:13,opacity:(!workDate||workDate>=serverToday)?0.4:1}}>▶</button>
            </div>
            {viewingPast?<div style={{display:'flex',alignItems:'flex-start',gap:6,marginTop:6}}>
              <div style={{flex:1,fontSize:12,color:'var(--warn-text)',lineHeight:1.4}}>{t.py_workDatePast.replace('{date}', workDate).replace('{today}', serverToday)}</div>
              <button type="button" onClick={function(){chooseWorkDate(serverToday)}} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'4px 8px',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>{t.rc_backToToday}</button>
            </div>:null}
          </div>
          <div style={{padding:'9px 12px',borderBottom:'1px solid '+bd,background:scBg,fontWeight:800,fontSize:16,color:viewingPast?'var(--warn-text)':tx}}>💰 {tab==='waiting'?L.waitingPay:(viewingPast?t.py_paidOn.replace('{date}', workDate):L.todayPaid)}</div>
          {tab==='completed'&&cashDay?<div style={{padding:'8px 12px',borderBottom:'1px solid '+bd,background:'var(--ok-a12)',fontSize:13}}>
            <div style={{fontWeight:800,color:'var(--ok-text)',marginBottom:3}}>💵 {viewingPast ? t.py_cashOn.replace('{date}', workDate) : t.py_cashDay}</div>
            <div style={{display:'flex',justifyContent:'space-between',gap:6,fontFamily:'monospace',flexWrap:'wrap'}}>
              <span style={{color:t2}}>{t.py_cashIn} <strong style={{color:'var(--ok-text)'}}>+{fmtAr(cashDay.cash_in)}</strong></span>
              <span style={{color:t2}}>{t.py_cashOut} <strong style={{color:'var(--danger-text)'}}>−{fmtAr(cashDay.cash_out)}</strong></span>
              <span style={{color:t2}}>{t.py_cashNet} <strong style={{color:tx}}>{fmtAr(cashDay.net)} Ar</strong></span>
            </div>
          </div>:null}
          <div style={{padding:'7px 9px',borderBottom:'1px solid '+bd}}>
            <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:5,padding:'7px 9px',color:tx,fontSize:15,outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {loading?<div style={{padding:20,textAlign:'center',color:t3}}>{t.loading}</div>:listRows().map(function(v){
              if(v.__pastToggle) return <div key="past-toggle" onClick={function(){setShowPast(!showPast)}} style={{padding:'8px 12px',cursor:'pointer',fontSize:13,fontWeight:700,color:'var(--warn-text)',background:'var(--warn-a14)',borderBottom:'1px solid var(--warn-a55)'}}>{showPast?'▾':'▸'} 📅 {t.py_pastToDo.replace('{n}', v.n)}</div>;
              var isSel=sel&&sel.id===v.id;
              var earlier=tab==='waiting'&&!viewingPast&&workDate&&dayOf(v)&&dayOf(v)<workDate;
              return <div key={tab+'-'+v.id} onClick={function(){tab==='waiting'?selectVisit(v):selectCompleted(v)}} style={{padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid var(--line-soft)',background:isSel?'var(--accent-a12)':'transparent',borderLeft:'3px solid '+(tab==='completed'&&v.payment_status==='cancelled'?(v.replaced_by_receipt_no?'var(--violet-2-a50)':'var(--danger-a40)'):earlier?'var(--warn-a55)':'transparent')}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:3}}>
                  <span style={{fontWeight:800,fontSize:15,color:'var(--text-strong)'}}>{v.last_name} {v.first_name}</span>
                  {tab==='waiting'?(v.needs_additional?<span style={{background:'var(--accent-a18)',color:'var(--accent-text)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.additionalBadge}</span>:v.needs_refund?<span style={{background:'var(--violet-2-a18)',color:'var(--violet-text-2)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.py_correction}</span>:v.needs_rebill?<span style={{background:'var(--danger-a18)',color:'var(--danger-text)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.rebillBadge}</span>:<span style={{background:'var(--warn-a18)',color:'var(--warn-ink)',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.waiting}</span>):billBadge(v)}
                </div>
                <div style={{fontSize:13,color:t2}}>{[v.chart_no, v.dept_code, v.doctor_name].filter(Boolean).join(' · ')}</div>
                {tab==='waiting'&&v.missing_qty?<div style={{fontSize:12,color:'var(--danger-text)',marginTop:2,fontWeight:700}}>⚠ {t.py_qtyMissingList}</div>:null}
                {tab==='waiting'&&v.needs_rebill?<div style={{fontSize:12,color:'var(--danger-text)',marginTop:2,fontFamily:'monospace'}}>📅 {ymd(v.visit_date)} · {t.rebillHint}</div>:null}
                {tab==='waiting'&&v.needs_additional?<div style={{fontSize:12,color:'var(--accent-text)',marginTop:2,fontFamily:'monospace'}}>➕ {t.additionalHint}: {fmtAr(v.extra_due)} Ar</div>:null}
                {tab==='waiting'&&v.needs_refund?<div style={{fontSize:12,color:'var(--violet-text-2)',marginTop:2,fontFamily:'monospace'}}>↩ {corrLine(v)}</div>:null}
                {tab==='waiting'&&!v.past_unbilled&&!v.needs_rebill&&serverToday&&dayOf(v)&&dayOf(v)!==serverToday?<div style={{fontSize:12,color:'var(--warn-text)',marginTop:2,fontFamily:'monospace'}}>📅 {dayOf(v)}</div>:null}
                {tab==='waiting'&&v.past_unbilled?<div style={{fontSize:12,color:'var(--warn-text)',marginTop:2,fontFamily:'monospace'}}>📅 {ymd(v.visit_date)} · {t.py_pastUnbilled}</div>:null}
                {tab==='completed'?<>
                  <div style={{fontSize:12,color:'var(--accent-text)',marginTop:3,fontFamily:'monospace'}}>{v.receipt_no}</div>
                  {billNote(v)?<div style={{fontSize:12,color:t2,marginTop:2}}>→ {billNote(v)}</div>:null}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:3}}><span style={{color:t3}}>{ymd(v.billing_date)}</span><strong style={{color:'var(--ok-text)',fontFamily:'monospace'}}>{fmtAr(v.total_due)} Ar</strong></div>
                </>:null}
                {tab==='waiting'&&(parseFloat(v.previous_balance)||0)>0?<div style={{fontSize:12,color:'var(--danger-ink)',marginTop:3}}>+ {t.prevOutstanding}: {fmtAr(v.previous_balance)} Ar</div>:null}
              </div>;
            })}
            {!loading&&inactiveCount()>0?<div onClick={function(){setShowInactive(!showInactive)}} style={{padding:'8px 12px',cursor:'pointer',fontSize:13,color:t3,borderBottom:'1px solid var(--line-soft)'}}>{showInactive?'▾':'▸'} {t.py_inactiveReceipts.replace('{n}', inactiveCount())}</div>:null}
            {!loading&&tab==='waiting'&&viewingPast&&listRows().length===0?<div style={{padding:25,textAlign:'center',color:t3}}>{t.py_noneThatDay}</div>:null}
            {!loading&&tab==='completed'&&listData().length===0?<div style={{padding:25,textAlign:'center',color:t3}}>{L.noCompleted}</div>:null}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-col)'}}>
          {tab==='waiting'?renderWaiting():renderCompleted()}
        </div>

        <div style={{borderLeft:'1px solid '+bd,display:'flex',flexDirection:'column',background:pn,overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:'1px solid '+bd,background:scBg}}>
            <button onClick={function(){setRightTab2('chart')}} style={{flex:1,background:rightTab2==='chart'?'var(--accent-a18)':'transparent',color:rightTab2==='chart'?'var(--accent-text)':t3,border:'none',borderBottom:rightTab2==='chart'?'2px solid var(--accent-ink)':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:14,fontWeight:800}}>{t.patientChart}</button>
            <button onClick={function(){setRightTab2('receipts')}} style={{flex:1,background:rightTab2==='receipts'?'var(--ok-a18)':'transparent',color:rightTab2==='receipts'?'var(--ok-text)':t3,border:'none',borderBottom:rightTab2==='receipts'?'2px solid var(--ok-ink)':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:14,fontWeight:800}}>{t.receiptHistory}</button>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {rightTab2==='chart'? <PatientChart patientId={sel?sel.patient_id:null} /> : (
              !sel ? <div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize:14,fontStyle:'italic'}}>{L.selectWaiting}</div> :
              receipts.length>0 ? <div style={{padding:'6px 8px'}}>
              {patBalance.owed>0?<div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',justifyContent:'space-between',background:'var(--danger-a12)',border:'1px solid var(--danger-a30)',borderRadius:6,padding:'7px 10px',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--danger-text)',fontWeight:800,fontFamily:'monospace'}}>{t.outstanding}: {fmtAr(patBalance.owed)} Ar</span>
                <button onClick={settleAll} disabled={busy} style={{opacity:busy?0.5:1,background:'var(--ok)',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'5px 10px',cursor:'pointer',fontSize:13,fontWeight:800,whiteSpace:'nowrap'}}>💵 {t.settleAll||'전체 미수 수납'}</button>
              </div>:null}
              {receipts.map(function(b,i){
                var out=parseFloat(b.outstanding)||0;
                var cancelled = b.payment_status==='cancelled';
                return <div key={i} style={{background:scBg,border:'1px solid '+(cancelled?(b.replaced_by_receipt_no?'var(--violet-2-a50)':'var(--danger-a40)'):bd),borderLeft:cancelled?'3px solid '+(b.replaced_by_receipt_no?'var(--violet-2-a50)':'var(--danger-a40)'):'1px solid '+bd,borderRadius:5,padding:'8px 10px',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontFamily:'monospace',fontSize:13,color:'var(--ok-text)',fontWeight:700,textDecoration:cancelled?'line-through':'none'}}>{ymd(b.billing_date)}</span>
                    <span style={{fontSize:11,color:t2}}>{b.dept_code||''}</span>
                    <span style={{fontSize:11,color:t3,marginLeft:'auto',fontFamily:'monospace'}}>{b.receipt_no}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontFamily:'monospace',textDecoration:cancelled?'line-through':'none'}}>
                    <span style={{color:t2}}>{t.totalDue}: {fmtAr(b.total_due)}</span>
                    <span style={{color:'var(--ok-text)'}}>{t.amountPaid}: {fmtAr(b.amount_paid)}</span>
                  </div>
                  {out>0&&!cancelled?<div style={{fontSize:12,color:'var(--danger-ink)',marginTop:2,fontFamily:'monospace'}}>{t.outstanding}: {fmtAr(out)} Ar</div>:null}
                  {billNote(b)?<div style={{fontSize:12,color:t2,marginTop:2}}>→ {billNote(b)}</div>:null}
                  {cancelled&&b.refunded_amount!=null&&heldOn(b)>0.005?<div style={{fontSize:12,color:parseFloat(b.refunded_amount)>0?'var(--danger-text)':t2,marginTop:2,fontFamily:'monospace'}}>{parseFloat(b.refunded_amount)>0?t.py_refundedAt+': '+fmtAr(b.refunded_amount)+' Ar':t.py_keptAt+': '+fmtAr(heldOn(b))+' Ar'}</div>:null}
                  <div style={{marginTop:4,display:'flex',flexWrap:'wrap',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                    {cancelled&&!b.replaced_by_receipt_no? <span style={{fontSize:11,fontWeight:800,color:'var(--danger-text)',background:'var(--danger-a18)',border:'1px solid var(--danger-a40)',borderRadius:4,padding:'1px 7px'}}>{t.cancelledBadge}</span> : billBadge(b)}
                    <div style={{flex:1}}></div>
                    {out>0&&!cancelled?<button onClick={function(){ setSettleBill(b); setSettleAmt(String(Math.round(out))); }} style={{background:'var(--ok-a18)',color:'var(--ok-text)',border:'1px solid var(--ok-a40)',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12,fontWeight:700}}>💵 {t.settleOutstanding}</button>:null}
                    <button onClick={function(){reprint(b)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12}}>🖨 {t.reprint}</button>
                    {!cancelled?<button onClick={function(){voidReceipt(b)}} disabled={busy} style={{opacity:busy?0.5:1,background:'var(--danger-a18)',color:'var(--danger-text)',border:'1px solid var(--danger-a40)',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12}}>{t.voidReceipt}</button>:null}
                  </div>
                </div>;
              })}</div> : <div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize:14,fontStyle:'italic'}}>{t.noReceipts}</div>
            )}
          </div>
        </div>
      </div>

      {settleBill?(
        <div style={{position:'fixed',inset:0,background:'var(--scrim)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={function(){setSettleBill(null)}}>
          <div style={{background:pn,border:'1px solid '+bd2,color:tx,borderRadius:10,width:380,padding:18}} onClick={function(e){e.stopPropagation()}}>
            <div style={{fontWeight:900,fontSize:16,marginBottom:4,color:'var(--ok-text)'}}>💵 {t.settleOutstanding}</div>
            <div style={{fontSize:13,color:t2,marginBottom:12}}>{settleBill.receipt_no} · {ymd(settleBill.billing_date)}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:6,fontFamily:'monospace'}}><span style={{color:t2}}>{t.outstanding}</span><span style={{color:'var(--danger-ink)',fontWeight:800}}>{fmtAr(settleBill.outstanding)} Ar</span></div>
            <label style={{fontSize:12,color:t3,fontWeight:700}}>{t.amountReceived||'받은 금액'}</label>
            <input type="number" value={settleAmt} onChange={function(e){setSettleAmt(e.target.value)}} autoFocus style={{width:'100%',boxSizing:'border-box',background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:7,padding:'10px 12px',color:tx,fontSize:18,fontFamily:'monospace',marginTop:4}} />
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <button onClick={function(){ setSettleAmt(String(Math.round(parseFloat(settleBill.outstanding)||0))); }} style={{flex:1,background:'var(--ok-a18)',color:'var(--ok-text)',border:'1px solid var(--ok-a40)',borderRadius:6,padding:'7px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.fullAmount||'전액'}</button>
              {[5000,10000,50000].map(function(v){ return <button key={v} onClick={function(){ setSettleAmt(String((parseFloat(settleAmt)||0)+v)); }} style={{flex:1,background:scBg,color:t2,border:'1px solid '+bd2,borderRadius:6,padding:'7px',cursor:'pointer',fontSize:13}}>+{fmtAr(v)}</button>; })}
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={function(){setSettleBill(null)}} style={{flex:1,background:scBg,color:t2,border:'1px solid '+bd2,borderRadius:7,padding:'10px',cursor:'pointer',fontSize:14}}>{t.cancel||'취소'}</button>
              <button onClick={settleConfirm} disabled={busy} style={{opacity:busy?0.5:1,flex:2,background:'linear-gradient(135deg,var(--ok),var(--ok-strong))',color:'var(--on-fill)',border:'none',borderRadius:7,padding:'10px',cursor:'pointer',fontSize:15,fontWeight:800}}>{t.confirmPayment||'수납 확정'}</button>
            </div>
          </div>
        </div>
      ):null}

      {voidDlg?(function(){
        var b = voidDlg.bill, held = heldOn(b), amt = fmtAr(held);
        var btn = {flex:1,border:'none',borderRadius:7,padding:'10px',cursor:busy?'wait':'pointer',fontSize:14,fontWeight:800,opacity:busy?0.5:1};
        return <div style={{position:'fixed',inset:0,background:'var(--scrim)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={function(){setVoidDlg(null)}}>
          <div style={{background:pn,border:'1px solid '+bd2,color:tx,borderRadius:10,width:440,padding:18}} onClick={function(e){e.stopPropagation()}}>
            <div style={{fontWeight:900,fontSize:16,marginBottom:4,color:'var(--danger-text)'}}>{t.py_voidTitle.replace('{receipt}', b.receipt_no)}</div>
            <div style={{fontSize:13,color:t2,marginBottom:10}}>{ymd(b.billing_date)} · {t.totalDue}: {fmtAr(b.total_due)} Ar</div>
            <div style={{background:'var(--warn-a14)',border:'1px solid var(--warn-a55)',borderRadius:7,padding:'8px 10px',marginBottom:12,color:'var(--warn-text)',fontSize:13,fontWeight:700}}>⚠ {t.py_voidUseCorrection}</div>
            <label style={{fontSize:12,color:t3,fontWeight:700}}>{t.py_voidReasonLabel}</label>
            <input value={voidDlg.reason} onChange={function(e){ setVoidDlg({bill:b, reason:e.target.value}); }} autoFocus style={{width:'100%',boxSizing:'border-box',background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:7,padding:'9px 11px',color:tx,fontSize:14,marginTop:4,marginBottom:12}} />
            {held>0.005?<>
              <div style={{fontSize:14,fontWeight:800,marginBottom:8}}>{t.py_voidRefundQ.replace('{amount}', amt)}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={function(){voidConfirm(true)}} disabled={busy} style={Object.assign({},btn,{background:'var(--danger)',color:'var(--on-fill)'})}>{t.py_voidRefundYes.replace('{amount}', amt)}</button>
                <button onClick={function(){voidConfirm(false)}} disabled={busy} style={Object.assign({},btn,{background:'var(--chip)',color:tx,border:'1px solid '+bd2})}>{t.py_voidRefundNo}</button>
              </div>
            </>:<>
              <div style={{fontSize:13,color:t2,marginBottom:8}}>{t.py_voidNoMoney}</div>
              <button onClick={function(){voidConfirm(false)}} disabled={busy} style={Object.assign({},btn,{width:'100%',background:'var(--danger)',color:'var(--on-fill)'})}>{t.py_voidConfirm}</button>
            </>}
            <button onClick={function(){setVoidDlg(null)}} style={{width:'100%',marginTop:10,background:scBg,color:t2,border:'1px solid '+bd2,borderRadius:7,padding:'8px',cursor:'pointer',fontSize:13}}>{t.py_voidBack}</button>
          </div>
        </div>;
      })():null}

      {/* One receipt for right after payment and for reprints, read from the stored bill (components/Receipt.jsx). */}
      <ReceiptModal billingId={receiptId} t={t} onClose={function(){ if(receiptQueue.length){ setReceiptId(receiptQueue[0]); setReceiptQueue(receiptQueue.slice(1)); } else setReceiptId(null); }} />
      <PatientFinder open={finderOpen} onClose={function(){setFinderOpen(false)}} mode="visit"
        onPickVisit={function(v){ setTab('waiting'); selectVisit(v); }} />
      <DocumentModal open={docOpen} onClose={function(){setDocOpen(false)}} category="document"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.id:null, dept_code: sel?sel.dept_code:'', doctor_name: sel?sel.doctor_name:'' }} />
      <DocumentModal open={rxOpen} onClose={function(){setRxOpen(false)}} category="prescription"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.id:null, dept_code: sel?sel.dept_code:'', doctor_name: sel?sel.doctor_name:'' }} />
      <DocumentModal open={chartOpen} onClose={function(){setChartOpen(false)}} category="chart" readOnly={true}
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.id:null, dept_code: sel?sel.dept_code:'', doctor_name: sel?sel.doctor_name:'' }} />
      {readingsOpen && sel ? (
        <div onClick={function(){setReadingsOpen(false)}} style={{position:'fixed',inset:0,background:'var(--scrim)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'80vw',height:'84vh',background:'var(--bg)',border:'1px solid '+bd,borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid '+bd,background:scBg}}>
              <span style={{fontWeight:800,fontSize:15,color:'var(--violet-text)'}}>🩻 {t.reading||'판독소견'}</span>
              <span style={{color:t2,fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setReadingsOpen(false)}} style={{marginLeft:'auto',background:'var(--btn-neutral-2)',color:tx,border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><RadiologyReadings patientId={sel.patient_id} /></div>
          </div>
        </div>
      ) : null}
    </div>
  );

  function renderWaiting(){
    if(!(sel&&billItems)) return <Empty icon="💰" text={L.selectWaiting} />;
    // Picked from the find-patient window: a visit cancelled at reception is shown, not
    // billed (the server refuses it too). Receipts and documents stay available.
    if(sel.status==='cancelled') return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
      <PatientHeader p={sel} />
      <div style={{background:'var(--text-3-a18)',border:'1px solid var(--text-3-a55)',borderRadius:8,padding:'12px 14px',color:'var(--text-soft)',fontSize:14,fontWeight:700}}>⊘ {t.py_visitCancelled}</div>
    </div>;
    if(sel.needs_refund){
      var head = <><PatientHeader p={sel} />
        <div style={{background:'var(--violet-2-a14)',border:'1px solid var(--violet-2-a50)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
          <div style={{fontWeight:900,color:'var(--violet-text-2)',fontSize:15,marginBottom:4}}>↩ {t.py_correction}</div>
          <div style={{color:t2,fontSize:13}}>{t.py_correctionHint}</div>
        </div></>;
      if(!corr) return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>{head}<div style={{color:t3,padding:12}}>{t.loading}</div></div>;
      if(corr.error){
        var carriedMsg = corr.error.indexOf('BILL_CARRIED')===0 ? t.py_correctionCarried.split('{receipt}').join(corr.error.replace(/^BILL_CARRIED:\s*/,''))
          : corr.error.indexOf('QTY_MISSING')===0 ? t.py_qtyMissingBlock.replace('{names}', corr.error.replace(/^QTY_MISSING:\s*/,''))
          : corr.error;
        return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>{head}<div style={{background:'var(--danger-a12)',border:'1px solid var(--danger-a40)',borderRadius:8,padding:'12px 14px',color:'var(--danger-text-2)',fontSize:14}}>{carriedMsg}</div></div>;
      }
      return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
        {head}
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(240px,300px)',gap:12}}>
          <div>
            <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',fontWeight:800,borderBottom:'1px solid '+bd,color:t2}}>{t.currentItems||'현재 항목'}</div>
              {corr.items.map(function(it,i){ return <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 12px',borderTop:i?'1px solid var(--line-soft)':'none',fontSize:14}}><span style={{color:tx}}>{it.item_name}{it.pack_label?' · '+packWord(it, langCtx.lang, it.quantity):it.quantity>1?' ×'+fmtAr(it.quantity):''}</span><span style={{color:t2,fontFamily:'monospace'}}>{fmtAr(it.total_price)}</span></div>; })}
            </div>
            {(corr.changes||[]).length?<div style={{background:scBg,border:'1px solid var(--violet-2-a50)',borderRadius:7,overflow:'hidden',marginTop:10}}>
              <div style={{padding:'8px 12px',fontWeight:800,borderBottom:'1px solid '+bd,color:'var(--violet-text-2)'}}>{t.py_changesTitle}</div>
              {corr.changes.map(function(ch,i){
                var qtyText = function(n){ return ch.pack_label ? packWord(ch, langCtx.lang, n) : fmtAr(n); };
                return <div key={i} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'7px 12px',borderTop:i?'1px solid var(--line-soft)':'none',fontSize:14}}>
                  <span style={{color:tx}}>{ch.item_name}{ch.cancelled_order?' ('+t.py_changeCancelled+')':''} <span style={{color:t3,fontFamily:'monospace'}}>{qtyText(ch.qty_before)} → {qtyText(ch.qty_after)}</span></span>
                  <span style={{color:ch.difference<0?'var(--violet-text-2)':'var(--danger-ink)',fontFamily:'monospace',fontWeight:800,whiteSpace:'nowrap'}}>{ch.difference<0?'−':'+'}{fmtAr(Math.abs(ch.difference))}</span>
                </div>;
              })}
            </div>:null}
          </div>
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:14,height:'fit-content'}}>
            <SumRow label={t.correctTotal||'정확한 금액'} amount={corr.subtotal} />
            {corr.discount_amount>0?<SumRow label={t.discount} amount={-corr.discount_amount} />:null}
            {corr.previous_balance>0?<SumRow label={t.prevOutstanding} amount={corr.previous_balance} color="var(--danger-ink)" />:null}
            <SumRow label={t.totalDue} amount={corr.total_due} bold />
            <SumRow label={t.py_paidSoFar} amount={corr.paid_so_far} color="var(--ok-text)" />
            <div style={{height:1,background:bd,margin:'8px 0'}}></div>
            {corr.refund>0?<div style={{background:'var(--violet-2-a18)',border:'2px solid var(--violet-2-a50)',borderRadius:6,padding:12}}>
              <div style={{fontSize:13,color:'var(--violet-text-2)',fontWeight:800}}>{t.refundDue}</div>
              <div style={{fontSize:28,fontWeight:900,color:'var(--violet-text-2)',fontFamily:'monospace',textAlign:'right'}}>{fmtAr(corr.refund)} Ar</div>
            </div>:corr.outstanding>0?<div style={{background:'var(--danger-a12)',border:'2px solid var(--danger-a40)',borderRadius:6,padding:12}}>
              <div style={{fontSize:13,color:'var(--danger-text)',fontWeight:800}}>{t.outstanding}</div>
              <div style={{fontSize:28,fontWeight:900,color:'var(--danger-text)',fontFamily:'monospace',textAlign:'right'}}>{fmtAr(corr.outstanding)} Ar</div>
              <div style={{fontSize:12,color:t2,marginTop:4}}>{t.py_correctionOwedHint}</div>
            </div>:<div style={{fontSize:13,color:t2,padding:'6px 0'}}>{t.py_noDifference}</div>}
            <button onClick={confirmCorrection} disabled={busy} style={{opacity:busy?0.5:1,marginTop:12,width:'100%',background:'var(--violet-2)',color:'var(--on-fill)',border:'none',borderRadius:7,padding:'12px',fontSize:15,fontWeight:800,cursor:busy?'wait':'pointer'}}>↩ {t.py_processCorrection}</button>
          </div>
        </div>
      </div>;
    }
    var mqRows = missingQtyRx(), npLines = noPriceLines();
    return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
      <PatientHeader p={sel} />
      {consultFeeMissing()?<div style={{background:'var(--warn-a14)',border:'1px solid var(--warn-a55)',borderRadius:7,padding:'9px 12px',marginBottom:10,color:'var(--warn-text)',fontSize:13,fontWeight:700}}>⚠ {t.py_consultFeeMissing.replace('{code}', consultCode())}</div>:null}
      {npLines.length?<div style={{background:'var(--warn-a14)',border:'1px solid var(--warn-a55)',borderRadius:7,padding:'9px 12px',marginBottom:10,color:'var(--warn-text)',fontSize:13,fontWeight:700}}>⚠ {t.py_noPriceBanner.replace('{n}', npLines.length)}: {npLines.join(', ')}</div>:null}
      {mqRows.filter(function(r){ return !r.pack_unit; }).length?<div style={{background:'var(--danger-a18)',border:'1px solid var(--danger-a60)',borderRadius:7,padding:'9px 12px',marginBottom:10,color:'var(--danger-text-2)',fontSize:13,fontWeight:700}}>⚠ {t.py_qtyMissingBlock.replace('{names}', mqRows.filter(function(r){ return !r.pack_unit; }).map(function(r){ return r.drug_name; }).join(', '))}</div>:null}
      {mqRows.filter(function(r){ return r.pack_unit; }).length?<div style={{background:'var(--danger-a18)',border:'1px solid var(--danger-a60)',borderRadius:7,padding:'9px 12px',marginBottom:10,color:'var(--danger-text-2)',fontSize:13,fontWeight:700}}>⚠ {t.py_qtyMissingPack.replace('{names}', mqRows.filter(function(r){ return r.pack_unit; }).map(function(r){ return r.drug_name; }).join(', '))}</div>:null}
      {isAdditional()&&subtotal()>0.0001?<div style={{background:'var(--accent-a15)',border:'1px solid var(--accent-a40)',borderRadius:7,padding:'9px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:13}}><span style={{fontWeight:800,color:'var(--accent-text)'}}>➕ {t.additionalBadge}</span><span style={{color:t2}}>{t.additionalBannerHint}</span><span style={{marginLeft:'auto',color:t3,fontFamily:'monospace'}}>{t.alreadyBilled}: {fmtAr(billedTotal())} Ar</span></div>:null}
      {sel&&sel.needs_rebill&&(parseFloat(sel.prior_paid)||0)>0?<div style={{background:'var(--warn-a12)',border:'1px solid var(--warn-a40)',borderRadius:7,padding:'9px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:13}}><span style={{fontWeight:800,color:'var(--warn-ink)'}}>↺ {t.rebillBadge}</span><span style={{color:t2}}>{t.rebillCarryHint}</span><span style={{marginLeft:'auto',color:'var(--warn-text)',fontFamily:'monospace',fontWeight:700}}>{t.carriedPaid}: {fmtAr(sel.prior_paid)} Ar</span></div>:null}
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(240px,300px)',gap:12}}>
        <div>
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,padding:'10px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontWeight:900,fontSize:16,color:'var(--accent-text)'}}>🏥 {t.consultFee}</span>
            {/* Visit types are 초진 · 재진 · 진료비 없음 only (decided 2026-09-29). An older visit
                saved as emergency/referral still shows that value, marked old and not
                offered again; its fee stays what C03/C04 price it at. */}
            <select value={vType} onChange={function(e){setVType(e.target.value)}} style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'5px 8px',color:tx,fontSize:14,cursor:'pointer'}}>
              {vType==='emergency'||vType==='referral'?<option value={vType} disabled>{t[vType]} {t.py_legacyValue}</option>:null}
              <option value="newVisit">{t.newVisit}</option>
              <option value="followUp">{t.followUp}</option>
              <option value="none">{t.noConsult}</option>
            </select>
            <span style={{marginLeft:'auto',fontSize:17,fontWeight:900,color:tx,fontFamily:'monospace'}}>{fmtAr(consultFee())} Ar</span>
          </div>
          <BillTable title={'💊 '+t.prescriptions} rows={(billItems.prescriptions||[]).map(function(rx){var qty=rxQty(rx);return {code:rx.drug_code,name:rx.drug_name,qty:qty,packRx:rx.pack_unit?rx:null,unit:parseFloat(rx.unit_price)||0,total:(qty||0)*(parseFloat(rx.unit_price)||0),missing:qty==null,noPrice:!(parseFloat(rx.unit_price)>0)};})} />
          <BillTable title={'🧾 '+t.procedures} rows={(billItems.orders||[]).map(function(o){var qty=orderQty(o);return {code:o.order_code,name:o.order_name,qty:qty,unit:parseFloat(o.unit_price)||0,total:qty*(parseFloat(o.unit_price)||0),noPrice:!(parseFloat(o.unit_price)>0)};})} />
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,marginBottom:10,overflow:'hidden'}}>
            <div style={{padding:'9px 12px',fontWeight:900,borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8}}>
              <span>🧾 {t.adminCharges}</span>
              <select value="" onChange={function(e){ if(e.target.value){ addFeeItem(e.target.value); e.target.value=''; } }} style={{marginLeft:'auto',background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'4px 8px',color:tx,fontSize:13,cursor:'pointer'}}>
                <option value="">+ {t.addCharge}</option>
                {feeCodes.map(function(c){ return <option key={c.id} value={c.id}>{c.name} ({fmtAr(c.price_clinic||c.price)} Ar)</option>; })}
              </select>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><tbody>
              {extraItems.length? extraItems.map(function(it,idx){ return <tr key={idx} style={{borderTop:idx?'1px solid var(--line-soft)':'none'}}>
                <td style={{padding:'7px 10px',color:t2,fontFamily:'monospace',width:60}}>{it.code}</td>
                <td style={{padding:'7px 10px',color:tx}}>{it.name}</td>
                <td style={{padding:'7px 10px',textAlign:'right',color:'var(--ok-text)',fontFamily:'monospace'}}>{fmtAr((parseFloat(it.unit_price)||0)*(parseFloat(it.quantity)||1))} Ar</td>
                <td style={{padding:'7px 10px',textAlign:'right',width:30}}><button onClick={function(){removeFeeItem(idx)}} style={{background:'transparent',border:'none',color:'var(--danger-text)',cursor:'pointer',fontSize:14}}>✕</button></td>
              </tr>; }) : <tr><td colSpan={4} style={{padding:10,color:t3,fontStyle:'italic',fontSize:13}}>{t.noAdminCharges}</td></tr>}
            </tbody></table>
          </div>
        </div>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12,height:'fit-content'}}>
          {isAdditional()?
            <>{chargeRows().map(function(r,i){ return <SumRow key={i} label={r.item_name+(r.quantity>1?' ×'+r.quantity:'')} amount={r.total_price} />; })}
            {chargeRows().length===0?<div style={{fontSize:13,color:t3,fontStyle:'italic',padding:'4px 0'}}>{t.noAdditional}</div>:null}</>
            :
            <><SumRow label={t.consultFee} amount={consultFee()} />
            <SumRow label={t.drugs} amount={drugTotal()} />
            <SumRow label={t.procedures} amount={procTotal()} />
            {extraTotal()>0?<SumRow label={t.adminCharges} amount={extraTotal()} />:null}</>
          }
          <SumRow label={isAdditional()?t.additionalHint:t.subtotal} amount={subtotal()} bold />
          <div style={{height:1,background:bd,margin:'8px 0'}}></div>
          <div style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:6,alignItems:'center',marginBottom:6}}><span style={{fontSize:13,color:t2}}>{t.discount}</span><input type="number" value={discount.value} onChange={function(e){setDiscount({type:'amount',value:e.target.value})}} style={inputStyle()} /></div>
          {prevBal()>0?<SumRow label={t.prevOutstanding} amount={prevBal()} color="var(--danger-ink)" />:null}
          {patBalance.refund>0?
            <div style={{background:'var(--accent-a15)',border:'1px solid var(--accent-a40)',borderRadius:6,padding:'8px 10px',margin:'8px 0',fontSize:13}}><span style={{color:'var(--accent-text)',fontWeight:800}}>{t.refundDue}: </span><span style={{color:'var(--accent-text)',fontFamily:'monospace',fontWeight:800}}>{fmtAr(patBalance.refund)} Ar</span><div style={{color:t3,fontSize:11,marginTop:2}}>{t.refundHint}</div></div>
            :null}
          <div style={{background:'linear-gradient(135deg,var(--ok-a15),var(--ok-strong-a15))',border:'2px solid var(--ok-a40)',borderRadius:6,padding:12,marginTop:10}}><div style={{fontSize:13,color:'var(--ok-text)',fontWeight:800}}>{t.totalDue}</div><div style={{fontSize:26,fontWeight:900,color:'var(--ok-ink)',fontFamily:'monospace',textAlign:'right',whiteSpace:'nowrap'}}>{fmtAr(totalDue())} Ar</div></div>
          <div style={{marginTop:12}}><div style={{fontSize:13,color:t2,marginBottom:4}}>💵 {t.amountPaid}</div><input type="number" value={amountPaid} onChange={function(e){setAmountPaid(e.target.value)}} style={{...inputStyle(),fontSize:20,color:'var(--ok-ink)',fontWeight:800,padding:9}} /></div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>{[totalDue(),5000,10000,20000,50000].map(function(a,i){return <button key={i} onClick={function(){setAmountPaid(String(a))}} style={{flex:'1 0 48px',background:'var(--chip)',border:'1px solid '+bd2,borderRadius:4,padding:'5px 2px',color:t2,cursor:'pointer',fontSize:12}}>{i===0?L.exact:fmtAr(a)}</button>;})}</div>
          {amtPaidNum()>=totalDue()&&amtPaidNum()>0?<InfoLine label={t.change} amount={changeAmt()} color="var(--accent-text)" tint="accent-text" />:null}
          {amtPaidNum()>0&&amtPaidNum()<totalDue()?<InfoLine label={t.outstanding} amount={outstandingAmt()} color="var(--danger-ink)" tint="danger" />:null}
        </div>
      </div>
    </div>;
  }

  function renderCompleted(){
    if(!(sel&&doneBill)) return <Empty icon="✅" text={L.selectCompleted+'\n'+(viewingPast ? t.py_paidOnHint.replace('{date}', workDate) : L.paidListHint)} />;
    var b=doneBill.bill, items=doneBill.items||[];
    return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
      <div style={{padding:'11px 15px',background:scBg,border:'1px solid '+bd,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:30}}>✅</div><div style={{flex:1}}><div style={{fontSize:19,fontWeight:900,color:'var(--ok-text)'}}>{L.billDetail}</div><div style={{fontSize:14,color:t2}}>{b.chart_no} · {b.last_name} {b.first_name} · {ymd(b.billing_date)}</div></div>{billBadge(b)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(240px,300px)',gap:12}}>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'10px 12px',fontWeight:900,borderBottom:'1px solid '+bd}}>🧾 {L.item}</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><thead><tr style={{background:'var(--bg-col-2)'}}><th style={th()}>{t.py_code}</th><th style={th()}>{L.item}</th><th style={th('right')}>{L.qty}</th><th style={th('right')}>{L.unitPrice}</th><th style={th('right')}>{L.total}</th></tr></thead><tbody>{items.map(function(it){return <tr key={it.id} style={{borderTop:'1px solid var(--line-soft)'}}><td style={td()}>{it.item_code}</td><td style={td()}>{it.item_name}</td><td style={td('right')}>{it.pack_label?packWord(it, langCtx.lang, parseFloat(it.quantity)):fmtAr(it.quantity)}</td><td style={td('right')}>{fmtAr(it.unit_price)}</td><td style={td('right','var(--ok-text)',800)}>{fmtAr(it.total_price)}</td></tr>;})}</tbody></table>
        </div>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12,height:'fit-content'}}>
          <div style={{display:'grid',gap:5,fontSize:15}}>
            <Pair k={L.receiptNo} v={b.receipt_no}/><Pair k={L.cashier} v={b.cashier_name||''}/><Pair k={t.py_date} v={ymd(b.billing_date)}/><Pair k={t.py_status} v={b.payment_status==='cancelled'&&b.replaced_by_receipt_no?t.py_stReplaced:b.payment_status!=='cancelled'&&b.carried_into_receipt_no?t.py_stCarried:statusLabel(b.payment_status)}/>
          </div>
          {billNote(b)?<div style={{fontSize:13,color:t2,marginTop:6}}>→ {billNote(b)}</div>:null}
          <div style={{height:1,background:bd,margin:'10px 0'}}></div>
          <SumRow label={t.subtotal} amount={b.subtotal} />
          <SumRow label={t.discount} amount={b.discount_amount} />
          <SumRow label={t.totalDue} amount={b.total_due} bold />
          <SumRow label={t.amountPaid} amount={b.amount_paid} color="var(--ok-text)" />
          <SumRow label={t.outstanding} amount={b.outstanding} color={parseFloat(b.outstanding)>0?'var(--danger-ink)':'var(--ok-text)'} bold />
        </div>
      </div>
    </div>;
  }

  function PatientHeader(p){ p=p.p; return <div style={{padding:'10px 15px',background:scBg,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:12}}><div style={{background:'var(--accent-a20)',borderRadius:8,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,fontWeight:900,color:'var(--accent-text)'}}>{(p.first_name||'?')[0]}</div><div><div style={{fontWeight:900,fontSize:18,color:'var(--text-strong)'}}>{p.last_name} {p.first_name}</div><div style={{fontSize:14,color:t2}}>{[p.chart_no, p.dept_code, p.doctor_name].filter(Boolean).join(' · ')}</div></div>{serverToday&&dayOf(p)&&dayOf(p)!==serverToday?<span style={{marginLeft:'auto',background:'var(--warn-a18)',color:'var(--warn-text)',borderRadius:5,padding:'3px 9px',fontSize:13,fontWeight:800,fontFamily:'monospace',whiteSpace:'nowrap'}}>📅 {dayOf(p)}</span>:null}</div>; }
  function BillTable(p){ return <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,marginBottom:10,overflow:'hidden'}}><div style={{padding:'9px 12px',fontWeight:900,borderBottom:'1px solid '+bd}}>{p.title}</div><table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><tbody>{p.rows.length?p.rows.map(function(r,i){return <tr key={i} style={{borderTop:i?'1px solid var(--line-soft)':'none'}}><td style={td()}>{r.code}</td><td style={td()}>{r.name}</td><td style={td('right',r.missing?'var(--danger-text)':null)}>{r.missing?t.py_qtyMissing:r.packRx?packWord(r.packRx, langCtx.lang, r.qty):fmtAr(r.qty)}</td><td style={td('right',r.noPrice?'var(--warn-text)':null)}>{r.noPrice?t.py_noPrice:fmtAr(r.unit)}</td><td style={td('right',r.missing?'var(--danger-text)':'var(--ok-text)',800)}>{r.missing?t.py_qtyMissing:fmtAr(r.total)}</td></tr>;}):<tr><td style={{padding:12,color:t3,fontStyle:'italic'}}>{t.py_noItems}</td></tr>}</tbody></table></div>; }
  function Empty(p){ return <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-5)',whiteSpace:'pre-line'}}><div style={{textAlign:'center'}}><div style={{fontSize:54,marginBottom:12,opacity:0.35}}>{p.icon}</div><div style={{fontStyle:'italic',fontSize:17}}>{p.text}</div></div></div>; }
  function inputStyle(){ return {background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'6px 8px',color:tx,fontSize:15,width:'100%',boxSizing:'border-box',fontFamily:'monospace',textAlign:'right'}; }
  function th(align){ return {padding:'7px 10px',textAlign:align||'left',color:'var(--accent-text-3)',fontSize:13,borderBottom:'1px solid '+bd}; }
  function td(align,color,weight){ return {padding:'7px 10px',textAlign:align||'left',color:color||tx,fontWeight:weight||500,fontFamily:align==='right'?'monospace':'inherit'}; }
  function Pair(p){ return <div style={{display:'flex',justifyContent:'space-between',gap:10}}><span style={{color:t2}}>{p.k}</span><strong style={{color:tx,textAlign:'right'}}>{p.v}</strong></div>; }
  function InfoLine(p){ return <div style={{background:tint(p.tint,'15'),borderRadius:5,padding:'7px 9px',marginTop:8,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:14,color:p.color,fontWeight:800}}>{p.label}</span><span style={{fontSize:16,color:p.color,fontWeight:900,fontFamily:'monospace'}}>{fmtAr(p.amount)} Ar</span></div>; }
}

function SumRow(p){
  var lang = useLang().lang;
  return <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
    <span style={{fontSize:14,color:p.color||'var(--text-2)',fontWeight:p.bold?800:600}}>{p.label}</span>
    <span style={{fontSize:p.bold?15:14,fontWeight:p.bold?900:600,color:p.color||'var(--text)',fontFamily:'monospace'}}>{fmtAmount(p.amount, lang)} Ar</span>
  </div>;
}
