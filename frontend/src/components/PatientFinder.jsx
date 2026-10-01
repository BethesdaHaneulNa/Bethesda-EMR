import { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';

// 공용 환자 찾기 팝업: 1) 수진자 찾기 → 2) 외래 내역 선택
// props:
//   open, onClose
//   mode: 'visit'(기본, 내원까지 선택) | 'patient'(환자만 선택)
//   onPickVisit(visit), onPickPatient(patient)
export function PatientFinder(props){
  var open = props.open;
  var mode = props.mode || 'visit';
  var t = useLang().t;
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var rs = useState([]), results = rs[0], setResults = rs[1];
  var sps = useState(null), selPatient = sps[0], setSelPatient = sps[1];
  var vs = useState([]), visits = vs[0], setVisits = vs[1];
  var ls = useState(false), loading = ls[0], setLoading = ls[1];
  var searched = useState(false), didSearch = searched[0], setDidSearch = searched[1];
  var inputRef = useRef(null);

  useEffect(function(){
    if(open){
      setQ(''); setResults([]); setVisits([]); setDidSearch(false);
      if(props.initialPatient && props.initialPatient.id){
        setSelPatient(props.initialPatient); setLoading(true);
        api.get('/visits/patient/'+props.initialPatient.id)
          .then(function(v){ setVisits(v||[]); })
          .catch(function(){ setVisits([]); })
          .then(function(){ setLoading(false); });
      } else {
        setSelPatient(null);
        setTimeout(function(){ if(inputRef.current) inputRef.current.focus(); }, 60);
      }
    }
  }, [open]);

  if(!open) return null;

  var bd='var(--border)', bd2='var(--border-2)', scBg='var(--panel-head)', pn='var(--panel)', tx='var(--text)', t2='var(--text-2)', t3='var(--text-3)';

  async function runSearch(){
    setLoading(true); setDidSearch(true);
    try { var r = await api.get('/patients?q='+encodeURIComponent(q)); setResults(r||[]); }
    catch(e){ setResults([]); }
    setLoading(false);
  }
  async function pickPatient(p){
    if(mode==='patient'){ if(props.onPickPatient) props.onPickPatient(p); if(props.onClose) props.onClose(); return; }
    setSelPatient(p); setLoading(true);
    try { var v = await api.get('/visits/patient/'+p.id); setVisits(v||[]); }
    catch(e){ setVisits([]); }
    setLoading(false);
  }
  function pickVisit(v){ if(props.onPickVisit) props.onPickVisit(v); if(props.onClose) props.onClose(); }

  function billBadge(s){
    var map = {
      paid:[t.billPaid||'PAID','var(--ok-text)','var(--ok-a18)'],
      partial:[t.billPartial||'PARTIAL','var(--warn-ink)','var(--warn-a18)'],
      unpaid:[t.billUnpaid||'UNPAID','var(--warn-ink)','var(--warn-a18)'],
      waived:[t.billWaived||'WAIVED','var(--text-2)','var(--text-2-a18)'],
      cancelled:[t.cancelledBadge||'CANCELLED','var(--danger-text)','var(--danger-a18)']
    };
    var m = s?map[s]:null;
    if(!m) return <span style={{fontSize:11,color:t3,fontStyle:'italic'}}>{t.notBilled||'미수납'}</span>;
    return <span style={{fontSize:11,fontWeight:800,color:m[1],background:m[2],borderRadius:4,padding:'1px 7px'}}>{m[0]}</span>;
  }
  // Where the visit stands. Two visits on the same day used to look identical (date,
  // time, service, doctor, "Non facturé"), so a doctor could open the wrong one
  // (integration test 2). With the reason for the visit and this state they differ.
  // A visit reception completed without a consultation is 'none' and has nothing to
  // bill, so it never reaches the cash desk: say so instead of "Non facturé".
  function visitState(v){
    if(v.status === 'cancelled') return null;   // the date cell already says Visite annulée
    if(v.status === 'completed') return v.visit_type === 'none' ? [t.rc_visitNoFee, 'var(--text-2)'] : [t.completed, 'var(--ok-text)'];
    if(v.status === 'in_progress') return [t.in_progress, 'var(--warn-ink)'];
    return [t.waiting, 'var(--accent-text)'];
  }
  function ymd(d){ return d?String(d).split('T')[0]:''; }
  function hm(s){ if(!s) return ''; return String(s).substring(0,5); }

  return (
    <div style={{position:'fixed',inset:0,background:'var(--scrim)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}} onClick={function(e){ if(e.target===e.currentTarget && props.onClose) props.onClose(); }}>
      <div style={{background:pn,border:'1px solid '+bd2,borderRadius:12,width:900,maxWidth:'94vw',maxHeight:'86vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid '+bd,background:scBg,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontWeight:800,fontSize:16,color:tx}}>🔍 {selPatient ? t.outpatientHistory : t.findPatient}</span>
          {selPatient?<span style={{fontSize:13,color:t2}}>· {selPatient.chart_no} {selPatient.last_name} {selPatient.first_name}</span>:null}
          <div style={{flex:1}}></div>
          <button onClick={props.onClose} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize:13}}>✕ {t.close}</button>
        </div>

        {!selPatient ? (
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',display:'flex',gap:8,borderBottom:'1px solid '+bd}}>
              <input ref={inputRef} value={q} onChange={function(e){setQ(e.target.value)}} onKeyDown={function(e){ if(e.key==='Enter') runSearch(); }}
                placeholder={t.searchPatientPh} style={{flex:1,background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:6,padding:'9px 12px',color:tx,fontSize:15}} />
              <button onClick={runSearch} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:6,padding:'0 18px',cursor:'pointer',fontSize:14,fontWeight:700}}>{t.search}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead><tr style={{position:'sticky',top:0,background:scBg}}>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12,whiteSpace:'nowrap'}}>{t.chartNo}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.name||'Name'}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.phone||'Phone'}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.dob||'DOB'}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.gender||'Sex'}</th>
                </tr></thead>
                <tbody>
                  {results.map(function(p){
                    return <tr key={p.id} onClick={function(){pickPatient(p)}} style={{borderTop:'1px solid var(--line-soft)',cursor:'pointer'}}
                      onMouseEnter={function(e){e.currentTarget.style.background='var(--accent-a12)'}} onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                      {/* The number, the phone and the birth date stay on one line: beside a long name
                          (which wraps, uncut) they were squeezed and broke at their hyphens. */}
                      <td style={{padding:'9px 12px',fontFamily:'monospace',color:'var(--accent-text)',whiteSpace:'nowrap'}}>{p.chart_no}</td>
                      <td style={{padding:'9px 12px',color:tx,fontWeight:700}}>{p.last_name} {p.first_name}</td>
                      <td style={{padding:'9px 12px',color:'var(--text-soft)',fontFamily:'monospace',whiteSpace:'nowrap'}}>{p.mobile || p.phone || '—'}</td>
                      <td style={{padding:'9px 12px',color:t2,whiteSpace:'nowrap'}}>{ymd(p.date_of_birth)}</td>
                      <td style={{padding:'9px 12px',color:t2}}>{p.gender||''}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {loading?<div style={{padding:24,textAlign:'center',color:t3}}>...</div>:null}
              {!loading&&didSearch&&results.length===0?<div style={{padding:24,textAlign:'center',color:t3,fontStyle:'italic'}}>{t.noPatientsFound}</div>:null}
              {!loading&&!didSearch?<div style={{padding:24,textAlign:'center',color:t3,fontStyle:'italic'}}>{t.searchPatientPh}</div>:null}
            </div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{padding:'8px 16px',borderBottom:'1px solid '+bd}}>
              <button onClick={function(){setSelPatient(null);setVisits([])}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize:13}}>{t.backToSearch}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead><tr style={{position:'sticky',top:0,background:scBg}}>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.visitDate||'Date'}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.colReceptionTime}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.department}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.doctor}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.chiefComplaint}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.rc_colVisitState}</th>
                  <th style={{textAlign:'left',padding:'8px 12px',color:t3,fontWeight:700,fontSize:12}}>{t.colBillStatus}</th>
                </tr></thead>
                <tbody>
                  {visits.map(function(v){
                    // A visit reception cancelled is marked and greyed, not hidden or blocked:
                    // it is still part of the patient's history, and what may be done with it
                    // is each screen's call (consultation's server already refuses it). Grey
                    // is the muted text colour, not opacity (design: opacity fades text below
                    // the contrast floor).
                    var cancelled = v.status === 'cancelled';
                    var st = visitState(v);
                    var noCharge = v.status === 'completed' && v.visit_type === 'none' && !v.bill_status;
                    return <tr key={v.id} onClick={function(){pickVisit(v)}} style={{borderTop:'1px solid var(--line-soft)',cursor:'pointer'}}
                      onMouseEnter={function(e){e.currentTarget.style.background='var(--ok-a12)'}} onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                      <td style={{padding:'9px 12px',fontFamily:'monospace',color:cancelled?t3:'var(--ok-text)',fontWeight:700,textDecoration:cancelled?'line-through':'none',whiteSpace:'nowrap'}}>{ymd(v.visit_date)}
                        {cancelled?<span style={{marginLeft:8,fontFamily:'system-ui,sans-serif',fontSize:11,fontWeight:800,color:'var(--danger-text)',background:'var(--danger-a18)',borderRadius:4,padding:'1px 7px',display:'inline-block',textDecoration:'none'}}>{t.rc_visitCancelled}</span>:null}
                      </td>
                      <td style={{padding:'9px 12px',color:cancelled?t3:t2,fontFamily:'monospace'}}>{hm(v.reception_time)}</td>
                      <td style={{padding:'9px 12px',color:cancelled?t3:tx}}>{v.dept_code||''}</td>
                      <td style={{padding:'9px 12px',color:cancelled?t3:t2,whiteSpace:'nowrap'}}>{v.doctor_name||''}</td>
                      <td title={v.chief_complaint||''} style={{padding:'9px 12px',color:cancelled?t3:tx,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.chief_complaint||'—'}</td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}>{st?<span style={{fontSize:12,fontWeight:800,color:st[1]}}>{st[0]}</span>:null}</td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}>{noCharge?<span style={{fontSize:11,color:t3,fontStyle:'italic'}}>{t.rc_billNothing}</span>:billBadge(v.bill_status)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {loading?<div style={{padding:24,textAlign:'center',color:t3}}>...</div>:null}
              {!loading&&visits.length===0?<div style={{padding:24,textAlign:'center',color:t3,fontStyle:'italic'}}>{t.noHistory}</div>:null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
