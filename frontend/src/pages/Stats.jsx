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
  var langCtx = useLang(); var t = langCtx.t;
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
  var dus = useState(null), drugUsage = dus[0], setDrugUsage = dus[1];

  var bd='#232838', bd2='#2a3142', scBg='#1a1f2e', pn='#13161f', tx='#e2e8f0', t2='#94a3b8', t3='#64748b';

  useEffect(function(){ load(); }, [range.from, range.to]);
  useEffect(function(){ loadDrugUsage(); }, [drugGran, drugType, drugStat]);
  async function loadDrugUsage(){
    try {
      var q = '/stats/drug-usage?granularity='+drugGran;
      if(drugType!=='all') q += '&dispense_type='+drugType;
      if(drugStat==='dispensed') q += '&status=dispensed';
      setDrugUsage(await api.get(q));
    } catch(e){ setDrugUsage(null); }
  }
  function fmtQty(n){ n=Number(n)||0; return Math.round(n*10)/10===Math.round(n)?String(Math.round(n)):String(Math.round(n*10)/10); }
  function exportDrugCsv(){
    if(!drugUsage) return;
    var P = drugUsage.periods||[], D = drugUsage.drugs||[];
    var head = ['code','drug','category'].concat(P).concat(['total']);
    var lines = [head.join(',')];
    D.forEach(function(d){
      var row = ['"'+(d.drug_code||'')+'"','"'+(d.drug_name||'').replace(/"/g,'""')+'"','"'+(d.category||'')+'"']
        .concat(P.map(function(p){ return d.by_period[p]||0; }))
        .concat([d.total_qty]);
      lines.push(row.join(','));
    });
    var totals = ['"TOTAL"','',''].concat(P.map(function(p){ return (drugUsage.periodTotals||{})[p]||0; })).concat([drugUsage.grandTotal||0]);
    lines.push(totals.join(','));
    var blob = new Blob(["﻿"+lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'drug-usage-'+drugGran+'-'+(drugUsage.from||'')+'_'+(drugUsage.to||'')+'.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function load(){
    setLoading(true);
    try {
      var d = await api.get('/stats/summary?from='+range.from+'&to='+range.to); setData(d);
      try { setOutData(await api.get('/stats/outstanding')); } catch(e){ setOutData(null); }
      try { setMonthly(await api.get('/stats/monthly?months=6')); } catch(e){ setMonthly([]); }
    }
    catch(err){ console.error(err); setData(null); }
    setLoading(false);
  }
  function pick(p){ setPeriod(p); if(p!=='custom') setRange(rangeFor(p)); }
  function setFrom(v){ setPeriod('custom'); setRange(Object.assign({}, range, { from:v })); }
  function setTo(v){ setPeriod('custom'); setRange(Object.assign({}, range, { to:v })); }

  var IS = { background:pn, border:'1px solid '+bd2, borderRadius:6, padding:'6px 10px', color:tx, fontSize:14 };
  function pbtn(p,label){ var on=period===p; return <button onClick={function(){pick(p)}} style={{ background:on?'#3b82f618':'transparent', color:on?'#60a5fa':t3, border:'1px solid '+(on?'#3b82f640':'transparent'), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{label}</button>; }

  function Card(props){ return <div onClick={props.onClick} style={{ background:scBg, border:'1px solid '+(props.active?'#3b82f680':bd), borderRadius:10, padding:'14px 16px', flex:1, minWidth:140, cursor:props.onClick?'pointer':'default' }}>
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
          <div style={{ width:((r.value||0)/max*100)+'%', background:(r.color||'#3b82f6'), height:'100%', borderRadius:5, minWidth:r.value?3:0, transition:'width .3s' }}></div>
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
        <div title={r.label} style={{ width:'72%', height:Math.max(h,2), background:props.color||'#3b82f6', borderRadius:'4px 4px 0 0', transition:'height .3s' }}></div>
        <div style={{ fontSize:11, color:t3 }}>{r.label}</div>
      </div>; })}
    </div>; }

  var v = data?data.visits:{}, rev = data?data.revenue:{}, out = data?data.outstanding:{};

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
            <Card label={t.totalVisits||'총 내원'} value={v.total||0} unit={t.cases||'건'} color="#60a5fa" sub={(t.uniquePatients||'고유 환자')+' '+(v.unique_patients||0)} />
            <Card label={t.newVisit||'초진'} value={v.new_visits||0} unit={t.cases||'건'} small />
            <Card label={t.followUp||'재진'} value={v.follow_ups||0} unit={t.cases||'건'} small />
            <Card label={t.completed||'완료'} value={v.completed||0} unit={t.cases||'건'} color="#10b981" small />
            <Card label={t.active||'진행 중'} value={v.active||0} unit={t.cases||'건'} color="#f59e0b" small />
            <Card label={t.cancelled||'취소'} value={v.cancelled||0} unit={t.cases||'건'} color="#f87171" small />
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDept||'진료과별'}</div>
              <Bars rows={(data.byDept||[]).map(function(d){ return { label:(d.code||'-')+' '+(d.name||''), value:d.cnt }; })} />
            </div>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDoctor||'의사별'}</div>
              <Bars rows={(data.byDoctor||[]).map(function(d){ return { label:d.name, value:d.cnt, color:'#8b5cf6' }; })} />
            </div>
          </div>
        </Section>

        {/* 매출 · 정산 */}
        <Section title={'💰 '+(t.revenueSettlement||'매출 · 정산')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <Card label={t.collected||'수납액'} value={fmtAr(rev.paid)} unit="Ar" color="#10b981" sub={(t.billed||'청구액')+' '+fmtAr(rev.gross)+' Ar'} />
            <Card label={t.billCount||'수납 건수'} value={rev.billCount||0} unit={t.cases||'건'} small />
            <Card label={t.avgPerBill||'평균 단가'} value={fmtAr(rev.avg)} unit="Ar" small />
            <Card label={t.unpaidBalance||'미수'} value={fmtAr(out.owed)} unit="Ar" color="#f87171" small onClick={function(){setShowList(showList==='owed'?null:'owed')}} active={showList==='owed'} />
            <Card label={t.refundDue||'환불 예정'} value={fmtAr(out.refund)} unit="Ar" color="#c084fc" small onClick={function(){setShowList(showList==='refund'?null:'refund')}} active={showList==='refund'} />
            <Card label={t.voidedReceipts||'취소 영수'} value={data.voidedCount||0} unit={t.cases||'건'} color="#f59e0b" small />
          </div>
          {showList?<div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:900, color:showList==='owed'?'#f87171':'#c084fc', marginBottom:10 }}>
              {showList==='owed'?('🔴 '+(t.unpaidList||'미수 명단')):('🟣 '+(t.refundList||'환불 명단'))}
              <span style={{ fontSize:12, color:t3, fontWeight:600, marginLeft:8 }}>{((outData&&outData[showList])||[]).length} {t.people||'명'}</span>
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
                    {showList==='owed'?<td style={{ padding:'7px 8px', color:t2 }}>{r.since?String(r.since).split('T')[0]:'—'}</td>:null}
                    <td style={{ padding:'7px 8px', color:t3, textAlign:'right' }}>{r.open_bills}</td>
                  </tr>; })}
                  {((outData&&outData[showList])||[]).length===0?<tr><td colSpan={6} style={{ padding:'14px 8px', color:t3, textAlign:'center' }}>{t.noData||'데이터 없음'}</td></tr>:null}
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

        {/* 약품 사용통계 */}
        <Section title={'💊 '+(t.drugUsage||'약품 사용통계')}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {[['day',t.daily||'일별'],['month',t.monthly2||'월별'],['year',t.yearly||'연별']].map(function(o){ var on=drugGran===o[0];
              return <button key={o[0]} onClick={function(){setDrugGran(o[0])}} style={{ background:on?'#34d39918':'transparent', color:on?'#34d399':t3, border:'1px solid '+(on?'#34d39940':bd2), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allRx||'전체'],['internal',t.internalRx||'원내'],['external',t.externalRx||'원외']].map(function(o){ var on=drugType===o[0];
              return <button key={o[0]} onClick={function(){setDrugType(o[0])}} style={{ background:on?'#3b82f618':'transparent', color:on?'#60a5fa':t3, border:'1px solid '+(on?'#3b82f640':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allOrders||'처방전체'],['dispensed',t.dispensedOnly||'조제완료']].map(function(o){ var on=drugStat===o[0];
              return <button key={o[0]} onClick={function(){setDrugStat(o[0])}} style={{ background:on?'#a78bfa18':'transparent', color:on?'#a78bfa':t3, border:'1px solid '+(on?'#a78bfa40':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <div style={{ flex:1 }}></div>
            <button onClick={exportDrugCsv} disabled={!drugUsage||!(drugUsage.drugs||[]).length} style={{ background:'#1e2433', color:'#34d399', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>⬇ CSV</button>
          </div>
          {!drugUsage?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.loading||'불러오는 중...'}</div>:
            (!(drugUsage.drugs||[]).length?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.noData||'데이터 없음'}</div>:
            <div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, overflow:'hidden' }}>
              <div style={{ fontSize:12, color:t3, padding:'8px 12px', borderBottom:'1px solid '+bd }}>
                {drugUsage.from} ~ {drugUsage.to} · {(drugUsage.drugs||[]).length} {t.drugsUnit||'품목'} · {t.totalUsage||'총 사용'} {fmtQty(drugUsage.grandTotal)}
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
                        <span style={{ color:t3, fontFamily:'monospace', fontSize:11, marginLeft:6 }}>{d.drug_code!=='-'?d.drug_code:''}</span>
                      </td>
                      {(drugUsage.periods||[]).map(function(p){ var val=d.by_period[p]; return <td key={p} style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace', color:val?t2:'#3a4253' }}>{val?fmtQty(val):'·'}</td>; })}
                      <td style={{ padding:'6px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:'#34d399', position:'sticky', right:0, background:scBg, borderLeft:'1px solid '+bd }}>{fmtQty(d.total_qty)}</td>
                    </tr>; })}
                  </tbody>
                  <tfoot><tr style={{ background:pn, fontWeight:800 }}>
                    <td style={{ padding:'7px 10px', position:'sticky', left:0, background:pn, color:tx, borderTop:'1px solid '+bd2 }}>{t.total||'합계'}</td>
                    {(drugUsage.periods||[]).map(function(p){ var pt=(drugUsage.periodTotals||{})[p]||0; return <td key={p} style={{ padding:'7px 10px', textAlign:'right', fontFamily:'monospace', color:tx, borderTop:'1px solid '+bd2 }}>{fmtQty(pt)}</td>; })}
                    <td style={{ padding:'7px 12px', textAlign:'right', fontFamily:'monospace', color:'#34d399', position:'sticky', right:0, background:pn, borderTop:'1px solid '+bd2 }}>{fmtQty(drugUsage.grandTotal)}</td>
                  </tr></tfoot>
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
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.collected||'수납액'} (Ar)</div>
              <VBars money color="#34d399" rows={(monthly||[]).map(function(m){ return { label:(m.ym||'').slice(5), value:m.revenue }; })} />
            </div>
          </div>
        </Section>
      </>}
    </div>
  </div>;
}
