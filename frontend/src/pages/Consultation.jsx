import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api, getUser } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
import { LabResults } from '../components/LabResults.jsx';
import { RadiologyReadings } from '../components/RadiologyReadings.jsx';

export default function ConsultationPage() {
  var langCtx = useLang(); var t = langCtx.t;
  var user = getUser();
  var vs = useState([]), visits = vs[0], setVisits = vs[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];
  var cs = useState(null), consult = cs[0], setConsult = cs[1];
  var qs = useState(false), queueOpen = qs[0], setQueueOpen = qs[1];
  var cfs = useState(false), finderOpen = cfs[0], setFinderOpen = cfs[1];
  var hos = useState(false), histOpen = hos[0], setHistOpen = hos[1];
  var qfs = useState(''), qFilter = qfs[0], setQFilter = qfs[1];
  var qtb = useState('waiting'), qTab = qtb[0], setQTab = qtb[1];
  var dxs = useState([]), dxList = dxs[0], setDxList = dxs[1];
  var rxs = useState([]), rxList = rxs[0], setRxList = rxs[1];
  var ois = useState([]), orderItems = ois[0], setOrderItems = ois[1];
  var nts = useState(''), note = nts[0], setNote = nts[1];
  var vts = useState({ bp:'',temp:'',pulse:'',spo2:'',rr:'' }), vt = vts[0], setVt = vts[1];
  var ocs = useState(''), orderCode = ocs[0], setOrderCode = ocs[1];
  var oms = useState('all'), orderMode = oms[0], setOrderMode = oms[1];
  var oss = useState([]), orderSugg = oss[0], setOrderSugg = oss[1];
  var osi = useState(-1), oSelIdx = osi[0], setOSelIdx = osi[1];
  var dms = useState(false), drugModal = dms[0], setDrugModal = dms[1];
  var dqs = useState(''), drugQ = dqs[0], setDrugQ = dqs[1];
  var drs = useState([]), allDrugs = drs[0], setAllDrugs = drs[1];
  var ocs2 = useState([]), allOrderCodes = ocs2[0], setAllOrderCodes = ocs2[1];
  var phs = useState([]), phrases = phs[0], setPhrases = phs[1];
  var pcs = useState('All'), phraseCat = pcs[0], setPhraseCat = pcs[1];
  var pqs = useState(''), phraseQ = pqs[0], setPhraseQ = pqs[1];
  var rts = useState('chart'), rTab = rts[0], setRTab = rts[1];
  var his = useState([]), history = his[0], setHistory = his[1];
  var pvs = useState(null), pastView = pvs[0], setPastView = pvs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var rtb2 = useState('past'), rightTab = rtb2[0], setRightTab = rtb2[1];
  var osets = useState([]), orderSets = osets[0], setOrderSets = osets[1];
  var egs = useState({}), expGroups = egs[0], setExpGroups = egs[1];
  var dcs = useState(false), docOpen = dcs[0], setDocOpen = dcs[1];
  var lbs = useState(false), labOpen = lbs[0], setLabOpen = lbs[1];
  var chs = useState(false), chartOpen = chs[0], setChartOpen = chs[1];
  var vws = useState(null), viewer = vws[0], setViewer = vws[1];
  var rds = useState(''), readText = rds[0], setReadText = rds[1];
  var rdo = useState(false), readingsOpen = rdo[0], setReadingsOpen = rdo[1];
  var canRead = (user && Array.isArray(user.permissions)) ? user.permissions.indexOf('consultation')>=0 : (user && user.role==='doctor')||(user&&user.role==='admin');

  async function openViewer(orderItemId){
    try {
      var r = await api.get('/pacs/viewer-url?order_item_id='+orderItemId);
      setViewer({ order_item_id:orderItemId, has_viewer:r.has_viewer, url:r.has_viewer?r.url:'', order_name:r.order_name, accession:r.accession, reading:r.reading });
      setReadText(r.reading?r.reading.result_text:'');
    } catch(e){ alert('Error: '+e.message); }
  }
  async function saveReading(){
    if(!viewer) return;
    try {
      await api.put('/pacs/reading/'+viewer.order_item_id, { result_text: readText });
      setViewer(function(p){ return Object.assign({}, p, { reading: Object.assign({}, p&&p.reading, { result_text: readText, result_by_name: (user&&user.name)||'', result_at: new Date().toISOString() }) }); });
      alert((t.save||'저장')+' ✓');
    } catch(e){ alert('Error: '+e.message); }
  }

  useEffect(function(){ loadData(); },[]);

  useEffect(function(){
    var id=setInterval(function(){ api.get('/visits/today').then(function(v){ setVisits(v); }).catch(function(){}); }, 15000);
    return function(){ clearInterval(id); };
  },[]);

  async function loadData(){
    setLoading(true);
    try {
      var vData = await api.get('/visits/today');
      setVisits(vData);
      var drData = await api.get('/admin/drugs');
      setAllDrugs(drData);
      var ocData = await api.get('/admin/order-codes');
      setAllOrderCodes(ocData);
      var phData = await api.get('/admin/phrases');
      setPhrases(phData);
      try { var osData = await api.get('/order-sets'); setOrderSets(osData||[]); } catch(e){ setOrderSets([]); }
    } catch(err){ console.error(err); }
    setLoading(false);
  }

  async function pickPatient(v){
    setSel(v); setQueueOpen(false); setPastView(null);
    setDxList([]); setRxList([]); setOrderItems([]);
    setNote(''); setVt({bp:'',temp:'',pulse:'',spo2:'',rr:''});
    setOrderCode(''); setOrderSugg([]);
    try {
      // Check if consultation already exists for this visit
      // If not, start one
      var cData = await api.post('/consultations',{ visit_id:v.id, patient_id:v.patient_id, department_id:v.department_id });
      setConsult(cData);
      // Load existing data
      var rx = await api.get('/consultations/'+cData.id+'/prescriptions');
      setRxList(rx);
      var oi = await api.get('/consultations/'+cData.id+'/orders');
      setOrderItems(oi);
      if(cData.note_text) setNote(cData.note_text);
      if(cData.bp_systolic) setVt({bp:cData.bp_systolic+'/'+cData.bp_diastolic,temp:cData.temperature||'',pulse:cData.pulse||'',spo2:cData.spo2||'',rr:cData.respiratory_rate||''});
      // Load history
      var h = await api.get('/patients/'+v.patient_id+'/history');
      setHistory(h.filter(function(c){ return c.id !== cData.id; }));
    } catch(err){ console.error(err); }
  }

  async function openPast(h){
    var rx = [], oi = [];
    try { rx = await api.get('/consultations/'+h.id+'/prescriptions'); } catch(e){}
    try { oi = await api.get('/consultations/'+h.id+'/orders'); } catch(e){}
    setPastView({ c:h, rx:rx, orders:oi });
  }
  function closePast(){ setPastView(null); }

  function renderPast(){
    var c = pastView.c;
    var vrows = [
      ['BP', (c.bp_systolic!=null ? c.bp_systolic+'/'+(c.bp_diastolic!=null?c.bp_diastolic:'') : '\u2014')],
      ['BT', (c.temperature!=null ? c.temperature : '\u2014')],
      ['PR', (c.pulse!=null ? c.pulse : '\u2014')],
      ['RR', (c.respiratory_rate!=null ? c.respiratory_rate : '\u2014')],
      ['SpO2', (c.spo2!=null ? c.spo2 : '\u2014')]
    ];
    return <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'8px 12px',background:'#3b82f618',borderBottom:'1px solid #3b82f650',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize: 14,fontWeight:800,color:'#93c5fd'}}>{'\uD83D\uDCC5 '}{c.consult_date?c.consult_date.split('T')[0]:''} · {c.dept_code||''} · {c.doctor_name||''}</span>
        <span style={{fontSize: 12,color:'#fbbf24',fontWeight:700}}>{t.pastRecordRO}</span>
        <button onClick={closePast} style={{marginLeft:'auto',background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize: 13,fontWeight:800}}>{t.backToCurrent}</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:'10px 12px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
          {vrows.map(function(r){return <div key={r[0]} style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'5px 10px'}}><span style={{fontSize: 12,color:t3,fontWeight:700,marginRight:6}}>{r[0]}</span><span style={{fontSize: 15,color:tx,fontFamily:'monospace'}}>{r[1]}</span></div>;})}
        </div>
        <div style={{fontWeight:700,fontSize: 13,color:'#60a5fa',marginBottom:4}}>{t.consultNote}</div>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'10px 12px',color:'#cbd5e1',fontSize: 14,lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:14,minHeight:60}}>{c.note_text||c.subjective||'\u2014'}</div>
        <div style={{fontWeight:700,fontSize: 13,color:'#34d399',marginBottom:4}}>{t.orders}</div>
        <div style={{background:pn,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
          {((pastView.rx||[]).length===0 && (pastView.orders||[]).length===0) ? <div style={{padding:14,textAlign:'center',color:t3,fontSize: 13}}>{'\u2014'}</div> : null}
          {(pastView.rx||[]).map(function(rx,i){
            return <div key={'prx-'+i} style={{display:'flex',gap:8,padding:'6px 10px',borderBottom:'1px solid #1e2433',alignItems:'baseline'}}>
              <span style={{color:'#60a5fa',fontFamily:'monospace',fontSize: 12,fontWeight:700,width:64}}>{rx.drug_code}</span>
              <span style={{color:tx,fontSize: 14,flex:1}}>{rx.drug_name}</span>
              <span style={{color:t2,fontSize: 12}}>{rx.dose}×{rx.frequency}×{rx.days}d{rx.route?(' — '+rx.route):''}</span>
            </div>;
          })}
          {(pastView.orders||[]).map(function(o,i){
            return <div key={'po-'+i} style={{display:'flex',gap:8,padding:'6px 10px',borderBottom:'1px solid #1e2433',alignItems:'baseline'}}>
              <span style={{color:'#a78bfa',fontFamily:'monospace',fontSize: 12,fontWeight:700,width:64}}>{o.order_code}</span>
              <span style={{color:tx,fontSize: 14,flex:1}}>{o.order_name}</span>
              <span style={{color:t2,fontSize: 12}}>{o.worklist_status||''}</span>
            </div>;
          })}
        </div>
      </div>
    </div>;
  }

  async function saveNote(){
    if(!consult) return;
    var bpParts = (vt.bp||'').split('/');
    try {
      await api.put('/consultations/'+consult.id,{
        note_text: note,
        bp_systolic: parseInt(bpParts[0])||null,
        bp_diastolic: parseInt(bpParts[1])||null,
        temperature: parseFloat(vt.temp)||null,
        pulse: parseInt(vt.pulse)||null,
        spo2: parseInt(vt.spo2)||null,
        respiratory_rate: parseInt(vt.rr)||null,
      });
      alert(t.save + ' ✓');
    } catch(err){ alert('Error: '+err.message); }
  }

  async function completeConsult(){
    if(!consult) return;
    var bpParts = (vt.bp||'').split('/');
    try {
      // 완료 전에 노트·바이탈을 먼저 저장 (저장을 안 누르고 완료해도 날아가지 않게)
      await api.put('/consultations/'+consult.id,{
        note_text: note,
        bp_systolic: parseInt(bpParts[0])||null,
        bp_diastolic: parseInt(bpParts[1])||null,
        temperature: parseFloat(vt.temp)||null,
        pulse: parseInt(vt.pulse)||null,
        spo2: parseInt(vt.spo2)||null,
        respiratory_rate: parseInt(vt.rr)||null,
      });
      await api.put('/consultations/'+consult.id+'/complete');
      await loadData();
      setSel(null); setConsult(null);
      alert(t.completed + ' ✓');
    } catch(err){ alert('Error: '+err.message); }
  }

  // Drug / exam order autocomplete
  function itemText(it){ return ((it.code||it.order_code||it.drug_code||'')+' '+(it.name||it.order_name||it.drug_name||'')).toLowerCase(); }

  function buildOrderSuggestions(val, mode){
    var s=(val||'').toLowerCase();
    if(s.length<2) return [];
    var out=[];
    if(mode==='all'||mode==='drug'){
      out=out.concat(allDrugs.filter(function(d){return itemText(d).indexOf(s)>=0;}).slice(0,8).map(function(d){var n={};for(var k in d)n[k]=d[k];n.kind='drug';return n;}));
    }
    if(mode==='all'||mode==='exam'){
      out=out.concat(allOrderCodes.filter(function(o){return o.code_type!=='fee' && itemText(o).indexOf(s)>=0;}).slice(0,12).map(function(o){var n={};for(var k in o)n[k]=o[k];n.kind='order';return n;}));
    }
    return out.slice(0,12);
  }

  function handleOrderCodeChange(val){
    setOrderCode(val); setOSelIdx(-1);
    setOrderSugg(buildOrderSuggestions(val, orderMode));
  }

  function changeOrderMode(mode){
    setOrderMode(mode);
    setOrderSugg(buildOrderSuggestions(orderCode, mode));
  }

  function handleOrderCodeKey(e){
    if(e.key==='ArrowDown'){e.preventDefault();setOSelIdx(function(i){return Math.min(i+1,orderSugg.length-1)});}
    else if(e.key==='ArrowUp'){e.preventDefault();setOSelIdx(function(i){return Math.max(i-1,0)});}
    else if(e.key==='Enter'){
      e.preventDefault();
      var item = oSelIdx>=0&&orderSugg[oSelIdx] ? orderSugg[oSelIdx] : orderSugg[0];
      if(item){ if(item.kind==='order') addExamOrder(item); else addDrugRx(item); }
    }
    else if(e.key==='Escape'){setOrderSugg([]);setOrderCode('');}
  }

  async function addDrugRx(drug){
    if(!consult) return;
    try {
      var rx = await api.post('/consultations/'+consult.id+'/prescriptions',{
        drug_id:drug.id, drug_code:drug.code, drug_name:drug.name,
        dose:drug.default_dose, frequency:drug.default_freq, days:drug.default_days,
        route:drug.default_route || 'TID', unit_price:drug.unit_price,
        memo: drug.unit || '',
        total_qty: (parseFloat(drug.default_dose)||1)*(drug.default_freq||1)*(drug.default_days||1),
      });
      setRxList(function(p){ return p.concat([rx]); });
      setOrderCode(''); setOrderSugg([]); setOSelIdx(-1);
    } catch(err){ alert('Error: '+err.message); }
  }

  async function removeRx(rxId){
    try {
      await api.del('/consultations/prescription/'+rxId);
      setRxList(function(p){ return p.filter(function(r){return r.id!==rxId}); });
    } catch(err){ alert(err.message); }
  }

  function updateRxLocal(rxId, key, val){
    setRxList(function(list){ return list.map(function(r){ if(r.id!==rxId) return r; var n={}; for(var k in r)n[k]=r[k]; n[key]=val; return n; }); });
  }

  async function saveRx(rx){
    try {
      var dose = rx.dose || '1';
      var freq = parseInt(rx.frequency) || 1;
      var days = parseInt(rx.days) || 1;
      var updated = await api.put('/consultations/prescription/'+rx.id, {
        dose: dose,
        frequency: freq,
        days: days,
        route: rx.route || '',
        memo: rx.memo || '',
        unit_price: rx.unit_price,
        total_qty: (parseFloat(dose)||0) * freq * days
      });
      setRxList(function(list){ return list.map(function(r){ return r.id===rx.id ? updated : r; }); });
    } catch(err){ alert('Error: '+err.message); }
  }

  function updateOrderLocal(orderId, key, val){
    setOrderItems(function(list){ return list.map(function(o){ if(o.id!==orderId) return o; var n={}; for(var k in o)n[k]=o[k]; n[key]=val; return n; }); });
  }

  async function saveOrder(o){
    try {
      var updated = await api.put('/consultations/order/'+o.id, {
        dose: o.dose || '',
        frequency: parseInt(o.frequency) || 1,
        days: parseInt(o.days) || 1,
        quantity: o.quantity || 1,
        memo: o.memo || '',
        unit_price: o.unit_price
      });
      setOrderItems(function(list){ return list.map(function(x){ return x.id===o.id ? updated : x; }); });
    } catch(err){ alert('Error: '+err.message); }
  }


  async function addExamOrder(oc){
    if(!consult) return;
    try {
      var item = await api.post('/consultations/'+consult.id+'/orders',{
        order_code_id:oc.id, order_code:oc.code, order_name:oc.name, code_type:oc.code_type,
        dose:oc.default_dose, frequency:oc.default_freq, days:oc.default_days,
        quantity:1, unit_price:oc.price_clinic || oc.price || 0, memo:oc.memo || ''
      });
      setOrderItems(function(p){ return p.concat([item]); });
      setOrderCode(''); setOrderSugg([]); setOSelIdx(-1);
    } catch(err){ alert('Error: '+err.message); }
  }

  // 약속처방 세트 적용: 세트 항목을 현재 진료에 한 번에 추가
  async function applySet(set){
    if(!consult){ alert(t.selectPatientLeft); return; }
    if(pastView) setPastView(null);
    var items = (set && set.items) ? set.items : [];
    for(var i=0;i<items.length;i++){
      var it = items[i];
      if(it.kind==='order'){
        await addExamOrder({ id:it.order_code_id, code:it.code, name:it.name, code_type:it.order_code_type,
          default_dose:it.dose, default_freq:it.frequency, default_days:it.days,
          price_clinic:it.unit_price, price:it.unit_price, memo:'' });
      } else {
        await addDrugRx({ id:it.drug_id, code:it.code, name:it.name,
          default_dose:it.dose, default_freq:it.frequency, default_days:it.days,
          default_route:it.route, unit_price:it.unit_price, unit:'' });
      }
    }
  }

  function osGrouped(){
    var groups={}, order=[];
    (orderSets||[]).forEach(function(s){
      var g = s.group_name || '\u0000';
      if(!groups[g]){ groups[g]=[]; order.push(g); }
      groups[g].push(s);
    });
    return order.map(function(g){ return { group: g==='\u0000'?'':g, sets:groups[g] }; });
  }
  function toggleGroup(g){ setExpGroups(function(p){ var n=Object.assign({},p); n[g]=!n[g]; return n; }); }

  async function removeOrder(orderId){
    try {
      await api.del('/consultations/order/'+orderId);
      setOrderItems(function(p){ return p.filter(function(o){return o.id!==orderId}); });
    } catch(err){ alert(err.message); }
  }

  function insertPhrase(text){ setNote(function(prev){ return prev?(prev+'\n'+text):text; }); }
  function uvt(k,v){ setVt(function(o){var n={};for(var x in o)n[x]=o[x];n[k]=v;return n;}); }

  var filteredQueue = useMemo(function(){
    var r=visits;
    if(qTab==='waiting') r=r.filter(function(v){return v.status==='waiting'||v.status==='registered'||v.status==='in_progress';});
    else if(qTab==='completed') r=r.filter(function(v){return v.status==='completed';});
    if(user&&user.role==='doctor'&&user.id) r=r.filter(function(v){return !v.doctor_id||v.doctor_id===user.id;});
    if(qFilter){var s=qFilter.toLowerCase();r=r.filter(function(v){return (v.first_name+' '+v.last_name).toLowerCase().indexOf(s)>=0||v.chart_no.indexOf(s)>=0;});}
    return r;
  },[visits,qTab,qFilter,user]);

  var waitingCount = useMemo(function(){
    var r=visits.filter(function(v){return v.status==='waiting'||v.status==='registered'||v.status==='in_progress';});
    if(user&&user.role==='doctor'&&user.id) r=r.filter(function(v){return !v.doctor_id||v.doctor_id===user.id;});
    return r.length;
  },[visits,user]);

  var filteredPhrases = useMemo(function(){
    var r=phrases;
    if(phraseCat!=='All') r=r.filter(function(p){return p.category===phraseCat;});
    if(phraseQ){var s=phraseQ.toLowerCase();r=r.filter(function(p){return p.text.toLowerCase().indexOf(s)>=0;});}
    return r;
  },[phrases,phraseCat,phraseQ]);

  var drugResults = useMemo(function(){
    if(!drugQ) return allDrugs;
    var s=drugQ.toLowerCase();
    return allDrugs.filter(function(d){return d.name.toLowerCase().indexOf(s)>=0||d.code.toLowerCase().indexOf(s)>=0;});
  },[allDrugs,drugQ]);

  var SC={waiting:'#3b82f6',registered:'#3b82f6',in_progress:'#f59e0b',completed:'#10b981'};
  var bd='#232838',bd2='#2a3142',scBg='#1a1f2e',pn='#13161f',tx='#e2e8f0',t2='#94a3b8',t3='#64748b';

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'#0f1117',color:tx,minHeight:'100vh',fontSize: 15,position:'relative',overflow:'hidden'}}>
      <TopBar />

      {/* Patient bar */}
      {sel?(
        <div style={{background:'#0c2d6b',borderBottom:'1px solid #1e4fa0',padding:'5px 12px',display:'flex',alignItems:'center',gap:14,fontSize: 14,flexWrap:'wrap'}}>
          <button onClick={function(){setHistOpen(true)}} style={{background:'#1e4fa0',color:'#dbeafe',border:'1px solid #3b6fd0',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📋 {t.outpatientHistory}</button>
          <button onClick={function(){setDocOpen(true)}} style={{background:'#0f766e',color:'#ccfbf1',border:'1px solid #14b8a6',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📄 {t.documents}</button>
          <button onClick={function(){setLabOpen(true)}} style={{background:'#0e7490',color:'#cffafe',border:'1px solid #06b6d4',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>🧪 {t.labResultsTitle||'검사결과'}</button>
          <button onClick={function(){setReadingsOpen(true)}} style={{background:'#5b21b6',color:'#ede9fe',border:'1px solid #8b5cf6',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>🩻 {t.reading||'판독소견'}</button>
          <button onClick={function(){setChartOpen(true)}} style={{background:'#7c3aed',color:'#ede9fe',border:'1px solid #a855f7',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📋 {t.chartRecord||'차트기록'}</button>
          <span style={{color:'#93c5fd',fontWeight:700,fontFamily:'monospace'}}>{sel.chart_no}</span>
          <span style={{color:'#fff',fontWeight:700,fontSize: 15}}>{sel.last_name} {sel.first_name}</span>
          <span style={{color:'#bfdbfe'}}>{sel.gender}/{sel.date_of_birth?sel.date_of_birth.split('T')[0]:''}</span>
          <span style={{background:'#1e3a5f',borderRadius:3,padding:'1px 6px',color:'#93c5fd',fontWeight:600,fontSize: 13}}>{sel.dept_code}</span>
          {sel.allergies&&sel.allergies!=='None'?<span style={{background:'#dc2626',color:'#fff',borderRadius:3,padding:'2px 8px',fontSize: 12,fontWeight:700}}>⚠ {sel.allergies}</span>:null}
          {sel.reception_memo?<span style={{background:'#f59e0b30',color:'#fbbf24',borderRadius:3,padding:'2px 6px',fontSize: 12}}>📝 {sel.reception_memo}</span>:null}
        </div>
      ):null}

      <div style={{display:'flex',height:sel?'calc(100vh - 120px)':'calc(100vh - 82px)',position:'relative'}}>

        {/* Slide-out queue */}
        <div style={{position:'absolute',left:0,top:0,bottom:0,width:280,background:pn,borderRight:'1px solid '+bd,zIndex:20,transform:queueOpen?'translateX(0)':'translateX(-290px)',transition:'transform 0.25s ease',display:'flex',flexDirection:'column',boxShadow:queueOpen?'4px 0 20px rgba(0,0,0,0.5)':'none'}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid '+bd,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['waiting','completed'].map(function(k){
              var c=k==='waiting'?'#3b82f6':'#10b981';
              return <button key={k} onClick={function(){setQTab(k)}} style={{flex:1,background:qTab===k?c+'18':'transparent',color:qTab===k?c:t3,border:qTab===k?'1px solid '+c+'40':'1px solid transparent',borderRadius:4,padding:'3px 6px',cursor:'pointer',fontSize: 12,fontWeight:600}}>{t[k]||k}</button>;
            })}
          </div>
          <div style={{padding:'5px 8px',borderBottom:'1px solid '+bd}}>
            <input value={qFilter} onChange={function(e){setQFilter(e.target.value)}} placeholder={t.search} style={{background:scBg,border:'1px solid '+bd2,borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {filteredQueue.map(function(v){
              var isSel=sel&&sel.id===v.id;
              var sc2=SC[v.status]||t2;
              return <div key={v.id} onClick={function(){pickPatient(v)}} style={{padding:'7px 10px',cursor:'pointer',borderBottom:'1px solid #1e2433',background:isSel?'#3b82f612':'transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:1}}>
                  <span style={{fontWeight:600,fontSize: 14,color:'#f1f5f9'}}>{v.last_name} {v.first_name}</span>
                  <span style={{background:sc2+'18',color:sc2,borderRadius:3,padding:'0 4px',fontSize: 11,fontWeight:600}}>{v.status}</span>
                </div>
                <div style={{fontSize: 12,color:t2}}>{v.chart_no} · {v.dept_code||''} · {v.doctor_name||''}</div>
                <div style={{fontSize: 12,color:t3,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.chief_complaint||''}</div>
              </div>;
            })}
          </div>
        </div>
        {queueOpen?<div onClick={function(){setQueueOpen(false)}} style={{position:'absolute',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.3)',zIndex:15}}></div>:null}

        {/* LEFT: Dx + Orders */}
        <div style={{width:'42%',borderRight:'1px solid '+bd,display:'flex',flexDirection:'column',overflow:'hidden',background:'#11141c'}}>
          {/* Queue toggle */}
          <div style={{padding:'4px 10px',borderBottom:'1px solid '+bd,background:scBg,display:'flex',gap:6}}>
            <button onClick={function(){var willOpen=!queueOpen; setQueueOpen(willOpen); if(willOpen){ api.get('/visits/today').then(function(v){setVisits(v);}).catch(function(){}); }}} style={{background:queueOpen?'#3b82f620':'#1e2433',color:queueOpen?'#60a5fa':t2,border:queueOpen?'1px solid #3b82f640':'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>
              {queueOpen?'✕':'☰'} {t.patientQueue} ({waitingCount})
            </button>
            <button onClick={function(){setFinderOpen(true)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:13,fontWeight:600}}>🔍 {t.findPatient}</button>
          </div>

          {pastView?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize: 14,fontStyle:'italic',textAlign:'center',padding:20,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{t.viewingPast}</div>
          ):consult?(
            <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
              {/* Orders */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{padding:'5px 10px',background:scBg,display:'flex',justifyContent:'space-between',borderBottom:'1px solid '+bd,alignItems:'center'}}>
                  <span style={{fontWeight:700,fontSize: 14,color:tx}}>{t.orders}</span>
                  <button onClick={function(){setDrugModal(true)}} style={{background:'#10b98120',color:'#34d399',border:'1px solid #10b98140',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 12,fontWeight:600}}>+ {t.drugSearch}</button>
                </div>
                {/* Code input */}
                <div style={{padding:'5px 10px',borderBottom:'1px solid '+bd,position:'relative'}}>
                  <div style={{display:'flex',gap:4,marginBottom:5}}>
                    {[['all',t.all],['drug',t.drug],['exam',t.examImaging]].map(function(m){
                      return <button key={m[0]} onClick={function(){changeOrderMode(m[0])}} style={{background:orderMode===m[0]?'#3b82f620':'#0f1117',color:orderMode===m[0]?'#60a5fa':t3,border:orderMode===m[0]?'1px solid #3b82f640':'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11,fontWeight:700}}>{m[1]}</button>;
                    })}
                  </div>
                  <input value={orderCode} onChange={function(e){handleOrderCodeChange(e.target.value)}} onKeyDown={handleOrderCodeKey}
                    placeholder={t.typeOrderPlaceholder}
                    style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:4,padding:'5px 8px',color:'#60a5fa',fontSize: 14,fontWeight:600,fontFamily:'monospace',outline:'none',width:'100%',boxSizing:'border-box'}}/>
                  {orderSugg.length>0?(
                    <div style={{position:'absolute',left:10,right:10,top:'100%',background:'#1a1f2e',border:'1px solid '+bd,borderRadius:6,zIndex:30,maxHeight:230,overflow:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
                      {orderSugg.map(function(d,i){
                        var isOrder=d.kind==='order';
                        return <div key={d.kind+'-'+d.id} onClick={function(){isOrder?addExamOrder(d):addDrugRx(d)}} style={{padding:'5px 10px',cursor:'pointer',display:'flex',gap:6,background:i===oSelIdx?'#3b82f620':'transparent',borderBottom:'1px solid #232838'}}
                          onMouseEnter={function(){setOSelIdx(i)}}>
                          <span style={{fontSize: 11,color:isOrder?'#fbbf24':'#34d399',fontWeight:800,width:34}}>{isOrder?(d.pacs_modality||d.code_type||'ORD'):'DRUG'}</span>
                          <span style={{fontFamily:'monospace',fontSize: 13,color:'#60a5fa',fontWeight:700,width:55}}>{d.code}</span>
                          <span style={{fontSize: 13,color:tx,flex:1}}>{d.name}</span>
                          <span style={{fontSize: 12,color:isOrder?'#fbbf24':'#f59e0b',fontWeight:600}}>{isOrder?(d.worklist_enabled?'WL':''):(d.default_route||'')}</span>
                        </div>;
                      })}
                    </div>
                  ):null}
                </div>
                <div style={{flex:1,overflow:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize: 15}}>
                    <thead><tr style={{background:'#1e2433',position:'sticky',top:0}}>
                      <th style={{padding:'5px 6px',color:t3,fontSize: 12,width:24}}></th>
                      <th style={{padding:'5px 6px',textAlign:'left',color:t3,fontSize: 12,width:72}}>{t.code}</th>
                      <th style={{padding:'5px 6px',textAlign:'left',color:t3,fontSize: 12}}>{t.name}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:58}}>{t.qty}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:52}}>{t.tms}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:52}}>{t.day}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:70}}>{t.usage}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:64}}>{t.unit}</th>
                      <th style={{padding:'5px 6px',textAlign:'center',color:t3,fontSize: 12,width:55}}>{t.worklist}</th>
                    </tr></thead>
                    <tbody>
                      {rxList.map(function(rx){
                        var inStyle={background:'#0f1117',border:'1px solid #2a3142',borderRadius:4,padding:'3px 4px',color:tx,fontSize:14,width:'100%',boxSizing:'border-box',textAlign:'center'};
                        return <tr key={'rx-'+rx.id} style={{borderBottom:'1px solid #1e2433'}}>
                          <td style={{padding:'3px 5px'}}><span onClick={function(){removeRx(rx.id)}} style={{cursor:'pointer',color:'#f87171',fontSize: 14}}>✕</span></td>
                          <td style={{padding:'3px 5px',color:'#60a5fa',fontFamily:'monospace',fontSize: 13,fontWeight:700}}>{rx.drug_code}</td>
                          <td style={{padding:'3px 5px',color:tx,fontSize: 15}}>{rx.drug_name}</td>
                          <td style={{padding:'3px 4px'}}><input value={rx.dose || ''} onChange={function(e){updateRxLocal(rx.id,'dose',e.target.value)}} onBlur={function(){saveRx(rx)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input type="number" min="1" value={rx.frequency || 1} onChange={function(e){updateRxLocal(rx.id,'frequency',e.target.value)}} onBlur={function(){saveRx(rx)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input type="number" min="1" value={rx.days || 1} onChange={function(e){updateRxLocal(rx.id,'days',e.target.value)}} onBlur={function(){saveRx(rx)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input value={rx.route || ''} onChange={function(e){updateRxLocal(rx.id,'route',e.target.value)}} onBlur={function(){saveRx(rx)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input value={rx.memo || ''} onChange={function(e){updateRxLocal(rx.id,'memo',e.target.value)}} onBlur={function(){saveRx(rx)}} style={inStyle}/></td>
                          <td style={{padding:'3px 5px',textAlign:'center',color:'#34d399',fontSize: 12,fontWeight:700}}></td>
                        </tr>;
                      })}
                      {orderItems.map(function(o){
                        var inStyle={background:'#0f1117',border:'1px solid #2a3142',borderRadius:4,padding:'3px 4px',color:tx,fontSize:14,width:'100%',boxSizing:'border-box',textAlign:'center'};
                        return <tr key={'oi-'+o.id} style={{borderBottom:'1px solid #1e2433'}}>
                          <td style={{padding:'3px 5px'}}><span onClick={function(){removeOrder(o.id)}} style={{cursor:'pointer',color:'#f87171',fontSize: 14}}>✕</span></td>
                          <td style={{padding:'3px 5px',color:'#60a5fa',fontFamily:'monospace',fontSize: 13,fontWeight:700}}>{o.order_code}</td>
                          <td style={{padding:'3px 5px',color:tx,fontSize: 15}}>{o.order_name}</td>
                          <td style={{padding:'3px 4px'}}><input value={o.quantity || 1} onChange={function(e){updateOrderLocal(o.id,'quantity',e.target.value)}} onBlur={function(){saveOrder(o)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input type="number" min="1" value={o.frequency || 1} onChange={function(e){updateOrderLocal(o.id,'frequency',e.target.value)}} onBlur={function(){saveOrder(o)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input type="number" min="1" value={o.days || 1} onChange={function(e){updateOrderLocal(o.id,'days',e.target.value)}} onBlur={function(){saveOrder(o)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input value={o.dose || ''} onChange={function(e){updateOrderLocal(o.id,'dose',e.target.value)}} onBlur={function(){saveOrder(o)}} style={inStyle}/></td>
                          <td style={{padding:'3px 4px'}}><input value={o.memo || o.body_part || ''} onChange={function(e){updateOrderLocal(o.id,'memo',e.target.value)}} onBlur={function(){saveOrder(o)}} style={inStyle}/></td>
                          <td style={{padding:'3px 5px',textAlign:'center',fontSize: 12,fontWeight:700,whiteSpace:'nowrap'}}>
                            {(o.code_type==='imaging'||o.pacs_modality)?<button onClick={function(){openViewer(o.id)}} title={t.viewImage||'영상보기'} style={{background:'#7c3aed22',color:'#a78bfa',border:'1px solid #7c3aed55',borderRadius:4,padding:'1px 7px',cursor:'pointer',fontSize: 13,fontWeight:700,marginRight:4}}>🖼</button>:null}
                            <span style={{color:o.worklist_status==='sent'?'#34d399':t2}}>{o.worklist_status}</span>
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ):<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',fontSize: 16,fontStyle:'italic'}}>{t.selectPatientLeft}</div>}
        </div>

        {/* CENTER: Vitals + Note + Phrases */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#11141c',borderRight:'1px solid '+bd}}>
          {pastView?renderPast():consult?(
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {/* Vitals */}
              <div style={{padding:'8px 10px',borderBottom:'1px solid '+bd,display:'flex',gap:10,alignItems:'stretch',background:scBg}}>
                <div style={{flex:1,minWidth:0,display:'grid',gridTemplateColumns:'repeat(2, minmax(0, 1fr))',gap:'6px 8px'}}>
                  {[
                    ['bp','BP','??/??'],
                    ['temp','BT','??.?'],
                    ['pulse','PR','??'],
                    ['rr','RR','??'],
                    ['spo2','SpO2','??']
                  ].map(function(item){
                    return <div key={item[0]} style={{display:'grid',gridTemplateColumns:'52px minmax(0, 1fr)',alignItems:'center',gap:5}}>
                      <span style={{fontSize: 13,color:item[0]==='bp'?'#f59e0b':t3,fontWeight:800}}>{item[1]}</span>
                      <input value={vt[item[0]]} onChange={function(e){uvt(item[0],e.target.value)}} placeholder={item[2]} style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'5px 7px',color:tx,fontSize: 15,width:'100%',textAlign:'center',fontFamily:'monospace',boxSizing:'border-box',outline:'none'}}/>
                    </div>;
                  })}
                </div>
                <div style={{width:118,flexShrink:0,display:'flex',flexDirection:'column',gap:6,justifyContent:'center'}}>
                  <button onClick={saveNote} style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',border:'none',borderRadius:5,padding:'7px 10px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.save}</button>
                  <button onClick={completeConsult} style={{background:'#10b98120',color:'#34d399',border:'1px solid #10b98140',borderRadius:5,padding:'7px 10px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.completed}</button>
                </div>
              </div>
              {/* Note */}
              <div style={{padding:'4px 10px',background:scBg,borderBottom:'1px solid '+bd}}>
                <span style={{fontWeight:700,fontSize: 13,color:tx}}>{t.consultNote}</span>
              </div>
              <div style={{flex:1,padding:'6px 10px',minHeight:0}}>
                <textarea value={note} onChange={function(e){setNote(e.target.value)}} placeholder="S: Chief complaint...\nO: Examination...\nA: Assessment...\nP: Plan..."
                  style={{width:'100%',height:'100%',background:scBg,border:'1px solid '+bd2,borderRadius:5,padding:'8px 10px',color:tx,fontSize: 14,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box',lineHeight:1.7}}/>
              </div>
              {/* Phrase dict */}
              <div style={{borderTop:'1px solid '+bd,height:'30%',minHeight:100,display:'flex',flexDirection:'column'}}>
                <div style={{padding:'4px 10px',background:scBg,borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{fontWeight:700,fontSize: 13,color:'#f59e0b'}}>{t.phraseDict}</span>
                  {['All','General','Internal','Surgery','Peds','OBGYN'].map(function(c){
                    return <button key={c} onClick={function(){setPhraseCat(c)}} style={{background:phraseCat===c?'#f59e0b20':'transparent',color:phraseCat===c?'#fbbf24':t3,border:'none',borderRadius:3,padding:'1px 5px',cursor:'pointer',fontSize: 11,fontWeight:600}}>{c}</button>;
                  })}
                  <input value={phraseQ} onChange={function(e){setPhraseQ(e.target.value)}} placeholder={t.search} style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',color:tx,fontSize: 12,outline:'none',marginLeft:'auto',width:120,boxSizing:'border-box'}}/>
                </div>
                <div style={{flex:1,overflow:'auto'}}>
                  {filteredPhrases.map(function(p){
                    return <div key={p.id} onClick={function(){insertPhrase(p.text)}} style={{padding:'4px 10px',cursor:'pointer',borderBottom:'1px solid #1e2433',display:'flex',gap:6}}
                      onMouseEnter={function(e){e.currentTarget.style.background='#ffffff06'}}
                      onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                      <span style={{background:'#f59e0b20',color:'#fbbf24',borderRadius:2,padding:'0 4px',fontSize: 11,fontWeight:600,flexShrink:0}}>{p.category}</span>
                      <span style={{fontSize: 13,color:'#cbd5e1'}}>{p.text}</span>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          ):null}
        </div>

        {/* RIGHT: Patient Chart */}
        <div style={{width:'28%',display:'flex',flexDirection:'column',overflow:'hidden',background:pn}}>
          <div style={{display:'flex',borderBottom:'1px solid '+bd,background:scBg}}>
            <button onClick={function(){setRightTab('past')}} style={{flex:1,background:rightTab==='past'?'#3b82f618':'transparent',color:rightTab==='past'?'#60a5fa':t3,border:'none',borderBottom:rightTab==='past'?'2px solid #3b82f6':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:13,fontWeight:800}}>{t.pastVisits}</button>
            <button onClick={function(){setRightTab('sets')}} style={{flex:1,background:rightTab==='sets'?'#10b98118':'transparent',color:rightTab==='sets'?'#34d399':t3,border:'none',borderBottom:rightTab==='sets'?'2px solid #10b981':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:13,fontWeight:800}}>{t.orderSets}</button>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'6px 8px'}}>
            {rightTab==='past'?(
              sel?(
                history.length>0?history.map(function(h,i){
                var active = pastView && pastView.c && pastView.c.id===h.id;
                return <div key={i} onClick={function(){openPast(h)}} style={{background:active?'#3b82f615':scBg,borderRadius:5,padding:'8px 10px',marginBottom:6,border:'1px solid '+(active?'#3b82f650':bd),borderLeft:active?'3px solid #3b82f6':'3px solid transparent',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontFamily:'monospace',fontSize: 13,color:'#60a5fa',fontWeight:700}}>{h.consult_date?h.consult_date.split('T')[0]:''}</span>
                    <span style={{fontSize: 12,color:t2}}>{h.dept_code||''}</span>
                    <span style={{fontSize: 12,color:t2,marginLeft:'auto'}}>{h.doctor_name||''}</span>
                  </div>
                  <div style={{fontSize: 13,color:'#94a3b8',lineHeight:1.5,whiteSpace:'pre-wrap',maxHeight:38,overflow:'hidden'}}>{h.note_text||h.subjective||'\u2014'}</div>
                </div>;
              }):<div style={{padding:20,textAlign:'center',color:'#334155',fontSize: 14,fontStyle:'italic'}}>{t.noHistory}</div>
            ):<div style={{padding:20,textAlign:'center',color:'#334155',fontSize: 14,fontStyle:'italic'}}>{t.selectPatientLeft}</div>
            ):(
              orderSets.length>0?osGrouped().map(function(grp,gi){
                var gkey = grp.group||'\u0000';
                var open = !!expGroups[gkey];
                return <div key={gi} style={{marginBottom:6}}>
                  <div onClick={function(){toggleGroup(gkey)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 8px',cursor:'pointer',background:'#1a1f2e',borderRadius:5,border:'1px solid '+bd}}>
                    <span style={{fontSize:11,color:t2,width:10}}>{open?'\u25be':'\u25b8'}</span>
                    <span style={{fontSize:13}}>📁</span>
                    <span style={{fontSize:13,fontWeight:800,color:'#e2e8f0'}}>{grp.group||t.ungrouped}</span>
                    <span style={{fontSize:11,color:t3,marginLeft:'auto'}}>{grp.sets.length}</span>
                  </div>
                  {open?<div style={{padding:'4px 0 2px 10px'}}>
                    {grp.sets.map(function(s){
                      return <div key={s.id} onClick={function(){applySet(s)}} title={t.applySetHint} style={{background:scBg,borderRadius:5,padding:'7px 9px',marginBottom:5,border:'1px solid '+bd,borderLeft:'3px solid #10b981',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:800,color:'#34d399'}}>{s.name}</span>
                          {s.dept_code?<span style={{fontSize:11,color:t2}}>{s.dept_code}</span>:null}
                          <span style={{fontSize:11,color:t3,marginLeft:'auto'}}>{(s.items||[]).length} {t.itemsUnit}</span>
                        </div>
                        <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.5,whiteSpace:'pre-wrap',maxHeight:38,overflow:'hidden'}}>{(s.items||[]).map(function(it){return it.code;}).join(', ')||'\u2014'}</div>
                      </div>;
                    })}
                  </div>:null}
                </div>;
              }):<div style={{padding:20,textAlign:'center',color:'#334155',fontSize: 14,fontStyle:'italic'}}>{t.noOrderSets}</div>
            )}
          </div>
        </div>
      </div>

      {/* Drug search modal */}
      {drugModal?(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1a1f2e',borderRadius:10,border:'1px solid '+bd,width:500,maxHeight:'70vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid '+bd,display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,fontSize: 15,color:tx}}>{t.drugSearch}</span>
              <button onClick={function(){setDrugModal(false);setDrugQ('')}} style={{background:'transparent',border:'none',color:t2,cursor:'pointer',fontSize: 18}}>✕</button>
            </div>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd}}>
              <input value={drugQ} onChange={function(e){setDrugQ(e.target.value)}} placeholder={t.search} autoFocus style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'7px 10px',color:tx,fontSize: 14,outline:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div style={{flex:1,overflow:'auto',maxHeight:300}}>
              {drugResults.map(function(d){
                return <div key={d.id} onClick={function(){addDrugRx(d);setDrugModal(false);setDrugQ('')}} style={{padding:'7px 14px',cursor:'pointer',borderBottom:'1px solid #1e2433',display:'flex',gap:8}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ffffff08'}}
                  onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                  <span style={{fontFamily:'monospace',fontSize: 13,color:'#60a5fa',fontWeight:600,width:60}}>{d.code}</span>
                  <span style={{fontSize: 14,color:tx,flex:1}}>{d.name}</span>
                  <span style={{fontSize: 12,color:'#f59e0b',fontWeight:600}}>{d.default_route}</span>
                </div>;
              })}
            </div>
          </div>
        </div>
      ):null}
      <PatientFinder open={finderOpen} onClose={function(){setFinderOpen(false)}} mode="visit"
        onPickVisit={function(v){ pickPatient(v); }} />
      <PatientFinder open={histOpen} onClose={function(){setHistOpen(false)}} mode="visit"
        initialPatient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name } : null}
        onPickVisit={function(v){ pickPatient(v); }} />
      <DocumentModal open={docOpen} onClose={function(){setDocOpen(false)}} category="document"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.id:null, consultation_id: consult?consult.id:null, dept_code: sel?sel.dept_code:'', doctor_name: sel?sel.doctor_name:'', note: note, meds: rxList }} />
      <DocumentModal open={chartOpen} onClose={function(){setChartOpen(false)}} category="chart"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.id:null, consultation_id: consult?consult.id:null, dept_code: sel?sel.dept_code:'', doctor_name: sel?sel.doctor_name:'', note: note, meds: rxList }} />
      {labOpen && sel ? (
        <div onClick={function(){setLabOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'90vw',height:'88vh',background:'#0f1117',border:'1px solid #2a3142',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid #2a3142',background:'#1a1f2e'}}>
              <span style={{fontWeight:800,fontSize:15,color:'#67e8f9'}}>🧪 {t.labResultsTitle||'검사결과'}</span>
              <span style={{color:'#94a3b8',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setLabOpen(false)}} style={{marginLeft:'auto',background:'#374151',color:'#e2e8f0',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><LabResults patientId={sel.patient_id} /></div>
          </div>
        </div>
      ) : null}
      {viewer ? (
        <div onClick={function(){setViewer(null)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1001,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'94vw',height:'92vh',background:'#0f1117',border:'1px solid #2a3142',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid #2a3142',background:'#1a1f2e'}}>
              <span style={{fontWeight:800,fontSize:15,color:'#a78bfa'}}>🖼 {t.imageViewer||'영상 뷰어'}</span>
              <span style={{color:'#cbd5e1',fontSize:14,fontWeight:700}}>{viewer.order_name}</span>
              {sel?<span style={{color:'#94a3b8',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>:null}
              {viewer.url?<a href={viewer.url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',background:'#1e2433',color:'#a78bfa',border:'1px solid #2a3142',borderRadius:5,padding:'6px 12px',cursor:'pointer',fontSize:13,fontWeight:700,textDecoration:'none'}}>{t.openNewTab||'새 탭에서 열기'} ↗</a>:<div style={{marginLeft:'auto'}}></div>}
              <button onClick={function(){setViewer(null)}} style={{background:'#374151',color:'#e2e8f0',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,display:'flex',overflow:'hidden'}}>
              {viewer.url
                ? <iframe src={viewer.url} title="PACS Viewer" style={{flex:1,border:0,background:'#000'}}></iframe>
                : <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',fontSize:14,textAlign:'center',padding:20,background:'#000'}}>{t.noViewerUrl||'PACS 뷰어 주소가 설정되지 않았습니다 (설정 → 오더연동 → PACS 웹/뷰어 주소). 영상 없이 판독만 입력할 수 있습니다.'}</div>}
              <div style={{width:380,borderLeft:'1px solid #2a3142',background:'#11141c',display:'flex',flexDirection:'column',padding:12,boxSizing:'border-box'}}>
                <div style={{fontWeight:800,fontSize:15,color:'#a78bfa',marginBottom:6}}>🩻 {t.reading||'판독소견'}</div>
                {viewer.reading&&viewer.reading.result_at?<div style={{fontSize:12,color:'#64748b',marginBottom:8}}>{t.lastReadBy||'판독'}: {viewer.reading.result_by_name||''} · {String(viewer.reading.result_at).split('T')[0]}</div>:null}
                {canRead ? <>
                  <textarea value={readText} onChange={function(e){setReadText(e.target.value)}} placeholder={t.readingPlaceholder||'판독 소견을 입력하세요...'} style={{flex:1,background:'#0f1117',border:'1px solid #2a3142',borderRadius:6,color:'#e2e8f0',fontSize:14,padding:10,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.6}}/>
                  <button onClick={saveReading} style={{marginTop:10,background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:6,padding:'9px',cursor:'pointer',fontSize:14,fontWeight:800}}>💾 {t.saveReading||'판독 저장'}</button>
                </> : <div style={{flex:1,whiteSpace:'pre-wrap',fontSize:14,color:'#cbd5e1',lineHeight:1.6,overflow:'auto'}}>{readText||<span style={{color:'#475569'}}>{t.noReading||'판독 소견 없음'}</span>}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {readingsOpen && sel ? (
        <div onClick={function(){setReadingsOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'88vw',height:'86vh',background:'#0f1117',border:'1px solid #2a3142',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid #2a3142',background:'#1a1f2e'}}>
              <span style={{fontWeight:800,fontSize:15,color:'#a78bfa'}}>🩻 {t.reading||'판독소견'}</span>
              <span style={{color:'#94a3b8',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setReadingsOpen(false)}} style={{marginLeft:'auto',background:'#374151',color:'#e2e8f0',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><RadiologyReadings patientId={sel.patient_id} onOpen={function(oid){ setReadingsOpen(false); openViewer(oid); }} /></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
