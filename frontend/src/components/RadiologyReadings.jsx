import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';
import { printDocument } from '../documents/shared.jsx';
import { ImagingReportLayout, IMAGING_REPORT_NAME } from '../documents/imaging-report.jsx';
import { MoveStudy, moveLine } from './MoveStudy.jsx';
import { ImagesPrint, imagesBlock } from './ImagesPrint.jsx';
import { OutsideDetail, OutsideViewer, outsideDate, outsideName } from './OutsideStudies.jsx';

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
// a comparison (exams ticked in the list) shows the same bar.
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

// Why an exam's reading cannot be printed ('' = it can): there must be a reading, and
// a cancelled exam's reading is not sent out.
export function printBlock(r, t) {
  if (!r) return t.px_printNoReading;
  if (r.order_status === 'cancelled') return t.px_printCancelled;
  if (!String(r.result_text || '').trim()) return t.px_printNoReading;
  return '';
}

// What the report sheet says about one exam (documents/imaging-report.jsx `values`).
// The exam date is the day its images arrived; an exam read without images keeps the
// day it was ordered. The sheet prints the exam's name, its date and the reading;
// modality, image_count, dept and ordered_by are kept in the issued record only.
function reportValues(r) {
  return {
    exam_name: r.order_name || '', modality: r.pacs_modality || '',
    exam_date: ymd(r.images_received_at) || ymd(r.visit_date),
    image_count: r.images_received_at ? r.image_count : null,
    dept: r.dept_code || r.dept_name || '', ordered_by: r.ordered_by_name || '',
    reading: r.result_text || '', read_by: r.result_by_name || '', read_at: r.result_at || null,
  };
}

// Preview and print of the imaging report - one A4 sheet per exam (director,
// 2026-10-01: the reading goes with the images when a patient is referred elsewhere).
// The sheet's language is chosen here, French first: it is read in another hospital,
// whatever language this screen is in. Printing is not issuing (director, 2026-10-02): the
// sheet takes no number and no row in the documents history - one change-log line per
// exam (POST /api/documents/print-log, pacs.report.print), and nothing is printed unless
// it answered. Printing the same sheets again from this window does not log them again,
// changing the language does.
//   props.exams      the rows to print (each must pass printBlock)
//   props.patientId  props.t  props.onClose()
export function ReportPrint(props) {
  var t = props.t, exams = props.exams || [];
  var lg = useState('fr'), lang = lg[0], setLang = lg[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var ps = useState(null), patient = ps[0], setPatient = ps[1];
  var ns = useState(null), issued = ns[0], setIssued = ns[1];    // true once the print is in the change log
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var go = useState(0), printNow = go[0], setPrintNow = go[1];
  var sheet = useRef(null);
  var now = useRef(ymdhm(new Date().toISOString()));

  useEffect(function () {
    api.get('/admin/clinic').then(setClinic).catch(function () { setClinic({}); });
    api.get('/patients/' + props.patientId).then(setPatient).catch(function () { setPatient(null); });
  }, [props.patientId]);
  // The numbers are on the sheets only after React has drawn them: print then.
  useEffect(function () {
    // The print window's title is what a browser prints in its page header: the sheet's
    // name, not the document number (the number stays inside the clinic).
    if (printNow && sheet.current) printDocument(sheet.current, IMAGING_REPORT_NAME[lang] || IMAGING_REPORT_NAME.fr, lang);
  }, [printNow]);

  // On the sheet and in the record: who the patient is, never how to reach them.
  var who = patient ? { id: patient.id, chart_no: patient.chart_no, last_name: patient.last_name, first_name: patient.first_name, gender: patient.gender, date_of_birth: patient.date_of_birth } : null;
  var ready = !!who && !!clinic;

  async function issueAndPrint() {
    if (!ready || busy) return;
    if (issued) { setPrintNow(printNow + 1); return; }
    setBusy(true);
    try {
      // The lines for every exam are written together, or none is: nothing is printed half-logged.
      await api.post('/documents/print-log', { kind: 'imaging-report', patient_id: props.patientId,
        order_item_ids: exams.map(function (r) { return r.id; }), lang: lang });
      setIssued(true); setPrintNow(printNow + 1);
    } catch (e) {
      alert(t.px_printFail + (e && e.message ? e.message : ''));
    }
    setBusy(false);
  }

  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(860px, 96vw)', height: '94vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--violet-text)' }}>🖨 {t.px_printTitle}{exams.length > 1 ? ' (' + exams.length + ')' : ''}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-2)' }}>{t.px_printLang}</span>
          {['fr', 'en', 'ko'].map(function (l) {
            return <button key={l} disabled={busy} onClick={function () { if (l !== lang) { setLang(l); setIssued(null); } }}
              style={Object.assign({}, btn, { padding: '4px 10px', background: lang === l ? 'var(--violet-deep)' : 'var(--chip)', color: lang === l ? 'var(--on-fill-violet)' : 'var(--text-soft)', border: '1px solid ' + (lang === l ? 'var(--violet-ink)' : 'var(--border-2)') })}>{l.toUpperCase()}</button>;
          })}
          <button onClick={props.onClose} style={Object.assign({}, btn, { background: 'var(--btn-neutral-2)', color: 'var(--text)' })}>{t.close || '닫기'} ✕</button>
        </div>
        {/* the paper: white whatever the screen's theme, at the printed width (A4 less the margins) */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-deep)', padding: 16 }}>
          <div style={{ width: '182mm', margin: '0 auto', background: '#fff', padding: '0', boxShadow: '0 0 0 1px #9993' }}>
            {!ready ? <div style={{ padding: 40, color: '#475569', fontFamily: 'system-ui,sans-serif' }}>{t.loading || 'Loading…'}</div> :
              <div ref={sheet}>
                {/* page numbers at the foot of every printed page, where the browser can */}
                <style>{'@page{@bottom-right{content:counter(page) " / " counter(pages);font:8pt sans-serif;color:#444}}'}</style>
                {exams.map(function (r, i) {
                  return <ImagingReportLayout key={r.id} values={reportValues(r)} patient={who} clinic={clinic} lang={lang}
                    docNo="" dateStr={now.current} last={i === exams.length - 1} />;
                })}
              </div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
            {issued ? t.px_printIssued : t.px_printNote}</span>
          <button onClick={issueAndPrint} disabled={!ready || busy} style={Object.assign({}, btn, { background: ready && !busy ? 'var(--violet-deep)' : 'var(--chip)', color: ready && !busy ? 'var(--on-fill-violet)' : 'var(--text-3)', border: '1px solid ' + (ready && !busy ? 'var(--violet-ink)' : 'var(--border-2)') })}>
            🖨 {issued ? t.px_printAgain : t.px_printGo}</button>
        </div>
      </div>
    </div>
  );
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
//   props.onCompare(orderItemIds)     tick boxes on the lines, and above the list -
//                                     right over the tick boxes, not across the window
//                                     (director: the mouse had too far to go) - what is
//                                     done with the ticked exams: compare, print, untick
//                                     all. Without onCompare there are none of these:
//                                     the payment screen has no image window.
// The ticks live here: they stay while the image window is open over the list and go
// when the list is closed.
// Where there is an image window (props.onOpen) the chosen exam also offers "the images
// are under the wrong order" (MoveStudy.jsx), and every exam shows the corrections it
// Under the patient's own exams the list shows the studies brought in from another
// establishment's disc (OutsideStudies.jsx; GET /pacs/import/list): they hang on the
// patient, not on an order - no tick box, no reading, no print. A chosen one is 'x<id>'.
export function RadiologyReadings(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var ss = useState(null), selId = ss[0], setSelId = ss[1];
  var ks = useState(''), kind = ks[0], setKind = ks[1];       // '' = every device type
  var qs = useState(''), query = qs[0], setQuery = qs[1];
  var prs = useState(null), printing = prs[0], setPrinting = prs[1];   // the rows whose report is being printed
  var pks = useState([]), picked = pks[0], setPicked = pks[1];         // the ticked order items
  var mvs = useState(null), moving = mvs[0], setMoving = mvs[1];       // the row whose images are being put under another order
  var mls = useState([]), moved = mls[0], setMoved = mls[1];           // the patient's corrections (GET /pacs/moves/patient)
  var ags = useState(0), again = ags[0], setAgain = ags[1];            // raised to read the list again after a correction
  var ims = useState(null), imaging = ims[0], setImaging = ims[1];     // the row whose images are being printed on paper
  var xs = useState([]), outside = xs[0], setOutside = xs[1];          // the patient's outside studies
  var xvs = useState(null), outsideOpen = xvs[0], setOutsideOpen = xvs[1];   // the outside study shown in the image window
  var lastPatient = useRef(null), listRef = useRef(null);

  useEffect(function () {
    if (!props.patientId) { setRows([]); setOutside([]); return; }
    // props.reload: a number the screen raises to read the list again without taking it
    // off the screen - after the image window closes, a reading saved there shows here
    // and the list keeps its place (no «Loading…», no jump to the top, same exam chosen).
    var quiet = lastPatient.current === props.patientId;
    lastPatient.current = props.patientId;
    if (!quiet) { setLoading(true); setSelId(null); setKind(''); setQuery(''); setPicked([]); }
    api.get('/pacs/readings/patient/' + props.patientId)
      .then(function (r) { setRows(r || []); }).catch(function () { if (!quiet) setRows([]); })
      .then(function () { setLoading(false); });
    // The corrections: a line of history on both orders. An EMR without them shows none.
    api.get('/pacs/moves/patient/' + props.patientId)
      .then(function (r) { setMoved((r || []).filter(function (m) { return m.state !== 'rolled-back' && m.state !== 'failed'; })); })
      .catch(function () { setMoved([]); });
    // The outside studies. An EMR without them shows none.
    if (!quiet) setOutside([]);
    api.get('/pacs/import/list?patient_id=' + props.patientId)
      .then(function (r) { setOutside((r && r.studies) || []); }).catch(function () { if (!quiet) setOutside([]); });
  }, [props.patientId, props.reload, again]);

  // The arrow keys work as soon as the list is on the screen.
  useEffect(function () { if (!loading && listRef.current) listRef.current.focus(); }, [loading]);

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', cyan = 'var(--violet-text)';

  var canTick = !!props.onCompare;
  // The list reads itself again when the image window closes: an exam cancelled in
  // the meantime drops out of the ticks.
  useEffect(function () {
    if (!picked.length || loading) return;
    var still = picked.filter(function (id) { return rows.some(function (r) { return r.id === id && !compareBlock(r, t); }); });
    if (still.length !== picked.length) setPicked(still);
  }, [rows]);
  function tick(r) {
    if (picked.indexOf(r.id) >= 0) return setPicked(picked.filter(function (id) { return id !== r.id; }));
    if (picked.length >= MAX_PICKED) return alert(t.px_cmpMax);
    setPicked(picked.concat([r.id]));
  }

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length && !outside.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noImagingOrders || '영상검사 내역이 없습니다'}</div>;

  // Narrowing the list: by device type (only offered when there are several) and by a
  // word of the exam's name or a piece of its date.
  var kinds = rows.map(function (r) { return r.pacs_modality || ''; }).concat(outside.map(function (x) { return x.modality || ''; })).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  var word = query.trim().toLowerCase();
  var shown = rows.filter(function (r) {
    if (kind && (r.pacs_modality || '') !== kind) return false;
    return !word || (String(r.order_name || '') + ' ' + ymd(r.visit_date)).toLowerCase().indexOf(word) >= 0;
  });
  var shownOut = outside.filter(function (x) {
    if (kind && (x.modality || '') !== kind) return false;
    return !word || (String(x.description || '') + ' ' + String(x.institution || '') + ' ' + outsideDate(x.study_date)).toLowerCase().indexOf(word) >= 0;
  });
  var selOut = shownOut.filter(function (x) { return 'x' + x.id === selId; })[0] || null;
  var sel = selOut ? null : (shown.filter(function (r) { return r.id === selId; })[0] || shown[0] || null);
  if (!sel && !selOut) selOut = shownOut[0] || null;
  // every line of the list, in the order shown: what the arrow keys walk through
  var lines = shown.map(function (r) { return r.id; }).concat(shownOut.map(function (x) { return 'x' + x.id; }));

  function move(step) {
    var at = lines.indexOf(selOut ? 'x' + selOut.id : sel ? sel.id : null);
    if (at < 0) return;
    var next = lines[Math.max(0, Math.min(lines.length - 1, at + step))];
    if (next === undefined) return;
    setSelId(next);
    var el = listRef.current && listRef.current.querySelector('[data-exam="' + next + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function toOutside() {
    if (!shownOut.length) return;
    if (!selOut) setSelId('x' + shownOut[0].id);
    var el = listRef.current && listRef.current.querySelector('[data-outside-head]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }
  function keys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  }

  // Ticked exams can be printed together, one sheet each: those with a reading.
  var tickedToPrint = rows.filter(function (r) { return picked.indexOf(r.id) >= 0 && !printBlock(r, t); });

  var COLS = (canTick ? '26px ' : '') + '92px 42px minmax(120px, 1fr) 96px minmax(90px, 150px)';
  var cell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  var chip = { borderRadius: 3, padding: '0 6px', fontSize: 11, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' };
  // A button of the line above the list; off = greyed, and it keeps its place so the
  // list does not move when the first box is ticked.
  var act = function (on, strong) { return { flex: 'none', background: on && strong ? 'var(--violet-deep)' : 'var(--chip)', color: on ? (strong ? 'var(--on-fill-violet)' : 'var(--text-soft)') : t3, border: '1px solid ' + (on && strong ? 'var(--violet-ink)' : 'var(--border-2)'), borderRadius: 4, padding: '3px 9px', cursor: on ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }; };
  var label = { color: t3, fontSize: 12, whiteSpace: 'nowrap', paddingRight: 10, verticalAlign: 'top' };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* the list */}
      <div style={{ flex: '1 1 58%', minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid ' + bd }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid ' + bd }}>
          {/* what is done with the ticked exams - over the tick boxes */}
          {canTick ? <button disabled={picked.length < 2} onClick={function () { if (picked.length >= 2) props.onCompare(picked); }}
            title={picked.length >= 2 ? t.px_compareHint : t.px_cmpNeedTwo} style={act(picked.length >= 2, true)}>⇆ {String(t.px_cmpGo || '').replace('{n}', picked.length)}</button> : null}
          {canTick ? <button disabled={!tickedToPrint.length} onClick={function () { if (tickedToPrint.length) setPrinting(tickedToPrint); }}
            title={!picked.length ? t.px_printNeedTick : tickedToPrint.length === picked.length ? '' : String(t.px_printSkipped || '').replace('{n}', picked.length - tickedToPrint.length)}
            style={act(tickedToPrint.length > 0)}>🖨 {String(t.px_printN || '').replace('{n}', tickedToPrint.length)}</button> : null}
          {canTick ? <button disabled={!picked.length} onClick={function () { setPicked([]); }} style={act(picked.length > 0)}>{t.px_untickAll}</button> : null}
          {canTick ? <span style={{ flex: 'none', width: 1, alignSelf: 'stretch', background: bd, margin: '0 2px' }}></span> : null}
          {/* narrowing the list: the device type from a drop-down (like the phrase categories
              of the consultation screen - it does not grow with the number of types), a word */}
          {kinds.length > 1 ? <select aria-label={t.px_colType} value={kind} onChange={function (e) { setKind(e.target.value); }}
            style={{ flex: '0 1 130px', minWidth: 0, background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 3, padding: '2px 4px', color: kind ? cyan : tx, fontSize: 12, fontWeight: kind ? 700 : 400, fontFamily: 'inherit', textOverflow: 'ellipsis' }}>
            <option value="">{t.px_filterAll}</option>
            {kinds.map(function (k) { return <option key={k} value={k}>{k}</option>; })}
          </select> : null}
          <input value={query} onChange={function (e) { setQuery(e.target.value); }} onKeyDown={keys} placeholder={t.px_filterSearch}
            style={{ flex: '1 1 90px', minWidth: 0, maxWidth: 220, boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 3, color: tx, fontSize: 12, padding: '2px 6px', outline: 'none' }} />
          {/* the outside studies are under the patient's own exams: with a long list, one click goes there */}
          {shownOut.length && shown.length ? <button onClick={toOutside} title={t.px_xGroup} style={Object.assign(act(true), { marginLeft: 'auto' })}>💿 {shownOut.length}</button> : null}
          <span style={{ flex: 'none', marginLeft: shownOut.length && shown.length ? 0 : 'auto', color: t3, fontSize: 12 }}>{lines.length === rows.length + outside.length ? lines.length : lines.length + ' / ' + (rows.length + outside.length)}</span>
        </div>
        <div ref={listRef} tabIndex={0} onKeyDown={keys} style={{ flex: 1, overflow: 'auto', outline: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '5px 10px', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel-head)', borderBottom: '1px solid ' + bd, color: t3, fontSize: 12, fontWeight: 700 }}>
            {canTick ? <span></span> : null}
            <span>{t.px_colDate}</span><span>{t.px_colType}</span><span>{t.px_colExam}</span><span>{t.px_colImages}</span><span>{t.px_colReading}</span>
          </div>
          {!lines.length ? <div style={{ padding: 14, color: t3, fontSize: 13 }}>{t.px_noMatch}</div> : null}
          {shown.map(function (r) {
            // A cancelled order (decision 3-B) stays in the list - its images and reading
            // are part of the record. Told apart by grey text, the struck-out name and
            // the "Annulé" tag, not by opacity (design 3.3.1: contrast).
            var cancelled = r.order_status === 'cancelled', on = sel && r.id === sel.id;
            var flagged = r.images_received_at && (r.patient_check === 'mismatch' || r.patient_check === 'missing');
            var why = canTick ? compareBlock(r, t) : '';
            return <div key={r.id} data-exam={r.id} onClick={function () { setSelId(r.id); }}
              style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '0 10px', height: 28, cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid ' + bd, borderLeft: '3px solid ' + (on ? 'var(--violet-strong)' : 'transparent'), background: on ? 'var(--violet-a20)' : 'transparent' }}>
              {canTick ? <input type="checkbox" checked={picked.indexOf(r.id) >= 0} disabled={!!why} title={why || t.px_cmpPick}
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
          {/* the studies brought in from another establishment's disc: under the patient's own exams */}
          {shownOut.length ? <div data-outside-head="1" style={{ padding: '5px 10px', background: 'var(--panel-head)', borderBottom: '1px solid ' + bd, borderTop: shown.length ? '1px solid ' + bd : 'none', color: t2, fontSize: 12, fontWeight: 700 }}>
            💿 {t.px_xGroup} <span style={{ color: t3, fontWeight: 400 }}>· {shownOut.length}</span></div> : null}
          {shownOut.map(function (x) {
            var on = selOut && x.id === selOut.id;
            return <div key={'x' + x.id} data-exam={'x' + x.id} onClick={function () { setSelId('x' + x.id); }}
              style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 8, alignItems: 'center', padding: '0 10px', height: 28, cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid ' + bd, borderLeft: '3px solid ' + (on ? 'var(--violet-strong)' : 'transparent'), background: on ? 'var(--violet-a20)' : 'transparent' }}>
              {canTick ? <span></span> : null}
              <span style={Object.assign({ fontFamily: 'monospace', fontWeight: 700, color: 'var(--ok-text)' }, cell)}>{outsideDate(x.study_date) || '—'}</span>
              <span style={Object.assign({ color: 'var(--accent-text-2)', fontWeight: 700, fontSize: 12 }, cell)}>{x.modality || ''}</span>
              <span style={cell} title={[outsideName(x, t), x.institution].filter(Boolean).join(' — ')}>
                <span style={{ color: tx, fontWeight: 700 }}>{outsideName(x, t)}</span>
                <span style={Object.assign({ background: 'var(--warn-chip)', color: 'var(--warn-text-2)' }, chip)}>{t.px_xChip}</span>
                {x.institution ? <span style={{ color: t2, marginLeft: 6, fontSize: 12 }}>{x.institution}</span> : null}
              </span>
              <span style={Object.assign({ fontSize: 12, fontWeight: 700, color: 'var(--ok-text)' }, cell)}>{String(t.px_imgShort || '').replace('{n}', x.image_count == null ? '?' : x.image_count)}</span>
              <span style={Object.assign({ fontSize: 12, color: t2 }, cell)}>—</span>
            </div>;
          })}
        </div>
      </div>

      {/* the chosen exam */}
      <div style={{ flex: '1 1 42%', minWidth: 300, display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', minHeight: 0, background: 'var(--bg-col)' }}>
        {selOut ? <OutsideDetail study={selOut} t={t} onOpen={props.onOpen ? function () { setOutsideOpen(selOut); } : null} onDone={function () { setAgain(again + 1); }} />
        : !sel ? <div style={{ color: t3, fontSize: 14 }}>{t.px_pickHint}</div> : (function () {
          var r = sel, cancelled = r.order_status === 'cancelled';
          return <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: cancelled ? 'var(--btn-neutral-2)' : 'var(--accent-chip)', color: cancelled ? 'var(--text-soft-2)' : 'var(--accent-text-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{r.pacs_modality || ''}</span>
              <span style={{ color: cancelled ? t3 : tx, fontSize: 17, fontWeight: 800, textDecoration: cancelled ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.order_name}</span>
              {cancelled ? <span style={{ background: 'var(--btn-neutral-2)', color: 'var(--text-soft-2)', borderRadius: 3, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{t.px_orderCancelled}</span> : null}
              {(function () {
                var why = printBlock(r, t);
                return <button disabled={!!why} onClick={function () { setPrinting([r]); }} title={why}
                  style={{ marginLeft: 'auto', flex: 'none', background: 'var(--chip)', color: why ? t3 : 'var(--text-soft)', border: '1px solid var(--border-2)', borderRadius: 5, padding: '5px 12px', cursor: why ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>🖨 {t.px_print}</button>;
              })()}
              {r.study_instance_uid && props.onOpen ? <button onClick={function () { props.onOpen(r.id); }} style={{ flex: 'none', background: 'var(--violet-strong-a22)', color: cyan, border: '1px solid var(--violet-strong-a55)', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🖼 {t.viewImage || '영상보기'}</button> : null}
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, color: tx, marginBottom: 8 }}><tbody>
              <tr><td style={label}>{t.px_dOrdered}</td><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ymd(r.visit_date)}</td></tr>
              {r.dept_code || r.dept_name || r.ordered_by_name ? <tr><td style={label}>{t.px_dOrderedBy}</td><td>{[r.dept_code || r.dept_name, r.ordered_by_name].filter(Boolean).join(' · ')}</td></tr> : null}
              <tr><td style={label}>{t.px_colImages}</td><td style={{ color: r.images_received_at ? (cancelled ? t3 : 'var(--ok-text)') : t3, fontWeight: r.images_received_at ? 700 : 400 }}>
                {r.images_received_at ? String(t.px_imagesArrived || '').replace('{n}', r.image_count == null ? '?' : r.image_count) + ' · ' + ymdhm(r.images_received_at)
                  : (r.study_instance_uid && !cancelled ? t.px_imagesWaiting : '—')}
                {/* what can be done with these images, side by side under the line, with room below:
                    put them under the right order (doctors, in the consultation screen - the orange
                    button), print them on paper (consultation and payment) */}
                {r.images_received_at ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 7px' }}>
                  {props.onOpen && !cancelled ? <button onClick={function () { setMoving(r); }} title={t.px_mvIntro}
                    style={{ background: 'var(--warn-a18)', color: 'var(--warn-text)', border: '1px solid var(--warn-a40)', borderRadius: 4, padding: '2px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>⇄ {t.px_mvButton}</button> : null}
                  {(function () {
                    var no = imagesBlock(r, t);
                    return <button disabled={!!no} onClick={function () { setImaging(r); }} title={no}
                      style={{ background: 'var(--chip)', color: no ? t3 : 'var(--text-soft)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '2px 9px', cursor: no ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>🖨 {t.px_imButton}</button>;
                  })()}
                </div> : null}</td></tr>
              {r.accession_no ? <tr><td style={label}>{t.px_dAccession}</td><td style={{ fontFamily: 'monospace' }}>{r.accession_no}</td></tr> : null}
            </tbody></table>
            {cancelled && (r.cancel_reason || r.cancelled_at)
              ? <div style={{ fontSize: 13, color: t2, margin: '0 0 8px' }}>⊘ {t.px_orderCancelled}{r.cancelled_at ? ' · ' + ymd(r.cancelled_at) : ''}{r.cancel_reason ? ' — ' + (t.px_cancelReason || '') + ' : ' + r.cancel_reason : ''}</div>
              : null}
            <PatientCheck images={imagesOfRow(r)} t={t} style={{ margin: '0 0 8px' }} />
            {/* the corrections this exam was part of - the two most recent (they are rare) */}
            {moved.filter(function (m) { return m.from_order_item_id === r.id || m.to_order_item_id === r.id; }).slice(0, 2).map(function (m) {
              return <div key={m.id} style={{ fontSize: 12, color: t2, margin: '0 0 6px', lineHeight: 1.45 }}>⇄ {moveLine(t, m)}</div>;
            })}
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
      {printing ? <ReportPrint exams={printing} patientId={props.patientId} t={t} onClose={function () { setPrinting(null); }} /> : null}
      {imaging ? <ImagesPrint exam={imaging} examDate={ymd(imaging.images_received_at) || ymd(imaging.visit_date)} now={ymdhm(new Date().toISOString())}
        patientId={props.patientId} t={t} onClose={function () { setImaging(null); }} /> : null}
      {outsideOpen ? <OutsideViewer study={outsideOpen} t={t} onClose={function () { setOutsideOpen(null); }} /> : null}
      {moving ? <MoveStudy exam={moving} t={t} onLook={props.onOpen} onClose={function () { setMoving(null); }} onDone={function () { setAgain(again + 1); }} /> : null}
    </div>
  );
}
