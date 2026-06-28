import { useState, useEffect, useMemo } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { MODULES, defaultPermsForRole } from '../modules.js';

export default function SettingsPage() {
  var langCtx = useLang(); var t = langCtx.t;
  var tabs = useState('staff'), activeTab = tabs[0], setTab = tabs[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var stS = useState([]), staff = stS[0], setStaff = stS[1];
  var drS = useState([]), drugs = drS[0], setDrugs = drS[1];
  var ocS = useState([]), orderCodes = ocS[0], setOrderCodes = ocS[1];
  var phS = useState([]), phrases = phS[0], setPhrases = phS[1];
  var dpS = useState([]), depts = dpS[0], setDepts = dpS[1];
  var edS = useState(null), editItem = edS[0], setEditItem = edS[1];
  var edT = useState(''), editType = edT[0], setEditType = edT[1];
  var toS = useState(''), toast = toS[0], setToast = toS[1];
  var dcS = useState('All'), drugCat = dcS[0], setDrugCat = dcS[1];
  var ocF = useState('All'), ocFilter = ocF[0], setOcFilter = ocF[1];
  var pcS = useState(null), pacsConfig = pcS[0], setPacsConfig = pcS[1];
  var ptS = useState({}), pacsTest = ptS[0], setPacsTest = ptS[1];
  var osS = useState([]), orderSets = osS[0], setOrderSets = osS[1];
  var oseS = useState(null), osEdit = oseS[0], setOsEdit = oseS[1];
  var osqS = useState(''), osQ = osqS[0], setOsQ = osqS[1];
  var oskS = useState('drug'), osKind = oskS[0], setOsKind = oskS[1];
  var osrS = useState([]), osResults = osrS[0], setOsResults = osrS[1];
  var clS = useState(null), clinic = clS[0], setClinic = clS[1];
  var lcS = useState(''), labCode = lcS[0], setLabCode = lcS[1];
  var liS = useState([]), labItems = liS[0], setLabItems = liS[1];
  var npS = useState(false), newPanelOpen = npS[0], setNewPanelOpen = npS[1];
  var npfS = useState({code:'',name:'',price:''}), newPanel = npfS[0], setNewPanel = npfS[1];
  var bkS = useState(null), backup = bkS[0], setBackup = bkS[1];
  var bkbS = useState(false), backupBusy = bkbS[0], setBackupBusy = bkbS[1];
  function fmtBytes(n){ n=Number(n)||0; if(n<1024)return n+' B'; if(n<1048576)return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }

  useEffect(function(){ loadAll(); },[]);
  useEffect(function(){ if(activeTab==='backup') loadBackup(); },[activeTab]);
  async function loadBackup(){ try { setBackup(await api.get('/backup/status')); } catch(e){ setBackup(null); } }
  async function runBackup(){ setBackupBusy(true); try { var r=await api.post('/backup/run',{}); showToast((t.backupDone||'백업 완료')+' · '+r.file); await loadBackup(); } catch(e){ alert((t.backupFail||'백업 실패')+': '+(e.message||'')); } setBackupBusy(false); }

  async function loadAll(){
    try {
      setStaff(await api.get('/admin/staff'));
      setDrugs(await api.get('/admin/drugs'));
      setOrderCodes(await api.get('/admin/order-codes'));
      setPhrases(await api.get('/admin/phrases'));
      setDepts(await api.get('/admin/departments'));
      setPacsConfig(await api.get('/pacs/config'));
      try { setClinic(await api.get('/admin/clinic')); } catch(e){}
      try { setOrderSets(await api.get('/order-sets')); } catch(e){ setOrderSets([]); }
    } catch(err){ console.error(err); }
  }

  function showToast(msg){ setToast(msg); setTimeout(function(){ setToast(''); },2000); }
  function openEdit(type, item){ setEditType(type); setEditItem(item ? JSON.parse(JSON.stringify(item)) : {}); }
  function closeEdit(){ setEditItem(null); setEditType(''); }
  function ue(k,v){ setEditItem(function(p){ var n=JSON.parse(JSON.stringify(p)); n[k]=v; return n; }); }
  function up(k,v){ setPacsConfig(function(p){ var n=Object.assign({},p||{}); n[k]=v; return n; }); }

  async function savePacs(){
    try {
      var saved = await api.put('/pacs/config', pacsConfig);
      setPacsConfig(saved);
      showToast(t.orderFeedSaved);
    } catch(err){ alert('Error: '+err.message); }
  }

  function uclin(k,v){ setClinic(function(p){ var n=Object.assign({},p||{}); n[k]=v; return n; }); }
  async function saveClinic(){
    try {
      var saved = await api.put('/admin/clinic', clinic||{});
      setClinic(saved);
      showToast(t.saved || 'Saved ✓');
    } catch(err){ alert('Error: '+err.message); }
  }

  function loadLabItems(codeId){
    setLabCode(codeId);
    if(!codeId){ setLabItems([]); return; }
    api.get('/lab/test-items?order_code_id='+codeId).then(function(r){ setLabItems((r||[]).map(function(x){return Object.assign({},x);})); }).catch(function(){ setLabItems([]); });
  }
  function uli(i,k,v){ setLabItems(function(p){ var n=p.slice(); n[i]=Object.assign({},n[i]); n[i][k]=v; return n; }); }
  function addLi(){ setLabItems(function(p){ return p.concat([{name:'',unit:'',ref_low:'',ref_high:'',ref_text:''}]); }); }
  function delLi(i){ setLabItems(function(p){ var n=p.slice(); n.splice(i,1); return n; }); }
  async function saveLabItems(){
    if(!labCode) return;
    try {
      var saved = await api.post('/lab/test-items/save', { order_code_id: labCode, items: labItems });
      setLabItems((saved||[]).map(function(x){return Object.assign({},x);}));
      showToast(t.saved || 'Saved ✓');
    } catch(err){ alert('Error: '+err.message); }
  }
  function unp(k,v){ setNewPanel(function(p){ var n=Object.assign({},p); n[k]=v; return n; }); }
  async function createPanel(){
    if(!newPanel.code || !newPanel.name){ alert((t.code||'Code')+' / '+(t.name||'Name')+' required'); return; }
    try {
      var p = await api.post('/admin/order-codes', { code:newPanel.code.trim(), name:newPanel.name.trim(), code_type:'lab', group_name:'Lab', price:Number(newPanel.price)||0, price_clinic:Number(newPanel.price)||0 });
      var codes = await api.get('/admin/order-codes'); setOrderCodes(codes);
      setNewPanelOpen(false); setNewPanel({code:'',name:'',price:''});
      loadLabItems(String(p.id));
      showToast(t.saved || 'Saved ✓');
    } catch(err){ alert('Error: '+err.message); }
  }

  async function testPacs(target){
    try {
      setPacsTest(function(p){return Object.assign({},p,{[target]:{message:'Checking...'}})});
      var r = await api.get('/pacs/test?target='+target);
      setPacsTest(function(p){return Object.assign({},p,{[target]:r})});
    } catch(err){ setPacsTest(function(p){return Object.assign({},p,{[target]:{ok:false,message:err.message}})}); }
  }

  async function saveEdit(){
    if(!editItem) return;
    try {
      var item = editItem;
      if(editType==='staff'){
        if(item.id) await api.put('/admin/staff/'+item.id, item);
        else await api.post('/admin/staff', item);
        setStaff(await api.get('/admin/staff'));
      } else if(editType==='drug'){
        if(item.id) await api.put('/admin/drugs/'+item.id, item);
        else await api.post('/admin/drugs', item);
        setDrugs(await api.get('/admin/drugs'));
      } else if(editType==='order'){
        if(item.id) await api.put('/admin/order-codes/'+item.id, item);
        else await api.post('/admin/order-codes', item);
        setOrderCodes(await api.get('/admin/order-codes'));
      } else if(editType==='phrase'){
        if(item.id) await api.put('/admin/phrases/'+item.id, item);
        else await api.post('/admin/phrases', item);
        setPhrases(await api.get('/admin/phrases'));
      } else if(editType==='dept'){
        if(item.id) await api.put('/admin/departments/'+item.id, item);
        else await api.post('/admin/departments', item);
        setDepts(await api.get('/admin/departments'));
      setPacsConfig(await api.get('/pacs/config'));
      }
      closeEdit(); showToast(t.save+' ✓');
    } catch(err){ alert('Error: '+err.message); }
  }

  async function deleteItem(type, id){
    if(!confirm('Delete?')) return;
    try {
      if(type==='staff') await api.del('/admin/staff/'+id);
      else if(type==='drug') await api.del('/admin/drugs/'+id);
      else if(type==='order') await api.del('/admin/order-codes/'+id);
      else if(type==='phrase') await api.del('/admin/phrases/'+id);
      await loadAll();
    } catch(err){ alert(err.message); }
  }

  // ── 약속처방(Order Sets) ──
  async function osReload(){ try { setOrderSets(await api.get('/order-sets')); } catch(e){} }
  function osNew(){ setOsEdit({name:'',group_name:'',department_id:'',description:'',items:[]}); setOsQ(''); setOsResults([]); setOsKind('drug'); }
  function osOpen(s){
    setOsEdit({ id:s.id, name:s.name||'', group_name:s.group_name||'', department_id:s.department_id||'', description:s.description||'',
      items:(s.items||[]).map(function(it){ return {kind:it.kind, drug_id:it.drug_id, order_code_id:it.order_code_id, code:it.code, name:it.name, dose:it.dose, frequency:it.frequency, days:it.days, route:it.route, quantity:it.quantity}; }) });
    setOsQ(''); setOsResults([]); setOsKind('drug');
  }
  function osField(k,v){ setOsEdit(function(e){ var n=Object.assign({},e); n[k]=v; return n; }); }
  async function osRunSearch(){
    try {
      if(osKind==='drug'){ var d=await api.get('/admin/drugs?q='+encodeURIComponent(osQ)); setOsResults((d||[]).slice(0,25)); }
      else { var o=await api.get('/admin/order-codes?q='+encodeURIComponent(osQ)); setOsResults((o||[]).slice(0,25)); }
    } catch(e){ setOsResults([]); }
  }
  function osAdd(r){
    setOsEdit(function(e){
      var n=Object.assign({},e); var items=(e.items||[]).slice();
      if(osKind==='drug') items.push({kind:'drug', drug_id:r.id, code:r.code, name:r.name, dose:r.default_dose, frequency:r.default_freq, days:r.default_days, route:r.default_route, quantity:1});
      else items.push({kind:'order', order_code_id:r.id, code:r.code, name:r.name, dose:r.default_dose, frequency:r.default_freq, days:r.default_days, quantity:1});
      n.items=items; return n;
    });
  }
  function osRemove(idx){ setOsEdit(function(e){ var n=Object.assign({},e); n.items=(e.items||[]).filter(function(_,i){return i!==idx;}); return n; }); }
  async function osSave(){
    if(!osEdit) return;
    if(!osEdit.name){ alert(t.setName+' ?'); return; }
    try {
      var body={ name:osEdit.name, group_name:osEdit.group_name||null, department_id:osEdit.department_id||null, description:osEdit.description||'', items:osEdit.items||[] };
      if(osEdit.id) await api.put('/order-sets/'+osEdit.id, body);
      else await api.post('/order-sets', body);
      setOsEdit(null); await osReload(); showToast(t.save+' ✓');
    } catch(err){ alert('Error: '+err.message); }
  }
  async function osDelete(s){
    if(!confirm('Delete? '+s.name)) return;
    try { await api.del('/order-sets/'+s.id); await osReload(); } catch(err){ alert(err.message); }
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

  var filteredDrugs = useMemo(function(){
    var r=drugs; if(drugCat!=='All') r=r.filter(function(d){return d.category===drugCat});
    if(q){var s=q.toLowerCase();r=r.filter(function(d){return d.name.toLowerCase().indexOf(s)>=0||d.code.toLowerCase().indexOf(s)>=0})}
    return r;
  },[drugs,drugCat,q]);

  var filteredOC = useMemo(function(){
    var r=orderCodes; if(ocFilter!=='All') r=r.filter(function(o){return o.code_type===ocFilter});
    if(q){var s=q.toLowerCase();r=r.filter(function(o){return o.code.toLowerCase().indexOf(s)>=0||o.name.toLowerCase().indexOf(s)>=0})}
    return r;
  },[orderCodes,ocFilter,q]);

  var bd='#232838',bd2='#2a3142',scBg='#1a1f2e',pn='#13161f',tx='#e2e8f0',t2='#94a3b8',t3='#64748b';
  var IS={width:'100%',background:'#0f1117',border:'1px solid #2a3142',borderRadius:5,padding:'7px 10px',color:'#e2e8f0',fontSize: 14,outline:'none',boxSizing:'border-box',fontFamily:'inherit'};
  var RC={frontdesk:'#3b82f6',doctor:'#10b981',pharmacy:'#8b5cf6',admin:'#ef4444'};
  var TC={fee:'#3b82f6',lab:'#f59e0b',imaging:'#8b5cf6',procedure:'#10b981'};

  var TABS = [
    {key:'staff',label:'👥 Staff'},{key:'drug',label:'💊 Drugs'},{key:'order',label:'📋 Order Codes'},
    {key:'phrase',label:'📝 Phrases'},{key:'dept',label:'🏥 Departments'},{key:'orderset',label:'🧪 '+t.orderSets},{key:'labitems',label:'🧫 '+(t.labItems||'Lab Items')},{key:'pacs',label:'🔗 '+t.orderFeedTab},{key:'backup',label:'💾 '+(t.backupTab||'백업')},{key:'clinic',label:'🏢 Clinic'},
  ];

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'#0f1117',color:tx,minHeight:'100vh',fontSize: 15}}>
      <TopBar />
      <div style={{display:'grid',gridTemplateColumns:'180px 1fr',height:'calc(100vh - 82px)'}}>
        {/* Sidebar */}
        <div style={{borderRight:'1px solid '+bd,background:pn,padding:'10px 0'}}>
          <div style={{padding:'0 12px 10px',fontSize: 14,fontWeight:700,color:tx}}>{t.settings}</div>
          {TABS.map(function(tab){
            return <div key={tab.key} onClick={function(){setTab(tab.key);setQ('')}} style={{padding:'8px 14px',cursor:'pointer',background:activeTab===tab.key?'#3b82f612':'transparent',borderLeft:activeTab===tab.key?'3px solid #3b82f6':'3px solid transparent',color:activeTab===tab.key?'#60a5fa':t2,fontSize: 14,fontWeight:activeTab===tab.key?600:400}}>{tab.label}</div>;
          })}
        </div>

        {/* Content */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden',background:'#11141c'}}>

          {/* STAFF */}
          {activeTab==='staff'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>👥 Staff</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('staff',{login_id:'',name:'',role:'frontdesk',permissions:defaultPermsForRole('frontdesk'),password:'1234',phone:'',status:'active'})}} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ Add</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 14}}>
              <thead><tr style={{background:'#1e2433'}}>
                {['Name','Login ID','Role','Dept','Phone','Status',''].map(function(h,i){return <th key={i} style={{padding:'6px 10px',textAlign:'left',color:t3,fontSize: 12,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              <tbody>{staff.map(function(s){
                var rc=RC[s.role]||t2;
                return <tr key={s.id} style={{borderBottom:'1px solid #1e2433'}}>
                  <td style={{padding:'6px 10px',fontWeight:600,color:tx}}>{s.name}</td>
                  <td style={{padding:'6px 10px',fontFamily:'monospace',color:'#60a5fa',fontSize: 13}}>{s.login_id}</td>
                  <td style={{padding:'6px 10px'}}><span style={{background:rc+'15',color:rc,borderRadius:3,padding:'2px 6px',fontSize: 12,fontWeight:600}}>{s.role}</span>
                    <div style={{marginTop:3,fontSize: 13,letterSpacing:1}} title={(s.permissions||[]).join(', ')}>{MODULES.filter(function(m){return (s.permissions||[]).indexOf(m.perm)>=0}).map(function(m){return m.icon}).join(' ')}</div></td>
                  <td style={{padding:'6px 10px',color:t2}}>{s.dept_code||'—'}</td>
                  <td style={{padding:'6px 10px',color:t2,fontSize: 13}}>{s.phone||'—'}</td>
                  <td style={{padding:'6px 10px',color:s.status==='active'?'#34d399':'#f87171',fontSize: 13,fontWeight:600}}>{s.status}</td>
                  <td style={{padding:'6px 10px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('staff',s)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    <button onClick={function(){deleteItem('staff',s.id)}} style={{background:'#dc262610',color:'#f87171',border:'1px solid #dc262630',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* DRUGS */}
          {activeTab==='drug'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:6,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>💊 Drugs</span>
              <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:140,marginLeft:'auto',boxSizing:'border-box'}}/>
              <button onClick={function(){openEdit('drug',{code:'',name:'',category:'Other',default_dose:'1.000',default_freq:1,default_days:7,default_route:'QD',unit_price:0,stock_qty:0})}} style={{background:'#8b5cf620',color:'#a78bfa',border:'1px solid #8b5cf640',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ Add</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 13}}>
              <thead><tr style={{background:'#1e2433'}}>
                {['Code','Name','Cat','Dose','Freq','Days','Route','Price','Stock',''].map(function(h,i){return <th key={i} style={{padding:'5px 6px',textAlign:i>=7?'right':'left',color:t3,fontSize: 11,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              <tbody>{filteredDrugs.map(function(d){
                return <tr key={d.id} style={{borderBottom:'1px solid #1e2433'}}>
                  <td style={{padding:'4px 6px',color:'#60a5fa',fontFamily:'monospace',fontWeight:600,fontSize: 13}}>{d.code}</td>
                  <td style={{padding:'4px 6px',color:tx}}>{d.name}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{d.category}</td>
                  <td style={{padding:'4px 6px',color:t2,fontFamily:'monospace',fontSize: 12}}>{d.default_dose}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{d.default_freq}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{d.default_days}</td>
                  <td style={{padding:'4px 6px',color:'#f59e0b',fontSize: 12}}>{d.default_route}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',fontFamily:'monospace',color:tx}}>{d.unit_price}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',color:d.stock_qty<20?'#f87171':'#34d399',fontWeight:600}}>{d.stock_qty}</td>
                  <td style={{padding:'4px 6px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('drug',d)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    <button onClick={function(){deleteItem('drug',d.id)}} style={{background:'#dc262610',color:'#f87171',border:'1px solid #dc262630',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* ORDER CODES */}
          {activeTab==='order'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:6,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>📋 Order Codes</span>
              {['All','fee','lab','imaging','procedure'].map(function(f){
                var c=TC[f]||'#3b82f6';
                return <button key={f} onClick={function(){setOcFilter(f)}} style={{background:ocFilter===f?c+'20':'transparent',color:ocFilter===f?c:t3,border:ocFilter===f?'1px solid '+c+'40':'1px solid transparent',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11,fontWeight:600}}>{f}</button>;
              })}
              <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:140,marginLeft:'auto',boxSizing:'border-box'}}/>
              <button onClick={function(){openEdit('order',{code:'',name:'',name_en:'',code_type:'fee',group_name:'Consultation',default_dose:'1.000',default_freq:1,default_days:1,price:0,price_clinic:0,pacs_modality:'',worklist_enabled:false,station_ae:'',body_part:'',memo:''})}} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ Add</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 13}}>
              <thead><tr style={{background:'#1e2433'}}>
                {['Code','Name','Type','Group','Price','Modality','WL','Body Part',''].map(function(h,i){return <th key={i} style={{padding:'5px 6px',textAlign:i===4?'right':'left',color:t3,fontSize: 11,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              <tbody>{filteredOC.map(function(o){
                var tc=TC[o.code_type]||t2;
                return <tr key={o.id} style={{borderBottom:'1px solid #1e2433'}}>
                  <td style={{padding:'4px 6px',color:'#60a5fa',fontFamily:'monospace',fontWeight:700,fontSize: 13}}>{o.code}</td>
                  <td style={{padding:'4px 6px',color:tx}}>{o.name}</td>
                  <td style={{padding:'4px 6px'}}><span style={{background:tc+'15',color:tc,borderRadius:3,padding:'1px 5px',fontSize: 11,fontWeight:600}}>{o.code_type}</span></td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{o.group_name}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',fontFamily:'monospace',color:tx}}>{o.price_clinic!=null?o.price_clinic:o.price}</td>
                  <td style={{padding:'4px 6px'}}>{o.pacs_modality?<span style={{background:'#8b5cf620',color:'#a78bfa',borderRadius:3,padding:'1px 5px',fontSize: 12,fontWeight:700,fontFamily:'monospace'}}>{o.pacs_modality}</span>:'—'}</td>
                  <td style={{padding:'4px 6px',color:o.worklist_enabled?'#34d399':'#334155'}}>{o.worklist_enabled?'✓':'—'}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{o.body_part||'—'}</td>
                  <td style={{padding:'4px 6px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('order',o)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    <button onClick={function(){deleteItem('order',o.id)}} style={{background:'#dc262610',color:'#f87171',border:'1px solid #dc262630',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* PHRASES */}
          {activeTab==='phrase'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>📝 Phrases</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('phrase',{category:'General',text:''})}} style={{background:'#f59e0b20',color:'#fbbf24',border:'1px solid #f59e0b40',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ Add</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              {phrases.map(function(p){ return <div key={p.id} style={{padding:'7px 14px',borderBottom:'1px solid #1e2433',display:'flex',gap:8}}>
                <span style={{background:'#f59e0b20',color:'#fbbf24',borderRadius:3,padding:'1px 5px',fontSize: 11,fontWeight:600,flexShrink:0}}>{p.category}</span>
                <span style={{flex:1,fontSize: 14,color:'#cbd5e1'}}>{p.text}</span>
                <button onClick={function(){openEdit('phrase',p)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                <button onClick={function(){deleteItem('phrase',p.id)}} style={{background:'#dc262610',color:'#f87171',border:'1px solid #dc262630',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
              </div>; })}
            </div>
          </div>):null}

          {/* DEPARTMENTS */}
          {activeTab==='dept'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>🏥 Departments</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('dept',{code:'',name:'',name_en:'',name_fr:''})}} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ Add</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 14}}>
              <thead><tr style={{background:'#1e2433'}}>{['Code','Name','Head',''].map(function(h,i){return <th key={i} style={{padding:'6px 10px',textAlign:'left',color:t3,fontSize: 12,borderBottom:'1px solid '+bd}}>{h}</th>})}</tr></thead>
              <tbody>{depts.map(function(d){return <tr key={d.id} style={{borderBottom:'1px solid #1e2433'}}>
                <td style={{padding:'6px 10px',color:'#60a5fa',fontFamily:'monospace',fontWeight:600}}>{d.code}</td>
                <td style={{padding:'6px 10px',color:tx}}>{d.name}</td>
                <td style={{padding:'6px 10px',color:t2}}>{d.head_name||'—'}</td>
                <td style={{padding:'6px 10px',display:'flex',gap:3}}>
                  <button onClick={function(){openEdit('dept',d)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                </td>
              </tr>})}</tbody>
            </table></div>
          </div>):null}


          {/* ORDER SETS / 약속처방 */}
          {activeTab==='orderset'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {!osEdit?(
              <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
                  <span style={{fontWeight:700,fontSize: 14,color:tx}}>🧪 {t.orderSets}</span><div style={{flex:1}}></div>
                  <button onClick={osNew} style={{background:'#10b98120',color:'#34d399',border:'1px solid #10b98140',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ {t.newSet}</button>
                </div>
                <div style={{flex:1,overflow:'auto',padding:'10px 14px'}}>
                  {orderSets.length>0?osGrouped().map(function(grp,gi){
                    return <div key={gi} style={{marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,paddingBottom:4,borderBottom:'1px solid '+bd}}>
                        <span style={{fontSize: 14}}>📁</span>
                        <span style={{fontWeight:800,fontSize: 14,color:'#e2e8f0'}}>{grp.group||t.ungrouped}</span>
                        <span style={{fontSize: 12,color:t3}}>({grp.sets.length})</span>
                      </div>
                      {grp.sets.map(function(s){
                        return <div key={s.id} style={{background:scBg,border:'1px solid '+bd,borderRadius:7,padding:'10px 12px',marginBottom:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                            <span style={{fontWeight:800,fontSize: 14,color:'#34d399'}}>{s.name}</span>
                            {s.dept_code?<span style={{fontSize: 12,color:t2,background:'#0f1117',border:'1px solid '+bd2,borderRadius:4,padding:'1px 6px'}}>{s.dept_code}</span>:null}
                            <span style={{fontSize: 12,color:t3}}>{(s.items||[]).length} {t.itemsUnit}</span>
                            <div style={{flex:1}}></div>
                            <button onClick={function(){osOpen(s)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 8px',cursor:'pointer',fontSize: 12}}>{t.edit}</button>
                            <button onClick={function(){osDelete(s)}} style={{background:'#ef444418',color:'#f87171',border:'1px solid #ef444440',borderRadius:3,padding:'2px 8px',cursor:'pointer',fontSize: 12}}>{t.delete}</button>
                          </div>
                          <div style={{fontSize: 12,color:'#94a3b8'}}>{(s.items||[]).map(function(it){return it.code;}).join(' · ')||'—'}</div>
                        </div>;
                      })}
                    </div>;
                  }):<div style={{padding:24,textAlign:'center',color:t3,fontStyle:'italic'}}>{t.noOrderSets}</div>}
                </div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
                  <span style={{fontWeight:700,fontSize: 14,color:tx}}>{osEdit.id?t.edit:t.newSet}</span><div style={{flex:1}}></div>
                  <button onClick={function(){setOsEdit(null)}} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13}}>{t.cancel||'Cancel'}</button>
                  <button onClick={osSave} style={{background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:4,padding:'4px 14px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.save}</button>
                </div>
                <div style={{flex:1,overflow:'auto',padding:'12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div>
                    <Fld label={t.setName}><input value={osEdit.name} onChange={function(e){osField('name',e.target.value)}} style={IS}/></Fld>
                    <Fld label={t.setGroup}>
                      <input list="os-groups" value={osEdit.group_name||''} onChange={function(e){osField('group_name',e.target.value)}} placeholder={t.setGroupHint} style={IS}/>
                      <datalist id="os-groups">{Array.from(new Set((orderSets||[]).map(function(s){return s.group_name;}).filter(Boolean))).map(function(g){return <option key={g} value={g}/>;})}</datalist>
                    </Fld>
                    <Fld label={t.department}>
                      <select value={osEdit.department_id||''} onChange={function(e){osField('department_id',e.target.value)}} style={IS}>
                        <option value="">—</option>
                        {depts.map(function(d){return <option key={d.id} value={d.id}>{d.code} - {d.name}</option>;})}
                      </select>
                    </Fld>
                    <Fld label={t.description||'Description'}><input value={osEdit.description||''} onChange={function(e){osField('description',e.target.value)}} style={IS}/></Fld>
                    <div style={{marginTop:10,fontSize: 13,fontWeight:700,color:'#34d399'}}>{t.setItems} ({(osEdit.items||[]).length})</div>
                    <div style={{marginTop:6,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
                      {(osEdit.items||[]).length>0?(osEdit.items||[]).map(function(it,idx){
                        return <div key={idx} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',borderBottom:'1px solid #1e2433'}}>
                          <span style={{fontSize: 11,fontWeight:700,color:it.kind==='drug'?'#60a5fa':'#a78bfa',width:38}}>{it.kind==='drug'?'Rx':'Exam'}</span>
                          <span style={{fontFamily:'monospace',fontSize: 12,color:t2,width:56}}>{it.code}</span>
                          <span style={{fontSize: 13,color:tx,flex:1}}>{it.name}</span>
                          {it.kind==='drug'?<span style={{fontSize: 11,color:t3}}>{it.dose}×{it.frequency}×{it.days}</span>:null}
                          <button onClick={function(){osRemove(idx)}} style={{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',fontSize: 14}}>✕</button>
                        </div>;
                      }):<div style={{padding:14,textAlign:'center',color:t3,fontSize: 12}}>{t.setItemsEmpty}</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{display:'flex',gap:6,marginBottom:6}}>
                      <button onClick={function(){setOsKind('drug');setOsResults([])}} style={{flex:1,background:osKind==='drug'?'#3b82f620':'#1e2433',color:osKind==='drug'?'#60a5fa':t2,border:'1px solid '+bd2,borderRadius:4,padding:'5px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.setDrug}</button>
                      <button onClick={function(){setOsKind('order');setOsResults([])}} style={{flex:1,background:osKind==='order'?'#8b5cf620':'#1e2433',color:osKind==='order'?'#a78bfa':t2,border:'1px solid '+bd2,borderRadius:4,padding:'5px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.setExam}</button>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <input value={osQ} onChange={function(e){setOsQ(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')osRunSearch()}} placeholder={t.search} style={Object.assign({},IS,{flex:1})}/>
                      <button onClick={osRunSearch} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid '+bd2,borderRadius:4,padding:'0 12px',cursor:'pointer',fontSize: 13}}>{t.search}</button>
                    </div>
                    <div style={{marginTop:6,border:'1px solid '+bd,borderRadius:6,maxHeight:360,overflow:'auto'}}>
                      {osResults.map(function(r){
                        return <div key={r.id} onClick={function(){osAdd(r)}} style={{display:'flex',gap:8,padding:'6px 8px',borderBottom:'1px solid #1e2433',cursor:'pointer'}}>
                          <span style={{fontFamily:'monospace',fontSize: 12,color:'#60a5fa',width:56}}>{r.code}</span>
                          <span style={{fontSize: 13,color:tx,flex:1}}>{r.name}</span>
                          <span style={{fontSize: 13,color:'#34d399',fontWeight:800}}>+</span>
                        </div>;
                      })}
                      {osResults.length===0?<div style={{padding:14,textAlign:'center',color:t3,fontSize: 12}}>{t.searchToAdd}</div>:null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>):null}


          {/* ORDER BRIDGE / WORKLIST FEED */}
          {activeTab==='pacs'?(<div style={{padding:'16px 20px',maxWidth:860,overflow:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{fontWeight:800,fontSize: 16,color:tx}}>🔗 {t.orderFeedTitle}</div>
              <div style={{flex:1}}></div>
              <button onClick={savePacs} style={{background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:5,padding:'7px 14px',cursor:'pointer',fontSize: 14,fontWeight:700}}>Save</button>
            </div>
            <div style={{fontSize: 14,color:t2,marginBottom:12,lineHeight:1.6}}>
              {t.feedIntroA}<b style={{color:tx}}>{t.feedIntroB}</b>{t.feedIntroC}<br/>
              {t.feedIntroD}
            </div>
            {pacsConfig?(<div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:12}}>
              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12}}>
                <div style={{fontWeight:700,fontSize: 14,color:'#34d399',marginBottom:10}}>1. {t.feedSec1}</div>
                <Fld label="Bridge Token"><input value={pacsConfig.bridge_token||''} onChange={function(e){up('bridge_token',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.emrPublicUrl}>
                  <input placeholder={t.egUrl} value={pacsConfig.emr_base_url||''} onChange={function(e){up('emr_base_url',e.target.value)}} style={IS}/>
                </Fld>
                <div onClick={function(){up('auto_create_worklist',!pacsConfig.auto_create_worklist)}} style={{marginTop:8,display:'flex',alignItems:'center',gap:8,cursor:'pointer',background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:'7px 10px'}}>
                  <div style={{width:14,height:14,borderRadius:3,border:pacsConfig.auto_create_worklist?'2px solid #10b981':'2px solid #2a3142',background:pacsConfig.auto_create_worklist?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{pacsConfig.auto_create_worklist?<span style={{color:'#fff',fontSize: 12}}>✓</span>:null}</div>
                  <span style={{fontSize: 14,color:pacsConfig.auto_create_worklist?'#34d399':t3}}>{t.autoCreateWl}</span>
                </div>
                <div style={{marginTop:10,fontSize: 13,color:t2,lineHeight:1.6}}>{t.feedUrlExample}</div>
                <div style={{fontSize: 13,fontFamily:'monospace',color:'#93c5fd',background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:8,wordBreak:'break-all'}}>{(pacsConfig.emr_base_url||('http://'+t.hostPcIp+':8080')) + '/api/pacs/worklist-feed?token=' + (pacsConfig.bridge_token||'') + '&format=json'}</div>
                <div style={{fontSize: 13,fontFamily:'monospace',color:'#93c5fd',background:'#0f1117',border:'1px solid '+bd2,borderRadius:5,padding:8,wordBreak:'break-all',marginTop:6}}>{(pacsConfig.emr_base_url||('http://'+t.hostPcIp+':8080')) + '/api/pacs/worklist-feed?token=' + (pacsConfig.bridge_token||'') + '&format=csv'}</div>
                <div style={{marginTop:8,fontSize: 13,color:t3,lineHeight:1.5}}>{t.feedConnectHint}</div>
              </div>

              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12}}>
                <div style={{fontWeight:700,fontSize: 14,color:'#60a5fa',marginBottom:10}}>2. {t.pacsServer||'PACS 서버 (Orthanc)'}</div>
                <div style={{fontSize: 13,color:t3,lineHeight:1.5,marginBottom:8}}>{t.pacsServerHint||'영상이 저장되고 워크리스트를 제공하는 PACS(우리 Orthanc 컨테이너). DICOM 포트(기본 4242)·AE Title을 적고, 웹 주소(8090)는 진료실 뷰어가 영상을 띄울 때 씁니다.'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:8}}>
                  <Fld label="Host / IP"><input placeholder="NAS_IP" value={pacsConfig.worklist_scp_host||''} onChange={function(e){up('worklist_scp_host',e.target.value)}} style={IS}/></Fld>
                  <Fld label={(t.dicomPort||'DICOM Port')}><input type="number" value={pacsConfig.worklist_scp_port||4242} onChange={function(e){up('worklist_scp_port',Number(e.target.value))}} style={IS}/></Fld>
                </div>
                <Fld label="AE Title"><input value={pacsConfig.worklist_scp_ae||''} onChange={function(e){up('worklist_scp_ae',e.target.value)}} style={IS}/></Fld>
                <div style={{marginTop:8}}><Fld label={(t.pacsViewerUrl||'PACS 웹/뷰어 주소')}><input placeholder="http://NAS_IP:8090" value={pacsConfig.pacs_viewer_url||''} onChange={function(e){up('pacs_viewer_url',e.target.value)}} style={IS}/></Fld></div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                  <button onClick={function(){testPacs('worklist')}} style={{background:'#1e2433',color:'#60a5fa',border:'1px solid '+bd2,borderRadius:5,padding:'6px 10px',cursor:'pointer',fontSize: 13}}>{t.testPacsBtn||'Test PACS (DICOM)'}</button>
                  {pacsConfig.pacs_viewer_url?<a href={pacsConfig.pacs_viewer_url} target="_blank" rel="noreferrer" style={{background:'#1e2433',color:'#a78bfa',border:'1px solid '+bd2,borderRadius:5,padding:'6px 10px',cursor:'pointer',fontSize: 13,textDecoration:'none'}}>🖼 {t.openViewer||'뷰어 열기'}</a>:null}
                </div>
                {pacsTest.worklist?<div style={{marginTop:8,fontSize: 13,color:pacsTest.worklist.ok?'#34d399':'#f87171'}}>{pacsTest.worklist.ok?'✓ ':'✗ '}{pacsTest.worklist.message}</div>:null}
              </div>

              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12,gridColumn:'1 / span 2'}}>
                <div style={{fontWeight:700,fontSize: 14,color:'#fbbf24',marginBottom:10}}>3. {t.feedSec3}</div>
                <div style={{fontSize: 13,color:t2,lineHeight:1.6}}>
                  {t.feedSec3A}<b style={{color:tx}}>{t.feedSec3B}</b>{t.feedSec3C}<br/>
                  {t.feedSec3Hint}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:10}}>
                  <div style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'#93c5fd'}}>{t.modUltrasound}</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = US</div></div>
                  <div style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'#93c5fd'}}>X-ray / CR</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = CR</div></div>
                  <div style={{background:'#0f1117',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'#93c5fd'}}>{t.modEndoscopy}</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = ES {t.orWord} OT</div></div>
                </div>
                <div style={{fontSize: 13,color:t3,lineHeight:1.5,marginTop:8}}>{t.feedSec3Note}</div>
              </div>
            </div>):<div style={{color:t3,fontSize: 14}}>Loading...</div>}
          </div>):null}

          {/* CLINIC */}
          {activeTab==='labitems'?(<div style={{padding:'16px 20px'}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,marginBottom:6}}>🧫 {t.labItems||'Lab Test Items'}</div>
            <div style={{fontSize: 13,color:t3,marginBottom:12}}>{t.labItemsHint||'Define the result items (with reference ranges) for each lab panel. The lab screen lists these for entry; out-of-range values auto-flag.'}</div>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
              <span style={{fontSize: 14,color:t2}}>{t.labPanel||'Panel'}:</span>
              <select value={labCode} onChange={function(e){loadLabItems(e.target.value)}} style={Object.assign({},IS,{maxWidth:280})}>
                <option value="">— {t.select||'select'} —</option>
                {orderCodes.filter(function(o){return o.code_type==='lab'}).map(function(o){return <option key={o.id} value={o.id}>{o.code} · {o.name}</option>})}
              </select>
              <button onClick={function(){ setNewPanelOpen(!newPanelOpen); }} style={{background:'#3b82f620',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:5,padding:'7px 12px',cursor:'pointer',fontSize: 13,fontWeight:700}}>+ {t.newLabPanel||'새 검사 패널'}</button>
            </div>
            {newPanelOpen?(<div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:14,background:scBg,border:'1px solid '+bd,borderRadius:8,padding:'10px 12px',flexWrap:'wrap'}}>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.code||'Code'}</label><input value={newPanel.code} onChange={function(e){unp('code',e.target.value)}} placeholder="L09" style={Object.assign({},IS,{width:90})}/></div>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.name||'Name'}</label><input value={newPanel.name} onChange={function(e){unp('name',e.target.value)}} placeholder="Thyroid Panel" style={Object.assign({},IS,{width:220})}/></div>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.price||'Price'}</label><input type="number" value={newPanel.price} onChange={function(e){unp('price',e.target.value)}} placeholder="0" style={Object.assign({},IS,{width:100})}/></div>
              <button onClick={createPanel} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:5,padding:'8px 16px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.add||'추가'}</button>
              <button onClick={function(){ setNewPanelOpen(false); }} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'8px 14px',cursor:'pointer',fontSize: 14}}>{t.cancel||'취소'}</button>
              <div style={{fontSize: 12,color:t3,width:'100%',marginTop:2}}>{t.newLabPanelHint||'새 패널은 진료실 검사 오더에도 바로 추가됩니다. 만든 뒤 아래에서 검사항목을 정의하세요.'}</div>
            </div>):null}
            {labCode?(<div style={{maxWidth:760}}>
              <div style={{display:'grid',gridTemplateColumns:'1.6fr .8fr .7fr .7fr 1fr 32px',gap:6,fontSize: 12,color:t3,fontWeight:700,marginBottom:5,padding:'0 2px'}}>
                <div>{t.testName||'Item name'}</div><div>{t.unit||'Unit'}</div><div>{t.refLow||'Low'}</div><div>{t.refHigh||'High'}</div><div>{t.refTextLabel||'Text ref'}</div><div></div>
              </div>
              {labItems.map(function(it,i){return <div key={i} style={{display:'grid',gridTemplateColumns:'1.6fr .8fr .7fr .7fr 1fr 32px',gap:6,marginBottom:5,alignItems:'center'}}>
                <input value={it.name||''} onChange={function(e){uli(i,'name',e.target.value)}} style={IS}/>
                <input value={it.unit||''} onChange={function(e){uli(i,'unit',e.target.value)}} style={IS}/>
                <input type="number" value={it.ref_low!=null?it.ref_low:''} onChange={function(e){uli(i,'ref_low',e.target.value)}} style={IS}/>
                <input type="number" value={it.ref_high!=null?it.ref_high:''} onChange={function(e){uli(i,'ref_high',e.target.value)}} style={IS}/>
                <input value={it.ref_text||''} onChange={function(e){uli(i,'ref_text',e.target.value)}} placeholder="Negative…" style={IS}/>
                <button onClick={function(){delLi(i)}} style={{background:'#dc262610',color:'#f87171',border:'1px solid #dc262630',borderRadius:4,padding:'6px 0',cursor:'pointer',fontSize: 13}}>✕</button>
              </div>;})}
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={addLi} style={{background:'#1e2433',color:'#60a5fa',border:'1px solid #3b82f640',borderRadius:5,padding:'7px 14px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ {t.addItem||'Add item'}</button>
                <button onClick={saveLabItems} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:5,padding:'7px 20px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.save||'Save'}</button>
              </div>
            </div>):<div style={{color:t3,fontSize: 14}}>{t.labPickPanel||'Pick a lab panel above to edit its items.'}</div>}
          </div>):null}

          {activeTab==='backup'?(<div style={{padding:'16px 20px',maxWidth:780,overflow:'auto'}}>
            <div style={{fontWeight:700,fontSize:15,color:tx,marginBottom:5}}>💾 {t.backupTab||'백업'}</div>
            <div style={{fontSize:13,color:t3,marginBottom:16,lineHeight:1.6}}>{t.backupIntro||'데이터베이스를 정기/수동으로 백업합니다. 백업 경로는 설치 시 .env의 BACKUP_PATH로 지정해요(앱은 C, 백업은 D 식). 경로가 없으면 백업은 꺼집니다.'}</div>
            {!backup?(<div style={{color:t3}}>{t.loading||'Loading…'}</div>):(<>
              {!backup.enabled?(
                <div style={{background:'#7c2d1220',border:'1px solid #ef444455',borderRadius:8,padding:'14px 16px',marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:14,color:'#f87171',marginBottom:6}}>⚠ {t.backupOff||'백업 미설정 — 데이터가 보호되지 않습니다'}</div>
                  <div style={{fontSize:13,color:t2,lineHeight:1.6}}>{t.backupOffHow||'백업을 켜려면 .env 파일에 BACKUP_PATH 를 지정하고(예: D:\\medconnect-backups) 다시 시작하세요(docker compose up -d).'}</div>
                </div>
              ):(
                <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:14,marginBottom:14}}>
                  <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                    <div><div style={{fontSize:12,color:t3}}>{t.backupStatus||'상태'}</div><div style={{fontSize:14,fontWeight:800,color:'#34d399'}}>✓ {t.backupOn||'사용 중'}</div></div>
                    <div><div style={{fontSize:12,color:t3}}>{t.backupPath||'경로'}</div><div style={{fontSize:14,color:tx,fontFamily:'monospace'}}>{backup.hostPath}</div></div>
                    <div><div style={{fontSize:12,color:t3}}>{t.backupSchedule||'자동'}</div><div style={{fontSize:14,color:tx}}>{t.backupDaily||'매일'} {backup.time}</div></div>
                    <div><div style={{fontSize:12,color:t3}}>{t.backupRetention||'보관'}</div><div style={{fontSize:14,color:tx}}>{backup.retentionDays}{t.days||'일'}</div></div>
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
                <button onClick={runBackup} disabled={!backup.enabled||backupBusy} style={{background:backup.enabled?'#16a34a':'#1e2433',color:backup.enabled?'#fff':'#475569',border:'none',borderRadius:6,padding:'9px 18px',cursor:backup.enabled&&!backupBusy?'pointer':'not-allowed',fontSize:14,fontWeight:800}}>{backupBusy?(t.backupRunning||'백업 중…'):('💾 '+(t.backupNow||'지금 백업'))}</button>
                <button onClick={loadBackup} style={{background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:6,padding:'9px 14px',cursor:'pointer',fontSize:14}}>↻ {t.refresh||'새로고침'}</button>
                {backup.last?<span style={{fontSize:13,color:t3}}>{t.backupLast||'최근'}: {String(backup.last.mtime).replace('T',' ').slice(0,16)} ({fmtBytes(backup.last.size)})</span>:null}
              </div>
              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,overflow:'hidden'}}>
                <div style={{fontSize:13,fontWeight:700,color:t2,padding:'8px 12px',borderBottom:'1px solid '+bd}}>{t.backupList||'백업 목록'} ({backup.count})</div>
                <div style={{maxHeight:'40vh',overflow:'auto'}}>
                  {(backup.backups||[]).length===0?<div style={{padding:14,color:t3,fontSize:13}}>{t.backupNone||'백업 없음'}</div>:
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <tbody>
                        {(backup.backups||[]).map(function(b,i){ return <tr key={i} style={{borderBottom:'1px solid #1a1f2e'}}>
                          <td style={{padding:'7px 12px',color:tx,fontFamily:'monospace'}}>{b.name}</td>
                          <td style={{padding:'7px 12px',color:t2,textAlign:'right',whiteSpace:'nowrap'}}>{fmtBytes(b.size)}</td>
                          <td style={{padding:'7px 12px',color:t3,textAlign:'right',whiteSpace:'nowrap'}}>{String(b.mtime).replace('T',' ').slice(0,16)}</td>
                        </tr>; })}
                      </tbody>
                    </table>}
                </div>
              </div>
              <div style={{fontSize:12,color:t3,marginTop:10,lineHeight:1.6}}>{t.backupNote||'※ 같은 기계의 다른 드라이브는 디스크 고장엔 대비되지만 도난·화재엔 안 됩니다. 가끔 USB 등 다른 곳에 한 벌 더 복사하세요. 복원은 백업 파일을 psql로 가져오면 됩니다(문서 참고).'}</div>
            </>)}
          </div>):null}

          {activeTab==='clinic'&&clinic?(<div style={{padding:'16px 20px',maxWidth:580}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,marginBottom:5}}>🏢 Clinic / Letterhead</div>
            <div style={{fontSize: 13,color:t3,marginBottom:14}}>This appears at the top of issued documents (referral letters, certificates, …).</div>

            {/* live letterhead preview */}
            <div style={{background:'#fff',color:'#111',borderRadius:6,padding:'14px 18px',marginBottom:16,textAlign:'center',fontFamily:'"Times New Roman",Georgia,serif',borderBottom:'2px solid #111'}}>
              <div style={{fontSize: 17,fontWeight:800}}>{clinic.name_fr||clinic.name_en||clinic.name||''}</div>
              <div style={{fontSize: 11,color:'#333',marginTop:2}}>{(clinic.address||'')}{clinic.phone?'  ·  Tel: '+clinic.phone:''}{clinic.email?'  ·  '+clinic.email:''}</div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Fld label="Application Title (top header)"><input value={clinic.app_title||''} onChange={function(e){uclin('app_title',e.target.value)}} placeholder="Bethesda EMR" style={IS}/></Fld>
              <div style={{height:1,background:bd,margin:'2px 0 4px'}}></div>
              <Fld label="Clinic Name (Korean / default)"><input value={clinic.name||''} onChange={function(e){uclin('name',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Fld label="Clinic Name (English)"><input value={clinic.name_en||''} onChange={function(e){uclin('name_en',e.target.value)}} style={IS}/></Fld>
                <Fld label="Clinic Name (Français)"><input value={clinic.name_fr||''} onChange={function(e){uclin('name_fr',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label="Address"><input value={clinic.address||''} onChange={function(e){uclin('address',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Fld label="Phone"><input value={clinic.phone||''} onChange={function(e){uclin('phone',e.target.value)}} style={IS}/></Fld>
                <Fld label="Email"><input value={clinic.email||''} onChange={function(e){uclin('email',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label="Working Hours"><input value={clinic.working_hours||''} onChange={function(e){uclin('working_hours',e.target.value)}} style={IS}/></Fld>
              <div><button onClick={saveClinic} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:6,padding:'9px 24px',cursor:'pointer',fontSize: 14,fontWeight:800,marginTop:4}}>{t.save||'Save'}</button></div>
            </div>

            <div style={{fontSize: 12,color:t3,marginTop:14,lineHeight:1.6}}>
              The document chooses the name by print language — French uses the Français name, English uses the English name, Korean uses the default. Address · phone · email are shared.
            </div>
          </div>):activeTab==='clinic'?(<div style={{padding:20,color:t3}}>{t.loading||'Loading…'}</div>):null}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editItem?(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1a1f2e',borderRadius:10,border:'1px solid '+bd,width:editType==='order'?540:420,maxHeight:'85vh',overflow:'auto',padding:'18px',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,marginBottom:14}}>{editItem.id?t.edit:'+ Add'}</div>

            {editType==='staff'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label="Name"><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label="Login ID"><input value={editItem.login_id||''} onChange={function(e){ue('login_id',e.target.value)}} style={IS}/></Fld>
                <Fld label="Password"><input value={editItem.password||''} onChange={function(e){ue('password',e.target.value)}} placeholder="••••" style={IS}/></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label="Role (label)"><select value={editItem.role||'frontdesk'} onChange={function(e){ var r=e.target.value; ue('role',r); ue('permissions', defaultPermsForRole(r)); }} style={IS}><option value="frontdesk">Front Desk</option><option value="doctor">Doctor</option><option value="pharmacy">Pharmacy</option><option value="lab">Lab</option><option value="admin">Admin</option></select></Fld>
                <Fld label="Phone"><input value={editItem.phone||''} onChange={function(e){ue('phone',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label={(t.permissions||'Permissions (accessible screens)')}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 10px',background:'#0f1117',border:'1px solid #2a3142',borderRadius:5,padding:'8px 10px'}}>
                  {MODULES.map(function(m){
                    var perms=editItem.permissions||[];
                    var on=perms.indexOf(m.perm)>=0;
                    return <label key={m.perm} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,color:on?'#e2e8f0':'#94a3b8'}}>
                      <input type="checkbox" checked={on} onChange={function(){ var cur=editItem.permissions||[]; var next=on?cur.filter(function(x){return x!==m.perm}):cur.concat([m.perm]); ue('permissions',next); }} />
                      {m.icon} {t[m.key]||m.key}
                    </label>;
                  })}
                </div>
              </Fld>
            </div>):null}

            {editType==='drug'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:6}}>
                <Fld label="Code"><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
                <Fld label="Name"><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
                <Fld label="Dose"><input value={editItem.default_dose||''} onChange={function(e){ue('default_dose',e.target.value)}} style={IS}/></Fld>
                <Fld label="Freq"><input type="number" value={editItem.default_freq||1} onChange={function(e){ue('default_freq',Number(e.target.value))}} style={IS}/></Fld>
                <Fld label="Days"><input type="number" value={editItem.default_days||1} onChange={function(e){ue('default_days',Number(e.target.value))}} style={IS}/></Fld>
                <Fld label="Route"><input value={editItem.default_route||''} onChange={function(e){ue('default_route',e.target.value)}} style={IS}/></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                <Fld label="Category"><select value={editItem.category||'Other'} onChange={function(e){ue('category',e.target.value)}} style={IS}>{'Antibiotic,Analgesic,Antimalarial,Cardiovascular,GI,Vitamin,Other'.split(',').map(function(c){return <option key={c}>{c}</option>})}</select></Fld>
                <Fld label="Price"><input type="number" value={editItem.unit_price||0} onChange={function(e){ue('unit_price',Number(e.target.value))}} style={IS}/></Fld>
                <Fld label="Stock"><input type="number" value={editItem.stock_qty||0} onChange={function(e){ue('stock_qty',Number(e.target.value))}} style={IS}/></Fld>
              </div>
            </div>):null}

            {editType==='order'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr',gap:6}}>
                <Fld label="Code"><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
                <Fld label="Name"><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label="English Name"><input value={editItem.name_en||''} onChange={function(e){ue('name_en',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label="Type"><select value={editItem.code_type||'fee'} onChange={function(e){ue('code_type',e.target.value)}} style={IS}><option value="fee">Fee</option><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="procedure">Procedure</option></select></Fld>
                <Fld label="Group"><select value={editItem.group_name||''} onChange={function(e){ue('group_name',e.target.value)}} style={IS}>{'Consultation,Laboratory,Radiology,Ultrasound,Endoscopy,Surgery,Other'.split(',').map(function(g){return <option key={g}>{g}</option>})}</select></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr',gap:6}}>
                <Fld label={t.price||"가격 (Price)"}><input type="number" value={editItem.price_clinic!=null?editItem.price_clinic:(editItem.price||0)} onChange={function(e){ var v=Number(e.target.value); ue('price_clinic',v); ue('price',v); }} style={IS}/></Fld>
              </div>
              <div style={{background:'#0f1117',border:'1px solid #2a3142',borderRadius:6,padding:'10px'}}>
                <div style={{fontSize: 13,fontWeight:700,color:'#8b5cf6',marginBottom:6}}>📡 {t.orderFeedModality}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <Fld label="Modality"><select value={editItem.pacs_modality||''} onChange={function(e){ue('pacs_modality',e.target.value)}} style={IS}><option value="">None</option><option value="US">US</option><option value="CR">CR</option><option value="CT">CT</option><option value="MR">MR</option><option value="ES">ES</option><option value="OT">OT</option></select></Fld>
                  <Fld label="Body Part"><input value={editItem.body_part||''} onChange={function(e){ue('body_part',e.target.value)}} style={IS} placeholder="ABDOMEN"/></Fld>
                </div>
                <div style={{marginTop:6}}>
                  <Fld label={t.worklistFeedCreate}>
                    <div onClick={function(){ue('worklist_enabled',!editItem.worklist_enabled)}} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:scBg,border:'1px solid '+bd2,borderRadius:5,padding:'7px 10px'}}>
                      <div style={{width:14,height:14,borderRadius:3,border:editItem.worklist_enabled?'2px solid #10b981':'2px solid #2a3142',background:editItem.worklist_enabled?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{editItem.worklist_enabled?<span style={{color:'#fff',fontSize: 12}}>✓</span>:null}</div>
                      <span style={{fontSize: 14,color:editItem.worklist_enabled?'#34d399':t3}}>{editItem.worklist_enabled?'Enabled':'Disabled'}</span>
                    </div>
                  </Fld>
                  <div style={{fontSize: 12,color:t3,lineHeight:1.4}}>{t.aeTitleNote}</div>
                </div>
              </div>
            </div>):null}

            {editType==='phrase'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label="Category"><select value={editItem.category||'General'} onChange={function(e){ue('category',e.target.value)}} style={IS}>{'General,Internal,Surgery,Peds,OBGYN,Custom'.split(',').map(function(c){return <option key={c}>{c}</option>})}</select></Fld>
              <Fld label="Text"><textarea value={editItem.text||''} onChange={function(e){ue('text',e.target.value)}} rows={4} style={Object.assign({},IS,{resize:'vertical'})}/></Fld>
            </div>):null}

            {editType==='dept'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label="Code"><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
              <Fld label="Name"><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              <Fld label="English"><input value={editItem.name_en||''} onChange={function(e){ue('name_en',e.target.value)}} style={IS}/></Fld>
            </div>):null}

            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={closeEdit} style={{flex:1,background:'#1e2433',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'7px',cursor:'pointer',fontSize: 14}}>{t.cancel}</button>
              <button onClick={saveEdit} style={{flex:2,background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',border:'none',borderRadius:5,padding:'7px',cursor:'pointer',fontSize: 14,fontWeight:600}}>{t.save}</button>
            </div>
          </div>
        </div>
      ):null}

      {toast?<div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#10b981',color:'#fff',borderRadius:8,padding:'10px 24px',fontSize: 14,fontWeight:600,boxShadow:'0 4px 16px rgba(0,0,0,0.3)',zIndex:200}}>✓ {toast}</div>:null}
    </div>
  );
}

function Fld(p){return <div><label style={{fontSize: 12,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>{p.label}</label>{p.children}</div>}
