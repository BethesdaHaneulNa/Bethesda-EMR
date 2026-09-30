import { useState, useEffect, useMemo, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api, getUser } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';
import { MODULES, defaultPermsForRole } from '../modules.js';
// Server messages (English) -> the screen's language. See settingsMessages.js.
import { seMessage } from './settingsMessages.js';
import { formLabel, checkList, checkOpen, checkText, DRUG_FORMS } from '../documents/drug-info.js';
// The change log tab (wiki/03-change-log.md): action sentences and field labels.
import { AUDIT_ACTIONS, auditActionText, auditEntityText, auditSummary, auditChanges } from './settingsAudit.js';
import { seMoney, seMoneyInput } from './settingsMoney.js';
import { getTemplate } from '../documents/registry.js';

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
  var spS = useState(false), showPw = spS[0], setShowPw = spS[1];
  var leS = useState(''), loadError = leS[0], setLoadError = leS[1];
  // Log tab. Opens on the last 7 days; the server pages it (at most 200 a page).
  function localDay(d){ var p=function(n){return String(n).padStart(2,'0')}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  var auS = useState(null), audit = auS[0], setAudit = auS[1];
  var auF = useState({from:localDay(new Date(Date.now()-6*86400000)), to:localDay(new Date()), staff_id:'', patient:'', action:''}), auditF = auF[0], setAuditF = auF[1];
  var auP = useState(1), auditPage = auP[0], setAuditPage = auP[1];
  // Issued documents are left out until asked for (decision 2026-09-30 (나)); not kept on
  // the PC - the tab opens without them every time, so nobody finds it left switched on.
  var auI = useState(false), auditIssued = auI[0], setAuditIssued = auI[1];
  var auditSeq = useRef(0);   // only the latest request's answer is shown
  var AUDIT_LIMIT = 50;
  var toS = useState(''), toast = toS[0], setToast = toS[1];
  var dcS = useState('All'), drugCat = dcS[0], setDrugCat = dcS[1];
  var ocF = useState('All'), ocFilter = ocF[0], setOcFilter = ocF[1];
  var pcS = useState(null), pacsConfig = pcS[0], setPacsConfig = pcS[1];
  var ptS = useState({}), pacsTest = ptS[0], setPacsTest = ptS[1];
  var pkS = useState(false), showBridgeToken = pkS[0], setShowBridgeToken = pkS[1];
  var osS = useState([]), orderSets = osS[0], setOrderSets = osS[1];
  var oseS = useState(null), osEdit = oseS[0], setOsEdit = oseS[1];
  var osqS = useState(''), osQ = osqS[0], setOsQ = osqS[1];
  var oskS = useState('drug'), osKind = oskS[0], setOsKind = oskS[1];
  var osrS = useState([]), osResults = osrS[0], setOsResults = osrS[1];
  var clS = useState(null), clinic = clS[0], setClinic = clS[1];
  var lcS = useState(''), labCode = lcS[0], setLabCode = lcS[1];
  var liS = useState([]), labItems = liS[0], setLabItems = liS[1];
  var loS = useState([]), labOrig = loS[0], setLabOrig = loS[1];   // item list as last loaded/saved (with result_count)
  var lwS = useState(null), labWarn = lwS[0], setLabWarn = lwS[1]; // {changed, sameName} while asking before a save
  var npS = useState(false), newPanelOpen = npS[0], setNewPanelOpen = npS[1];
  var npfS = useState({code:'',name:'',price:''}), newPanel = npfS[0], setNewPanel = npfS[1];
  var bkS = useState(null), backup = bkS[0], setBackup = bkS[1];
  var bkbS = useState(false), backupBusy = bkbS[0], setBackupBusy = bkbS[1];
  function fmtBytes(n){ n=Number(n)||0; if(n<1024)return n+' B'; if(n<1048576)return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
  // The server sends UTC. Slicing that string showed times three hours early in
  // Madagascar, next to file names stamped in local time - read it in the PC's own zone.
  function fmtLocal(iso){ var d=new Date(iso); if(isNaN(d.getTime())) return ''; var p=function(n){return String(n).padStart(2,'0')}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); }

  useEffect(function(){ loadAll(); },[]);
  useEffect(function(){ if(activeTab==='backup') loadBackup(); },[activeTab]);
  // Back to the default each time the Journal tab is opened, even without leaving Settings.
  useEffect(function(){ if(activeTab==='audit') setAuditIssued(false); },[activeTab]);
  useEffect(function(){ if(activeTab==='audit') loadAudit(auditF, auditPage); },[activeTab, auditPage, auditIssued]);
  async function loadAudit(f, page, withIssued){
    if(withIssued===undefined) withIssued=auditIssued;
    var q=['limit='+AUDIT_LIMIT,'page='+page];
    ['from','to','staff_id','patient','action'].forEach(function(k){ if(f[k]) q.push(k+'='+encodeURIComponent(f[k])); });
    // Picking "document issued" in the type filter shows those lines whatever the switch says.
    if(!withIssued && f.action!=='documents.issue') q.push('exclude=documents.issue');
    var mine=++auditSeq.current;
    try { var a=await api.get('/admin/audit?'+q.join('&')); if(mine===auditSeq.current) setAudit(a); }
    catch(e){ if(mine===auditSeq.current) setAudit({error:e.message, rows:[], total:0}); }
  }
  function auditSearch(){ if(auditPage!==1) setAuditPage(1); else loadAudit(auditF, 1); }
  // The effect above reloads when the switch or the page changes.
  function auditToggleIssued(){ setAuditIssued(!auditIssued); setAuditPage(1); }
  function uaf(k,v){ setAuditF(function(p){ var n=Object.assign({},p); n[k]=v; return n; }); }
  async function loadBackup(){ try { setBackup(await api.get('/backup/status')); } catch(e){ setBackup(null); } }
  // Reload whatever happened: a failure is now shown on the tab itself, not only in the alert.
  async function runBackup(){ setBackupBusy(true); try { var r=await api.post('/backup/run',{}); showToast((t.backupDone||'백업 완료')+' · '+r.file); } catch(e){ alert((t.backupFail||'백업 실패')+': '+seMessage(t,e.message||'')); } await loadBackup(); setBackupBusy(false); }
  async function downloadBackup(name){ try { var token=localStorage.getItem('medconnect_token'); var res=await fetch('/api/backup/download/'+encodeURIComponent(name),{headers:token?{Authorization:'Bearer '+token}:{}}); if(!res.ok){ alert((t.backupFail||'다운로드 실패')+' ('+res.status+')'); return; } var blob=await res.blob(); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); } catch(e){ alert((t.backupFail||'다운로드 실패')+': '+e.message); } }

  // Each list loads on its own. They used to load one after another inside one try, so
  // the first failure left every later tab empty (the Clinic tab stuck on "Loading…"),
  // and the error went only to the console. Since permissions are read from the database
  // on every request (S1), the likeliest failure is that this person's Settings
  // permission was taken away while their browser still shows the menu - the staff list
  // then came up empty, which reads as "there are no staff". Now it is said instead.
  async function loadAll(){
    var jobs = [
      ['/admin/staff', setStaff], ['/admin/drugs', setDrugs], ['/admin/order-codes', setOrderCodes],
      ['/admin/phrases', setPhrases], ['/admin/departments', setDepts], ['/pacs/config', setPacsConfig],
      ['/admin/clinic', setClinic], ['/order-sets', setOrderSets],
    ];
    var results = await Promise.all(jobs.map(function(j){
      return api.get(j[0]).then(function(d){ j[1](d); return null; }, function(e){ return e.message || 'Request failed'; });
    }));
    var errs = results.filter(Boolean);
    setLoadError(errs.length ? (errs.indexOf('Access denied')>=0 ? 'Access denied' : errs[0]) : '');
  }

  function showToast(msg){ setToast(msg); setTimeout(function(){ setToast(''); },2000); }
  function openEdit(type, item){ setEditType(type); setEditItem(item ? JSON.parse(JSON.stringify(item)) : {}); }
  function closeEdit(){ setEditItem(null); setEditType(''); setShowPw(false); }
  function ue(k,v){ setEditItem(function(p){ var n=JSON.parse(JSON.stringify(p)); n[k]=v; return n; }); }
  function up(k,v){ setPacsConfig(function(p){ var n=Object.assign({},p||{}); n[k]=v; return n; }); }
  // Same rule the server enforces (backend/src/routes/pacs.token.js) -- shown here
  // so the warning appears while typing, not after the devices go quiet.
  function pacsTokenUsable(v){ v=String(v||''); return v.length>=16 && v!=='change-me-bridge-token'; }
  // The EMR moved 8080 -> 9080 and the PACS 8090 -> 9090 (Windows reserves the old ones).
  // An address typed from the old instructions stays in pacs_config and the viewer does
  // not open, so say so. Warn only - the value is not changed for anyone (settings session,
  // 2026-09-29; the server status check says the same: status.routes.js).
  function oldPort(url, port){ var m=String(url||'').trim().match(/^[a-z]+:\/\/[^\/:]+:(\d+)(\/|$)/i); return !!m && m[1]===String(port); }
  function pacsTokenShown(v){ return showBridgeToken ? (v||'') : '••••••••'; }

  // Order-feed tab (PACS session): the server's fixed English messages
  // (pacs.routes.js CONFIG_MSG / configProblem, and utils/tcpCheck.js for the
  // connection test) in the screen's language. A text not listed here goes on to
  // seMessage, and is shown as it came if that does not know it either.
  var PX_FIELD = { worklist_scp_host:'Host / IP', worklist_scp_ae:'AE Title', bridge_token:'Bridge Token' };
  function pxFieldName(k){ return PX_FIELD[k] || ({emr_base_url:t.emrPublicUrl, pacs_viewer_url:t.pacsViewerUrl, orthanc_url:t.px_orthancUrl})[k] || k; }
  function pxMessage(msg){
    var s=String(msg||''), m=s.match(/^(\w+) is too long \(at most (\d+) characters\)$/);
    if(m && t.px_errTooLong) return t.px_errTooLong.replace('{f}',pxFieldName(m[1])).replace('{n}',m[2]);
    var known={
      'DICOM port must be a whole number from 1 to 65535':'px_errPort',
      'Could not save the order feed settings':'px_errSave',
      'No PACS host set':'px_testNoHost',
      'TCP connection succeeded':'px_testOk',
      'Connection timed out':'px_testTimeout'
    };
    if(known[s] && t[known[s]]) return t[known[s]];
    // Node's own connect errors: "connect ECONNREFUSED 10.0.0.5:4242", "getaddrinfo ENOTFOUND nas" ...
    if(/ECONNREFUSED/.test(s) && t.px_testRefused) return t.px_testRefused;
    if(/ENOTFOUND|EAI_AGAIN/.test(s) && t.px_testUnknownHost) return t.px_testUnknownHost;
    if(/ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/.test(s) && t.px_testTimeout) return t.px_testTimeout;
    return seMessage(t,s);
  }

  async function savePacs(){
    try {
      var saved = await api.put('/pacs/config', pacsConfig);
      setPacsConfig(saved);
      showToast(t.orderFeedSaved);
    } catch(err){ alert((t.se_error)+': '+pxMessage(err.message)); }
  }

  function uclin(k,v){ setClinic(function(p){ var n=Object.assign({},p||{}); n[k]=v; return n; }); }
  async function saveClinic(){
    try {
      var saved = await api.put('/admin/clinic', clinic||{});
      setClinic(saved);
      showToast(t.se_saved);
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }

  function loadLabItems(codeId){
    setLabCode(codeId);
    if(!codeId){ setLabItems([]); setLabOrig([]); return; }
    api.get('/lab/test-items?order_code_id='+codeId).then(function(r){ setLabOrig(r||[]); setLabItems((r||[]).map(function(x){return Object.assign({},x);})); }).catch(function(){ setLabOrig([]); setLabItems([]); });
  }
  function uli(i,k,v){ setLabItems(function(p){ var n=p.slice(); n[i]=Object.assign({},n[i]); n[i][k]=v; return n; }); }
  function addLi(){ setLabItems(function(p){ return p.concat([{name:'',unit:'',ref_low:'',ref_high:'',ref_text:''}]); }); }
  function delLi(i){ setLabItems(function(p){ var n=p.slice(); n.splice(i,1); return n; }); }
  // Reference ranges by sex and age (decision 4): rows under an item, saved with it.
  // it._open only shows/hides the rows; the server ignores it.
  function toggleRanges(i){ uli(i,'_open',!labItems[i]._open); }
  function urng(i,j,k,v){ setLabItems(function(p){ var n=p.slice(); n[i]=Object.assign({},n[i]); n[i].ranges=(n[i].ranges||[]).slice(); n[i].ranges[j]=Object.assign({},n[i].ranges[j]); n[i].ranges[j][k]=v; return n; }); }
  function addRng(i){ setLabItems(function(p){ var n=p.slice(); n[i]=Object.assign({},n[i]); n[i].ranges=(n[i].ranges||[]).concat([{sex:'',age_min:'',age_max:'',age_unit:'y',ref_low:'',ref_high:'',ref_text:'',note:''}]); return n; }); }
  function delRng(i,j){ setLabItems(function(p){ var n=p.slice(); n[i]=Object.assign({},n[i]); n[i].ranges=(n[i].ranges||[]).slice(); n[i].ranges.splice(j,1); return n; }); }
  // Same checks as rangeError() in backend/src/routes/lab.routes.js (which refuses the
  // save anyway) -- here only to say it in the screen's language. Rows of the same
  // sex must not overlap in age: with two candidates nobody could tell which applied.
  function rangeProblem(it){
    var DAYS={d:1,m:30.4375,y:365.25};
    function ni(v){ return v===null||v===undefined||v===''?null:parseInt(v,10); }
    function nn(v){ return v===null||v===undefined||v===''?NaN:parseFloat(v); }
    var list=it.ranges||[], name=it.name||'';
    for(var i=0;i<list.length;i++){
      var r=list[i], lo=ni(r.age_min), hi=ni(r.age_max);
      if((lo!==null&&(isNaN(lo)||lo<0))||(hi!==null&&(isNaN(hi)||hi<=0))||(lo!==null&&hi!==null&&lo>=hi)) return t.lb_errRangeAge.replace('{item}',name);
      var L=nn(r.ref_low), H=nn(r.ref_high);
      if(isNaN(L)&&isNaN(H)&&!String(r.ref_text||'').trim()) return t.lb_errRangeEmpty.replace('{item}',name);
      if(!isNaN(L)&&!isNaN(H)&&L>H) return t.lb_errRangeLowHigh.replace('{item}',name);
    }
    function span(r){ var f=DAYS[r.age_unit||'y'], lo=ni(r.age_min), hi=ni(r.age_max); return [lo===null?-Infinity:lo*f, hi===null?Infinity:hi*f]; }
    for(var a=0;a<list.length;a++) for(var b=a+1;b<list.length;b++){
      if((list[a].sex||'')!==(list[b].sex||'')) continue;
      var x=span(list[a]), y=span(list[b]);
      if(x[0]<y[1]-0.5&&y[0]<x[1]-0.5) return t.lb_errRangeOverlap.replace('{item}',name);
    }
    return null;
  }
  // Changing the unit of an item that already has results shows the old numbers
  // under the new unit (and re-flags them against the new range if re-saved);
  // so does a new row named like a deleted item that had results. Ask first --
  // the safe way is a differently named new row. It only asks; it never blocks.
  function labRisks(){
    function norm(u){ return String(u==null?'':u).trim(); }
    var byId={}; labOrig.forEach(function(o){ byId[o.id]=o; });
    var kept={}; labItems.forEach(function(it){ if(it.id) kept[it.id]=true; });
    var changed=labItems.filter(function(it){ var o=it.id&&byId[it.id]; return o && o.result_count>0 && norm(it.unit)!==norm(o.unit); })
      .map(function(it){ var o=byId[it.id]; return { name: it.name, from: norm(o.unit)||'—', to: norm(it.unit)||'—', n: o.result_count }; });
    var sameName=labOrig.filter(function(o){ return !kept[o.id] && o.result_count>0 && labItems.some(function(it){ return it.id!==o.id && norm(it.name)===norm(o.name); }); })
      .map(function(o){ return { name: o.name, n: o.result_count }; });
    return (changed.length||sameName.length) ? { changed: changed, sameName: sameName } : null;
  }
  async function saveLabItems(force){
    if(!labCode) return;
    for(var q=0;q<labItems.length;q++){ if(!labItems[q].name) continue; var bad=rangeProblem(labItems[q]); if(bad){ alert(bad); return; } }
    if(force!==true){ var risk=labRisks(); if(risk){ setLabWarn(risk); return; } }
    setLabWarn(null);
    try {
      var saved = await api.post('/lab/test-items/save', { order_code_id: labCode, items: labItems });
      setLabOrig(saved||[]);
      setLabItems((saved||[]).map(function(x){return Object.assign({},x);}));
      showToast(t.lb_saved);
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }
  function unp(k,v){ setNewPanel(function(p){ var n=Object.assign({},p); n[k]=v; return n; }); }
  async function createPanel(){
    if(!newPanel.code || !newPanel.name){ alert(t.lb_codeNameRequired); return; }
    try {
      var p = await api.post('/admin/order-codes', { code:newPanel.code.trim(), name:newPanel.name.trim(), code_type:'lab', group_name:'Lab', price:Number(newPanel.price)||0, price_clinic:Number(newPanel.price)||0 });
      var codes = await api.get('/admin/order-codes'); setOrderCodes(codes);
      setNewPanelOpen(false); setNewPanel({code:'',name:'',price:''});
      loadLabItems(String(p.id));
      showToast(t.lb_saved);
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }

  async function testPacs(target){
    try {
      setPacsTest(function(p){return Object.assign({},p,{[target]:{message:t.px_testing||'Checking...'}})});
      var r = await api.get('/pacs/test?target='+target);
      // The address tested stays in the line: the translated sentence alone would not
      // say which host was wrong.
      var where = r.host ? ' ('+r.host+':'+r.port+')' : '';
      setPacsTest(function(p){return Object.assign({},p,{[target]:Object.assign({},r,{message:pxMessage(r.message)+where})})});
    } catch(err){ setPacsTest(function(p){return Object.assign({},p,{[target]:{ok:false,message:pxMessage(err.message)}})}); }
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
        // Stock is not saved from here any more - it moves only through the pharmacy's
        // Stock tab - so it is left out of the request (the server ignores it anyway).
        // Nor the default dose, times, days and posology (decision B): the form no longer
        // has them, and the server keeps what is already stored when they are not sent.
        var dbody=Object.assign({},item); delete dbody.stock_qty; delete dbody.stock_expected;
        delete dbody.default_dose; delete dbody.default_freq; delete dbody.default_days; delete dbody.default_route;
        if(item.id) await api.put('/admin/drugs/'+item.id, dbody);
        else await api.post('/admin/drugs', dbody);
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
      }
      closeEdit(); showToast(t.se_saved);
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }

  async function deleteItem(type, id){
    // Staff are never deleted, only deactivated - say so, since that is what happens.
    var question = type==='staff' ? t.se_confirmDeactivate : t.se_confirmDelete;
    // A hidden drug stays in every order set that copied it (they keep their own drug id),
    // so name those sets before the drug is hidden. A warning, not a refusal.
    if(type==='drug'){
      try {
        var sets = await api.get('/admin/drugs/'+id+'/order-sets');
        if(sets && sets.length) question = (t.se_drugInSets||'').replace('{n}', sets.length).replace('{names}', sets.map(function(x){return x.name;}).join(', '));
      } catch(e){}
    }
    if(!confirm(question)) return;
    try {
      if(type==='staff') await api.del('/admin/staff/'+id);
      else if(type==='drug') await api.del('/admin/drugs/'+id);
      else if(type==='order') await api.del('/admin/order-codes/'+id);
      else if(type==='phrase') await api.del('/admin/phrases/'+id);
      await loadAll();
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }

  // Bring a deactivated account back (U2): administrators only - the server checks the
  // role too (POST /admin/staff/:id/reactivate). Login, password and permissions come
  // back as they were.
  var meIsAdmin = (getUser()||{}).role === 'admin';
  async function reactivateStaff(s){
    if(!confirm((t.se_confirmReactivate||'').replace('{name}', s.name+' ('+s.login_id+')'))) return;
    try { await api.post('/admin/staff/'+s.id+'/reactivate', {}); await loadAll(); }
    catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }

  // ── 약속처방(Order Sets) ──
  async function osReload(){ try { setOrderSets(await api.get('/order-sets')); } catch(e){} }
  function osNew(){ setOsEdit({name:'',group_name:'',department_id:'',description:'',items:[]}); setOsQ(''); setOsResults([]); setOsKind('drug'); }
  // A stored number as the field shows it: '3.000' -> '3'; empty stays empty.
  function osNum(v){ if(v==null || String(v).trim()==='') return ''; var n=Number(v); return isFinite(n) ? String(n) : String(v); }
  // A drug line whose drug was hidden from the list (drug_active false) or no longer exists
  // (null). The consultation screen leaves such lines out when the set is applied, so the
  // set says so here (integration test: two sets held only hidden drugs, and only the
  // consultation screen showed it). Lines added in this editor come from the list.
  function osGone(it){ return it.kind==='drug' && it.drug_active!==undefined && it.drug_active!==true; }
  function osGoneCount(items){ return (items||[]).filter(osGone).length; }
  function osOpen(s){
    setOsEdit({ id:s.id, name:s.name||'', group_name:s.group_name||'', department_id:s.department_id||'', description:s.description||'',
      items:(s.items||[]).map(function(it){ return {kind:it.kind, drug_id:it.drug_id, order_code_id:it.order_code_id, code:it.code, name:it.name, code_type:it.order_code_type,
        dose:osNum(it.dose), frequency:osNum(it.frequency), days:osNum(it.days), route:it.route||'', quantity:(it.quantity==null?1:Number(it.quantity)), drug_active:it.drug_active}; }) });
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
      // A drug line starts empty (2026-09-29, the director: the dose, times and days are
      // decided here, in the set - not copied from the drug, which no longer has them).
      // An exam / procedure line starts 1 x 1 x 1.
      if(osKind==='drug') items.push({kind:'drug', drug_id:r.id, code:r.code, name:r.name, dose:'', frequency:'', days:'', route:'', quantity:1, drug_active:true});
      else items.push({kind:'order', order_code_id:r.id, code:r.code, name:r.name, code_type:r.code_type, dose:'', frequency:'1', days:'1', quantity:1});
      n.items=items; return n;
    });
  }
  // Bottles/tubes for a pack-unit drug line (quantity; the consultation screen prescribes
  // that many when the set is applied). Other lines keep 1 and show no field. Whether a
  // drug is pack-unit is read from the drug list as it is now (a hidden drug is not in it
  // and shows as an ordinary line); the order-set route is the consultation session's.
  function drugPack(id){ var d=drugs.filter(function(x){return x.id===id;})[0]; return d && d.pack_unit ? (d.pack_label||'unit') : null; }
  function osItem(idx, key, v){ setOsEdit(function(e){ var n=Object.assign({},e); n.items=(e.items||[]).map(function(it,i){ if(i!==idx) return it; var c=Object.assign({},it); c[key]=v; return c; }); return n; }); }
  // A set line's numbers, checked the way the consultation server checks a prescription
  // line (utils/validate.js LIMITS): daily total 0-1000, times 1-24 and days 1-365 whole
  // numbers, directions at most 10 characters. On a drug line (not pack-unit) the daily
  // total and the days must be there: without them a line applied from the set is
  // prescribed with a total of 0 ("no total"). Returns 'missing' | 'bad' | null.
  function osLineProblem(it){
    var blank=function(v){ return v==null || String(v).trim()===''; };
    var num=function(v,min,max,whole){ var n=Number(v); return isFinite(n) && n>=min && n<=max && (!whole || Number.isInteger(n)); };
    if(!blank(it.dose) && !num(it.dose,0,1000,false)) return 'bad';
    if(!blank(it.frequency) && !num(it.frequency,1,24,true)) return 'bad';
    if(!blank(it.days) && !num(it.days,1,365,true)) return 'bad';
    if(String(it.route||'').length>10) return 'bad';
    if(it.kind==='drug'){
      if(drugPack(it.drug_id)) return num(it.quantity,1,10000,true) ? null : 'bad';
      if(blank(it.dose) || !(Number(it.dose)>0) || blank(it.days)) return 'missing';
      return null;
    }
    if(!blank(it.quantity) && !num(it.quantity,0.001,10000,false)) return 'bad';
    return null;
  }
  function osRemove(idx){ setOsEdit(function(e){ var n=Object.assign({},e); n.items=(e.items||[]).filter(function(_,i){return i!==idx;}); return n; }); }
  async function osSave(){
    if(!osEdit) return;
    if(!osEdit.name){ alert(t.setName+' ?'); return; }
    var its=osEdit.items||[];
    var missing=its.filter(function(it){ return osLineProblem(it)==='missing'; }).map(function(it){ return it.name||it.code; });
    var bad=its.filter(function(it){ return osLineProblem(it)==='bad'; }).map(function(it){ return it.name||it.code; });
    if(missing.length){ alert(String(t.se_setNeedDose||'').replace('{names}', missing.join(', '))); return; }
    if(bad.length){ alert(String(t.se_setBadNumber||'').replace('{names}', bad.join(', '))); return; }
    try {
      // Empty times / days / quantity on an exam line mean 1; on a drug line the server
      // stores empty times as 1 (not multiplied - the daily total is what counts).
      var items=its.map(function(it){ var trim=function(v){ return v==null ? '' : String(v).trim(); };
        var c={kind:it.kind, drug_id:it.drug_id, order_code_id:it.order_code_id, code:it.code, name:it.name,
          dose:trim(it.dose)||null, frequency:trim(it.frequency)||null, days:trim(it.days)||null, route:trim(it.route)||null, quantity:it.quantity};
        if(it.kind!=='drug'){ c.frequency=c.frequency||1; c.days=c.days||1; c.quantity=trim(it.quantity)||1; }
        return c; });
      var body={ name:osEdit.name, group_name:osEdit.group_name||null, department_id:osEdit.department_id||null, description:osEdit.description||'', items:items };
      if(osEdit.id) await api.put('/order-sets/'+osEdit.id, body);
      else await api.post('/order-sets', body);
      setOsEdit(null); await osReload(); showToast(t.se_saved);
    } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
  }
  async function osDelete(s){
    if(!confirm(t.se_confirmDelete+' '+s.name)) return;
    try { await api.del('/order-sets/'+s.id); await osReload(); } catch(err){ alert((t.se_error)+': '+seMessage(t,err.message)); }
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

  var bd='var(--border)',bd2='var(--border-2)',scBg='var(--panel-head)',pn='var(--panel)',tx='var(--text)',t2='var(--text-2)',t3='var(--text-3)';
  var IS={width:'100%',background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'7px 10px',color:'var(--text)',fontSize: 14,outline:'none',boxSizing:'border-box',fontFamily:'inherit'};
  // opacity 1: Chrome fades a disabled <select> to 0.7 on its own, which also fades its text
  // (design 3.3.1); the locked look comes from the two colours alone.
  var LOCKED_IS=Object.assign({},IS,{background:'var(--field-locked)',color:'var(--text-locked)',cursor:'not-allowed',opacity:1});

  // The account the setup wizard created. Its role and permissions are fixed server-side
  // (see admin.routes.js); greying them out here just stops someone trying. Editing any
  // other admin is still allowed - the API refuses only the change that would leave
  // nobody able to open Settings.
  var lockedAdmin = !!(editItem && editItem.id && editItem.login_id === 'admin');
  var RC={frontdesk:'accent',doctor:'ok',nurse:'teal',pharmacy:'violet',lab:'cyan',admin:'danger'};   // colour families (design): tint() and -ink make the colours
  var TC={fee:'accent',lab:'warn',imaging:'violet',procedure:'ok'};

  var TABS = [
    {key:'staff',label:'👥 '+t.se_tabStaff},{key:'drug',label:'💊 '+t.se_tabDrugs},{key:'order',label:'📋 '+t.se_tabOrderCodes},
    {key:'phrase',label:'📝 '+t.se_tabPhrases},{key:'dept',label:'🏥 '+t.se_tabDepts},{key:'orderset',label:'🧪 '+t.orderSets},{key:'labitems',label:'🧫 '+(t.labItems||'Lab Items')},{key:'pacs',label:'🔗 '+t.orderFeedTab},{key:'backup',label:'💾 '+(t.backupTab||'백업')},{key:'audit',label:'📜 '+t.se_tabAudit},{key:'clinic',label:'🏢 '+t.se_tabClinic},
  ];

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'var(--bg)',color:tx,minHeight:'100vh',fontSize: 15}}>
      <TopBar />
      <div style={{display:'grid',gridTemplateColumns:'180px 1fr',height:'calc(100vh - 82px)'}}>
        {/* Sidebar */}
        <div style={{borderRight:'1px solid '+bd,background:pn,padding:'10px 0'}}>
          <div style={{padding:'0 12px 10px',fontSize: 14,fontWeight:700,color:tx}}>{t.settings}</div>
          {TABS.map(function(tab){
            return <div key={tab.key} className="pressable" onClick={function(){setTab(tab.key);setQ('')}} style={{padding:'8px 14px',cursor:'pointer',background:activeTab===tab.key?'var(--accent-a12)':'transparent',borderLeft:activeTab===tab.key?'3px solid var(--accent-ink)':'3px solid transparent',color:activeTab===tab.key?'var(--accent-text)':t2,fontSize: 14,fontWeight:activeTab===tab.key?600:400}}>{tab.label}</div>;
          })}
        </div>

        {/* Content */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-col)'}}>
          {loadError?<div style={{background:'var(--danger-a18)',borderBottom:'1px solid var(--danger-a40)',color:'var(--danger-text-2)',padding:'8px 14px',fontSize:13,fontWeight:600}}>⚠ {seMessage(t, loadError)}</div>:null}

          {/* STAFF */}
          {activeTab==='staff'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>👥 {t.se_tabStaff}</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('staff',{login_id:'',name:'',role:'frontdesk',permissions:defaultPermsForRole('frontdesk'),password:'1234',phone:'',status:'active'})}} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>{t.se_addBtn}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 14}}>
              <thead><tr style={{background:'var(--chip)'}}>
                {[t.se_colName,t.se_colLoginId,t.se_colRole,t.se_colDept,t.se_colPhone,t.se_colStatus,''].map(function(h,i){return <th key={i} style={{padding:'6px 10px',textAlign:'left',color:t3,fontSize: 12,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              {/* Active accounts first, the deactivated ones below; name order within each. */}
              <tbody>{staff.slice().sort(function(a,b){ return (a.status==='inactive'?1:0)-(b.status==='inactive'?1:0); }).map(function(s){
                var rc=RC[s.role]||'text-2';
                return <tr key={s.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                  <td style={{padding:'6px 10px',fontWeight:600,color:tx}}>{s.name}</td>
                  <td style={{padding:'6px 10px',fontFamily:'monospace',color:'var(--accent-text)',fontSize: 13}}>{s.login_id}</td>
                  <td style={{padding:'6px 10px'}}><span style={{background:tint(rc,'15'),color:RC[s.role]?'var(--'+rc+'-ink)':t2,borderRadius:3,padding:'2px 6px',fontSize: 12,fontWeight:600}}>{t['se_role_'+s.role]||s.role}</span>
                    <div style={{marginTop:3,fontSize: 13,letterSpacing:1}} title={(s.permissions||[]).join(', ')}>{MODULES.filter(function(m){return (s.permissions||[]).indexOf(m.perm)>=0}).map(function(m){return m.icon}).join(' ')}</div></td>
                  <td style={{padding:'6px 10px',color:t2}}>{s.dept_code||'—'}</td>
                  <td style={{padding:'6px 10px',color:t2,fontSize: 13}}>{s.phone||'—'}</td>
                  <td style={{padding:'6px 10px',color:s.status==='active'?'var(--ok-text)':'var(--danger-text)',fontSize: 13,fontWeight:600}}>{s.status==='active'?t.se_statusActive:t.se_statusInactive}</td>
                  <td style={{padding:'6px 10px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('staff',s)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    {s.status==='inactive'
                      ? (meIsAdmin ? <button onClick={function(){reactivateStaff(s)}} style={{background:'var(--ok-2-a15)',color:'var(--ok-text)',border:'1px solid var(--ok-2-a40)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.se_reactivate}</button> : null)
                      : <button onClick={function(){deleteItem('staff',s.id)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>}
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* DRUGS */}
          {activeTab==='drug'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:6,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>💊 {t.drugs}</span>
              <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:140,marginLeft:'auto',boxSizing:'border-box'}}/>
              <button onClick={function(){openEdit('drug',{code:'',name:'',category:'Other',dosage_form:'',unit_price:0,stock_qty:0,min_stock:10})}} style={{background:'var(--violet-a20)',color:'var(--violet-text)',border:'1px solid var(--violet-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ {t.add}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 13}}>
              <thead><tr style={{background:'var(--chip)'}}>
                {/* No default dose / times / days / posology (decision B, 2026-09-29): a drug
                    carries its price; the doctor's order sets carry the dosing. */}
                {[t.code,t.colDrugName,t.ph_category,t.ph_unitPrice,t.ph_stock,''].map(function(h,i){return <th key={i} style={{padding:'5px 6px',textAlign:i===3||i===4?'right':'left',color:t3,fontSize: 11,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              <tbody>{filteredDrugs.map(function(d){
                return <tr key={d.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                  <td style={{padding:'4px 6px',color:'var(--accent-text)',fontFamily:'monospace',fontWeight:600,fontSize: 13}}>{d.code}</td>
                  <td style={{padding:'4px 6px',color:tx}}>{checkOpen(d) ? <span title={checkList(d).map(function(c){return checkText(t,c);}).join('\n')} style={{color:'var(--warn-text)',marginRight:4}}>⚠</span> : null}{d.name}{d.dosage_form ? <span style={{marginLeft:6,fontSize: 11,color:t2}}>{formLabel(t,d.dosage_form)}</span> : null}{d.pack_unit ? <span style={{marginLeft:6,fontSize: 11,color:'var(--warn-text)',border:'1px solid var(--warn-a60)',borderRadius:3,padding:'0 4px'}}>{t['ph_pack_'+(d.pack_label||'unit')]}</span> : null}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{drugCatLabel(t, d.category)}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',fontFamily:'monospace',color:tx,whiteSpace:'nowrap'}}>{seMoney(d.unit_price, langCtx.lang)}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',color:(Number(d.min_stock)>0&&Number(d.stock_qty)<=Number(d.min_stock))?'var(--danger-text)':'var(--ok-text)',fontWeight:600}}>{d.stock_qty}</td>
                  <td style={{padding:'4px 6px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('drug',d)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    <button onClick={function(){deleteItem('drug',d.id)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* ORDER CODES */}
          {activeTab==='order'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:6,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>📋 {t.se_tabOrderCodes}</span>
              {['All','fee','lab','imaging','procedure'].map(function(f){
                var c=TC[f]||'accent';
                return <button key={f} onClick={function(){setOcFilter(f)}} style={{background:ocFilter===f?tint(c,'20'):'transparent',color:ocFilter===f?'var(--'+c+'-ink)':t3,border:ocFilter===f?'1px solid '+tint(c,'40'):'1px solid transparent',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11,fontWeight:600}}>{f==='All'?t.se_all:t['se_type_'+f]}</button>;
              })}
              <input value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.search} style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:140,marginLeft:'auto',boxSizing:'border-box'}}/>
              <button onClick={function(){openEdit('order',{code:'',name:'',name_en:'',code_type:'fee',group_name:'Consultation',default_dose:'1.000',default_freq:1,default_days:1,price:0,price_clinic:0,pacs_modality:'',worklist_enabled:false,station_ae:'',body_part:'',memo:''})}} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>{t.se_addBtn}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 13}}>
              <thead><tr style={{background:'var(--chip)'}}>
                {[t.se_colCode,t.se_colName,t.se_colType,t.se_colGroup,t.se_colPrice,t.se_colModality,t.se_colWorklist,t.se_colBodyPart,''].map(function(h,i){return <th key={i} style={{padding:'5px 6px',textAlign:i===4?'right':'left',color:t3,fontSize: 11,borderBottom:'1px solid '+bd}}>{h}</th>})}
              </tr></thead>
              <tbody>{filteredOC.map(function(o){
                var tc=TC[o.code_type]||'text-2';
                return <tr key={o.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                  <td style={{padding:'4px 6px',color:'var(--accent-text)',fontFamily:'monospace',fontWeight:700,fontSize: 13}}>{o.code}</td>
                  <td style={{padding:'4px 6px',color:tx}}>{o.name}</td>
                  <td style={{padding:'4px 6px'}}><span style={{background:tint(tc,'15'),color:TC[o.code_type]?'var(--'+tc+'-ink)':t2,borderRadius:3,padding:'1px 5px',fontSize: 11,fontWeight:600}}>{t['se_type_'+o.code_type]||o.code_type}</span></td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{o.group_name}</td>
                  <td style={{padding:'4px 6px',textAlign:'right',fontFamily:'monospace',color:tx,whiteSpace:'nowrap'}}>{seMoney(o.price_clinic!=null?o.price_clinic:o.price, langCtx.lang)}</td>
                  <td style={{padding:'4px 6px'}}>{o.pacs_modality?<span style={{background:'var(--violet-a20)',color:'var(--violet-text)',borderRadius:3,padding:'1px 5px',fontSize: 12,fontWeight:700,fontFamily:'monospace'}}>{o.pacs_modality}</span>:'—'}</td>
                  <td style={{padding:'4px 6px',color:o.worklist_enabled?'var(--ok-text)':'var(--text-5)'}}>{o.worklist_enabled?'✓':'—'}</td>
                  <td style={{padding:'4px 6px',color:t2,fontSize: 12}}>{o.body_part||'—'}</td>
                  <td style={{padding:'4px 6px',display:'flex',gap:3}}>
                    <button onClick={function(){openEdit('order',o)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                    <button onClick={function(){deleteItem('order',o.id)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
          </div>):null}

          {/* PHRASES */}
          {activeTab==='phrase'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>📝 {t.se_tabPhrases}</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('phrase',{category:'General',text:''})}} style={{background:'var(--warn-a20)',color:'var(--warn-text)',border:'1px solid var(--warn-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>{t.se_addBtn}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              {phrases.map(function(p){ return <div key={p.id} style={{padding:'7px 14px',borderBottom:'1px solid var(--line-soft)',display:'flex',gap:8}}>
                <span style={{background:'var(--warn-a20)',color:'var(--warn-text)',borderRadius:3,padding:'1px 5px',fontSize: 11,fontWeight:600,flexShrink:0}}>{p.category}</span>
                {/* The same choice the consultation screen makes, so the list shows what doctors will see. */}
                <span style={{flex:1,fontSize: 14,color:'var(--text-soft)'}}>{(langCtx.lang==='fr'&&p.text_fr)||(langCtx.lang==='en'&&p.text_en)||p.text}
                  {' '}{p.text_fr?<span style={{fontSize:10,color:t3,border:'1px solid '+bd2,borderRadius:3,padding:'0 3px'}}>FR</span>:null}{p.text_en?<span style={{fontSize:10,color:t3,border:'1px solid '+bd2,borderRadius:3,padding:'0 3px',marginLeft:3}}>EN</span>:null}</span>
                <button onClick={function(){openEdit('phrase',p)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
                <button onClick={function(){deleteItem('phrase',p.id)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.delete}</button>
              </div>; })}
            </div>
          </div>):null}

          {/* DEPARTMENTS */}
          {activeTab==='dept'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,display:'flex',alignItems:'center',gap:8,background:scBg}}>
              <span style={{fontWeight:700,fontSize: 14,color:tx}}>🏥 {t.se_tabDepts}</span><div style={{flex:1}}></div>
              <button onClick={function(){openEdit('dept',{code:'',name:'',name_en:'',name_fr:''})}} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>{t.se_addBtn}</button>
            </div>
            <div style={{flex:1,overflow:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize: 14}}>
              <thead><tr style={{background:'var(--chip)'}}>{[t.se_colCode,t.se_colName,t.se_colHead,''].map(function(h,i){return <th key={i} style={{padding:'6px 10px',textAlign:'left',color:t3,fontSize: 12,borderBottom:'1px solid '+bd}}>{h}</th>})}</tr></thead>
              <tbody>{depts.map(function(d){return <tr key={d.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                <td style={{padding:'6px 10px',color:'var(--accent-text)',fontFamily:'monospace',fontWeight:600}}>{d.code}</td>
                <td style={{padding:'6px 10px',color:tx}}>{d.name}</td>
                <td style={{padding:'6px 10px',color:t2}}>{d.head_name||'—'}</td>
                <td style={{padding:'6px 10px',display:'flex',gap:3}}>
                  <button onClick={function(){openEdit('dept',d)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11}}>{t.edit}</button>
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
                  <button onClick={osNew} style={{background:'var(--ok-a20)',color:'var(--ok-text)',border:'1px solid var(--ok-a40)',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ {t.newSet}</button>
                </div>
                <div style={{flex:1,overflow:'auto',padding:'10px 14px'}}>
                  {orderSets.length>0?osGrouped().map(function(grp,gi){
                    return <div key={gi} style={{marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,paddingBottom:4,borderBottom:'1px solid '+bd}}>
                        <span style={{fontSize: 14}}>📁</span>
                        <span style={{fontWeight:800,fontSize: 14,color:'var(--text)'}}>{grp.group||t.ungrouped}</span>
                        <span style={{fontSize: 12,color:t3}}>({grp.sets.length})</span>
                      </div>
                      {grp.sets.map(function(s){
                        return <div key={s.id} style={{background:scBg,border:'1px solid '+bd,borderRadius:7,padding:'10px 12px',marginBottom:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                            <span style={{fontWeight:800,fontSize: 14,color:'var(--ok-text)'}}>{s.name}</span>
                            {s.dept_code?<span style={{fontSize: 12,color:t2,background:'var(--bg)',border:'1px solid '+bd2,borderRadius:4,padding:'1px 6px'}}>{s.dept_code}</span>:null}
                            <span style={{fontSize: 12,color:t3}}>{(s.items||[]).length} {t.itemsUnit}</span>
                            {osGoneCount(s.items) ? <span title={t.se_osGoneHint} style={{fontSize: 12,color:'var(--warn-text)'}}>{String(t.se_osGone||'').replace('{n}', osGoneCount(s.items))}</span> : null}
                            <div style={{flex:1}}></div>
                            <button onClick={function(){osOpen(s)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:3,padding:'2px 8px',cursor:'pointer',fontSize: 12}}>{t.edit}</button>
                            <button onClick={function(){osDelete(s)}} style={{background:'var(--danger-a18)',color:'var(--danger-text)',border:'1px solid var(--danger-a40)',borderRadius:3,padding:'2px 8px',cursor:'pointer',fontSize: 12}}>{t.delete}</button>
                          </div>
                          <div style={{fontSize: 12,color:'var(--text-2)'}}>{(s.items||[]).length ? (s.items||[]).map(function(it,i){ return <span key={i}>{i ? ' · ' : ''}<span title={osGone(it) ? t.se_osGoneLine : undefined} style={osGone(it) ? {textDecoration:'line-through',color:'var(--text-3)'} : undefined}>{it.code}</span></span>; }) : '—'}</div>
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
                  <button onClick={function(){setOsEdit(null)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'4px 10px',cursor:'pointer',fontSize: 13}}>{t.cancel||'Cancel'}</button>
                  <button onClick={osSave} style={{background:'linear-gradient(135deg,var(--ok),var(--ok-strong))',color:'var(--on-fill)',border:'none',borderRadius:4,padding:'4px 14px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.save}</button>
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
                    <div style={{marginTop:10,fontSize: 13,fontWeight:700,color:'var(--ok-text)'}}>{t.setItems} ({(osEdit.items||[]).length})</div>
                    {osGoneCount(osEdit.items) ? <div style={{marginTop:6,padding:'6px 8px',border:'1px solid var(--warn-a60)',background:'var(--warn-a12)',borderRadius:5,fontSize: 12,color:'var(--warn-text)',lineHeight:1.5}}><b>{String(t.se_osGone||'').replace('{n}', osGoneCount(osEdit.items))}</b><div style={{color:'var(--text-soft)'}}>{t.se_osGoneHint}</div></div> : null}
                    <div style={{marginTop:6,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
                      {(osEdit.items||[]).length>0?(osEdit.items||[]).map(function(it,idx){
                        // Each line is edited here, in the set (2026-09-29, the director): a drug
                        // line gets its daily total, times, days and directions - the same fields,
                        // order and names as a prescription line in the consultation screen - and
                        // a pack-unit drug its bottle count as well; an exam / procedure line its
                        // quantity, times and days.
                        var pk=it.kind==='drug'?drugPack(it.drug_id):null;
                        var prob=osLineProblem(it);
                        var fld=function(label, key, w, hint, extra){ return <label key={key} title={hint||''} style={{display:'flex',flexDirection:'column',gap:2,fontSize:11,color:t3}}>
                          <span style={{whiteSpace:'nowrap'}}>{label}</span>
                          <input value={it[key]==null?'':it[key]} maxLength={key==='route'?10:undefined} inputMode={key==='route'?undefined:'decimal'} onChange={function(e){osItem(idx,key,e.target.value)}}
                            style={Object.assign({},IS,{width:w,padding:'3px 5px',textAlign:'center'},extra||{})}/></label>; };
                        var need=prob==='missing', badB={borderColor:'var(--danger-text)'};
                        return <div key={idx} style={{padding:'6px 8px',borderBottom:'1px solid var(--line-soft)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize: 11,fontWeight:700,color:it.kind==='drug'?'var(--accent-text)':'var(--violet-text)',width:38}}>{it.kind==='drug'?'Rx':'Exam'}</span>
                            <span style={{fontFamily:'monospace',fontSize: 12,color:t2,width:56}}>{it.code}</span>
                            <span style={{fontSize: 13,color:osGone(it)?'var(--text-3)':tx,flex:1,textDecoration:osGone(it)?'line-through':'none'}}>{it.name}</span>
                            {osGone(it) ? <span style={{fontSize: 11,color:'var(--warn-text)',whiteSpace:'nowrap'}}>⚠ {t.se_osGoneLine}</span> : null}
                            <button onClick={function(){osRemove(idx)}} style={{background:'transparent',border:'none',color:'var(--danger-text)',cursor:'pointer',fontSize: 14}}>✕</button>
                          </div>
                          <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',gap:8,marginTop:4,paddingLeft:44}}>
                            {it.kind==='drug' ? [
                              fld(t.cs_colDaily,'dose',58,t.cs_colDailyHint, need && !(Number(it.dose)>0) ? badB : null),
                              fld(t.cs_colTimes,'frequency',46),
                              fld(t.cs_colDays,'days',46,null, need && !String(it.days==null?'':it.days).trim() ? badB : null),
                              fld(t.cs_colSig,'route',64)
                            ] : [
                              fld(t.se_setColQty,'quantity',58),
                              fld(t.cs_colTimes,'frequency',46),
                              fld(t.cs_colDays,'days',46)
                            ]}
                            {pk ? <label title={t.se_setPackQtyHint} style={{display:'flex',flexDirection:'column',gap:2,fontSize:11,color:'var(--warn-text)'}}>
                              <span style={{whiteSpace:'nowrap'}}>{t['ph_pack_'+pk]}</span>
                              <input type="number" min="1" step="1" value={it.quantity==null?1:it.quantity} onChange={function(e){osItem(idx,'quantity',e.target.value)}} style={Object.assign({},IS,{width:56,padding:'3px 5px',textAlign:'center'})}/></label> : null}
                            {need ? <span style={{fontSize:11,color:'var(--danger-text-2)',paddingBottom:4}}>⚠ {t.se_setNeedDoseShort}</span> : null}
                            {prob==='bad' ? <span style={{fontSize:11,color:'var(--danger-text-2)',paddingBottom:4}}>⚠ {t.se_setBadNumberShort}</span> : null}
                          </div>
                        </div>;
                      }):<div style={{padding:14,textAlign:'center',color:t3,fontSize: 12}}>{t.setItemsEmpty}</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{display:'flex',gap:6,marginBottom:6}}>
                      <button onClick={function(){setOsKind('drug');setOsResults([])}} style={{flex:1,background:osKind==='drug'?'var(--accent-a20)':'var(--chip)',color:osKind==='drug'?'var(--accent-text)':t2,border:'1px solid '+bd2,borderRadius:4,padding:'5px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.setDrug}</button>
                      <button onClick={function(){setOsKind('order');setOsResults([])}} style={{flex:1,background:osKind==='order'?'var(--violet-a20)':'var(--chip)',color:osKind==='order'?'var(--violet-text)':t2,border:'1px solid '+bd2,borderRadius:4,padding:'5px',cursor:'pointer',fontSize: 13,fontWeight:700}}>{t.setExam}</button>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <input value={osQ} onChange={function(e){setOsQ(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')osRunSearch()}} placeholder={t.search} style={Object.assign({},IS,{flex:1})}/>
                      <button onClick={osRunSearch} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid '+bd2,borderRadius:4,padding:'0 12px',cursor:'pointer',fontSize: 13}}>{t.search}</button>
                    </div>
                    <div style={{marginTop:6,border:'1px solid '+bd,borderRadius:6,maxHeight:360,overflow:'auto'}}>
                      {osResults.map(function(r){
                        return <div key={r.id} onClick={function(){osAdd(r)}} style={{display:'flex',gap:8,padding:'6px 8px',borderBottom:'1px solid var(--line-soft)',cursor:'pointer'}}>
                          <span style={{fontFamily:'monospace',fontSize: 12,color:'var(--accent-text)',width:56}}>{r.code}</span>
                          {osKind==='drug' ? (
                            // Stock and price under the name (integration test: the imported list has
                            // two "Amoxicillin 500mg Gélule", told apart only by the code).
                            <span style={{flex:1,minWidth:0}}>
                              <span style={{fontSize: 13,color:tx}}>{r.name}</span>{r.dosage_form ? <span style={{marginLeft:6,fontSize: 11,color:t2}}>{formLabel(t,r.dosage_form)}</span> : null}
                              <span style={{display:'block',fontSize: 11,color:t3}}>{String(t.se_osPick||'').replace('{stock}', (osNum(r.stock_qty)||'0')+(r.pack_unit ? ' '+t['ph_pack_'+(r.pack_label||'unit')] : '')).replace('{price}', seMoney(r.unit_price, langCtx.lang)||'0')}</span>
                            </span>
                          ) : <span style={{fontSize: 13,color:tx,flex:1}}>{r.name}</span>}
                          <span style={{fontSize: 13,color:'var(--ok-text)',fontWeight:800}}>+</span>
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
              <button onClick={savePacs} style={{background:'linear-gradient(135deg,var(--ok),var(--ok-strong))',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'7px 14px',cursor:'pointer',fontSize: 14,fontWeight:700}}>{t.save||'Save'}</button>
            </div>
            <div style={{fontSize: 14,color:t2,marginBottom:12,lineHeight:1.6}}>
              {t.feedIntroA}<b style={{color:tx}}>{t.feedIntroB}</b>{t.feedIntroC}<br/>
              {t.feedIntroD}
            </div>
            {pacsConfig?(<div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:12}}>
              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12}}>
                <div style={{fontWeight:700,fontSize: 14,color:'var(--ok-text)',marginBottom:10}}>1. {t.feedSec1}</div>
                <Fld label="Bridge Token"><div style={{display:'flex',gap:6}}>
                  <input type={showBridgeToken?'text':'password'} autoComplete="new-password" value={pacsConfig.bridge_token||''} onChange={function(e){up('bridge_token',e.target.value)}} style={Object.assign({},IS,{flex:1,fontFamily:'monospace'})}/>
                  <button onClick={function(){setShowBridgeToken(!showBridgeToken)}} style={{background:'var(--chip)',color:'var(--text-2)',border:'1px solid '+bd2,borderRadius:5,padding:'0 10px',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>{showBridgeToken?t.px_hide:t.px_show}</button>
                </div></Fld>
                {!pacsTokenUsable(pacsConfig.bridge_token)?<div style={{marginTop:4,fontSize:13,color:'var(--warn-text)',lineHeight:1.5}}>⚠ {t.px_tokenUnusable}</div>:null}
                <Fld label={t.emrPublicUrl}>
                  <input placeholder={t.egUrl} value={pacsConfig.emr_base_url||''} onChange={function(e){up('emr_base_url',e.target.value)}} style={IS}/>
                  {oldPort(pacsConfig.emr_base_url,8080)?<div style={{marginTop:4,fontSize:13,color:'var(--warn-text)',lineHeight:1.5}}>⚠ {t.se_oldEmrPort}</div>:null}
                </Fld>
                <div className="pressable" onClick={function(){up('auto_create_worklist',!pacsConfig.auto_create_worklist)}} style={{marginTop:8,display:'flex',alignItems:'center',gap:8,cursor:'pointer',background:'var(--bg)',border:'1px solid '+bd2,borderRadius:5,padding:'7px 10px'}}>
                  <div style={{width:14,height:14,borderRadius:3,border:pacsConfig.auto_create_worklist?'2px solid var(--ok-ink)':'2px solid var(--border-2)',background:pacsConfig.auto_create_worklist?'var(--ok)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{pacsConfig.auto_create_worklist?<span style={{color:'var(--on-fill)',fontSize: 12}}>✓</span>:null}</div>
                  <span style={{fontSize: 14,color:pacsConfig.auto_create_worklist?'var(--ok-text)':t3}}>{t.autoCreateWl}</span>
                </div>
                <div style={{marginTop:10,fontSize: 13,color:t2,lineHeight:1.6}}>{t.feedUrlExample}</div>
                <div style={{fontSize: 13,fontFamily:'monospace',color:'var(--accent-text-2)',background:'var(--bg)',border:'1px solid '+bd2,borderRadius:5,padding:8,wordBreak:'break-all'}}>{(pacsConfig.emr_base_url||('http://'+t.hostPcIp+':9080')) + '/api/pacs/worklist-feed?token=' + pacsTokenShown(pacsConfig.bridge_token) + '&format=json'}</div>
                <div style={{fontSize: 13,fontFamily:'monospace',color:'var(--accent-text-2)',background:'var(--bg)',border:'1px solid '+bd2,borderRadius:5,padding:8,wordBreak:'break-all',marginTop:6}}>{(pacsConfig.emr_base_url||('http://'+t.hostPcIp+':9080')) + '/api/pacs/worklist-feed?token=' + pacsTokenShown(pacsConfig.bridge_token) + '&format=csv'}</div>
                <div style={{marginTop:8,fontSize: 13,color:t3,lineHeight:1.5}}>{t.feedConnectHint}</div>
              </div>

              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12}}>
                <div style={{fontWeight:700,fontSize: 14,color:'var(--accent-text)',marginBottom:10}}>2. {t.pacsServer||'PACS 서버 (Orthanc)'}</div>
                <div style={{fontSize: 13,color:t3,lineHeight:1.5,marginBottom:8}}>{t.pacsServerHint||'영상이 저장되고 워크리스트를 제공하는 PACS(우리 Orthanc 컨테이너). DICOM 포트(기본 4242)·AE Title을 적습니다. 영상 창은 EMR이 대신 보여 주므로 진료실 PC가 9090에 닿을 필요는 없습니다.'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:8}}>
                  <Fld label="Host / IP"><input placeholder="NAS_IP" value={pacsConfig.worklist_scp_host||''} onChange={function(e){up('worklist_scp_host',e.target.value)}} style={IS}/></Fld>
                  <Fld label={(t.dicomPort||'DICOM Port')}><input type="number" value={pacsConfig.worklist_scp_port||4242} onChange={function(e){up('worklist_scp_port',Number(e.target.value))}} style={IS}/></Fld>
                </div>
                <Fld label="AE Title"><input value={pacsConfig.worklist_scp_ae||''} onChange={function(e){up('worklist_scp_ae',e.target.value)}} style={IS}/></Fld>
                {/* P-9 (2026-09-29): the EMR shows the viewer itself and adds the image
                    server's login on the server. The address below is where the EMR
                    container reaches Orthanc; the password is set only by pair-with-emr
                    and never comes to this screen - only whether it is set. */}
                <div style={{marginTop:8}}><Fld label={t.px_orthancUrl}><input placeholder="http://host.docker.internal:9090" value={pacsConfig.orthanc_url||''} onChange={function(e){up('orthanc_url',e.target.value)}} style={IS}/>
                  {oldPort(pacsConfig.orthanc_url,8090)?<div style={{marginTop:4,fontSize:13,color:'var(--warn-text)',lineHeight:1.5}}>⚠ {t.se_oldViewerPort}</div>:null}</Fld></div>
                <div style={{marginTop:4,fontSize:13,lineHeight:1.5,color:pacsConfig.orthanc_password_set?'var(--ok-text)':'var(--warn-text)'}}>{pacsConfig.orthanc_password_set?('✓ '+t.px_orthancPasswordSet):('⚠ '+t.px_orthancPasswordMissing)}</div>
                {/* Kept, not used: an old backup restores this column, and removing the
                    field would hide what it holds. */}
                <div style={{marginTop:8}}>{/* locked, not faded: opacity also fades the text (design 3.3.1) */}<Fld label={(t.pacsViewerUrl||'PACS 웹/뷰어 주소')+' — '+t.px_viewerUrlUnused}><input placeholder="" value={pacsConfig.pacs_viewer_url||''} readOnly style={LOCKED_IS}/></Fld></div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
                  <button onClick={function(){testPacs('worklist')}} style={{background:'var(--chip)',color:'var(--accent-text)',border:'1px solid '+bd2,borderRadius:5,padding:'6px 10px',cursor:'pointer',fontSize: 13}}>{t.testPacsBtn||'Test PACS (DICOM)'}</button>
                </div>
                {pacsTest.worklist?<div style={{marginTop:8,fontSize: 13,color:pacsTest.worklist.ok?'var(--ok-text)':'var(--danger-text)'}}>{pacsTest.worklist.ok?'✓ ':'✗ '}{pacsTest.worklist.message}</div>:null}
              </div>

              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:12,gridColumn:'1 / span 2'}}>
                <div style={{fontWeight:700,fontSize: 14,color:'var(--warn-text)',marginBottom:10}}>3. {t.feedSec3}</div>
                <div style={{fontSize: 13,color:t2,lineHeight:1.6}}>
                  {t.feedSec3A}<b style={{color:tx}}>{t.feedSec3B}</b>{t.feedSec3C}<br/>
                  {t.feedSec3Hint}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:10}}>
                  <div style={{background:'var(--bg)',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'var(--accent-text-2)'}}>{t.modUltrasound}</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = US</div></div>
                  <div style={{background:'var(--bg)',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'var(--accent-text-2)'}}>X-ray / CR</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = CR</div></div>
                  <div style={{background:'var(--bg)',border:'1px solid '+bd2,borderRadius:6,padding:8}}><b style={{color:'var(--accent-text-2)'}}>{t.modEndoscopy}</b><div style={{fontSize: 13,color:t3,marginTop:4}}>Modality = ES {t.orWord} OT</div></div>
                </div>
                <div style={{fontSize: 13,color:t3,lineHeight:1.5,marginTop:8}}>{t.feedSec3Note}</div>
              </div>
            </div>):<div style={{color:t3,fontSize: 14}}>Loading...</div>}
          </div>):null}

          {/* CLINIC */}
          {/* Scrolls on its own: the content column clips (overflow hidden), so with a few
              ranges open the save button went below a 1366x768 window, out of reach. */}
          {activeTab==='labitems'?(<div style={{padding:'16px 20px',overflow:'auto'}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,marginBottom:6}}>🧫 {t.labItems||'Lab Test Items'}</div>
            <div style={{fontSize: 13,color:t3,marginBottom:12}}>{t.lb_itemsHint}</div>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
              <span style={{fontSize: 14,color:t2}}>{t.labPanel||'Panel'}:</span>
              <select value={labCode} onChange={function(e){loadLabItems(e.target.value)}} style={Object.assign({},IS,{maxWidth:280})}>
                <option value="">— {t.lb_selectPanel} —</option>
                {orderCodes.filter(function(o){return o.code_type==='lab'}).map(function(o){return <option key={o.id} value={o.id}>{o.code} · {o.name}</option>})}
              </select>
              <button onClick={function(){ setNewPanelOpen(!newPanelOpen); }} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'7px 12px',cursor:'pointer',fontSize: 13,fontWeight:700}}>+ {t.newLabPanel||'새 검사 패널'}</button>
            </div>
            {newPanelOpen?(<div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:14,background:scBg,border:'1px solid '+bd,borderRadius:8,padding:'10px 12px',flexWrap:'wrap'}}>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.lb_code}</label><input value={newPanel.code} onChange={function(e){unp('code',e.target.value)}} placeholder="L09" style={Object.assign({},IS,{width:90})}/></div>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.name||'Name'}</label><input value={newPanel.name} onChange={function(e){unp('name',e.target.value)}} placeholder="Thyroid Panel" style={Object.assign({},IS,{width:220})}/></div>
              <div><label style={{fontSize: 12,color:t3,display:'block',marginBottom:3}}>{t.price||'Price'}</label><input type="number" value={newPanel.price} onChange={function(e){unp('price',e.target.value)}} placeholder="0" style={Object.assign({},IS,{width:100})}/></div>
              <button onClick={createPanel} style={{background:'var(--ok-2)',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'8px 16px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.add||'추가'}</button>
              <button onClick={function(){ setNewPanelOpen(false); }} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'8px 14px',cursor:'pointer',fontSize: 14}}>{t.cancel||'취소'}</button>
              <div style={{fontSize: 12,color:t3,width:'100%',marginTop:2}}>{t.newLabPanelHint||'새 패널은 진료실 검사 오더에도 바로 추가됩니다. 만든 뒤 아래에서 검사항목을 정의하세요.'}</div>
            </div>):null}
            {labCode?(<div style={{maxWidth:860}}>
              <div style={{display:'grid',gridTemplateColumns:'1.6fr .8fr .7fr .7fr 1fr 150px 32px',gap:6,fontSize: 12,color:t3,fontWeight:700,marginBottom:5,padding:'0 2px'}}>
                <div>{t.testName||'Item name'}</div><div>{t.unit||'Unit'}</div><div>{t.refLow||'Low'}</div><div>{t.refHigh||'High'}</div><div>{t.refTextLabel||'Text ref'}</div><div></div><div></div>
              </div>
              {labItems.map(function(it,i){ var nr=(it.ranges||[]).length; return <div key={i}><div style={{display:'grid',gridTemplateColumns:'1.6fr .8fr .7fr .7fr 1fr 150px 32px',gap:6,marginBottom:5,alignItems:'center'}}>
                <input value={it.name||''} onChange={function(e){uli(i,'name',e.target.value)}} style={IS}/>
                <input value={it.unit||''} onChange={function(e){uli(i,'unit',e.target.value)}} style={IS}/>
                <input type="number" value={it.ref_low!=null?it.ref_low:''} onChange={function(e){uli(i,'ref_low',e.target.value)}} style={IS}/>
                <input type="number" value={it.ref_high!=null?it.ref_high:''} onChange={function(e){uli(i,'ref_high',e.target.value)}} style={IS}/>
                <input value={it.ref_text||''} onChange={function(e){uli(i,'ref_text',e.target.value)}} placeholder="Negative…" style={IS}/>
                <button onClick={function(){toggleRanges(i)}} title={t.lb_rangesHint} style={{background:nr?'var(--cyan-deep-a22)':'var(--chip)',color:nr?'var(--cyan-text)':t2,border:'1px solid '+(nr?'var(--cyan-a55)':bd2),borderRadius:4,padding:'6px 4px',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>{it._open?'▾':'▸'} {t.lb_ranges} ({nr})</button>
                <button onClick={function(){delLi(i)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:4,padding:'6px 0',cursor:'pointer',fontSize: 13}}>✕</button>
              </div>
              {it._open?(<div style={{margin:'0 0 10px 24px',padding:'8px 10px',border:'1px solid '+bd,borderRadius:6,background:scBg}}>
                <div style={{fontSize:12,color:t3,marginBottom:6}}>{t.lb_rangesHint}</div>
                <div style={{display:'grid',gridTemplateColumns:'104px 58px 58px 80px 62px 62px 1fr 1.2fr 28px',gap:5,fontSize:11,color:t3,fontWeight:700,marginBottom:4}}>
                  <div>{t.lb_sex}</div><div>{t.lb_ageFrom}</div><div>{t.lb_ageTo}</div><div></div><div>{t.refLow||'Low'}</div><div>{t.refHigh||'High'}</div><div>{t.refTextLabel||'Text ref'}</div><div>{t.lb_rangeNote}</div><div></div>
                </div>
                {(it.ranges||[]).map(function(r,j){ return <div key={j} style={{display:'grid',gridTemplateColumns:'104px 58px 58px 80px 62px 62px 1fr 1.2fr 28px',gap:5,marginBottom:4,alignItems:'center'}}>
                  <select value={r.sex||''} onChange={function(e){urng(i,j,'sex',e.target.value)}} style={IS}><option value="">{t.lb_sexAll}</option><option value="M">{t.lb_sexM}</option><option value="F">{t.lb_sexF}</option></select>
                  <input type="number" min="0" value={r.age_min!=null?r.age_min:''} onChange={function(e){urng(i,j,'age_min',e.target.value)}} style={IS}/>
                  <input type="number" min="1" value={r.age_max!=null?r.age_max:''} onChange={function(e){urng(i,j,'age_max',e.target.value)}} style={IS}/>
                  <select value={r.age_unit||'y'} onChange={function(e){urng(i,j,'age_unit',e.target.value)}} style={IS}><option value="d">{t.lb_unitD}</option><option value="m">{t.lb_unitM}</option><option value="y">{t.lb_unitY}</option></select>
                  <input type="number" value={r.ref_low!=null?r.ref_low:''} onChange={function(e){urng(i,j,'ref_low',e.target.value)}} style={IS}/>
                  <input type="number" value={r.ref_high!=null?r.ref_high:''} onChange={function(e){urng(i,j,'ref_high',e.target.value)}} style={IS}/>
                  <input value={r.ref_text||''} onChange={function(e){urng(i,j,'ref_text',e.target.value)}} style={IS}/>
                  <input value={r.note||''} onChange={function(e){urng(i,j,'note',e.target.value)}} style={IS}/>
                  <button onClick={function(){delRng(i,j)}} style={{background:'var(--danger-strong-a10)',color:'var(--danger-text)',border:'1px solid var(--danger-strong-a30)',borderRadius:4,padding:'5px 0',cursor:'pointer',fontSize:12}}>✕</button>
                </div>; })}
                <button onClick={function(){addRng(i)}} style={{background:'var(--chip)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize:12,fontWeight:600,marginTop:2}}>{t.lb_addRange}</button>
              </div>):null}
              </div>;})}
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={addLi} style={{background:'var(--chip)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'7px 14px',cursor:'pointer',fontSize: 13,fontWeight:600}}>+ {t.addItem||'Add item'}</button>
                <button onClick={function(){ saveLabItems(); }} style={{background:'var(--ok-2)',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'7px 20px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.save||'Save'}</button>
              </div>
            </div>):<div style={{color:t3,fontSize: 14}}>{t.lb_pickPanel}</div>}
            {labWarn?(<div onClick={function(){ setLabWarn(null); }} style={{position:'fixed',inset:0,background:'var(--scrim)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div role="alertdialog" onClick={function(e){ e.stopPropagation(); }} style={{width:520,maxWidth:'92vw',background:scBg,border:'1px solid var(--warn-ink)',borderRadius:8,padding:'16px 18px',color:tx}}>
                <div style={{fontWeight:800,fontSize:15,color:'var(--warn-text)',marginBottom:8}}>⚠ {t.lb_unitWarnTitle}</div>
                {labWarn.changed.length?(<div style={{marginBottom:10}}>
                  <div style={{fontSize:13,color:t2,marginBottom:6}}>{t.lb_unitWarnBody}</div>
                  {labWarn.changed.map(function(c,i){ return <div key={'c'+i} style={{fontSize:13,padding:'3px 0'}}>• <b>{c.name}</b>: {c.from} → {c.to} <span style={{color:t3}}>({t.lb_resultCount.replace('{n}',c.n)})</span></div>; })}
                </div>):null}
                {labWarn.sameName.length?(<div style={{marginBottom:10}}>
                  <div style={{fontSize:13,color:t2,marginBottom:6}}>{t.lb_sameNameWarnBody}</div>
                  {labWarn.sameName.map(function(c,i){ return <div key={'s'+i} style={{fontSize:13,padding:'3px 0'}}>• <b>{c.name}</b> <span style={{color:t3}}>({t.lb_resultCount.replace('{n}',c.n)})</span></div>; })}
                </div>):null}
                <div style={{fontSize:13,color:'var(--ok-text-2)',marginBottom:14}}>{t.lb_unitWarnSafe}</div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                  <button autoFocus onClick={function(){ setLabWarn(null); }} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'8px 16px',cursor:'pointer',fontSize:14,fontWeight:700}}>{t.cancel||'Cancel'}</button>
                  <button onClick={function(){ saveLabItems(true); }} style={{background:'var(--warn-strong)',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'8px 16px',cursor:'pointer',fontSize:14,fontWeight:800}}>{t.lb_saveAnyway}</button>
                </div>
              </div>
            </div>):null}
          </div>):null}

          {activeTab==='backup'?(<div style={{padding:'16px 20px',maxWidth:780,overflow:'auto'}}>
            <div style={{fontWeight:700,fontSize:15,color:tx,marginBottom:5}}>💾 {t.backupTab||'백업'}</div>
            <div style={{fontSize:13,color:t3,marginBottom:16,lineHeight:1.6}}>{t.se_backupIntro||t.backupIntro}</div>
            {!backup?(<div style={{color:t3}}>{t.loading||'Loading…'}</div>):(<>
              {/* This used to read "automatic backup on" in green whatever had happened.
                  The state comes from services/backup.js health(), the same judgement the
                  status check uses, so a failing night is visible where people look. */}
              {(function(){
                var st=backup.state||'ok';
                // The newest backup is from before the last update: it restores only with
                // DEPLOYMENT.md 5b's "older than the app" commands (services/backup-version.js).
                var older=backup.version&&backup.version.state==='older';
                if(st==='ok'&&older) st='oldVersion';
                var C={ok:'ok-text',stale:'warn-text',none:'warn-text',failed:'danger-text',oldVersion:'warn-text'}[st]||'warn-text';   // a text token; tint() makes the box behind it
                var title={ok:t.se_bkOk,stale:t.se_bkStale,none:t.se_bkNone,failed:t.se_bkFailed,oldVersion:t.se_bkOldVersion}[st];
                var hint={stale:t.se_bkStaleHint,none:t.se_bkNoneHint,failed:t.se_bkFailedHint,oldVersion:t.se_bkOldVersionHint}[st];
                var la=backup.lastAttempt;
                return <div style={{background:tint(C,'14'),border:'1px solid '+tint(C,'55'),borderRadius:8,padding:'12px 14px',marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontSize:16,fontWeight:800,color:'var(--'+C+')'}}>{st==='ok'?'✓':'⚠'} {title}</span>
                    {backup.newestAgeHours!=null?<span style={{fontSize:13,color:t2}}>{t.backupLast||'최근'}: {fmtLocal(backup.last.mtime)} · {(t.se_bkHoursAgo||'{n}h').replace('{n}',backup.newestAgeHours)}</span>:null}
                    {backup.running?<span style={{fontSize:13,color:'var(--accent-text)',fontWeight:700}}>⏳ {t.se_bkRunning}</span>:null}
                  </div>
                  {hint?<div style={{fontSize:13,color:tx,marginTop:6,lineHeight:1.5}}>{hint}</div>:null}
                  {older&&st!=='oldVersion'?<div style={{fontSize:13,color:'var(--warn-text)',marginTop:6,lineHeight:1.5}}>⚠ {t.se_bkOldVersion} — {t.se_bkOldVersionHint}</div>:null}
                  {la&&!la.ok?<div style={{fontSize:12,color:t2,marginTop:8,lineHeight:1.5}}>
                    {t.se_bkLastTry}: {fmtLocal(la.at)} ({la.trigger==='scheduled'?t.se_bkTriggerAuto:t.se_bkTriggerManual})
                    {la.error?<div style={{fontFamily:'monospace',fontSize:12,color:'var(--danger-text-2)',marginTop:4,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{la.error}</div>:null}
                  </div>:null}
                </div>;
              })()}
              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,padding:14,marginBottom:14}}>
                <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                  <div><div style={{fontSize:12,color:t3}}>{t.backupStatus||'상태'}</div><div style={{fontSize:14,color:tx}}>{t.backupOnAuto||'자동 백업 켜짐'}</div></div>
                  <div><div style={{fontSize:12,color:t3}}>{t.backupPath||'저장 위치'}</div><div style={{fontSize:14,color:tx,fontFamily:'monospace'}}>{backup.custom?backup.hostPath:(t.backupAppFolder||'앱 폴더 (backups)')}</div></div>
                  <div><div style={{fontSize:12,color:t3}}>{t.backupSchedule||'자동'}</div><div style={{fontSize:14,color:tx}}>{t.backupDaily||'매일'} {backup.time}</div></div>
                  <div><div style={{fontSize:12,color:t3}}>{t.backupRetention||'보관'}</div><div style={{fontSize:14,color:tx}}>{backup.retentionDays}{t.days||'일'}</div></div>
                </div>
                {backup.minKeep?<div style={{fontSize:12,color:t3,marginTop:8}}>{(t.se_bkMinKeep||'').replace('{n}',backup.minKeep)}</div>:null}
                {/* The director's decision (2026-09-29): one external disk for the image backup
                    and the EMR's backups; the night image backup copies them. No more "set
                    BACKUP_PATH" here - the status line "EMR backup copy" says whether it works. */}
                <div style={{fontSize:12,color:'var(--warn-text)',marginTop:10,lineHeight:1.5}}>{t.se_backupSafetyTip}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
                <button onClick={runBackup} disabled={backupBusy} style={{background:'var(--ok-2)',color:'var(--on-fill)',border:'none',borderRadius:6,padding:'9px 18px',cursor:backupBusy?'wait':'pointer',fontSize:14,fontWeight:800}}>{backupBusy?(t.backupRunning||'백업 중…'):('💾 '+(t.backupNow||'지금 백업'))}</button>
                <button onClick={loadBackup} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:6,padding:'9px 14px',cursor:'pointer',fontSize:14}}>↻ {t.refresh||'새로고침'}</button>
                {backup.last?<span style={{fontSize:13,color:t3}}>{t.backupLast||'최근'}: {fmtLocal(backup.last.mtime)} ({fmtBytes(backup.last.size)})</span>:null}
              </div>
              <div style={{background:scBg,border:'1px solid '+bd,borderRadius:8,overflow:'hidden'}}>
                <div style={{fontSize:13,fontWeight:700,color:t2,padding:'8px 12px',borderBottom:'1px solid '+bd}}>{t.backupList||'백업 목록'} ({backup.count})</div>
                <div style={{maxHeight:'40vh',overflow:'auto'}}>
                  {(backup.backups||[]).length===0?<div style={{padding:14,color:t3,fontSize:13}}>{t.backupNone||'백업 없음'}</div>:
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <tbody>
                        {(backup.backups||[]).map(function(b,i){ return <tr key={i} style={{borderBottom:'1px solid var(--line-soft-3)'}}>
                          <td style={{padding:'7px 12px',color:tx,fontFamily:'monospace'}}>{b.name}</td>
                          <td style={{padding:'7px 12px',color:t2,textAlign:'right',whiteSpace:'nowrap'}}>{fmtBytes(b.size)}</td>
                          <td style={{padding:'7px 12px',color:t3,textAlign:'right',whiteSpace:'nowrap'}}>{fmtLocal(b.mtime)}</td>
                          <td style={{padding:'7px 12px',textAlign:'right'}}><button onClick={function(){downloadBackup(b.name)}} title={t.download||'다운로드'} style={{background:'var(--chip)',color:'var(--accent-text)',border:'1px solid '+bd2,borderRadius:5,padding:'3px 10px',cursor:'pointer',fontSize:12,fontWeight:700}}>⬇ {t.download||'다운로드'}</button></td>
                        </tr>; })}
                      </tbody>
                    </table>}
                </div>
              </div>
              <div style={{fontSize:12,color:t3,marginTop:10,lineHeight:1.6}}>{t.backupNote||'※ 같은 기계의 다른 드라이브는 디스크 고장엔 대비되지만 도난·화재엔 안 됩니다. 가끔 USB 등 다른 곳에 한 벌 더 복사하세요. 복원은 백업 파일을 psql로 가져오면 됩니다(문서 참고).'}</div>
            </>)}
          </div>):null}

          {/* LOG (change log). Read only - there is nothing here to edit or delete, and
              the table itself refuses it. Lines are written by each module (writeAudit). */}
          {activeTab==='audit'?(<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd,background:scBg}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontWeight:700,fontSize:14,color:tx}}>📜 {t.se_tabAudit}</span>
                <span style={{fontSize:12,color:t3}}>{t.se_logIntro}</span>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:12,color:t3}}>{t.se_logFrom}</span>
                <input type="date" value={auditF.from} onChange={function(e){uaf('from',e.target.value)}} style={Object.assign({},IS,{width:140,padding:'4px 6px'})}/>
                <span style={{fontSize:12,color:t3}}>{t.se_logTo}</span>
                <input type="date" value={auditF.to} onChange={function(e){uaf('to',e.target.value)}} style={Object.assign({},IS,{width:140,padding:'4px 6px'})}/>
                <select value={auditF.staff_id} onChange={function(e){uaf('staff_id',e.target.value)}} style={Object.assign({},IS,{width:170,padding:'4px 6px'})}>
                  <option value="">{t.se_logAllStaff}</option>
                  {staff.map(function(s){return <option key={s.id} value={s.id}>{s.name} ({s.login_id})</option>;})}
                </select>
                <select value={auditF.action} onChange={function(e){uaf('action',e.target.value)}} style={Object.assign({},IS,{width:210,padding:'4px 6px'})}>
                  <option value="">{t.se_logAllActions}</option>
                  {Object.keys(AUDIT_ACTIONS).map(function(a){return <option key={a} value={a}>{auditActionText(t,a)}</option>;})}
                </select>
                <input value={auditF.patient} onChange={function(e){uaf('patient',e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')auditSearch()}} placeholder={t.se_logPatientQ} style={Object.assign({},IS,{width:200,padding:'4px 6px'})}/>
                <button onClick={auditSearch} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:4,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:600}}>{t.search}</button>
                <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:auditF.action==='documents.issue'?t3:t2,cursor:'pointer',whiteSpace:'nowrap'}}>
                  <input type="checkbox" checked={auditIssued||auditF.action==='documents.issue'} disabled={auditF.action==='documents.issue'} onChange={auditToggleIssued}/>{t.se_logShowIssued}
                </label>
              </div>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              {audit&&audit.excluded&&audit.excluded['documents.issue']>0?(
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'6px 14px',borderBottom:'1px solid var(--line-soft)',background:'var(--chip)',fontSize:13,color:t2}}>
                  <span>📄 {String(t.se_logIssuedHidden||'').replace('{n}', audit.excluded['documents.issue'])}</span>
                  <button onClick={auditToggleIssued} style={{background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:4,padding:'2px 10px',cursor:'pointer',fontSize:12,fontWeight:600}}>{t.se_logShowIssued}</button>
                </div>):null}
              {!audit?<div style={{padding:20,color:t3}}>{t.loading}</div>:
               audit.error?<div style={{padding:14,color:'var(--danger-text-2)'}}>⚠ {seMessage(t, audit.error)}</div>:
               !audit.rows.length?<div style={{padding:20,color:t3,fontStyle:'italic'}}>{t.se_logEmpty}</div>:
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'var(--chip)'}}>
                  {[t.se_logWhen,t.se_logWho,t.se_logWhat,t.se_logPatient,t.se_logChange].map(function(h,i){return <th key={i} style={{padding:'6px 10px',textAlign:'left',color:t3,fontSize:12,borderBottom:'1px solid '+bd,whiteSpace:'nowrap'}}>{h}</th>})}
                </tr></thead>
                <tbody>{audit.rows.map(function(r){
                  var ch=auditChanges(t, r, {depts:depts, lang:langCtx.lang, templateName:function(code){ var tp=getTemplate(code); return tp && tp.name ? (tp.name[langCtx.lang]||tp.name.fr||tp.name.en) : ''; }});
                  return <tr key={r.id} style={{borderBottom:'1px solid var(--line-soft)',verticalAlign:'top'}}>
                    <td style={{padding:'6px 10px',color:t2,whiteSpace:'nowrap',fontFamily:'monospace',fontSize:12}}>{fmtLocal(r.at)}</td>
                    <td style={{padding:'6px 10px',color:tx}}>{r.staff_name||'—'}{r.staff_role?<div style={{fontSize:11,color:t3}}>{t['se_role_'+r.staff_role]||r.staff_role}</div>:null}</td>
                    <td style={{padding:'6px 10px',color:tx}}>{auditActionText(t, r.action)}{auditEntityText(t, r)?' — '+auditEntityText(t, r):''}{auditSummary(t, r)?<div style={{fontSize:12,color:t2}}>{auditSummary(t, r)}</div>:null}</td>
                    <td style={{padding:'6px 10px',color:tx}}>{r.patient_name||'—'}{r.chart_no?<div style={{fontSize:11,color:'var(--accent-text)',fontFamily:'monospace'}}>{r.chart_no}</div>:null}</td>
                    <td style={{padding:'6px 10px',fontSize:12,color:t2}}>
                      {r.action==='settings.staff.password'?<span style={{fontStyle:'italic',color:t3}}>{t.se_logNoValue}</span>:null}
                      {ch.map(function(c){return <div key={c.field} style={{marginBottom:2}}>
                        <span style={{color:t3}}>{c.label}: </span>
                        {c.kind==='change'?<span><span style={{color:'var(--danger-text-2)',textDecoration:'line-through'}}>{c.before}</span> → <span style={{color:'var(--ok-text-3)'}}>{c.after}</span></span>:
                         c.kind==='add'?<span style={{color:'var(--ok-text-3)'}}>{c.after}</span>:
                         <span style={{color:'var(--danger-text-2)'}}>{c.before} <span style={{color:t3}}>{t.se_logRemoved}</span></span>}
                      </div>;})}
                    </td>
                  </tr>;
                })}</tbody>
              </table>}
            </div>
            {audit&&audit.total>0?(function(){
              var pages=Math.max(1,Math.ceil(audit.total/AUDIT_LIMIT));
              return <div style={{padding:'6px 14px',borderTop:'1px solid '+bd,display:'flex',alignItems:'center',gap:10,fontSize:12,color:t2,background:scBg}}>
                <span>{(t.se_logTotal||'').replace('{n}',audit.total)}</span><div style={{flex:1}}></div>
                <button disabled={auditPage<=1} onClick={function(){setAuditPage(auditPage-1)}} style={{background:'var(--chip)',color:auditPage<=1?t3:t2,border:'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:auditPage<=1?'default':'pointer',fontSize:12}}>{t.se_logPrev}</button>
                <span>{(t.se_logPage||'').replace('{p}',auditPage).replace('{n}',pages)}</span>
                <button disabled={auditPage>=pages} onClick={function(){setAuditPage(auditPage+1)}} style={{background:'var(--chip)',color:auditPage>=pages?t3:t2,border:'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:auditPage>=pages?'default':'pointer',fontSize:12}}>{t.se_logNext}</button>
              </div>;
            })():null}
          </div>):null}

          {activeTab==='clinic'&&clinic?(<div style={{padding:'16px 20px',maxWidth:580}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,marginBottom:5}}>🏢 {t.se_clinicTitle}</div>
            <div style={{fontSize: 13,color:t3,marginBottom:14}}>{t.se_clinicIntro}</div>

            {/* live letterhead preview */}
            <div style={{background:'#fff',color:'#111',borderRadius:6,padding:'14px 18px',marginBottom:16,textAlign:'center',fontFamily:'"Times New Roman",Georgia,serif',borderBottom:'2px solid #111'}}>
              <div style={{fontSize: 17,fontWeight:800}}>{clinic.name_fr||clinic.name_en||clinic.name||''}</div>
              <div style={{fontSize: 11,color:'#333',marginTop:2}}>{(clinic.address||'')}{clinic.phone?'  ·  Tel: '+clinic.phone:''}{clinic.email?'  ·  '+clinic.email:''}</div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Fld label={t.se_fAppTitle}><input value={clinic.app_title||''} onChange={function(e){uclin('app_title',e.target.value)}} placeholder="Bethesda EMR" style={IS}/></Fld>
              <div style={{height:1,background:bd,margin:'2px 0 4px'}}></div>
              <Fld label={t.se_fClinicName}><input value={clinic.name||''} onChange={function(e){uclin('name',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Fld label={t.se_fClinicNameEn}><input value={clinic.name_en||''} onChange={function(e){uclin('name_en',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.se_fClinicNameFr}><input value={clinic.name_fr||''} onChange={function(e){uclin('name_fr',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label={t.se_fAddress}><input value={clinic.address||''} onChange={function(e){uclin('address',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <Fld label={t.se_fPhone}><input value={clinic.phone||''} onChange={function(e){uclin('phone',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.se_fEmail}><input value={clinic.email||''} onChange={function(e){uclin('email',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label={t.se_fHours}><input value={clinic.working_hours||''} onChange={function(e){uclin('working_hours',e.target.value)}} style={IS}/></Fld>
              <div><button onClick={saveClinic} style={{background:'var(--ok-2)',color:'var(--on-fill)',border:'none',borderRadius:6,padding:'9px 24px',cursor:'pointer',fontSize: 14,fontWeight:800,marginTop:4}}>{t.save||'Save'}</button></div>
            </div>

            <div style={{fontSize: 12,color:t3,marginTop:14,lineHeight:1.6}}>
              {t.se_clinicNote}
            </div>
          </div>):activeTab==='clinic'?(<div style={{padding:20,color:t3}}>{t.loading||'Loading…'}</div>):null}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editItem?(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'var(--scrim)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'var(--panel-head)',borderRadius:10,border:'1px solid '+bd,width:editType==='order'?540:420,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px var(--shadow-50)'}}>
            <div style={{fontWeight:700,fontSize: 15,color:tx,padding:'18px 18px 14px'}}>{/* The window says what it is for (was "New item" / "Edit" on every tab). */}{editItem.id?(t['se_editTitle_'+editType]||t.edit):(t['se_newTitle_'+editType]||t.se_newTitle)}</div>
            {/* Only the fields scroll: on a 1366x768 laptop the drug window is taller than the
                screen, and Save had to be scrolled to (integration test). The buttons stay put. */}
            <div style={{flex:1,minHeight:0,overflowY:'auto',padding:'0 18px'}}>

            {editType==='staff'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label={t.se_fName}><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label={t.se_fLoginId}><input autoComplete="off" value={editItem.login_id||''} onChange={function(e){ue('login_id',e.target.value)}} disabled={lockedAdmin} style={lockedAdmin?LOCKED_IS:IS}/></Fld>
                {/* Hidden by default: the password was on screen for anyone standing behind the
                    admin. Show/Hide is there because the admin has to read out the new
                    password to the employee. new-password stops the browser filling in the
                    admin's own saved password here - and saving it over the employee's. The hint on
                    an existing account says "leave empty to keep": a placeholder of dots in a
                    password box looked exactly like a password already filled in. */}
                <Fld label={t.se_fPassword}><div style={{display:'flex',gap:4}}>
                  <input type={showPw?'text':'password'} autoComplete="new-password" value={editItem.password||''} onChange={function(e){ue('password',e.target.value)}} placeholder={editItem.id?t.se_pwKeep:''} style={Object.assign({},IS,{flex:1,minWidth:0})}/>
                  <button type="button" onClick={function(){setShowPw(!showPw)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'0 8px',cursor:'pointer',fontSize:12,flexShrink:0}}>{showPw?t.se_hidePw:t.se_showPw}</button>
                </div></Fld>
              </div>
              {lockedAdmin?<div style={{fontSize:12,color:'var(--warn-text)',background:'var(--warn-a18)',border:'1px solid var(--warn-a40)',borderRadius:5,padding:'7px 9px',lineHeight:1.5}}>
                🔒 {t.adminLocked||'설정 때 만든 관리자 계정입니다. 이름·비밀번호·연락처는 바꿀 수 있지만, 아이디와 역할·권한은 고정입니다 — 여기서 설정 권한을 빼면 아무도 설정 화면에 들어올 수 없게 됩니다.'}
              </div>:null}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label={t.se_fRole}><select value={editItem.role||'frontdesk'} onChange={function(e){ var r=e.target.value; ue('role',r); ue('permissions', defaultPermsForRole(r)); }} disabled={lockedAdmin} style={lockedAdmin?LOCKED_IS:IS}>{['frontdesk','doctor','nurse','pharmacy','lab','admin'].map(function(r){return <option key={r} value={r}>{t['se_role_'+r]}</option>;})}</select></Fld>
                <Fld label={t.se_fPhone}><input value={editItem.phone||''} onChange={function(e){ue('phone',e.target.value)}} style={IS}/></Fld>
              </div>
              {/* The API has always kept an e-mail; the form had no field for it. */}
              <Fld label={t.se_fEmail}><input type="email" autoComplete="off" value={editItem.email||''} onChange={function(e){ue('email',e.target.value)}} style={IS}/></Fld>
              {/* The staff list has always shown a Dept column and the API has always accepted
                  department_id - there was simply no way to set it, so the column read "-" for
                  everyone. This is the doctor's own department, which is separate from the
                  department chosen per visit at reception. */}
              <Fld label={t.department||'Department'}>
                <select value={editItem.department_id||''} onChange={function(e){ue('department_id', e.target.value||null)}} style={IS}>
                  <option value="">{t.unassigned||'(none)'}</option>
                  {depts.map(function(d){return <option key={d.id} value={d.id}>{d.code} - {d.name}</option>;})}
                </select>
              </Fld>
              <Fld label={(t.permissions||'Permissions (accessible screens)')}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 10px',background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:5,padding:'8px 10px'}}>
                  {MODULES.map(function(m){
                    var perms=editItem.permissions||[];
                    var on=perms.indexOf(m.perm)>=0;
                    return <label key={m.perm} style={{display:'flex',alignItems:'center',gap:6,cursor:lockedAdmin?'not-allowed':'pointer',fontSize:13,color:lockedAdmin?'var(--text-locked)':(on?'var(--text)':'var(--text-2)')}}>
                      <input type="checkbox" checked={on} disabled={lockedAdmin} onChange={function(){ var cur=editItem.permissions||[]; var next=on?cur.filter(function(x){return x!==m.perm}):cur.concat([m.perm]); ue('permissions',next); }} />
                      {m.icon} {t[m.key]||m.key}
                    </label>;
                  })}
                </div>
              </Fld>
            </div>):null}

            {editType==='drug'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:6}}>
                <Fld label={t.code}><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.colDrugName}><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              </div>
              {/* The API always took these; the form had no place for them (pharmacy L6). */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:6}}>
                <Fld label={t.ph_genericName}><input value={editItem.generic_name||''} onChange={function(e){ue('generic_name',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.ph_nameEn}><input value={editItem.name_en||''} onChange={function(e){ue('name_en',e.target.value)}} style={IS}/></Fld>
              </div>
              {/* The "to check" list comes with the imported drug list (034) and is only
                  shown here; the points are marked checked in the pharmacy Stock tab. */}
              {checkList(editItem).length ? <div style={{fontSize: 13,color:checkOpen(editItem)?'var(--warn-text)':'var(--text-3)',border:'1px solid '+(checkOpen(editItem)?'var(--warn-a60)':bd2),borderRadius:4,padding:'5px 8px'}}>
                <div style={{fontWeight:700}}>{checkOpen(editItem)?'⚠ ':'✓ '}{t.ph_checkTitle}</div>
                <ul style={{margin:'2px 0 0',paddingLeft:18}}>{checkList(editItem).map(function(c,i){return <li key={i}>{checkText(t,c)}</li>;})}</ul>
                {checkOpen(editItem) ? <div style={{color:'var(--text-2)',marginTop:2}}>{t.ph_checkWhere}</div> : null}
              </div> : null}
              {/* No default dose / times / days / posology here (decision B, 2026-09-29):
                  the order sets carry the dosing. The columns stay in the table, unused. */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label={t.ph_category}><select value={editItem.category||'Other'} onChange={function(e){ue('category',e.target.value)}} style={IS}>{DRUG_CATEGORIES.map(function(c){return <option key={c} value={c}>{drugCatLabel(t, c)}</option>})}</select></Fld>
                <Fld label={t.ph_form}><select value={editItem.dosage_form||''} onChange={function(e){ue('dosage_form',e.target.value||null)}} style={IS}>
                  <option value="">—</option>
                  {DRUG_FORMS.map(function(f){return <option key={f} value={f}>{formLabel(t,f)}</option>})}
                  {editItem.dosage_form && DRUG_FORMS.indexOf(editItem.dosage_form)<0 ? <option value={editItem.dosage_form}>{editItem.dosage_form}</option> : null}
                </select></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr',gap:6}}>
                <Fld label={t.ph_unitPrice}><input type="number" value={seMoneyInput(editItem.unit_price)||0} onChange={function(e){ue('unit_price',Number(e.target.value))}} style={IS}/></Fld>
                {/* Read-only: stock moves only through the pharmacy's Stock tab, where each
                    change is written to the stock record (receive / count / discard).
                    Unchanged here, saveEdit leaves stock_qty out of the request. A new
                    drug starts at 0 and is received there. */}
                <Fld label={t.ph_stock}><input type="number" value={editItem.id ? (editItem.stock_qty||0) : 0} readOnly disabled title={t.ph_stockReadOnlyHint} style={LOCKED_IS}/></Fld>
                {/* At or below this the Stock tab shows the count in red; 0 = no minimum.
                    Whole numbers only - the column is an integer and the API refuses others. */}
                <Fld label={t.ph_minStock}><input type="number" min="0" step="1" value={editItem.min_stock==null?'':editItem.min_stock} title={t.ph_minStockHint} onChange={function(e){ue('min_stock',e.target.value===''?0:Math.max(0,Math.floor(Number(e.target.value))||0))}} style={IS}/></Fld>
              </div>
              <div style={{fontSize: 12,color:'var(--text-2)'}}>📦 {t.ph_stockReadOnlyHint}
              </div>
              {/* Pack-unit drug (H2-B): handed out by the bottle/tube, so the doctor writes
                  how many and no total is computed. Copied onto each prescription line
                  when it is written (025_pharmacy_pack_unit.sql). */}
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'8px 10px',border:'1px solid var(--border-2)',borderRadius:6}}>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize: 13,fontWeight:700,color:'var(--text)',cursor:'pointer'}}>
                  <input type="checkbox" checked={!!editItem.pack_unit} onChange={function(e){ var on=e.target.checked; setEditItem(function(p){ var n=JSON.parse(JSON.stringify(p)); n.pack_unit=on; n.pack_label=on?(p.pack_label||'bottle'):null; return n; }); }}/>
                  {t.ph_packUnit}
                </label>
                <select value={editItem.pack_label||'bottle'} disabled={!editItem.pack_unit} onChange={function(e){ue('pack_label',e.target.value)}} style={Object.assign({},editItem.pack_unit?IS:LOCKED_IS,{width:'auto'})}>
                  {PACK_LABELS.map(function(k){ return <option key={k} value={k}>{t['ph_pack_'+k]}</option>; })}
                </select>
                <div style={{fontSize: 12,color:'var(--text-2)',flexBasis:'100%'}}>{editItem.pack_unit ? t.ph_packUnitHintOn : t.ph_packUnitHint}</div>
                {/* Only tells, does not stop (decision): the stock number has no unit, so
                    switching an existing drug makes the same number read in the other unit. */}
                {(function(){
                  if(!editItem.id) return null;
                  var was = drugs.filter(function(x){return x.id===editItem.id;})[0];
                  if(!was) return null;
                  var changed = !!was.pack_unit !== !!editItem.pack_unit || (editItem.pack_unit && (was.pack_label||'bottle') !== (editItem.pack_label||'bottle'));
                  if(!changed || !(Number(was.stock_qty) > 0)) return null;
                  return <div style={{fontSize: 13,color:'var(--warn-text)',fontWeight:700,flexBasis:'100%',border:'1px solid var(--warn-a60)',borderRadius:4,padding:'5px 8px'}}>⚠ {String(t.ph_packChangeWarn||'').replace('{n}', was.stock_qty)}</div>;
                })()}
              </div>
            </div>):null}

            {editType==='order'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 1fr',gap:6}}>
                <Fld label={t.se_fCode}><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
                <Fld label={t.se_fName}><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              </div>
              <Fld label={t.se_fNameEn}><input value={editItem.name_en||''} onChange={function(e){ue('name_en',e.target.value)}} style={IS}/></Fld>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <Fld label={t.se_fType}><select value={editItem.code_type||'fee'} onChange={function(e){ue('code_type',e.target.value)}} style={IS}>{['fee','lab','imaging','procedure'].map(function(c){return <option key={c} value={c}>{t['se_type_'+c]}</option>;})}</select></Fld>
                <Fld label={t.se_fGroup}><select value={editItem.group_name||''} onChange={function(e){ue('group_name',e.target.value)}} style={IS}>{'Consultation,Laboratory,Radiology,Ultrasound,Endoscopy,Surgery,Other'.split(',').map(function(g){return <option key={g}>{g}</option>})}</select></Fld>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr',gap:6}}>
                <Fld label={t.price||"가격 (Price)"}><input type="number" value={seMoneyInput(editItem.price_clinic!=null?editItem.price_clinic:editItem.price)||0} onChange={function(e){ var v=Number(e.target.value); ue('price_clinic',v); ue('price',v); }} style={IS}/></Fld>
              </div>
              <div style={{background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:6,padding:'10px'}}>
                <div style={{fontSize: 13,fontWeight:700,color:'var(--violet-ink)',marginBottom:6}}>📡 {t.orderFeedModality}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <Fld label={t.se_fModality}><select value={editItem.pacs_modality||''} onChange={function(e){ue('pacs_modality',e.target.value)}} style={IS}><option value="">{t.se_none}</option><option value="US">US</option><option value="CR">CR</option><option value="CT">CT</option><option value="MR">MR</option><option value="ES">ES</option><option value="OT">OT</option></select></Fld>
                  <Fld label={t.se_fBodyPart}><input value={editItem.body_part||''} onChange={function(e){ue('body_part',e.target.value)}} style={IS} placeholder="ABDOMEN"/></Fld>
                </div>
                <div style={{marginTop:6}}>
                  <Fld label={t.worklistFeedCreate}>
                    <div className="pressable" onClick={function(){ue('worklist_enabled',!editItem.worklist_enabled)}} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:scBg,border:'1px solid '+bd2,borderRadius:5,padding:'7px 10px'}}>
                      <div style={{width:14,height:14,borderRadius:3,border:editItem.worklist_enabled?'2px solid var(--ok-ink)':'2px solid var(--border-2)',background:editItem.worklist_enabled?'var(--ok)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{editItem.worklist_enabled?<span style={{color:'var(--on-fill)',fontSize: 12}}>✓</span>:null}</div>
                      <span style={{fontSize: 14,color:editItem.worklist_enabled?'var(--ok-text)':t3}}>{editItem.worklist_enabled?t.se_on:t.se_off}</span>
                    </div>
                  </Fld>
                  <div style={{fontSize: 12,color:t3,lineHeight:1.4}}>{t.aeTitleNote}</div>
                </div>
              </div>
            </div>):null}

            {editType==='phrase'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label={t.se_fCategory}><select value={editItem.category||'General'} onChange={function(e){ue('category',e.target.value)}} style={IS}>{'General,Internal,Surgery,Peds,OBGYN,Custom'.split(',').map(function(c){return <option key={c}>{c}</option>})}</select></Fld>
              {/* The consultation screen shows text_fr on a French screen and text_en on an
                  English one, falling back to text (Consultation.jsx phraseText). The API
                  has always stored all three; only text had a field here, so a phrase could
                  never be given its French wording from the clinic. */}
              <Fld label={t.se_fTextDefault}><textarea value={editItem.text||''} onChange={function(e){ue('text',e.target.value)}} rows={3} style={Object.assign({},IS,{resize:'vertical'})}/></Fld>
              <Fld label={t.se_fTextFr}><textarea value={editItem.text_fr||''} onChange={function(e){ue('text_fr',e.target.value)}} rows={3} style={Object.assign({},IS,{resize:'vertical'})}/></Fld>
              <Fld label={t.se_fTextEn}><textarea value={editItem.text_en||''} onChange={function(e){ue('text_en',e.target.value)}} rows={3} style={Object.assign({},IS,{resize:'vertical'})}/></Fld>
              <div style={{fontSize:12,color:t3,lineHeight:1.5}}>{t.se_phraseLangHint}</div>
            </div>):null}

            {editType==='dept'?(<div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Fld label={t.se_fCode}><input value={editItem.code||''} onChange={function(e){ue('code',e.target.value)}} style={IS}/></Fld>
              <Fld label={t.se_fNameDefault}><input value={editItem.name||''} onChange={function(e){ue('name',e.target.value)}} style={IS}/></Fld>
              <Fld label={t.se_fNameEn}><input value={editItem.name_en||''} onChange={function(e){ue('name_en',e.target.value)}} style={IS}/></Fld>
              {/* Français is not optional here: the clinic is in Madagascar, the seeded
                  departments already carry French names, and a department added later
                  would otherwise fall back to Korean on a French screen. */}
              <Fld label={t.se_fNameFr}><input value={editItem.name_fr||''} onChange={function(e){ue('name_fr',e.target.value)}} style={IS}/></Fld>
              {/* head_doctor_id has been in the schema and the API since the first migration
                  (fk_dept_head), and the seed even says heads are assigned here - there was
                  no field for it. Only doctors can head a department. */}
              <Fld label={t.deptHead||'Head doctor'}>
                <select value={editItem.head_doctor_id||''} onChange={function(e){ue('head_doctor_id', e.target.value||null)}} style={IS}>
                  <option value="">{t.unassigned||'(none)'}</option>
                  {staff.filter(function(s){return s.role==='doctor' && s.status!=='inactive'})
                        .map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>;})}
                </select>
              </Fld>
            </div>):null}
            </div>

            <div style={{display:'flex',gap:8,padding:'14px 18px 18px',borderTop:'1px solid '+bd}}>
              <button onClick={closeEdit} style={{flex:1,background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:5,padding:'7px',cursor:'pointer',fontSize: 14}}>{t.cancel}</button>
              <button onClick={saveEdit} style={{flex:2,background:'linear-gradient(135deg,var(--accent),var(--accent-strong))',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'7px',cursor:'pointer',fontSize: 14,fontWeight:600}}>{t.save}</button>
            </div>
          </div>
        </div>
      ):null}

      {toast?<div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--ok)',color:'var(--on-fill)',borderRadius:8,padding:'10px 24px',fontSize: 14,fontWeight:600,boxShadow:'0 4px 16px var(--shadow-30)',zIndex:200}}>✓ {toast}</div>:null}
    </div>
  );
}

// Drug tab (pharmacy session). The stored category stays the English word the
// seed data and the statistics grouping use; only what is shown is translated.
// Widened 2026-09-29 for the clinic's real stock list (old program's classes, see
// wiki/reference/drug-import-review.csv); 'Other' stays last.
// Units a pack-unit drug is handed out in; must match drug_pack_label_check.
var PACK_LABELS = ['bottle','tube','inhaler','unit'];
var DRUG_CATEGORIES = ['Analgesic','Antibiotic','Antihistamine','Antimalarial','Antiparasitic','Cardiovascular','Corticosteroid','Dermatology','Endocrine','GI','Gynecology','Musculoskeletal','Ophthalmic','Respiratory','Urology','Vitamin','Other'];
function drugCatLabel(t, c){ return (c && t['ph_cat_' + c]) || c || ''; }

function Fld(p){return <div><label style={{fontSize: 12,fontWeight:600,color:'var(--text-3)',display:'block',marginBottom:3}}>{p.label}</label>{p.children}</div>}
