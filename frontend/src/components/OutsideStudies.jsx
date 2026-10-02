import { useState, useEffect } from 'react';
import { api, getUser } from '../api/client.js';

// Images brought in from another establishment's disc (backend routes/pacs.import.js).
// They hang on the patient, not on an order: the program "Bethesda CD" brings them in at
// reception, and the imaging window (RadiologyReadings.jsx) lists them under the patient's
// own exams. There is no reading box - the doctor's opinion goes into the consultation
// note - and nothing to pay. What is here: the chosen study's details, the window that
// opens it in the viewer, and taking out an import that was made by mistake.
// A study of GET /api/pacs/import/list:
//   { id, study_date 'YYYYMMDD', modality, description, institution, image_count, bytes,
//     imported_at, imported_by, came_as { patient_id, patient_name, birth_date, sex },
//     birth_differed, sex_differed, undrawn [] }

// 'YYYYMMDD' as the images carry it -> 'YYYY-MM-DD' ('' stays '').
export function outsideDate(d) {
  var s = String(d || '');
  return /^\d{8}$/.test(s) ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : s;
}
export function outsideName(x, t) { return x.description || x.modality || t.px_xChip; }
function sizeOf(bytes) {
  var mb = (Number(bytes) || 0) / 1048576;
  if (mb < 0.1) return Math.max(1, Math.round(mb * 1024)) + ' KB';
  return (mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10) + ' MB';
}
function when(d) {
  var x = new Date(String(d || ''));
  if (isNaN(x.getTime())) return '';
  return x.toLocaleDateString('en-CA') + ' ' + ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2);
}
// The server's refusal in the screen's language, by its code (pacs.import.js WHY).
function why(t, e) { return (e && e.code && t['px_xErr_' + e.code]) || (e && e.message) || ''; }

// The image window of one outside study: the viewer alone, no reading box.
//   props.study  props.t  props.patientLine  props.onClose()
export function OutsideViewer(props) {
  var t = props.t, x = props.study;
  var us = useState(''), url = us[0], setUrl = us[1];
  var es = useState(''), err = es[0], setErr = es[1];
  useEffect(function () {
    setUrl(''); setErr('');
    api.get('/pacs/import/' + x.id + '/viewer-url').then(function (r) { setUrl(r.url || ''); }).catch(function (e) { setErr(why(t, e) || 'error'); });
  }, [x.id]);
  var btn = { whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '94vw', height: '92vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--violet-text)', whiteSpace: 'nowrap', flexShrink: 0 }}>🖼 {t.imageViewer}</span>
          <span style={{ background: 'var(--warn-chip)', color: 'var(--warn-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{t.px_xChip}</span>
          <span style={{ color: 'var(--text-soft)', fontSize: 14, fontWeight: 700, minWidth: 0 }}>{outsideName(x, t)}</span>
          <span style={{ color: 'var(--text-2)', fontSize: 13, flex: '1 1 0', minWidth: 0 }}>{[outsideDate(x.study_date), x.institution, props.patientLine].filter(Boolean).join(' · ')}</span>
          {url ? <a href={url} target="_blank" rel="noreferrer" style={Object.assign({}, btn, { marginLeft: 'auto', background: 'var(--chip)', color: 'var(--violet-text)', border: '1px solid var(--border-2)', textDecoration: 'none' })}>{t.openNewTab} ↗</a> : null}
          <button onClick={props.onClose} style={Object.assign({}, btn, { marginLeft: url ? 0 : 'auto', background: 'var(--btn-neutral-2)', color: 'var(--text)', border: 'none', padding: '6px 14px' })}>{t.close || '닫기'} ✕</button>
        </div>
        {url
          ? <iframe src={url} title="PACS Viewer" style={{ flex: 1, border: 0, background: '#000' }}></iframe>
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--viewer-text)', fontSize: 14, textAlign: 'center', padding: 20, background: '#000' }}>{err ? t.px_xOpenFail + err : (t.loading || 'Loading…')}</div>}
      </div>
    </div>
  );
}

// The chosen outside study, in the right half of the imaging window.
//   props.study  props.t
//   props.onOpen()   shows "view the images" (the consultation screen; the payment screen has no image window)
//   props.onDone()   the list is read again (after the study was taken out)
export function OutsideDetail(props) {
  var t = props.t, x = props.study;
  var as = useState(false), asking = as[0], setAsking = as[1];
  var rs = useState(''), reason = rs[0], setReason = rs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  useEffect(function () { setAsking(false); setReason(''); }, [x.id]);
  var u = getUser(), perms = (u && Array.isArray(u.permissions)) ? u.permissions : [];
  var mayUndo = perms.indexOf('consultation') >= 0 || perms.indexOf('settings') >= 0;

  async function undo() {
    if (busy || !reason.trim()) return;
    setBusy(true);
    try {
      await api.post('/pacs/import/' + x.id + '/undo', { reason: reason.trim() });
      setAsking(false); props.onDone();
    } catch (e) { alert(t.px_xUndoFail + why(t, e)); }
    setBusy(false);
  }

  var tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', bd = 'var(--border)';
  var label = { color: t3, fontSize: 12, whiteSpace: 'nowrap', paddingRight: 10, verticalAlign: 'top' };
  var came = x.came_as || {};
  var cameName = String(came.patient_name || '').replace(/\^+/g, ' ').trim();
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {x.modality ? <span style={{ background: 'var(--accent-chip)', color: 'var(--accent-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{x.modality}</span> : null}
      <span style={{ color: tx, fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{outsideName(x, t)}</span>
      <span style={{ background: 'var(--warn-chip)', color: 'var(--warn-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700, flex: 'none' }}>{t.px_xChip}</span>
      {props.onOpen ? <button onClick={props.onOpen} style={{ marginLeft: 'auto', flex: 'none', background: 'var(--violet-strong-a22)', color: 'var(--violet-text)', border: '1px solid var(--violet-strong-a55)', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖼 {t.viewImage}</button> : null}
    </div>
    <table style={{ borderCollapse: 'collapse', fontSize: 13, color: tx, marginBottom: 8 }}><tbody>
      <tr><td style={label}>{t.px_xStudyDate}</td><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{outsideDate(x.study_date) || '—'}</td></tr>
      <tr><td style={label}>{t.px_xFrom}</td><td style={{ fontWeight: 700 }}>{x.institution || <span style={{ color: t3, fontWeight: 400 }}>{t.px_xFromUnknown}</span>}</td></tr>
      <tr><td style={label}>{t.px_colImages}</td><td style={{ color: 'var(--ok-text)', fontWeight: 700 }}>{String(t.px_imgShort || '').replace('{n}', x.image_count == null ? '?' : x.image_count)} · {sizeOf(x.bytes)}</td></tr>
      <tr><td style={label}>{t.px_xImported}</td><td>{[x.imported_by, when(x.imported_at)].filter(Boolean).join(' · ')}</td></tr>
      {cameName || came.patient_id ? <tr><td style={label}>{t.px_xCameAs}</td><td>{[cameName, came.patient_id].filter(Boolean).join(' · ')}</td></tr> : null}
    </tbody></table>
    {x.birth_differed ? <div style={{ margin: '0 0 6px', padding: '6px 9px', borderRadius: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.5, background: 'var(--warn-chip)', color: 'var(--warn-text-2)', border: '1px solid var(--warn-strong)' }}>⚠ {String(t.px_xBirthDiffered || '').replace('{d}', outsideDate(came.birth_date) || '—')}</div> : null}
    {x.sex_differed ? <div style={{ margin: '0 0 6px', padding: '6px 9px', borderRadius: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.5, background: 'var(--warn-chip)', color: 'var(--warn-text-2)', border: '1px solid var(--warn-strong)' }}>⚠ {String(t.px_xSexDiffered || '').replace('{s}', came.sex || '—')}</div> : null}
    {x.undrawn && x.undrawn.length ? <div style={{ fontSize: 12, color: 'var(--warn-text)', margin: '0 0 8px', lineHeight: 1.45 }}>{String(t.px_xUndrawn || '').replace('{list}', x.undrawn.join(', '))}</div> : null}
    <div style={{ fontSize: 13, color: t2, lineHeight: 1.5, background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 6, padding: '9px 12px', margin: '4px 0 10px' }}>{t.px_xNoReading}</div>
    {mayUndo ? (asking
      ? <div style={{ border: '1px solid var(--danger-deep)', borderRadius: 6, padding: '9px 12px', background: 'var(--bg)' }}>
          <div style={{ fontSize: 13, color: tx, lineHeight: 1.5, marginBottom: 7 }}>{t.px_xUndoAsk}</div>
          <input autoFocus value={reason} maxLength={300} onChange={function (e) { setReason(e.target.value); }} placeholder={t.px_xUndoReason}
            onKeyDown={function (e) { if (e.key === 'Enter') undo(); }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '5px 8px', outline: 'none', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={function () { setAsking(false); }} disabled={busy} style={{ background: 'var(--btn-neutral-2)', color: tx, border: 'none', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t.cancel || '취소'}</button>
            <button onClick={undo} disabled={busy || !reason.trim()} style={{ background: reason.trim() && !busy ? 'var(--danger-deep)' : 'var(--chip)', color: reason.trim() && !busy ? 'var(--on-fill)' : t3, border: 'none', borderRadius: 5, padding: '5px 12px', cursor: reason.trim() && !busy ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>{t.px_xUndoGo}</button>
          </div>
        </div>
      : <div><button onClick={function () { setAsking(true); }} style={{ background: 'var(--chip)', color: 'var(--text-soft)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ {t.px_xUndo}</button></div>) : null}
  </>;
}
