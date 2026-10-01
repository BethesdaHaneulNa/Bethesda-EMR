import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '../components/TopBar.jsx';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { PatientChart } from '../components/PatientChart.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
import { storedTotal, hasTotal, perDose, fmtAmount, isLegacyTotal, isPack, packWord, missingTimes } from '../documents/rx-dosing.js';
import { PharmacyStock } from './PharmacyStock.jsx';
import { PAGE_COLS, TOOL_ROW, toolBtn, tabBtn, LIST_SEARCH_WRAP, LIST_SEARCH, ROW_PAD, ROW_NAME, ROW_SUB, ROW_NOTE, ROW_EMPTY, rowTag, EMPTY_ICON, EMPTY_TEXT, EMPTY_SUB, SIDE_HEAD } from '../layout.js';

// Thousands: 12,300 in Korean and English, 12 300 in French (integration test C).
function fmt(n, lang){ return Math.round(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? ' ' : ','); }
function patientName(v){ return ((v.last_name||'') + ' ' + (v.first_name||'')).trim(); }
function timeText(v, locale){
  var raw = v.consultation_time || v.dispensed_at || v.visit_date;
  if(!raw) return '';
  try { return new Date(raw).toLocaleString(locale || 'en-GB', { hour12:false }); } catch(e){ return raw; }
}
function isExternal(rx){ return rx.dispense_type === 'external'; }
// '{ago}' style placeholders in a translated sentence, so word order can differ per language.
function fill(s, v){ return String(s || '').replace(/\{(\w+)\}/g, function(m, k){ return v[k] != null ? v[k] : m; }); }

// The queue refreshes itself this often while the screen is visible.
var AUTO_REFRESH_MS = 30000;

// Exact error texts from pharmacy.routes.js. The API client passes on only the
// message, so matching it is how a known refusal becomes a translated one.
var ERR_NOTHING_PENDING = 'No pending prescriptions for this consultation';
var ERR_TYPE_LOCKED = 'Prescription already dispensed; dispense type can no longer change';
var ERR_TOO_OLD = 'Prescription too old to dispense here; the doctor must prescribe again';

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
  // The day's queue shows today only (decision M3). A patient found through the
  // search brings their own waiting prescriptions from the last few days with them:
  // { pid, name, days, groups, older } - see GET /pharmacy/patient/:id/pending.
  var pps = useState(null), past = pps[0], setPast = pps[1];
  // Work date (2026-10-01, the director: the same on every desk - as on the reception and
  // payment screens). The two lists show one day, today by default: waiting = that day's
  // visits with something still to hand out, dispensed = what was handed out that day.
  // "Today" comes from the server (GET /pharmacy/day), never the PC's clock. While the
  // screen follows today a reload after midnight moves on; a date staff picked stays put.
  // Nothing else changes: a dispense done while a past date is shown is stamped now (stock
  // record, dispensed_at), and the server's limit on old prescriptions still applies.
  var wds = useState(''), workDate = wds[0], setWorkDate = wds[1];
  var tds = useState(''), serverToday = tds[0], setServerToday = tds[1];
  var pds = useState(0), pastDays = pds[0], setPastDays = pds[1];
  var workRef = useRef({ date: '', follow: true });
  var viewingPast = !!(workDate && serverToday && workDate < serverToday);
  function chooseWorkDate(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))) return;
    if(serverToday && date > serverToday) date = serverToday;   // no visit is ahead of today
    workRef.current = { date: date, follow: date === serverToday };
    setWorkDate(date);
    setSel(null);   // a patient of the other day is not left open
    loadData();
  }
  function shiftWorkDate(days){
    var d = new Date((workDate || serverToday) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    chooseWorkDate(d.toLocaleDateString('en-CA'));
  }
  // Today from the server, then the two lists of the work date.
  async function fetchLists(){
    var day = await api.get('/pharmacy/day');
    var today = (day && day.today) || '';
    if(workRef.current.follow || !workRef.current.date) workRef.current = { date: today, follow: true };
    var wd = workRef.current.date;
    var qs = wd ? '?date=' + wd : '';
    var p = await api.get('/pharmacy/pending' + qs);
    var c = await api.get('/pharmacy/completed' + qs);
    return { today: today, pastDays: (day && day.past_days) || 0, wd: wd, p: p, c: c };
  }
  // Read by the auto-refresh timer, which is set up once and would otherwise
  // only ever see the state of the first render.
  var live = useRef({});
  live.current = { tab: tab, sel: sel, busy: busy, loading: loading, docOpen: docOpen, chartViewOpen: chartViewOpen, phFinderOpen: phFinderOpen, past: past };
  var switching = useRef(0); // in-house/outside switches still on their way to the server

  // 처방을 원내(internal)/원외(external)로 지정
  // The list rows are updated as well as the open patient: clicking another
  // patient and back re-selects from the list, which otherwise still held the
  // old value and showed the switch as if it had not been pressed.
  async function setDispenseType(rxId, type){
    function withType(group){
      var n = Object.assign({}, group);
      n.prescriptions = (group.prescriptions||[]).map(function(rx){ return rx.id===rxId ? Object.assign({}, rx, { dispense_type: type }) : rx; });
      return n;
    }
    switching.current++;
    try {
      await api.put('/pharmacy/prescription/'+rxId+'/dispense-type', { dispense_type: type });
      setSel(function(prev){ return prev ? withType(prev) : prev; });
      function inGroups(list){
        return list.map(function(g){
          return (g.prescriptions||[]).some(function(rx){ return rx.id===rxId; }) ? withType(g) : g;
        });
      }
      setPending(inGroups);
      setPast(function(prev){ return prev ? Object.assign({}, prev, { groups: inGroups(prev.groups) }) : prev; });
    } catch(err){
      if(err.message === ERR_TYPE_LOCKED){ alert(t.ph_typeLocked); switching.current--; await loadData(); return; }
      alert('Error: '+err.message);
    }
    switching.current--;
  }

  useEffect(function(){ loadData(); }, []);

  async function fetchPast(pid){
    var r = await api.get('/pharmacy/patient/' + pid + '/pending');
    return { groups: (r && r.groups) || [], older: (r && r.older) || 0, days: (r && r.days) || 0 };
  }

  // Patient search: open their waiting prescription straight away when there is
  // one, list them when there are several, and fall back to the chart alone.
  async function pickPatient(p){
    setViewPid(p.id);
    setTab('pending');
    try {
      var r = await fetchPast(p.id);
      setPast({ pid: p.id, name: patientName(p), days: r.days, groups: r.groups, older: r.older });
      setSel(r.groups.length === 1 ? r.groups[0] : null);
    } catch(err){
      setPast(null); setSel(null);
      alert('Error: ' + err.message);
    }
  }
  // Keyed on the patient, not the selection object: the auto-refresh hands back a
  // fresh object for the same patient every 30 seconds.
  var selPid = sel ? sel.patient_id : null;
  useEffect(function(){
    if(!selPid){ setRecentRx([]); return; }
    api.get('/pharmacy/patient/'+selPid+'/recent-rx').then(function(r){ setRecentRx(r||[]); }).catch(function(){ setRecentRx([]); });
  }, [selPid]);

  // New patients reach the queue as doctors finish, and nobody thought to press
  // Refresh. This reloads quietly - no loading text, no error pop-ups, the search
  // box and the open patient left alone - and stands aside whenever reloading
  // could get in the way: while a dispense or a switch is being saved, while a
  // document, chart or patient search window is open (its fields would be reset
  // under the pharmacist), and while the browser tab is hidden.
  async function refreshQuiet(){
    var s = live.current;
    if(document.hidden || s.busy || s.loading || switching.current || s.docOpen || s.chartViewOpen || s.phFinderOpen) return;
    try {
      var L = await fetchLists();
      var p = L.p, c = L.c;
      var pastNow = s.past ? await fetchPast(s.past.pid) : null;
      var now = live.current; // may have changed while we waited
      if(now.busy || now.loading || switching.current) return;
      if(workRef.current.date !== L.wd) return;   // the date was changed meanwhile: that load owns the lists
      setServerToday(L.today); setPastDays(L.pastDays); setWorkDate(L.wd);
      setPending(p); setCompleted(c);
      if(pastNow && now.past && now.past.pid === s.past.pid) setPast(Object.assign({}, now.past, pastNow));
      if(now.sel){
        var pool = now.tab === 'pending' ? p.concat(pastNow ? pastNow.groups : []) : c;
        var next = pool.find(function(x){ return x.consultation_id === now.sel.consultation_id; });
        // If the open patient has left the queue it stays on screen, with a notice,
        // rather than vanishing mid-read; see selGone below.
        if(next) setSel(next);
      }
    } catch(e){ /* quiet: the next tick or the Refresh button will say if it persists */ }
  }
  useEffect(function(){
    var id = setInterval(refreshQuiet, AUTO_REFRESH_MS);
    function onVisible(){ if(!document.hidden) refreshQuiet(); }
    document.addEventListener('visibilitychange', onVisible);
    return function(){ clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

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
      var L = await fetchLists();
      var p = L.p, c = L.c;
      var cur = live.current;
      var pastNow = cur.past ? await fetchPast(cur.past.pid) : null;
      // the date may have been changed while this was read: the later load owns the lists
      if(workRef.current.date === L.wd){
        setServerToday(L.today); setPastDays(L.pastDays); setWorkDate(L.wd);
        setPending(p); setCompleted(c);
        if(pastNow) setPast(Object.assign({}, cur.past, pastNow));
        if(cur.sel){
          var pool = cur.tab === 'pending' ? p.concat(pastNow ? pastNow.groups : []) : c;
          var next = pool.find(function(x){ return x.consultation_id === cur.sel.consultation_id; });
          setSel(next || null);
        }
      }
    } catch(err){ alert('Error: ' + err.message); }
    setLoading(false);
  }

  // Older than the server allows to be dispensed (PAST_RX_DAYS): with the work date such
  // a prescription can be looked at, so the screen says it cannot be handed out instead
  // of letting the button fail.
  var tooOld = !!(sel && tab === 'pending' && pastDays > 0 && Number(sel.days_ago) > pastDays);

  async function dispense(){
    if(!sel || busy || tooOld) return;
    // A line with no stored total takes nothing off the shelf (the server reads the
    // total, it does not work one out), so say so before the pharmacist confirms.
    var unquantified = (sel.prescriptions||[]).filter(function(rx){ return !isExternal(rx) && !hasTotal(rx); });
    // A whole sentence per language, so the word order is right (« Terminer la
    // délivrance pour RAKOTO Jean ? », integration test C).
    var ask = fill(t.ph_dispenseConfirm, { name: patientName(sel) });
    if(unquantified.length) ask = t.ph_noTotalConfirm + '\n' + unquantified.map(function(rx){ return '· ' + rx.drug_name; }).join('\n') + '\n\n' + ask;
    if(!window.confirm(ask)) return;
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
    } catch(err){
      if(err.message === ERR_TOO_OLD){
        alert(fill(t.ph_tooOld, { n: pastDays || (past ? past.days : '') }));
        await loadData();
        setSel(null);
      } else if(err.message === ERR_NOTHING_PENDING){
        // Someone else finished this patient first. Stock was taken once, by them.
        alert(t.ph_alreadyDispensed);
        await loadData();
        setSel(null);
      } else {
        alert('Error: ' + err.message);
      }
    }
    setBusy(false);
  }

  var activeList = tab === 'pending' ? pending : completed;
  // The open patient is no longer waiting - usually someone else dispensed them.
  var selGone = !!(sel && tab === 'pending' && !loading
    && !pending.some(function(g){ return g.consultation_id === sel.consultation_id; })
    && !(past && past.groups.some(function(g){ return g.consultation_id === sel.consultation_id; })));
  function pastBadge(v){
    return v && Number(v.days_ago) > 0 ? fill(t.ph_pastRx, { n: v.days_ago, date: v.visit_date }) : '';
  }
  // The search box over the list works as the lab's does (director, 2026-10-01: alike
  // where alike reads better): it only narrows the list on screen - the work date's list
  // of the chosen tab - by patient name, chart number or drug; spaces around the text are
  // ignored and the two names match in either order. The tabs' numbers stay the whole
  // day's, and the text stays when the tab or the work date changes.
  var filtered = useMemo(function(){
    var s = q.trim().toLowerCase();
    if(!s) return activeList;
    return activeList.filter(function(v){
      var name = (patientName(v) + ' ' + (v.first_name || '') + ' ' + (v.last_name || '')).toLowerCase();   // either order of the two names
      var chart = (v.chart_no || '').toLowerCase();
      var drugs = (v.prescriptions || []).map(function(r){ return (r.drug_name || '') + ' ' + (r.drug_code || ''); }).join(' ').toLowerCase();
      return name.indexOf(s) >= 0 || chart.indexOf(s) >= 0 || drugs.indexOf(s) >= 0;
    });
  }, [activeList, q]);

  // Outside-pharmacy lines are not billed here (billing.routes.js leaves them
  // out), so leaving them in made this figure disagree with the cashier's.
  // Only stored totals count: the consultation screen works the total out (daily
  // total x days) and that figure is what is billed and what leaves the shelf.
  var totalDrug = (sel && sel.prescriptions ? sel.prescriptions : []).reduce(function(sum, rx){
    var q = storedTotal(rx);
    return isExternal(rx) || q === null ? sum : sum + q * (parseFloat(rx.unit_price) || 0);
  }, 0);
  var anyUnquantified = (sel && sel.prescriptions ? sel.prescriptions : []).some(function(rx){ return !isExternal(rx) && !hasTotal(rx); });
  // Fixed shares (minmax(0, ...)): with plain fr a column is never narrower than its
  // longest word, and each row is its own grid - so on a 1366 laptop « Dose/prise » and
  // « Posologie » squeezed the drug name to 117px and rows did not line up with the head.
  var RX_COLS = 'minmax(0,1.9fr) minmax(0,.8fr) minmax(0,.85fr) minmax(0,.5fr) minmax(0,.5fr) minmax(0,.8fr) minmax(0,.85fr) minmax(0,.8fr)';

  var bd='var(--border)', bd2='var(--border-2)', scBg='var(--panel-head)', pn='var(--panel)', tx='var(--text)', t2='var(--text-2)', t3='var(--text-3)';
  var green='var(--ok)', violet='var(--violet)';

  function rxCard(v, where){
    var active = sel && sel.consultation_id === v.consultation_id;
    var badge = pastBadge(v);
    return <div key={where + v.consultation_id} onClick={function(){setSel(v);}} style={{ padding:ROW_PAD, borderBottom:'1px solid var(--line-soft)', cursor:'pointer', background:active?'var(--violet-a15)':'transparent', borderLeft:active?'3px solid '+violet:'3px solid transparent' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        {/* A long name (50 characters and more are common here) wraps between words and is
            never cut; the status tag beside it keeps its one line instead of folding. */}
        <div style={Object.assign({}, ROW_NAME, { minWidth:0, overflowWrap:'anywhere' })}>{patientName(v)}</div>
        <div style={tab==='pending'?rowTag('var(--warn-a18)','var(--warn-ink)'):rowTag('var(--ok-a18)','var(--ok-text)')}>{tab==='pending'?t.waiting:t.completed}</div>
      </div>
      <div style={Object.assign({}, ROW_SUB, { marginTop:3 })}>{v.chart_no} · {v.rx_count} {t.rxUnit}</div>
      {badge ? <div style={{ display:'inline-block', marginTop:4, color:'var(--warn-text)', background:'var(--warn-a20)', border:'1px solid var(--warn-a50)', borderRadius:4, padding:'1px 6px', fontSize: 13, fontWeight:800 }}>{badge}</div> : null}
      <div style={Object.assign({}, ROW_NOTE, { color:t3, marginTop:2 })}>{timeText(v, locale)}</div>
      <div style={Object.assign({}, ROW_NOTE, { color:t3, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' })}>{(v.prescriptions||[]).map(function(r){return r.drug_name;}).join(', ')}</div>
    </div>;
  }

  return (
    // The page is exactly the window and only the inner areas scroll (as in Lab.jsx).
    // It used to be "window minus 88px" for the top bars, which are taller than that, so
    // on a 1366x768 laptop the page scrolled by about 30px and the bottom "Terminer
    // délivrance" button sat below the window.
    <div style={{ fontFamily: 'system-ui,sans-serif', background: 'var(--bg)', color: tx, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: 16 }}>
      <TopBar />

      <div style={TOOL_ROW}>
        <button onClick={function(){setTab('pending'); setSel(null);}} style={tabBtn(tab==='pending','var(--violet-a20)','var(--violet-text-4)','var(--violet-a50)')}>{t.dispensingPending} ({pending.length})</button>
        <button onClick={function(){setTab('completed'); setSel(null);}} style={tabBtn(tab==='completed','var(--ok-a20)','var(--ok-text-2)','var(--ok-a50)')}>{t.dispensingCompleted} ({completed.length})</button>
        {/* right after the two tabs, as on the payment and laboratory screens */}
        {tab !== 'stock' ? <button onClick={loadData} title={t.refresh} aria-label={t.refresh} style={toolBtn()}>↻</button> : null}
        <button onClick={function(){setTab('stock'); setSel(null);}} style={tabBtn(tab==='stock','var(--warn-a20)','var(--warn-text-2)','var(--warn-a50)')}>📦 {t.ph_tabStock}</button>
        {tab !== 'stock' ? <>
        <button onClick={function(){setPhFinderOpen(true);}} style={toolBtn()}>🔍 {t.findPatient}</button>
        <button onClick={function(){ if(sel) setDocOpen(true); }} disabled={!sel} style={{ background:sel?'var(--warn-strong)':'var(--chip)', color:sel?'var(--on-fill-amber)':'var(--text-4)', border:'1px solid '+(sel?'var(--warn-ink)':bd2), borderRadius:6, padding:'6px 10px', cursor:sel?'pointer':'not-allowed', fontSize: 14, fontWeight:700 }}>💊 {t.outsideRx}</button>
        <button onClick={function(){ if(sel) setChartViewOpen(true); }} disabled={!sel} style={{ background:sel?'var(--chip)':'var(--chip)', color:sel?'var(--violet-text-3)':'var(--text-4)', border:'1px solid '+(sel?'var(--violet-2)':bd2), borderRadius:6, padding:'6px 10px', cursor:sel?'pointer':'not-allowed', fontSize: 14, fontWeight:700 }}>📋 {t.chartViewer||'차트뷰어'}</button>
        </> : null}
        <div style={{ flex:1 }}></div>
        {sel && tab==='pending' ? <button onClick={dispense} disabled={busy || tooOld} style={{ background:tooOld?'var(--chip)':'linear-gradient(135deg,var(--ok),var(--ok-strong))', color:tooOld?'var(--text-4)':'var(--on-fill)', border:tooOld?'1px solid '+bd2:'none', borderRadius:6, padding:'6px 16px', minHeight:34, cursor:tooOld?'not-allowed':busy?'wait':'pointer', fontSize: 14, fontWeight:800, whiteSpace:'nowrap' }}>✓ {t.dispenseComplete}</button> : null}
      </div>

      {/* The patient chart on the right keeps about 320px on a 1366 laptop, where the
          prescription table needs the room, and grows on wider screens (1600 -> 384,
          1920 -> 420) so the doctor's follow-up line reads without opening the visit. */}
      {tab === 'stock' ? <PharmacyStock /> :
      <div style={{ display:'grid', gridTemplateColumns:PAGE_COLS, gridTemplateRows:'minmax(0,1fr)', flex:1, minHeight:0 }}>
        <div style={{ borderRight:'1px solid '+bd, display:'flex', flexDirection:'column', background:pn, minHeight:0 }}>
          {/* Work date: the same control, in the same place, as on the payment screen. */}
          <div style={{ flexShrink:0, padding:'7px 9px', borderBottom:'1px solid '+bd, background:viewingPast?'var(--warn-a14)':'var(--panel-2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:viewingPast?'var(--warn-text)':t2, whiteSpace:'nowrap' }}>{t.rc_workDate}</span>
              <button type="button" title={t.rc_prevDay} aria-label={t.rc_prevDay} onClick={function(){shiftWorkDate(-1)}} disabled={!workDate} style={{ background:'var(--chip)', color:t2, border:'1px solid '+bd2, borderRadius:5, padding:'4px 5px', cursor:'pointer', fontSize:13 }}>◀</button>
              <input type="date" value={workDate} max={serverToday||undefined} onChange={function(e){chooseWorkDate(e.target.value)}} style={{ flex:1, minWidth:0, background:'var(--field-3)', border:'1px solid var(--field-border)', borderRadius:5, padding:'4px 4px', color:tx, fontSize:13, colorScheme:'var(--scheme)' }} />
              <button type="button" title={t.rc_nextDay} aria-label={t.rc_nextDay} onClick={function(){shiftWorkDate(1)}} disabled={!workDate||!serverToday||workDate>=serverToday} style={{ background:'var(--chip)', color:t2, border:'1px solid '+bd2, borderRadius:5, padding:'4px 5px', cursor:'pointer', fontSize:13, opacity:(!workDate||workDate>=serverToday)?0.4:1 }}>▶</button>
            </div>
            {viewingPast ? <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginTop:6 }}>
              <div style={{ flex:1, fontSize:12, color:'var(--warn-text)', lineHeight:1.4 }}>{fill(t.ph_workDatePast, { date: workDate, today: serverToday })}</div>
              <button type="button" onClick={function(){chooseWorkDate(serverToday)}} style={{ background:'var(--accent-a20)', color:'var(--accent-text)', border:'1px solid var(--accent-a40)', borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>{t.rc_backToToday}</button>
            </div> : null}
          </div>
          <div style={LIST_SEARCH_WRAP}>
            <input autoComplete="off" value={q} onChange={function(e){setQ(e.target.value)}} placeholder={t.pharmacySearchPlaceholder} aria-label={t.pharmacySearchPlaceholder} style={LIST_SEARCH}/>
          </div>
          <div style={{ flex:1, minHeight:0, overflow:'auto' }}>
            {loading ? <div style={{ padding:20, textAlign:'center', color:t3 }}>{t.loading}</div> : null}
            {/* Nothing in the list at all, or everything hidden by the search: two different
                things to tell staff - the second used to read as "no prescriptions". */}
            {!loading && activeList.length === 0 ? <div style={ROW_EMPTY}>{t.noRxToShow}</div> : null}
            {!loading && activeList.length > 0 && filtered.length === 0 ? <div style={Object.assign({}, ROW_EMPTY, { overflowWrap:'anywhere' })}>{fill(t.ph_searchNone, { q: q.trim() })}</div> : null}
            {tab==='pending' && past ? <div style={{ borderBottom:'2px solid var(--warn-a60)', background:'var(--warn-a0d)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderBottom:'1px solid '+bd }}>
                <div style={{ flex:1, minWidth:0, overflowWrap:'anywhere', fontWeight:800, fontSize: 14, color:'var(--warn-text)' }}>🔍 {past.name} — {fill(t.ph_pastListTitle, { n: past.days })}</div>
                <button onClick={function(){ setPast(null); }} style={{ flexShrink:0, whiteSpace:'nowrap', alignSelf:'flex-start', background:'var(--chip)', color:t2, border:'1px solid '+bd2, borderRadius:4, padding:'2px 8px', cursor:'pointer', fontSize: 13 }}>{t.close}</button>
              </div>
              {past.groups.length === 0 ? <div style={{ padding:'8px 12px', color:t3, fontSize: 14 }}>{t.ph_noPastRx}</div> : null}
              {past.groups.map(function(v){ return rxCard(v, 'past'); })}
              {past.older > 0 ? <div style={{ padding:'8px 12px', color:'var(--danger-text-2)', fontSize: 13, fontWeight:700 }}>⚠ {fill(t.ph_olderRx, { count: past.older, n: past.days })}</div> : null}
            </div> : null}
            {!loading && filtered.map(function(v){ return rxCard(v, 'queue'); })}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {!sel ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:t3 }}>
            <div style={{ textAlign:'center' }}>
              <div style={EMPTY_ICON}>💊</div>
              <div style={EMPTY_TEXT}>{t.selectRxPatient}</div>
              <div style={EMPTY_SUB}>{t.pharmacyOnlyCompleted}</div>
            </div>
          </div> : <>
            <div style={{ flexShrink:0, padding:'12px 16px', borderBottom:'1px solid '+bd, background:scBg }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize: 22, fontWeight:900, color:'var(--text-strong-2)', overflowWrap:'anywhere' }}>{patientName(sel)}</div>
                  <div style={{ marginTop:4, fontSize: 16, color:t2 }}>{t.chartNo} {sel.chart_no} · {t.doctor} {sel.doctor_name || '-'} · {timeText(sel, locale)}</div>
                  {sel.allergies ? <div style={{ marginTop:6, color:'var(--danger-text-2)', background:'var(--danger-a20)', border:'1px solid var(--danger-a50)', borderRadius:5, padding:'5px 8px', display:'inline-block', fontSize: 16, fontWeight:700 }}>{t.allergies}: {sel.allergies}</div> : null}
                  {pastBadge(sel) ? <div style={{ marginTop:6, marginRight:6, color:'var(--warn-text)', background:'var(--warn-a20)', border:'1px solid var(--warn-a60)', borderRadius:5, padding:'5px 8px', display:'inline-block', fontSize: 15, fontWeight:800 }}>🕘 {pastBadge(sel)}</div> : null}
                  {selGone ? <div style={{ marginTop:6, color:'var(--warn-text-3)', background:'var(--warn-a20)', border:'1px solid var(--warn-a60)', borderRadius:5, padding:'5px 8px', fontSize: 15, fontWeight:700 }}>⚠ {t.ph_selGone}</div> : null}
                  {tooOld ? <div style={{ marginTop:6, color:'var(--danger-text-2)', background:'var(--danger-a20)', border:'1px solid var(--danger-a50)', borderRadius:5, padding:'5px 8px', fontSize: 15, fontWeight:700 }}>⚠ {fill(t.ph_tooOld, { n: pastDays })}</div> : null}
                </div>
                <div style={{ textAlign:'right', flexShrink:0, whiteSpace:'nowrap' }}>
                  <div style={{ color:t3, fontSize: 16 }}>{t.ph_drugCostInternal}</div>
                  <div style={{ color:'var(--text-strong-2)', fontSize: 20, fontWeight:900 }}>{fmt(totalDrug, lc.lang)}</div>
                  {anyUnquantified ? <div style={{ color:'var(--danger-text-2)', fontSize: 13, fontWeight:700 }}>{t.ph_noTotal}</div> : null}
                </div>
              </div>
            </div>

            <div style={{ padding:16, overflow:'auto', flex:1, minHeight:0 }}>
              <div style={{ background:pn, border:'1px solid '+bd, borderRadius:8, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:RX_COLS, gap:0, background:'var(--panel-2)', borderBottom:'1px solid '+bd, color:t3, fontSize: 14, fontWeight:800 }}>
                  {[t.colDrugName,t.ph_colDaily,t.ph_colPerDose,t.colFreq,t.colDays,t.ph_colDirections,t.colQty,t.colMemo].map(function(h){return <div key={h} style={{ padding:'8px 7px' }}>{h}</div>;})}
                </div>
                {(sel.prescriptions||[]).map(function(rx){
                  var warn = refillWarn(rx.drug_code);
                  var total = storedTotal(rx);
                  var per = perDose(rx);
                  return <div key={rx.id} style={{ display:'grid', gridTemplateColumns:RX_COLS, borderBottom:'1px solid '+bd, fontSize: 16, background: warn?'var(--danger-a0d)':'transparent' }}>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', fontWeight:800, color:tx }}>
                      <div>{rx.drug_name}</div>
                      <div style={{ color:t3, fontSize: 16, marginTop:2 }}>{rx.drug_code}</div>
                      {tab==='pending' ? <div style={{ display:'inline-flex', marginTop:5, borderRadius:5, overflow:'hidden', border:'1px solid '+bd2 }}>
                        {[['internal',t.internalRx||'원내'],['external',t.externalRx||'원외']].map(function(o){
                          var on=(rx.dispense_type||'internal')===o[0];
                          var c=o[0]==='external'?'var(--warn)':'var(--ok)';
                          return <button key={o[0]} onClick={function(){ setDispenseType(rx.id,o[0]); }} style={{ background:on?c:'var(--chip)', color:on?'var(--on-bright)':t2, border:'none', padding:'3px 12px', cursor:'pointer', fontSize:13, fontWeight:800 }}>{o[1]}</button>;
                        })}
                      </div> : (rx.dispense_type==='external' ? <span style={{ display:'inline-block', marginTop:5, background:'var(--warn-a20)', color:'var(--warn-text)', borderRadius:4, padding:'2px 8px', fontSize:13, fontWeight:800 }}>{t.externalRx||'원외'}</span> : null)}
                      {warn? <div style={{ marginTop:4, color:'var(--danger-text-2)', background:'var(--danger-a18)', border:'1px solid var(--danger-a50)', borderRadius:5, padding:'3px 7px', display:'inline-block', fontSize: 13, fontWeight:700 }}>⚠ {fill(t.ph_refillWarn, { ago: warn.daysAgo, supply: warn.priorDays, left: warn.daysLeft })}</div> : null}
                      {/* The two "ask the doctor" notes sit here, under the name, where there is
                          room; in their own narrow columns they wrapped a word a line. The cell
                          itself keeps the amber dash. */}
                      {per && !per.clean ? <div style={{ marginTop:4, color:'var(--warn-text)', fontSize: 13, fontWeight:700 }}>{t.ph_perDoseCheck}</div> : null}
                      {missingTimes(rx) ? <div style={{ marginTop:4, color:'var(--warn-text)', fontSize: 13, fontWeight:700 }}>{t.ph_timesCheck}</div> : null}
                    </div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color:t2 }}>{rx.dose ? fmtAmount(parseFloat(rx.dose)) : '-'}</div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color: per && per.clean ? tx : isPack(rx) ? t3 : 'var(--warn-text)', fontWeight:800 }}>
                      {per && per.clean ? fmtAmount(per.value) : '—'}
                    </div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color: missingTimes(rx) ? 'var(--warn-text)' : t2, fontWeight: missingTimes(rx) ? 800 : 400 }}>
                      {rx.frequency || '-'}
                    </div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color:t2 }}>{rx.days || '-'}</div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color:t2 }}>{rx.route || '-'}</div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color: hasTotal(rx) ? t2 : 'var(--danger-text-2)', fontWeight: hasTotal(rx) ? 400 : 800 }}>
                      {hasTotal(rx) ? (isPack(rx) ? packWord(rx, lc.lang, total) : fmtAmount(total)) : t.ph_noTotal}
                      {isLegacyTotal(rx) ? <div style={{ fontSize: 12, color:'var(--warn-text)', fontWeight:700, marginTop:2 }}>{t.ph_legacyTotal}</div> : null}
                    </div>
                    <div style={{ padding:'10px 7px', overflowWrap:'anywhere', color:t2 }}>{rx.memo || '-'}</div>
                  </div>;
                })}
              </div>
            </div>

            {tab==='pending' ? <div style={{ flexShrink:0, padding:'10px 16px', borderTop:'1px solid '+bd, background:'var(--panel-2)', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={dispense} disabled={busy || tooOld} style={{ background:tooOld?'var(--chip)':'linear-gradient(135deg,var(--ok),var(--ok-strong))', color:tooOld?'var(--text-4)':'var(--on-fill)', border:tooOld?'1px solid '+bd2:'none', borderRadius:6, padding:'9px 28px', cursor:tooOld?'not-allowed':busy?'wait':'pointer', fontSize: 16, fontWeight:900 }}>✓ {t.dispenseComplete}</button>
            </div> : null}
          </>}
        </div>

        <div style={{ borderLeft:'1px solid '+bd, display:'flex', flexDirection:'column', background:pn, overflow:'hidden' }}>
          <div style={Object.assign({}, SIDE_HEAD, { color:'var(--accent-text)' })}>{t.patientChart}</div>
          <div style={{ flex:1, minHeight:0, overflow:'auto' }}><PatientChart patientId={sel?sel.patient_id:(viewPid||null)} /></div>
        </div>
      </div>}
      <PatientFinder open={phFinderOpen} onClose={function(){setPhFinderOpen(false);}} mode="patient"
        onPickPatient={function(p){ pickPatient(p); }} />
      <DocumentModal open={docOpen} onClose={function(){setDocOpen(false);}} category="prescription"
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{ visit_id: sel?sel.visit_id:null, consultation_id: sel?sel.consultation_id:null, doctor_name: sel?sel.doctor_name:'', dept_code: '' }} />
      <DocumentModal open={chartViewOpen} onClose={function(){setChartViewOpen(false);}} category="chart" readOnly={true}
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{}} />
    </div>
  );
}
