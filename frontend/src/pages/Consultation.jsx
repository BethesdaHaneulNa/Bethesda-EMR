import { useState, useEffect, useMemo, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api, getUser } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
import { LabResults } from '../components/LabResults.jsx';
import { RadiologyReadings, PatientCheck } from '../components/RadiologyReadings.jsx';
import { perDose, doseSentence, fmtAmount, isLegacyTotal, isPack, packWord } from '../documents/rx-dosing.js';
// The dosage form of an imported drug (pharmacy's drug-info.js, drug.dosage_form): shown
// in the search lists where the default sig used to be (decision B retired default doses).
import { formLabel } from '../documents/drug-info.js';

// The server refuses to change a dispensed prescription or delete an order that already
// has a result (consult.routes.js). Its English refusal strings are matched here so the
// doctor reads the reason in the screen language. Keep in step with the backend.
var LOCK_MESSAGES = {
  'Prescription already dispensed': 'cs_rxLocked',
  'Order already has a result': 'cs_orderLocked',
  'Visit was cancelled': 'cs_visitCancelled',
  'Order is cancelled': 'cs_orderIsCancelled',
  'pack_qty must be a whole number of at least 1': 'cs_packQtyWhole',
};

// Mirrors the server's rule for a locked order, so the row can show it before anyone
// tries: a lab order with results (lab sets status 'completed' only once a value is
// saved), a written radiology reading, or an imaging study the modality has started.
// worklist_sent_at is checked because orders without a worklist are stored with
// worklist_status 'completed' from the start (consult.routes.js POST /:id/orders).
function orderLocked(o){
  if(o.status==='cancelled' || o.status==='completed') return true;
  if(String(o.result_text||'').trim()!=='') return true;
  return !!o.worklist_sent_at && (o.worklist_status==='in_progress'||o.worklist_status==='completed');
}

// A prescription line is entered the Korean way: dose = the DAILY total, frequency =
// how many times a day it is split into, days = how long. The server works out
// total_qty = dose x days (consult.routes.js rxTotal); this screen never computes it.
// How a line reads back ("1 tab x 3 times a day, 7 days (total 21)"), whether one
// intake comes out in half tablets, and whether a total predates the formula change
// all come from documents/rx-dosing.js - the pharmacy's file - so this screen, the
// pharmacy screen and the outside prescription say the same thing in the same words.

// A price of 0 (or none) is almost always a price nobody has entered yet - the clinic's
// drug list is being imported with every price empty. Billing charges each line at the
// unit_price stored ON THE LINE when it was added (billing.routes.js), so such a line
// goes to the cashier at 0, and entering the price in Settings afterwards does not
// change lines already written. The screen marks them so a doctor or nurse sees it
// before the patient reaches the cashier; it never refuses them (a free item is
// possible). A line the pharmacy moves to an outside prescription is not billed at all,
// so it is not marked.
// A timestamp (result_at, ...) as a local calendar date. Cutting the ISO string at the
// T gives the UTC date, so a reading written between midnight and 03:00 in Madagascar
// showed the day before. Same rule as ymd() in LabResults.jsx; a plain DATE value
// (YYYY-MM-DD, as the API now sends them) is returned as it is.
function ymd(d){
  if(!d) return '';
  var s = String(d);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var x = new Date(s);
  return isNaN(x.getTime()) ? s.split('T')[0] : x.toLocaleDateString('en-CA');
}

// Decision 3-B (2026-09-29): a lab or imaging order that already has a result (values,
// a reading, a study taken) is not deleted but can be marked cancelled - the ✕ on it
// asks for that instead of showing a lock. Imaging since the PACS merge (decision 38-3):
// the server cancels its worklist entry with it. Procedures keep the lock.
function cancellable(o){ return (o.code_type==='lab' || o.code_type==='imaging') && o.status!=='cancelled' && orderLocked(o); }

// A quantity or dose as the database returns it ("1.000", DECIMAL(10,3)) is shown without
// the trailing zeros ("1", "1.5"); at 1366 wide "1.000" was cut to "1.00(". Only an exact
// three-decimal value is touched, so what the doctor is typing ("1.", "0.5") is left alone.
function showNum(v){
  if(v == null) return '';
  var s = String(v);
  return /^\d+\.\d{3}$/.test(s) ? String(parseFloat(s)) : s;
}

// A read-only cell of the prescription table (a dispensed drug, a cancelled order). The
// table has fixed column widths, so a long value stays on one line and is cut with "…"
// instead of running over the next column; the whole value is in the tooltip. Numbers
// read "1", not "1.000".
function roCell(value, color, title){
  var v = showNum(value);
  return <td style={{padding:'3px 4px',textAlign:'center',color:color,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
    title={title || (v ? String(v) : undefined)}>{v}</td>;
}

// A prescription / order row is saved when the focus LEAVES THE ROW, not at every box: typing
// daily dose, times, days and sig used to send four saves, and on a finished consultation
// the change log got four lines for one correction (integration test, 2026-09-30). Moving
// to another box of the same row (Tab) does not save; clicking anywhere else does.
function leftRow(e){
  var tr = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('tr') : null;
  return !(e.relatedTarget && tr && tr.contains(e.relatedTarget));
}

function noPrice(v){ var n = parseFloat(v); return !(n > 0); }

// A prescription line with no daily dose (or no days) is stored with a total of 0
// (consult.routes.js rxTotal), and a total of 0 goes through dispensing and billing
// without anyone noticing - 0 tablets handed over, 0 charged. The clinic's real drug
// list arrives with every default dose empty, so after the import every drug added
// from search or an order set starts like this until the doctor types the dose.
// Marked on the line, counted by the heading, and asked about once when the
// consultation is completed. Not refused: an ointment or a bottle whose amount is
// settled later is a real case.
// Since decision B (2026-09-29) a drug from the search starts with every field empty,
// so the times a day count too: they are not in the total, but the label's sentence
// ("1 cp x 3 fois/jour") cannot be written without them.
function noDose(rx){ return !isPack(rx) && (!(parseFloat(rx.dose) > 0) || !(parseInt(rx.frequency, 10) > 0) || !(parseInt(rx.days, 10) > 0)); }

// A pack-unit drug (a syrup, a cream, an inhaler - marked in Settings, copied onto the
// line by the server) is handed out by the bottle/tube/piece: its total is the count
// the doctor writes, and the daily dose, times and days are only the instructions. So
// the thing that must not be empty is the count, not the dose. Stored NULL when empty.
function noPackQty(rx){ return isPack(rx) && !(parseFloat(rx.total_qty) > 0); }
function packCount(rx){ return rx.total_qty == null ? '' : String(parseFloat(rx.total_qty)); }

// Stored values the screen shows, and the translation key for each. The values
// themselves (visit.status, phrase_dictionary.category, order_code.code_type) are what
// the database and the other screens use, so they never change - only what is shown.
var VISIT_STATUS_KEY = { registered:'cs_vsRegistered', waiting:'cs_vsWaiting', in_progress:'cs_vsInProgress', completed:'cs_vsCompleted', cancelled:'cs_vsCancelled' };
var PHRASE_CATS = ['General','Internal','Surgery','Peds','OBGYN'];
var PHRASE_CAT_KEY = { All:'cs_pcAll', General:'cs_pcGeneral', Internal:'cs_pcInternal', Surgery:'cs_pcSurgery', Peds:'cs_pcPeds', OBGYN:'cs_pcObgyn' };
var CODE_TYPE_KEY = { lab:'cs_badgeLab', procedure:'cs_badgeProc', imaging:'cs_badgeImg' };

export default function ConsultationPage() {
  var langCtx = useLang(); var t = langCtx.t, lang = langCtx.lang;
  function label(map, v){ var k = map[v]; return (k && t[k]) || v; }
  // A phrase in the screen language when Settings has one (text_fr / text_en), else
  // the phrase as entered. Korean uses the main text.
  function phraseText(p){ return (lang==='fr' && p.text_fr) || (lang==='en' && p.text_en) || p.text || ''; }
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
  // The editable fields of each prescription line as the server last returned them.
  // A field losing focus saves the line (onBlur); with nothing changed there is nothing
  // to send - and before the total formula changed, an old line re-saved for no reason
  // was a line re-priced for no reason.
  var savedRx = useRef({});
  function rxSnap(r){ return [r.dose, r.frequency, r.days, r.route, r.memo, isPack(r) ? (r.pack_qty!==undefined ? r.pack_qty : packCount(r)) : '']
    .map(function(x){ return x==null ? '' : String(x); }).join('|'); }
  function rememberRx(rows){ (rows||[]).forEach(function(r){ savedRx.current[r.id] = rxSnap(r); }); return rows; }
  var ois = useState([]), orderItems = ois[0], setOrderItems = ois[1];
  var orderItemsRef = useRef([]); orderItemsRef.current = orderItems;
  // ── Row saves (2026-09-30) ──
  // A row is saved when the focus leaves it. On a consultation still open it is ALSO
  // saved about 2 s after the doctor stops typing in it, and every row with unsaved
  // changes is sent when the page is hidden or unloaded (fetch keepalive): with the save
  // only on leaving the row, an F5, a closed window or a power cut lost every box changed
  // in that row. A FINISHED consultation (Terminé pressed, or a visit from another day -
  // the server's own rule, consult.routes.js consultOf) keeps the leave-the-row save
  // only, so a correction still makes one line in the change log; its unsaved rows are
  // still sent when the page goes away.
  // Saves of one row can overlap (the pause save, then the row left). They go out one
  // after the other (rowChain), so the server gets them in the order they were made; each
  // carries a number, and an answer that is not the latest is dropped, so a late reply
  // never puts back an older value on the screen. If the doctor typed on after a save left, the reply only brings
  // the fields the server works out (total, status…) and what is typed stays.
  var rxListRef = useRef([]); rxListRef.current = rxList;
  var savedOrd = useRef({});
  function ordSnap(o){ return [o.dose, o.frequency, o.days, o.quantity, o.memo].map(function(x){ return x==null ? '' : String(x); }).join('|'); }
  var rowTimers = useRef({}), rowSeq = useRef({}), rowInflight = useRef({}), rowChain = useRef({});
  // Sends one row's save after that row's previous one has answered.
  function inTurn(key, send){
    var run = (rowChain.current[key] || Promise.resolve()).then(send);
    rowChain.current[key] = run.catch(function(){});
    return run;
  }
  var finishedRef = useRef(false);
  // The note box is "my note for this visit" (decisions 2026-09-30): each doctor has one
  // note per consultation (consultation_note), saved with PUT /consultations/:id/note, and
  // the chart on the right lists every doctor's note under their name. `notes` is every
  // note of the open consultation as the server has it; `mineSaved` my note as saved, so
  // the box is "not saved" while it differs.
  var nts = useState(''), note = nts[0], setNote = nts[1];
  var noteRef = useRef(''); noteRef.current = note;
  var nls = useState([]), notes = nls[0], setNotes = nls[1];
  var mss = useState(''), mineSaved = mss[0], setMineSaved = mss[1];
  var mineSavedRef = useRef(''); mineSavedRef.current = mineSaved;
  var dbs = useState(false), draftBack = dbs[0], setDraftBack = dbs[1];
  var noteBoxRef = useRef(null);
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
  // A short "saved" notice at the bottom (same look as the lab screen's), for the reading:
  // it was an alert that had to be clicked away (imaging-day test 2026-09-30).
  var tos = useState(''), toast = tos[0], setToast = tos[1];
  // Transfer (전과): change the open visit's department and doctor without cancelling the
  // registration (director, 2026-09-30). The server is reception's
  // PUT /api/visits/:id/transfer {department_id, doctor_id, reason} (contract in
  // wiki/handoff/coordinator.md, 「전과」): it changes the visit and its consultation's
  // department in one go and writes one change-log line. Notes, prescriptions, orders and
  // who wrote them stay as they are - another doctor's note stays theirs.
  // The window asks for the doctor only (director, 2026-10-01: at this clinic a doctor
  // belongs to one department, so a separate department box only confused - changing it
  // emptied the doctor box and switched Change off). The department sent is the chosen
  // doctor's; a doctor with no department keeps the visit's.
  var trs = useState(null), transfer = trs[0], setTransfer = trs[1];   // {doctor, reason, doctors, busy}
  var toastTimer = useRef(null);
  function showToast(text){ clearTimeout(toastTimer.current); setToast(text); toastTimer.current = setTimeout(function(){ setToast(''); }, 3000); }
  var rds = useState(''), readText = rds[0], setReadText = rds[1];
  var rdo = useState(false), readingsOpen = rdo[0], setReadingsOpen = rdo[1];
  var canRead = (user && Array.isArray(user.permissions)) ? user.permissions.indexOf('consultation')>=0 : (user && user.role==='doctor')||(user&&user.role==='admin');

  async function openViewer(orderItemId){
    try {
      var r = await api.get('/pacs/viewer-url?order_item_id='+orderItemId);
      // no_study: an order that never went to the worklist has nothing to show (P-18;
      // the server leaves url empty). cancelled: the order was cancelled - its images and
      // reading stay as the record, but no new reading is taken.
      setViewer({ order_item_id:orderItemId, has_viewer:r.has_viewer, url:r.has_viewer?r.url:'', no_study:!!r.no_study,
        cancelled:!!r.cancelled, cancel_reason:r.cancel_reason||'', order_name:r.order_name, accession:r.accession, reading:r.reading, images:r.images||null });
      setReadText(r.reading?r.reading.result_text:'');
    } catch(e){ alert(t.cs_errorPrefix+e.message); }
  }
  async function saveReading(){
    if(!viewer) return;
    try {
      await api.put('/pacs/reading/'+viewer.order_item_id, { result_text: readText });
      setViewer(function(p){ return Object.assign({}, p, { reading: Object.assign({}, p&&p.reading, { result_text: readText, result_by_name: (user&&user.name)||'', result_at: new Date().toISOString() }) }); });
      showToast(t.cs_readingSaved);
    } catch(e){
      // Cancelled in the consultation room while this window was open (pacs.cancel.js
      // ORDER_CANCELLED): say so, then show the order as it is now.
      if(e && e.message==='Imaging order was cancelled'){ alert(t.px_readingOnCancelled); openViewer(viewer.order_item_id); reloadItems(); return; }
      alert(t.cs_errorPrefix+e.message);
    }
  }

  useEffect(function(){ loadData(); },[]);

  // The lab now sees an order as soon as it is written, while the consultation is
  // still open, and the imaging room works from the worklist the same way. So a result
  // can come in while the doctor still has the patient on screen. Every 30 s, while
  // this consultation has a lab order without a result or an imaging order not yet
  // done, re-read the orders and copy across only what the lab and PACS change -
  // status, result, worklist state - onto the rows already shown. Quantities or notes
  // the doctor is typing are left alone, and nothing is added or removed. A hidden
  // tab does not poll.
  var ORDER_PROGRESS_FIELDS = ['status','result_at','result_by','result_text','worklist_status','worklist_sent_at'];
  useEffect(function(){
    if(!consult) return;
    var cid = consult.id;
    var timer = setInterval(function(){
      if(document.hidden) return;
      var waiting = orderItemsRef.current.some(function(o){
        if(o.code_type==='lab') return o.status!=='completed' && o.status!=='cancelled';
        return o.status!=='cancelled' && !!o.worklist_sent_at && o.worklist_status!=='completed' && o.worklist_status!=='cancelled';
      });
      if(!waiting) return;
      api.get('/consultations/'+cid+'/orders').then(function(fresh){
        var byId = {}; (fresh||[]).forEach(function(f){ byId[f.id] = f; });
        setOrderItems(function(cur){
          var changed = false;
          var next = cur.map(function(o){
            var f = byId[o.id]; if(!f) return o;
            var diff = ORDER_PROGRESS_FIELDS.some(function(k){ return String(o[k]==null?'':o[k]) !== String(f[k]==null?'':f[k]); });
            if(!diff) return o;
            changed = true;
            var n = Object.assign({}, o); ORDER_PROGRESS_FIELDS.forEach(function(k){ n[k] = f[k]; }); return n;
          });
          return changed ? next : cur;
        });
      }).catch(function(){});
    }, 30000);
    return function(){ clearInterval(timer); };
  },[consult && consult.id]);

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

  // Text typed in my note and not saved yet is kept in this browser (decision 2026-09-30,
  // conditions from the coordinator): found only by this account's id + the
  // consultation's id, dropped when saved, dropped when older than a day, and every one
  // of this account's is removed at sign-out (api/client.js logout). A patient's text
  // stays on a shared PC until then - wiki/modules/consultation.md 7.3.
  var noteDraft = {
    key: function(cid){ return 'cs_noteDraft:' + (user ? user.id : '') + ':' + cid; },
    read: function(cid){
      try {
        var prefix = 'cs_noteDraft:' + (user ? user.id : '') + ':', now = Date.now();
        for(var i = localStorage.length - 1; i >= 0; i--){
          var k = localStorage.key(i);
          if(k && k.indexOf(prefix) === 0){
            var o = JSON.parse(localStorage.getItem(k) || 'null');
            if(!o || !(now - o.at < 86400000)) localStorage.removeItem(k);
          }
        }
        var d = JSON.parse(localStorage.getItem(noteDraft.key(cid)) || 'null');
        return d ? d.text : null;
      } catch(e){ return null; }
    },
    write: function(cid, text){ try { localStorage.setItem(noteDraft.key(cid), JSON.stringify({ text: text, at: Date.now() })); } catch(e){} },
    drop: function(cid){ try { localStorage.removeItem(noteDraft.key(cid)); } catch(e){} },
  };
  var consultId = consult ? consult.id : null;
  useEffect(function(){
    if(!consultId) return;
    if(note !== mineSaved) noteDraft.write(consultId, note); else noteDraft.drop(consultId);
  },[note, mineSaved, consultId]);
  // Two doctors on one visit: every 30 s the notes are read again, so the other doctor's
  // appears. The box (what I am typing) is never touched.
  useEffect(function(){
    if(!consultId) return;
    var timer = setInterval(function(){
      if(document.hidden) return;
      api.get('/consultations/'+consultId+'/notes').then(function(ns){
        setNotes(function(cur){ return JSON.stringify(cur) === JSON.stringify(ns) ? cur : (ns||[]); });
      }).catch(function(){});
    }, 30000);
    return function(){ clearInterval(timer); };
  },[consultId]);

  // Paid visits are not transferred (decided 2026-09-30: until payment). The queue's rows
  // say has_active_bill; a visit opened from the patient's visit list (Trouver patient /
  // Sélection visite) carries its latest bill's status instead.
  function visitBilled(v){ return !!(v && (v.has_active_bill || (v.billing_id && v.bill_status && v.bill_status !== 'cancelled'))); }
  async function openTransfer(){
    if(!sel) return;
    setTransfer({ doctor: sel.doctor_id ? String(sel.doctor_id) : '', reason: '', doctors: [], busy: false });
    try {
      // The doctors the reception screen picks from (each with its department).
      var docs = await api.get('/admin/doctors');
      setTransfer(function(p){ return p ? Object.assign({}, p, { doctors: docs||[] }) : p; });
    } catch(err){ alert(t.cs_errorPrefix+err.message); setTransfer(null); }
  }
  // The department that goes with a doctor: theirs, or the visit's when they have none.
  function transferDept(doc){ return doc && doc.department_id ? doc.department_id : (sel ? sel.department_id : null) || null; }
  // The server's refusals ({error, code}, visit.routes.js) in the screen's language,
  // picked by code; a code this screen does not know shows the server's sentence.
  var TRANSFER_REFUSALS = { VISIT_NOT_FOUND:'cs_trNotFound', VISIT_CANCELLED:'cs_trCancelled', VISIT_BILLED:'cs_trPaid',
    BAD_DEPARTMENT:'cs_trBadDept', BAD_DOCTOR:'cs_trBadDoctor', NO_CHANGE:'cs_trNoChange' };
  function transferError(err){
    var key = err && TRANSFER_REFUSALS[err.code];
    if(!key) return t.cs_errorPrefix + (err && err.message);
    return String(t[key]||'').replace('{receipt}', (err.data && err.data.receipt_no) || '');
  }
  async function doTransfer(){
    if(!transfer || !sel) return;
    var vid = sel.id;
    setTransfer(function(p){ return Object.assign({}, p, { busy: true }); });
    try {
      var doc = transfer.doctors.filter(function(d){ return String(d.id)===transfer.doctor; })[0];
      var v = await api.put('/visits/'+vid+'/transfer', {
        department_id: transferDept(doc),
        doctor_id: parseInt(transfer.doctor, 10),
        reason: transfer.reason.trim() || undefined });
      // The patient bar, today's chart header and the queue show the new department and
      // doctor at once. Only these fields are taken: the note being typed, the
      // prescriptions and the orders are not touched.
      var keep = { department_id: v.department_id, doctor_id: v.doctor_id, dept_code: v.dept_code, dept_name: v.dept_name, doctor_name: v.doctor_name, has_active_bill: v.has_active_bill };
      setSel(function(cur){ return cur && cur.id===vid ? Object.assign({}, cur, keep) : cur; });
      setVisits(function(list){ return (list||[]).map(function(x){ return x.id===vid ? Object.assign({}, x, keep) : x; }); });
      setConsult(function(c){ return c && c.visit_id===vid ? Object.assign({}, c, { department_id: v.department_id }) : c; });
      setTransfer(null);
      showToast(t.cs_trDone);
    } catch(err){
      alert(transferError(err));
      setTransfer(function(p){ return p ? Object.assign({}, p, { busy: false }) : p; });
    }
  }

  async function pickPatient(v){
    // My note not saved yet: OK saves it and opens the other visit, Annuler stays.
    if(consult && noteRef.current !== mineSavedRef.current){
      if(!window.confirm(t.cs_noteUnsavedSwitch)) return;
      try { await pushNote(); } catch(err){ alert(t.cs_errorPrefix+err.message); return; }
    }
    setSel(v); setQueueOpen(false); setPastView(null);
    // A visit picked through Trouver patient / Sélection visite comes from the visit-history
    // list, which carries no sex, birth date or allergies - the header then showed no
    // allergy warning. Fill them from the patient record (the queue's rows already have them).
    if(v && v.patient_id && v.gender === undefined){
      api.get('/patients/'+v.patient_id).then(function(p){
        setSel(function(cur){ return cur && cur.id===v.id ? Object.assign({}, cur, {gender:p.gender, date_of_birth:p.date_of_birth, allergies:p.allergies}) : cur; });
      }).catch(function(){});
    }
    setDxList([]); setRxList([]); setOrderItems([]);
    setNote(''); setNotes([]); setMineSaved(''); setDraftBack(false); setVt({bp:'',temp:'',pulse:'',spo2:'',rr:''});
    setOrderCode(''); setOrderSugg([]);
    try {
      // Check if consultation already exists for this visit
      // If not, start one
      var cData = await api.post('/consultations',{ visit_id:v.id, patient_id:v.patient_id, department_id:v.department_id });
      // Read before anything renders with this consultation: the draft effect below drops
      // the kept text while the box is still empty.
      var draft = noteDraft.read(cData.id);
      setConsult(cData);
      // Load existing data
      var rx = await api.get('/consultations/'+cData.id+'/prescriptions');
      setRxList(rememberRx(rx));
      var oi = await api.get('/consultations/'+cData.id+'/orders');
      setOrderItems(oi);
      // Every doctor's note; mine goes in the box. Text typed here and not saved (kept on
      // this computer, see noteDraft) comes back instead, with a line saying so.
      var ns = await api.get('/consultations/'+cData.id+'/notes');
      var mine = (ns||[]).filter(function(n){ return n.mine; })[0];
      var mineText = mine ? mine.note_text : '';
      setNotes(ns||[]); setMineSaved(mineText); mineSavedRef.current = mineText;
      if(draft != null && draft !== mineText){ setNote(draft); setDraftBack(true); }
      else { noteDraft.drop(cData.id); setNote(mineText); }
      // Every saved vital sign is loaded, with or without a blood pressure. This used to
      // load only when a BP was saved, so a temperature taken alone showed empty and the
      // next Sauver wrote it away (the change log caught it, 2026-09-29).
      setVt({bp:cData.bp_systolic ? cData.bp_systolic+'/'+(cData.bp_diastolic||'') : '',temp:cData.temperature||'',pulse:cData.pulse||'',spo2:cData.spo2||'',rr:cData.respiratory_rate||''});
      // Load history
      var h = await api.get('/patients/'+v.patient_id+'/history');
      setHistory(h.filter(function(c){ return c.id !== cData.id; }));
    } catch(err){
      // A visit reception cancelled is refused by the server (409); tell the doctor
      // instead of leaving a patient bar with nothing under it.
      if(LOCK_MESSAGES[err && err.message]){ alert(t[LOCK_MESSAGES[err.message]]); setSel(null); setConsult(null); }
      else console.error(err);
    }
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
      [t.cs_vBP, (c.bp_systolic!=null ? c.bp_systolic+'/'+(c.bp_diastolic!=null?c.bp_diastolic:'') : '\u2014')],
      [t.cs_vBT, (c.temperature!=null ? c.temperature : '\u2014')],
      [t.cs_vPR, (c.pulse!=null ? c.pulse : '\u2014')],
      [t.cs_vRR, (c.respiratory_rate!=null ? c.respiratory_rate : '\u2014')],
      [t.cs_vSpO2, (c.spo2!=null ? c.spo2 : '\u2014')]
    ];
    return <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'8px 12px',background:'var(--accent-a18)',borderBottom:'1px solid var(--accent-a50)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize: 14,fontWeight:800,color:'var(--accent-text-2)'}}>{'\uD83D\uDCC5 '}{[c.consult_date?c.consult_date.split('T')[0]:'', c.dept_code, c.doctor_name].filter(Boolean).join(' · ')}</span>
        <span style={{fontSize: 12,color:'var(--warn-text)',fontWeight:700}}>{t.pastRecordRO}</span>
        <button onClick={closePast} style={{marginLeft:'auto',background:'var(--accent-a20)',color:'var(--accent-text)',border:'1px solid var(--accent-a40)',borderRadius:5,padding:'5px 12px',cursor:'pointer',fontSize: 13,fontWeight:800}}>{t.backToCurrent}</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:'10px 12px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
          {vrows.map(function(r){return <div key={r[0]} style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'5px 10px'}}><span style={{fontSize: 12,color:t3,fontWeight:700,marginRight:6}}>{r[0]}</span><span style={{fontSize: 15,color:tx,fontFamily:'monospace'}}>{r[1]}</span></div>;})}
        </div>
        <div style={{fontWeight:700,fontSize: 13,color:'var(--accent-text)',marginBottom:4}}>{t.consultNote}</div>
        <div style={{background:scBg,border:'1px solid '+bd,borderRadius:6,padding:'8px 12px',marginBottom:14,minHeight:60}}>{notesBlock(c.notes, false)}</div>
        <div style={{fontWeight:700,fontSize: 13,color:'var(--ok-text)',marginBottom:4}}>{t.orders}</div>
        <div style={{background:pn,border:'1px solid '+bd,borderRadius:6,overflow:'hidden'}}>
          {((pastView.rx||[]).length===0 && (pastView.orders||[]).length===0) ? <div style={{padding:14,textAlign:'center',color:t3,fontSize: 13}}>{'\u2014'}</div> : null}
          {(pastView.rx||[]).map(function(rx,i){
            return <div key={'prx-'+i} style={{display:'flex',gap:8,padding:'6px 10px',borderBottom:'1px solid var(--line-soft)',alignItems:'baseline'}}>
              <span style={{color:'var(--accent-text)',fontFamily:'monospace',fontSize: 12,fontWeight:700,width:64}}>{rx.drug_code}</span>
              <span style={{color:tx,fontSize: 14,flex:1}}>{rx.drug_name}</span>
              <span style={{color:t2,fontSize: 12,textAlign:'right'}}>{rxLine(rx)}{rx.route?<div>{rx.route}</div>:null}</span>
            </div>;
          })}
          {(pastView.orders||[]).map(function(o,i){
            return <div key={'po-'+i} style={{display:'flex',gap:8,padding:'6px 10px',borderBottom:'1px solid var(--line-soft)',alignItems:'baseline'}}>
              <span style={{color:'var(--violet-text)',fontFamily:'monospace',fontSize: 12,fontWeight:700,width:64}}>{o.order_code}</span>
              <span style={{color:o.status==='cancelled'?t3:tx,fontSize: 14,flex:1,textDecoration:o.status==='cancelled'?'line-through':'none'}}>{o.order_name}{orderTotalLine(o, o.status==='cancelled')}</span>
              <span style={{fontSize: 12}}>{orderStatus(o)}</span>
            </div>;
          })}
        </div>
      </div>
    </div>;
  }

  // The vital signs: one set per visit, often left empty (the doctor writes them in the
  // note) - an empty box is saved as nothing and never stops a save or Terminé.
  function vitalsBody(){
    var bpParts = (vt.bp||'').split('/');
    return {
      bp_systolic: parseInt(bpParts[0])||null,
      bp_diastolic: parseInt(bpParts[1])||null,
      temperature: parseFloat(vt.temp)||null,
      pulse: parseInt(vt.pulse)||null,
      spo2: parseInt(vt.spo2)||null,
      respiratory_rate: parseInt(vt.rr)||null,
    };
  }
  async function saveVitals(){
    var c = await api.put('/consultations/'+consult.id, vitalsBody());
    setConsult(function(p){ return p && p.id===c.id ? Object.assign({}, p, { vitals_by:c.vitals_by, vitals_at:c.vitals_at, vitals_by_name:c.vitals_by_name }) : p; });
  }
  // My note, if it changed. Empty text empties it (the server removes it from the chart).
  async function pushNote(){
    if(!consult) return;
    var cid = consult.id, text = noteRef.current;
    if(text === mineSavedRef.current) return;
    var r = await api.put('/consultations/'+cid+'/note', { note_text: text });
    var saved = r.note ? r.note.note_text : '';
    mineSavedRef.current = saved; setMineSaved(saved);
    setNotes(r.notes || []);
    // Typed on while it was saving: that text stays kept on this computer.
    if(noteRef.current === saved) noteDraft.drop(cid); else noteDraft.write(cid, noteRef.current);
    setDraftBack(false);
  }
  async function saveNote(){
    if(!consult) return;
    try {
      await saveVitals();
      await pushNote();
      showToast(t.cs_noteSaved);
    } catch(err){ alert(t.cs_errorPrefix+err.message); }
  }

  async function completeConsult(){
    if(!consult) return;
    var missing = rxList.filter(noDose);
    if(missing.length && !window.confirm(String(t.cs_noDoseConfirm||'').replace('{n}', missing.length)
        .replace('{names}', missing.map(function(r){ return r.drug_name; }).join(', ')))) return;
    var noCount = rxList.filter(noPackQty);
    if(noCount.length && !window.confirm(String(t.cs_noPackConfirm||'').replace('{n}', noCount.length)
        .replace('{names}', noCount.map(function(r){ return r.drug_name; }).join(', ')))) return;
    try {
      // 완료 전에 바이탈과 내 기록을 먼저 저장 (저장을 안 누르고 완료해도 날아가지 않게)
      await saveVitals();
      await pushNote();
      await api.put('/consultations/'+consult.id+'/complete');
      await loadData();
      setSel(null); setConsult(null);
      alert(t.cs_consultDone);
    } catch(err){ alert(t.cs_errorPrefix+err.message); }
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
      // Decision B (2026-09-29): a drug has a price, not a default dose. From the search
      // the daily dose, times, days and sig start EMPTY for the doctor to write; only an
      // order set brings its own (fromSet). The drug's old default_* columns are not read.
      var set = drug.fromSet ? drug : {};
      var rx = await api.post('/consultations/'+consult.id+'/prescriptions',{
        drug_id:drug.id, drug_code:drug.code, drug_name:drug.name,
        dose:set.default_dose || '', frequency:set.default_freq || '', days:set.default_days || '',
        route:set.default_route || '', unit_price:drug.unit_price,
        memo: drug.unit || '',
        // Only used when the drug is a pack-unit one (the server looks that up): the
        // count from an order set. From the search it is empty and the doctor types it.
        pack_qty: drug.pack_qty,
      });
      rememberRx([rx]);
      setRxList(function(p){ return p.concat([rx]); });
      setOrderCode(''); setOrderSugg([]); setOSelIdx(-1);
    } catch(err){ alert(t.cs_errorPrefix+err.message); }
  }

  // A refusal usually means the pharmacy or lab moved on while this screen was open,
  // so after telling the doctor, reload the rows to show their real state.
  function lockAlert(err){
    var key = LOCK_MESSAGES[err && err.message];
    if(!key) return false;
    alert(t[key]);
    reloadItems();
    return true;
  }
  async function reloadItems(){
    if(!consult) return;
    try { setRxList(rememberRx(await api.get('/consultations/'+consult.id+'/prescriptions'))); } catch(e){}
    try { setOrderItems(await api.get('/consultations/'+consult.id+'/orders')); } catch(e){}
  }

  // The status cell of an order row. worklist_status only means something for an order
  // that went to an imaging worklist: every other order is stored with 'completed' there
  // from the start (consult.routes.js POST /:id/orders), so a lab order read "completed"
  // before the lab had entered anything. A lab order shows the lab's own status instead,
  // and an order with neither shows nothing.
  // Under an order's name when it is billed more than once a line (⑭: quantity x days,
  // worked out by the server into total_qty), e.g. "facturé 5 fois". Nothing for the
  // usual 1 x 1. total_qty is what the cashier charges.
  function orderTotalLine(o, gone){
    var tot = parseFloat(o.total_qty);
    if(gone || !(tot > 0) || tot === (parseFloat(o.quantity)||0)) return null;
    return <div style={{fontSize:11.5,color:t2,marginTop:1}}>{String(t.cs_orderTotal||'').replace('{n}', fmtAmount(tot))}</div>;
  }
  // ── Notes in the chart ──
  function hhmm(x){
    if(!x) return '';
    var d = new Date(x);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }
  function isMine(n){ return !!(n && user && n.author_id != null && n.author_id === user.id); }
  // "Dr RABE · 09:12 · modifiée 10:40" - the author, when the note was first saved, and
  // when it was last changed.
  function noteHead(n){
    return [ (n.author_name || '?') + (isMine(n) ? ' ' + t.cs_noteYou : ''), hhmm(n.created_at),
      n.updated_at ? String(t.cs_noteEdited||'').replace('{time}', hhmm(n.updated_at)) : '' ].filter(Boolean).join(' · ');
  }
  // Every doctor's note on one consultation. Mine has an accent edge; on today's visit
  // (today) clicking it puts the cursor in the box, where it is edited. Another doctor's
  // note is read only. compact: two lines, for the list of earlier visits.
  function notesBlock(list, compact, today){
    if(!list || !list.length) return <div style={{fontSize: 13,color:t3}}>{compact ? '\u2014' : t.cs_noteNone}</div>;
    return list.map(function(n){
      var mine = isMine(n);
      return <div key={n.id} onClick={mine && today ? function(){ if(noteBoxRef.current) noteBoxRef.current.focus(); } : undefined}
        style={{marginTop:4,paddingLeft:7,borderLeft:'3px solid '+(mine?'var(--accent)':'var(--line-soft)'),cursor:mine&&today?'pointer':'default'}}>
        <div title={noteHead(n)} style={{fontSize: 12,fontWeight:700,color:mine?'var(--accent-text)':t2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{noteHead(n)}</div>
        <div style={Object.assign({fontSize: 13,color:'var(--text-2)',lineHeight:1.5,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}, compact ? {maxHeight:38,overflow:'hidden'} : {})}>{n.note_text}</div>
      </div>;
    });
  }
  // The name of who wrote a prescription or order line, only when lines on this visit
  // come from more than one doctor (lines written before 2026-09-30 carry no name).
  var lineAuthors = {};
  rxList.forEach(function(r){ if(r.prescribed_by) lineAuthors[r.prescribed_by] = 1; });
  orderItems.forEach(function(o){ if(o.ordered_by) lineAuthors[o.ordered_by] = 1; });
  var manyAuthors = Object.keys(lineAuthors).length > 1;
  function authorTag(name){
    return manyAuthors && name ? <span style={{marginLeft:6,fontSize: 11,color:t3,whiteSpace:'nowrap'}}>{name}</span> : null;
  }

  function cancelTitle(o){ return (t.cs_labCancelled||'') + (o.cancel_reason ? ' — ' + o.cancel_reason : ''); }
  function orderStatus(o){
    // Cancelled first, whatever the type: a cancelled imaging order may still say
    // 'completed' on its worklist (the study was taken), but it is cancelled.
    if(o.status==='cancelled') return <span title={cancelTitle(o)} style={{color:t3,cursor:'help'}}>{t.cs_labCancelled}</span>;
    if(o.code_type==='lab'){
      if(o.status==='completed') return <span style={{color:'var(--ok-text)'}}>{t.cs_labDone}</span>;
      return <span style={{color:'var(--warn-text)'}}>{t.cs_labPending}</span>;
    }
    if(o.worklist_sent_at){
      var ws = o.worklist_status || '';
      var wsKey = { pending:'cs_wsPending', sent:'cs_wsSent', in_progress:'cs_wsInProgress', completed:'cs_wsCompleted', cancelled:'cs_wsCancelled' }[ws];
      // One piece, never broken in the middle: beside the image button in the 78px column
      // «촬영 완료» broke after «완» and made the row two lines high (director, 2026-09-30).
      // A label too long to sit beside the button goes under it whole.
      return <span style={{color:ws==='sent'?'var(--ok-text)':t2,display:'inline-block',whiteSpace:'nowrap',fontSize:11,verticalAlign:'middle'}}>{wsKey ? t[wsKey] : ws}</span>;
    }
    return null;
  }

  // The line under the drug name: doseSentence() from rx-dosing.js, e.g.
  // "1회 1정 × 하루 3회, 7일 (총 21)". When one intake does not come out in half tablets
  // it is amber with a warning in front (the pharmacy flags the same lines). A total
  // saved before 2026-09-29 was dose x times x days, so the sentence would contradict
  // itself; isLegacyTotal() spots it and the line says what the new formula gives.
  // That total stays until the dose, times or days are changed (consult.routes.js PUT).
  function rxLine(rx){
    var text = doseSentence(rx, lang);
    if(!text) return null;
    var p = perDose(rx);
    var uneven = !!(p && !p.clean);
    var legacy = isLegacyTotal(rx);
    var fresh = Math.round((parseFloat(rx.dose)||0) * (parseInt(rx.days,10)||1) * 1000) / 1000;
    return <div style={{fontSize:11.5,lineHeight:1.35,marginTop:1,color:uneven?'var(--warn-text)':t2}}>
      {uneven ? '⚠ '+t.cs_rxUnevenFlag+' — ' : ''}{text}
      {legacy ? <span style={{color:'var(--warn-text)'}}>{' · '+String(t.cs_rxLegacy||'').replace('{total}', fmtAmount(fresh))}</span> : null}
    </div>;
  }


  function NoPriceBadge(){
    return <span title={t.cs_noPriceHint} style={{marginLeft:6,background:'var(--warn-chip)',color:'var(--warn-text-2)',border:'1px solid var(--warn-strong)',borderRadius:3,padding:'0 5px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',cursor:'help',verticalAlign:'middle'}}>{t.cs_noPrice}</span>;
  }
  function NoDoseBadge(){
    return <span title={t.cs_noDoseHint} style={{marginLeft:6,background:'var(--danger-chip)',color:'var(--danger-text-2)',border:'1px solid var(--danger-deep)',borderRadius:3,padding:'0 5px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',cursor:'help',verticalAlign:'middle'}}>{t.cs_noDose}</span>;
  }
  var noDoseRows = rxList.filter(noDose);
  var noPackRows = rxList.filter(noPackQty);
  function NoPackBadge(){
    return <span title={t.cs_packQtyHint} style={{marginLeft:6,background:'var(--danger-chip)',color:'var(--danger-text-2)',border:'1px solid var(--danger-deep)',borderRadius:3,padding:'0 5px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',cursor:'help',verticalAlign:'middle'}}>{t.cs_noPackQty}</span>;
  }
  // The count box of a pack-unit line, under the drug name: "Quantité [ 2 ] flacon".
  // Red border while empty. Saved on blur like the other fields. Called as a function,
  // not used as <Component/>: defined in here it would be a new component type on every
  // render, and React would remount the input and drop the focus at each keystroke.
  function packQtyBox(rx){
    var v = rx.pack_qty!==undefined ? rx.pack_qty : packCount(rx);
    var empty = !(parseFloat(v) > 0);
    return <div title={t.cs_packQtyHint} style={{marginTop:3,display:'flex',alignItems:'center',gap:4,fontSize:12.5,color:t2}}>
      <span style={{fontWeight:700,whiteSpace:'nowrap'}}>{t.cs_packQty}</span>
      <input type="number" min="1" step="1" value={v} onChange={function(e){updateRxLocal(rx.id,'pack_qty',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }}
        style={{width:40,background:'var(--field)',border:'1px solid '+(empty?'var(--danger-deep)':'var(--field-border)'),borderRadius:4,padding:'2px 4px',color:tx,fontSize:14,textAlign:'center'}}/>
      {/* The unit word agrees with the count (1 flacon, 2 flacons); packWord puts the
          number in front, which the box already shows. Korean has no plural. */}
      {(function(){ var w = lang==='ko' ? packWord(rx, lang) : packWord(rx, lang, parseFloat(v) > 1 ? 2 : 1).replace(/^[\d.,\s]+/, '');
        // one line: at 1366 wide « flacons » broke into « flaco / ns »
        return <span title={w} style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{w}</span>; })()}
    </div>;
  }
  var noPriceCount = rxList.filter(function(r){ return r.dispense_type!=='external' && noPrice(r.unit_price); }).length
                   + orderItems.filter(function(o){ return o.status!=='cancelled' && noPrice(o.unit_price); }).length;

  // No undo exists for a removed line, and the ✕ sits right beside the code a doctor
  // clicks to read, so ask first.
  // Asks before a line is removed. When its code is already on a bill in force for this
  // visit, the question says so: the cashier will then have to refund the patient.
  async function confirmRemove(name, code){
    var paid = false;
    if(consult && code){
      try { paid = (await api.get('/consultations/'+consult.id+'/billed-codes')).indexOf(code) >= 0; } catch(e){ paid = false; }
    }
    var q = String(t.cs_confirmRemove||'').replace('{name}', name||'');
    return window.confirm(paid ? q + '\n\n' + t.cs_removePaidNote : q);
  }

  async function removeRx(rx){
    if(!(await confirmRemove(rx.drug_name, rx.drug_code))) return;
    try {
      await api.del('/consultations/prescription/'+rx.id);
      setRxList(function(p){ return p.filter(function(r){return r.id!==rx.id}); });
    } catch(err){ if(!lockAlert(err)) alert(err.message); }
  }

  function updateRxLocal(rxId, key, val){
    setRxList(function(list){ return list.map(function(r){ if(r.id!==rxId) return r; var n={}; for(var k in r)n[k]=r[k]; n[key]=val; return n; }); });
    armRowSave('rx', rxId);
  }
  // The pause save: on an open consultation, 2 s after the last keystroke in a row.
  function armRowSave(kind, id){
    var key = kind + id;
    clearTimeout(rowTimers.current[key]);
    if(finishedRef.current) return;
    rowTimers.current[key] = setTimeout(function(){ delete rowTimers.current[key]; flushRow(kind, id); }, 2000);
  }
  function flushRow(kind, id){
    var list = kind==='rx' ? rxListRef.current : orderItemsRef.current;
    var row = list.filter(function(r){ return r.id===id; })[0];
    if(row) (kind==='rx' ? saveRx : saveOrder)(row);
  }
  function rxBody(rx){
    // Sent as written: an empty field stays empty on the server (no silent 1).
    return {
      dose: rx.dose == null ? '' : rx.dose,
      frequency: rx.frequency == null ? '' : rx.frequency,
      days: rx.days == null ? '' : rx.days,
      route: rx.route || '',
      memo: rx.memo || '',
      unit_price: rx.unit_price,
      // pack_qty only for a pack-unit line; left out otherwise so the server keeps
      // working the total out from the dose and the days.
      pack_qty: isPack(rx) ? (rx.pack_qty!==undefined ? rx.pack_qty : packCount(rx)) : undefined
    };
  }
  function ordBody(o){
    return { dose: o.dose || '', frequency: parseInt(o.frequency) || 1, days: parseInt(o.days) || 1,
      quantity: o.quantity || 1, memo: o.memo || '', unit_price: o.unit_price };
  }
  // Rows with changes not yet saved (locked rows are never sent).
  function dirtyRows(){
    var out = [];
    rxListRef.current.forEach(function(r){ if(r.status!=='dispensed' && savedRx.current[r.id]!==undefined && savedRx.current[r.id]!==rxSnap(r)) out.push(['rx', r]); });
    orderItemsRef.current.forEach(function(o){ if(o.status!=='cancelled' && savedOrd.current[o.id]!==undefined && savedOrd.current[o.id]!==ordSnap(o)) out.push(['o', o]); });
    return out;
  }

  async function saveRx(rx){
    var key = 'rx' + rx.id, snap = rxSnap(rx);
    clearTimeout(rowTimers.current[key]); delete rowTimers.current[key];
    if(savedRx.current[rx.id] === snap || rowInflight.current[key] === snap) return;
    var seq = (rowSeq.current[key] || 0) + 1; rowSeq.current[key] = seq; rowInflight.current[key] = snap;
    try {
      var body = rxBody(rx);
      var updated = await inTurn(key, function(){ return api.put('/consultations/prescription/'+rx.id, body); });
      if(rowSeq.current[key] !== seq) return;            // a newer save of this row is on its way
      delete rowInflight.current[key];
      rememberRx([updated]);
      setRxList(function(list){ return list.map(function(r){
        if(r.id!==rx.id) return r;
        if(rxSnap(r) === snap) return Object.assign({}, r, updated);
        // typed on after this save left: keep what is typed, take what the server worked out
        return Object.assign({}, r, { total_qty: updated.total_qty, status: updated.status, dosage_form: updated.dosage_form, pack_unit: updated.pack_unit, pack_label: updated.pack_label });
      }); });
    } catch(err){
      if(rowSeq.current[key] === seq) delete rowInflight.current[key];
      if(!lockAlert(err)) alert(t.cs_errorPrefix+err.message);
    }
  }

  function updateOrderLocal(orderId, key, val){
    setOrderItems(function(list){ return list.map(function(o){ if(o.id!==orderId) return o; var n={}; for(var k in o)n[k]=o[k]; n[key]=val; return n; }); });
    armRowSave('o', orderId);
  }

  // Same rules as saveRx. An order row is remembered as saved when it is first shown
  // (the effect below), so an unchanged row is not sent.
  async function saveOrder(o){
    var key = 'o' + o.id, snap = ordSnap(o);
    clearTimeout(rowTimers.current[key]); delete rowTimers.current[key];
    if(savedOrd.current[o.id] === snap || rowInflight.current[key] === snap) return;
    var seq = (rowSeq.current[key] || 0) + 1; rowSeq.current[key] = seq; rowInflight.current[key] = snap;
    try {
      var body = ordBody(o);
      var updated = await inTurn(key, function(){ return api.put('/consultations/order/'+o.id, body); });
      if(rowSeq.current[key] !== seq) return;
      delete rowInflight.current[key];
      savedOrd.current[o.id] = ordSnap(updated);
      setOrderItems(function(list){ return list.map(function(x){
        if(x.id!==o.id) return x;
        if(ordSnap(x) === snap) return Object.assign({}, x, updated);
        return Object.assign({}, x, { total_qty: updated.total_qty, status: updated.status });
      }); });
    } catch(err){
      if(rowSeq.current[key] === seq) delete rowInflight.current[key];
      if(!lockAlert(err)) alert(t.cs_errorPrefix+err.message);
    }
  }
  // Order rows shown for the first time are taken as saved (they come from the server).
  useEffect(function(){
    orderItems.forEach(function(o){ if(savedOrd.current[o.id]===undefined) savedOrd.current[o.id] = ordSnap(o); });
  },[orderItems]);
  // Leaving the page (F5, closing, another address) or hiding it (another tab, minimised):
  // send every row with unsaved changes. On pagehide the page may be gone before an
  // answer comes back, so the request is fetch keepalive, sent by the browser itself.
  useEffect(function(){
    function sendAway(){
      var token = null; try { token = localStorage.getItem('medconnect_token'); } catch(e){}
      dirtyRows().forEach(function(pair){
        var kind = pair[0], row = pair[1];
        var url = kind==='rx' ? '/api/consultations/prescription/'+row.id : '/api/consultations/order/'+row.id;
        try {
          fetch(url, { method:'PUT', keepalive:true, headers: Object.assign({'Content-Type':'application/json'}, token ? {Authorization:'Bearer '+token} : {}),
            body: JSON.stringify(kind==='rx' ? rxBody(row) : ordBody(row)) });
        } catch(e){ /* nothing more can be done while the page goes */ }
      });
    }
    function onHidden(){ if(document.visibilityState==='hidden') dirtyRows().forEach(function(pair){ flushRow(pair[0], pair[1].id); }); }
    window.addEventListener('pagehide', sendAway);
    document.addEventListener('visibilitychange', onHidden);
    return function(){ window.removeEventListener('pagehide', sendAway); document.removeEventListener('visibilitychange', onHidden); };
  },[]);


  async function addExamOrder(oc){
    if(!consult) return;
    // Lab and imaging orders always start 1 · 1 · 1 (director's instruction, 2026-09-29):
    // with ⑭ the days multiply the bill, and repeating an exam on several days is a thing
    // the doctor writes on purpose. A procedure (an injection course) starts with its
    // order code's times and days when it has them, else 1 · 1 · 1. From an order set
    // the set's values come in through default_freq / default_days, same rule.
    var exam = oc.code_type==='lab' || oc.code_type==='imaging';
    // No dose on a lab or imaging line: the order code's default dose ('1.000', the
    // column default) showed under Posologie and meant nothing there.
    try {
      var item = await api.post('/consultations/'+consult.id+'/orders',{
        order_code_id:oc.id, order_code:oc.code, order_name:oc.name, code_type:oc.code_type,
        dose:exam ? '' : oc.default_dose, frequency:exam ? 1 : (parseInt(oc.default_freq)||1), days:exam ? 1 : (parseInt(oc.default_days)||1),
        // Quantity: 1 for a lab / imaging order; a procedure from an order set brings the
        // set's quantity (editable in Settings since 6a0ef41), otherwise 1.
        quantity:exam ? 1 : (parseFloat(oc.default_qty) > 0 ? parseFloat(oc.default_qty) : 1),
        unit_price:oc.price_clinic || oc.price || 0, memo:oc.memo || ''
      });
      setOrderItems(function(p){ return p.concat([item]); });
      setOrderCode(''); setOrderSugg([]); setOSelIdx(-1);
    } catch(err){ alert(t.cs_errorPrefix+err.message); }
  }

  // 약속처방 세트 적용: 세트 항목을 현재 진료에 한 번에 추가
  async function applySet(set){
    if(!consult){ alert(t.cs_selectPatient); return; }
    if(pastView) setPastView(null);
    var items = (set && set.items) ? set.items : [];
    // A drug hidden from the list (drug_active false, orderset.routes.js) is not put in:
    // the search no longer offers it, and a set still pointing at it would prescribe it
    // at its old price with nothing on screen to say so. Exam and procedure lines go in
    // as before. The skipped drugs are named once afterwards.
    var skipped = [];
    for(var i=0;i<items.length;i++){
      var it = items[i];
      if(it.kind!=='order' && it.drug_active===false){ skipped.push(it.name||it.code); continue; }
      if(it.kind==='order'){
        await addExamOrder({ id:it.order_code_id, code:it.code, name:it.name, code_type:it.order_code_type,
          default_dose:it.dose, default_freq:it.frequency, default_days:it.days, default_qty:it.quantity,
          price_clinic:it.unit_price, price:it.unit_price, memo:'' });
      } else {
        await addDrugRx({ fromSet:true, id:it.drug_id, code:it.code, name:it.name,
          default_dose:it.dose, default_freq:it.frequency, default_days:it.days,
          default_route:it.route, unit_price:it.unit_price, unit:'',
          pack_qty: it.quantity || 1 });
      }
    }
    if(skipped.length) alert(String(t.cs_setSkippedHidden||'').replace('{names}', skipped.join(', ')));
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

  async function removeOrder(o){
    if(!(await confirmRemove(o.order_name, o.order_code))) return;
    try {
      await api.del('/consultations/order/'+o.id);
      setOrderItems(function(p){ return p.filter(function(x){return x.id!==o.id}); });
    } catch(err){
      // A result (or a reading, a study taken) arrived after the row was drawn: offer to
      // cancel instead.
      if(err && err.message==='Order already has a result' && (o.code_type==='lab' || o.code_type==='imaging')){ cancelOrder(o); return; }
      if(!lockAlert(err)) alert(err.message);
    }
  }

  // Mark a lab or imaging order that already has a result as cancelled
  // (POST /order/:id/cancel). window.prompt: OK with or without a reason cancels,
  // Cancel/Esc does nothing. The text says what happens to the result (for imaging: the
  // images, the reading and the device worklist) and to a bill already paid.
  async function cancelOrder(o){
    var promptText = o.code_type==='imaging' ? t.cs_cancelPromptImg : t.cs_cancelPrompt;
    var reason = window.prompt(String(promptText||'').replace('{name}', o.order_name||''), '');
    if(reason === null) return;
    try {
      var updated = await api.post('/consultations/order/'+o.id+'/cancel', { reason: reason });
      setOrderItems(function(list){ return list.map(function(x){ return x.id===o.id ? updated : x; }); });
    } catch(err){ if(!lockAlert(err)){ alert(t.cs_errorPrefix+err.message); reloadItems(); } }
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
    if(phraseQ){var s=phraseQ.toLowerCase();r=r.filter(function(p){return phraseText(p).toLowerCase().indexOf(s)>=0;});}
    return r;
  },[phrases,phraseCat,phraseQ,lang]);

  // The fixed categories first, then any other category Settings has used - before,
  // a phrase filed under a new category could only be found under "All".
  var phraseCats = useMemo(function(){
    var extra = [];
    (phrases||[]).forEach(function(p){ if(p.category && PHRASE_CATS.indexOf(p.category)<0 && extra.indexOf(p.category)<0) extra.push(p.category); });
    return ['All'].concat(PHRASE_CATS, extra);
  },[phrases]);

  var drugResults = useMemo(function(){
    if(!drugQ) return allDrugs;
    var s=drugQ.toLowerCase();
    return allDrugs.filter(function(d){return d.name.toLowerCase().indexOf(s)>=0||d.code.toLowerCase().indexOf(s)>=0;});
  },[allDrugs,drugQ]);

  finishedRef.current = !!(consult && (consult.status==='completed' || consult.status==='signed' ||
    (sel && sel.visit_date && ymd(sel.visit_date) !== ymd(new Date()))));
  var SC={waiting:'accent',registered:'accent',in_progress:'warn',completed:'ok'};   // colour families (design): tint() and -ink make the colours
  var bd='var(--border)',bd2='var(--border-2)',scBg='var(--panel-head)',pn='var(--panel)',tx='var(--text)',t2='var(--text-2)',t3='var(--text-3)';

  return(
    <div style={{fontFamily:'system-ui,sans-serif',background:'var(--bg)',color:tx,minHeight:'100vh',fontSize: 15,position:'relative',overflow:'hidden'}}>
      <TopBar />

      {/* Patient bar. A dark band with light text on the light screen too (design, proposal A):
          the colours in this block are fixed on purpose and are not tokens. */}
      {sel?(
        <div style={{background:'#0c2d6b',borderBottom:'1px solid #1e4fa0',padding:'5px 12px',display:'flex',alignItems:'center',gap:14,fontSize: 14,flexWrap:'wrap'}}>
          <button onClick={function(){setHistOpen(true)}} style={{background:'#1e4fa0',color:'#dbeafe',border:'1px solid #3b6fd0',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📋 {t.outpatientHistory}</button>
          <button onClick={function(){setDocOpen(true)}} style={{background:'#0f766e',color:'#ccfbf1',border:'1px solid #14b8a6',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📄 {t.documents}</button>
          <button onClick={function(){setLabOpen(true)}} style={{background:'#0e7490',color:'#cffafe',border:'1px solid #06b6d4',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>🧪 {t.labResultsTitle||'검사결과'}</button>
          <button onClick={function(){setReadingsOpen(true)}} style={{background:'#5b21b6',color:'#ede9fe',border:'1px solid #8b5cf6',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>🩻 {t.reading||'판독소견'}</button>
          <button onClick={function(){setChartOpen(true)}} style={{background:'#7c3aed',color:'#ede9fe',border:'1px solid #a855f7',borderRadius:5,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>📋 {t.chartRecord||'차트기록'}</button>
          {/* Order (director, 2026-10-01): what never changes width first - the buttons, then
              the transfer button and the chart's department and doctor - and what does
              (chart number, name, birth date, allergy, memo) to the right, so a long
              name no longer moves the button. The transfer button has the size of the
              buttons on its left. Paid visit: the band's faint text and border instead
              of opacity (design rule: no opacity for locked or cancelled states). */}
          {sel.status!=='cancelled' ? <button onClick={openTransfer} disabled={visitBilled(sel)} title={visitBilled(sel) ? t.cs_trBilledTitle : t.cs_trTitle}
            style={{background:visitBilled(sel)?'#16294a':'#334155',color:visitBilled(sel)?'#6f8db3':'#e2e8f0',border:'1px solid '+(visitBilled(sel)?'#2b4568':'#64748b'),borderRadius:5,padding:'4px 12px',cursor:visitBilled(sel)?'not-allowed':'pointer',fontSize:13,fontWeight:700,whiteSpace:'nowrap'}}>⇄ {t.cs_transfer}</button> : null}
          <span style={{background:'#1e3a5f',borderRadius:3,padding:'1px 6px',color:'#93c5fd',fontWeight:600,fontSize: 13,whiteSpace:'nowrap'}}>{[sel.dept_code, sel.doctor_name].filter(Boolean).join(' ')}</span>
          <span style={{color:'#93c5fd',fontWeight:700,fontFamily:'monospace'}}>{sel.chart_no}</span>
          <span style={{color:'#fff',fontWeight:700,fontSize: 15}}>{sel.last_name} {sel.first_name}</span>
          <span style={{color:'#bfdbfe'}}>{[sel.gender, sel.date_of_birth ? sel.date_of_birth.split('T')[0] : ''].filter(Boolean).join('/')}</span>
          {sel.allergies&&sel.allergies!=='None'?<span style={{background:'#dc2626',color:'#fff',borderRadius:3,padding:'2px 8px',fontSize: 12,fontWeight:700}}>⚠ {sel.allergies}</span>:null}
          {sel.reception_memo?<span style={{background:'#f59e0b30',color:'#fbbf24',borderRadius:3,padding:'2px 6px',fontSize: 12}}>📝 {sel.reception_memo}</span>:null}
        </div>
      ):null}

      <div style={{display:'flex',height:sel?'calc(100vh - 120px)':'calc(100vh - 82px)',position:'relative'}}>

        {/* Slide-out queue. Closed, it is only moved off screen, so its tabs and search box
            stayed in the Tab order and the focus vanished into it: inert (Chrome 102+) takes
            the closed drawer out of it (integration test, 2026-09-30). */}
        <div data-motion="drawer" {...(queueOpen ? {} : { inert: '', 'aria-hidden': 'true' })} style={{position:'absolute',left:0,top:0,bottom:0,width:280,background:pn,borderRight:'1px solid '+bd,zIndex:20,transform:queueOpen?'translateX(0)':'translateX(-290px)',transition:'transform 250ms var(--ease-drawer)',display:'flex',flexDirection:'column',boxShadow:queueOpen?'4px 0 20px var(--shadow-50)':'none'}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid '+bd,display:'flex',gap:3,flexWrap:'wrap'}}>
            {['waiting','completed'].map(function(k){
              var c=k==='waiting'?'accent':'ok';
              return <button key={k} onClick={function(){setQTab(k)}} style={{flex:1,background:qTab===k?tint(c,'18'):'transparent',color:qTab===k?'var(--'+c+'-ink)':t3,border:qTab===k?'1px solid '+tint(c,'40'):'1px solid transparent',borderRadius:4,padding:'3px 6px',cursor:'pointer',fontSize: 12,fontWeight:600}}>{t[k]||k}</button>;
            })}
          </div>
          <div style={{padding:'5px 8px',borderBottom:'1px solid '+bd}}>
            <input autoComplete="off" value={qFilter} onChange={function(e){setQFilter(e.target.value)}} placeholder={t.search} style={{background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:4,padding:'4px 8px',color:tx,fontSize: 13,outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {filteredQueue.map(function(v){
              var isSel=sel&&sel.id===v.id;
              var sc2=SC[v.status]||'text-2';
              return <div key={v.id} onClick={function(){pickPatient(v)}} style={{padding:'7px 10px',cursor:'pointer',borderBottom:'1px solid var(--line-soft)',background:isSel?'var(--accent-a12)':'transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:1}}>
                  <span style={{fontWeight:600,fontSize: 14,color:'var(--text-strong)'}}>{v.last_name} {v.first_name}</span>
                  <span style={{background:tint(sc2,'18'),color:SC[v.status]?'var(--'+sc2+'-ink)':t2,borderRadius:3,padding:'0 4px',fontSize: 11,fontWeight:600}}>{label(VISIT_STATUS_KEY, v.status)}</span>
                </div>
                <div style={{fontSize: 12,color:t2}}>{[v.chart_no, v.dept_code, v.doctor_name].filter(Boolean).join(' · ')}</div>
                <div style={{fontSize: 12,color:t3,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.chief_complaint||''}</div>
              </div>;
            })}
          </div>
        </div>
        {queueOpen?<div onClick={function(){setQueueOpen(false)}} style={{position:'absolute',left:0,top:0,right:0,bottom:0,background:'var(--scrim-30)',zIndex:15}}></div>:null}

        {/* LEFT: Dx + Orders */}
        <div style={{width:'42%',borderRight:'1px solid '+bd,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-col)'}}>
          {/* Queue toggle */}
          <div style={{padding:'4px 10px',borderBottom:'1px solid '+bd,background:scBg,display:'flex',gap:6}}>
            <button onClick={function(){var willOpen=!queueOpen; setQueueOpen(willOpen); if(willOpen){ api.get('/visits/today').then(function(v){setVisits(v);}).catch(function(){}); }}} style={{background:queueOpen?'var(--accent-a20)':'var(--chip)',color:queueOpen?'var(--accent-text)':t2,border:queueOpen?'1px solid var(--accent-a40)':'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize: 13,fontWeight:600}}>
              {queueOpen?'✕':'☰'} {t.patientQueue} ({waitingCount})
            </button>
            <button onClick={function(){setFinderOpen(true)}} style={{background:'var(--chip)',color:t2,border:'1px solid '+bd2,borderRadius:4,padding:'3px 10px',cursor:'pointer',fontSize:13,fontWeight:600}}>🔍 {t.findPatient}</button>
          </div>

          {pastView?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-4)',fontSize: 14,fontStyle:'italic',textAlign:'center',padding:20,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{t.viewingPast}</div>
          ):consult?(
            <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
              {/* Orders */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{padding:'5px 10px',background:scBg,display:'flex',justifyContent:'space-between',borderBottom:'1px solid '+bd,alignItems:'center'}}>
                  <span style={{fontWeight:700,fontSize: 14,color:tx}}>{t.orders}{noDoseRows.length ? <span title={t.cs_noDoseHint} style={{marginLeft:8,color:'var(--danger-text)',fontSize:12,fontWeight:700,cursor:'help'}}>⚠ {String(t.cs_noDoseCount||'').replace('{n}', noDoseRows.length)}</span> : null}{noPackRows.length ? <span title={t.cs_packQtyHint} style={{marginLeft:8,color:'var(--danger-text)',fontSize:12,fontWeight:700,cursor:'help'}}>⚠ {String(t.cs_noPackQtyCount||'').replace('{n}', noPackRows.length)}</span> : null}{noPriceCount ? <span title={t.cs_noPriceHint} style={{marginLeft:8,color:'var(--warn-text)',fontSize:12,fontWeight:700,cursor:'help'}}>⚠ {String(t.cs_noPriceCount||'').replace('{n}', noPriceCount)}</span> : null}</span>
                  <button onClick={function(){setDrugModal(true)}} style={{background:'var(--ok-a20)',color:'var(--ok-text)',border:'1px solid var(--ok-a40)',borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 12,fontWeight:600}}>+ {t.drugSearch}</button>
                </div>
                {/* Code input */}
                <div style={{padding:'5px 10px',borderBottom:'1px solid '+bd,position:'relative'}}>
                  <div style={{display:'flex',gap:4,marginBottom:5}}>
                    {[['all',t.all],['drug',t.drug],['exam',t.examImaging]].map(function(m){
                      return <button key={m[0]} onClick={function(){changeOrderMode(m[0])}} style={{background:orderMode===m[0]?'var(--accent-a20)':'var(--bg)',color:orderMode===m[0]?'var(--accent-text)':t3,border:orderMode===m[0]?'1px solid var(--accent-a40)':'1px solid '+bd2,borderRadius:3,padding:'2px 6px',cursor:'pointer',fontSize: 11,fontWeight:700}}>{m[1]}</button>;
                    })}
                  </div>
                  <input autoComplete="off" value={orderCode} onChange={function(e){handleOrderCodeChange(e.target.value)}} onKeyDown={handleOrderCodeKey}
                    placeholder={t.typeOrderPlaceholder}
                    style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:4,padding:'5px 8px',color:'var(--accent-text)',fontSize: 14,fontWeight:600,fontFamily:'monospace',outline:'none',width:'100%',boxSizing:'border-box'}}/>
                  {orderSugg.length>0?(
                    <div style={{position:'absolute',left:10,right:10,top:'100%',background:'var(--panel-head)',border:'1px solid '+bd,borderRadius:6,zIndex:30,maxHeight:230,overflow:'auto',boxShadow:'0 8px 24px var(--shadow-50)'}}>
                      {orderSugg.map(function(d,i){
                        var isOrder=d.kind==='order';
                        return <div key={d.kind+'-'+d.id} onClick={function(){isOrder?addExamOrder(d):addDrugRx(d)}} style={{padding:'5px 10px',cursor:'pointer',display:'flex',gap:6,background:i===oSelIdx?'var(--accent-a20)':'transparent',borderBottom:'1px solid var(--border)'}}
                          onMouseEnter={function(){setOSelIdx(i)}}>
                          <span style={{fontSize: 11,color:isOrder?'var(--warn-text)':'var(--ok-text)',fontWeight:800,width:34}}>{isOrder?(d.pacs_modality||label(CODE_TYPE_KEY, d.code_type)||'ORD'):t.cs_badgeDrug}</span>
                          <span style={{fontFamily:'monospace',fontSize: 13,color:'var(--accent-text)',fontWeight:700,width:76,whiteSpace:'nowrap'}}>{d.code}</span>
                          <span style={{fontSize: 13,color:tx,flex:1}}>{d.name}{noPrice(isOrder ? (d.price_clinic || d.price) : d.unit_price) ? <NoPriceBadge/> : null}</span>
                          <span style={{fontSize: 12,color:isOrder?'var(--warn-text)':'var(--warn-ink)',fontWeight:600}}>{isOrder?(d.worklist_enabled?'WL':''):formLabel(t, d.dosage_form)}</span>
                          {/* Stock on hand, so two drugs of the same name (MED-0068 / 0069) can be told apart (pharmacy's request). */}
                          {!isOrder ? <span style={{fontSize: 12,color:(parseInt(d.stock_qty,10)||0)>0?t3:'var(--danger-text)',fontWeight:600,whiteSpace:'nowrap',minWidth:64,textAlign:'right'}}>{String(t.cs_stock||'').replace('{n}', parseInt(d.stock_qty,10)||0)}</span> : null}
                        </div>;
                      })}
                    </div>
                  ):(orderCode.trim().length>=2 ? (
                    // Two letters typed and nothing matches: say so, instead of showing nothing
                    // (the imported names are English - "syrup", not "sirop").
                    <div style={{position:'absolute',left:10,right:10,top:'100%',background:'var(--panel-head)',border:'1px solid '+bd,borderRadius:6,zIndex:30,padding:'7px 10px',fontSize:13,color:t2}}>{t.cs_noResults}</div>
                  ):null)}
                </div>
                <div style={{flex:1,overflow:'auto'}}>
                  {/* Fixed column widths (tableLayout 'fixed'): with automatic layout every
                      character typed could resize the columns, and the box under the cursor
                      moved - «QD» typed in Posologie once went into another box (integration
                      test, 2026-09-29). The name column takes what is left; the other widths
                      add up to 416px so the table fits the left panel at 1366 wide (574px)
                      without a sideways scroll. */}
                  <table style={{width:'100%',tableLayout:'fixed',borderCollapse:'collapse',fontSize: 15}}>
                    <thead><tr style={{background:'var(--chip)',position:'sticky',top:0}}>
                      <th style={{padding:'5px 2px',color:t3,fontSize: 12,width:22}}></th>
                      <th style={{padding:'5px 3px',textAlign:'left',color:t3,fontSize: 12,width:70}}>{t.code}</th>
                      <th style={{padding:'5px 4px',textAlign:'left',color:t3,fontSize: 12}}>{t.name}</th>
                      {/* One heading for both kinds of line (decision 29): a drug's daily total,
                          an order's quantity. Total = this column x days, for both (⑭). */}
                      {/* 11px and one line: «일총투여» at 12px is 48px of text in a 50px column with
                          4px of padding, so it broke after «일총투» (director, 2026-09-30). */}
                      <th title={t.cs_colDailyHint} style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 11,width:50,cursor:'help',whiteSpace:'nowrap'}}>{t.cs_colDaily}</th>
                      <th style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 12,width:40}}>{t.cs_colTimes}</th>
                      <th style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 12,width:44}}>{t.cs_colDays}</th>
                      <th style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 12,width:58}}>{t.cs_colSig}</th>
                      <th style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 12,width:54}}>{t.unit}</th>
                      <th style={{padding:'5px 2px',textAlign:'center',color:t3,fontSize: 12,width:78}}>{t.worklist}</th>
                    </tr></thead>
                    <tbody>
                      {rxList.map(function(rx){
                        var inStyle={background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:4,padding:'3px 4px',color:tx,fontSize:14,width:'100%',boxSizing:'border-box',textAlign:'center'};
                        // Dispensed: the pharmacy has handed it over and the server will
                        // refuse any change, so show the values as plain text, not inputs.
                        var done = rx.status==='dispensed';

                        return <tr key={'rx-'+rx.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                          <td style={{padding:'3px 5px'}}>{done
                            ? <span title={t.cs_rxLocked} style={{cursor:'help',fontSize: 12}}>🔒</span>
                            : <span onClick={function(){removeRx(rx)}} style={{cursor:'pointer',color:'var(--danger-text)',fontSize: 14}}>✕</span>}</td>
                          <td style={{padding:'3px 3px',color:'var(--accent-text)',fontFamily:'monospace',fontSize: 12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={rx.drug_code}>{rx.drug_code}</td>
                          <td style={{padding:'3px 4px',color:tx,fontSize: 15,overflowWrap:'anywhere'}}>{rx.drug_name}{authorTag(rx.prescribed_by_name)}{noDose(rx) ? <NoDoseBadge/> : null}{noPackQty(rx) ? <NoPackBadge/> : null}{rx.dispense_type!=='external' && noPrice(rx.unit_price) ? <NoPriceBadge/> : null}{rxLine(rx)}{isPack(rx) && !done ? packQtyBox(rx) : null}</td>
                          {done ? <>
                            {roCell(rx.dose, t2)}
                            {roCell(rx.frequency, t2)}
                            {roCell(rx.days, t2)}
                            {roCell(rx.route, t2)}
                            {roCell(rx.memo, t2)}
                          </> : <>
                            <td style={{padding:'3px 2px'}}><input value={showNum(rx.dose)} title={t.cs_doseHint} onChange={function(e){updateRxLocal(rx.id,'dose',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }} style={inStyle}/></td>
                            <td style={{padding:'3px 2px'}}><input inputMode="numeric" value={rx.frequency == null ? '' : rx.frequency} onChange={function(e){updateRxLocal(rx.id,'frequency',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }} style={inStyle}/></td>
                            <td style={{padding:'3px 2px'}}><input inputMode="numeric" value={rx.days == null ? '' : rx.days} onChange={function(e){updateRxLocal(rx.id,'days',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }} style={inStyle}/></td>
                            <td style={{padding:'3px 2px'}}><input value={rx.route || ''} onChange={function(e){updateRxLocal(rx.id,'route',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }} style={inStyle}/></td>
                            <td style={{padding:'3px 2px'}}><input value={rx.memo || ''} onChange={function(e){updateRxLocal(rx.id,'memo',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveRx(rx); }} style={inStyle}/></td>
                          </>}
                          <td style={{padding:'3px 2px',textAlign:'center',color:'var(--ok-text)',fontSize: 12,fontWeight:700}}>{done ? t.cs_dispensed : ''}</td>
                        </tr>;
                      })}
                      {orderItems.map(function(o){
                        var inStyle={background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:4,padding:'3px 4px',color:tx,fontSize:14,width:'100%',boxSizing:'border-box',textAlign:'center'};
                        // A cancelled order stays as a grey, struck-through record: no inputs
                        // (the server refuses changes), no ✕, the reason on hover.
                        var gone = o.status==='cancelled';
                        // No opacity on a cancelled row: it took the text below a readable contrast
                        // (2.0 dark, 2.3 light). The faint text colour and the strike-through say
                        // "record" well enough.
                        return <tr key={'oi-'+o.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                          <td style={{padding:'3px 5px'}}>{gone
                            ? <span title={cancelTitle(o)} style={{cursor:'help',fontSize: 12,color:t3}}>⊘</span>
                            : cancellable(o)
                            ? <span onClick={function(){cancelOrder(o)}} title={t.cs_cancelHint} style={{cursor:'pointer',color:'var(--danger-text)',fontSize: 14}}>✕</span>
                            : orderLocked(o)
                            ? <span title={t.cs_orderLocked} style={{cursor:'help',fontSize: 12}}>🔒</span>
                            : <span onClick={function(){removeOrder(o)}} style={{cursor:'pointer',color:'var(--danger-text)',fontSize: 14}}>✕</span>}</td>
                          <td style={{padding:'3px 3px',color:gone?t3:'var(--accent-text)',fontFamily:'monospace',fontSize: 12,fontWeight:700,textDecoration:gone?'line-through':'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={o.order_code}>{o.order_code}</td>
                          <td style={{padding:'3px 4px',color:gone?t3:tx,fontSize: 15,textDecoration:gone?'line-through':'none',overflowWrap:'anywhere'}}>{o.order_name}{authorTag(o.ordered_by_name)}{o.body_part ? <span style={{marginLeft:6,fontSize:12,color:t3,whiteSpace:'nowrap'}}>{o.body_part}</span> : null}{!gone && noPrice(o.unit_price) ? <NoPriceBadge/> : null}{orderTotalLine(o, gone)}</td>
                          {gone ? <>
                            {roCell(o.quantity == null ? 1 : o.quantity, t3)}
                            {roCell(o.frequency || 1, t3)}
                            {roCell(o.days || 1, t3)}
                            {roCell(o.dose, t3)}
                            {roCell(o.memo, t3)}
                          </> : <>
                          <td style={{padding:'3px 2px'}}><input value={o.quantity == null || o.quantity === '' ? '' : showNum(o.quantity)} onChange={function(e){updateOrderLocal(o.id,'quantity',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveOrder(o); }} style={inStyle}/></td>
                          <td style={{padding:'3px 2px'}}><input inputMode="numeric" value={o.frequency || 1} onChange={function(e){updateOrderLocal(o.id,'frequency',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveOrder(o); }} style={inStyle}/></td>
                          <td style={{padding:'3px 2px'}}><input inputMode="numeric" value={o.days || 1} onChange={function(e){updateOrderLocal(o.id,'days',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveOrder(o); }} style={inStyle}/></td>
                          <td style={{padding:'3px 2px'}}><input value={o.dose || ''} onChange={function(e){updateOrderLocal(o.id,'dose',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveOrder(o); }} style={inStyle}/></td>
                          <td style={{padding:'3px 2px'}}><input value={o.memo || ''} title={o.memo || undefined} onChange={function(e){updateOrderLocal(o.id,'memo',e.target.value)}} onBlur={function(e){ if(leftRow(e)) saveOrder(o); }} style={inStyle}/></td>
                          </>}
                          <td style={{padding:'3px 2px',textAlign:'center',fontSize: 12,fontWeight:700}}>
                            {(o.code_type==='imaging'||o.pacs_modality)?<button onClick={function(){openViewer(o.id)}} title={t.viewImage||'영상보기'} style={{background:'var(--violet-strong-a22)',color:'var(--violet-text)',border:'1px solid var(--violet-strong-a55)',borderRadius:4,padding:'1px 4px',cursor:'pointer',fontSize: 13,fontWeight:700,marginRight:3,verticalAlign:'middle'}}>🖼</button>:null}
                            {orderStatus(o)}
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ):<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-5)',fontSize: 16,fontStyle:'italic'}}>{t.cs_selectPatient}</div>}
        </div>

        {/* CENTER: Vitals + Note + Phrases */}
        {/* minWidth 0: a flex item otherwise grows to its content, and anything too wide
            in here pushed the column sideways (design session, 2026-09-29). */}
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-col)',borderRight:'1px solid '+bd}}>
          {pastView?renderPast():consult?(
            <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
              {/* Vitals */}
              <div style={{padding:'8px 10px',borderBottom:'1px solid '+bd,display:'flex',gap:10,alignItems:'stretch',background:scBg}}>
                {/* Two columns when there is room, one when the middle column is narrow (a
                    small screen): fixed at two, the boxes shrank to a sliver at 800px wide. 110px keeps two
                    columns at 1280 wide (a 383px middle column) and still fits "120/80". */}
                <div style={{flex:1,minWidth:0,display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))',gap:'6px 8px'}}>
                  {[
                    ['bp',t.cs_vBP,'??/??'],
                    ['temp',t.cs_vBT,'??.?'],
                    ['pulse',t.cs_vPR,'??'],
                    ['rr',t.cs_vRR,'??'],
                    ['spo2',t.cs_vSpO2,'??']
                  ].map(function(item){
                    return <div key={item[0]} style={{display:'grid',gridTemplateColumns:'40px minmax(0, 1fr)',alignItems:'center',gap:5}}>
                      <span style={{fontSize: 13,color:item[0]==='bp'?'var(--warn-ink)':t3,fontWeight:800}}>{item[1]}</span>
                      <input value={vt[item[0]]} onChange={function(e){uvt(item[0],e.target.value)}} placeholder={item[2]} style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'5px 4px',color:tx,fontSize: 15,width:'100%',textAlign:'center',fontFamily:'monospace',boxSizing:'border-box',outline:'none'}}/>
                    </div>;
                  })}
                  {consult.vitals_at ? <div style={{gridColumn:'1 / -1',fontSize:11,color:t3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {String(t.cs_vitalsBy||'').replace('{name}', consult.vitals_by_name||'?').replace('{time}', (ymd(consult.vitals_at)===ymd(new Date()) ? '' : ymd(consult.vitals_at)+' ') + hhmm(consult.vitals_at))}</div> : null}
                </div>
                <div style={{width:118,flexShrink:0,display:'flex',flexDirection:'column',gap:6,justifyContent:'center'}}>
                  <button onClick={saveNote} style={{background:'linear-gradient(135deg,var(--accent),var(--accent-strong))',color:'var(--on-fill)',border:'none',borderRadius:5,padding:'7px 10px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.save}</button>
                  <button onClick={completeConsult} style={{background:'var(--ok-a20)',color:'var(--ok-text)',border:'1px solid var(--ok-a40)',borderRadius:5,padding:'7px 10px',cursor:'pointer',fontSize: 14,fontWeight:800}}>{t.completed}</button>
                </div>
              </div>
              {/* Note */}
              <div style={{padding:'4px 10px',background:scBg,borderBottom:'1px solid '+bd}}>
                <span style={{fontWeight:700,fontSize: 13,color:tx}}>{t.cs_noteMineTitle}</span>
                {note !== mineSaved ? <span style={{marginLeft:8,fontSize:12,fontWeight:700,color:'var(--warn-text)'}}>● {t.cs_noteUnsaved}</span> : null}
                {draftBack ? <div style={{fontSize:12,color:'var(--warn-text)'}}>{t.cs_noteDraftBack}</div> : null}
              </div>
              <div style={{flex:1,padding:'6px 10px',minHeight:0}}>
                <textarea ref={noteBoxRef} value={note} onChange={function(e){setNote(e.target.value)}} placeholder={t.cs_notePlaceholder}
                  style={{width:'100%',height:'100%',background:'var(--field-3)',border:'1px solid var(--field-border)',borderRadius:5,padding:'8px 10px',color:tx,fontSize: 14,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box',lineHeight:1.7}}/>
              </div>
              {/* Phrase dict */}
              <div style={{borderTop:'1px solid '+bd,height:'30%',minHeight:100,display:'flex',flexDirection:'column'}}>
                {/* The title, the category buttons and the search box wrap onto a second line
                    when the column is narrow. On one line they were ~546px in a 409px column
                    at 1366 wide (French): focusing the search box scrolled the whole middle
                    column sideways and cut the vital signs and the note on the left. */}
                <div style={{padding:'4px 10px',background:scBg,borderBottom:'1px solid '+bd,display:'flex',flexWrap:'wrap',alignItems:'center',gap:'3px 4px'}}>
                  <span style={{fontWeight:700,fontSize: 13,color:'var(--warn-ink)',whiteSpace:'nowrap'}}>{t.phraseDict}</span>
                  {phraseCats.map(function(c){
                    return <button key={c} onClick={function(){setPhraseCat(c)}} style={{background:phraseCat===c?'var(--warn-a20)':'transparent',color:phraseCat===c?'var(--warn-text)':t3,border:'none',borderRadius:3,padding:'1px 5px',cursor:'pointer',fontSize: 11,fontWeight:600,whiteSpace:'nowrap'}}>{label(PHRASE_CAT_KEY, c)}</button>;
                  })}
                  <input autoComplete="off" value={phraseQ} onChange={function(e){setPhraseQ(e.target.value)}} placeholder={t.search} style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:3,padding:'2px 6px',color:tx,fontSize: 12,outline:'none',marginLeft:'auto',flex:'1 1 100px',minWidth:90,maxWidth:160,boxSizing:'border-box'}}/>
                </div>
                <div style={{flex:1,overflow:'auto'}}>
                  {filteredPhrases.map(function(p){
                    return <div key={p.id} onClick={function(){insertPhrase(phraseText(p))}} style={{padding:'4px 10px',cursor:'pointer',borderBottom:'1px solid var(--line-soft)',display:'flex',gap:6}}
                      onMouseEnter={function(e){e.currentTarget.style.background='var(--hover-row)'}}
                      onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                      <span style={{background:'var(--warn-a20)',color:'var(--warn-text)',borderRadius:2,padding:'0 4px',fontSize: 11,fontWeight:600,flexShrink:0}}>{label(PHRASE_CAT_KEY, p.category)}</span>
                      <span style={{fontSize: 13,color:'var(--text-soft)'}}>{phraseText(p)}</span>
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
            <button onClick={function(){setRightTab('past')}} style={{flex:1,background:rightTab==='past'?'var(--accent-a18)':'transparent',color:rightTab==='past'?'var(--accent-text)':t3,border:'none',borderBottom:rightTab==='past'?'2px solid var(--accent-ink)':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:13,fontWeight:800}}>{t.patientChart}</button>
            <button onClick={function(){setRightTab('sets')}} style={{flex:1,background:rightTab==='sets'?'var(--ok-a18)':'transparent',color:rightTab==='sets'?'var(--ok-text)':t3,border:'none',borderBottom:rightTab==='sets'?'2px solid var(--ok-ink)':'2px solid transparent',padding:'8px 6px',cursor:'pointer',fontSize:13,fontWeight:800}}>{t.orderSets}</button>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'6px 8px'}}>
            {rightTab==='past'?(
              sel?(<>
                {consult ? <div style={{background:'var(--accent-a12)',borderRadius:5,padding:'8px 10px',marginBottom:6,border:'1px solid var(--accent-a40)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontFamily:'monospace',fontSize: 13,color:'var(--accent-text)',fontWeight:700}}>{ymd(sel.visit_date || consult.consult_date)}</span>
                    {/* "Today" only for a visit of today (the server's date when it was opened, and
                        this PC's date not having changed since); otherwise "This visit" - an
                        earlier day's visit opened from the visit list was headed "Today". */}
                    {/* The date alone (director, 2026-10-01): no «today» / «this visit» word beside it. */}
                    {/* Whose chart: department and the doctor the visit was registered with
                        (director, 2026-09-30 - «GEN» alone did not say which chart). */}
                    {/* No doctor on the visit: the account that opened the consultation, the same
                        fallback as the earlier visits below (GET /patients/:id/history), so today's
                        header does not change name once it becomes an earlier visit. */}
                    <span style={{fontSize: 12,color:t2}}>{[sel.dept_code, sel.doctor_name || consult.opened_by_name].filter(Boolean).join(' ')}</span>
                  </div>
                  {notesBlock(notes, false, true)}
                </div> : null}
                {history.length>0?history.map(function(h,i){
                var active = pastView && pastView.c && pastView.c.id===h.id;
                return <div key={i} onClick={function(){openPast(h)}} style={{background:active?'var(--accent-a15)':scBg,borderRadius:5,padding:'8px 10px',marginBottom:6,border:'1px solid '+(active?'var(--accent-a50)':bd),borderLeft:active?'3px solid var(--accent-ink)':'3px solid transparent',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontFamily:'monospace',fontSize: 13,color:'var(--accent-text)',fontWeight:700}}>{h.consult_date?h.consult_date.split('T')[0]:''}</span>
                    <span style={{fontSize: 12,color:t2}}>{[h.dept_code, h.doctor_name].filter(Boolean).join(' ')}</span>
                  </div>
                  {notesBlock(h.notes, true)}
                </div>;
              }):<div style={{padding:'12px 10px',textAlign:'center',color:'var(--text-5)',fontSize: 13,fontStyle:'italic'}}>{t.cs_noPastVisit}</div>}
            </>):<div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize: 14,fontStyle:'italic'}}>{t.cs_selectPatient}</div>
            ):(
              orderSets.length>0?osGrouped().map(function(grp,gi){
                var gkey = grp.group||'\u0000';
                var open = !!expGroups[gkey];
                return <div key={gi} style={{marginBottom:6}}>
                  <div className="pressable" onClick={function(){toggleGroup(gkey)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 8px',cursor:'pointer',background:'var(--panel-head)',borderRadius:5,border:'1px solid '+bd}}>
                    <span style={{fontSize:11,color:t2,width:10}}>{open?'\u25be':'\u25b8'}</span>
                    <span style={{fontSize:13}}>📁</span>
                    <span style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>{grp.group||t.ungrouped}</span>
                    <span style={{fontSize:11,color:t3,marginLeft:'auto'}}>{grp.sets.length}</span>
                  </div>
                  {open?<div style={{padding:'4px 0 2px 10px'}}>
                    {grp.sets.map(function(s){
                      return <div key={s.id} className="pressable" onClick={function(){applySet(s)}} title={t.applySetHint} style={{background:scBg,borderRadius:5,padding:'7px 9px',marginBottom:5,border:'1px solid '+bd,borderLeft:'3px solid var(--ok-ink)',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:800,color:'var(--ok-text)'}}>{s.name}</span>
                          {s.dept_code?<span style={{fontSize:11,color:t2}}>{s.dept_code}</span>:null}
                          <span style={{fontSize:11,color:t3,marginLeft:'auto'}}>{(s.items||[]).length} {t.itemsUnit}</span>
                        </div>
                        <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.5,whiteSpace:'pre-wrap',maxHeight:38,overflow:'hidden'}}>{(s.items||[]).length ? (s.items||[]).map(function(it, k){
                          var hidden = it.kind!=='order' && it.drug_active===false;
                          return <span key={k} title={hidden ? t.cs_setHiddenDrug : undefined} style={hidden ? {textDecoration:'line-through',color:'var(--text-4)'} : null}>{(k ? ', ' : '')+it.code}</span>;
                        }) : '\u2014'}</div>
                      </div>;
                    })}
                  </div>:null}
                </div>;
              }):<div style={{padding:20,textAlign:'center',color:'var(--text-5)',fontSize: 14,fontStyle:'italic'}}>{t.noOrderSets}</div>
            )}
          </div>
        </div>
      </div>

      {/* Drug search modal */}
      {drugModal?(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'var(--scrim)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'var(--panel-head)',borderRadius:10,border:'1px solid '+bd,width:500,maxHeight:'70vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px var(--shadow-50)'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid '+bd,display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,fontSize: 15,color:tx}}>{t.drugSearch}</span>
              <button onClick={function(){setDrugModal(false);setDrugQ('')}} style={{background:'transparent',border:'none',color:t2,cursor:'pointer',fontSize: 18}}>✕</button>
            </div>
            <div style={{padding:'8px 14px',borderBottom:'1px solid '+bd}}>
              <input autoComplete="off" value={drugQ} onChange={function(e){setDrugQ(e.target.value)}} placeholder={t.search} autoFocus style={{background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'7px 10px',color:tx,fontSize: 14,outline:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div style={{flex:1,overflow:'auto',maxHeight:300}}>
              {drugQ && drugResults.length===0 ? <div style={{padding:'10px 14px',fontSize:13,color:t2}}>{t.cs_noResults}</div> : null}
              {drugResults.map(function(d){
                return <div key={d.id} onClick={function(){addDrugRx(d);setDrugModal(false);setDrugQ('')}} style={{padding:'7px 14px',cursor:'pointer',borderBottom:'1px solid var(--line-soft)',display:'flex',gap:8}}
                  onMouseEnter={function(e){e.currentTarget.style.background='var(--hover-row-2)'}}
                  onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                  <span style={{fontFamily:'monospace',fontSize: 13,color:'var(--accent-text)',fontWeight:600,width:76,whiteSpace:'nowrap'}}>{d.code}</span>
                  <span style={{fontSize: 14,color:tx,flex:1}}>{d.name}</span>
                  <span style={{fontSize: 12,color:'var(--warn-ink)',fontWeight:600}}>{formLabel(t, d.dosage_form)}</span>
                  <span style={{fontSize: 12,color:(parseInt(d.stock_qty,10)||0)>0?t3:'var(--danger-text)',fontWeight:600,whiteSpace:'nowrap',minWidth:64,textAlign:'right'}}>{String(t.cs_stock||'').replace('{n}', parseInt(d.stock_qty,10)||0)}</span>
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
        <div onClick={function(){setLabOpen(false)}} style={{position:'fixed',inset:0,background:'var(--scrim)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'90vw',height:'88vh',background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid var(--border-2)',background:'var(--panel-head)'}}>
              <span style={{fontWeight:800,fontSize:15,color:'var(--cyan-text)'}}>🧪 {t.labResultsTitle||'검사결과'}</span>
              <span style={{color:'var(--text-2)',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setLabOpen(false)}} style={{marginLeft:'auto',background:'var(--btn-neutral-2)',color:'var(--text)',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><LabResults patientId={sel.patient_id} /></div>
          </div>
        </div>
      ) : null}
      {viewer ? (
        <div onClick={function(){setViewer(null)}} style={{position:'fixed',inset:0,background:'var(--scrim-70)',zIndex:1001,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'94vw',height:'92vh',background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid var(--border-2)',background:'var(--panel-head)'}}>
              <span style={{fontWeight:800,fontSize:15,color:'var(--violet-text)'}}>🖼 {t.imageViewer||'영상 뷰어'}</span>
              <span style={{color:'var(--text-soft)',fontSize:14,fontWeight:700}}>{viewer.order_name}</span>
              {sel?<span style={{color:'var(--text-2)',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>:null}
              {viewer.url?<a href={viewer.url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',background:'var(--chip)',color:'var(--violet-text)',border:'1px solid var(--border-2)',borderRadius:5,padding:'6px 12px',cursor:'pointer',fontSize:13,fontWeight:700,textDecoration:'none'}}>{t.openNewTab||'새 탭에서 열기'} ↗</a>:<div style={{marginLeft:'auto'}}></div>}
              <button onClick={function(){setViewer(null)}} style={{background:'var(--btn-neutral-2)',color:'var(--text)',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            {/* What the arrived images say about the patient (viewer-url -> images): red when
                they name another patient, amber when they name nobody. PACS's component. */}
            <PatientCheck images={viewer.images} t={t} style={{margin:'8px 14px 0'}} />
            {/* The device gave the images its own study number and the bridge linked them by
                accession number - a weaker link. The list (RadiologyReadings) says so; the
                viewer now says it too (imaging-day test 2026-09-30). */}
            {viewer.images && viewer.images.linked_by==='accession' ? <div style={{margin:'6px 14px 0',fontSize:12,color:'var(--warn-text)'}}>{t.px_linkedByAccession}</div> : null}
            {viewer.cancelled ? <div style={{margin:'8px 14px 0',padding:'7px 12px',borderRadius:6,background:'var(--notice)',border:'1px solid var(--notice-line)',color:'var(--text-soft)',fontSize:13,fontWeight:700}}>
              ⊘ {t.px_cancelledViewer}{viewer.cancel_reason ? <span style={{fontWeight:400,color:t2}}>{' — '+(t.px_cancelReason||'')+' : '+viewer.cancel_reason}</span> : null}
            </div> : null}
            <div style={{flex:1,display:'flex',overflow:'hidden'}}>
              {viewer.url
                ? <iframe src={viewer.url} title="PACS Viewer" style={{flex:1,border:0,background:'#000'}}></iframe>
                : <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--viewer-text)',fontSize:14,textAlign:'center',padding:20,background:'#000'}}>{viewer.has_viewer && viewer.no_study ? t.px_noStudy : (t.noViewerUrl||'PACS 뷰어 주소가 설정되지 않았습니다 (설정 → 오더연동 → PACS 웹/뷰어 주소). 영상 없이 판독만 입력할 수 있습니다.')}</div>}
              <div style={{width:380,borderLeft:'1px solid var(--border-2)',background:'var(--bg-col)',display:'flex',flexDirection:'column',padding:12,boxSizing:'border-box'}}>
                <div style={{fontWeight:800,fontSize:15,color:'var(--violet-text)',marginBottom:6}}>🩻 {t.reading||'판독소견'}</div>
                {viewer.reading&&viewer.reading.result_at?<div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{t.lastReadBy||'판독'}: {viewer.reading.result_by_name||''} · {ymd(viewer.reading.result_at)}</div>:null}
                {canRead && !viewer.cancelled ? <>
                  <textarea value={readText} onChange={function(e){setReadText(e.target.value)}} placeholder={t.readingPlaceholder||'판독 소견을 입력하세요...'} style={{flex:1,background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:6,color:'var(--text)',fontSize:14,padding:10,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.6}}/>
                  <button onClick={saveReading} style={{marginTop:10,background:'linear-gradient(135deg,var(--ok),var(--ok-strong))',color:'var(--on-fill)',border:'none',borderRadius:6,padding:'9px',cursor:'pointer',fontSize:14,fontWeight:800}}>💾 {t.saveReading||'판독 저장'}</button>
                </> : <div style={{flex:1,whiteSpace:'pre-wrap',fontSize:14,color:'var(--text-soft)',lineHeight:1.6,overflow:'auto'}}>{readText||<span style={{color:'var(--text-4)'}}>{t.noReading||'판독 소견 없음'}</span>}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {transfer && sel ? (function(){
        var tr = transfer;
        // Every active doctor, "GEN – Dr. Grace": the visit's department's doctors first, then
        // doctors with no department, then the others by department - ordered by the visit,
        // so the list does not move while choosing.
        var visitDept = sel.department_id ? String(sel.department_id) : '';
        var rank = function(d){ return d.department_id && String(d.department_id)===visitDept ? 0 : !d.department_id ? 1 : 2; };
        var docs = tr.doctors.slice().sort(function(a, b){
          return rank(a) - rank(b) || String(a.dept_code||'').localeCompare(String(b.dept_code||'')) || String(a.name||'').localeCompare(String(b.name||''));
        });
        var doc = tr.doctors.filter(function(d){ return String(d.id)===tr.doctor; })[0];
        var picked = !!doc && tr.doctor !== (sel.doctor_id ? String(sel.doctor_id) : '');
        // The department follows the doctor; said in a line when it changes. A doctor with
        // no department on a visit with none has no department to send (the server needs
        // one): Change stays off and the line says where to set it.
        var newDept = transferDept(doc);
        var deptMoves = picked && doc.department_id && String(doc.department_id) !== visitDept;
        var noDept = picked && !newDept;
        var fld = {width:'100%',boxSizing:'border-box',background:'var(--field)',border:'1px solid var(--field-border)',borderRadius:5,padding:'6px 8px',color:'var(--text)',fontSize:14,fontFamily:'inherit'};
        var lab = {display:'block',fontSize:12,fontWeight:700,color:'var(--text-3)',margin:'10px 0 3px'};
        var ok = picked && !noDept;
        return <div onClick={function(){ if(!tr.busy) setTransfer(null); }} style={{position:'fixed',inset:0,background:'var(--scrim)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div role="dialog" aria-label={t.cs_trTitle} onClick={function(e){e.stopPropagation()}} style={{width:420,maxWidth:'92vw',background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:8,padding:'14px 16px'}}>
            <div style={{fontWeight:800,fontSize:15,color:'var(--text)'}}>⇄ {t.cs_trTitle}</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginTop:4}}>{sel.chart_no} · {sel.last_name} {sel.first_name} — {[sel.dept_code, sel.doctor_name].filter(Boolean).join(' ') || '\u2014'}</div>
            <label style={lab}>{t.cs_trDoctor}</label>
            <select value={tr.doctor} disabled={tr.busy} onChange={function(e){ var dv = e.target.value; setTransfer(function(p){ return Object.assign({}, p, { doctor: dv }); }); }} style={fld}>
              {!tr.doctor ? <option value="">{'\u2014'}</option> : null}
              {docs.map(function(d){ return <option key={d.id} value={String(d.id)}>{(d.dept_code ? d.dept_code + ' – ' : '') + d.name}</option>; })}
            </select>
            {deptMoves ? <div style={{fontSize:13,fontWeight:700,color:'var(--accent-text)',marginTop:6}}>{String(t.cs_trDeptFollows||'').replace('{from}', sel.dept_code || '\u2014').replace('{to}', doc.dept_code || '')}</div> : null}
            {noDept ? <div style={{fontSize:13,fontWeight:700,color:'var(--warn-text)',marginTop:6}}>{t.cs_trNoDept}</div> : null}
            <label style={lab}>{t.cs_trReason}</label>
            <input value={tr.reason} disabled={tr.busy} maxLength={200} onChange={function(e){ var rv = e.target.value; setTransfer(function(p){ return Object.assign({}, p, { reason: rv }); }); }} style={fld}/>
            <div style={{fontSize:12,color:'var(--text-3)',marginTop:10,lineHeight:1.5}}>{t.cs_trKeep}</div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
              <button onClick={function(){ setTransfer(null); }} disabled={tr.busy} style={{background:'var(--btn-neutral-2)',color:'var(--text)',border:'none',borderRadius:5,padding:'7px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.cancel}</button>
              <button onClick={doTransfer} disabled={!ok || tr.busy} style={{background:ok?'linear-gradient(135deg,var(--accent),var(--accent-strong))':'var(--btn-neutral-2)',color:ok?'var(--on-fill)':'var(--text-3)',border:'none',borderRadius:5,padding:'7px 14px',cursor:ok&&!tr.busy?'pointer':'default',fontSize:13,fontWeight:800}}>{t.cs_trConfirm}</button>
            </div>
          </div>
        </div>;
      })() : null}
      {toast ? <div role="status" style={{position:'fixed',left:'50%',bottom:24,transform:'translateX(-50%)',background:'var(--toast-bg)',color:'var(--toast-text)',border:'1px solid var(--toast-line)',boxShadow:'var(--toast-shadow)',borderRadius:6,padding:'10px 18px',fontSize:14,fontWeight:700,zIndex:1100}}>{toast}</div> : null}
      {readingsOpen && sel ? (
        <div onClick={function(){setReadingsOpen(false)}} style={{position:'fixed',inset:0,background:'var(--scrim)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{width:'88vw',height:'86vh',background:'var(--bg)',border:'1px solid var(--border-2)',borderRadius:8,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:'1px solid var(--border-2)',background:'var(--panel-head)'}}>
              <span style={{fontWeight:800,fontSize:15,color:'var(--violet-text)'}}>🩻 {t.reading||'판독소견'}</span>
              <span style={{color:'var(--text-2)',fontSize:13}}>{sel.chart_no} · {sel.last_name} {sel.first_name}</span>
              <button onClick={function(){setReadingsOpen(false)}} style={{marginLeft:'auto',background:'var(--btn-neutral-2)',color:'var(--text)',border:'none',borderRadius:5,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>{t.close||'닫기'} ✕</button>
            </div>
            <div style={{flex:1,overflow:'hidden'}}><RadiologyReadings patientId={sel.patient_id} onOpen={function(oid){ setReadingsOpen(false); openViewer(oid); }} /></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
