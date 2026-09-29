import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';

function fmtAr(n){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function ymd(d){ var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), da=('0'+d.getDate()).slice(-2); return y+'-'+m+'-'+da; }
function rangeFor(p){
  var now=new Date(), to=ymd(now), from=to;
  if(p==='today'){ from=to; }
  else if(p==='week'){ var d=new Date(now); var wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); from=ymd(d); }
  else if(p==='month'){ from=ymd(new Date(now.getFullYear(), now.getMonth(), 1)); }
  return { from:from, to:to };
}

export default function StatsPage(){
  var langCtx = useLang(); var t = langCtx.t, lang = langCtx.lang;
  var ps = useState('month'), period = ps[0], setPeriod = ps[1];
  var rs = useState(rangeFor('month')), range = rs[0], setRange = rs[1];
  var ds = useState(null), data = ds[0], setData = ds[1];
  var os = useState(null), outData = os[0], setOutData = os[1];
  var ms = useState([]), monthly = ms[0], setMonthly = ms[1];
  var sls = useState(null), showList = sls[0], setShowList = sls[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var dgs = useState('month'), drugGran = dgs[0], setDrugGran = dgs[1];
  var dts = useState('all'), drugType = dts[0], setDrugType = dts[1];
  var dsts = useState('all'), drugStat = dsts[0], setDrugStat = dsts[1];
  // The drug table's own period. Empty means the server's default for the
  // granularity (30 days, 12 months, 5 years); picking a granularity goes back
  // to that default. It is separate from the range at the top because a
  // monthly or yearly table over "this month" would be a single column.
  var drs = useState({ from:'', to:'' }), drugRange = drs[0], setDrugRange = drs[1];
  var dus = useState(null), drugUsage = dus[0], setDrugUsage = dus[1];
  // Cash by period (the till, decided 2026-09-29): its own granularity and dates,
  // like the drug table. Empty dates = the server's default for the granularity.
  var cgs = useState('day'), cashGran = cgs[0], setCashGran = cgs[1];
  var crs = useState({ from:'', to:'' }), cashRange = crs[0], setCashRange = crs[1];
  var cds = useState(null), cashData = cds[0], setCashData = cds[1];

  var bd='#232838', bd2='#2a3142', scBg='#1a1f2e', pn='#13161f', tx='#e2e8f0', t2='#94a3b8', t3='#64748b';

  useEffect(function(){ load(); }, [range.from, range.to]);
  // The trend is always the last six months, whatever range is picked above, so
  // it loads once rather than on every change of dates.
  useEffect(function(){ api.get('/stats/monthly?months=6').then(setMonthly).catch(function(){ setMonthly([]); }); }, []);
  useEffect(function(){ loadDrugUsage(); }, [drugGran, drugType, drugStat, drugRange.from, drugRange.to]);
  useEffect(function(){
    var q = '/stats/cash?granularity='+cashGran;
    if(cashRange.from && cashRange.to) q += '&from='+cashRange.from+'&to='+cashRange.to;
    api.get(q).then(setCashData).catch(function(){ setCashData({ periods:[], total:null, from:cashRange.from, to:cashRange.to }); });
  }, [cashGran, cashRange.from, cashRange.to]);
  function pickCashGran(g){ setCashGran(g); setCashRange({ from:'', to:'' }); }
  function setCashFrom(v){ var to=cashRange.to||(cashData&&cashData.to)||''; if(v&&(!to||v<=to)) setCashRange({ from:v, to:to }); }
  function setCashTo(v){ var from=cashRange.from||(cashData&&cashData.from)||''; if(v&&(!from||from<=v)) setCashRange({ from:from, to:v }); }
  var CASH_KINDS = ['payment','settlement','correction','cancel','opening'];
  var KIND_KO = { payment:'수납', settlement:'미수 수납', correction:'정정 환불', cancel:'취소 환불', opening:'옛 기록' };
  function kindLabel(k){ return t['st_kind_'+k] || KIND_KO[k]; }
  function signedAr(n){ n=Math.round(Number(n)||0); return (n>0?'+':n<0?'−':'')+fmtAr(Math.abs(n)); }
  function exportCashCsv(){
    if(!cashData) return;
    var kinds = CASH_KINDS.filter(function(k){ return k!=='opening' || (cashData.total&&cashData.total.byKind.opening); });
    var lines = [['date','in','out','net'].concat(kinds).join(',')];
    (cashData.periods||[]).concat(cashData.total?[Object.assign({ period:'TOTAL' }, cashData.total)]:[]).forEach(function(r){
      lines.push(['"'+r.period+'"', r.in, r.out, r.net].concat(kinds.map(function(k){ return r.byKind[k]; })).join(','));
    });
    var blob = new Blob(["\ufeff"+lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'cash-'+cashGran+'-'+(cashData.from||'')+'_'+(cashData.to||'')+'.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function loadDrugUsage(){
    try {
      var q = '/stats/drug-usage?granularity='+drugGran;
      if(drugType!=='all') q += '&dispense_type='+drugType;
      if(drugStat==='dispensed') q += '&status=dispensed';
      if(drugRange.from && drugRange.to) q += '&from='+drugRange.from+'&to='+drugRange.to;
      setDrugUsage(await api.get(q));
    // An empty table rather than null: null reads as "still loading" below.
    } catch(e){ setDrugUsage({ drugs:[], periods:[], from:drugRange.from, to:drugRange.to }); }
  }
  function pickDrugGran(g){ setDrugGran(g); setDrugRange({ from:'', to:'' }); }
  // Editing one end keeps the other as shown, so the table never falls back to
  // the default half-way through a change. A start after the end is ignored.
  function setDrugFrom(v){ var to=drugRange.to||(drugUsage&&drugUsage.to)||''; if(v&&(!to||v<=to)) setDrugRange({ from:v, to:to }); }
  function setDrugTo(v){ var from=drugRange.from||(drugUsage&&drugUsage.from)||''; if(v&&(!from||from<=v)) setDrugRange({ from:from, to:v }); }
  function packWord(l){ return t['ph_pack_'+l] || ({ bottle:'병', tube:'튜브', inhaler:'흡입기', unit:'개' })[l] || l; }
  function fmtQty(n){ n=Number(n)||0; return Math.round(n*10)/10===Math.round(n)?String(Math.round(n)):String(Math.round(n*10)/10); }
  function exportDrugCsv(){
    if(!drugUsage) return;
    var P = drugUsage.periods||[], D = drugUsage.drugs||[];
    var head = ['code','drug','category','unit'].concat(P).concat(['total']);
    var lines = [head.join(',')];
    D.forEach(function(d){
      var row = ['"'+(d.drug_code||'')+'"','"'+(d.drug_name||'').replace(/"/g,'""')+'"','"'+(d.category||'')+'"','"'+(d.pack_label?packWord(d.pack_label):'')+'"']
        .concat(P.map(function(p){ return d.by_period[p]||0; }))
        .concat([d.total_qty]);
      lines.push(row.join(','));
    });
    var blob = new Blob(["﻿"+lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'drug-usage-'+drugGran+'-'+(drugUsage.from||'')+'_'+(drugUsage.to||'')+'.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function load(){
    setLoading(true);
    try {
      var d = await api.get('/stats/summary?from='+range.from+'&to='+range.to); setData(d);
    }
    catch(err){ console.error(err); setData(null); }
    setLoading(false);
  }
  // The debtor list does not depend on the dates either. It is fetched when a
  // card is opened, so it is as fresh as the card total it is read against.
  function toggleList(k){
    var next = showList===k ? null : k;
    setShowList(next);
    if(next) api.get('/stats/outstanding').then(setOutData).catch(function(){ setOutData(null); });
  }
  function pick(p){ setPeriod(p); if(p!=='custom') setRange(rangeFor(p)); }
  function setFrom(v){ setPeriod('custom'); setRange(Object.assign({}, range, { from:v })); }
  function setTo(v){ setPeriod('custom'); setRange(Object.assign({}, range, { to:v })); }

  var IS = { background:pn, border:'1px solid '+bd2, borderRadius:6, padding:'6px 10px', color:tx, fontSize:14 };
  function pbtn(p,label){ var on=period===p; return <button onClick={function(){pick(p)}} style={{ background:on?'#3b82f618':'transparent', color:on?'#60a5fa':t3, border:'1px solid '+(on?'#3b82f640':'transparent'), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{label}</button>; }

  function Card(props){ return <div onClick={props.onClick} className={props.onClick?'pressable':undefined} style={{ background:scBg, border:'1px solid '+(props.active?'#3b82f680':bd), borderRadius:10, padding:'14px 16px', flex:1, minWidth:140, cursor:props.onClick?'pointer':'default' }}>
    <div style={{ fontSize:13, color:t3, fontWeight:700 }}>{props.label}{props.onClick?<span style={{marginLeft:5,color:t3,fontSize:11}}>{props.active?'▲':'▼'}</span>:null}</div>
    <div style={{ fontSize:props.small?20:26, fontWeight:900, color:props.color||tx, fontFamily:'monospace', marginTop:4 }}>{props.value}<span style={{fontSize:13,color:t3,fontWeight:600,marginLeft:4}}>{props.unit||''}</span></div>
    {props.sub?<div style={{ fontSize:12, color:t3, marginTop:3 }}>{props.sub}</div>:null}
  </div>; }

  function Bars(props){ // rows: [{label, value, color}]
    var rows=props.rows||[]; var max=Math.max.apply(null, rows.map(function(r){return r.value||0}).concat([1]));
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {rows.length===0?<div style={{color:t3,fontSize:13,padding:'8px 0'}}>{t.noData||'데이터 없음'}</div>:null}
      {rows.map(function(r,i){ return <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:110, fontSize:13, color:t2, textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.label}</div>
        <div style={{ flex:1, background:pn, borderRadius:5, height:22, position:'relative', overflow:'hidden' }}>
          <div data-motion="bar" style={{ width:((r.value||0)/max*100)+'%', background:(r.color||'#3b82f6'), height:'100%', borderRadius:5, minWidth:r.value?3:0, transition:'width 250ms var(--ease-out)' }}></div>
        </div>
        <div style={{ width:90, fontSize:13, color:tx, fontFamily:'monospace', textAlign:'right' }}>{props.money?fmtAr(r.value)+' Ar':r.value}</div>
      </div>; })}
    </div>; }

  function Section(props){ return <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:15, fontWeight:900, color:tx, margin:'0 0 10px 2px' }}>{props.title}</div>
    {props.children}
  </div>; }

  function VBars(props){ // rows:[{label,value}] vertical bars, money optional
    var rows=props.rows||[]; var max=Math.max.apply(null, rows.map(function(r){return r.value||0}).concat([1]));
    return <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140, padding:'4px 2px' }}>
      {rows.length===0?<div style={{color:t3,fontSize:13}}>{t.noData||'데이터 없음'}</div>:null}
      {rows.map(function(r,i){ var h=Math.round((r.value||0)/max*108); return <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:30 }}>
        <div style={{ fontSize:11, color:t2, fontFamily:'monospace', whiteSpace:'nowrap' }}>{props.money?fmtAr(r.value):r.value}</div>
        <div title={r.label} data-motion="bar" style={{ width:'72%', height:Math.max(h,2), background:props.color||'#3b82f6', borderRadius:'4px 4px 0 0', transition:'height 250ms var(--ease-out)' }}></div>
        <div style={{ fontSize:11, color:t3 }}>{r.label}</div>
      </div>; })}
    </div>; }

  var v = data?data.visits:{}, rev = data?data.revenue:{}, out = data?data.outstanding:{}, cash = (data&&data.cash)||{ in:0, out:0, net:0 };
  var unassigned = t.st_unassigned||'미지정';
  // Count words are deliberately empty in English ("15", not "15 cases"), so an
  // empty string is a real value here and must not fall back to the Korean.
  function word(v, ko){ return v != null ? v : ko; }
  var cases = word(t.cases, '건'), people = word(t.people, '명');
  // The server sends every name a department has; show the one for the screen's
  // language. A visit with no department (or doctor) arrives with no code/name.
  function deptLabel(d){
    if(!d.code) return '- '+unassigned;
    var nm = lang==='fr' ? (d.name_fr||d.name_en||d.name) : lang==='en' ? (d.name_en||d.name) : d.name;
    return d.code+' '+(nm||'');
  }
  function doctorLabel(d){ return d.name||unassigned; }

  return <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0d0f16' }}>
    <TopBar />
    <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
      {/* 기간 선택 */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        <span style={{ fontSize:20, fontWeight:900, color:tx, marginRight:8 }}>📊 {t.stats}</span>
        {pbtn('today', t.today||'오늘')}
        {pbtn('week', t.thisWeek||'이번 주')}
        {pbtn('month', t.thisMonth||'이번 달')}
        <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
        <input type="date" value={range.from} onChange={function(e){setFrom(e.target.value)}} style={IS} />
        <span style={{ color:t3 }}>~</span>
        <input type="date" value={range.to} onChange={function(e){setTo(e.target.value)}} style={IS} />
        {loading?<span style={{ color:t3, fontSize:13, marginLeft:8 }}>···</span>:null}
      </div>

      {!data?<div style={{ color:t3, padding:40, textAlign:'center' }}>{loading?(t.loading||'불러오는 중...'):(t.noData||'데이터 없음')}</div>:<>
        {/* 운영 현황 */}
        <Section title={'🏥 '+(t.operations||'운영 현황')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <Card label={t.totalVisits||'총 내원'} value={v.total||0} unit={cases} color="#60a5fa" sub={(t.uniquePatients||'고유 환자')+' '+(v.unique_patients||0)} />
            <Card label={t.newVisit||'초진'} value={v.new_visits||0} unit={cases} small />
            <Card label={t.followUp||'재진'} value={v.follow_ups||0} unit={cases} small />
            {/* Visits that are neither: "no fee" (chosen at reception or payment) and
                the emergency/referral values older records still carry. Without it
                the total did not add up to the cards beside it. */}
            <Card label={t.st_otherVisits||'진료비 없음·기타'} value={v.other_visits||0} unit={cases} small />
            <Card label={t.completed||'완료'} value={v.completed||0} unit={cases} color="#10b981" small />
            <Card label={t.active||'진행 중'} value={v.active||0} unit={cases} color="#f59e0b" small />
            <Card label={t.st_cancelled||'취소'} value={v.cancelled||0} unit={cases} color="#f87171" small />
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDept||'진료과별'}</div>
              <Bars rows={(data.byDept||[]).map(function(d){ return { label:deptLabel(d), value:d.cnt }; })} />
            </div>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDoctor||'의사별'}</div>
              <Bars rows={(data.byDoctor||[]).map(function(d){ return { label:doctorLabel(d), value:d.cnt, color:'#8b5cf6' }; })} />
            </div>
          </div>
        </Section>

        {/* 매출 · 정산 */}
        <Section title={'💰 '+(t.revenueSettlement||'매출 · 정산')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            {/* The day's cash (design A, 2026-09-29): what came into the till minus what
                was handed back, from cash_movement. Replaces the receipt-based figure
                that moved to the correction day when a receipt was corrected. */}
            <Card label={t.st_cash||'그날 현금'} value={(cash.net<0?'−':'')+fmtAr(Math.abs(cash.net||0))} unit="Ar" color={cash.net<0?'#f87171':'#10b981'}
              sub={<><div>{(t.st_cashIn||'들어옴')+' +'+fmtAr(cash.in)+' Ar'}</div><div>{(t.st_cashOut||'나감')+' −'+fmtAr(cash.out)+' Ar'}</div></>} />
            {/* Treatment receipts only; balance settlements (payment M2) are money
                received, not treatments, so they are shown apart (decision 14).
                Billed sits here with the other receipt figures. */}
            <Card label={t.st_billCount||'진료 영수'} value={rev.billCount||0} unit={cases} small
              sub={<><div>{(t.billed||'청구액')+' '+fmtAr(rev.gross)+' Ar'}</div>{rev.settlementCount?<div>{(t.st_settlementsSub||'+ 미수 수납 {n}건').replace('{n}', rev.settlementCount)}</div>:null}</>} />
            <Card label={t.st_avgPerVisit||'방문당 평균 청구액'} value={fmtAr(rev.avgBilledPerVisit)} unit="Ar" small />
            <Card label={t.unpaidBalance||'미수'} value={fmtAr(out.owed)} unit="Ar" color="#f87171" small onClick={function(){toggleList('owed')}} active={showList==='owed'} />
            <Card label={t.refundDue||'환불 예정'} value={fmtAr(out.refund)} unit="Ar" color="#c084fc" small onClick={function(){toggleList('refund')}} active={showList==='refund'} />
            {/* Staff cancellations only; receipts replaced by a correction are not
                counted (item 20). The cash handed back is in the till figures now. */}
            <Card label={t.voidedReceipts||'취소 영수'} value={data.voidedCount||0} unit={cases} color="#f59e0b" small />
          </div>
          {/* 과별·의사별 매출. 진료 섹션의 방문수 그래프와 같은 모양으로 두어, "몇 명 봤는지"와
              "얼마가 들어왔는지"를 같은 눈높이에서 읽을 수 있게 한다. 과는 접수에서 고른 과,
              의사는 담당의 기준이라 두 표의 합계는 같아도 줄 나눔은 다를 수 있다. */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:14 }}>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              {/* By receipt: whose treatment the money was for, not the day's till — so
                  its total can differ from the cash card on days with corrections. */}
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.revByDept||'진료과별 매출'} <span style={{ fontWeight:600, color:t3 }}>— {t.st_byReceipt||'영수 기준'} · {fmtAr(rev.paid)} Ar</span></div>
              <Bars money rows={(data.revenueByDept||[]).map(function(d){ return { label:deptLabel(d), value:d.paid, color:'#10b981' }; })} />
            </div>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.revByDoctor||'의사별 매출'} <span style={{ fontWeight:600, color:t3 }}>— {t.st_byReceipt||'영수 기준'} · {fmtAr(rev.paid)} Ar</span></div>
              <Bars money rows={(data.revenueByDoctor||[]).map(function(d){ return { label:doctorLabel(d), value:d.paid, color:'#22c55e' }; })} />
            </div>
          </div>
          {showList?<div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:900, color:showList==='owed'?'#f87171':'#c084fc', marginBottom:10 }}>
              {showList==='owed'?('🔴 '+(t.unpaidList||'미수 명단')):('🟣 '+(t.refundList||'환불 명단'))}
              <span style={{ fontSize:12, color:t3, fontWeight:600, marginLeft:8 }}>{((outData&&outData[showList])||[]).length} {people}</span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ color:t3, textAlign:'left' }}>
                  <th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd }}>{t.chartNo||'차트번호'}</th>
                  <th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd }}>{t.name||'이름'}</th>
                  <th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd }}>{t.phone||'전화번호'}</th>
                  <th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd, textAlign:'right' }}>{showList==='owed'?(t.unpaidBalance||'미수'):(t.refundDue||'환불')}</th>
                  {showList==='owed'?<th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd }}>{t.owedSince||'발생일'}</th>:null}
                  <th style={{ padding:'6px 8px', borderBottom:'1px solid '+bd, textAlign:'right' }}>{t.openBills||'건수'}</th>
                </tr></thead>
                <tbody>
                  {((outData&&outData[showList])||[]).map(function(r,i){ return <tr key={i} style={{ borderBottom:'1px solid #1e2433' }}>
                    <td style={{ padding:'7px 8px', color:'#93c5fd', fontFamily:'monospace' }}>{r.chart_no}</td>
                    <td style={{ padding:'7px 8px', color:tx, fontWeight:700 }}>{r.name}</td>
                    <td style={{ padding:'7px 8px', color:t2, fontFamily:'monospace' }}>{r.contact||'—'}</td>
                    <td style={{ padding:'7px 8px', color:showList==='owed'?'#f87171':'#c084fc', fontFamily:'monospace', fontWeight:800, textAlign:'right' }}>{fmtAr(r.amount)} Ar</td>
                    {showList==='owed'?<td style={{ padding:'7px 8px', color:t2 }}>{r.since||'—'}</td>:null}
                    <td style={{ padding:'7px 8px', color:t3, textAlign:'right' }}>{r.open_bills}</td>
                  </tr>; })}
                  {((outData&&outData[showList])||[]).length===0?<tr><td colSpan={6} style={{ padding:'14px 8px', color:t3, textAlign:'center' }}>{outData?(t.noData||'데이터 없음'):(t.loading||'불러오는 중...')}</td></tr>:null}
                </tbody>
              </table>
            </div>
          </div>:null}
          <div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14, maxWidth:560 }}>
            <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.revenueByItem||'항목별 매출 (청구 기준)'}</div>
            <Bars money rows={[
              { label:t.consultFee||'진료비', value:rev.consult, color:'#60a5fa' },
              { label:t.drugs||'약', value:rev.drug, color:'#34d399' },
              { label:t.procedures||'검사/처치', value:rev.procedure, color:'#fbbf24' },
              { label:t.issuance||'서류', value:rev.issuance, color:'#c084fc' },
            ]} />
          </div>
        </Section>

        {/* 기간별 현금 (그날 현금 by day / month / year) */}
        <Section title={'💵 '+(t.st_cashTable||'기간별 현금')}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {[['day',t.daily||'일별'],['month',t.monthly2||'월별'],['year',t.yearly||'연별']].map(function(o){ var on=cashGran===o[0];
              return <button key={o[0]} onClick={function(){pickCashGran(o[0])}} style={{ background:on?'#10b98118':'transparent', color:on?'#10b981':t3, border:'1px solid '+(on?'#10b98140':bd2), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            <input type="date" value={cashRange.from||(cashData&&cashData.from)||''} max={cashRange.to||(cashData&&cashData.to)||undefined} onChange={function(e){setCashFrom(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <span style={{ color:t3 }}>~</span>
            <input type="date" value={cashRange.to||(cashData&&cashData.to)||''} min={cashRange.from||(cashData&&cashData.from)||undefined} onChange={function(e){setCashTo(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <div style={{ flex:1 }}></div>
            <button onClick={exportCashCsv} disabled={!cashData||!(cashData.periods||[]).length} style={{ background:'#1e2433', color:'#34d399', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>⬇ CSV</button>
          </div>
          {!cashData?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.loading||'불러오는 중...'}</div>:(function(){
            // The "before the cash log" column only where such rows exist (receipts
            // written before migration 036).
            var kinds = CASH_KINDS.filter(function(k){ return k!=='opening' || (cashData.total&&cashData.total.byKind.opening); });
            var th = { padding:'7px 10px', textAlign:'right', position:'sticky', top:0, background:scBg, borderBottom:'1px solid '+bd, whiteSpace:'nowrap' };
            var td = { padding:'6px 10px', textAlign:'right', fontFamily:'monospace', whiteSpace:'nowrap' };
            function cells(r, bold){ return [
              <td key="in" style={Object.assign({}, td, { color:r.in?'#34d399':'#3a4253', fontWeight:bold?800:400 })}>{r.in?'+'+fmtAr(r.in):'·'}</td>,
              <td key="out" style={Object.assign({}, td, { color:r.out?'#f87171':'#3a4253', fontWeight:bold?800:400 })}>{r.out?'−'+fmtAr(r.out):'·'}</td>,
              <td key="net" style={Object.assign({}, td, { color:r.net<0?'#f87171':tx, fontWeight:800 })}>{r.net?signedAr(r.net):'0'}</td>
            ].concat(kinds.map(function(k){ var v=r.byKind[k]; return <td key={k} style={Object.assign({}, td, { color:v?t2:'#3a4253', fontWeight:bold?800:400 })}>{v?signedAr(v):'·'}</td>; })); }
            return <div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, overflow:'hidden' }}>
              <div style={{ fontSize:12, color:t3, padding:'8px 12px', borderBottom:'1px solid '+bd }}>
                {cashData.from} ~ {cashData.to} · {t.st_cashBasis||'돈이 창구에 들어오고 나간 날 기준 — 영수를 나중에 정정·취소해도 지난 날 숫자는 바뀌지 않음'}
              </div>
              <div style={{ overflow:'auto', maxHeight:'56vh' }}>
                <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
                  <thead><tr style={{ color:t3 }}>
                    <th style={Object.assign({}, th, { textAlign:'left', left:0, zIndex:2 })}>{t.st_date||'날짜'}</th>
                    <th style={th}>{t.st_cashIn||'들어옴'}</th><th style={th}>{t.st_cashOut||'나감'}</th><th style={Object.assign({}, th, { color:tx })}>{t.st_cashNet||'순액'}</th>
                    {kinds.map(function(k){ return <th key={k} style={th}>{kindLabel(k)}</th>; })}
                  </tr></thead>
                  <tbody>
                    {(cashData.periods||[]).map(function(r){ return <tr key={r.period} style={{ borderBottom:'1px solid #1a1f2e' }}>
                      <td style={{ padding:'6px 10px', fontFamily:'monospace', color:t2, whiteSpace:'nowrap' }}>{r.period}</td>{cells(r, false)}
                    </tr>; })}
                  </tbody>
                  {/* Here a total means something: every column is Ariary. */}
                  {cashData.total?<tfoot><tr style={{ background:pn }}>
                    <td style={{ padding:'7px 10px', color:tx, fontWeight:800, borderTop:'1px solid '+bd2 }}>{t.total||'합계'}</td>{cells(cashData.total, true)}
                  </tr></tfoot>:null}
                </table>
              </div>
            </div>;
          })()}
        </Section>

        {/* 약품 사용통계 */}
        <Section title={'💊 '+(t.drugUsage||'약품 사용통계')}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {[['day',t.daily||'일별'],['month',t.monthly2||'월별'],['year',t.yearly||'연별']].map(function(o){ var on=drugGran===o[0];
              return <button key={o[0]} onClick={function(){pickDrugGran(o[0])}} style={{ background:on?'#34d39918':'transparent', color:on?'#34d399':t3, border:'1px solid '+(on?'#34d39940':bd2), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allRx||'전체'],['internal',t.internalRx||'원내'],['external',t.externalRx||'원외']].map(function(o){ var on=drugType===o[0];
              return <button key={o[0]} onClick={function(){setDrugType(o[0])}} style={{ background:on?'#3b82f618':'transparent', color:on?'#60a5fa':t3, border:'1px solid '+(on?'#3b82f640':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allOrders||'처방전체'],['dispensed',t.dispensedOnly||'조제완료']].map(function(o){ var on=drugStat===o[0];
              return <button key={o[0]} onClick={function(){setDrugStat(o[0])}} style={{ background:on?'#a78bfa18':'transparent', color:on?'#a78bfa':t3, border:'1px solid '+(on?'#a78bfa40':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            <input type="date" value={drugRange.from||(drugUsage&&drugUsage.from)||''} max={drugRange.to||(drugUsage&&drugUsage.to)||undefined} onChange={function(e){setDrugFrom(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <span style={{ color:t3 }}>~</span>
            <input type="date" value={drugRange.to||(drugUsage&&drugUsage.to)||''} min={drugRange.from||(drugUsage&&drugUsage.from)||undefined} onChange={function(e){setDrugTo(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <div style={{ flex:1 }}></div>
            <button onClick={exportDrugCsv} disabled={!drugUsage||!(drugUsage.drugs||[]).length} style={{ background:'#1e2433', color:'#34d399', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>⬇ CSV</button>
          </div>
          {!drugUsage?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.loading||'불러오는 중...'}</div>:
            (!(drugUsage.drugs||[]).length?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.noData||'데이터 없음'}</div>:
            <div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, overflow:'hidden' }}>
              <div style={{ fontSize:12, color:t3, padding:'8px 12px', borderBottom:'1px solid '+bd }}>
                {/* Item count only: a sum across drugs would add tablets to bottles (decision 19). */}
                {drugUsage.from} ~ {drugUsage.to} · {(drugUsage.drugs||[]).length} {t.drugsUnit||'품목'}
                {/* Which rules the numbers follow: prescribed (visit date, quantity written)
                    or dispensed (day handed over, in-house, whole units — the stock report's). */}
                <div style={{ marginTop:3 }}>{drugStat==='dispensed'?(t.st_rxBasisDispensed||'조제완료: 약국이 내준 날 기준 · 원내 약만 · 알약 단위로 올림 — 약국 재고 보고서의 출고와 같은 숫자'):(t.st_rxBasisAll||'처방전체: 처방한 날(내원일) 기준 · 처방한 수량 그대로')}</div>
              </div>
              <div style={{ overflow:'auto', maxHeight:'56vh' }}>
                <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%', minWidth:540 }}>
                  <thead><tr style={{ color:t3 }}>
                    <th style={{ padding:'7px 10px', textAlign:'left', position:'sticky', left:0, top:0, background:scBg, borderBottom:'1px solid '+bd, zIndex:2, minWidth:170 }}>{t.drug||'약품'}</th>
                    {(drugUsage.periods||[]).map(function(p){ return <th key={p} style={{ padding:'7px 10px', textAlign:'right', position:'sticky', top:0, background:scBg, borderBottom:'1px solid '+bd, fontFamily:'monospace', whiteSpace:'nowrap' }}>{drugGran==='day'?p.slice(5):p}</th>; })}
                    <th style={{ padding:'7px 12px', textAlign:'right', position:'sticky', top:0, right:0, background:scBg, borderBottom:'1px solid '+bd, color:tx }}>{t.total||'합계'}</th>
                  </tr></thead>
                  <tbody>
                    {(drugUsage.drugs||[]).map(function(d,i){ return <tr key={i} style={{ borderBottom:'1px solid #1a1f2e' }}>
                      <td style={{ padding:'6px 10px', position:'sticky', left:0, background:scBg, borderRight:'1px solid '+bd }}>
                        <span style={{ color:tx, fontWeight:700 }}>{d.drug_name}</span>
                        {/* Pack-unit line: the quantity is bottles/tubes, not doses. The unit
                            words are the pharmacy's (ph_pack_*), as on the drug list. */}
                        {d.pack_label?<span style={{ marginLeft:6, fontSize:11, color:'#fbbf24', border:'1px solid #f59e0b60', borderRadius:3, padding:'0 4px' }}>{packWord(d.pack_label)}</span>:null}
                        <span style={{ color:t3, fontFamily:'monospace', fontSize:11, marginLeft:6 }}>{d.drug_code!=='-'?d.drug_code:''}</span>
                      </td>
                      {(drugUsage.periods||[]).map(function(p){ var val=d.by_period[p]; return <td key={p} style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace', color:val?t2:'#3a4253' }}>{val?fmtQty(val):'·'}</td>; })}
                      <td style={{ padding:'6px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:'#34d399', position:'sticky', right:0, background:scBg, borderLeft:'1px solid '+bd }}>{fmtQty(d.total_qty)}</td>
                    </tr>; })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </Section>

        {/* 월별 추이 */}
        <Section title={'📈 '+(t.monthlyTrend||'월별 추이')+' ('+(t.last6mo||'최근 6개월')+')'}>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:300, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.totalVisits||'총 내원'}</div>
              <VBars color="#60a5fa" rows={(monthly||[]).map(function(m){ return { label:(m.ym||'').slice(5), value:m.visits }; })} />
            </div>
            <div style={{ flex:1, minWidth:300, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.st_cash||'그날 현금'} (Ar)</div>
              <VBars money color="#34d399" rows={(monthly||[]).map(function(m){ return { label:(m.ym||'').slice(5), value:m.revenue }; })} />
            </div>
          </div>
        </Section>
      </>}
    </div>
  </div>;
}
