import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';

// 읽기 전용 환자 차트 패널: 과거 내원 목록 → 클릭하면 그날 노트·바이탈·처방·오더 표시.
// patientId 만 넘기면 됨. 진료/수납/접수 어디서든 재사용.
export function PatientChart(props){
  var patientId = props.patientId || null;
  var t = useLang().t;
  var hs = useState([]), history = hs[0], setHistory = hs[1];
  var psv = useState(null), past = psv[0], setPast = psv[1];

  useEffect(function(){
    setPast(null);
    if(!patientId){ setHistory([]); return; }
    var alive = true;
    api.get('/patients/'+patientId+'/history')
      .then(function(h){ if(alive) setHistory(h||[]); })
      .catch(function(){ if(alive) setHistory([]); });
    return function(){ alive = false; };
  }, [patientId]);

  async function openPast(h){
    var rx = [], oi = [];
    try { rx = await api.get('/consultations/'+h.id+'/prescriptions'); } catch(e){}
    try { oi = await api.get('/consultations/'+h.id+'/orders'); } catch(e){}
    setPast({ c:h, rx:rx, orders:oi });
  }

  var bd='#232838', scBg='#1a1f2e', pn='#13161f', tx='#e2e8f0', t2='#94a3b8', t3='#64748b';

  if(!patientId){
    return <div style={{padding:20,textAlign:'center',color:'#334155',fontSize:14,fontStyle:'italic'}}>{t.selectPatientLeft}</div>;
  }

  if(past){
    var c = past.c;
    var vrows = [
      ['BP', (c.bp_systolic!=null ? c.bp_systolic+'/'+(c.bp_diastolic!=null?c.bp_diastolic:'') : '\u2014')],
      ['BT', (c.temperature!=null ? c.temperature : '\u2014')],
      ['PR', (c.pulse!=null ? c.pulse : '\u2014')],
      ['RR', (c.respiratory_rate!=null ? c.respiratory_rate : '\u2014')],
      ['SpO2', (c.spo2!=null ? c.spo2 : '\u2014')]
    ];
    return <div style={{padding:'8px 10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <button onClick={function(){setPast(null)}} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:5,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:800}}>{t.backToList}</button>
        <span style={{fontSize:12,color:'#fbbf24',fontWeight:700}}>{t.pastRecordRO}</span>
      </div>
      <div style={{fontSize:13,fontWeight:800,color:'#93c5fd',marginBottom:8}}>{'\uD83D\uDCC5 '}{c.consult_date?c.consult_date.split('T')[0]:''} · {c.dept_code||''} · {c.doctor_name||''}</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {vrows.map(function(r){return <div key={r[0]} style={{background:scBg,border:'1px solid '+bd,borderRadius:5,padding:'3px 7px'}}><span style={{fontSize:11,color:t3,fontWeight:700,marginRight:4}}>{r[0]}</span><span style={{fontSize:13,color:tx,fontFamily:'monospace'}}>{r[1]}</span></div>;})}
      </div>
      <div style={{fontWeight:700,fontSize:12,color:'#60a5fa',marginBottom:3}}>{t.consultNote}</div>
      <div style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'8px 10px',color:'#cbd5e1',fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',marginBottom:12,minHeight:44}}>{c.note_text||c.subjective||'\u2014'}</div>
      <div style={{fontWeight:700,fontSize:12,color:'#34d399',marginBottom:3}}>{t.orders}</div>
      <div style={{background:pn,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
        {((past.rx||[]).length===0 && (past.orders||[]).length===0)?<div style={{padding:12,textAlign:'center',color:t3,fontSize:12}}>{'\u2014'}</div>:null}
        {(past.rx||[]).map(function(rx,i){
          return <div key={'r'+i} style={{display:'flex',gap:6,padding:'5px 8px',borderBottom:'1px solid #1e2433',alignItems:'baseline'}}>
            <span style={{color:'#60a5fa',fontFamily:'monospace',fontSize:11,fontWeight:700,width:52}}>{rx.drug_code}</span>
            <span style={{color:tx,fontSize:13,flex:1}}>{rx.drug_name}</span>
            <span style={{color:t2,fontSize:11}}>{rx.dose}×{rx.frequency}×{rx.days}d</span>
          </div>;
        })}
        {(past.orders||[]).map(function(o,i){
          return <div key={'o'+i} style={{display:'flex',gap:6,padding:'5px 8px',borderBottom:'1px solid #1e2433',alignItems:'baseline'}}>
            <span style={{color:'#a78bfa',fontFamily:'monospace',fontSize:11,fontWeight:700,width:52}}>{o.order_code}</span>
            <span style={{color:tx,fontSize:13,flex:1}}>{o.order_name}</span>
            <span style={{color:t2,fontSize:11}}>{o.worklist_status||''}</span>
          </div>;
        })}
      </div>
    </div>;
  }

  return <div style={{padding:'6px 8px'}}>
    {history.length>0?history.map(function(h,i){
      return <div key={i} onClick={function(){openPast(h)}} style={{background:scBg,borderRadius:5,padding:'8px 10px',marginBottom:6,border:'1px solid '+bd,cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
          <span style={{fontFamily:'monospace',fontSize:13,color:'#60a5fa',fontWeight:700}}>{h.consult_date?h.consult_date.split('T')[0]:''}</span>
          <span style={{fontSize:12,color:t2}}>{h.dept_code||''}</span>
          <span style={{fontSize:12,color:t2,marginLeft:'auto'}}>{h.doctor_name||''}</span>
        </div>
        <div style={{fontSize:13,color:'#94a3b8',lineHeight:1.5,whiteSpace:'pre-wrap',maxHeight:38,overflow:'hidden'}}>{h.note_text||h.subjective||'\u2014'}</div>
      </div>;
    }):<div style={{padding:20,textAlign:'center',color:'#334155',fontSize:14,fontStyle:'italic'}}>{t.noHistory}</div>}
  </div>;
}
