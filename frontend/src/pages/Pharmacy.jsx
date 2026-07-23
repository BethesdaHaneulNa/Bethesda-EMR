import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar.jsx';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { PatientChart } from '../components/PatientChart.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';

function fmt(n){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function patientName(v){ return ((v.last_name||'') + ' ' + (v.first_name||'')).trim(); }
function timeText(v, locale){
  var raw = v.consultation_time || v.dispensed_at || v.visit_date;
  if(!raw) return '';
  try { return new Date(raw).toLocaleString(locale || 'en-GB', { hour12:false }); } catch(e){ return raw; }
}
function rxQty(rx){ return parseFloat(rx.total_qty) || ((parseFloat(rx.dose)||0) * (Number(rx.frequency)||1) * (Number(rx.days)||1)); }

export default function PharmacyPage() {
  var lc = useLang(); var t = lc.t;
  var locale = lc.lang === 'ko' ? 'ko-KR' : lc.lang === 'fr' ? 'fr-FR' : 'en-GB';
  var ps = useState([]), pending = ps[0], setPending = ps[1];
  var cs = useState([]), completed = cs[0], setCompleted = cs[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];
  var pfs = useState(false), phFinderOpen = pfs[0], setPhFinderOpen = pfs[1];
  var vps = useState(null), viewPid = vps[0], setViewPid = vps[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var tabs = useState('pending'), tab = tabs[0], setTab = tabs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var rrx = useState([]), recentRx = rrx[0], setRecentRx = rrx[1];
  var dcs = useState(false), docOpen = dcs[0], setDocOpen = dcs[1];
  var cvs = useState(false), chartViewOpen = cvs[0], setChartViewOpen = cvs[1];

  // 처방을 원내(internal)/원외(external)로 지정
  async function setDispenseType(rxId, type){
    try {
      await api.put('/pharmacy/prescription/'+rxId+'/dispense-type', { dispense_type: type });
      setSel(function(prev){
        if(!prev) return prev;
        var n = Object.assign({}, prev);
        n.prescriptions = (prev.prescriptions||[]).map(function(rx){ return rx.id===rxId ? Object.assign({}, rx, { dispense_type: type }) : rx; });
        return n;
      });
    } catch(err){ alert('Error: '+err.message); }
  }

  useEffect(function(){ loadData(); }, []);
  useEffect(function(){
    var pid = sel ? sel.patient_id : null;
    if(!pid){ setRecentRx([]); return; }
    api.get('/pharmacy/patient/'+pid+'/recent-rx').then(function(r){ setRecentRx(r||[]); }).catch(function(){ setRecentRx([]); });
  }, [sel]);

  // 같은 약을 이전에 받았고, 그 처방분(처방일+일수)이 아직 안 끝났으면 조기 재처방 경고
  function refillWarn(drugCode){
    if(!drugCode || !sel) return null;
    var today = new Date(); today.setHours(0,0,0,0);
    var best = null;
    (recentRx||[]).forEach(function(r){
      if(r.drug_code !== drugCode) return;
      if(r.consultation_id === sel.consultation_id) return; // 지금 이 처방은 제외
      var d = r.consult_date ? new Date(r.consult_date) : null;
      if(!d) return; d.setHours(0,0,0,0);
      if(d >= today) return; // 과거 처방만
      var days = parseInt(r.days)||0;
      var end = new Date(d); end.setDate(end.getDate()+days);
      var daysAgo = Math.round((today-d)/86400000);
      var daysLeft = Math.round((end-today)/86400000);
      if(end > today){ // 아직 남아있음 = 조기 재처방
        if(!best || daysLeft>best.daysLeft) best = {daysAgo:daysAgo, priorDays:days, daysLeft:daysLeft};
      }
    });
    return best;
  }

  async function loadData(){
    setLoading(true);
    try {
      var p = await api.get('/pharmacy/pending');
      var c = await api.get('/pharmacy/completed');
      setPending(p); setCompleted(c);
      if(sel){
        var next = (tab === 'pending' ? p : c).find(function(x){ return x.consultation_id === sel.consultation_id; });
        setSel(next || null);
      }
    } catch(err){ alert('Error: ' + err.message); }
    setLoading(false);
  }

  async function dispense(){
    if(!sel || busy) return;
    if(!window.confirm(patientName(sel) + ' '+t.dispenseComplete+'?' )) return;
    setBusy(true);
    try {
      var r = await api.put('/pharmacy/consultations/' + sel.consultation_id + '/dispense');
      // Stock never goes negative, so a shortage is otherwise invisible: the
      // count just sits at 0 while more was handed out than we had on record.
      var short = (r && r.shortages) || [];
      if(short.length){
        alert((t.stockShortWarn || 'Stock recorded was not enough — check the shelf count:') + '\n' +
          short.map(function(s){ return '· ' + s.drug_name + ': ' + s.requested + ' / ' + s.available; }).join('\n'));
      }
      await loadData();
      setSel(null);
    } catch(err){ alert('Error: ' + err.message); }
    setBusy(false);
  }

  var activeList = tab === 'pending' ? pending : completed;
  var filtered = useMemo(function(){
    if(!q) return activeList;
    var s = q.toLowerCase();
    return activeList.filter(function(v){
      var name = patientName(v).toLowerCase();
      var chart = (v.chart_no || '').toLowerCase();
      var drugs = (v.prescriptions || []).map(function(r){ return (r.drug_name || '') + ' ' + (r.drug_code || ''); }).join(' ').toLowerCase();
      return name.indexOf(s) >= 0 || chart.indexOf(s) >= 0 || drugs.indexOf(s) >= 0;
    });
  }, [activeList, q]);

  var totalDrug = (sel && sel.prescriptions ? sel.prescriptions : []).reduce(function(sum, rx){
    return sum + rxQty(rx) * (parseFloat(rx.unit_price) || 0);
  }, 0);

  var bd='#232838', bd2='#2a3142', scBg='#1a1f2e', pn='#13161f', tx='#e2e8f0', t2='#94a3b8', t3='#64748b';
  var green='#10b981', violet='#8b5cf6';

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#0f1117', color: tx, minHeight: '100vh', fontSize: 16 }}>
      <TopBar />

      <div style={{ background:'#161a26', borderBottom:'1px solid '+bd, padding:'5px 12px', display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={function(){setTab('pending'); setSel(null);}} style={{ background:tab==='pending'?'#8b5cf620':'transparent', color:tab==='pending'?'#c4b5fd':t3, border:'1px solid '+(tab==='pending'?'#8b5cf650':'transparent'), borderRadius:5, padding:'4px 12px', cursor:'pointer', fontSize: 16, fontWeight:700 }}>{t.dispensingPending} {pending.length}</button>
        <button onClick={function(){setTab('completed'); setSel(null);}} style={{ background:tab==='completed'?'#10b98120':'transparent', color:tab==='completed'?'#6ee7b7':t3, border:'1px solid '+(tab==='completed'?'#10b98150':'transparent'), borderRadius:5, padding:'4px 12px', cursor:'pointer', fontSize: 16, fontWeight:700 }}>{t.dispensingCompleted} {completed.length}</button>
        <button onClick={loadData} style={{ background:'#1e2433', color:t2, border:'1px solid '+bd2, borderRadius:5, padding:'4px 10px', cursor:'pointer', fontSize: 16 }}>{t.refresh}</button>
        <button onClick={function(){setPhFinderOpen(true);}} style={{ background:'#1e2433', color:t2, border:'1px solid '+bd2, borderRadius:5, padding:'4px 10px', cursor:'pointer', fontSize: 16 }}>🔍 {t.findPatient}</button>
        <button onClick={function(){ if(sel) setDocOpen(true); }} disabled={!sel} style={{ background:sel?'#b45309':'#1e2433', color:sel?'#fde68a':'#475569', border:'1px solid '+(sel?'#f59e0b':bd2), borderRadius:5, padding:'4px 12px', cursor:sel?'pointer':'not-allowed', fontSize: 16, fontWeight:700 }}>💊 {t.outsideRx}</button>
        <button onClick={function(){ if(sel) setChartViewOpen(true); }} disabled={!sel} style={{ background:sel?'#1e2433':'#1e2433', color:sel?'#ddd6fe':'#475569', border:'1px solid '+(sel?'#a855f7':bd2), borderRadius:5, padding:'4px 12px', cursor:sel?'pointer':'not-allowed', fontSize: 16, fontWeight:700 }}>📋 {t.chartViewer||'차트뷰어'}</button>
        <div style={{ flex:1 }}></div>
        {sel && tab==='pending' ? <button onClick={dispense} disabled={busy} style={{ background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:5, padding:'6px 18px', cursor:busy?'wait':'pointer', fontSize: 16, fontWeight:800 }}>✓ {t.dispenseComplete}</button> : null}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'330px 1fr 320px', height:'calc(100vh - 88px)' }}>
        <div style={{ borderRight:'1px solid '+bd, display:'flex', flexDirection:'column', background:pn }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid '+bd, background:scBg, fontWeight:800, fontSize: 16 }}>💊 {t.pharmacy}</div>
          <div style={{ padding:'7px 8px', borderBottom:'1px solid '+bd }}>
            <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.pharmacySearchPlaceholder} style={{ background:scBg, border:'1px solid '+bd2, borderRadius:5, padding:'6px 9px', color:tx, outline:'none', width:'100%', boxSizing:'border-box', fontSize: 16 }}/>
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {loading ? <div style={{ padding:20, textAlign:'center', color:t3 }}>{t.loading}</div> : null}
            {!loading && filtered.length === 0 ? <div style={{ padding:28, textAlign:'center', color:t3, fontSize: 16 }}>{t.noRxToShow}</div> : null}
            {!loading && filtered.map(function(v){
              var active = sel && sel.consultation_id === v.consultation_id;
              return <div key={v.consultation_id} onClick={function(){setSel(v);}} style={{ padding:'10px 12px', borderBottom:'1px solid '+bd, cursor:'pointer', background:active?'#8b5cf615':'transparent', borderLeft:active?'3px solid '+violet:'3px solid transparent' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                  <div style={{ fontWeight:800, color:tx, fontSize: 16 }}>{patientName(v)}</div>
                  <div style={{ fontSize: 16, color:tab==='pending'?'#fbbf24':'#6ee7b7', fontWeight:700 }}>{tab==='pending'?t.waiting:t.completed}</div>
                </div>
                <div style={{ color:t3, fontSize: 16, marginTop:3 }}>#{v.chart_no} · {v.rx_count} {t.rxUnit}</div>
                <div style={{ color:t2, fontSize: 16, marginTop:3 }}>{timeText(v, locale)}</div>
                <div style={{ color:t3, fontSize: 16, marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(v.prescriptions||[]).map(function(r){return r.drug_name;}).join(', ')}</div>
              </div>;
            })}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!sel ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:t3 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize: 49, opacity:.35, marginBottom:10 }}>💊</div>
              <div style={{ fontSize: 18, fontWeight:800, color:t2 }}>{t.selectRxPatient}</div>
              <div style={{ fontSize: 16, marginTop:6 }}>{t.pharmacyOnlyCompleted}</div>
            </div>
          </div> : <>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid '+bd, background:scBg }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight:900, color:'#f8fafc' }}>{patientName(sel)}</div>
                  <div style={{ marginTop:4, fontSize: 16, color:t2 }}>{t.chartNo} {sel.chart_no} · {t.doctor} {sel.doctor_name || '-'} · {timeText(sel, locale)}</div>
                  {sel.allergies ? <div style={{ marginTop:6, color:'#fca5a5', background:'#ef444420', border:'1px solid #ef444450', borderRadius:5, padding:'5px 8px', display:'inline-block', fontSize: 16, fontWeight:700 }}>{t.allergies}: {sel.allergies}</div> : null}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:t3, fontSize: 16 }}>{t.drugCost}</div>
                  <div style={{ color:'#f8fafc', fontSize: 20, fontWeight:900 }}>{fmt(totalDrug)}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:16, overflow:'auto', flex:1 }}>
              <div style={{ background:pn, border:'1px solid '+bd, borderRadius:8, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1.5fr .6fr .6fr .6fr .6fr .8fr 1fr', gap:0, background:'#161a26', borderBottom:'1px solid '+bd, color:t3, fontSize: 16, fontWeight:800 }}>
                  {[t.colDrugName,t.colDose,t.colFreq,t.colDays,t.colRoute,t.colQty,t.colMemo].map(function(h){return <div key={h} style={{ padding:'8px 10px' }}>{h}</div>;})}
                </div>
                {(sel.prescriptions||[]).map(function(rx){
                  var warn = refillWarn(rx.drug_code);
                  return <div key={rx.id} style={{ display:'grid', gridTemplateColumns:'1.5fr .6fr .6fr .6fr .6fr .8fr 1fr', borderBottom:'1px solid '+bd, fontSize: 16, background: warn?'#ef44440d':'transparent' }}>
                    <div style={{ padding:'10px', fontWeight:800, color:tx }}>
                      <div>{rx.drug_name}</div>
                      <div style={{ color:t3, fontSize: 16, marginTop:2 }}>{rx.drug_code}</div>
                      {tab==='pending' ? <div style={{ display:'inline-flex', marginTop:5, borderRadius:5, overflow:'hidden', border:'1px solid '+bd2 }}>
                        {[['internal',t.internalRx||'원내'],['external',t.externalRx||'원외']].map(function(o){
                          var on=(rx.dispense_type||'internal')===o[0];
                          var c=o[0]==='external'?'#f59e0b':'#10b981';
                          return <button key={o[0]} onClick={function(){ setDispenseType(rx.id,o[0]); }} style={{ background:on?c:'#1e2433', color:on?'#0f1117':t2, border:'none', padding:'3px 12px', cursor:'pointer', fontSize:13, fontWeight:800 }}>{o[1]}</button>;
                        })}
                      </div> : (rx.dispense_type==='external' ? <span style={{ display:'inline-block', marginTop:5, background:'#f59e0b20', color:'#fbbf24', borderRadius:4, padding:'2px 8px', fontSize:13, fontWeight:800 }}>{t.externalRx||'원외'}</span> : null)}
                      {warn? <div style={{ marginTop:4, color:'#fca5a5', background:'#ef444418', border:'1px solid #ef444450', borderRadius:5, padding:'3px 7px', display:'inline-block', fontSize: 13, fontWeight:700 }}>⚠ {warn.daysAgo}{t.daysAgoSuffix} {warn.priorDays}{t.daysSupplySuffix} · {t.refillEarlyLeft} {warn.daysLeft}{t.daysLeftSuffix}</div> : null}
                    </div>
                    <div style={{ padding:'10px', color:t2 }}>{rx.dose || '-'}</div>
                    <div style={{ padding:'10px', color:t2 }}>{rx.frequency || '-'}</div>
                    <div style={{ padding:'10px', color:t2 }}>{rx.days || '-'}</div>
                    <div style={{ padding:'10px', color:t2 }}>{rx.route || '-'}</div>
                    <div style={{ padding:'10px', color:t2 }}>{rxQty(rx)}</div>
                    <div style={{ padding:'10px', color:t2 }}>{rx.memo || '-'}</div>
                  </div>;
                })}
              </div>
            </div>

            {tab==='pending' ? <div style={{ padding:'10px 16px', borderTop:'1px solid '+bd, background:'#161a26', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={dispense} disabled={busy} style={{ background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:6, padding:'9px 28px', cursor:busy?'wait':'pointer', fontSize: 16, fontWeight:900 }}>✓ {t.dispenseComplete}</button>
            </div> : null}
          </>}
        </div>

        <div style={{ borderLeft:'1px solid '+bd, display:'flex', flexDirection:'column', background:pn, overflow:'hidden' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid '+bd, background:scBg, fontWeight:800, fontSize: 15, color:'#60a5fa' }}>{t.pastVisits}</div>
          <div style={{ flex:1, overflow:'auto' }}><PatientChart patientId={sel?sel.patient_id:(viewPid||null)} /></div>
        </div>
      </div>
      <PatientFinder open={phFinderOpen} onClose={function(){setPhFinderOpen(false);}} mode="patient"
        onPickPatient={function(p){ setSel(null); setViewPid(p.id); }} />
      <DocumentModal open={docOpen} onClose={function(){setDocOpen(false);}} category="prescription"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.visit_id:null, consultation_id: sel?sel.consultation_id:null, doctor_name: sel?sel.doctor_name:'', dept_code: '' }} />
      <DocumentModal open={chartViewOpen} onClose={function(){setChartViewOpen(false);}} category="chart" readOnly={true}
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{}} />
    </div>
  );
}
