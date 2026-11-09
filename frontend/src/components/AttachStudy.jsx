import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// "Images without an order": an exam done without picking the patient from the device's
// worklist reached the image server under the device's own patient number and a typed name.
// This window puts such a study under the order it was taken for (the clinic's manager,
// 2026-11-09; server: backend/src/routes/pacs.attach.js). The person chooses on both sides -
// the study (what the images say, a thumbnail) and the order (the EMR's patient) - and
// confirms; nothing is matched for them, because the typed name and birth date and the
// device's clock are not to be trusted. The images are corrected on the image server (the
// EMR's patient and the order's numbers), the order shows them, the original is deleted
// after the copy has been checked. Written in the change log.
//   props.t  translations   props.onClose()   props.onDone()  read the list again

function fill(text, values) {
  return String(text || '').replace(/\{(\w+)\}/g, function (m, k) { return values[k] === undefined || values[k] === null ? '' : values[k]; });
}
function ymd(d) {
  if (!d) return '';
  var s = String(d);
  return s.indexOf('T') === 10 ? new Date(s).toLocaleDateString('en-CA') : s.slice(0, 10);
}
export function attachWhy(t, code, fallback) {
  return (code && t['px_atErr_' + code]) || fallback || code || '';
}

// A thumbnail fetched with the session's token (an <img src> cannot carry it).
function Thumb(props) {
  var us = useState(''), url = us[0], setUrl = us[1];
  useEffect(function () {
    var alive = true, made = '';
    var token = '';
    try { token = localStorage.getItem('medconnect_token') || ''; } catch (e) { /* no storage */ }
    fetch('/api/pacs/orphans/' + encodeURIComponent(props.id) + '/preview', { headers: token ? { Authorization: 'Bearer ' + token } : {} })
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (b) { if (alive && b) { made = URL.createObjectURL(b); setUrl(made); } })
      .catch(function () { /* no picture: the box stays empty */ });
    return function () { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [props.id]);
  return <div style={{ width: 72, height: 72, flex: 'none', background: '#000', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {url ? <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={{ color: '#666', fontSize: 11 }}>…</span>}
  </div>;
}

export function AttachStudy(props) {
  var t = props.t;
  var ss = useState(null), studies = ss[0], setStudies = ss[1];        // GET /pacs/orphans
  var se = useState(''), studiesErr = se[0], setStudiesErr = se[1];
  var ds = useState(ymd(new Date().toISOString())), date = ds[0], setDate = ds[1];
  var ts = useState(null), targets = ts[0], setTargets = ts[1];        // GET /pacs/orphan-targets
  var cs = useState(null), study = cs[0], setStudy = cs[1];            // the chosen study
  var os = useState(null), order = os[0], setOrder = os[1];            // the chosen order
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var rs = useState(null), outcome = rs[0], setOutcome = rs[1];        // { ok, text }
  var rl = useState(0), reload = rl[0], setReload = rl[1];

  useEffect(function () {
    setStudies(null); setStudiesErr('');
    api.get('/pacs/orphans').then(function (r) { setStudies((r && r.studies) || []); })
      .catch(function (e) { setStudies([]); setStudiesErr(attachWhy(t, e && e.code, (e && e.message) || '')); });
  }, [reload]);
  useEffect(function () {
    setTargets(null);
    api.get('/pacs/orphan-targets?date=' + encodeURIComponent(date)).then(function (r) { setTargets((r && r.targets) || []); })
      .catch(function () { setTargets([]); });
  }, [date, reload]);

  var chosenStudy = studies && study ? studies.filter(function (s) { return s.orthanc_study_id === study; })[0] : null;
  var chosenOrder = targets && order ? targets.filter(function (o) { return o.order_item_id === order; })[0] : null;
  var ready = !!chosenStudy && chosenStudy.stable && !!chosenOrder && chosenOrder.can && !busy && !outcome;

  async function go() {
    if (!ready) return;
    setBusy(true);
    try {
      var r = await api.post('/pacs/orphans/attach', { orthanc_study_id: chosenStudy.orthanc_study_id, study_uid: chosenStudy.study_uid, order_item_id: chosenOrder.order_item_id });
      setOutcome({ ok: true, text: r.state === 'done' ? t.px_atDone : t.px_atDoneLater });
      if (props.onDone) props.onDone();
    } catch (e) {
      // A refusal carries the server's code. A request that was cut (a long study) may still
      // have gone through: the order's own attach line says how it ended.
      var found = null;
      if (!e || !e.code) {
        for (var i = 0; i < 30 && !found; i++) {
          await new Promise(function (res) { setTimeout(res, 4000); });
          try {
            var line = await api.get('/pacs/attaches/order/' + chosenOrder.order_item_id);
            if (line && line.state === 'done') found = { ok: true, text: t.px_atDone };
            else if (line && line.state === 'emr-done') found = { ok: true, text: t.px_atDoneLater };
            else if (line && (line.state === 'rolled-back' || line.state === 'failed')) found = { ok: false, text: attachWhy(t, 'NOT_CORRECTED', '') + (line.error ? ' (' + line.error + ')' : '') };
          } catch (e2) { /* ask again */ }
        }
        if (found && found.ok && props.onDone) props.onDone();
      }
      var detail = e && e.data && e.data.detail;
      setOutcome(found || { ok: false, text: attachWhy(t, e && e.code, (e && e.message) || '') + (detail ? ' (' + detail + ')' : '') });
    }
    setBusy(false);
  }
  function again() { setStudy(null); setOrder(null); setOutcome(null); setReload(reload + 1); }

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', cyan = 'var(--violet-text)';
  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  var box = { background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 6, padding: '8px 10px' };
  var row = function (on, can) { return { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: can ? 'pointer' : 'default', border: '1px solid ' + (on ? 'var(--violet-ink)' : 'transparent'), background: on ? 'var(--violet-a20)' : 'transparent', opacity: can ? 1 : 0.55 }; };
  var sexWord = function (s) { return s === 'M' ? (t.male || 'M') : s === 'F' ? (t.female || 'F') : (s || '—'); };

  return (
    <div onClick={busy ? undefined : props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(1100px, 97vw)', maxHeight: '94vh', background: 'var(--bg-col)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px var(--shadow-50)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: cyan }}>📥 {t.px_atTitle}</span>
          <button onClick={props.onClose} disabled={busy} style={Object.assign({}, btn, { marginLeft: 'auto', background: 'var(--btn-neutral-2)', color: tx })}>{t.close || '닫기'} ✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, color: tx, fontSize: 13 }}>
          <div style={{ color: t2, lineHeight: 1.5 }}>{t.px_atIntro}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
            {/* 1. the studies without an order */}
            <div style={box}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 800 }}>1. {t.px_atStudies}</span>
                <span style={{ color: t3, fontSize: 12 }}>{studies ? fill(t.px_atStudiesN, { n: studies.length }) : '…'}</span>
                <button onClick={again} disabled={busy} style={Object.assign({}, btn, { marginLeft: 'auto', padding: '3px 9px', fontSize: 12, background: 'var(--chip)', color: t2 })}>↻</button>
              </div>
              {studiesErr ? <div style={{ color: 'var(--danger-text-2)' }}>⚠ {studiesErr}</div> : null}
              {studies && !studies.length && !studiesErr ? <div style={{ color: t3, fontStyle: 'italic' }}>{t.px_atNoStudies}</div> : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '38vh', overflow: 'auto' }}>
                {(studies || []).map(function (s) {
                  var on = study === s.orthanc_study_id;
                  return <div key={s.orthanc_study_id} onClick={function () { if (!busy && !outcome) { setStudy(on ? null : s.orthanc_study_id); } }} style={row(on, s.stable)} title={s.stable ? '' : t.px_atErr_STILL_ARRIVING}>
                    <Thumb id={s.orthanc_study_id} />
                    <div style={{ minWidth: 0, flex: 1, lineHeight: 1.45 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.patient_name || '—'} <span style={{ color: t3, fontWeight: 400, fontSize: 12 }}>· {t.px_atDeviceId} {s.patient_id || '—'}</span></div>
                      <div style={{ color: t2, fontSize: 12 }}>{t.px_atBorn} {s.birth_date || '—'} · {sexWord(s.sex)} · {s.modalities || '?'} · {fill(t.px_imgShort, { n: s.instances })}</div>
                      <div style={{ color: t2, fontSize: 12 }}>{t.px_atDeviceClock}: {s.study_date} {s.study_time}{s.description ? ' · ' + s.description : ''}{s.stable ? '' : ' · ' + t.px_atArriving}</div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
            {/* 2. the orders of a day without images */}
            <div style={box}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 800 }}>2. {t.px_atOrders}</span>
                <input type="date" value={date} onChange={function (e) { setDate(e.target.value); setOrder(null); }} disabled={busy}
                  style={{ marginLeft: 'auto', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '2px 6px', fontFamily: 'inherit' }} />
              </div>
              {targets && !targets.length ? <div style={{ color: t3, fontStyle: 'italic' }}>{t.px_atNoOrders}</div> : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '38vh', overflow: 'auto' }}>
                {(targets || []).map(function (o) {
                  var on = order === o.order_item_id;
                  return <div key={o.order_item_id} onClick={function () { if (!busy && !outcome && o.can) setOrder(on ? null : o.order_item_id); }} style={row(on, o.can)} title={o.can ? '' : attachWhy(t, o.code, o.error)}>
                    <div style={{ minWidth: 0, flex: 1, lineHeight: 1.45 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{o.patient_name} <span style={{ fontFamily: 'monospace', color: cyan, fontSize: 12 }}>{o.chart_no}</span></div>
                      <div style={{ color: t2, fontSize: 12 }}>{t.px_atBorn} {ymd(o.birth_date) || '—'} · {sexWord(o.sex)} · <b style={{ color: tx }}>{o.order_name}</b> · {o.modality || ''}</div>
                      {!o.can ? <div style={{ color: 'var(--warn-text)', fontSize: 12 }}>{attachWhy(t, o.code, o.error)}</div> : null}
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </div>
          {/* 3. side by side, then the button */}
          {chosenStudy && chosenOrder ? <div style={Object.assign({}, box, { borderColor: 'var(--violet-ink)' })}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>3. {t.px_atCompare}</div>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}><tbody>
              {[[t.px_atColName, chosenStudy.patient_name || '—', chosenOrder.patient_name],
                [t.px_atColId, chosenStudy.patient_id || '—', chosenOrder.chart_no],
                [t.px_atBorn, chosenStudy.birth_date || '—', ymd(chosenOrder.birth_date) || '—'],
                [t.px_atColSex, sexWord(chosenStudy.sex), sexWord(chosenOrder.sex)],
                [t.px_atColExam, (chosenStudy.modalities || '') + (chosenStudy.description ? ' · ' + chosenStudy.description : ''), chosenOrder.order_name + ' · ' + (chosenOrder.modality || '')],
                [t.px_atColDate, chosenStudy.study_date + ' ' + chosenStudy.study_time + ' (' + t.px_atDeviceClock + ')', ymd(chosenOrder.visit_date)]].map(function (r, i) {
                return <tr key={i}><td style={{ color: t3, padding: '2px 14px 2px 0' }}>{r[0]}</td><td style={{ padding: '2px 14px 2px 0' }}>{r[1]}</td><td style={{ color: t3, padding: '2px 8px' }}>→</td><td style={{ padding: '2px 0', fontWeight: 700 }}>{r[2]}</td></tr>;
              })}
            </tbody></table>
            <div style={{ color: t2, marginTop: 8, lineHeight: 1.5 }}>{fill(t.px_atConfirm, { n: chosenStudy.instances, exam: chosenOrder.order_name, name: chosenOrder.patient_name })} {t.px_atLogged}</div>
          </div> : <div style={{ color: t3 }}>{t.px_atNeed}</div>}
          {outcome ? <div style={{ padding: '10px 12px', borderRadius: 6, fontWeight: 700, background: outcome.ok ? 'var(--ok-2-a15)' : 'var(--danger-a18)', color: outcome.ok ? 'var(--ok-text)' : 'var(--danger-text-2)', border: '1px solid ' + (outcome.ok ? 'var(--ok-2-a40)' : 'var(--danger-a60)') }}>{outcome.ok ? '✓ ' : '⚠ '}{outcome.text}</div> : null}
          {busy ? <div style={{ color: 'var(--warn-text)', fontWeight: 700 }}>{t.px_atBusyNow}</div> : null}
          <div style={{ color: t3, fontSize: 12, lineHeight: 1.5 }}>💡 {t.px_atTip}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          {outcome ? <button onClick={again} style={Object.assign({}, btn, { background: 'var(--chip)', color: tx })}>{t.px_atAnother}</button> : null}
          <button onClick={props.onClose} disabled={busy} style={Object.assign({}, btn, { marginLeft: 'auto', background: 'var(--btn-neutral-2)', color: tx })}>{t.close || '닫기'}</button>
          <button onClick={go} disabled={!ready} style={Object.assign({}, btn, { background: ready ? 'var(--violet-deep)' : 'var(--chip)', color: ready ? 'var(--on-fill-violet)' : t3, cursor: ready ? 'pointer' : 'default' })}>📥 {t.px_atGo}</button>
        </div>
      </div>
    </div>
  );
}
