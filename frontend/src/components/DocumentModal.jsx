import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';
import { TEMPLATES, getTemplate, autofillValue, templatesByCategory } from '../documents/registry.js';
import { L, fmtDate, printDocument } from '../documents/shared.jsx';

var UI = {
  title:     { ko: '문서 발급', en: 'Issue Document', fr: 'Émettre un document' },
  templates: { ko: '서식', en: 'Templates', fr: 'Formulaires' },
  history:   { ko: '발급 이력', en: 'History', fr: 'Historique' },
  noHistory: { ko: '발급 이력 없음', en: 'No documents issued', fr: 'Aucun document émis' },
  issue:     { ko: '발급 (저장)', en: 'Issue (Save)', fr: 'Émettre' },
  print:     { ko: '출력', en: 'Print', fr: 'Imprimer' },
  reprint:   { ko: '재출력', en: 'Reprint', fr: 'Réimprimer' },
  voidBtn:   { ko: '발급 취소', en: 'Void', fr: 'Annuler' },
  voided:    { ko: '취소됨', en: 'VOID', fr: 'ANNULÉ' },
  newDoc:    { ko: '+ 새 문서', en: '+ New', fr: '+ Nouveau' },
  close:     { ko: '닫기', en: 'Close', fr: 'Fermer' },
  lang:      { ko: '언어', en: 'Lang', fr: 'Langue' },
  draft:     { ko: '미발급(초안)', en: 'DRAFT', fr: 'BROUILLON' },
  fillForm:  { ko: '내용 입력', en: 'Fill in', fr: 'Saisie' },
  bracketHint: { ko: '아직 고치지 않은 칸', en: 'Still to fill in', fr: 'À compléter' },
  bracketConfirm: {
    ko: '아직 고치지 않은 [ ] 칸이 있습니다:\n{list}\n\n이대로 발급하면 괄호째 인쇄되어 기록에 남습니다. 그래도 발급할까요?',
    en: 'Some [ ] placeholders are still in the text:\n{list}\n\nIf you issue now they print as they are and stay on the record. Issue anyway?',
    fr: 'Il reste des champs [ ] à compléter :\n{list}\n\nSi vous émettez maintenant, ils seront imprimés tels quels et resteront dans le dossier. Émettre quand même ?',
  },
};

// Next value of a 'checks' field after ticking or unticking `opt`. The field's own rule
// decides (see the note above YESNO in documents/surgical-records.jsx):
//   f.single      - one answer; a new tick replaces the old one.
//   f.noneOption  - "None" and the real answers exclude each other.
//   otherwise     - any combination, kept in option order.
// Stored as one comma-joined string, as before, so saved documents read the same.
function nextChecks(f, cur, opt, on) {
  if (on) return cur.filter(function (x) { return x !== opt; }).join(', ');
  if (f.single) return opt;
  var none = f.noneOption;
  var keep = cur.filter(function (x) { return none ? (opt === none ? false : x !== none) : true; });
  return f.options.filter(function (o) { return keep.indexOf(o) >= 0 || o === opt; }).join(', ');
}

// Default texts mark the parts the surgeon must choose in square brackets -
// "Under [anesthesia], in [lithotomy/jackknife] position". Left as they are, the
// brackets print on a signed record. This finds the ones still there.
function openBrackets(s) {
  return String(s || '').match(/\[[^\[\]\n]{1,60}\]/g) || [];
}

function pickPatient(p) {
  if (!p) return {};
  return {
    id: p.id, chart_no: p.chart_no, last_name: p.last_name, first_name: p.first_name,
    national_id: p.national_id, date_of_birth: p.date_of_birth, gender: p.gender,
    phone: p.phone, mobile: p.mobile, address: p.address,
  };
}

export function DocumentModal(props) {
  var langCtx = useLang();
  var ctx = props.context || {};
  var user = getUser();

  var category = props.category || 'document';
  var visible = templatesByCategory(category);
  var visibleCodes = visible.map(function (t) { return t.code; });

  var [lang, setLang] = useState(langCtx.lang || 'en');
  var [code, setCode] = useState(visible[0] ? visible[0].code : '');
  var [values, setValues] = useState({});
  var [clinic, setClinic] = useState(null);
  var [fullPatient, setFullPatient] = useState(null);
  var [history, setHistory] = useState([]);
  var [mode, setMode] = useState('new');   // 'new' | 'view'
  var [viewed, setViewed] = useState(null); // saved document being viewed/reprinted
  var [saving, setSaving] = useState(false);
  var [meds, setMeds] = useState([]);
  var previewRef = useRef(null);

  var template = getTemplate(code) || visible[0] || TEMPLATES[0];
  // A template may say it has nothing to issue (the outside prescription with no drug
  // marked external): { ko, en, fr } reason, or null. Pharmacy session, 2026-09-29.
  var issueBlocked = template && template.issueBlocked ? template.issueBlocked(meds) : null;
  // The issue date in the clinic's own time. toISOString() is UTC, which in Madagascar
  // (UTC+3) dated anything issued between midnight and 03:00 the day before.
  var now = new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  // Who signs (decision 2026-09-29): the doctor who writes and issues the document, that
  // is the account logged in, when it is a doctor's. It used to be the visit's assigned
  // doctor, so a letter written by another doctor carried a colleague's name.
  // An account that is not a doctor's (admin, cashier, pharmacy) never puts its own name
  // on the doctor's line: the visit's doctor is printed as before, or, with none, the
  // line stays blank to be signed by hand. A document already issued keeps the name it
  // was issued with (its saved payload is printed as it is).
  // The same name fills the fields that autofill 'doctor' (the surgeon on an op note).
  var signer = user && user.role === 'doctor' ? (user.name || '') : (ctx.doctor_name || '');
  var doctor = { name: signer, dept_code: ctx.dept_code || '' };
  var fillCtx = Object.assign({}, ctx, { doctor_name: signer });

  // lg: the document language, for text an autofill writes (the medication lines).
  function buildValues(tpl, lg) {
    var v = {};
    (tpl.fields || []).forEach(function (f) {
      v[f.key] = f.autofill ? autofillValue(f.autofill, fillCtx, lg || lang) : (f.default != null ? f.default : '');
    });
    return v;
  }

  useEffect(function () {
    if (!props.open || !props.patient) return;
    setLang(langCtx.lang || 'en');
    setMode('new'); setViewed(null);
    var first = visible[0];
    setCode(first ? first.code : '');
    setValues(buildValues(first, langCtx.lang || 'en'));
    api.get('/admin/clinic').then(setClinic).catch(function () { setClinic(null); });
    api.get('/patients/' + props.patient.id).then(setFullPatient).catch(function () { setFullPatient(null); });
    setMeds([]);
    if (ctx.visit_id) api.get('/consultations/visit/' + ctx.visit_id + '/prescriptions').then(function (m) { setMeds(m || []); }).catch(function () { setMeds([]); });
    loadHistory();
  }, [props.open, props.patient && props.patient.id, category]);

  function loadHistory() {
    if (!props.patient) return;
    api.get('/documents/patient/' + props.patient.id).then(function (h) {
      setHistory(h || []);
      if (props.readOnly) {
        var vis = (h || []).filter(function (d) { return visibleCodes.indexOf(d.template_code) >= 0; });
        if (vis.length) openSaved(vis[0]);
      }
    }).catch(function () {});
  }

  function selectTemplate(c) {
    setMode('new'); setViewed(null); setCode(c);
    setValues(buildValues(getTemplate(c)));
  }

  function newDoc() {
    setMode('new'); setViewed(null);
    setValues(buildValues(template));
  }

  function setField(k, val) {
    setValues(function (prev) { var n = Object.assign({}, prev); n[k] = val; return n; });
  }

  async function doIssue() {
    if (!props.patient || issueBlocked) return;
    // Issuing is what makes the text a record, so this is the point to stop an
    // unfinished "[anesthesia]" - a draft print is marked DRAFT and is left alone.
    var left = [];
    (template.fields || []).forEach(function (f) {
      if (f.type === 'checks') return;
      openBrackets(values[f.key]).forEach(function (b) { if (left.indexOf(b) < 0) left.push(b); });
    });
    if (left.length && !window.confirm(L(UI.bracketConfirm, lang).replace('{list}', left.join('  ')))) return;
    setSaving(true);
    var payload = {
      values: values,
      patient: pickPatient(fullPatient || props.patient),
      clinic: clinic,
      doctor: doctor,
      meds: meds,
      dateStr: today,
      lang: lang,
    };
    try {
      var saved = await api.post('/documents', {
        template_code: template.code,
        template_name: L(template.name, 'en'),
        patient_id: props.patient.id,
        visit_id: ctx.visit_id || null,
        consultation_id: ctx.consultation_id || null,
        lang: lang,
        payload: payload,
      });
      loadHistory();
      openSaved(saved);
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  function openSaved(doc) {
    setViewed(doc); setMode('view');
    if (doc.payload && doc.payload.lang) setLang(doc.payload.lang);
    setCode(doc.template_code);
  }

  async function doVoid() {
    if (!viewed) return;
    var reason = window.prompt(lang === 'ko' ? '발급 취소 사유:' : lang === 'fr' ? "Motif d'annulation:" : 'Void reason:');
    if (reason === null) return;
    try {
      var upd = await api.post('/documents/' + viewed.id + '/void', { reason: reason });
      setViewed(upd); loadHistory();
    } catch (e) { alert('Error: ' + e.message); }
  }

  function doPrint() {
    printDocument(previewRef.current, (mode === 'view' && viewed ? viewed.doc_no : 'document'), lang);
  }

  if (!props.open) return null;

  // resolve what to render in the preview
  var pv;
  if (mode === 'view' && viewed) {
    var P = viewed.payload || {};
    var Tpl = getTemplate(viewed.template_code) || template;
    pv = <Tpl.Layout values={P.values || {}} patient={P.patient || {}} clinic={P.clinic || clinic}
                     doctor={P.doctor || doctor} meds={P.meds || []} lang={lang} docNo={viewed.doc_no} dateStr={P.dateStr || ''} />;
  } else if (props.readOnly) {
    pv = <div style={{ padding: 60, textAlign: 'center', color: '#475569' /* on the white paper, the same on both screens */, fontFamily: 'system-ui,sans-serif' }}>{L(UI.noHistory, lang)}</div>;
  } else {
    pv = <template.Layout values={values} patient={fullPatient || props.patient} clinic={clinic}
                          doctor={doctor} meds={meds} lang={lang} docNo={'(' + L(UI.draft, lang) + ')'} dateStr={today} />;
  }
  var isVoided = mode === 'view' && viewed && viewed.voided;

  var catTitle = category === 'prescription'
    ? { ko: '원외 처방전 발행', en: 'Outside Prescription', fr: 'Ordonnance externe' }
    : category === 'chart'
      ? (props.readOnly ? { ko: '차트뷰어', en: 'Chart Viewer', fr: 'Dossier clinique' } : { ko: '차트기록', en: 'Chart Record', fr: 'Dossier clinique' })
      : UI.title;
  var catIcon = category === 'prescription' ? '💊' : category === 'chart' ? '📋' : '📄';
  var histList = history.filter(function (d) { return visibleCodes.indexOf(d.template_code) >= 0; });

  var dk = 'var(--panel-head)', bd = 'var(--border-2)', tx = 'var(--text)', t2 = 'var(--text-2)';
  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };

  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '96vw', height: '94vh', background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: tx }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid ' + bd, background: dk }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{catIcon} {L(catTitle, lang)}</span>
          {props.patient ? <span style={{ color: t2, fontSize: 13 }}>{props.patient.chart_no} · {props.patient.last_name} {props.patient.first_name}</span> : null}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: t2 }}>{L(UI.lang, lang)}</span>
            {['fr', 'en', 'ko'].map(function (l) {
              return <button key={l} onClick={function () { setLang(l); }} style={Object.assign({}, btn, { padding: '4px 9px', background: lang === l ? 'var(--accent-strong)' : 'var(--chip)', color: lang === l ? 'var(--on-fill)' : t2 })}>{l.toUpperCase()}</button>;
            })}
            <button onClick={props.onClose} style={Object.assign({}, btn, { background: 'var(--btn-neutral-2)', color: tx })}>{L(UI.close, lang)} ✕</button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* templates */}
          {!props.readOnly ? <div style={{ width: 160, borderRight: '1px solid ' + bd, background: 'var(--bg-deep)', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: t2, textTransform: 'uppercase' }}>{L(UI.templates, lang)}</div>
            {visible.map(function (tp) {
              var on = tp.code === code && mode === 'new';
              return <div key={tp.code} className="pressable" onClick={function () { selectTemplate(tp.code); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderLeft: on ? '3px solid var(--accent-ink)' : '3px solid transparent', background: on ? 'var(--accent-a12)' : 'transparent', color: on ? 'var(--accent-text-2)' : tx }}>{L(tp.name, lang)}</div>;
            })}
          </div> : null}

          {/* form (new mode only) */}
          {mode === 'new' && !props.readOnly ? (
            <div style={{ width: 300, borderRight: '1px solid ' + bd, background: dk, overflow: 'auto', flexShrink: 0, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t2, textTransform: 'uppercase', marginBottom: 8 }}>{L(UI.fillForm, lang)}</div>
              {(template.fields || []).map(function (f) {
                return <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, color: t2, marginBottom: 3 }}>{L(f.label, lang)}</label>
                  {f.type === 'textarea'
                    ? <textarea value={values[f.key] || ''} onChange={function (e) { setField(f.key, e.target.value); }} rows={f.rows || 3} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--field-4)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '6px 8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    : f.type === 'checks'
                    /* Operation notes are mostly a fixed set of findings the surgeon picks from
                       (hernia type, appendicitis type, drain site). Typing those out every time is
                       slower and spells them differently each time, which makes them useless to
                       count later. Selections are stored as one comma-joined string so the saved
                       document, the print layout and the history list all keep working unchanged. */
                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', background: 'var(--field-4)', border: '1px solid var(--field-border)', borderRadius: 4, padding: '7px 9px' }}>
                        {(f.options || []).map(function (opt) {
                          var cur = String(values[f.key] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                          var on = cur.indexOf(opt) >= 0;
                          return <label key={opt} className="pressable" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12.5, color: on ? tx : t2, whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={on} onChange={function () { setField(f.key, nextChecks(f, cur, opt, on)); }} />
                            {/* optionLabel: the template's display text in the document
                                language. The stored value stays `opt`. */}
                            {f.optionLabel ? f.optionLabel(opt, lang) : opt}
                          </label>;
                        })}
                      </div>
                    // type 'date': a date picker (the operation date - it was a free text box)
                    : <input type={f.type === 'date' ? 'date' : 'text'} value={values[f.key] || ''} onChange={function (e) { setField(f.key, e.target.value); }} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--field-4)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '6px 8px', outline: 'none' }} />}
                  {f.type !== 'checks' && openBrackets(values[f.key]).length
                    ? <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--warn-text)', lineHeight: 1.4 }}>⚠ {L(UI.bracketHint, lang)}: {openBrackets(values[f.key]).join('  ')}</div>
                    : null}
                </div>;
              })}
            </div>
          ) : null}

          {/* preview */}
          <div style={{ flex: 1, overflow: 'auto', background: '#4b5563', padding: 18, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 780 }}>
              <div ref={previewRef} style={{ position: 'relative', background: '#fff' }}>
                {pv}
                {isVoided ? <div style={{ position: 'absolute', top: '42%', left: 0, right: 0, textAlign: 'center', transform: 'rotate(-18deg)', fontSize: 80, fontWeight: 900, color: 'rgba(220,38,38,0.32)', letterSpacing: 6, pointerEvents: 'none' }}>{L(UI.voided, lang)}</div> : null}
              </div>
            </div>
          </div>

          {/* history */}
          <div style={{ width: 230, borderLeft: '1px solid ' + bd, background: 'var(--bg-deep)', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: t2, textTransform: 'uppercase' }}>{L(UI.history, lang)}</div>
            {histList.length === 0 ? <div style={{ padding: 12, color: 'var(--text-4)', fontSize: 12 }}>{L(UI.noHistory, lang)}</div> : null}
            {histList.map(function (d) {
              var on = viewed && viewed.id === d.id;
              var tn = (getTemplate(d.template_code) && L(getTemplate(d.template_code).name, lang)) || d.template_name || d.template_code;
              return <div key={d.id} onClick={function () { openSaved(d); }} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft-2)', background: on ? 'var(--accent-a12)' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: d.voided ? 'var(--danger-ink)' : 'var(--text-soft)', textDecoration: d.voided ? 'line-through' : 'none' }}>{d.doc_no}</span>
                  {d.voided ? <span style={{ fontSize: 10, color: 'var(--danger-ink)', fontWeight: 700 }}>{L(UI.voided, lang)}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: t2 }}>{tn}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(d.issued_at)} · {d.issued_by_name || ''}</div>
              </div>;
            })}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid ' + bd, background: dk, justifyContent: 'flex-end' }}>
          {mode === 'view' && !props.readOnly ? <button onClick={newDoc} style={Object.assign({}, btn, { background: 'var(--chip)', color: t2 })}>{L(UI.newDoc, lang)}</button> : null}
          {mode === 'view' && viewed && !viewed.voided && !props.readOnly ? <button onClick={doVoid} style={Object.assign({}, btn, { background: 'var(--danger-box)', color: 'var(--danger-text-3)' })}>{L(UI.voidBtn, lang)}</button> : null}
          {mode === 'view' ? <button onClick={doPrint} style={Object.assign({}, btn, { background: 'var(--btn-neutral-2)', color: tx })}>🖨 {L(UI.reprint, lang)}</button> : null}
          {!props.readOnly && mode !== 'view' ? <button onClick={doPrint} style={Object.assign({}, btn, { background: 'var(--btn-neutral-2)', color: tx })}>🖨 {L(UI.print, lang)}</button> : null}
          {mode === 'new' && !props.readOnly && issueBlocked ? <div style={{ flex: 1, alignSelf: 'center', color: 'var(--warn-text)', fontSize: 13, fontWeight: 700 }}>⚠ {L(issueBlocked, lang)}</div> : null}
          {mode === 'new' && !props.readOnly ? <button onClick={doIssue} disabled={saving || !!issueBlocked} style={Object.assign({}, btn, { background: saving ? 'var(--accent-chip)' : issueBlocked ? 'var(--btn-neutral)' : 'var(--ok-2)', color: issueBlocked ? 'var(--text-2)' : 'var(--on-fill)', cursor: issueBlocked ? 'not-allowed' : btn.cursor })}>{saving ? '…' : L(UI.issue, lang)}</button> : null}
        </div>
      </div>
    </div>
  );
}
