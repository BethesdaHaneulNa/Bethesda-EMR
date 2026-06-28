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
};

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
  var today = new Date().toISOString().slice(0, 10);
  var doctor = { name: ctx.doctor_name || (user && user.name) || '', dept_code: ctx.dept_code || '' };

  function buildValues(tpl) {
    var v = {};
    (tpl.fields || []).forEach(function (f) {
      v[f.key] = f.autofill ? autofillValue(f.autofill, ctx) : (f.default != null ? f.default : '');
    });
    return v;
  }

  useEffect(function () {
    if (!props.open || !props.patient) return;
    setLang(langCtx.lang || 'en');
    setMode('new'); setViewed(null);
    var first = visible[0];
    setCode(first ? first.code : '');
    setValues(buildValues(first));
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
    if (!props.patient) return;
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
    printDocument(previewRef.current, (mode === 'view' && viewed ? viewed.doc_no : 'document'));
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
    pv = <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontFamily: 'system-ui,sans-serif' }}>{L(UI.noHistory, lang)}</div>;
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

  var dk = '#1a1f2e', bd = '#2a3142', tx = '#e2e8f0', t2 = '#94a3b8';
  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };

  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '96vw', height: '94vh', background: '#0f1117', border: '1px solid ' + bd, borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: tx }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid ' + bd, background: dk }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{catIcon} {L(catTitle, lang)}</span>
          {props.patient ? <span style={{ color: t2, fontSize: 13 }}>{props.patient.chart_no} · {props.patient.last_name} {props.patient.first_name}</span> : null}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: t2 }}>{L(UI.lang, lang)}</span>
            {['fr', 'en', 'ko'].map(function (l) {
              return <button key={l} onClick={function () { setLang(l); }} style={Object.assign({}, btn, { padding: '4px 9px', background: lang === l ? '#2563eb' : '#1e2433', color: lang === l ? '#fff' : t2 })}>{l.toUpperCase()}</button>;
            })}
            <button onClick={props.onClose} style={Object.assign({}, btn, { background: '#374151', color: tx })}>{L(UI.close, lang)} ✕</button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* templates */}
          {!props.readOnly ? <div style={{ width: 160, borderRight: '1px solid ' + bd, background: '#0c0f16', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: t2, textTransform: 'uppercase' }}>{L(UI.templates, lang)}</div>
            {visible.map(function (tp) {
              var on = tp.code === code && mode === 'new';
              return <div key={tp.code} onClick={function () { selectTemplate(tp.code); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderLeft: on ? '3px solid #3b82f6' : '3px solid transparent', background: on ? '#3b82f612' : 'transparent', color: on ? '#93c5fd' : tx }}>{L(tp.name, lang)}</div>;
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
                    ? <textarea value={values[f.key] || ''} onChange={function (e) { setField(f.key, e.target.value); }} rows={f.rows || 3} style={{ width: '100%', boxSizing: 'border-box', background: '#0c0f16', border: '1px solid ' + bd, borderRadius: 4, color: tx, fontSize: 13, padding: '6px 8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    : <input value={values[f.key] || ''} onChange={function (e) { setField(f.key, e.target.value); }} style={{ width: '100%', boxSizing: 'border-box', background: '#0c0f16', border: '1px solid ' + bd, borderRadius: 4, color: tx, fontSize: 13, padding: '6px 8px', outline: 'none' }} />}
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
          <div style={{ width: 230, borderLeft: '1px solid ' + bd, background: '#0c0f16', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: t2, textTransform: 'uppercase' }}>{L(UI.history, lang)}</div>
            {histList.length === 0 ? <div style={{ padding: 12, color: '#475569', fontSize: 12 }}>{L(UI.noHistory, lang)}</div> : null}
            {histList.map(function (d) {
              var on = viewed && viewed.id === d.id;
              var tn = (getTemplate(d.template_code) && L(getTemplate(d.template_code).name, lang)) || d.template_name || d.template_code;
              return <div key={d.id} onClick={function () { openSaved(d); }} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #161b27', background: on ? '#3b82f612' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: d.voided ? '#ef4444' : '#cbd5e1', textDecoration: d.voided ? 'line-through' : 'none' }}>{d.doc_no}</span>
                  {d.voided ? <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{L(UI.voided, lang)}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: t2 }}>{tn}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(d.issued_at)} · {d.issued_by_name || ''}</div>
              </div>;
            })}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid ' + bd, background: dk, justifyContent: 'flex-end' }}>
          {mode === 'view' && !props.readOnly ? <button onClick={newDoc} style={Object.assign({}, btn, { background: '#1e2433', color: t2 })}>{L(UI.newDoc, lang)}</button> : null}
          {mode === 'view' && viewed && !viewed.voided && !props.readOnly ? <button onClick={doVoid} style={Object.assign({}, btn, { background: '#7f1d1d', color: '#fecaca' })}>{L(UI.voidBtn, lang)}</button> : null}
          {mode === 'view' ? <button onClick={doPrint} style={Object.assign({}, btn, { background: '#374151', color: tx })}>🖨 {L(UI.reprint, lang)}</button> : null}
          {!props.readOnly && mode !== 'view' ? <button onClick={doPrint} style={Object.assign({}, btn, { background: '#374151', color: tx })}>🖨 {L(UI.print, lang)}</button> : null}
          {mode === 'new' && !props.readOnly ? <button onClick={doIssue} disabled={saving} style={Object.assign({}, btn, { background: saving ? '#1e3a5f' : '#16a34a', color: '#fff' })}>{saving ? '…' : L(UI.issue, lang)}</button> : null}
        </div>
      </div>
    </div>
  );
}
