import { useState, useEffect, useMemo, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';


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
  var box = Object.assign({}, style, { display:'flex', alignItems:'center', gap:6, padding:'6px 8px' });
  var partStyle = { background:'transparent', border:0, outline:'none', color:style.color || '#e2e8f0', fontSize:style.fontSize || 17, fontFamily:'monospace', textAlign:'center' };
  return <div style={box}>
    <input inputMode="numeric" value={year} placeholder={t.rc_phYear} maxLength={4} onChange={function(e){var v=digits(e.target.value,4); emit(v,month,day); if(v.length===4 && mRef.current)mRef.current.focus();}} style={Object.assign({}, partStyle, {width:58})}/>
    <span style={{color:'#64748b'}}>-</span>
    <input ref={mRef} inputMode="numeric" value={month} placeholder={t.rc_phMonth} maxLength={2} onChange={function(e){var v=digits(e.target.value,2); emit(year,v,day); if(v.length===2 && dRef.current)dRef.current.focus();}} style={Object.assign({}, partStyle, {width:34})}/>
    <span style={{color:'#64748b'}}>-</span>
    <input ref={dRef} inputMode="numeric" value={day} placeholder={t.rc_phDay} maxLength={2} onChange={function(e){var v=digits(e.target.value,2); emit(year,month,v);}} style={Object.assign({}, partStyle, {width:34})}/>
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
  var emptyForm = { chartNo: '', lastName: '', firstName: '', dob: '', gender: 'M', phone: '', bloodType: '', allergies: '', receptionNote: '' };
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
  async function refreshQueue() {
    var seq = ++queueSeq.current;
    try {
      var vData = await api.get('/visits/today');
      if (seq !== queueSeq.current || !Array.isArray(vData)) return;
      setVisits(vData);
      // Keep the selected visit's status current, so the cancel button disappears
      // once the doctor has started. Everything else about the selection stays.
      setSel(function (prev) {
        if (!prev) return prev;
        var fresh = vData.filter(function (v) { return v.id === prev.id; })[0];
        // Also the bill flag and fee type, so the visit-type buttons lock once payment
        // has billed the visit and show the type payment chose.
        if (!fresh || (fresh.status === prev.status && fresh.has_active_bill === prev.has_active_bill && fresh.visit_type === prev.visit_type)) return prev;
        return Object.assign({}, prev, { status: fresh.status, has_active_bill: fresh.has_active_bill, visit_type: fresh.visit_type });
      });
    } catch (err) {
      // A failed background refresh keeps the list it had rather than emptying it.
    }
  }

  useEffect(function () {
    var pid = selectedPatient ? selectedPatient.id : null;
    if (!pid) { setPatBal({owed:0,refund:0}); return; }
    api.get('/billing/patient/'+pid+'/balance').then(function(b){ setPatBal(b||{owed:0,refund:0}); }).catch(function(){ setPatBal({owed:0,refund:0}); });
  }, [selectedPatient]);

  async function loadData() {
    setLoading(true);
    var seq = ++queueSeq.current;
    try {
      var vData = await api.get('/visits/today');
      if (seq === queueSeq.current) setVisits(vData);
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
      dob: p.date_of_birth ? p.date_of_birth.split('T')[0] : '', gender: p.gender || 'M',
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
    if (!s) { setPatientResults([]); return; }
    setPatientLoading(true);
    try {
      var data = await api.get('/patients?q=' + encodeURIComponent(s) + '&limit=20');
      setPatientResults(data || []);
    } catch (err) { alert(errText(err)); }
    setPatientLoading(false);
  }

  function startNewPatient() {
    setSelectedPatient(null);
    setSel(null);
    setHistory([]);
    setPatientResults([]);
    setPatientQuery('');
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
      dob: v.date_of_birth ? v.date_of_birth.split('T')[0] : '', gender: v.gender || 'M',
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
    if (msg === 'Patient not found') return t.rc_patientNotFound;
    if (msg === 'Visit not found') return t.rc_visitNotFound;
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

  function mb(c) { return { background: c + '18', color: c, border: '1px solid ' + c + '40', borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }; }
  async function changeStatus(v, newStatus, e) {
    if (e) e.stopPropagation();
    try {
      await api.put('/visits/' + v.id + '/status', { status: newStatus });
      await loadData();
    } catch (err) { alert(errText(err)); loadData(); }
  }

  function createOrUpdateVisit() {
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
        // The queue may be stale (visit gone, status moved on); show what is there now.
        loadData();
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

  var bd = '#232838', scBg = '#1a1f2e', pn = '#13161f', tx = '#e2e8f0', t2 = '#94a3b8', t3 = '#64748b';
  var IS = { width: '100%', background: '#0f1117', border: '1px solid #2a3142', borderRadius: 7, padding: '9px 11px', color: tx, fontSize: 17, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  var labelStyle = { fontSize: 14, fontWeight: 700, color: t3, display: 'block', marginBottom: 4 };
  var smallBtn = { borderRadius: 7, padding: '8px 13px', cursor: 'pointer', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: '#0f1117', color: tx, minHeight: '100vh', fontSize: 16 }}>
      <TopBar />
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr 440px', height: 'calc(100vh - 82px)' }}>

        {/* LEFT: Search + Patient Info */}
        <div style={{ borderRight: '1px solid ' + bd, overflow: 'auto', background: pn }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.patientSearchRegistration}</div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid ' + bd }}>
            <label style={labelStyle}>{t.existingPatientSearch}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={patientQuery} onChange={function (e) { setPatientQuery(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') searchPatients(); }} placeholder={t.searchNameChartPhone} style={Object.assign({}, IS, { flex: 1 })} />
              <button onClick={function(){ setRegFinderOpen(true); }} style={Object.assign({}, smallBtn, { background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', whiteSpace:'nowrap' })}>🔍 {t.findPatient}</button>
            </div>
            {patientLoading ? <div style={{ color: t3, fontSize: 15 }}>{t.searching}</div> : null}
            {patientResults.length > 0 ? <div style={{ border: '1px solid ' + bd, borderRadius: 8, overflow: 'hidden', maxHeight: 170, overflowY: 'auto' }}>
              {patientResults.map(function (p) {
                return <div key={p.id} onClick={function () { fillPatient(p); }} style={{ padding: '9px 10px', cursor: 'pointer', borderBottom: '1px solid #1e2433', background: selectedPatient && selectedPatient.id === p.id ? '#3b82f618' : '#111827' }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{p.last_name} {p.first_name}</div>
                  <div style={{ fontSize: 13, color: t2 }}>{p.chart_no} · {p.phone || p.mobile || ''} · {p.date_of_birth ? p.date_of_birth.split('T')[0] : ''}</div>
                </div>;
              })}
            </div> : null}
            <button onClick={startNewPatient} style={Object.assign({}, smallBtn, { background: '#10b98118', color: '#34d399', border: '1px solid #10b98140' })}>+ {t.newPatientInput}</button>
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#f59e0b12', border: '1px solid #f59e0b45', borderRadius: 8, padding: '10px 12px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 5 }}>📌 {t.receptionDeskNote}</label>
              <textarea value={form.receptionNote} onChange={function (e) { uf('receptionNote', e.target.value); }} rows={2} placeholder={t.receptionDeskNoteHint} style={Object.assign({}, IS, { resize: 'vertical', lineHeight: 1.5, background: '#11151f' })} />
            </div>
            <div><label style={labelStyle}>{t.chartNo}</label><input value={form.chartNo} readOnly style={Object.assign({}, IS, { opacity: form.chartNo ? 1 : 0.6 })} placeholder={t.newPatientAutoChart} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={labelStyle}>{t.lastName}</label><input value={form.lastName} onChange={function (e) { uf('lastName', e.target.value); }} style={IS} /></div>
              <div><label style={labelStyle}>{t.firstName}</label><input value={form.firstName} onChange={function (e) { uf('firstName', e.target.value); }} style={IS} /></div>
            </div>
            <div><label style={labelStyle}>{t.dateOfBirth}</label><DobInput value={form.dob} onChange={function (v) { uf('dob', v); }} style={IS} /></div>
            <div><label style={labelStyle}>{t.gender}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['M', 'F'].map(function (g) {
                  var label = g === 'M' ? t.male : t.female;
                  return <div key={g} className="pressable" onClick={function () { uf('gender', g); }} style={{ cursor: 'pointer', background: form.gender === g ? '#3b82f620' : '#1e2433', border: form.gender === g ? '1px solid #3b82f660' : '1px solid #2a3142', borderRadius: 7, padding: '8px 14px', fontSize: 15, color: form.gender === g ? '#60a5fa' : t2, flex: 1, textAlign: 'center', fontWeight: 700 }}>{label}</div>;
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
              }} style={IS}>
                <option value="">—</option>
                {doctors.map(function (d) { return <option key={d.id} value={d.id}>{(d.dept_code ? d.dept_code + ' – ' : '')}{d.name}</option>; })}
              </select>
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
                      style={{ flex: 1, cursor: locked ? 'not-allowed' : 'pointer', background: on ? '#3b82f620' : '#1e2433', border: on ? '1px solid #3b82f660' : '1px solid #2a3142', borderRadius: 7, padding: '8px 6px', fontSize: 15, color: on ? '#60a5fa' : t2, fontWeight: 700, opacity: locked && !on ? 0.45 : 1 }}>{x[1]}</button>;
                  })}
                </div>
                {locked ? <div style={{ fontSize: 13, color: '#fbbf24', marginTop: 5 }}>{t.rc_visitTypeLocked}</div> : null}
                {!locked && visitTypeSource === 'auto' && shown === 'followUp' ? <div style={{ fontSize: 13, color: t2, marginTop: 5 }}>{fill(t.rc_visitTypeSuggested, { dept: deptRow ? deptRow.code : '' })}</div> : null}
                {!locked && !known ? <div style={{ fontSize: 13, color: t2, marginTop: 5 }}>{fill(t.rc_visitTypeOther, { type: t[shown] || shown })}</div> : null}
              </div>;
            })()}
            <div><label style={labelStyle}>{t.chiefComplaint}</label><input value={visitForm.chiefComplaint} onChange={function (e) { uv('chiefComplaint', e.target.value); }} style={IS} /></div>
            <div><label style={labelStyle}>{t.receptionMemo}</label><textarea value={memo} onChange={function (e) { setMemo(e.target.value); }} rows={3} style={Object.assign({}, IS, { resize: 'vertical', lineHeight: 1.5 })} /></div>
            <button onClick={createOrUpdateVisit} disabled={busy} style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '12px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 16, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>{busy ? t.rc_saving : (sel ? t.updateVisit : t.registerWaiting)}</button>
            <button onClick={savePatientOnly} disabled={busy} style={{ background: '#1e2433', color: '#cbd5e1', border: '1px solid '+bd, borderRadius: 8, padding: '10px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>💾 {t.savePatientOnly}</button>
            {selectedPatient && selectedPatient.id ? <button onClick={function(){ setChartViewOpen(true); }} style={{ background: '#1e2433', color: '#ddd6fe', border: '1px solid #a855f7', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>📋 {t.chartViewer||'차트뷰어'}</button> : null}
            {sel && (sel.status === 'waiting' || sel.status === 'registered') ? <button onClick={function () { cancelVisit(sel); }} disabled={busy} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444455', borderRadius: 8, padding: '10px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>{t.cancelWaiting}</button> : null}
          </div>
        </div>

        {/* CENTER: Memo + History */}
        <div style={{ borderRight: '1px solid ' + bd, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#11141c' }}>
          {(sel || selectedPatient) ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '13px 16px', background: scBg, borderBottom: '1px solid ' + bd, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#3b82f620', borderRadius: 8, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: '#60a5fa' }}>{(form.firstName || '?')[0]}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9' }}>{form.lastName} {form.firstName}</div>
                  <div style={{ fontSize: 14, color: t2 }}>{form.chartNo || t.newPatientInput} {sel ? '· ' + (sel.dept_code || '') + ' · ' + (sel.doctor_name || '') : ''}</div>
                </div>
                {(patBal.owed>0||patBal.refund>0)?
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    {patBal.owed>0?<div style={{ background:'#ef444418', border:'1px solid #ef444450', borderRadius:6, padding:'4px 10px' }}><span style={{ fontSize:11, color:'#f87171', fontWeight:700, marginRight:5 }}>{t.owedLabel}</span><span style={{ fontFamily:'monospace', fontWeight:800, color:'#f87171' }}>{Math.round(patBal.owed).toLocaleString()} Ar</span></div>:null}
                    {patBal.refund>0?<div style={{ background:'#3b82f618', border:'1px solid #3b82f650', borderRadius:6, padding:'4px 10px' }}><span style={{ fontSize:11, color:'#60a5fa', fontWeight:700, marginRight:5 }}>{t.refundLabel}</span><span style={{ fontFamily:'monospace', fontWeight:800, color:'#60a5fa' }}>{Math.round(patBal.refund).toLocaleString()} Ar</span></div>:null}
                  </div>
                :null}
              </div>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.previousVisits}</div>
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {history.length > 0 ? history.map(function (h, i) {
                  return <div key={i} style={{ background: scBg, borderRadius: 8, padding: '12px 14px', marginBottom: 9, border: '1px solid ' + bd }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#60a5fa' }}>{h.consult_date ? h.consult_date.split('T')[0] : ''}</span>
                      <span style={{ fontSize: 13, color: t2 }}>{h.dept_code}</span>
                      <span style={{ fontSize: 13, color: t2 }}>{h.doctor_name}</span>
                    </div>
                    <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{h.note_text || h.subjective || '—'}</div>
                  </div>;
                }) : <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 15, fontStyle: 'italic' }}>{t.noPreviousVisits}</div>}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.35 }}>🔎</div>
                <div style={{ fontStyle: 'italic', fontSize: 17 }}>{t.selectPatientLeft}</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: pn }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 16, color: tx }}>{t.todayQueueCompleted}</div>
          <div style={{ padding: '8px 10px', display: 'flex', gap: 6, borderBottom: '1px solid ' + bd }}>
            {['waiting', 'in_progress', 'completed'].map(function (k) {
              var c = k === 'waiting' ? '#3b82f6' : (k === 'in_progress' ? '#f59e0b' : '#10b981');
              var n = visits.filter(function (v) { return k === 'waiting' ? (v.status === 'waiting' || v.status === 'registered') : (k === 'in_progress' ? v.status === 'in_progress' : v.status === 'completed'); }).length;
              return <button key={k} onClick={function () { setTab(k); }} style={{ background: tab === k ? c + '18' : 'transparent', color: tab === k ? c : t3, border: tab === k ? '1px solid ' + c + '40' : '1px solid transparent', borderRadius: 7, padding: '8px 10px', cursor: 'pointer', fontSize: 14, fontWeight: 800, flex: 1 }}>{t[k]} ({n})</button>;
            })}
          </div>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid ' + bd }}>
            <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={t.queueSearch} style={{ background: scBg, border: '1px solid #2a3142', borderRadius: 7, padding: '8px 10px', color: tx, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? <div style={{ padding: 24, textAlign: 'center', color: t3 }}>{t.loading}</div> :
              filteredVisits.map(function (v) {
                var isSel = sel && sel.id === v.id;
                return <div key={v.id} onClick={function () { selectVisit(v); }} style={{ padding: '12px 13px', cursor: 'pointer', borderBottom: '1px solid #1e2433', background: isSel ? '#3b82f612' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>{v.last_name} {v.first_name}</span>
                    <span style={{ background: (v.status === 'completed' ? '#10b981' : (v.status === 'in_progress' ? '#f59e0b' : '#3b82f6')) + '18', color: v.status === 'completed' ? '#10b981' : (v.status === 'in_progress' ? '#f59e0b' : '#3b82f6'), borderRadius: 4, padding: '2px 7px', fontSize: 12, fontWeight: 800 }}>{v.status === 'completed' ? t.completed : (v.status === 'in_progress' ? t.in_progress : t.waiting)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: t2 }}>{v.chart_no} · {v.dept_code || ''} · {v.doctor_name || ''}</div>
                  <div style={{ fontSize: 13, color: t3, marginTop: 3 }}>{v.chief_complaint || ''}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }} onClick={function (e) { e.stopPropagation(); }}>
                    {(v.status === 'waiting' || v.status === 'registered') ? <button onClick={function (e) { changeStatus(v, 'completed', e); }} style={mb('#10b981')}>{t.toCompleted}</button> : null}
                    {v.status === 'in_progress' ? <button onClick={function (e) { changeStatus(v, 'waiting', e); }} style={mb('#3b82f6')}>{t.toWaiting}</button> : null}
                    {v.status === 'in_progress' ? <button onClick={function (e) { changeStatus(v, 'completed', e); }} style={mb('#10b981')}>{t.toCompleted}</button> : null}
                    {v.status === 'completed' ? <button onClick={function (e) { changeStatus(v, 'waiting', e); }} style={mb('#3b82f6')}>{t.toWaiting}</button> : null}
                  </div>
                </div>;
              })}
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid ' + bd, background: '#161a26', fontSize: 14, color: t3 }}>{t.total} <strong style={{ color: tx }}>{filteredVisits.length}</strong> {t.countPatients}</div>
        </div>
      </div>
      <DocumentModal open={chartViewOpen} onClose={function(){ setChartViewOpen(false); }} category="chart" readOnly={true}
        patient={selectedPatient ? { id: selectedPatient.id, chart_no: selectedPatient.chart_no, last_name: selectedPatient.last_name, first_name: selectedPatient.first_name, gender: form.gender, date_of_birth: form.dob } : null}
        context={{}} />
      {similarAsk ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div role="dialog" aria-modal="true" style={{ background: pn, border: '1px solid #2a3142', borderRadius: 12, width: 760, maxWidth: '94vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + bd, background: scBg }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#fbbf24' }}>⚠ {t.rc_similarTitle}</div>
              <div style={{ fontSize: 14, color: t2, marginTop: 4 }}>{t.rc_similarHint}</div>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: scBg }}>
                  {[t.chartNo, t.name, t.dob, t.phone, t.rc_lastVisit, ''].map(function (h, i) { return <th key={i} style={{ textAlign: 'left', padding: '8px 12px', color: t3, fontWeight: 700, fontSize: 12 }}>{h}</th>; })}
                </tr></thead>
                <tbody>
                  {similarAsk.list.map(function (p) {
                    return <tr key={p.id} style={{ borderTop: '1px solid #1e2433' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#60a5fa' }}>{p.chart_no}</td>
                      <td style={{ padding: '9px 12px', color: tx, fontWeight: 700 }}>{p.last_name} {p.first_name}{p.gender ? ' (' + p.gender + ')' : ''}</td>
                      <td style={{ padding: '9px 12px', color: t2 }}>{p.date_of_birth ? String(p.date_of_birth).split('T')[0] : '—'}</td>
                      <td style={{ padding: '9px 12px', color: t2, fontFamily: 'monospace' }}>{p.mobile || p.phone || '—'}</td>
                      <td style={{ padding: '9px 12px', color: t2 }}>{p.last_visit_date ? String(p.last_visit_date).split('T')[0] : '—'}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}><button type="button" onClick={function () { answerSimilar({ action: 'use', patient: p }); }} style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f660', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{t.rc_similarUse}</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid ' + bd, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={function () { answerSimilar({ action: 'cancel' }); }} style={{ background: '#1e2433', color: t2, border: '1px solid #2a3142', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.rc_cancel}</button>
              <button type="button" onClick={function () { answerSimilar({ action: 'new' }); }} style={{ background: '#10b98118', color: '#34d399', border: '1px solid #10b98140', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>{t.rc_similarCreate}</button>
            </div>
          </div>
        </div>
      ) : null}
      <PatientFinder open={regFinderOpen} onClose={function(){ setRegFinderOpen(false); }} mode="patient"
        onPickPatient={function(p){ fillPatient(p); }} />
    </div>
  );
}
