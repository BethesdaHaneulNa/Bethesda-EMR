import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { PatientChart } from '../components/PatientChart.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
import { RadiologyReadings } from '../components/RadiologyReadings.jsx';

var FEES = { newVisit:15000, followUp:10000, emergency:25000, referral:12000, none:0 };
function fmtAr(n){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function ymd(d){ if(!d) return ''; return String(d).split('T')[0]; }

export default function PaymentPage() {
  var langCtx = useLang(); var t = langCtx.t;
  var ps = useState([]), pending = ps[0], setPending = ps[1];
  var cs = useState([]), completed = cs[0], setCompleted = cs[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];
  var bis = useState(null), billItems = bis[0], setBillItems = bis[1];
  var dbs = useState(null), doneBill = dbs[0], setDoneBill = dbs[1];
  var paid = useState(''), amountPaid = paid[0], setAmountPaid = paid[1];
  var ds = useState({type:'amount',value:0}), discount = ds[0], setDiscount = ds[1];
  var ns = useState(''), payNote = ns[0], setPayNote = ns[1];
  var rs = useState(false), showReceipt = rs[0], setShowReceipt = rs[1];
  var rns = useState(''), receiptNo = rns[0], setReceiptNo = rns[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var ts = useState('waiting'), tab = ts[0], setTab = ts[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var vts = useState('newVisit'), vType = vts[0], setVType = vts[1];
  var exs = useState([]), extraItems = exs[0], setExtraItems = exs[1];
  var fcs = useState([]), feeCodes = fcs[0], setFeeCodes = fcs[1];
  var rt2 = useState('chart'), rightTab2 = rt2[0], setRightTab2 = rt2[1];
  var rcps = useState([]), receipts = rcps[0], setReceipts = rcps[1];
  var rps = useState(null), reprintData = rps[0], setReprintData = rps[1];
  var sbs = useState(null), settleBill = sbs[0], setSettleBill = sbs[1];
  var sams = useState(''), settleAmt = sams[0], setSettleAmt = sams[1];
  var pbs = useState({owed:0,refund:0}), patBalance = pbs[0], setPatBalance = pbs[1];
  var fos = useState(false), finderOpen = fos[0], setFinderOpen = fos[1];
  var dcs = useState(false), docOpen = dcs[0], setDocOpen = dcs[1];
  var rxs2 = useState(false), rxOpen = rxs2[0], setRxOpen = rxs2[1];
  var chs2 = useState(false), chartOpen = chs2[0], setChartOpen = chs2[1];
  var rdo2 = useState(false), readingsOpen = rdo2[0], setReadingsOpen = rdo2[1];
  var cps2 = useState({}), consultPrices = cps2[0], setConsultPrices = cps2[1];
  var CONSULT_FEE_CODES = ['C01','C02','C03','C04'];
  var VTYPE_CODE = { newVisit:'C01', followUp:'C02', emergency:'C03', referral:'C04' };

  var bd='#232838',bd2='#2a3142',scBg='#1a1f2e',pn='#13161f',tx='#e2e8f0',t2='#94a3b8',t3='#64748b';
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
  useEffect(function(){ setSel(null); setBillItems(null); setDoneBill(null); },[tab]);
  useEffect(function(){
    var pid = sel ? sel.patient_id : null;
    if(!pid){ setReceipts([]); setPatBalance({owed:0,refund:0}); return; }
    api.get('/billing/patient/'+pid+'/history').then(function(r){ setReceipts(r||[]); }).catch(function(){ setReceipts([]); });
    api.get('/billing/patient/'+pid+'/balance').then(function(b){ setPatBalance(b||{owed:0,refund:0}); }).catch(function(){ setPatBalance({owed:0,refund:0}); });
  },[sel]);

  async function loadLists(){
    setLoading(true);
    try {
      var data = await api.get('/billing/pending');
      setPending(data);
      var done = await api.get('/billing/completed');
      setCompleted(done);
      try {
        var fc = await api.get('/admin/order-codes?code_type=fee');
        setFeeCodes((fc||[]).filter(function(c){ return CONSULT_FEE_CODES.indexOf(c.code)<0; }));
        var cp = {};
        (fc||[]).forEach(function(c){ if(CONSULT_FEE_CODES.indexOf(c.code)>=0){ cp[c.code] = parseFloat(c.price_clinic != null ? c.price_clinic : c.price) || 0; } });
        setConsultPrices(cp);
      } catch(e){ setFeeCodes([]); }
    } catch(err){ console.error(err); }
    setLoading(false);
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
      setVType((bi && bi.visit_type) || v.visit_type || 'newVisit');
    }
    catch(err){ setBillItems(null); setVType(v.visit_type||'newVisit'); }
  }

  async function selectCompleted(b){
    setSel(b); setBillItems(null);
    try { setDoneBill(await api.get('/billing/'+b.id+'/detail')); }
    catch(err){ console.error(err); setDoneBill({bill:b,items:[]}); }
  }

  function consultFee(){
    if(!sel) return 0;
    if(vType==='none') return 0;
    var code = VTYPE_CODE[vType];
    var dbp = code ? consultPrices[code] : null;
    if(dbp != null) return dbp;
    return FEES[vType] != null ? FEES[vType] : FEES.newVisit;
  }
  function drugTotal(){ return (billItems?.prescriptions||[]).reduce(function(s,r){ return s + (parseFloat(r.total_qty)||parseFloat(r.dose)*r.frequency*r.days) * (parseFloat(r.unit_price)||0); },0); }
  function procTotal(){ return (billItems?.orders||[]).reduce(function(s,o){ return s + (parseFloat(o.quantity)||1) * (parseFloat(o.unit_price)||0); },0); }
  function extraTotal(){ return extraItems.reduce(function(s,it){ return s + (parseFloat(it.unit_price)||0)*(parseFloat(it.quantity)||1); },0); }

  // 이 내원이 이미 수납된 적이 있나(→ 추가 청구 모드)
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
      var qty=parseFloat(rx.total_qty)||parseFloat(rx.dose)*rx.frequency*rx.days; var up=parseFloat(rx.unit_price)||0;
      var billed=bm[rx.drug_code]||0; var nq=qty-billed; bm[rx.drug_code]=Math.max(0,billed-qty);
      if(nq>0.0001) rows.push({item_type:'drug',item_name:rx.drug_name,item_code:rx.drug_code,quantity:nq,unit_price:up,total_price:nq*up});
    });
    (billItems?.orders||[]).forEach(function(o){
      var qty=parseFloat(o.quantity)||1; var up=parseFloat(o.unit_price)||0;
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
  function refundDue(){ return Math.max(0,-(subtotal()-discountAmt()+prevBal())); }
  function amtPaidNum(){ return Number(amountPaid)||0; }
  function changeAmt(){ return Math.max(0,amtPaidNum()-totalDue()); }
  function outstandingAmt(){ return Math.max(0,totalDue()-amtPaidNum()); }

  function addFeeItem(codeId){
    var c = feeCodes.filter(function(x){ return String(x.id)===String(codeId); })[0];
    if(!c) return;
    setExtraItems(function(p){ return p.concat([{ order_code_id:c.id, code:c.code, name:c.name, quantity:1, unit_price:parseFloat(c.price_clinic||c.price)||0 }]); });
  }
  function removeFeeItem(idx){ setExtraItems(function(p){ return p.filter(function(_,i){ return i!==idx; }); }); }

  async function doConfirm(status){
    if(status==='paid' && amtPaidNum()<totalDue()){ alert('Amount insufficient'); return; }
    try {
      var rows = chargeRows();
      var items = rows.map(function(r){ return {item_type:r.item_type,item_name:r.item_name,item_code:r.item_code,quantity:r.quantity,unit_price:r.unit_price,total_price:r.total_price}; });
      var cFee = rows.filter(function(r){return r.item_type==='consultation';}).reduce(function(s,r){return s+r.total_price;},0);
      var dTot = rows.filter(function(r){return r.item_type==='drug';}).reduce(function(s,r){return s+r.total_price;},0);
      var pTot = rows.filter(function(r){return r.item_type!=='consultation'&&r.item_type!=='drug';}).reduce(function(s,r){return s+r.total_price;},0);
      // 수납에서 바꾼 진료비 종류를 내원 기록에도 반영
      if(sel && sel.id){ try { await api.put('/visits/'+sel.id, { visit_type:vType }); } catch(e){} }
      var result = await api.post('/billing',{
        visit_id:sel.id, patient_id:sel.patient_id,
        consult_fee:cFee, drug_total:dTot, procedure_total:pTot,
        subtotal:subtotal(), discount_amount:discountAmt(), discount_type:discount.type,
        discount_value:Number(discount.value)||0, previous_balance:prevBal(), total_due:totalDue(),
        amount_paid:status==='unpaid'?0:amtPaidNum(), change_amount:changeAmt(),
        outstanding:status==='paid'?0:outstandingAmt(), payment_status:status,
        note:payNote, items:items,
      });
      setReceiptNo(result.receipt_no); setShowReceipt(true); await loadLists(); setTab('completed');
    } catch(err){ alert('Error: '+err.message); }
  }

  function fullCurrentItems(){
    var items = [{item_type:'consultation',item_name:'Consultation',item_code:'',quantity:1,unit_price:consultFee(),total_price:consultFee()}];
    (billItems?.prescriptions||[]).forEach(function(rx){ var qty=parseFloat(rx.total_qty)||parseFloat(rx.dose)*rx.frequency*rx.days; var up=parseFloat(rx.unit_price)||0; items.push({item_type:'drug',item_name:rx.drug_name,item_code:rx.drug_code,quantity:qty,unit_price:up,total_price:qty*up}); });
    (billItems?.orders||[]).forEach(function(o){ var qty=parseFloat(o.quantity)||1; var up=parseFloat(o.unit_price)||0; items.push({item_type:o.code_type||'procedure',item_name:o.order_name,item_code:o.order_code,quantity:qty,unit_price:up,total_price:qty*up}); });
    extraItems.forEach(function(it){ var qty=parseFloat(it.quantity)||1, up=parseFloat(it.unit_price)||0; items.push({item_type:'fee',item_name:it.name,item_code:it.code,quantity:qty,unit_price:up,total_price:qty*up}); });
    return items;
  }
  function fullCurrentTotal(){ return consultFee()+drugTotal()+procTotal()+extraTotal(); }

  // 정정(환불): 활성 영수 취소 후, 현재 정확한 금액으로 재청구(정산 완료). 차액은 환불로 기록.
  async function confirmCorrection(){
    if(!sel || !sel.active_bill_id){ alert('No active bill'); return; }
    var paid = parseFloat(sel.active_paid)||0;
    var total = fullCurrentTotal();
    var refund = Math.max(0, paid - total);
    if(!window.confirm((t.correctionConfirm||'정정(환불) 처리하시겠습니까?')+'\n'+(t.refundDue||'환불')+': '+fmtAr(refund)+' Ar')) return;
    try {
      // 그 내원의 모든 활성 영수를 일괄 취소(잔재 영수가 합계를 부풀리는 것 방지) 후 1건으로 재발행
      await api.put('/billing/visit/'+sel.id+'/void-active',{ reason:(t.correctionBadge||'정정') });
      if(sel.id){ try { await api.put('/visits/'+sel.id,{ visit_type:vType }); } catch(e){} }
      var items = fullCurrentItems();
      var result = await api.post('/billing',{
        visit_id:sel.id, patient_id:sel.patient_id,
        consult_fee:consultFee(), drug_total:drugTotal(), procedure_total:procTotal()+extraTotal(),
        subtotal:total, discount_amount:0, discount_type:'amount', discount_value:0,
        previous_balance:0, total_due:total,
        amount_paid:total, change_amount:refund,
        outstanding:0, payment_status:'paid',
        note:(t.correctionBadge||'정정')+' refund '+refund, items:items,
      });
      setReceiptNo(result.receipt_no); setShowReceipt(true); await loadLists(); setTab('completed');
    } catch(err){ alert('Error: '+err.message); }
  }

  async function voidReceipt(b){
    var reason = prompt(t.voidReason || '취소 사유 / Reason?');
    if(reason===null) return;
    try {
      await api.put('/billing/'+b.id+'/void',{ reason:reason });
      var pid = sel?sel.patient_id:null;
      if(pid){ try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){} }
      await loadLists();
      alert(t.voidDone || '영수 취소됨 / Cancelled');
    } catch(err){ alert('Error: '+err.message); }
  }

  async function reprint(b){
    try { setReprintData(await api.get('/billing/'+b.id+'/detail')); }
    catch(err){ alert('Error: '+err.message); }
  }

  async function settleConfirm(){
    if(!settleBill) return;
    var amt = parseFloat(settleAmt)||0;
    var out = parseFloat(settleBill.outstanding)||0;
    if(amt<=0){ alert(t.enterAmount||'금액을 입력하세요'); return; }
    if(amt>out+0.5){ alert((t.maxOutstanding||'미수액보다 클 수 없습니다')+': '+fmtAr(out)+' Ar'); return; }
    try {
      await api.post('/billing/'+settleBill.id+'/pay', { amount: amt });
      setSettleBill(null); setSettleAmt('');
      var pid = sel?sel.patient_id:null;
      if(pid){ try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){}
               try { setPatBalance(await api.get('/billing/patient/'+pid+'/balance')); } catch(e){} }
      await loadLists();
    } catch(err){ alert('Error: '+err.message); }
  }

  async function settleAll(){
    var pid = sel?sel.patient_id:null; if(!pid) return;
    var bills = (receipts||[]).filter(function(b){ return b.payment_status!=='cancelled' && (parseFloat(b.outstanding)||0) > 0; });
    if(!bills.length) return;
    var total = bills.reduce(function(a,b){ return a+(parseFloat(b.outstanding)||0); },0);
    if(!window.confirm((t.settleAllConfirm||'전체 미수를 일괄 수납합니다')+'\n'+(t.outstanding||'미수')+': '+fmtAr(total)+' Ar')) return;
    try {
      for(var i=0;i<bills.length;i++){ await api.post('/billing/'+bills[i].id+'/pay', { amount: Math.round(parseFloat(bills[i].outstanding)||0) }); }
      try { setReceipts(await api.get('/billing/patient/'+pid+'/history')); } catch(e){}
      try { setPatBalance(await api.get('/billing/patient/'+pid+'/balance')); } catch(e){}
      await loadLists();
    } catch(err){ alert('Error: '+err.message); }
  }

  function statusBadge(s){
    var paid=s==='paid', unpaid=s==='unpaid';
    return <span style={{background:paid?'#10b98118':unpaid?'#ef444418':'#f59e0b18',color:paid?'#34d399':unpaid?'#ef4444':'#fbbf24',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:700}}>{s}</span>;
  }

  function listData(){ return (tab==='waiting'?pending:completed).filter(matches); }

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'#0f1117',color:tx,minHeight:'100vh',fontSize:16}}>
      <TopBar />
      <div style={{background:'#161a26',borderBottom:'1px solid '+bd,padding:'6px 12px',display:'flex',alignItems:'center',gap:8}}>
        <button onClick={function(){setTab('waiting')}} style={{background:tab==='waiting'?'#3b82f6':'#1e2433',color:'#fff',border:'1px solid '+(tab==='waiting'?'#60a5fa':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:'pointer'}}>{L.waitingPay} ({pending.length})</button>
        <button onClick={function(){setTab('completed')}} style={{background:tab==='completed'?'#10b981':'#1e2433',color:'#fff',border:'1px solid '+(tab==='completed'?'#34d399':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:'pointer'}}>{L.completedPay} ({completed.length})</button>
        <button onClick={function(){setFinderOpen(true)}} style={{background:'#1e2433',color:'#cbd5e1',border:'1px solid '+bd2,borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:'pointer'}}>🔍 {t.findPatient}</button>
        <button onClick={function(){ if(sel) setDocOpen(true); }} disabled={!sel} style={{background:sel?'#0f766e':'#1e2433',color:sel?'#ccfbf1':'#475569',border:'1px solid '+(sel?'#14b8a6':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>📄 {t.documents}</button>
        <button onClick={function(){ if(sel) setRxOpen(true); }} disabled={!sel} style={{background:sel?'#b45309':'#1e2433',color:sel?'#fde68a':'#475569',border:'1px solid '+(sel?'#f59e0b':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>💊 {t.outsideRx}</button>
        <button onClick={function(){ if(sel) setChartOpen(true); }} disabled={!sel} style={{background:sel?'#7c3aed':'#1e2433',color:sel?'#ede9fe':'#475569',border:'1px solid '+(sel?'#a855f7':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>📋 {t.chartViewer||'차트뷰어'}</button>
        <button onClick={function(){ if(sel) setReadingsOpen(true); }} disabled={!sel} style={{background:sel?'#5b21b6':'#1e2433',color:sel?'#ede9fe':'#475569',border:'1px solid '+(sel?'#8b5cf6':bd2),borderRadius:6,padding:'7px 14px',fontSize:15,fontWeight:800,cursor:sel?'pointer':'not-allowed'}}>🩻 {t.reading||'판독소견'}</button>
        <div style={{flex:1}}></div>
        {tab==='waiting'&&sel&&billItems&&!sel.needs_refund?(nothingToCharge()?(
          <span style={{color:'#34d399',fontSize:14,fontWeight:800,padding:'7px 14px'}}>✓ {t.alreadySettled||'이미 수납 완료'}</span>
        ):(<>
          <button onClick={function(){doConfirm('unpaid')}} style={{background:'#ef444420',color:'#f87171',border:'1px solid #ef444440',borderRadius:6,padding:'7px 14px',cursor:'pointer',fontSize:14,fontWeight:700}}>{L.leaveUnpaid}</button>
          <button onClick={function(){doConfirm(amtPaidNum()>=totalDue()?'paid':'partial')}} style={{background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',cursor:'pointer',fontSize:15,fontWeight:800}}>{t.confirmPayment}</button>
        </>)):null}
        <button onClick={loadLists} style={{background:'#1e2433',color:tx,border:'1px solid '+bd2,borderRadius:6,padding:'7px 12px',cursor:'pointer'}}>↻</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'340px 1fr 340px',height:'calc(100vh - 122px)'}}>
        <div style={{borderRight:'1px solid '+bd,display:'flex',flexDirection:'column',background:pn}}>
          <div style={{padding:'9px 12px',borderBottom:'1px solid '+bd,background:scBg,fontWeight:800,fontSize:16,color:tx}}>💰 {tab==='waiting'?L.waitingPay:L.todayPaid}</div>
          <div style={{padding:'7px 9px',borderBottom:'1px solid '+bd}}>
            <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:scBg,border:'1px solid '+bd2,borderRadius:5,padding:'7px 9px',color:tx,fontSize:15,outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {loading?<div style={{padding:20,textAlign:'center',color:t3}}>{t.loading}</div>:listData().map(function(v){
              var isSel=sel&&sel.id===v.id;
              return <div key={tab+'-'+v.id} onClick={function(){tab==='waiting'?selectVisit(v):selectCompleted(v)}} style={{padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid #1e2433',background:isSel?'#3b82f612':'transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:3}}>
                  <span style={{fontWeight:800,fontSize:15,color:'#f1f5f9'}}>{v.last_name} {v.first_name}</span>
                  {tab==='waiting'?(v.needs_additional?<span style={{background:'#3b82f618',color:'#60a5fa',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.additionalBadge}</span>:v.needs_refund?<span style={{background:'#a855f718',color:'#c084fc',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.correctionBadge}</span>:v.needs_rebill?<span style={{background:'#ef444418',color:'#f87171',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.rebillBadge}</span>:<span style={{background:'#f59e0b18',color:'#f59e0b',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:800}}>{t.waiting}</span>):statusBadge(v.payment_status)}
                </div>
                <div style={{fontSize:13,color:t2}}>{v.chart_no} · {v.dept_code||''} · {v.doctor_name||''}</div>
                {tab==='waiting'&&v.needs_rebill?<div style={{fontSize:12,color:'#f87171',marginTop:2,fontFamily:'monospace'}}>📅 {ymd(v.visit_date)} · {t.rebillHint}</div>:null}
                {tab==='waiting'&&v.needs_additional?<div style={{fontSize:12,color:'#60a5fa',marginTop:2,fontFamily:'monospace'}}>➕ {t.additionalHint}: {fmtAr(v.extra_due)} Ar</div>:null}
                {tab==='waiting'&&v.needs_refund?<div style={{fontSize:12,color:'#c084fc',marginTop:2,fontFamily:'monospace'}}>↩ {t.refundDue}: {fmtAr(v.refund_due)} Ar</div>:null}
                {tab==='completed'?<>
                  <div style={{fontSize:12,color:'#60a5fa',marginTop:3,fontFamily:'monospace'}}>{v.receipt_no}</div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:3}}><span style={{color:t3}}>{ymd(v.billing_date)}</span><strong style={{color:'#34d399',fontFamily:'monospace'}}>{fmtAr(v.total_due)} Ar</strong></div>
                </>:null}
                {tab==='waiting'&&(parseFloat(v.previous_balance)||0)>0?<div style={{fontSize:12,color:'#ef4444',marginTop:3}}>+ Outstanding: {fmtAr(v.previous_balance)} Ar</div>:null}
              </div>;
            })}
            {!loading&&tab==='completed'&&listData().length===0?<div style={{padding:25,textAlign:'center',color:t3}}>{L.noCompleted}</div>:null}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',overflow:'hidden',background:'#11141c'}}>
          {tab==='waiting'?renderWaiting():renderCompleted()}
        </div>

        <div style={{borderLeft:'1px solid '+bd,display:'flex',flexDirection:'column',background:pn,overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:'1px solid '+bd,background:scBg}}>
            <button onClick={function(){setRightTab2('chart')}} style={{flex:1,background:rightTab2==='chart'?'#3b82f618':'transparent',color:rightTab2==='chart'?'#60a5fa':t3,border:'none',borderBottom:rightTab2==='chart'?'2px solid #3b82f6':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:14,fontWeight:800}}>{t.pastVisits}</button>
            <button onClick={function(){setRightTab2('receipts')}} style={{flex:1,background:rightTab2==='receipts'?'#10b98118':'transparent',color:rightTab2==='receipts'?'#34d399':t3,border:'none',borderBottom:rightTab2==='receipts'?'2px solid #10b981':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:14,fontWeight:800}}>{t.receiptHistory}</button>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {rightTab2==='chart'? <PatientChart patientId={sel?sel.patient_id:null} /> : (
              !sel ? <div style={{padding:20,textAlign:'center',color:'#334155',fontSize:14,fontStyle:'italic'}}>{L.selectWaiting}</div> :
              receipts.length>0 ? <div style={{padding:'6px 8px'}}>
              {patBalance.owed>0?<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#ef444412',border:'1px solid #ef444430',borderRadius:6,padding:'7px 10px',marginBottom:8}}>
                <span style={{fontSize:13,color:'#f87171',fontWeight:800,fontFamily:'monospace'}}>{t.outstanding}: {fmtAr(patBalance.owed)} Ar</span>
                <button onClick={settleAll} style={{background:'#10b981',color:'#fff',border:'none',borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize:13,fontWeight:800}}>💵 {t.settleAll||'전체 미수 수납'}</button>
              </div>:null}
              {receipts.map(function(b,i){
                var out=parseFloat(b.outstanding)||0;
                var cancelled = b.payment_status==='cancelled';
                return <div key={i} style={{background:scBg,border:'1px solid '+(cancelled?'#ef444440':bd),borderRadius:5,padding:'8px 10px',marginBottom:6,opacity:cancelled?0.65:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontFamily:'monospace',fontSize:13,color:'#34d399',fontWeight:700,textDecoration:cancelled?'line-through':'none'}}>{ymd(b.billing_date)}</span>
                    <span style={{fontSize:11,color:t2}}>{b.dept_code||''}</span>
                    <span style={{fontSize:11,color:t3,marginLeft:'auto',fontFamily:'monospace'}}>{b.receipt_no}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontFamily:'monospace',textDecoration:cancelled?'line-through':'none'}}>
                    <span style={{color:t2}}>{t.totalDue}: {fmtAr(b.total_due)}</span>
                    <span style={{color:'#34d399'}}>{t.amountPaid}: {fmtAr(b.amount_paid)}</span>
                  </div>
                  {out>0&&!cancelled?<div style={{fontSize:12,color:'#ef4444',marginTop:2,fontFamily:'monospace'}}>{t.outstanding}: {fmtAr(out)} Ar</div>:null}
                  <div style={{marginTop:4,display:'flex',alignItems:'center',gap:6}}>
                    {cancelled? <span style={{fontSize:11,fontWeight:800,color:'#f87171',background:'#ef444418',border:'1px solid #ef444440',borderRadius:4,padding:'1px 7px'}}>{t.cancelledBadge}</span> : statusBadge(b.payment_status)}
                    <div style={{flex:1}}></div>
                    {out>0&&!cancelled?<button onClick={function(){ setSettleBill(b); setSettleAmt(String(Math.round(out))); }} style={{background:'#10b98118',color:'#34d399',border:'1px solid #10b98140',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12,fontWeight:700}}>💵 {t.settleOutstanding}</button>:null}
                    <button onClick={function(){reprint(b)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12}}>🖨 {t.reprint}</button>
                    {!cancelled?<button onClick={function(){voidReceipt(b)}} style={{background:'#ef444418',color:'#f87171',border:'1px solid #ef444440',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:12}}>{t.voidReceipt}</button>:null}
                  </div>
                </div>;
              })}</div> : <div style={{padding:20,textAlign:'center',color:'#334155',fontSize:14,fontStyle:'italic'}}>{t.noReceipts}</div>
            )}
          </div>
        </div>
      </div>

      {showReceipt?(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',color:'#000',borderRadius:8,width:380,maxHeight:'90vh',overflow:'auto'}}>
            <div id="receipt-print" style={{padding:'20px',fontFamily:"'Courier New',monospace"}}>
              <div style={{textAlign:'center',borderBottom:'2px dashed #000',paddingBottom:10,marginBottom:10}}><div style={{fontSize:16,fontWeight:700}}>Bethesda Clinic</div><div style={{fontSize:12}}>Antananarivo, Madagascar</div></div>
              <div style={{fontSize:13,marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between'}}><span>Receipt:</span><strong>{receiptNo}</strong></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Date:</span><span>{new Date().toLocaleDateString('en-CA')}</span></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Patient:</span><strong>{sel?.last_name} {sel?.first_name}</strong></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Chart:</span><span>{sel?.chart_no}</span></div></div>
              <div style={{fontSize:14,borderTop:'1px dashed #000',paddingTop:8}}><div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}><span>Total</span><span>{fmtAr(totalDue())} Ar</span></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Paid</span><span>{fmtAr(amtPaidNum())} Ar</span></div>{outstandingAmt()>0?<div style={{display:'flex',justifyContent:'space-between',color:'#c00',fontWeight:700}}><span>Outstanding</span><span>{fmtAr(outstandingAmt())} Ar</span></div>:null}</div>
              <div style={{textAlign:'center',borderTop:'2px dashed #000',paddingTop:8,marginTop:10,fontSize:13}}>Thank you</div>
            </div>
            <div style={{padding:'10px 14px',borderTop:'1px solid #ddd',display:'flex',gap:8,background:'#f5f5f5'}}><button onClick={function(){setShowReceipt(false);setSel(null);setBillItems(null)}} style={{flex:1,background:'#fff',border:'1px solid #ccc',borderRadius:5,padding:'8px',cursor:'pointer',fontSize:14}}>{t.close}</button><button onClick={function(){window.print()}} style={{flex:2,background:'#10b981',border:'none',borderRadius:5,padding:'8px',cursor:'pointer',fontSize:14,fontWeight:700,color:'#fff'}}>🖨 {t.printReceipt}</button></div>
          </div>
        </div>
      ):null}

      {settleBill?(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={function(){setSettleBill(null)}}>
          <div style={{background:pn,border:'1px solid '+bd2,color:tx,borderRadius:10,width:380,padding:18}} onClick={function(e){e.stopPropagation()}}>
            <div style={{fontWeight:900,fontSize:16,marginBottom:4,color:'#34d399'}}>💵 {t.settleOutstanding}</div>
            <div style={{fontSize:13,color:t2,marginBottom:12}}>{settleBill.receipt_no} · {ymd(settleBill.billing_date)}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:6,fontFamily:'monospace'}}><span style={{color:t2}}>{t.outstanding}</span><span style={{color:'#ef4444',fontWeight:800}}>{fmtAr(settleBill.outstanding)} Ar</span></div>
            <label style={{fontSize:12,color:t3,fontWeight:700}}>{t.amountReceived||'받은 금액'}</label>
            <input type="number" value={settleAmt} onChange={function(e){setSettleAmt(e.target.value)}} autoFocus style={{width:'100%',boxSizing:'border-box',background:scBg,border:'1px solid '+bd2,borderRadius:7,padding:'10px 12px',color:tx,fontSize:18,fontFamily:'monospace',marginTop:4}} />
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <button onClick={function(){ setSettleAmt(String(Math.round(parseFloat(settleBill.outstanding)||0))); }} style={{flex:1,background:'#10b98118',color:'#34d399',border:'1px solid #10b98140',borderRadius:6,padding:'7px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.fullAmount||'전액'}</button>
              {[5000,10000,50000].map(function(v){ return <button key={v} onClick={function(){ setSettleAmt(String((parseFloat(settleAmt)||0)+v)); }} style={{flex:1,background:scBg,color:t2,border:'1px solid '+bd2,borderRadius:6,padding:'7px',cursor:'pointer',fontSize:13}}>+{fmtAr(v)}</button>; })}
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={function(){setSettleBill(null)}} style={{flex:1,background:scBg,color:t2,border:'1px solid '+bd2,borderRadius:7,padding:'10px',cursor:'pointer',fontSize:14}}>{t.cancel||'취소'}</button>
              <button onClick={settleConfirm} style={{flex:2,background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:7,padding:'10px',cursor:'pointer',fontSize:15,fontWeight:800}}>{t.confirmPayment||'수납 확정'}</button>
            </div>
          </div>
        </div>
      ):null}

      {reprintData?(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',color:'#000',borderRadius:10,width:380,maxHeight:'90vh',overflow:'auto'}}>
            <div id="receipt-print" style={{padding:'20px',fontFamily:"'Courier New',monospace"}}>
              <div style={{textAlign:'center',fontWeight:900,fontSize:18,marginBottom:4}}>{t.clinicName||'Bethesda'}</div>
              <div style={{textAlign:'center',fontSize:12,color:'#444',marginBottom:10}}>{L.receiptNo}: {reprintData.bill.receipt_no}</div>
              {reprintData.bill.payment_status==='cancelled'?<div style={{textAlign:'center',color:'#c00',fontWeight:800,marginBottom:8,border:'2px solid #c00',borderRadius:4,padding:'3px'}}>{t.cancelledBadge}</div>:null}
              <div style={{fontSize:13,marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Date:</span><span>{ymd(reprintData.bill.billing_date)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Patient:</span><strong>{reprintData.bill.last_name} {reprintData.bill.first_name}</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Chart:</span><span>{reprintData.bill.chart_no}</span></div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,borderTop:'1px dashed #000',marginTop:6}}><tbody>
                {(reprintData.items||[]).map(function(it,idx){ return <tr key={idx}>
                  <td style={{padding:'3px 0'}}>{it.item_name}</td>
                  <td style={{padding:'3px 0',textAlign:'right'}}>{fmtAr(it.total_price)}</td>
                </tr>; })}
              </tbody></table>
              <div style={{borderTop:'1px dashed #000',marginTop:8,paddingTop:8,fontSize:13}}>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}><span>{t.totalDue}</span><span>{fmtAr(reprintData.bill.total_due)} Ar</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>{t.amountPaid}</span><span>{fmtAr(reprintData.bill.amount_paid)} Ar</span></div>
              </div>
              <div style={{textAlign:'center',borderTop:'2px dashed #000',paddingTop:8,marginTop:10,fontSize:13}}>Thank you</div>
            </div>
            <div style={{padding:'10px 14px',borderTop:'1px solid #ddd',display:'flex',gap:8,background:'#f5f5f5'}}>
              <button onClick={function(){setReprintData(null)}} style={{flex:1,background:'#fff',border:'1px solid #ccc',borderRadius:5,padding:'8px',cursor:'pointer',fontSize:14}}>{t.close}</button>
              <button onClick={function(){window.print()}} style={{flex:2,background:'#10b981',border:'none',borderRadius:5,padding:'8px',cursor:'pointer',fontSize:14,fontWeight:700,color:'#fff'}}>🖨 {t.printReceipt}</button>
            </div>
          </div>
        </div>
      ):null}
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
        <div onClick={function(){setReadingsOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'80vw',height:'84vh',background:'#0f1117',border:'1px solid '+bd,borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid '+bd,background:scBg}}>
              <span style={{fontWeight:800,fontSize:15,color:'#a78bfa'}}>🩻 {t.reading||'판독소견'}</span>
              <span style={{color:t2,fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setReadingsOpen(false)}} style={{marginLeft:'auto',background:'#374151',color:tx,border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><RadiologyReadings patientId={sel.patient_id} /></div>
          </div>
        </div>
      ) : null}
      <style>{"@media print{body *{visibility:hidden}#receipt-print,#receipt-print *{visibility:visible}#receipt-print{position:absolute;left:0;top:0;width:100%}}"}</style>
    </div>
  );

  function renderWaiting(){
    if(!(sel&&billItems)) return <Empty icon="💰" text={L.selectWaiting} />;
    if(sel.needs_refund){
      var paidNow = parseFloat(sel.active_paid)||0;
      var correctTotal = fullCurrentTotal();
      var refundAmt = Math.max(0, paidNow - correctTotal);
      return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
        <PatientHeader p={sel} />
        <div style={{background:'#a855f714',border:'1px solid #a855f750',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
          <div style={{fontWeight:900,color:'#c084fc',fontSize:15,marginBottom:4}}>↩ {t.correctionBadge}</div>
          <div style={{color:t2,fontSize:13}}>{t.correctionHint}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
          <div>
            <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',fontWeight:800,borderBottom:'1px solid '+bd,color:t2}}>{t.currentItems||'현재 항목'}</div>
              {fullCurrentItems().map(function(it,i){ return <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 12px',borderTop:i?'1px solid #1e2433':'none',fontSize:14}}><span style={{color:tx}}>{it.item_name}{it.quantity>1?' ×'+it.quantity:''}</span><span style={{color:t2,fontFamily:'monospace'}}>{fmtAr(it.total_price)}</span></div>; })}
            </div>
          </div>
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:14,height:'fit-content'}}>
            <SumRow label={t.alreadyBilled} amount={paidNow} />
            <SumRow label={t.correctTotal||'정확한 금액'} amount={correctTotal} bold />
            <div style={{height:1,background:bd,margin:'8px 0'}}></div>
            <div style={{background:'#a855f718',border:'2px solid #a855f750',borderRadius:6,padding:12}}>
              <div style={{fontSize:13,color:'#c084fc',fontWeight:800}}>{t.refundDue}</div>
              <div style={{fontSize:28,fontWeight:900,color:'#c084fc',fontFamily:'monospace',textAlign:'right'}}>{fmtAr(refundAmt)} Ar</div>
            </div>
            <button onClick={confirmCorrection} style={{marginTop:12,width:'100%',background:'#a855f7',color:'#fff',border:'none',borderRadius:7,padding:'12px',fontSize:15,fontWeight:800,cursor:'pointer'}}>↩ {t.processCorrection||'정정(환불) 처리'}</button>
          </div>
        </div>
      </div>;
    }
    return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
      <PatientHeader p={sel} />
      {isAdditional()&&subtotal()>0.0001?<div style={{background:'#3b82f615',border:'1px solid #3b82f640',borderRadius:7,padding:'9px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:13}}><span style={{fontWeight:800,color:'#60a5fa'}}>➕ {t.additionalBadge}</span><span style={{color:t2}}>{t.additionalBannerHint}</span><span style={{marginLeft:'auto',color:t3,fontFamily:'monospace'}}>{t.alreadyBilled}: {fmtAr(billedTotal())} Ar</span></div>:null}
      {sel&&sel.needs_rebill&&(parseFloat(sel.prior_paid)||0)>0?<div style={{background:'#f59e0b12',border:'1px solid #f59e0b40',borderRadius:7,padding:'9px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:13}}><span style={{fontWeight:800,color:'#f59e0b'}}>↺ {t.rebillBadge}</span><span style={{color:t2}}>{t.rebillCarryHint}</span><span style={{marginLeft:'auto',color:'#fbbf24',fontFamily:'monospace',fontWeight:700}}>{t.carriedPaid}: {fmtAr(sel.prior_paid)} Ar</span></div>:null}
      <div style={{display:'grid',gridTemplateColumns:'1fr 330px',gap:16}}>
        <div>
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,padding:'10px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontWeight:900,fontSize:16,color:'#60a5fa'}}>🏥 {t.consultFee}</span>
            <select value={vType} onChange={function(e){setVType(e.target.value)}} style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'5px 8px',color:tx,fontSize:14,cursor:'pointer'}}>
              <option value="newVisit">{t.newVisit}</option>
              <option value="followUp">{t.followUp}</option>
              <option value="emergency">{t.emergency}</option>
              <option value="referral">{t.referral}</option>
              <option value="none">{t.noConsult}</option>
            </select>
            <span style={{marginLeft:'auto',fontSize:17,fontWeight:900,color:tx,fontFamily:'monospace'}}>{fmtAr(consultFee())} Ar</span>
          </div>
          <BillTable title={'💊 '+t.prescriptions} rows={(billItems.prescriptions||[]).map(function(rx){var qty=parseFloat(rx.total_qty)||parseFloat(rx.dose)*rx.frequency*rx.days;return {code:rx.drug_code,name:rx.drug_name,qty:qty,unit:parseFloat(rx.unit_price)||0,total:qty*(parseFloat(rx.unit_price)||0)};})} />
          <BillTable title={'🧾 '+t.procedures} rows={(billItems.orders||[]).map(function(o){var qty=parseFloat(o.quantity)||1;return {code:o.order_code,name:o.order_name,qty:qty,unit:parseFloat(o.unit_price)||0,total:qty*(parseFloat(o.unit_price)||0)};})} />
          <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,marginBottom:10,overflow:'hidden'}}>
            <div style={{padding:'9px 12px',fontWeight:900,borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8}}>
              <span>🧾 {t.adminCharges}</span>
              <select value="" onChange={function(e){ if(e.target.value){ addFeeItem(e.target.value); e.target.value=''; } }} style={{marginLeft:'auto',background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'4px 8px',color:tx,fontSize:13,cursor:'pointer'}}>
                <option value="">+ {t.addCharge}</option>
                {feeCodes.map(function(c){ return <option key={c.id} value={c.id}>{c.name} ({fmtAr(c.price_clinic||c.price)} Ar)</option>; })}
              </select>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><tbody>
              {extraItems.length? extraItems.map(function(it,idx){ return <tr key={idx} style={{borderTop:idx?'1px solid #1e2433':'none'}}>
                <td style={{padding:'7px 10px',color:t2,fontFamily:'monospace',width:60}}>{it.code}</td>
                <td style={{padding:'7px 10px',color:tx}}>{it.name}</td>
                <td style={{padding:'7px 10px',textAlign:'right',color:'#34d399',fontFamily:'monospace'}}>{fmtAr((parseFloat(it.unit_price)||0)*(parseFloat(it.quantity)||1))} Ar</td>
                <td style={{padding:'7px 10px',textAlign:'right',width:30}}><button onClick={function(){removeFeeItem(idx)}} style={{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button></td>
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
          {prevBal()>0?<SumRow label={t.prevOutstanding} amount={prevBal()} color="#ef4444" />:null}
          {patBalance.refund>0?
            <div style={{background:'#3b82f615',border:'1px solid #3b82f640',borderRadius:6,padding:'8px 10px',margin:'8px 0',fontSize:13}}><span style={{color:'#60a5fa',fontWeight:800}}>{t.refundDue}: </span><span style={{color:'#60a5fa',fontFamily:'monospace',fontWeight:800}}>{fmtAr(patBalance.refund)} Ar</span><div style={{color:t3,fontSize:11,marginTop:2}}>{t.refundHint}</div></div>
            :null}
          <div style={{background:'linear-gradient(135deg,#10b98115,#05966915)',border:'2px solid #10b98140',borderRadius:6,padding:12,marginTop:10}}><div style={{fontSize:13,color:'#34d399',fontWeight:800}}>{t.totalDue}</div><div style={{fontSize:28,fontWeight:900,color:'#10b981',fontFamily:'monospace',textAlign:'right'}}>{fmtAr(totalDue())} Ar</div></div>
          <div style={{marginTop:12}}><div style={{fontSize:13,color:t2,marginBottom:4}}>💵 {t.amountPaid}</div><input type="number" value={amountPaid} onChange={function(e){setAmountPaid(e.target.value)}} style={{...inputStyle(),fontSize:20,color:'#10b981',fontWeight:800,padding:9}} /></div>
          <div style={{display:'flex',gap:4,marginTop:6}}>{[totalDue(),5000,10000,20000,50000].map(function(a,i){return <button key={i} onClick={function(){setAmountPaid(String(a))}} style={{flex:1,background:'#1e2433',border:'1px solid '+bd2,borderRadius:4,padding:'5px 2px',color:t2,cursor:'pointer',fontSize:12}}>{i===0?L.exact:fmtAr(a)}</button>;})}</div>
          {amtPaidNum()>=totalDue()&&amtPaidNum()>0?<InfoLine label={t.change} amount={changeAmt()} color="#60a5fa" />:null}
          {amtPaidNum()>0&&amtPaidNum()<totalDue()?<InfoLine label={t.outstanding} amount={outstandingAmt()} color="#ef4444" />:null}
        </div>
      </div>
    </div>;
  }

  function renderCompleted(){
    if(!(sel&&doneBill)) return <Empty icon="✅" text={L.selectCompleted+'\n'+L.paidListHint} />;
    var b=doneBill.bill, items=doneBill.items||[];
    return <div style={{flex:1,overflow:'auto',padding:'12px 16px'}}>
      <div style={{padding:'11px 15px',background:scBg,border:'1px solid '+bd,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:30}}>✅</div><div style={{flex:1}}><div style={{fontSize:19,fontWeight:900,color:'#34d399'}}>{L.billDetail}</div><div style={{fontSize:14,color:t2}}>{b.chart_no} · {b.last_name} {b.first_name} · {ymd(b.billing_date)}</div></div>{statusBadge(b.payment_status)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 330px',gap:16}}>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,overflow:'hidden'}}>
          <div style={{padding:'10px 12px',fontWeight:900,borderBottom:'1px solid '+bd}}>🧾 {L.item}</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><thead><tr style={{background:'#101521'}}><th style={th()}>Code</th><th style={th()}>{L.item}</th><th style={th('right')}>{L.qty}</th><th style={th('right')}>{L.unitPrice}</th><th style={th('right')}>{L.total}</th></tr></thead><tbody>{items.map(function(it){return <tr key={it.id} style={{borderTop:'1px solid #1e2433'}}><td style={td()}>{it.item_code}</td><td style={td()}>{it.item_name}</td><td style={td('right')}>{fmtAr(it.quantity)}</td><td style={td('right')}>{fmtAr(it.unit_price)}</td><td style={td('right','#34d399',800)}>{fmtAr(it.total_price)}</td></tr>;})}</tbody></table>
        </div>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12,height:'fit-content'}}>
          <div style={{display:'grid',gap:5,fontSize:15}}>
            <Pair k={L.receiptNo} v={b.receipt_no}/><Pair k={L.cashier} v={b.cashier_name||''}/><Pair k="Date" v={ymd(b.billing_date)}/><Pair k="Status" v={b.payment_status}/>
          </div>
          <div style={{height:1,background:bd,margin:'10px 0'}}></div>
          <SumRow label={t.subtotal} amount={b.subtotal} />
          <SumRow label={t.discount} amount={b.discount_amount} />
          <SumRow label={t.totalDue} amount={b.total_due} bold />
          <SumRow label={t.amountPaid} amount={b.amount_paid} color="#34d399" />
          <SumRow label={t.outstanding} amount={b.outstanding} color={parseFloat(b.outstanding)>0?'#ef4444':'#34d399'} bold />
        </div>
      </div>
    </div>;
  }

  function PatientHeader(p){ p=p.p; return <div style={{padding:'10px 15px',background:scBg,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:12}}><div style={{background:'#3b82f620',borderRadius:8,width:42,height:42,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,fontWeight:900,color:'#60a5fa'}}>{(p.first_name||'?')[0]}</div><div><div style={{fontWeight:900,fontSize:18,color:'#f1f5f9'}}>{p.last_name} {p.first_name}</div><div style={{fontSize:14,color:t2}}>{p.chart_no} · {p.dept_code} · {p.doctor_name}</div></div></div>; }
  function Section(p){ return <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,padding:'10px 12px',marginBottom:10,display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:900,fontSize:16,color:'#60a5fa'}}>{p.title}</span><span style={{fontSize:17,fontWeight:900,color:tx,fontFamily:'monospace'}}>{fmtAr(p.amount)} Ar</span></div>; }
  function BillTable(p){ return <div style={{background:scBg,border:'1px solid '+bd,borderRadius:7,marginBottom:10,overflow:'hidden'}}><div style={{padding:'9px 12px',fontWeight:900,borderBottom:'1px solid '+bd}}>{p.title}</div><table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><tbody>{p.rows.length?p.rows.map(function(r,i){return <tr key={i} style={{borderTop:i?'1px solid #1e2433':'none'}}><td style={td()}>{r.code}</td><td style={td()}>{r.name}</td><td style={td('right')}>{fmtAr(r.qty)}</td><td style={td('right')}>{fmtAr(r.unit)}</td><td style={td('right','#34d399',800)}>{fmtAr(r.total)}</td></tr>;}):<tr><td style={{padding:12,color:t3,fontStyle:'italic'}}>No items</td></tr>}</tbody></table></div>; }
  function Empty(p){ return <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',whiteSpace:'pre-line'}}><div style={{textAlign:'center'}}><div style={{fontSize:54,marginBottom:12,opacity:0.35}}>{p.icon}</div><div style={{fontStyle:'italic',fontSize:17}}>{p.text}</div></div></div>; }
  function inputStyle(){ return {background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'6px 8px',color:tx,fontSize:15,width:'100%',boxSizing:'border-box',fontFamily:'monospace',textAlign:'right'}; }
  function th(align){ return {padding:'7px 10px',textAlign:align||'left',color:'#bfdbfe',fontSize:13,borderBottom:'1px solid '+bd}; }
  function td(align,color,weight){ return {padding:'7px 10px',textAlign:align||'left',color:color||tx,fontWeight:weight||500,fontFamily:align==='right'?'monospace':'inherit'}; }
  function Pair(p){ return <div style={{display:'flex',justifyContent:'space-between',gap:10}}><span style={{color:t2}}>{p.k}</span><strong style={{color:tx,textAlign:'right'}}>{p.v}</strong></div>; }
  function InfoLine(p){ return <div style={{background:p.color+'15',borderRadius:5,padding:'7px 9px',marginTop:8,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:14,color:p.color,fontWeight:800}}>{p.label}</span><span style={{fontSize:16,color:p.color,fontWeight:900,fontFamily:'monospace'}}>{fmtAr(p.amount)} Ar</span></div>; }
}

function SumRow(p){
  return <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
    <span style={{fontSize:14,color:p.color||'#94a3b8',fontWeight:p.bold?800:600}}>{p.label}</span>
    <span style={{fontSize:p.bold?15:14,fontWeight:p.bold?900:600,color:p.color||'#e2e8f0',fontFamily:'monospace'}}>{fmtAr(p.amount)} Ar</span>
  </div>;
}
