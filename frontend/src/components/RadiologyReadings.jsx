import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';

// A timestamp (result_at, cancelled_at) reaches the browser in UTC, so cutting
// at 'T' dated a reading written between local midnight and 03:00 the day
// before (P-22). Read it back as the clinic's local date; a plain DATE
// ("YYYY-MM-DD", visit_date) is already a date and is kept. Same rule as
// LabResults.jsx.
function ymd(d) {
  if (!d) return '';
  var s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var x = new Date(s);
  return isNaN(x.getTime()) ? s.split('T')[0] : x.toLocaleDateString('en-CA');
}

// What the images say about the patient, next to the order it was taken for.
// Only the worklist bridge fills this in (POST /api/pacs/study-arrived); a
// mismatch means the patient was typed or edited on the device, so the study
// may belong to someone else. It cannot show a wrong pick from the worklist --
// those images carry the picked patient's own details.
//
// Shared with the viewer window in Consultation.jsx, so it takes the shape
// GET /api/pacs/viewer-url returns as `images`: { patient_check, patient_id,
// patient_name } (null before anything arrived). A row of this list is turned
// into that shape by imagesOfRow. `style` overrides the outer box (margins).
export function imagesOfRow(r) {
  if (!r || !r.images_received_at) return null;
  return { patient_check: r.patient_check || '', patient_id: r.image_patient_id || '', patient_name: r.image_patient_name || '' };
}

export function PatientCheck(props) {
  var im = props.images, t = props.t;
  if (!im || (im.patient_check !== 'mismatch' && im.patient_check !== 'missing')) return null;
  var mismatch = im.patient_check === 'mismatch';
  var text = mismatch
    ? String(t.px_patientMismatch || '').replace('{id}', im.patient_id || '').replace('{name}', String(im.patient_name || '').replace(/\^/g, ' ').trim())
    : (t.px_patientMissing || '');
  return <div style={Object.assign({ margin: '4px 0 6px', padding: '6px 9px', borderRadius: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.5,
    background: mismatch ? 'var(--danger-chip)' : 'var(--warn-chip)', color: mismatch ? 'var(--danger-text-2)' : 'var(--warn-text-2)',
    border: '1px solid ' + (mismatch ? 'var(--danger-deep)' : 'var(--warn-strong)') }, props.style)}>⚠ {text}</div>;
}

// "Compare with earlier exams": the bar under the image window's header (director,
// 2026-10-01 - two chest films of different dates must be seen side by side; he tried
// Stone's own patient view on the server and asked for exactly that in the EMR).
// GET /api/pacs/viewer-url returns `compare`: { count, url, opened, prev, others }.
// `url` is Stone's own ?study=OPENED,OTHER,... for the same patient's exams the cookie
// also opens (not cancelled, arrived, patient number matching - never ?patient=).
// This bar only swaps the image window's address between the exam alone and that one.
// Stone then lists all those exams; the doctor splits the screen with Stone's layout
// button (Stone remembers it) and drags exams into the panes. Stone is used as
// shipped: nothing is added to its page and nothing calls into it.
// The window opens on the exam alone - the reading box belongs to that order, and a
// list full of other dates invites reading the wrong film. While comparing, the bar
// says whose reading it is.
//   props.viewer  { url, base_url, compare }   url = what the iframe shows now,
//                                               base_url = the exam alone
//   props.onUrl(address)  the screen puts it in the iframe (and "open in a new tab")
// "Comparing" is read from the address, not kept here: a window opened straight into
// a comparison (exams ticked in the list, CompareChecked) shows the same bar.
export function ViewerCompare(props) {
  var t = props.t, v = props.viewer || {}, c = v.compare;
  if (!c || !c.count || !c.url || !v.base_url) return null;
  var on = v.url === c.url;
  function go(compare) { props.onUrl(compare ? c.url : v.base_url); }
  function name(x) { return x ? x.order_name + ' · ' + ymd(x.visit_date) : ''; }
  var btn = { background: 'var(--violet-deep)', color: 'var(--on-fill-violet)', border: '1px solid var(--violet-ink)', borderRadius: 5, padding: '4px 11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' };
  var off = { background: 'var(--btn-neutral-2)', color: 'var(--text)', border: '1px solid var(--border-2)', borderRadius: 5, padding: '4px 11px', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' };
  return <div style={Object.assign({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }, props.style)}>
    {on
      ? <button onClick={function () { go(false); }} style={off}>✕ {t.px_compareEnd}</button>
      : <button onClick={function () { go(true); }} title={t.px_compareHint} style={btn}>⇆ {String(t.px_compareWith || '').replace('{n}', c.count)}</button>}
    {!on && c.prev && c.prev.same_exam ? <span style={{ color: 'var(--text-2)' }}>{String(t.px_comparePrev || '').replace('{x}', name(c.prev))}</span> : null}
    {on ? <span style={{ background: 'var(--notice)', border: '1px solid var(--notice-line)', color: 'var(--text)', borderRadius: 5, padding: '3px 9px', fontWeight: 700, whiteSpace: 'nowrap' }}>🩻 {String(t.px_compareReading || '').replace('{x}', name(c.opened))}</span> : null}
    {on ? <span style={{ color: 'var(--text-2)', flex: 1, minWidth: 260, lineHeight: 1.4 }}>{t.px_compareHint}</span> : null}
  </div>;
}

// Why an exam of the list cannot be ticked for a comparison ('' = it can). The same
// rule as the server's (viewer-url): images arrived, not cancelled, and the patient
// number in the images matches the chart - an exam flagged as possibly another
// patient's would sit next to this patient's films with no warning on it.
export function compareBlock(r, t) {
  if (!r) return t.px_cmpNoImages;
  if (r.order_status === 'cancelled') return t.px_cmpCancelled;
  if (!r.images_received_at || !(r.image_study_uid || r.study_instance_uid)) return t.px_cmpNoImages;
  if (r.patient_check !== 'match') return t.px_cmpIdentity;
  return '';
}

// "Compare (N)" in the header of the patient's imaging list: opens the ticked exams
// together (director, 2026-10-01). Off until two are ticked; its title says what to do.
//   props.ids  the ticked order items     props.onGo()  the screen opens them
export function CompareChecked(props) {
  var t = props.t, n = (props.ids || []).length, ok = n >= 2;
  return <button disabled={!ok} onClick={function () { if (ok) props.onGo(); }} title={ok ? t.px_compareHint : t.px_cmpNeedTwo}
    style={Object.assign({ background: ok ? 'var(--violet-deep)' : 'var(--chip)', color: ok ? 'var(--on-fill-violet)' : 'var(--text-3)', border: '1px solid ' + (ok ? 'var(--violet-ink)' : 'var(--border-2)'), borderRadius: 5, padding: '6px 14px', cursor: ok ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }, props.style)}>⇆ {String(t.px_cmpGo || '').replace('{n}', n)}</button>;
}

var MAX_PICKED = 9;   // the server's limit (pacs.routes.js)

// A timestamp as the clinic's local date and time, "2026-10-01 10:32".
function ymdhm(d) {
  if (!d) return '';
  var x = new Date(String(d));
  if (isNaN(x.getTime())) return ymd(d);
  return x.toLocaleDateString('en-CA') + ' ' + ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2);
}

// A patient's imaging orders and their readings (read-only): the list on the left,
// one line per exam, and the chosen exam's reading on the right (director, 2026-10-01:
// with many exams, cards stacked down the window - each with its whole reading - hid
// when which exam was done; the hospital's own EMR shows a list, and a click shows
// the reading). The most recent exam is chosen when the window opens; ↑ ↓ move.
//   props.patientId
//   props.reload                      a number the screen raises to read the list again
//   props.onOpen(orderItemId)         shows "View image" (the consultation screen)
//   props.picked / props.onPick(ids)  tick boxes for a comparison (CompareChecked);
//                                     without onPick there are none - the payment
//                                     screen has no image window.
export function RadiologyReadings(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var ss = useState(null), selId = ss[0], setSelId = ss[1];
  var ks = useState(''), kind = ks[0], setKind = ks[1];       // '' = every device type
  var qs = useState(''), query = qs[0], setQuery = qs[1];
  var lastPatient = useRef(null), listRef = useRef(null);

  useEffect(function () {
    if (!props.patientId) { setRows([]); return; }
    // props.reload: a number the screen raises to read the list again without taking it
    // off the screen - after the image window closes, a reading saved there shows here
    // and the list keeps its place (no «Loading…», no jump to the top, same exam chosen).
    var quiet = lastPatient.current === props.patientId;
    lastPatient.current = props.patientId;
    if (!quiet) { setLoading(true); setSelId(null); setKind(''); setQuery(''); }
    api.get('/pacs/readings/patient/' + props.patientId)
      .then(function (r) { setRows(r || []); }).catch(function () { if (!quiet) setRows([]); })
      .then(function () { setLoading(false); });
  }, [props.patientId, props.reload]);

  // The arrow keys work as soon as the list is on the screen.
  useEffect(function () { if (!loading && listRef.current) listRef.current.focus(); }, [loading]);

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', cyan = 'var(--violet-text)';

  var picked = props.picked || [];
  // The list reads itself again when the image window closes: an exam cancelled in
  // the meantime drops out of the ticks.
  useEffect(function () {
    if (!props.onPick || !picked.length || loading) return;
    var still = picked.filter(function (id) { return rows.some(function (r) { return r.id === id && !compareBlock(r, t); }); });
    if (still.length !== picked.length) props.onPick(still);
  }, [rows]);
  function tick(r) {
    if (picked.indexOf(r.id) >= 0) return props.onPick(picked.filter(function (id) { return id !== r.id; }));
    if (picked.length >= MAX_PICKED) return alert(t.px_cmpMax);
    props.onPick(picked.concat([r.id]));
  }

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noImagingOrders || '영상검사 내역이 없습니다'}</div>;

  // Narrowing the list: by device type (only offered when there are several) and by a
  // word of the exam's name or a piece of its date.
  var kinds = rows.map(function (r) { return r.pacs_modality || ''; }).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  var word = query.trim().toLowerCase();
  var shown = rows.filter(function (r) {
    if (kind && (r.pacs_modality || '') !== kind) return false;
    return !word || (String(r.order_name || '') + ' ' + ymd(r.visit_date)).toLowerCase().indexOf(word) >= 0;
  });
  var sel = shown.filter(function (r) { return r.id === selId; })[0] || shown[0] || null;

  function move(step) {
    if (!sel) return;
    var next = shown[Math.max(0, Math.min(shown.length - 1, shown.indexOf(sel) + step))];
    if (!next) return;
    setSelId(next.id);
    var el = listRef.current && listRef.current.querySelector('[data-exam="' + next.id + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function keys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  }

  var COLS = (props.onPick ? '26px ' : '') + '92px 42px minmax(120px, 1fr) 96px minmax(90px, 150px)';
  var cell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  var chip = { borderRadius: 3, padding: '0 6px', fontSize: 11, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' };
  var kindBtn = function (on) { return { background: on ? 'var(--violet-deep)' : 'var(--chip)', color: on ? 'var(--on-fill-violet)' : 'var(--text-soft)', border: '1px solid ' + (on ? 'var(--violet-ink)' : 'var(--border-2)'), borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }; };
  var label = { color: t3, fontSize: 12, whiteSpace: 'nowrap', paddingRight: 10, verticalAlign: 'top' };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* the list */}
      <div style={{ flex: '1 1 58%', minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid ' + bd }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid ' + bd, flexWrap: 'wrap' }}>
          {kinds.length > 1 ? <button onClick={function () { setKind(''); }} style={kindBtn(!kind)}>{t.px_filterAll}</button> : null}
          {kinds.length > 1 ? kinds.map(function (k) { return <button key={k} onClick={function () { setKind(k); }} style={kindBtn(kind === k)}>{k}</button>; }) : null}
          <input value={query} onChange={function (e) { setQuery(e.target.value); }} onKeyDown={keys} placeholder={t.px_filterSearch}
            style={{ flex: '0 1 220px', minWidth: 120, background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 4, color: tx, fontSize: 13, padding: '3px 8px', outline: 'none' }} />
          <span style={{ marginLeft: 'auto', color: t3, fontSize: 12 }}>{shown.length === rows.length ? rows.length : shown.length + ' / ' + rows.length}</span>
        </div>
        <div ref={listRef} tabIndex={0} onKeyDown={keys} style={{ flex: 1, overflow: 'auto', outline: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '5px 10px', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel-head)', borderBottom: '1px solid ' + bd, color: t3, fontSize: 12, fontWeight: 700 }}>
            {props.onPick ? <span></span> : null}
            <span>{t.px_colDate}</span><span>{t.px_colType}</span><span>{t.px_colExam}</span><span>{t.px_colImages}</span><span>{t.px_colReading}</span>
          </div>
          {!shown.length ? <div style={{ padding: 14, color: t3, fontSize: 13 }}>{t.px_noMatch}</div> : null}
          {shown.map(function (r) {
            // A cancelled order (decision 3-B) stays in the list - its images and reading
            // are part of the record. Told apart by grey text, the struck-out name and
            // the "Annulé" tag, not by opacity (design 3.3.1: contrast).
            var cancelled = r.order_status === 'cancelled', on = sel && r.id === sel.id;
            var flagged = r.images_received_at && (r.patient_check === 'mismatch' || r.patient_check === 'missing');
            var why = props.onPick ? compareBlock(r, t) : '';
            return <div key={r.id} data-exam={r.id} onClick={function () { setSelId(r.id); }}
              style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '0 10px', height: 28, cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid ' + bd, borderLeft: '3px solid ' + (on ? 'var(--violet-strong)' : 'transparent'), background: on ? 'var(--violet-a20)' : 'transparent' }}>
              {props.onPick ? <input type="checkbox" checked={picked.indexOf(r.id) >= 0} disabled={!!why} title={why || t.px_cmpPick}
                onClick={function (e) { e.stopPropagation(); }} onChange={function () { tick(r); }}
                style={{ width: 16, height: 16, margin: 0, cursor: why ? 'not-allowed' : 'pointer', accentColor: 'var(--violet-strong)' }} /> : null}
              <span style={Object.assign({ fontFamily: 'monospace', fontWeight: 700, color: cancelled ? t3 : 'var(--ok-text)' }, cell)}>{ymd(r.visit_date)}</span>
              <span style={Object.assign({ color: cancelled ? t3 : 'var(--accent-text-2)', fontWeight: 700, fontSize: 12 }, cell)}>{r.pacs_modality || ''}</span>
              <span style={cell} title={r.order_name}>
                <span style={{ color: cancelled ? t3 : tx, fontWeight: 700, textDecoration: cancelled ? 'line-through' : 'none' }}>{r.order_name}</span>
                {cancelled ? <span style={Object.assign({ background: 'var(--btn-neutral-2)', color: 'var(--text-soft-2)' }, chip)}>{t.px_orderCancelled}</span> : null}
                {flagged ? <span style={Object.assign(r.patient_check === 'mismatch' ? { background: 'var(--danger-chip)', color: 'var(--danger-text-2)' } : { background: 'var(--warn-chip)', color: 'var(--warn-text-2)' }, chip)}>⚠ {t.px_identityShort}</span> : null}
              </span>
              <span style={Object.assign({ fontSize: 12, fontWeight: r.images_received_at ? 700 : 400, color: r.images_received_at && !cancelled ? 'var(--ok-text)' : t2 }, cell)}>
                {r.images_received_at ? String(t.px_imgShort || '').replace('{n}', r.image_count == null ? '?' : r.image_count) : (r.study_instance_uid && !cancelled ? t.px_imgWaitShort : '—')}</span>
              <span style={Object.assign({ fontSize: 12, color: r.result_text ? tx : t2 }, cell)} title={r.result_text ? (r.result_by_name || '') + ' · ' + ymd(r.result_at) : ''}>
                {r.result_text ? '✓ ' + (r.result_by_name || '') : t.px_readNone}</span>
            </div>;
          })}
        </div>
      </div>

      {/* the chosen exam */}
      <div style={{ flex: '1 1 42%', minWidth: 300, display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', minHeight: 0, background: 'var(--bg-col)' }}>
        {!sel ? <div style={{ color: t3, fontSize: 14 }}>{t.px_pickHint}</div> : (function () {
          var r = sel, cancelled = r.order_status === 'cancelled';
          return <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: cancelled ? 'var(--btn-neutral-2)' : 'var(--accent-chip)', color: cancelled ? 'var(--text-soft-2)' : 'var(--accent-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{r.pacs_modality || ''}</span>
              <span style={{ color: cancelled ? t3 : tx, fontSize: 17, fontWeight: 800, textDecoration: cancelled ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.order_name}</span>
              {cancelled ? <span style={{ background: 'var(--btn-neutral-2)', color: 'var(--text-soft-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{t.px_orderCancelled}</span> : null}
              {r.study_instance_uid && props.onOpen ? <button onClick={function () { props.onOpen(r.id); }} style={{ marginLeft: 'auto', flex: 'none', background: 'var(--violet-strong-a22)', color: cyan, border: '1px solid var(--violet-strong-a55)', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖼 {t.viewImage || '영상보기'}</button> : null}
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, color: tx, marginBottom: 8 }}><tbody>
              <tr><td style={label}>{t.px_dOrdered}</td><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ymd(r.visit_date)}</td></tr>
              {r.dept_code || r.dept_name || r.ordered_by_name ? <tr><td style={label}>{t.px_dOrderedBy}</td><td>{[r.dept_code || r.dept_name, r.ordered_by_name].filter(Boolean).join(' · ')}</td></tr> : null}
              <tr><td style={label}>{t.px_colImages}</td><td style={{ color: r.images_received_at ? (cancelled ? t3 : 'var(--ok-text)') : t3, fontWeight: r.images_received_at ? 700 : 400 }}>
                {r.images_received_at ? String(t.px_imagesArrived || '').replace('{n}', r.image_count == null ? '?' : r.image_count) + ' · ' + ymdhm(r.images_received_at)
                  : (r.study_instance_uid && !cancelled ? t.px_imagesWaiting : '—')}</td></tr>
              {r.accession_no ? <tr><td style={label}>{t.px_dAccession}</td><td style={{ fontFamily: 'monospace' }}>{r.accession_no}</td></tr> : null}
            </tbody></table>
            {cancelled && (r.cancel_reason || r.cancelled_at)
              ? <div style={{ fontSize: 13, color: t2, margin: '0 0 8px' }}>⊘ {t.px_orderCancelled}{r.cancelled_at ? ' · ' + ymd(r.cancelled_at) : ''}{r.cancel_reason ? ' — ' + (t.px_cancelReason || '') + ' : ' + r.cancel_reason : ''}</div>
              : null}
            <PatientCheck images={imagesOfRow(r)} t={t} style={{ margin: '0 0 8px' }} />
            {r.image_study_uid && r.image_study_uid !== r.study_instance_uid
              ? <div style={{ fontSize: 12, color: 'var(--warn-text)', margin: '0 0 8px' }}>{t.px_linkedByAccession}</div>
              : null}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 6px' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: cyan }}>🩻 {t.reading || '판독소견'}</span>
              {r.result_at ? <span style={{ fontSize: 12, color: t3 }}>{t.lastReadBy || '판독'}: {r.result_by_name || ''} · {ymdhm(r.result_at)}</span> : null}
            </div>
            <div style={{ flex: 1, minHeight: 60, overflow: 'auto', fontSize: 14, color: r.result_text ? tx : t3, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--bg)', border: '1px solid ' + bd, borderRadius: 6, padding: '10px 12px' }}>
              {r.result_text || (t.noReading || '판독 소견 없음')}
            </div>
          </>;
        })()}
      </div>
    </div>
  );
}
