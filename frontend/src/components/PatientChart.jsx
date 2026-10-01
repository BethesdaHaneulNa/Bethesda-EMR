import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { doseSentence, isLegacyTotal, storedTotal, fmtAmount } from '../documents/rx-dosing.js';

// 읽기 전용 환자 차트 패널: 과거 내원 목록 → 클릭하면 그날 노트·바이탈·처방·오더 표시.
// patientId 만 넘기면 됨. 진료/수납/접수 어디서든 재사용.
export function PatientChart(props){
  var patientId = props.patientId || null;
  var langCtx = useLang(), t = langCtx.t;
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

  var bd='var(--border)', scBg='var(--panel-head)', pn='var(--panel)', tx='var(--text)', t2='var(--text-2)', t3='var(--text-3)';

  // One note per doctor on a visit (consultation_note, migration 038): the history gives
  // `notes` [{author_name, note_text, created_at, updated_at}]. Each is drawn under its
  // own small head - name · time (· edited time) - as the consultation screen does; the
  // time is made here, in the browser's clock. An answer without `notes` (older server)
  // falls back to the single note_text.
  function hhmm(x){
    if(!x) return '';
    var d = new Date(x);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }
  function noteHead(n){
    return [ n.author_name || '?', hhmm(n.created_at),
      n.updated_at ? String(t.cs_noteEdited||'').replace('{time}', hhmm(n.updated_at)) : '' ].filter(Boolean).join(' \u00b7 ');
  }
  // A note on a card of the list (2026-10-01, the director: the till reads these often and
  // must see "control in 3 days" without opening the visit). The beginning of the note, cut
  // with an ellipsis after `rows` lines on screen, and then its LAST line whole (two lines on
  // screen at most) - the plan and the next appointment are written at the end. A note of
  // one line is simply shown, up to `rows` + 1 lines on screen. The full text is one click
  // away, in the visit.
  var noteText = {fontSize:13,color:'var(--text-2)',lineHeight:1.5,whiteSpace:'pre-wrap',overflowWrap:'anywhere'};
  function clamp(n){ return {display:'-webkit-box',WebkitBoxOrient:'vertical',WebkitLineClamp:n,overflow:'hidden'}; }
  function shortNote(text, rows){
    var ls = String(text||'').split('\n').map(function(x){ return x.replace(/\s+$/,''); });
    while(ls.length && !ls[ls.length-1].trim()) ls.pop();
    if(!ls.length) return <div style={noteText}>{'\u2014'}</div>;
    if(ls.length === 1) return <div style={Object.assign({}, noteText, clamp(rows + 1))}>{ls[0]}</div>;
    return <div>
      <div style={Object.assign({}, noteText, clamp(rows))}>{ls.slice(0, -1).join('\n')}</div>
      <div style={Object.assign({}, noteText, clamp(2))}>{ls[ls.length-1]}</div>
    </div>;
  }
  // compact: the list of visits - see shortNote; three lines of the beginning per note, two
  // when several doctors wrote on the visit. `visitDoctor`: when the only note is by the
  // doctor the card's head already names, the small head (name · time) is not repeated.
  function notesBlock(list, compact, visitDoctor){
    var rows = list.length > 1 ? 2 : 3;
    var bare = compact && list.length === 1 && visitDoctor && list[0].author_name === visitDoctor && !list[0].updated_at;
    return list.map(function(n, i){
      if(bare) return <div key={n.id || i}>{shortNote(n.note_text, rows)}</div>;
      return <div key={n.id || i} style={{marginTop:i?6:0,paddingLeft:7,borderLeft:'3px solid var(--line-soft)'}}>
        <div style={{fontSize:12,fontWeight:700,color:t2,overflowWrap:'anywhere'}}>{noteHead(n)}</div>
        {compact ? shortNote(n.note_text, rows) : <div style={noteText}>{n.note_text}</div>}
      </div>;
    });
  }
  function hasNotes(c){ return !!(c && Array.isArray(c.notes) && c.notes.length); }

  // Same rule and wording as the consultation screen (orderStatus in Consultation.jsx).
  // worklist_status only means something for an order sent to an imaging worklist:
  // every other order is stored with 'completed' there from the start, so showing it
  // raw put "completed" on lab orders with no result yet - in English on every screen.
  // Lab orders show the lab's own status; an order with neither shows nothing.
  function orderStatus(o){
    if(o.code_type==='lab'){
      if(o.status==='completed') return <span style={{color:'var(--ok-text)'}}>{t.cs_labDone}</span>;
      if(o.status==='cancelled') return t.cs_labCancelled;
      return <span style={{color:'var(--warn-text)'}}>{t.cs_labPending}</span>;
    }
    if(o.worklist_sent_at){
      var ws = o.worklist_status || '';
      var wsKey = { pending:'cs_wsPending', sent:'cs_wsSent', in_progress:'cs_wsInProgress', completed:'cs_wsCompleted', cancelled:'cs_wsCancelled' }[ws];
      return wsKey ? t[wsKey] : ws;
    }
    return '';
  }

  if(!patientId){
    return <div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize:14,fontStyle:'italic'}}>{t.selectPatientInList || t.selectPatientLeft}</div>;
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
        <button onClick={function(){setPast(null)}} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:800}}>{t.backToList}</button>
        <span style={{fontSize:12,color:'var(--warn-text)',fontWeight:700}}>{t.pastRecordRO}</span>
      </div>
      <div style={{fontSize:13,fontWeight:800,color:'var(--accent-text-2)',marginBottom:8}}>{'\uD83D\uDCC5 '}{[c.consult_date?c.consult_date.split('T')[0]:'', c.dept_code, c.doctor_name].filter(Boolean).join(' · ')}</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {vrows.map(function(r){return <div key={r[0]} style={{background:scBg,border:'1px solid '+bd,borderRadius:5,padding:'3px 7px'}}><span style={{fontSize:11,color:t3,fontWeight:700,marginRight:4}}>{r[0]}</span><span style={{fontSize:13,color:tx,fontFamily:'monospace'}}>{r[1]}</span></div>;})}
      </div>
      <div style={{fontWeight:700,fontSize:12,color:'var(--accent-text)',marginBottom:3}}>{t.consultNote}</div>
      {hasNotes(c)
        ? <div style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'8px 10px',marginBottom:12,minHeight:44}}>{notesBlock(c.notes, false)}</div>
        : <div style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'8px 10px',color:'var(--text-soft)',fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',marginBottom:12,minHeight:44}}>{c.note_text||c.subjective||'\u2014'}</div>}
      <div style={{fontWeight:700,fontSize:12,color:'var(--ok-text)',marginBottom:3}}>{t.orders}</div>
      <div style={{background:pn,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
        {((past.rx||[]).length===0 && (past.orders||[]).length===0)?<div style={{padding:12,textAlign:'center',color:t3,fontSize:12}}>{'\u2014'}</div>:null}
        {(past.rx||[]).map(function(rx,i){
          return <div key={'r'+i} style={{display:'flex',gap:6,padding:'5px 8px',borderBottom:'1px solid var(--line-soft)',alignItems:'baseline'}}>
            <span style={{color:'var(--accent-text)',fontFamily:'monospace',fontSize:11,fontWeight:700,width:52}}>{rx.drug_code}</span>
            <span style={{color:tx,fontSize:13,flex:1}}>{rx.drug_name}</span>
            {/* dose is the DAILY total since 2026-09-29, so "dose × times × days" no longer
                says what was given. Same sentence as the pharmacy and consultation screens
                (documents/rx-dosing.js); a line saved under the old formula is labelled. */}
            <span style={{color:isLegacyTotal(rx)?'var(--warn-text)':t2,fontSize:11,textAlign:'right'}}>
              {doseSentence(rx, langCtx.lang)}
              {isLegacyTotal(rx) ? ' · ' + String(t.cs_rxStoredTotal||'').replace('{total}', fmtAmount(storedTotal(rx))) : ''}
            </span>
          </div>;
        })}
        {(past.orders||[]).map(function(o,i){
          return <div key={'o'+i} style={{display:'flex',gap:6,padding:'5px 8px',borderBottom:'1px solid var(--line-soft)',alignItems:'baseline'}}>
            <span style={{color:'var(--violet-text)',fontFamily:'monospace',fontSize:11,fontWeight:700,width:52}}>{o.order_code}</span>
            <span style={{color:tx,fontSize:13,flex:1}}>{o.order_name}</span>
            <span style={{color:t2,fontSize:11}}>{orderStatus(o)}</span>
          </div>;
        })}
      </div>
    </div>;
  }

  return <div style={{padding:'6px 8px'}}>
    {history.length>0?history.map(function(h,i){
      return <div key={i} onClick={function(){openPast(h)}} style={{background:scBg,borderRadius:5,padding:'8px 10px',marginBottom:8,border:'1px solid '+bd,cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'baseline',flexWrap:'wrap',gap:'0 8px',marginBottom:5,paddingBottom:4,borderBottom:'1px solid var(--line-soft)'}}>
          <span style={{fontFamily:'monospace',fontSize:14,color:'var(--accent-text)',fontWeight:800,whiteSpace:'nowrap'}}>{h.consult_date?h.consult_date.split('T')[0]:''}</span>
          <span style={{fontSize:13,fontWeight:700,color:tx,minWidth:0,overflowWrap:'anywhere'}}>{[h.dept_code, h.doctor_name].filter(Boolean).join(' ')}</span>
        </div>
        {hasNotes(h) ? notesBlock(h.notes, true, h.doctor_name)
          : shortNote(h.note_text||h.subjective, 3)}
      </div>;
    }):<div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize:14,fontStyle:'italic'}}>{t.noHistory}</div>}
  </div>;
}
