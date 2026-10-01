import { useState, useEffect, useMemo, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { PatientFinder, phoneLines, phoneText } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';


// Money: 17 300 in French (no-break space, so the number never splits across lines),
// 17,300 in Korean and English - coordinator decision 2026-09-29, same as fmt() in Pharmacy.jsx.
// toLocaleString() followed the PC's settings instead of the screen language.
function fmtAr(n, lang) { return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? ' ' : ','); }

var GENDERS = ['M', 'F'];

// [year, month, day] as two-digit strings, or null when the text is not a whole date.
function parsePastedDob(text) {
  var s = String(text || '').trim();
  var pad = function (x) { return x.length === 1 ? '0' + x : x; };
  var m = /^(\d{4})(\d{2})(\d{2})$/.exec(s) || /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/.exec(s);
  if (m) return [m[1], pad(m[2]), pad(m[3])];
  m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/.exec(s);
  if (m) return [m[3], pad(m[2]), pad(m[1])];
  return null;
}

function DobInput(props) {
  var value = props.value || '';
  var onChange = props.onChange;
  var style = props.style || {};
  var parts = value ? value.split('-') : [];
  var year = parts[0] || '', month = parts[1] || '', day = parts[2] || '';
  var t = useLang().t;
  var mRef = useRef(null), dRef = useRef(null);
  function digits(v, max){ return String(v || '').replace(/\D/g, '').slice(0, max); }
  // Always "year-month-day" with empty parts kept in place ("-05-" while only the
  // month is typed), so value.split('-') puts each part back in its own box. Joining
  // only the non-empty parts used to turn "-05-" into "05", which then showed up in
  // the year box. All three empty is '' (no birth date). formProblem() refuses
  // anything that is not a complete YYYY-MM-DD, so a partial value is never saved.
  function emit(y,m,d){
    onChange(y || m || d ? y + '-' + m + '-' + d : '');
  }
  // A whole date pasted into any of the three boxes is split into year, month and day.
  // Without this the year box (maxLength 4) kept "1990" of "19900503" and dropped the rest.
  // Accepted: 19900503, 1990-05-03 (also / . or space), and 03/05/1990 - day first, as
  // written in Madagascar and France. Anything else is pasted as usual. The date is not
  // checked here: formProblem() refuses an impossible one when saving.
  function onPaste(e){
    var d = parsePastedDob((e.clipboardData || window.clipboardData).getData('text'));
    if (!d) return;
    e.preventDefault();
    emit(d[0], d[1], d[2]);
    if (dRef.current) dRef.current.focus();
  }
  var box = Object.assign({}, style, { display:'flex', alignItems:'center', gap:6, padding:'6px 8px' });
  var partStyle = { background:'transparent', border:0, outline:'none', color:style.color || 'var(--text)', fontSize:style.fontSize || 17, fontFamily:'monospace', textAlign:'center' };
  return <div style={box}>
    <input inputMode="numeric" value={year} placeholder={t.rc_phYear} maxLength={4} onPaste={onPaste} onChange={function(e){var v=digits(e.target.value,4); emit(v,month,day); if(v.length===4 && mRef.current)mRef.current.focus();}} style={Object.assign({}, partStyle, {width:58})}/>
    <span style={{color:'var(--text-3)'}}>-</span>
    <input ref={mRef} inputMode="numeric" value={month} placeholder={t.rc_phMonth} maxLength={2} onPaste={onPaste} onChange={function(e){var v=digits(e.target.value,2); emit(year,v,day); if(v.length===2 && dRef.current)dRef.current.focus();}} style={Object.assign({}, partStyle, {width:34})}/>
    <span style={{color:'var(--text-3)'}}>-</span>
    <input ref={dRef} inputMode="numeric" value={day} placeholder={t.rc_phDay} maxLength={2} onPaste={onPaste} onChange={function(e){var v=digits(e.target.value,2); emit(year,month,v);}} style={Object.assign({}, partStyle, {width:34})}/>
  </div>;
}

export default function RegistrationPage() {
  var langCtx = useLang();
  var t = langCtx.t;

  var vs = useState([]), visits = vs[0], setVisits = vs[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var ts = useState('waiting'), tab = ts[0], setTab = ts[1];
  var ds = useState([]), depts = ds[0], setDepts = ds[1];
  var docs = useState([]), doctors = docs[0], setDoctors = docs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];

  var pqs = useState(''), patientQuery = pqs[0], setPatientQuery = pqs[1];
  var prs = useState([]), patientResults = prs[0], setPatientResults = prs[1];
  // The text of the last search that found nobody ('' otherwise): the line under the
  // search box says so, instead of nothing happening at all.
  var nfs = useState(''), notFoundFor = nfs[0], setNotFoundFor = nfs[1];
  // Bumped by each search and each keystroke: a slow answer to an older search is dropped.
  var searchSeq = useRef(0);
  var sps = useState(null), selectedPatient = sps[0], setSelectedPatient = sps[1];
  var cvs = useState(false), chartViewOpen = cvs[0], setChartViewOpen = cvs[1];
  var pbs2 = useState({owed:0,refund:0}), patBal = pbs2[0], setPatBal = pbs2[1];
  var rfo = useState(false), regFinderOpen = rfo[0], setRegFinderOpen = rfo[1];
  var pls = useState(false), patientLoading = pls[0], setPatientLoading = pls[1];
  // A save in flight. The ref guards against a double click landing before the
  // re-render that disables the buttons; the state is what disables them.
  var bss = useState(false), busy = bss[0], setBusy = bss[1];
  var busyRef = useRef(false);

  // Only the fields this screen shows. national_id, mobile, address, city and
  // region exist on the patient but have no input here; the API keeps any field
  // the body leaves out, so they are never touched from this screen.
  // gender starts empty on purpose (decided 2026-09-29): with Male pre-selected, a
  // woman registered in a hurry was saved as male, and sex goes onto documents and to
  // the imaging devices. formProblem() refuses to save until one is chosen.
  var emptyForm = { chartNo: '', lastName: '', firstName: '', dob: '', gender: '', phone: '', bloodType: '', allergies: '', receptionNote: '' };
  var fs = useState(emptyForm), form = fs[0], setForm = fs[1];

  var vfs = useState({ department: '', doctor: '', visitType: 'newVisit', chiefComplaint: '', receptionMemo: '' });
  var visitForm = vfs[0], setVisitForm = vfs[1];
  // Where the visit type on screen came from:
  //   'auto'   - suggested by suggestedVisitType(); recalculated when the doctor or
  //              the patient's past visits change
  //   'manual' - staff pressed a button; never overwritten
  //   'loaded' - the stored value of a queued visit being edited; shown as stored
  // Editing a queued visit sends visit_type only when it is not 'loaded', so a fee
  // type payment set in the meantime is not overwritten with a value loaded minutes ago.
  var vts = useState('auto'), visitTypeSource = vts[0], setVisitTypeSource = vts[1];
  // The patient's earlier visits (GET /visits/patient/:id), for the suggestion.
  var pvs = useState([]), pastVisits = pvs[0], setPastVisits = pvs[1];
  // The same-name dialog: { list, resolve } while it is open (see askSimilar).
  var sms = useState(null), similarAsk = sms[0], setSimilarAsk = sms[1];

  var ms = useState(''), memo = ms[0], setMemo = ms[1];
  var hs = useState([]), history = hs[0], setHistory = hs[1];

  // The queue refreshes itself every 30 s while the tab is visible (same rule as
  // the lab screen), so a patient the doctor has opened or finished moves tabs
  // without anyone pressing anything. Only the queue is reloaded: the form on the
  // left, the memo and the chosen doctor are never touched. A stale list is what
  // let reception act on visits that had already moved on (7절 ②, ①).
  useEffect(function () {
    loadData();
    var timer = setInterval(function () { if (!document.hidden) refreshQueue(); }, 30000);
    return function () { clearInterval(timer); };
  }, []);

  // Numbers each queue load so a slow, older response cannot overwrite a newer one.
  var queueSeq = useRef(0);

  // ── Work date (decided 2026-09-29, ⑩) ──
  // The queue shows one day, chosen at the top left like the clinic's own system, so
  // visits left waiting or in progress on an earlier day can be found and put in
  // order. The server says what "today" is (GET /visits/day answers with it); the
  // PC's clock is never asked. While the screen "follows today" - the default, and
  // again whenever staff come back to today - a refresh after midnight moves the
  // work date to the new day by itself. Only a date staff picked stays put, and then
  // the screen says it is showing a past day. A past day is for looking and tidying
  // up only (cancel, complete); new registrations and edits are for today (decided).
  // Kept in a ref as well as state: the 30-second refresh was set up once, at mount,
  // and would otherwise keep reading the first work date forever.
  var wds = useState(''), workDate = wds[0], setWorkDate = wds[1];
  var tds = useState(''), serverToday = tds[0], setServerToday = tds[1];
  var workRef = useRef({ date: '', follow: true });
  function queueUrl() {
    var w = workRef.current;
    return '/visits/day' + (w.follow || !w.date ? '' : '?date=' + w.date);
  }
  function applyDay(d) {
    setServerToday(d.today);
    if (workRef.current.follow) workRef.current.date = d.date;
    setWorkDate(workRef.current.date);
    setVisits(Array.isArray(d.visits) ? d.visits : []);
    return Array.isArray(d.visits) ? d.visits : [];
  }
  function chooseWorkDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return;
    if (serverToday && date > serverToday) date = serverToday;   // no future days: nothing is booked ahead
    workRef.current = { date: date, follow: date === serverToday };
    setWorkDate(date);
    if (sel) startNewPatient();   // a visit from the other day is not left open for editing
    loadData();
  }
  function shiftWorkDate(days) {
    var d = new Date((workDate || serverToday) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    chooseWorkDate(d.toLocaleDateString('en-CA'));
  }
  function dayOf(v) { return v && v.visit_date ? String(v.visit_date).slice(0, 10) : ''; }
  var viewingPast = !!(workDate && serverToday && workDate < serverToday);
  // The chosen visit can be from an earlier day even while following today: the
  // screen stayed open over midnight with yesterday's visit selected.
  var selIsPast = !!(sel && serverToday && dayOf(sel) && dayOf(sel) < serverToday);

  async function refreshQueue() {
    var seq = ++queueSeq.current;
    try {
      var day = await api.get(queueUrl());
      if (seq !== queueSeq.current || !day || !Array.isArray(day.visits)) return;
      var vData = applyDay(day);
      // Keep the selected visit's status current, so the cancel button disappears
      // once the doctor has started. Everything else about the selection stays.
      setSel(function (prev) {
        if (!prev) return prev;
        var fresh = vData.filter(function (v) { return v.id === prev.id; })[0];
        // Also the bill flag and fee type, so the visit-type buttons lock once payment
        // has billed the visit and show the type payment chose.
        // Once billed, the stored department/doctor too: they can no longer change, and
        // the locked list must show what is stored, not an edit the server refused.
        var sameAssign = !fresh || !fresh.has_active_bill || (fresh.department_id === prev.department_id && fresh.doctor_id === prev.doctor_id);
        if (!fresh || (fresh.status === prev.status && fresh.has_active_bill === prev.has_active_bill && fresh.visit_type === prev.visit_type && sameAssign)) return prev;
        var upd = { status: fresh.status, has_active_bill: fresh.has_active_bill, visit_type: fresh.visit_type };
        if (fresh.has_active_bill) Object.assign(upd, { department_id: fresh.department_id, doctor_id: fresh.doctor_id, dept_code: fresh.dept_code, doctor_name: fresh.doctor_name });
        return Object.assign({}, prev, upd);
      });
    } catch (err) {
      // A failed background refresh keeps the list it had rather than emptying it.
    }
  }

  // A billed visit's department/doctor are locked (server: 409 VISIT_BILLED): the form
  // shows the stored ones, also when the visit was paid while an edit was on screen.
  var billedLock = sel && sel.has_active_bill ? [sel.id, sel.department_id, sel.doctor_id] : [null, null, null];
  useEffect(function () {
    if (!billedLock[0]) return;
    var dept = billedLock[1] || '', doc = billedLock[2] || '';
    setVisitForm(function (f) {
      if (String(f.department) === String(dept) && String(f.doctor) === String(doc)) return f;
      return Object.assign({}, f, { department: dept, doctor: doc });
    });
  }, billedLock);

  useEffect(function () {
    var pid = selectedPatient ? selectedPatient.id : null;
    if (!pid) { setPatBal({owed:0,refund:0}); return; }
    api.get('/billing/patient/'+pid+'/balance').then(function(b){ setPatBal(b||{owed:0,refund:0}); }).catch(function(){ setPatBal({owed:0,refund:0}); });
  }, [selectedPatient]);

  async function loadData() {
    setLoading(true);
    var seq = ++queueSeq.current;
    try {
      var day = await api.get(queueUrl());
      if (seq === queueSeq.current && day) applyDay(day);
      var dData = await api.get('/admin/departments');
      setDepts(dData);
      var sData = await api.get('/admin/doctors');
      setDoctors(sData);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  // The office manager's rule (decisions.md, 2026-09-29): follow-up means continuing
  // the same care, so the EMR suggests follow-up when the patient has been seen in
  // the same department before and first visit otherwise - no time limit, cancelled
  // visits do not count, and staff can always change it (a new problem in the same
  // department is a first visit). A visit without a department counts as its
  // doctor's department; with neither, it is a first visit. "No fee" is never
  // suggested. Change the rule here only.
  function deptOfDoctor(doctorId) {
    var d = doctors.filter(function (x) { return String(x.id) === String(doctorId); })[0];
    return d && d.department_id ? d.department_id : null;
  }
  function suggestedVisitType(deptId, doctorId, past, excludeVisitId) {
    var dept = deptId || deptOfDoctor(doctorId);
    if (!dept) return 'newVisit';
    var seen = (past || []).some(function (v) {
      if (v.id === excludeVisitId || v.status === 'cancelled') return false;
      return String(v.department_id || deptOfDoctor(v.doctor_id) || '') === String(dept);
    });
    return seen ? 'followUp' : 'newVisit';
  }
  function loadPastVisits(patientId) {
    setPastVisits([]);
    if (!patientId) return;
    api.get('/visits/patient/' + patientId)
      .then(function (rows) { setPastVisits(Array.isArray(rows) ? rows : []); })
      // No history to go on: the suggestion falls back to first visit.
      .catch(function () { setPastVisits([]); });
  }
  // Recalculate the suggestion whenever what it depends on changes - but only while
  // the value is the suggestion; a button staff pressed, or a stored type, stays.
  useEffect(function () {
    if (visitTypeSource !== 'auto') return;
    var next = suggestedVisitType(visitForm.department, visitForm.doctor, pastVisits, sel ? sel.id : null);
    if (next !== visitForm.visitType) uv('visitType', next);
  }, [visitTypeSource, visitForm.department, visitForm.doctor, pastVisits, doctors]);

  function patientToForm(p) {
    return {
      chartNo: p.chart_no || '', lastName: p.last_name || '', firstName: p.first_name || '',
      dob: p.date_of_birth ? p.date_of_birth.split('T')[0] : '', gender: p.gender || '',
      phone: p.phone || '',
      bloodType: p.blood_type || '', allergies: p.allergies || '', receptionNote: p.reception_note || '',
    };
  }

  function fillPatient(p) {
    setSelectedPatient(p);
    setSel(null);
    setVisitTypeSource('auto');
    loadPastVisits(p.id);
    setForm(patientToForm(p));
    setMemo('');
    loadHistory(p.id);
  }

  // ── Same-name and same-day warnings (decided 2026-09-29, reception ④) ──
  // Warn only - staff confirm and carry on - and judge "the same person" by name
  // alone. The dialog shows chart number, birth date, phone and last visit so staff
  // can tell namesakes apart.
  function askSimilar(list) {
    return new Promise(function (resolve) { setSimilarAsk({ list: list, resolve: resolve }); });
  }
  function answerSimilar(answer) {
    var open = similarAsk;
    setSimilarAsk(null);
    if (open) open.resolve(answer);
  }
  // Just before a new chart is created. True: go on creating it. False: stop - staff
  // cancelled, or chose the existing patient, who is now loaded for them to check.
  // Choosing the existing patient does not register straight away on purpose: what
  // was typed for the "new" patient (allergies, phone) would otherwise vanish
  // unseen; this way staff see the stored record and press the button again.
  async function confirmNewPatient() {
    var list = [];
    try {
      list = await api.get('/patients/similar?last_name=' + encodeURIComponent(form.lastName.trim()) +
        '&first_name=' + encodeURIComponent(form.firstName.trim()));
    } catch (e) {
      list = [];   // the check is a courtesy; if it cannot run, registering still works
    }
    if (!Array.isArray(list) || !list.length) return true;
    var answer = await askSimilar(list);
    if (answer.action === 'new') return true;
    if (answer.action === 'use') {
      var p = answer.patient;
      try { p = await api.get('/patients/' + p.id); } catch (e) { /* keep the short row */ }
      // Like fillPatient, but the visit being prepared (doctor, complaint, memo) stays.
      setSelectedPatient(p);
      setSel(null);
      setForm(patientToForm(p));
      setVisitTypeSource('auto');
      loadPastVisits(p.id);
      loadHistory(p.id);
      alert(t.rc_similarLoaded);
    }
    return false;
  }
  // The patient already in today's queue (not cancelled), from the list on screen.
  function todayVisitOf(patientId) {
    return visits.filter(function (v) { return v.patient_id === patientId && v.status !== 'cancelled'; })[0] || null;
  }
  // POST /visits with the same-day check: asks from the queue on screen first, and
  // again if the server finds a visit the queue did not have yet (another desk).
  // False when staff chose not to register a second visit.
  async function postVisit(body, name) {
    var already = todayVisitOf(body.patient_id);
    if (already) {
      var st = already.status === 'completed' ? t.completed : (already.status === 'in_progress' ? t.in_progress : t.waiting);
      if (!confirm(fill(t.rc_dupVisit, { name: name, status: st, doctor: already.doctor_name ? ', ' + already.doctor_name : '' }))) return false;
      body = Object.assign({}, body, { allow_duplicate: true });
    }
    try {
      await api.post('/visits', body);
    } catch (err) {
      if (!err || err.message !== 'Patient already registered today') throw err;
      if (!confirm(fill(t.rc_dupVisitOther, { name: name }))) { loadData(); return false; }
      await api.post('/visits', Object.assign({}, body, { allow_duplicate: true }));
    }
    return true;
  }

  async function searchPatients() {
    var s = (patientQuery || '').trim();
    var my = ++searchSeq.current;
    setNotFoundFor('');
    if (!s) { setPatientResults([]); return; }
    setPatientLoading(true);
    try {
      var data = await api.get('/patients?q=' + encodeURIComponent(s) + '&limit=20');
      setPatientResults(data || []);
      if ((!data || !data.length) && my === searchSeq.current) setNotFoundFor(s);
    } catch (err) { alert(errText(err)); }
    setPatientLoading(false);
  }

  function startNewPatient() {
    setSelectedPatient(null);
    setSel(null);
    setHistory([]);
    setPatientResults([]);
    setPatientQuery('');
    setNotFoundFor('');
    setMemo('');
    setForm(emptyForm);
    setVisitForm({ department: '', doctor: '', visitType: 'newVisit', chiefComplaint: '', receptionMemo: '' });
    setVisitTypeSource('auto');
    setPastVisits([]);
  }

  async function loadHistory(patientId) {
    try {
      var h = await api.get('/patients/' + patientId + '/history');
      setHistory(h);
    } catch (err) { setHistory([]); }
  }

  async function selectVisit(v) {
    setSel(v);
    setSelectedPatient({ id: v.patient_id, chart_no: v.chart_no, last_name: v.last_name, first_name: v.first_name });
    setForm({
      chartNo: v.chart_no, lastName: v.last_name, firstName: v.first_name,
      dob: v.date_of_birth ? v.date_of_birth.split('T')[0] : '', gender: v.gender || '',
      phone: v.patient_phone || '',
      bloodType: v.blood_type || '', allergies: v.allergies || '', receptionNote: v.reception_note || '',
    });
    setVisitForm({
      department: v.department_id || '', doctor: v.doctor_id || '',
      visitType: v.visit_type || 'newVisit', chiefComplaint: v.chief_complaint || '',
      receptionMemo: v.reception_memo || '',
    });
    setMemo(v.reception_memo || '');
    setVisitTypeSource('loaded');
    loadPastVisits(v.patient_id);
    loadHistory(v.patient_id);
  }

  // The patient fields this screen owns. Anything not listed is left as it is.
  function patientBody() {
    return {
      last_name: form.lastName.trim(), first_name: form.firstName.trim(),
      date_of_birth: form.dob || null, gender: form.gender, phone: form.phone,
      blood_type: form.bloodType, allergies: form.allergies, reception_note: form.receptionNote,
    };
  }

  // Checked here so the message is in the screen's language; the API repeats
  // the name and birth-date checks in English.
  function formProblem() {
    if (!form.lastName.trim() || !form.firstName.trim()) return t.rc_nameRequired;
    if (form.gender !== 'M' && form.gender !== 'F') return t.rc_genderRequired;
    if (!form.dob) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.dob);
    if (!m) return t.rc_dobIncomplete;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return t.rc_dobInvalid;
    if (dt > new Date() || y < 1875) return t.rc_dobInvalid;
    return null;
  }

  // '{name}'-style slots, so each language can put the value where its grammar wants it.
  // Arrow keys in the sex radio group: choose the next / previous one and move the focus
  // with it (ARIA radio pattern). Space and Enter are the buttons' own click.
  function moveGender(e, i) {
    var step = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    var next = (i + step + GENDERS.length) % GENDERS.length;
    uf('gender', GENDERS[next]);
    var sibling = e.currentTarget.parentElement.children[next];
    if (sibling) sibling.focus();
  }

  function fill(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : ''; });
  }
  function nameOf(p) { return ((p.last_name || '') + ' ' + (p.first_name || '')).trim(); }

  // The API answers in English. Messages the staff can act on are matched here and
  // shown in their language; anything else keeps the original after a translated
  // prefix. If a message changes in patient/visit.routes.js or validate.js, change
  // it here too.
  function errText(err) {
    var msg = (err && err.message) || '';
    if (msg === 'Patient name is required') return t.rc_nameRequired;
    if (msg.indexOf('date_of_birth') === 0) return t.rc_dobInvalid;
    // utils/dbError.js (22008). The only date this screen sends is the birth date.
    if (msg === 'A date field has a date that does not exist') return t.rc_dobInvalid;
    if (msg === 'Only a waiting visit can be cancelled') return t.rc_cancelNotWaiting;
    // 409 VISIT_HAS_RECORDS from PUT /visits/:id/status: the visit carries a note, an
    // order, a document, a bill... (the consultation session's test, visitRecords().any).
    if (msg === 'The visit has records; it cannot be cancelled') return t.rc_hasRecordsNoCancel;
    if (msg === 'The visit has records; it cannot go back to waiting') return t.rc_hasRecordsNoWaiting;
    if (msg === 'Patient not found') return t.rc_patientNotFound;
    if (msg === 'Visit not found') return t.rc_visitNotFound;
    // 409 VISIT_BILLED from PUT /visits/:id: paid while this form was open.
    if (msg === 'The visit is already paid; its department and doctor can no longer change') return t.rc_visitBilledNoMove;
    // 403 from permMiddleware: the account lacks the reception permission. Since
    // 2026-09-29 (S1) a permission removed in Settings applies at once, open screens included.
    if (msg === 'Access denied') return t.rc_accessDenied;
    if (msg === 'A field has the wrong format' || msg === 'A date field has the wrong format') return t.rc_badFormat;
    // fetch() itself failing (Chrome / Firefox / Safari wording); nginx's JSON for a
    // stopped backend (frontend/nginx.conf, api_backend_down.json); or an HTML error
    // page from anything else in between.
    if (/^(Failed to fetch|NetworkError|Load failed|API backend is not reachable)/.test(msg) || msg.indexOf('API response was not JSON') === 0) return t.rc_serverDown;
    return fill(t.rc_errorWith, { msg: msg });
  }

  async function withBusy(fn) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function savePatientOnly() {
    var problem = formProblem();
    if (problem) { alert(problem); return; }
    return withBusy(async function () {
      try {
        var saved;
        if (selectedPatient && selectedPatient.id) {
          saved = await api.put('/patients/' + selectedPatient.id, patientBody());
        } else {
          if (!(await confirmNewPatient())) return;
          saved = await api.post('/patients', patientBody());
        }
        setSelectedPatient(saved);
        setForm(function (f) { return Object.assign({}, f, { chartNo: saved.chart_no || f.chartNo }); });
        await loadData();
        alert(fill(t.rc_patientSaved, { chart: saved.chart_no || '' }));
      } catch (err) {
        alert(errText(err));
      }
    });
  }

  function mb(c) { return { background: tint(c, '18'), color: 'var(--' + c + '-ink)', border: '1px solid ' + tint(c, '40'), borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }; }
  // "Terminer →" on a patient still waiting: no consultation took place, so the server
  // turns the visit into "no fee" (decided 2026-09-29, ⑳). Ask first - it changes
  // what the cashier will charge. A no-fee visit has nothing to collect and never
  // reaches the cash desk list, so the question only sends the patient to the cashier
  // when the visit already has a receipt (the server then keeps its type) - the old
  // wording said "part à la caisse" for every visit (integration test 2).
  function completeWithoutConsult(v, e) {
    if (e) e.stopPropagation();
    var msg = v.has_active_bill ? t.rc_completeNoConsultBilled : t.rc_completeNoConsult;
    if (!confirm(fill(msg, { name: nameOf(v) }))) return;
    // The dialog just said "no fee". If the server found records on the visit (the doctor
    // wrote something although the visit still showed as waiting), it kept the type and
    // closed the consultation: say so, the patient does go to the cashier.
    changeStatus(v, 'completed').then(function (saved) {
      if (saved && saved.has_records && saved.visit_type !== 'none' && !v.has_active_bill) alert(fill(t.rc_completeKeptType, { name: nameOf(v) }));
    });
  }
  async function changeStatus(v, newStatus, e) {
    if (e) e.stopPropagation();
    try {
      var saved = await api.put('/visits/' + v.id + '/status', { status: newStatus });
      await loadData();
      return saved;
    } catch (err) { alert(errText(err)); loadData(); }
  }

  function createOrUpdateVisit() {
    // Decided: a past work date is for looking and tidying up; registering and editing
    // visits happen on today's date. The button is disabled too; this is the backstop.
    if (viewingPast || selIsPast) { alert(t.rc_pastDateNoNew); return; }
    var problem = formProblem();
    if (problem) { alert(problem); return; }
    return withBusy(async function () {
      try {
        var patient = selectedPatient;
        if (!patient || !patient.id) {
          if (!(await confirmNewPatient())) return;
          patient = await api.post('/patients', patientBody());
          // Remember the new patient at once. If the visit below fails, pressing
          // the button again must register this patient, not create a second one.
          setSelectedPatient(patient);
          setForm(function (f) { return Object.assign({}, f, { chartNo: patient.chart_no || f.chartNo }); });
        } else {
          // Save edited details first. A failure stops here rather than registering
          // the visit and silently dropping the edit, as it used to.
          await api.put('/patients/' + patient.id, patientBody());
        }

        if (sel && sel.id) {
          // Only what this form edits. status is not sent: the list may be minutes
          // old, and sending it back put visits the doctor had completed back into
          // the queue - and off the payment list. visit_type goes only if staff
          // pressed a type button here, and never once the visit is billed.
          // Department/doctor always go: unchanged values pass even when billed, and a
          // change made before the visit was paid comes back as 409 VISIT_BILLED
          // (rc_visitBilledNoMove) instead of being dropped without a word.
          var vbody = {
            department_id: visitForm.department || null,
            doctor_id: visitForm.doctor || null,
            chief_complaint: visitForm.chiefComplaint,
            reception_memo: memo,
          };
          if (visitTypeSource !== 'loaded' && !sel.has_active_bill) vbody.visit_type = visitForm.visitType;
          await api.put('/visits/' + sel.id, vbody);
          alert(fill(t.rc_visitUpdated, { name: nameOf({ last_name: form.lastName, first_name: form.firstName }) }));
        } else {
          var registered = await postVisit({
            patient_id: patient.id,
            visit_type: visitForm.visitType,
            department_id: visitForm.department || null,
            doctor_id: visitForm.doctor || null,
            chief_complaint: visitForm.chiefComplaint,
            reception_memo: memo,
          }, nameOf({ last_name: form.lastName, first_name: form.firstName }));
          if (!registered) return;
          alert(fill(t.rc_registered, { name: nameOf({ last_name: form.lastName, first_name: form.firstName }), chart: patient.chart_no || form.chartNo }));
        }
        await loadData();
        startNewPatient();
      } catch (err) {
        alert(errText(err));
        // The queue may be stale (visit gone, status moved on, paid meanwhile); show what
        // is there now - refreshQueue also updates the selected visit (bill lock).
        loadData();
        refreshQueue();
      }
    });
  }

  function cancelVisit(v) {
    if (!v || !v.id) return;
    if (!confirm(fill(t.rc_cancelConfirm, { name: nameOf(v) }))) return;
    return withBusy(async function () {
      try {
        await api.put('/visits/' + v.id + '/status', { status: 'cancelled' });
        await loadData();
        startNewPatient();
      } catch (err) {
        alert(errText(err));
        // Most likely the doctor has opened the visit; show the real status.
        await loadData();
        startNewPatient();
      }
    });
  }

  var filteredVisits = useMemo(function () {
    var r = visits;
    if (tab === 'waiting') r = r.filter(function (v) { return v.status === 'waiting' || v.status === 'registered'; });
    else if (tab === 'in_progress') r = r.filter(function (v) { return v.status === 'in_progress'; });
    else if (tab === 'completed') r = r.filter(function (v) { return v.status === 'completed'; });
    if (q) {
      var s = q.toLowerCase();
      r = r.filter(function (v) { return (v.first_name + ' ' + v.last_name).toLowerCase().indexOf(s) >= 0 || (v.last_name + ' ' + v.first_name).toLowerCase().indexOf(s) >= 0 || String(v.chart_no || '').indexOf(s) >= 0; });
    }
    return r;
  }, [visits, tab, q]);

  function uf(k, v) { setForm(function (p) { var n = {}; for (var x in p) n[x] = p[x]; n[k] = v; return n; }); }
  function uv(k, v) { setVisitForm(function (p) { var n = {}; for (var x in p) n[x] = p[x]; n[k] = v; return n; }); }

  var bd = 'var(--border)', scBg = 'var(--panel-head)', pn = 'var(--panel)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)';
  var IS = { width: '100%', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 7, padding: '9px 11px', color: tx, fontSize: 17, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  var labelStyle = { fontSize: 14, fontWeight: 700, color: t3, display: 'block', marginBottom: 4 };
  var smallBtn = { borderRadius: 7, padding: '8px 13px', cursor: 'pointer', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: 'var(--bg)', color: tx, minHeight: '100vh', fontSize: 16 }}>
      <TopBar />
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr 440px', height: 'calc(100vh - 82px)' }}>

        {/* LEFT: Search + Patient Info */}
        <div style={{ borderRight: '1px solid ' + bd, overflow: 'auto', background: pn }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + bd, background: viewingPast ? 'var(--warn-a14)' : 'var(--panel-2)' }}>
            <label style={Object.assign({}, labelStyle, { color: viewingPast ? 'var(--warn-text)' : t2 })}>{t.rc_workDate}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" title={t.rc_prevDay} aria-label={t.rc_prevDay} onClick={function () { shiftWorkDate(-1); }} disabled={!workDate} style={Object.assign({}, smallBtn, { background: 'var(--chip)', color: t2, border: '1px solid var(--border-2)', padding: '6px 10px' })}>◀</button>
              <input type="date" value={workDate} max={serverToday || undefined} onChange={function (e) { chooseWorkDate(e.target.value); }} style={Object.assign({}, IS, { width: 'auto', flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 16, colorScheme: 'var(--scheme)' })} />
              <button type="button" title={t.rc_nextDay} aria-label={t.rc_nextDay} onClick={function () { shiftWorkDate(1); }} disabled={!workDate || !serverToday || workDate >= serverToday} style={Object.assign({}, smallBtn, { background: 'var(--chip)', color: t2, border: '1px solid var(--border-2)', padding: '6px 10px', opacity: (!workDate || workDate >= serverToday) ? 0.4 : 1 })}>▶</button>
              {viewingPast ? <button type="button" onClick={function () { chooseWorkDate(serverToday); }} style={Object.assign({}, smallBtn, { background: 'var(--accent-a20)', color: 'var(--accent-text)', border: '1px solid var(--accent-a40)', padding: '6px 10px' })}>{t.rc_backToToday}</button> : null}
            </div>
            {viewingPast ? <div style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: 6, lineHeight: 1.4 }}>{fill(t.rc_pastDateBanner, { date: workDate })}</div> : null}
          </div>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.patientSearchRegistration}</div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid ' + bd }}>
            <label style={labelStyle}>{t.existingPatientSearch}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={patientQuery} onChange={function (e) { setPatientQuery(e.target.value); setNotFoundFor(''); searchSeq.current++; }} onKeyDown={function (e) { if (e.key === 'Enter') searchPatients(); }} placeholder={t.searchNameChartPhone} style={Object.assign({}, IS, { flex: 1 })} />
              <button onClick={function(){ setRegFinderOpen(true); }} style={Object.assign({}, smallBtn, { background: 'var(--accent-a20)', color: 'var(--accent-text)', border: '1px solid var(--accent-a40)', whiteSpace:'nowrap' })}>🔍 {t.findPatient}</button>
            </div>
            {patientLoading ? <div style={{ color: t3, fontSize: 15 }}>{t.searching}</div> : null}
            {!patientLoading && notFoundFor ? <div role="status" style={{ color: t2, fontSize: 14, lineHeight: 1.4 }}>{fill(t.rc_noPatientFound, { q: notFoundFor, btn: t.newPatientInput })}</div> : null}
            {patientResults.length > 0 ? <div style={{ border: '1px solid ' + bd, borderRadius: 8, overflow: 'hidden', maxHeight: 170, overflowY: 'auto' }}>
              {patientResults.map(function (p) {
                return <div key={p.id} onClick={function () { fillPatient(p); }} style={{ padding: '9px 10px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)', background: selectedPatient && selectedPatient.id === p.id ? 'var(--accent-a18)' : 'var(--bg-row)' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, overflowWrap: 'anywhere' }}>{p.last_name} {p.first_name}</div>
                  {/* Chart number and birth date never break (a long phone used to leave
                      «1992-» at the end of one line and «11-02» on the next); the phone
                      breaks only between two numbers (phoneText). */}
                  <div style={{ fontSize: 13, color: t2, overflowWrap: 'anywhere' }}>{[[p.chart_no, true], [phoneText(p.phone || p.mobile), false], [p.date_of_birth ? p.date_of_birth.split('T')[0] : '', true]].filter(function (x) { return x[0]; }).map(function (x, i) {
                    return <span key={i}>{i ? ' · ' : ''}<span style={x[1] ? { whiteSpace: 'nowrap' } : null}>{x[0]}</span></span>;
                  })}</div>
                </div>;
              })}
            </div> : null}
            <button onClick={startNewPatient} style={Object.assign({}, smallBtn, { background: 'var(--ok-a18)', color: 'var(--ok-text)', border: '1px solid var(--ok-a40)' })}>+ {t.newPatientInput}</button>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--warn-a12)', border: '1px solid var(--warn-a45)', borderRadius: 8, padding: '10px 12px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--warn-text)', marginBottom: 5 }}>📌 {t.receptionDeskNote}</label>
              <textarea value={form.receptionNote} onChange={function (e) { uf('receptionNote', e.target.value); }} rows={2} placeholder={t.receptionDeskNoteHint} style={Object.assign({}, IS, { resize: 'vertical', lineHeight: 1.5, background: 'var(--field-2)' })} />
            </div>
            <div><label style={labelStyle}>{t.chartNo}</label><input value={form.chartNo} readOnly style={Object.assign({}, IS, { background: 'var(--field-locked)', color: 'var(--text-locked)', cursor: 'default' })} placeholder={t.newPatientAutoChart} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={labelStyle}>{t.lastName}</label><input value={form.lastName} onChange={function (e) { uf('lastName', e.target.value); }} style={IS} /></div>
              <div><label style={labelStyle}>{t.firstName}</label><input value={form.firstName} onChange={function (e) { uf('firstName', e.target.value); }} style={IS} /></div>
            </div>
            <div><label style={labelStyle}>{t.dateOfBirth}</label><DobInput value={form.dob} onChange={function (v) { uf('dob', v); }} style={IS} /></div>
            <div><label id="rc-gender-label" style={labelStyle}>{t.gender}</label>
              {/* A radio group: one Tab stop (the chosen sex, or Masculin while none is chosen),
                  arrow keys move and choose, Space/Enter choose. These were plain divs, which
                  a keyboard could not reach although the sex is required (integration test 2). */}
              <div role="radiogroup" aria-labelledby="rc-gender-label" aria-required="true" style={{ display: 'flex', gap: 8 }}>
                {GENDERS.map(function (g, i) {
                  var label = g === 'M' ? t.male : t.female;
                  var on = form.gender === g;
                  var tabStop = form.gender ? on : i === 0;
                  return <button key={g} type="button" role="radio" aria-checked={on} tabIndex={tabStop ? 0 : -1} className="pressable"
                    onClick={function () { uf('gender', g); }}
                    onKeyDown={function (e) { moveGender(e, i); }}
                    style={{ cursor: 'pointer', background: on ? 'var(--accent-a20)' : 'var(--chip)', border: on ? '1px solid var(--accent-a60)' : '1px solid var(--border-2)', borderRadius: 7, padding: '8px 14px', fontSize: 15, color: on ? 'var(--accent-text)' : t2, flex: 1, textAlign: 'center', fontWeight: 700, fontFamily: 'inherit' }}>{label}</button>;
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={labelStyle}>{t.phone}</label><input value={form.phone} onChange={function (e) { uf('phone', e.target.value); }} style={IS} placeholder="+261" /></div>
              <div><label style={labelStyle}>{t.bloodType}</label>
                <select value={form.bloodType} onChange={function (e) { uf('bloodType', e.target.value); }} style={IS}>
                  <option value="">—</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(function (v) { return <option key={v} value={v}>{v}</option>; })}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>{t.allergies}</label><input value={form.allergies} onChange={function (e) { uf('allergies', e.target.value); }} style={IS} /></div>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, borderTop: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.department} / {t.visitType}</div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={labelStyle}>{t.department} / {t.assignedDoctor}</label>
              <select value={visitForm.doctor} onChange={function (e) {
                var did = e.target.value;
                var doc = doctors.filter(function (x) { return String(x.id) === String(did); })[0];
                var deptId = doc ? (doc.department_id || '') : '';
                setVisitForm(function (f) { var n = Object.assign({}, f); n.doctor = did; n.department = deptId; return n; });
                // A new doctor can mean a new department: re-suggest, unless staff chose
                // the type by hand or the visit is already billed.
                if (visitTypeSource === 'loaded' && !(sel && sel.has_active_bill)) setVisitTypeSource('auto');
              }} disabled={!!(sel && sel.has_active_bill)} style={(sel && sel.has_active_bill) ? Object.assign({}, IS, { background: 'var(--field-locked)', color: 'var(--text-locked)', cursor: 'not-allowed' }) : IS}>
                <option value="">—</option>
                {doctors.map(function (d) { return <option key={d.id} value={d.id}>{(d.dept_code ? d.dept_code + ' – ' : '')}{d.name}</option>; })}
              </select>
              {/* Paid: department/doctor stay (office manager, 2026-09-30) - same rule as the server. */}
              {sel && sel.has_active_bill ? <div style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: 5 }}>{t.rc_visitBilledNoMove}</div> : null}
            </div>
            {(function () {
              // First visit / follow-up / no fee - the three the office manager kept.
              // emergency and referral stay valid in the API for old visits and the
              // payment screen, but reception does not offer them.
              var TYPES = [['newVisit', t.newVisit], ['followUp', t.followUp], ['none', t.rc_visitNoFee]];
              var locked = !!(sel && sel.has_active_bill);
              var shown = (sel && visitTypeSource === 'loaded') ? (sel.visit_type || 'newVisit') : visitForm.visitType;
              var deptRow = depts.filter(function (d) { return String(d.id) === String(visitForm.department || deptOfDoctor(visitForm.doctor)); })[0];
              var known = TYPES.some(function (x) { return x[0] === shown; });
              return <div><label style={labelStyle}>{t.visitType}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TYPES.map(function (x) {
                    var on = shown === x[0];
                    return <button key={x[0]} type="button" disabled={locked} onClick={function () { uv('visitType', x[0]); setVisitTypeSource('manual'); }}
                      style={{ flex: 1, cursor: locked ? 'not-allowed' : 'pointer', background: on ? 'var(--accent-a20)' : 'var(--chip)', border: on ? '1px solid var(--accent-a60)' : '1px solid var(--border-2)', borderRadius: 7, padding: '8px 6px', fontSize: 15, color: on ? 'var(--accent-text)' : t2, fontWeight: 700, opacity: locked && !on ? 0.45 : 1 }}>{x[1]}</button>;
                  })}
                </div>
                {locked ? <div style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: 5 }}>{t.rc_visitTypeLocked}</div> : null}
                {!locked && visitTypeSource === 'auto' && shown === 'followUp' ? <div style={{ fontSize: 13, color: t2, marginTop: 5 }}>{fill(t.rc_visitTypeSuggested, { dept: deptRow ? deptRow.code : '' })}</div> : null}
                {!locked && !known ? <div style={{ fontSize: 13, color: t2, marginTop: 5 }}>{fill(t.rc_visitTypeOther, { type: t[shown] || shown })}</div> : null}
              </div>;
            })()}
            <div><label style={labelStyle}>{t.chiefComplaint}</label><input value={visitForm.chiefComplaint} onChange={function (e) { uv('chiefComplaint', e.target.value); }} style={IS} /></div>
            <div><label style={labelStyle}>{t.receptionMemo}</label><textarea value={memo} onChange={function (e) { setMemo(e.target.value); }} rows={3} style={Object.assign({}, IS, { resize: 'vertical', lineHeight: 1.5 })} /></div>
            <button onClick={createOrUpdateVisit} disabled={busy || viewingPast || selIsPast} style={{ background: 'var(--accent-strong)', color: 'white', border: 0, borderRadius: 8, padding: '12px 14px', cursor: busy ? 'wait' : ((viewingPast || selIsPast) ? 'not-allowed' : 'pointer'), fontSize: 16, fontWeight: 800, opacity: (busy || viewingPast || selIsPast) ? 0.5 : 1 }}>{busy ? t.rc_saving : (sel ? t.updateVisit : t.registerWaiting)}</button>
            {(viewingPast || selIsPast) ? <div style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: -4 }}>{t.rc_pastDateNoNew}</div> : null}
            <button onClick={savePatientOnly} disabled={busy} style={{ background: 'var(--chip)', color: 'var(--text-soft)', border: '1px solid '+bd, borderRadius: 8, padding: '10px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>💾 {t.savePatientOnly}</button>
            {selectedPatient && selectedPatient.id ? <button onClick={function(){ setChartViewOpen(true); }} style={{ background: 'var(--chip)', color: 'var(--violet-text-3)', border: '1px solid var(--violet-2)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>📋 {t.chartViewer||'차트뷰어'}</button> : null}
            {sel && (sel.status === 'waiting' || sel.status === 'registered') ? <button onClick={function () { cancelVisit(sel); }} disabled={busy} style={{ background: 'var(--danger-a20)', color: 'var(--danger-text)', border: '1px solid var(--danger-a55)', borderRadius: 8, padding: '10px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>{t.cancelWaiting}</button> : null}
          </div>
        </div>

        {/* CENTER: Memo + History */}
        <div style={{ borderRight: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-col)' }}>
          {(sel || selectedPatient) ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '13px 16px', background: scBg, borderBottom: '1px solid ' + bd, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px' }}>
                {/* Long names (50-80 letters are ordinary here): the name and the department ·
                    doctor line wrap, also inside one long word; the initial and the balance
                    box keep their size instead of being squeezed. When the name does not
                    fit beside the balance box, the box goes to its own line (flexWrap) -
                    otherwise the name was left a 230px column, eight lines tall. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ background: 'var(--accent-a20)', borderRadius: 8, width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: 'var(--accent-text)' }}>{(form.firstName || '?')[0]}</div>
                  <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-strong)', lineHeight: 1.25 }}>{form.lastName} {form.firstName}</div>
                    <div style={{ fontSize: 14, color: t2 }}>{form.chartNo || t.newPatientInput} {sel ? '· ' + (sel.dept_code || '') + ' · ' + (sel.doctor_name || '') : ''}</div>
                  </div>
                </div>
                {(patBal.owed>0||patBal.refund>0)?
                  <div style={{ marginLeft:'auto', textAlign:'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {patBal.owed>0?<div style={{ background:'var(--danger-a18)', border:'1px solid var(--danger-a50)', borderRadius:6, padding:'4px 10px' }}><span style={{ fontSize:11, color:'var(--danger-text)', fontWeight:700, marginRight:5 }}>{t.owedLabel}</span><span style={{ fontFamily:'monospace', fontWeight:800, color:'var(--danger-text)', whiteSpace:'nowrap' }}>{fmtAr(patBal.owed, langCtx.lang)} Ar</span></div>:null}
                    {patBal.refund>0?<div style={{ background:'var(--accent-a18)', border:'1px solid var(--accent-a50)', borderRadius:6, padding:'4px 10px' }}><span style={{ fontSize:11, color:'var(--accent-text)', fontWeight:700, marginRight:5 }}>{t.refundLabel}</span><span style={{ fontFamily:'monospace', fontWeight:800, color:'var(--accent-text)', whiteSpace:'nowrap' }}>{fmtAr(patBal.refund, langCtx.lang)} Ar</span></div>:null}
                  </div>
                :null}
              </div>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.previousVisits}</div>
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {history.length > 0 ? history.map(function (h, i) {
                  return <div key={i} style={{ background: scBg, borderRadius: 8, padding: '12px 14px', marginBottom: 9, border: '1px solid ' + bd }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, marginBottom: 6, overflowWrap: 'anywhere' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--accent-text)', whiteSpace: 'nowrap' }}>{h.consult_date ? h.consult_date.split('T')[0] : ''}</span>
                      <span style={{ fontSize: 13, color: t2 }}>{h.dept_code}</span>
                      <span style={{ fontSize: 13, color: t2 }}>{h.doctor_name}</span>
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{h.note_text || h.subjective || '—'}</div>
                  </div>;
                }) : <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 15, fontStyle: 'italic' }}>{t.noPreviousVisits}</div>}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.35 }}>🔎</div>
                <div style={{ fontStyle: 'italic', fontSize: 17 }}>{t.selectPatientLeft}</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: pn }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: viewingPast ? 'var(--warn-text)' : tx }}>{viewingPast ? fill(t.rc_queueOfDate, { date: workDate }) : t.todayQueueCompleted}</div>
          <div style={{ padding: '8px 10px', display: 'flex', gap: 6, borderBottom: '1px solid ' + bd }}>
            {['waiting', 'in_progress', 'completed'].map(function (k) {
              var c = k === 'waiting' ? 'accent' : (k === 'in_progress' ? 'warn' : 'ok');
              var n = visits.filter(function (v) { return k === 'waiting' ? (v.status === 'waiting' || v.status === 'registered') : (k === 'in_progress' ? v.status === 'in_progress' : v.status === 'completed'); }).length;
              return <button key={k} onClick={function () { setTab(k); }} style={{ background: tab === k ? tint(c, '18') : 'transparent', color: tab === k ? 'var(--' + c + '-ink)' : t3, border: tab === k ? '1px solid ' + tint(c, '40') : '1px solid transparent', borderRadius: 7, padding: '8px 10px', cursor: 'pointer', fontSize: 14, fontWeight: 800, flex: 1, whiteSpace: 'nowrap' }}>{t[k]} ({n})</button>;
            })}
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid ' + bd }}>
            <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={t.queueSearch} style={{ background: 'var(--field-3)', border: '1px solid var(--field-border)', borderRadius: 7, padding: '8px 10px', color: tx, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? <div style={{ padding: 24, textAlign: 'center', color: t3 }}>{t.loading}</div> :
              filteredVisits.map(function (v) {
                var isSel = sel && sel.id === v.id;
                return <div key={v.id} onClick={function () { selectVisit(v); }} style={{ padding: '12px 13px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)', background: isSel ? 'var(--accent-a12)' : 'transparent' }}>
                  {/* The status tag keeps its width on one line; beside a long name it was squeezed
                      and «En Attente» folded in two (director, 2026-10-01 - same as the
                      consultation queue). The name is never cut: it wraps between words, and
                      inside a word when one word is wider than the column (that used to push
                      the whole list sideways). */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-strong)', minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{v.last_name} {v.first_name}</span>
                    <span style={{ background: tint(v.status === 'completed' ? 'ok' : (v.status === 'in_progress' ? 'warn' : 'accent'), '18'), color: v.status === 'completed' ? 'var(--ok-ink)' : (v.status === 'in_progress' ? 'var(--warn-ink)' : 'var(--accent-ink)'), borderRadius: 4, padding: '2px 7px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{v.status === 'completed' ? t.completed : (v.status === 'in_progress' ? t.in_progress : t.waiting)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: t2, overflowWrap: 'anywhere' }}>{[v.chart_no, v.dept_code, v.doctor_name].filter(Boolean).join(' · ')}</div>
                  {/* The complaint is a note, not an identity: two lines at most, all of it in the tooltip. */}
                  <div title={v.chief_complaint || undefined} style={{ fontSize: 13, color: t3, marginTop: 3, overflowWrap: 'anywhere', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{v.chief_complaint || ''}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }} onClick={function (e) { e.stopPropagation(); }}>
                    {(v.status === 'waiting' || v.status === 'registered') ? <button onClick={function (e) { completeWithoutConsult(v, e); }} style={mb('ok')}>{t.toCompleted}</button> : null}
                    {v.status === 'in_progress' ? <button onClick={function (e) { changeStatus(v, 'waiting', e); }} style={mb('accent')}>{t.toWaiting}</button> : null}
                    {v.status === 'in_progress' ? <button onClick={function (e) { changeStatus(v, 'completed', e); }} style={mb('ok')}>{t.toCompleted}</button> : null}
                    {v.status === 'completed' ? <button onClick={function (e) { changeStatus(v, 'waiting', e); }} style={mb('accent')}>{t.toWaiting}</button> : null}
                  </div>
                </div>;
              })}
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid ' + bd, background: 'var(--panel-2)', fontSize: 14, color: t3 }}>{t.total} <strong style={{ color: tx }}>{filteredVisits.length}</strong> {t.countPatients}</div>
        </div>
      </div>
      <DocumentModal open={chartViewOpen} onClose={function(){ setChartViewOpen(false); }} category="chart" readOnly={true}
        patient={selectedPatient ? { id: selectedPatient.id, chart_no: selectedPatient.chart_no, last_name: selectedPatient.last_name, first_name: selectedPatient.first_name, gender: form.gender, date_of_birth: form.dob } : null}
        context={{}} />
      {similarAsk ? (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div role="dialog" aria-modal="true" style={{ background: pn, border: '1px solid var(--border-2)', borderRadius: 12, width: 900, maxWidth: '94vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + bd, background: scBg }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--warn-text)' }}>⚠ {t.rc_similarTitle}</div>
              <div style={{ fontSize: 14, color: t2, marginTop: 4 }}>{t.rc_similarHint}</div>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: scBg }}>
                  {[t.chartNo, t.name, t.dob, t.phone, t.rc_lastVisit, ''].map(function (h, i) { return <th key={i} style={{ textAlign: 'left', padding: '8px 12px', color: t3, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>; })}
                </tr></thead>
                <tbody>
                  {similarAsk.list.map(function (p) {
                    return <tr key={p.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: 'var(--accent-text)', whiteSpace: 'nowrap' }}>{p.chart_no}</td>
                      <td style={{ padding: '9px 12px', color: tx, fontWeight: 700, overflowWrap: 'anywhere' }}>{p.last_name} {p.first_name}{p.gender ? ' (' + p.gender + ')' : ''}</td>
                      <td style={{ padding: '9px 12px', color: t2, whiteSpace: 'nowrap' }}>{p.date_of_birth ? String(p.date_of_birth).split('T')[0] : '—'}</td>
                      <td style={{ padding: '9px 12px', color: t2, fontFamily: 'monospace' }}>{phoneLines(p.phone || p.mobile)}</td>
                      <td style={{ padding: '9px 12px', color: t2, whiteSpace: 'nowrap' }}>{p.last_visit_date ? String(p.last_visit_date).split('T')[0] : '—'}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}><button type="button" onClick={function () { answerSimilar({ action: 'use', patient: p }); }} style={{ background: 'var(--accent-a20)', color: 'var(--accent-text)', border: '1px solid var(--accent-a60)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{t.rc_similarUse}</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid ' + bd, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={function () { answerSimilar({ action: 'cancel' }); }} style={{ background: 'var(--chip)', color: t2, border: '1px solid var(--border-2)', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.rc_cancel}</button>
              <button type="button" onClick={function () { answerSimilar({ action: 'new' }); }} style={{ background: 'var(--ok-a18)', color: 'var(--ok-text)', border: '1px solid var(--ok-a40)', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>{t.rc_similarCreate}</button>
            </div>
          </div>
        </div>
      ) : null}
      <PatientFinder open={regFinderOpen} onClose={function(){ setRegFinderOpen(false); }} mode="patient"
        onPickPatient={function(p){ fillPatient(p); }} />
    </div>
  );
}
