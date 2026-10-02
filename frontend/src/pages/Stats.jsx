import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { SIDE_NAV_COL, SIDE_NAV, SIDE_NAV_TITLE, sideNavItem } from '../layout.js';

// Thousands: a no-break space in French (« 39 300 »), a comma in Korean and English -
// the same rule as the pharmacy's fmt(n, lang). CSV exports keep plain numbers.
function fmtAmount(n, lang){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? '\u00a0' : ','); }
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
  function fmtAr(n){ return fmtAmount(n, lang); }
  // Which group of parts is on screen (design session, 2026-10-02): the screen had grown to
  // nine parts one under the other. They are shown a group at a time, chosen in a side menu
  // like the settings screen's. Only what is shown changes: every part still loads as before.
  var gps = useState('summary'), group = gps[0], setGroup = gps[1];
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
  // Clinical rankings (orders, diagnoses): "what was most frequent in this period".
  // Each has its own pair of dates like the drug table (empty = the server's last
  // 30 days) and can be narrowed to a department or a doctor.
  var ops = useState({ departments:[], doctors:[] }), opts = ops[0], setOpts = ops[1];
  var ofs = useState({ from:'', to:'', type:'all', dept:'', doc:'' }), ordF = ofs[0], setOrdF = ofs[1];
  var ods = useState(null), ordData = ods[0], setOrdData = ods[1];
  var dfs = useState({ from:'', to:'', scope:'primary', dept:'', doc:'' }), dxF = dfs[0], setDxF = dfs[1];
  var dds = useState(null), dxData = dds[0], setDxData = dds[1];
  // Who came (patients by age, sex, new or known) and who saw them (departments and
  // doctors): same frame as the rankings - own dates, last 30 days when empty.
  var pfs = useState({ from:'', to:'', dept:'', doc:'' }), ptF = pfs[0], setPtF = pfs[1];
  var pds = useState(null), ptData = pds[0], setPtData = pds[1];
  var wfs = useState({ from:'', to:'' }), wlF = wfs[0], setWlF = wfs[1];
  var wds = useState(null), wlData = wds[0], setWlData = wds[1];

  var bd='var(--border)', bd2='var(--border-2)', scBg='var(--panel-head)', pn='var(--panel)', tx='var(--text)', t2='var(--text-2)', t3='var(--text-3)';

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
  useEffect(function(){ api.get('/stats/options').then(setOpts).catch(function(){}); }, []);
  function rankQuery(f){
    var q = [];
    if(f.from && f.to){ q.push('from='+f.from); q.push('to='+f.to); }
    if(f.dept) q.push('department_id='+f.dept);
    if(f.doc) q.push('doctor_id='+f.doc);
    return q;
  }
  useEffect(function(){
    var q = rankQuery(ordF); if(ordF.type!=='all') q.push('type='+ordF.type);
    api.get('/stats/orders'+(q.length?'?'+q.join('&'):'')).then(setOrdData).catch(function(){ setOrdData({ rows:[], total:{ count:0, amount:0 }, from:ordF.from, to:ordF.to }); });
  }, [ordF.from, ordF.to, ordF.type, ordF.dept, ordF.doc]);
  useEffect(function(){
    var q = rankQuery(dxF); q.push('scope='+dxF.scope);
    api.get('/stats/diagnoses?'+q.join('&')).then(setDxData).catch(function(){ setDxData({ rows:[], total:{ cases:0, patients:0 }, from:dxF.from, to:dxF.to }); });
  }, [dxF.from, dxF.to, dxF.scope, dxF.dept, dxF.doc]);
  useEffect(function(){
    var q = rankQuery(ptF);
    api.get('/stats/patients'+(q.length?'?'+q.join('&'):'')).then(setPtData).catch(function(){ setPtData({ bands:[], total:{ patients:0 }, from:ptF.from, to:ptF.to }); });
  }, [ptF.from, ptF.to, ptF.dept, ptF.doc]);
  useEffect(function(){
    var q = rankQuery(wlF);
    api.get('/stats/workload'+(q.length?'?'+q.join('&'):'')).then(setWlData).catch(function(){ setWlData({ departments:[], doctors:[], total:{ visits:0, patients:0, orders:0 }, from:wlF.from, to:wlF.to }); });
  }, [wlF.from, wlF.to]);
  // Editing one date keeps the other as shown; a start after the end is ignored
  // (same rule as the drug and cash tables).
  function rankDates(f, setF, data, which, v){
    var from = which==='from' ? v : (f.from||(data&&data.from)||''), to = which==='to' ? v : (f.to||(data&&data.to)||'');
    if(v && from && to && from<=to) setF(Object.assign({}, f, { from:from, to:to }));
  }
  function patch(f, setF, k){ return function(e){ var n = Object.assign({}, f); n[k] = e.target.value; setF(n); }; }
  function downloadCsv(name, lines){
    var blob = new Blob(["\ufeff"+lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function csvText(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }
  function exportOrdersCsv(){
    if(!ordData) return;
    var lines = [['code','order','type','typed','lines','quantity','value'].join(',')];
    (ordData.rows||[]).forEach(function(r){ lines.push([csvText(r.code), csvText(orderName(r)), csvText(r.code_type||''), r.typed?1:0, r.count, r.qty, r.amount].join(',')); });
    lines.push(['"TOTAL"','','','',ordData.total.count,'',ordData.total.amount].join(','));
    downloadCsv('orders-'+(ordData.from||'')+'_'+(ordData.to||'')+'.csv', lines);
  }
  function exportDxCsv(){
    if(!dxData) return;
    var lines = [['code','diagnosis','typed','consultations','patients','male','female','age_0_4','age_5_14','age_15_49','age_50_plus','age_unknown'].join(',')];
    (dxData.rows||[]).forEach(function(r){ lines.push([csvText(r.code), csvText(dxName(r)), r.typed?1:0, r.cases, r.patients, r.male, r.female, r.age_0_4, r.age_5_14, r.age_15_49, r.age_50, r.age_unknown].join(',')); });
    lines.push(['"TOTAL"','','',dxData.total.cases,dxData.total.patients,'','','','','','',''].join(','));
    downloadCsv('diagnoses-'+(dxData.from||'')+'_'+(dxData.to||'')+'.csv', lines);
  }
  var BAND_LABEL = { '0_4':'<5', '5_14':'5–14', '15_49':'15–49', '50':'50+' };
  function bandLabel(b){ return BAND_LABEL[b] || (t.st_ageUnknown||'나이 모름'); }
  function exportPatientsCsv(){
    if(!ptData) return;
    var cols = ['patients','male','female','sex_unknown','new_patients','returning_patients','visits'];
    var lines = [['age_band','patients','male','female','sex_unknown','new','returning','visits'].join(',')];
    // Band codes as in the diagnosis file's headers (age_0_4 ...): "5-14" as text would be read by Excel as a date.
    (ptData.bands||[]).forEach(function(r){ lines.push([csvText(r.band==='unknown'?'age_unknown':'age_'+r.band+(r.band==='50'?'_plus':''))].concat(cols.map(function(k){ return r[k]; })).join(',')); });
    lines.push(['"TOTAL"'].concat(cols.map(function(k){ return ptData.total[k]; })).join(','));
    downloadCsv('patients-'+(ptData.from||'')+'_'+(ptData.to||'')+'.csv', lines);
  }
  function exportWorkloadCsv(){
    if(!wlData) return;
    var lines = [['group','code','name','visits','patients','orders'].join(',')];
    (wlData.departments||[]).forEach(function(r){ lines.push(['"department"', csvText(r.code||''), csvText(r.code==null?(t.st_unassigned||'미지정'):(lang==='fr'?(r.name_fr||r.name_en||r.name):lang==='en'?(r.name_en||r.name):r.name)), r.visits, r.patients, r.orders].join(',')); });
    (wlData.doctors||[]).forEach(function(r){ lines.push(['"doctor"', '""', csvText(doctorLabel(r)), r.visits, r.patients, r.orders].join(',')); });
    lines.push(['"TOTAL"','','',wlData.total.visits,wlData.total.patients,wlData.total.orders].join(','));
    downloadCsv('workload-'+(wlData.from||'')+'_'+(wlData.to||'')+'.csv', lines);
  }
  // The list row's name in the screen's language; a typed line has only what was written.
  function orderName(r){ return lang==='ko' ? (r.name||r.name_en) : (r.name_en||r.name); }
  function dxName(r){ return r.typed ? r.name : (lang==='ko' ? (r.name_ko||r.name) : lang==='fr' ? (r.name_fr||r.name) : r.name); }
  var ORD_TYPE_KO = { all:'전체', lab:'검사', imaging:'영상', procedure:'처치', fee:'수가' };
  function ordTypeLabel(k){ return t['st_ordType_'+k] || ORD_TYPE_KO[k] || k; }
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

  var IS = { background:'var(--field-5)', border:'1px solid var(--field-border)', borderRadius:6, padding:'6px 10px', color:tx, fontSize:14 };
  function pbtn(p,label){ var on=period===p; return <button onClick={function(){pick(p)}} style={{ background:on?'var(--accent-a18)':'transparent', color:on?'var(--accent-text)':t3, border:'1px solid '+(on?'var(--accent-a40)':'transparent'), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{label}</button>; }

  function Card(props){ return <div onClick={props.onClick} className={props.onClick?'pressable':undefined} style={{ background:scBg, border:'1px solid '+(props.active?'var(--accent-a80)':bd), borderRadius:10, padding:'14px 16px', flex:1, minWidth:140, cursor:props.onClick?'pointer':'default' }}>
    <div style={{ fontSize:13, color:t3, fontWeight:700 }}>{props.label}{props.onClick?<span style={{marginLeft:5,color:t3,fontSize:11}}>{props.active?'▲':'▼'}</span>:null}</div>
    <div style={{ fontSize:props.small?20:26, fontWeight:900, color:props.color||tx, fontFamily:'monospace', marginTop:4 }}>{props.value}{props.unit?<span style={{fontSize:13,color:t3,fontWeight:600}}>{'\u00a0'+props.unit}</span>:null}</div>
    {props.sub?<div style={{ fontSize:12, color:t3, marginTop:3 }}>{props.sub}</div>:null}
  </div>; }

  function Bars(props){ // rows: [{label, value, color}]
    var rows=props.rows||[]; var max=Math.max.apply(null, rows.map(function(r){return r.value||0}).concat([1]));
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {rows.length===0?<div style={{color:t3,fontSize:13,padding:'8px 0'}}>{t.noData||'데이터 없음'}</div>:null}
      {rows.map(function(r,i){ return <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div title={r.label} style={{ width:160, fontSize:13, color:t2, textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.label}</div>
        <div style={{ flex:1, background:pn, borderRadius:5, height:22, position:'relative', overflow:'hidden' }}>
          <div data-motion="bar" style={{ width:((r.value||0)/max*100)+'%', background:(r.color||'var(--accent)'), height:'100%', borderRadius:5, minWidth:r.value?3:0, transition:'width 250ms var(--ease-out)' }}></div>
        </div>
        <div style={{ width:90, fontSize:13, color:tx, fontFamily:'monospace', textAlign:'right' }}>{props.money?fmtAr(r.value)+' Ar':r.value}</div>
      </div>; })}
    </div>; }

  // The groups of the side menu, in the order of the parts on the old long page.
  var GROUPS = [
    ['summary',  '🏥 '+(t.ds_stSummary||'요약')],
    ['money',    '💰 '+(t.ds_stMoney||'매출 · 현금')],
    ['patients', '👥 '+(t.ds_stPatients||'환자 · 진료량')],
    ['dx',       '🩺 '+(t.st_diagnoses||'진단 통계')],
    ['orders',   '🧪 '+(t.ds_stOrders||'오더')],
    ['drugs',    '💊 '+(t.ds_stDrugs||'약품')],
  ];
  function Section(props){ if (props.group && props.group !== group) return null; return <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:15, fontWeight:900, color:tx, margin:'0 0 10px 2px' }}>{props.title}</div>
    {props.children}
  </div>; }

  function VBars(props){ // rows:[{label,value}] vertical bars, money optional
    var rows=props.rows||[]; var max=Math.max.apply(null, rows.map(function(r){return r.value||0}).concat([1]));
    return <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:140, padding:'4px 2px' }}>
      {rows.length===0?<div style={{color:t3,fontSize:13}}>{t.noData||'데이터 없음'}</div>:null}
      {rows.map(function(r,i){ var h=Math.round((r.value||0)/max*108); return <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:30 }}>
        <div style={{ fontSize:11, color:t2, fontFamily:'monospace', whiteSpace:'nowrap' }}>{props.money?fmtAr(r.value):r.value}</div>
        <div title={r.label} data-motion="bar" style={{ width:'72%', height:Math.max(h,2), background:props.color||'var(--accent)', borderRadius:'4px 4px 0 0', transition:'height 250ms var(--ease-out)' }}></div>
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

  return <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg-2)' }}>
    <TopBar />
    <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:SIDE_NAV_COL+'px minmax(0,1fr)' }}>
    <nav aria-label={t.stats} style={SIDE_NAV}>
      <div style={SIDE_NAV_TITLE}>📊 {t.stats}</div>
      {GROUPS.map(function(g){ var on = group===g[0];
        return <button key={g[0]} type="button" className="pressable" aria-current={on?'page':undefined} onClick={function(){ setGroup(g[0]); }} style={sideNavItem(on)}>{g[1]}</button>; })}
    </nav>
    <div style={{ overflow:'auto', padding:'16px 20px' }}>
      {/* 기간 선택 — only where it applies: the summary and the revenue cards. The other
          parts have a period of their own, and this row above them looked as if it ruled them. */}
      <div style={{ display:(group==='summary'||group==='money')?'flex':'none', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:18 }}>
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
        <Section group="summary" title={'🏥 '+(t.operations||'운영 현황')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            <Card label={t.totalVisits||'총 내원'} value={v.total||0} unit={cases} color="var(--accent-text)" sub={(t.uniquePatients||'고유 환자')+' '+(v.unique_patients||0)} />
            <Card label={t.newVisit||'초진'} value={v.new_visits||0} unit={cases} small />
            <Card label={t.followUp||'재진'} value={v.follow_ups||0} unit={cases} small />
            {/* Visits that are neither: "no fee" (chosen at reception or payment) and
                the emergency/referral values older records still carry. Without it
                the total did not add up to the cards beside it. */}
            <Card label={t.st_otherVisits||'진료비 없음·기타'} value={v.other_visits||0} unit={cases} small />
            <Card label={t.completed||'완료'} value={v.completed||0} unit={cases} color="var(--ok-ink)" small />
            <Card label={t.active||'진행 중'} value={v.active||0} unit={cases} color="var(--warn-ink)" small />
            <Card label={t.st_cancelled||'취소'} value={v.cancelled||0} unit={cases} color="var(--danger-text)" small />
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDept||'진료과별'}</div>
              <Bars rows={(data.byDept||[]).map(function(d){ return { label:deptLabel(d), value:d.cnt }; })} />
            </div>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.byDoctor||'의사별'}</div>
              <Bars rows={(data.byDoctor||[]).map(function(d){ return { label:doctorLabel(d), value:d.cnt, color:'var(--violet)' }; })} />
            </div>
          </div>
        </Section>

        {/* 매출 · 정산 */}
        <Section group="money" title={'💰 '+(t.revenueSettlement||'매출 · 정산')}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
            {/* The day's cash (design A, 2026-09-29): what came into the till minus what
                was handed back, from cash_movement. Replaces the receipt-based figure
                that moved to the correction day when a receipt was corrected. */}
            <Card label={t.st_cash||'그날 현금'} value={(cash.net<0?'−':'')+fmtAr(Math.abs(cash.net||0))} unit="Ar" color={cash.net<0?'var(--danger-text)':'var(--ok-ink)'}
              sub={<><div>{(t.st_cashIn||'들어옴')+' +'+fmtAr(cash.in)+' Ar'}</div><div>{(t.st_cashOut||'나감')+' −'+fmtAr(cash.out)+' Ar'}</div></>} />
            {/* Treatment receipts only; balance settlements (payment M2) are money
                received, not treatments, so they are shown apart (decision 14).
                Billed sits here with the other receipt figures. */}
            <Card label={t.st_billCount||'진료 영수'} value={rev.billCount||0} unit={cases} small
              sub={<><div>{(t.billed||'청구액')+' '+fmtAr(rev.gross)+' Ar'}</div>{rev.settlementCount?<div>{(t.st_settlementsSub||'+ 미수 수납 {n}건').replace('{n}', rev.settlementCount)}</div>:null}</>} />
            <Card label={t.st_avgPerVisit||'방문당 평균 청구액'} value={fmtAr(rev.avgBilledPerVisit)} unit="Ar" small />
            <Card label={t.unpaidBalance||'미수'} value={fmtAr(out.owed)} unit="Ar" color="var(--danger-text)" small onClick={function(){toggleList('owed')}} active={showList==='owed'} />
            <Card label={t.refundDue||'환불 예정'} value={fmtAr(out.refund)} unit="Ar" color="var(--violet-text-2)" small onClick={function(){toggleList('refund')}} active={showList==='refund'} />
            {/* Staff cancellations only; receipts replaced by a correction are not
                counted (item 20). The cash handed back is in the till figures now. */}
            <Card label={t.voidedReceipts||'취소 영수'} value={data.voidedCount||0} unit={cases} color="var(--warn-ink)" small />
          </div>
          {/* 과별·의사별 매출. 진료 섹션의 방문수 그래프와 같은 모양으로 두어, "몇 명 봤는지"와
              "얼마가 들어왔는지"를 같은 눈높이에서 읽을 수 있게 한다. 과는 접수에서 고른 과,
              의사는 담당의 기준이라 두 표의 합계는 같아도 줄 나눔은 다를 수 있다. */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:14 }}>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              {/* By receipt: whose treatment the money was for, not the day's till — so
                  its total can differ from the cash card on days with corrections. */}
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.revByDept||'진료과별 매출'} <span style={{ fontWeight:600, color:t3 }}>— {t.st_byReceipt||'영수 기준'} · {fmtAr(rev.paid)} Ar</span></div>
              <Bars money rows={(data.revenueByDept||[]).map(function(d){ return { label:deptLabel(d), value:d.paid, color:'var(--ok)' }; })} />
            </div>
            <div style={{ flex:1, minWidth:280, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.revByDoctor||'의사별 매출'} <span style={{ fontWeight:600, color:t3 }}>— {t.st_byReceipt||'영수 기준'} · {fmtAr(rev.paid)} Ar</span></div>
              <Bars money rows={(data.revenueByDoctor||[]).map(function(d){ return { label:doctorLabel(d), value:d.paid, color:'var(--ok-3)' }; })} />
            </div>
          </div>
          {showList?<div style={{ background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:900, color:showList==='owed'?'var(--danger-text)':'var(--violet-text-2)', marginBottom:10 }}>
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
                  {((outData&&outData[showList])||[]).map(function(r,i){ return <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'7px 8px', color:'var(--accent-text-2)', fontFamily:'monospace' }}>{r.chart_no}</td>
                    <td style={{ padding:'7px 8px', color:tx, fontWeight:700 }}>{r.name}</td>
                    <td style={{ padding:'7px 8px', color:t2, fontFamily:'monospace' }}>{r.contact||'—'}</td>
                    <td style={{ padding:'7px 8px', color:showList==='owed'?'var(--danger-text)':'var(--violet-text-2)', fontFamily:'monospace', fontWeight:800, textAlign:'right' }}>{fmtAr(r.amount)} Ar</td>
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
              { label:t.consultFee||'진료비', value:rev.consult, color:'var(--accent-text)' },
              { label:t.drugs||'약', value:rev.drug, color:'var(--ok-text)' },
              { label:t.procedures||'검사/처치', value:rev.procedure, color:'var(--warn-text)' },
              { label:t.issuance||'서류', value:rev.issuance, color:'var(--violet-text-2)' },
            ]} />
          </div>
        </Section>

        {/* 기간별 현금 (그날 현금 by day / month / year) */}
        <Section group="money" title={'💵 '+(t.st_cashTable||'기간별 현금')}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {[['day',t.daily||'일별'],['month',t.monthly2||'월별'],['year',t.yearly||'연별']].map(function(o){ var on=cashGran===o[0];
              return <button key={o[0]} onClick={function(){pickCashGran(o[0])}} style={{ background:on?'var(--ok-a18)':'transparent', color:on?'var(--ok-ink)':t3, border:'1px solid '+(on?'var(--ok-a40)':bd2), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            <input type="date" value={cashRange.from||(cashData&&cashData.from)||''} max={cashRange.to||(cashData&&cashData.to)||undefined} onChange={function(e){setCashFrom(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <span style={{ color:t3 }}>~</span>
            <input type="date" value={cashRange.to||(cashData&&cashData.to)||''} min={cashRange.from||(cashData&&cashData.from)||undefined} onChange={function(e){setCashTo(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <div style={{ flex:1 }}></div>
            <button onClick={exportCashCsv} disabled={!cashData||!(cashData.periods||[]).length} style={{ background:'var(--chip)', color:'var(--ok-text)', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>⬇ CSV</button>
          </div>
          {!cashData?<div style={{ color:t3, fontSize:13, padding:'12px 2px' }}>{t.loading||'불러오는 중...'}</div>:(function(){
            // The "before the cash log" column only where such rows exist (receipts
            // written before migration 036).
            var kinds = CASH_KINDS.filter(function(k){ return k!=='opening' || (cashData.total&&cashData.total.byKind.opening); });
            var th = { padding:'7px 10px', textAlign:'right', position:'sticky', top:0, background:scBg, borderBottom:'1px solid '+bd, whiteSpace:'nowrap' };
            var td = { padding:'6px 10px', textAlign:'right', fontFamily:'monospace', whiteSpace:'nowrap' };
            function cells(r, bold){ return [
              <td key="in" style={Object.assign({}, td, { color:r.in?'var(--ok-text)':'var(--text-faint)', fontWeight:bold?800:400 })}>{r.in?'+'+fmtAr(r.in):'·'}</td>,
              <td key="out" style={Object.assign({}, td, { color:r.out?'var(--danger-text)':'var(--text-faint)', fontWeight:bold?800:400 })}>{r.out?'−'+fmtAr(r.out):'·'}</td>,
              <td key="net" style={Object.assign({}, td, { color:r.net<0?'var(--danger-text)':tx, fontWeight:800 })}>{r.net?signedAr(r.net):'0'}</td>
            ].concat(kinds.map(function(k){ var v=r.byKind[k]; return <td key={k} style={Object.assign({}, td, { color:v?t2:'var(--text-faint)', fontWeight:bold?800:400 })}>{v?signedAr(v):'·'}</td>; })); }
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
                    {(cashData.periods||[]).map(function(r){ return <tr key={r.period} style={{ borderBottom:'1px solid var(--line-soft-3)' }}>
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

        {/* 환자 통계 · 과·의사별 · 진단 통계 · 오더 통계 — 약품 사용통계와 같은 틀(기간 · 거르기 · 표 · CSV), 많은 것이 위 */}
        {(function(){
          var th = { padding:'7px 10px', textAlign:'right', position:'sticky', top:0, background:scBg, borderBottom:'1px solid '+bd, whiteSpace:'nowrap' };
          var thL = Object.assign({}, th, { textAlign:'left' });
          var td = { padding:'6px 10px', textAlign:'right', fontFamily:'monospace', color:t2, whiteSpace:'nowrap' };
          var dateStyle = Object.assign({}, IS, { fontSize:13, padding:'5px 8px' });
          var selStyle = Object.assign({}, IS, { fontSize:13, padding:'5px 8px', maxWidth:220 });
          var csvBtn = { background:'var(--chip)', color:'var(--ok-text)', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 };
          var typedTag = <span style={{ marginLeft:6, fontSize:11, color:t3, border:'1px solid '+bd2, borderRadius:3, padding:'0 4px', flexShrink:0 }}>{t.st_typed||'직접 입력'}</span>;
          function num(v){ return v ? fmtAr(v) : '·'; }
          function dates(f, setF, data){ return <>
            <input type="date" value={f.from||(data&&data.from)||''} max={f.to||(data&&data.to)||undefined} onChange={function(e){rankDates(f, setF, data, 'from', e.target.value)}} style={dateStyle} />
            <span style={{ color:t3 }}>~</span>
            <input type="date" value={f.to||(data&&data.to)||''} min={f.from||(data&&data.from)||undefined} onChange={function(e){rankDates(f, setF, data, 'to', e.target.value)}} style={dateStyle} />
          </>; }
          function filters(f, setF, data){ return <>
            {dates(f, setF, data)}
            <select value={f.dept} onChange={patch(f, setF, 'dept')} style={selStyle}>
              <option value="">{t.st_allDepts||'전체 진료과'}</option>
              {(opts.departments||[]).map(function(d){ return <option key={d.id} value={d.id}>{deptLabel(d)}</option>; })}
            </select>
            <select value={f.doc} onChange={patch(f, setF, 'doc')} style={selStyle}>
              <option value="">{t.st_allDoctors||'전체 의사'}</option>
              {(opts.doctors||[]).map(function(d){ return <option key={d.id} value={d.id}>{d.name}</option>; })}
            </select>
          </>; }
          var bar = { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 };
          var box = { background:scBg, border:'1px solid '+bd, borderRadius:10, overflow:'hidden' };
          var head = { fontSize:12, color:t3, padding:'8px 12px', borderBottom:'1px solid '+bd };
          // A long name is cut with an ellipsis (the whole of it is in the tooltip); the code and
          // the "typed" tag after it are never the part that is cut.
          var nameCell = { padding:'6px 10px', maxWidth:420 };
          var nameRow = { display:'flex', alignItems:'center', minWidth:0 };
          var nameText = { color:tx, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 };
          var empty = { color:t3, fontSize:13, padding:'12px 2px' };
          var dxRows = (dxData&&dxData.rows)||[], ordRows = (ordData&&ordData.rows)||[];
          var anyAgeUnknown = dxRows.some(function(r){ return r.age_unknown; });
          var ptTotal = (ptData&&ptData.total)||{}, ptBands = ((ptData&&ptData.bands)||[]).filter(function(r){ return r.band!=='unknown' || r.patients; });
          var anySexUnknown = !!ptTotal.sex_unknown;
          var wlTotal = (wlData&&wlData.total)||{};
          var totalCell = Object.assign({}, td, { color:tx, fontWeight:800, borderTop:'1px solid '+bd2 });
          function ptCells(r, cell){ return <>
            <td style={Object.assign({}, cell, cell===td?{ color:'var(--ok-text)', fontWeight:800 }:null)}>{num(r.patients)}</td>
            <td style={cell}>{num(r.male)}</td><td style={cell}>{num(r.female)}</td>
            {anySexUnknown?<td style={cell}>{num(r.sex_unknown)}</td>:null}
            <td style={cell}>{num(r.new_patients)}</td><td style={cell}>{num(r.returning_patients)}</td>
            <td style={cell}>{num(r.visits)}</td>
          </>; }
          function wlTable(title, rows, label){ return <div style={Object.assign({ flex:1, minWidth:340 }, box)}>
            <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
              <thead><tr style={{ color:t3 }}>
                <th style={Object.assign({}, thL, { color:t2 })}>{title}</th>
                <th style={Object.assign({}, th, { color:tx })}>{t.st_visits||'내원 수'}</th><th style={th}>{t.st_dxPatients||'환자 수'}</th><th style={th}>{t.st_wlOrders||'오더 건수'}</th>
              </tr></thead>
              <tbody>
                {rows.map(function(r,i){ return <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                  <td title={label(r)} style={nameCell}><div style={nameRow}><span style={nameText}>{label(r)}</span></div></td>
                  <td style={Object.assign({}, td, { color:'var(--ok-text)', fontWeight:800 })}>{fmtAr(r.visits)}</td><td style={td}>{fmtAr(r.patients)}</td><td style={td}>{num(r.orders)}</td>
                </tr>; })}
              </tbody>
            </table>
          </div>; }
          return <>
            <Section group="patients" title={'👥 '+(t.st_patients||'환자 통계')}>
              <div style={bar}>
                {filters(ptF, setPtF, ptData)}
                <div style={{ flex:1 }}></div>
                <button onClick={exportPatientsCsv} disabled={!ptTotal.patients} style={csvBtn}>⬇ CSV</button>
              </div>
              {!ptData?<div style={empty}>{t.loading||'불러오는 중...'}</div>:(!ptTotal.patients?<div style={empty}>{t.noData||'데이터 없음'}</div>:
              <div style={box}>
                <div style={head}>
                  {ptData.from} ~ {ptData.to} · {t.st_dxPatients||'환자 수'} {fmtAr(ptTotal.patients)} · {t.st_ptNew||'처음 온 환자'} {fmtAr(ptTotal.new_patients)} · {t.st_ptReturning||'다시 온 환자'} {fmtAr(ptTotal.returning_patients)} · {t.st_visits||'내원 수'} {fmtAr(ptTotal.visits)}
                  <div style={{ marginTop:3 }}>{t.st_ptBasis||'내원일 기준 · 취소된 접수 제외 · 한 사람은 한 번만, 나이는 기간 중 첫 내원일 기준 · 「처음 온 환자」는 이 기간 전에 병원에 온 기록이 없는 사람(접수의 초진/재진과 다름)'}</div>
                </div>
                <div style={{ overflow:'auto' }}>
                  <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
                    <thead><tr style={{ color:t3 }}>
                      <th style={thL}>{t.st_ageBand||'나이대'}</th>
                      <th style={Object.assign({}, th, { color:tx })}>{t.st_dxPatients||'환자 수'}</th>
                      <th style={th}>{t.st_male||'남'}</th><th style={th}>{t.st_female||'여'}</th>
                      {anySexUnknown?<th style={th}>{t.st_sexUnknown||'성별 모름'}</th>:null}
                      <th style={th}>{t.st_ptNew||'처음 온 환자'}</th><th style={th}>{t.st_ptReturning||'다시 온 환자'}</th>
                      <th style={th}>{t.st_visits||'내원 수'}</th>
                    </tr></thead>
                    <tbody>
                      {ptBands.map(function(r){ return <tr key={r.band} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                        <td style={{ padding:'6px 10px', color:tx, fontWeight:700, whiteSpace:'nowrap' }}>{bandLabel(r.band)}</td>{ptCells(r, td)}
                      </tr>; })}
                    </tbody>
                    {/* Each patient sits in one band, so here the columns do add up. */}
                    <tfoot><tr style={{ background:pn }}>
                      <td style={{ padding:'7px 10px', color:tx, fontWeight:800, borderTop:'1px solid '+bd2 }}>{t.total||'합계'}</td>{ptCells(ptTotal, totalCell)}
                    </tr></tfoot>
                  </table>
                </div>
              </div>)}
            </Section>

            <Section group="patients" title={'📋 '+(t.st_workload||'과 · 의사별 진료량')}>
              <div style={bar}>
                {dates(wlF, setWlF, wlData)}
                <div style={{ flex:1 }}></div>
                <button onClick={exportWorkloadCsv} disabled={!wlTotal.visits} style={csvBtn}>⬇ CSV</button>
              </div>
              {!wlData?<div style={empty}>{t.loading||'불러오는 중...'}</div>:(!wlTotal.visits?<div style={empty}>{t.noData||'데이터 없음'}</div>:
              <div>
                <div style={{ fontSize:12, color:t3, padding:'0 2px 10px' }}>
                  {wlData.from} ~ {wlData.to} · {t.st_visits||'내원 수'} {fmtAr(wlTotal.visits)} · {t.st_dxPatients||'환자 수'} {fmtAr(wlTotal.patients)} · {t.st_wlOrders||'오더 건수'} {fmtAr(wlTotal.orders)}
                  <div style={{ marginTop:3 }}>{t.st_wlBasis||'내원일 기준 · 취소된 접수 제외 · 오더 건수는 취소하지 않은 검사 · 영상 · 처치 오더(약 제외) · 환자 수는 줄끼리 더할 수 없음(한 사람이 두 과에 올 수 있음)'}</div>
                </div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-start' }}>
                  {wlTable(t.byDept||'진료과별', wlData.departments||[], deptLabel)}
                  {wlTable(t.byDoctor||'의사별', wlData.doctors||[], doctorLabel)}
                </div>
              </div>)}
            </Section>

            <Section group="dx" title={'🩺 '+(t.st_diagnoses||'진단 통계')}>
              <div style={bar}>
                <select value={dxF.scope} onChange={patch(dxF, setDxF, 'scope')} style={selStyle}>
                  <option value="primary">{t.st_dxPrimary||'주진단만'}</option>
                  <option value="all">{t.st_dxAll||'전체 진단'}</option>
                </select>
                {filters(dxF, setDxF, dxData)}
                <div style={{ flex:1 }}></div>
                <button onClick={exportDxCsv} disabled={!dxRows.length} style={csvBtn}>⬇ CSV</button>
              </div>
              {!dxData?<div style={empty}>{t.loading||'불러오는 중...'}</div>:(!dxRows.length?<div style={empty}>{t.noData||'데이터 없음'}</div>:
              <div style={box}>
                <div style={head}>
                  {dxData.from} ~ {dxData.to} · {dxRows.length} {t.st_dxUnit||'진단'} · {t.st_dxCases||'진료 수'} {fmtAr(dxData.total.cases)} · {t.st_dxPatients||'환자 수'} {fmtAr(dxData.total.patients)}
                  <div style={{ marginTop:3 }}>{t.st_dxBasis||'진료한 날(내원일) 기준 · 진료 수는 그 진단이 붙은 진료의 수, 환자 수는 같은 사람을 한 번만 · 남/여와 나이대는 환자 수(나이는 내원일 기준)'}</div>
                </div>
                <div style={{ overflow:'auto', maxHeight:'56vh' }}>
                  <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
                    <thead><tr style={{ color:t3 }}>
                      <th style={thL}>{t.st_dxName||'진단'}</th><th style={thL}>{t.st_dxCode||'코드'}</th>
                      <th style={Object.assign({}, th, { color:tx })}>{t.st_dxCases||'진료 수'}</th><th style={th}>{t.st_dxPatients||'환자 수'}</th>
                      <th style={th}>{t.st_male||'남'}</th><th style={th}>{t.st_female||'여'}</th>
                      <th style={th}>&lt;5</th><th style={th}>5–14</th><th style={th}>15–49</th><th style={th}>50+</th>
                      {anyAgeUnknown?<th style={th}>{t.st_ageUnknown||'나이 모름'}</th>:null}
                    </tr></thead>
                    <tbody>
                      {dxRows.map(function(r,i){ return <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                        <td title={dxName(r)} style={nameCell}><div style={nameRow}><span style={nameText}>{dxName(r)}</span>{r.typed?typedTag:null}</div></td>
                        <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:12, color:t3, whiteSpace:'nowrap' }}>{r.code||'—'}</td>
                        <td style={Object.assign({}, td, { color:'var(--ok-text)', fontWeight:800 })}>{fmtAr(r.cases)}</td><td style={td}>{fmtAr(r.patients)}</td>
                        <td style={td}>{num(r.male)}</td><td style={td}>{num(r.female)}</td>
                        <td style={td}>{num(r.age_0_4)}</td><td style={td}>{num(r.age_5_14)}</td><td style={td}>{num(r.age_15_49)}</td><td style={td}>{num(r.age_50)}</td>
                        {anyAgeUnknown?<td style={td}>{num(r.age_unknown)}</td>:null}
                      </tr>; })}
                    </tbody>
                  </table>
                </div>
              </div>)}
            </Section>

            <Section group="orders" title={'🧪 '+(t.st_orders||'오더 통계')}>
              <div style={bar}>
                {/* Kinds in one select, not a row of buttons (the coordinator's brief). */}
                <select value={ordF.type} onChange={patch(ordF, setOrdF, 'type')} style={selStyle}>
                  {['all','lab','imaging','procedure'].map(function(k){ return <option key={k} value={k}>{ordTypeLabel(k)}</option>; })}
                </select>
                {filters(ordF, setOrdF, ordData)}
                <div style={{ flex:1 }}></div>
                <button onClick={exportOrdersCsv} disabled={!ordRows.length} style={csvBtn}>⬇ CSV</button>
              </div>
              {!ordData?<div style={empty}>{t.loading||'불러오는 중...'}</div>:(!ordRows.length?<div style={empty}>{t.noData||'데이터 없음'}</div>:
              <div style={box}>
                <div style={head}>
                  {ordData.from} ~ {ordData.to} · {ordRows.length} {t.st_ordUnit||'가지'} · {t.st_ordCount||'건수'} {fmtAr(ordData.total.count)} · {t.st_ordValue||'오더 금액'} {fmtAr(ordData.total.amount)} Ar
                  <div style={{ marginTop:3 }}>{t.st_ordBasis||'오더를 낸 날(내원일) 기준 · 취소된 오더 제외 · 금액은 오더에 적힌 값(수량 × 단가)이며 받은 돈이 아님 — 수납 숫자와 다를 수 있음'}</div>
                </div>
                <div style={{ overflow:'auto', maxHeight:'56vh' }}>
                  <table style={{ borderCollapse:'collapse', fontSize:13, width:'100%' }}>
                    <thead><tr style={{ color:t3 }}>
                      <th style={thL}>{t.st_ordName||'오더'}</th><th style={thL}>{t.st_ordKind||'종류'}</th>
                      <th style={Object.assign({}, th, { color:tx })}>{t.st_ordCount||'건수'}</th><th style={th}>{t.st_ordQty||'수량'}</th><th style={th}>{t.st_ordValue||'오더 금액'}</th>
                    </tr></thead>
                    <tbody>
                      {ordRows.map(function(r,i){ return <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                        <td title={orderName(r)} style={nameCell}><div style={nameRow}><span style={nameText}>{orderName(r)}</span>
                          {r.code?<span style={{ color:t3, fontFamily:'monospace', fontSize:11, marginLeft:6, flexShrink:0 }}>{r.code}</span>:null}{r.typed?typedTag:null}</div></td>
                        <td style={{ padding:'6px 10px', color:t3, whiteSpace:'nowrap' }}>{r.code_type?ordTypeLabel(r.code_type):'—'}</td>
                        <td style={Object.assign({}, td, { color:'var(--ok-text)', fontWeight:800 })}>{fmtAr(r.count)}</td>
                        <td style={td}>{fmtQty(r.qty)}</td>
                        <td style={td}>{fmtAr(r.amount)} Ar</td>
                      </tr>; })}
                    </tbody>
                  </table>
                </div>
              </div>)}
            </Section>
          </>;
        })()}

        {/* 약품 사용통계 */}
        <Section group="drugs" title={'💊 '+(t.drugUsage||'약품 사용통계')}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {[['day',t.daily||'일별'],['month',t.monthly2||'월별'],['year',t.yearly||'연별']].map(function(o){ var on=drugGran===o[0];
              return <button key={o[0]} onClick={function(){pickDrugGran(o[0])}} style={{ background:on?'var(--ok-text-a18)':'transparent', color:on?'var(--ok-text)':t3, border:'1px solid '+(on?'var(--ok-text-a40)':bd2), borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:14, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allRx||'전체'],['internal',t.internalRx||'원내'],['external',t.externalRx||'원외']].map(function(o){ var on=drugType===o[0];
              return <button key={o[0]} onClick={function(){setDrugType(o[0])}} style={{ background:on?'var(--accent-a18)':'transparent', color:on?'var(--accent-text)':t3, border:'1px solid '+(on?'var(--accent-a40)':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            {[['all',t.allOrders||'처방전체'],['dispensed',t.dispensedOnly||'조제완료']].map(function(o){ var on=drugStat===o[0];
              return <button key={o[0]} onClick={function(){setDrugStat(o[0])}} style={{ background:on?'var(--violet-text-a18)':'transparent', color:on?'var(--violet-text)':t3, border:'1px solid '+(on?'var(--violet-text-a40)':bd2), borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>{o[1]}</button>; })}
            <span style={{ width:1, height:20, background:bd, margin:'0 4px' }}></span>
            <input type="date" value={drugRange.from||(drugUsage&&drugUsage.from)||''} max={drugRange.to||(drugUsage&&drugUsage.to)||undefined} onChange={function(e){setDrugFrom(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <span style={{ color:t3 }}>~</span>
            <input type="date" value={drugRange.to||(drugUsage&&drugUsage.to)||''} min={drugRange.from||(drugUsage&&drugUsage.from)||undefined} onChange={function(e){setDrugTo(e.target.value)}} style={Object.assign({}, IS, { fontSize:13, padding:'5px 8px' })} />
            <div style={{ flex:1 }}></div>
            <button onClick={exportDrugCsv} disabled={!drugUsage||!(drugUsage.drugs||[]).length} style={{ background:'var(--chip)', color:'var(--ok-text)', border:'1px solid '+bd2, borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:13, fontWeight:700 }}>⬇ CSV</button>
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
                    {(drugUsage.drugs||[]).map(function(d,i){ return <tr key={i} style={{ borderBottom:'1px solid var(--line-soft-3)' }}>
                      <td style={{ padding:'6px 10px', position:'sticky', left:0, background:scBg, borderRight:'1px solid '+bd }}>
                        <span style={{ color:tx, fontWeight:700 }}>{d.drug_name}</span>
                        {/* Pack-unit line: the quantity is bottles/tubes, not doses. The unit
                            words are the pharmacy's (ph_pack_*), as on the drug list. */}
                        {d.pack_label?<span style={{ marginLeft:6, fontSize:11, color:'var(--warn-text)', border:'1px solid var(--warn-a60)', borderRadius:3, padding:'0 4px' }}>{packWord(d.pack_label)}</span>:null}
                        <span style={{ color:t3, fontFamily:'monospace', fontSize:11, marginLeft:6 }}>{d.drug_code!=='-'?d.drug_code:''}</span>
                      </td>
                      {(drugUsage.periods||[]).map(function(p){ var val=d.by_period[p]; return <td key={p} style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace', color:val?t2:'var(--text-faint)' }}>{val?fmtQty(val):'·'}</td>; })}
                      <td style={{ padding:'6px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:'var(--ok-text)', position:'sticky', right:0, background:scBg, borderLeft:'1px solid '+bd }}>{fmtQty(d.total_qty)}</td>
                    </tr>; })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </Section>

        {/* 월별 추이 */}
        <Section group="summary" title={'📈 '+(t.monthlyTrend||'월별 추이')+' ('+(t.last6mo||'최근 6개월')+')'}>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:300, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.totalVisits||'총 내원'}</div>
              <VBars color="var(--accent-bar)" rows={(monthly||[]).map(function(m){ return { label:(m.ym||'').slice(5), value:m.visits }; })} />
            </div>
            <div style={{ flex:1, minWidth:300, background:scBg, border:'1px solid '+bd, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:t2, marginBottom:10 }}>{t.st_cash||'그날 현금'} (Ar)</div>
              <VBars money color="var(--ok-bar)" rows={(monthly||[]).map(function(m){ return { label:(m.ym||'').slice(5), value:m.revenue }; })} />
            </div>
          </div>
        </Section>
      </>}
    </div>
    </div>
  </div>;
}
