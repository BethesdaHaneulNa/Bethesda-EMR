import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';
import { printDocument } from '../documents/shared.jsx';
import { LabResultsLayout, LAB_RESULTS_NAME, LAB_SHEET_COLUMNS } from '../documents/lab-results.jsx';

// A DATE column reaches the browser as the clinic's local midnight written in
// UTC ("2026-09-28T21:00:00.000Z" for the 29th at UTC+3), so cutting at 'T'
// showed every visit and result one day early. Read it back as a local date;
// a plain "YYYY-MM-DD" is already a date and is kept as it is.
function ymd(d) {
  if (!d) return '';
  var s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var x = new Date(s);
  return isNaN(x.getTime()) ? s.split('T')[0] : x.toLocaleDateString('en-CA');
}
function hhmm(v) { if (!v) return ''; var x = new Date(v); return isNaN(x.getTime()) ? '' : x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
// A timestamp as the clinic's local date and time, "2026-10-01 10:32".
function ymdhm(d) { var x = new Date(String(d)); return isNaN(x.getTime()) ? ymd(d) : x.toLocaleDateString('en-CA') + ' ' + hhmm(d); }

// The range a result (or a row) was judged by, as text. `dash` is what stands between the
// two ends: "~" on the screen, an en dash on paper.
function refText(it, dash) {
  if (it.ref_text) return it.ref_text;
  if (it.ref_low != null && it.ref_high != null) return it.ref_low + (dash || '~') + it.ref_high;
  if (it.ref_low != null) return '≥' + it.ref_low;
  if (it.ref_high != null) return '≤' + it.ref_high;
  return '';
}

// Preview and print of the lab results sheet (documents/lab-results.jsx) - the same window
// as the imaging report's (RadiologyReadings.jsx ReportPrint), by the same rules: the
// sheet's language is chosen here, French first, because it is read in another hospital;
// printing is not issuing (director, 2026-10-02): no number, no row in the documents
// history - one change-log line (POST /api/documents/print-log, laboratory.results.print),
// and nothing is printed unless it answered. Printing the same sheet again from this
// window does not log it again, changing the language does.
//   props.values     what is printed (see lab-results.jsx)
//   props.patientId  props.visitId (when the results are all of one visit)  props.t  props.onClose()
function LabResultsPrint(props) {
  var t = props.t, values = props.values;
  var lg = useState('fr'), lang = lg[0], setLang = lg[1];
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var ps = useState(null), patient = ps[0], setPatient = ps[1];
  var ns = useState(''), issued = ns[0], setIssued = ns[1];    // 'logged' once the print is in the change log
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var go = useState(0), printNow = go[0], setPrintNow = go[1];
  var sheet = useRef(null);
  var now = useRef(ymdhm(new Date().toISOString()));

  useEffect(function () {
    api.get('/admin/clinic').then(setClinic).catch(function () { setClinic({}); });
    api.get('/patients/' + props.patientId).then(setPatient).catch(function () { setPatient(null); });
  }, [props.patientId]);
  // The print window's title is what a browser prints in its page header: the sheet's
  // name, not the document number.
  useEffect(function () {
    if (printNow && sheet.current) printDocument(sheet.current, LAB_RESULTS_NAME[lang] || LAB_RESULTS_NAME.fr, lang);
  }, [printNow]);

  // On the sheet and in the record: who the patient is, never how to reach them.
  var who = patient ? { id: patient.id, chart_no: patient.chart_no, last_name: patient.last_name, first_name: patient.first_name, gender: patient.gender, date_of_birth: patient.date_of_birth } : null;
  var ready = !!who && !!clinic;
  var sheets = Math.ceil(values.columns.length / LAB_SHEET_COLUMNS);

  async function issueAndPrint() {
    if (!ready || busy) return;
    if (issued) { setPrintNow(printNow + 1); return; }
    setBusy(true);
    try {
      // What the line says: the days on the sheet and how many tests.
      await api.post('/documents/print-log', { kind: 'lab-results', patient_id: props.patientId, visit_id: props.visitId || null, lang: lang,
        dates: values.columns.map(function (c) { return c.date; }),
        test_count: values.panels.reduce(function (n, P) { return n + P.items.length; }, 0) });
      setIssued('logged'); setPrintNow(printNow + 1);
    } catch (e) {
      alert(t.lb_rPrintFail + (e && e.message ? e.message : ''));
    }
    setBusy(false);
  }

  var btn = { border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
  var on = ready && !busy;
  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim-70)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(860px, 96vw)', height: '94vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--cyan-text)' }}>🖨 {t.lb_rPrintTitle}{sheets > 1 ? ' (' + sheets + ')' : ''}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-2)' }}>{t.lb_rPrintLang}</span>
          {['fr', 'en', 'ko'].map(function (l) {
            return <button key={l} disabled={busy} onClick={function () { if (l !== lang) { setLang(l); setIssued(''); } }}
              style={Object.assign({}, btn, { padding: '4px 10px', background: lang === l ? 'var(--cyan-fill)' : 'var(--chip)', color: lang === l ? 'var(--on-cyan)' : 'var(--text-soft)', border: '1px solid ' + (lang === l ? 'var(--cyan-fill)' : 'var(--border-2)') })}>{l.toUpperCase()}</button>;
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
                <LabResultsLayout values={values} patient={who} clinic={clinic} lang={lang} docNo="" dateStr={now.current} />
              </div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{issued ? t.lb_rPrintIssued : t.lb_rPrintNote}</span>
          <button onClick={issueAndPrint} disabled={!on} style={Object.assign({}, btn, { background: on ? 'var(--cyan-fill)' : 'var(--chip)', color: on ? 'var(--on-cyan)' : 'var(--text-3)', border: '1px solid ' + (on ? 'var(--cyan-fill)' : 'var(--border-2)') })}>
            🖨 {issued ? t.lb_rPrintAgain : t.lb_rPrintGo}</button>
        </div>
      </div>
    </div>
  );
}

// Date × test-item matrix of a patient's lab results (read-only).
//   props.patientId
//   props.tools   the line above the table (the lab results window, director 2026-10-01 -
//                 the good points of the imaging list, the table itself unchanged): a tick
//                 box on each day's column and, right above them, print the ticked days
//                 and untick all; then the kind of test (panel) from a drop-down and a
//                 word to find. Without it (the lab screen's side column) the bare table.
// The ticks live here: they stay while the print window is open and go when the window
// is closed or another patient is shown.
export function LabResults(props) {
  var lc = useLang(); var t = lc.t;
  var rs = useState([]), rows = rs[0], setRows = rs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var pks = useState([]), picked = pks[0], setPicked = pks[1];        // the ticked columns ("date#slot")
  var ks = useState(''), kind = ks[0], setKind = ks[1];              // '' = every panel
  var qs = useState(''), query = qs[0], setQuery = qs[1];
  var prs = useState(null), printing = prs[0], setPrinting = prs[1]; // { values, visitId } while the print window is open

  useEffect(function () {
    setPicked([]); setKind(''); setQuery(''); setPrinting(null);
    if (!props.patientId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    api.get('/lab/patient/' + props.patientId + '/results')
      .then(function (r) { setRows(r || []); }).catch(function () { setRows([]); })
      .then(function () { setLoading(false); });
  }, [props.patientId]);

  var bd = 'var(--border)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)';

  if (loading) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.loading || 'Loading…'}</div>;
  if (!rows.length) return <div style={{ padding: 16, color: t3, fontSize: 14 }}>{t.noLabResults || 'No lab results'}</div>;

  // distinct dates (desc)
  var dates = [];
  rows.forEach(function (r) { var d = ymd(r.result_date); if (d && dates.indexOf(d) < 0) dates.push(d); });
  dates.sort().reverse();

  // A test done twice on one day (a repeat) used to show only the later result:
  // a cell was one date. Now each order of a panel on a date gets a slot --
  // first of the day, second, ... by entry time -- and a date with repeats has
  // one column per slot, each value with its entry time (decision 8,
  // 2026-09-29). Different panels share slot 1, so an ordinary day stays one column.
  function pk(r) { return r.panel_name || r.panel_code || '—'; }
  var firstAt = {};   // order_item_id -> earliest result_at
  rows.forEach(function (r) {
    var at = r.result_at ? new Date(r.result_at).getTime() : 0;
    if (firstAt[r.order_item_id] === undefined || at < firstAt[r.order_item_id]) firstAt[r.order_item_id] = at;
  });
  // Results of an order cancelled in the consultation room (decision 3) stay on
  // the table as a record, but they must not take the numbered columns: a day
  // with one cancelled test and its valid repeat showed the cancelled one as
  // "(1)". Valid orders are numbered first; cancelled ones go into extra columns
  // after them, headed with a cross instead of a number.
  var cancelledOrder = {};
  rows.forEach(function (r) { if (r.order_status === 'cancelled') cancelledOrder[r.order_item_id] = true; });
  var perDayPanel = {};   // date|panel -> {ok: [order_item_id...], off: [...]}
  rows.forEach(function (r) {
    var k = ymd(r.result_date) + '|' + pk(r);
    if (!perDayPanel[k]) perDayPanel[k] = { ok: [], off: [] };
    var list = cancelledOrder[r.order_item_id] ? perDayPanel[k].off : perDayPanel[k].ok;
    if (list.indexOf(r.order_item_id) < 0) list.push(r.order_item_id);
  });
  function byTime(a, b) { return firstAt[a] - firstAt[b] || a - b; }
  var okSlots = {}, offSlots = {};   // date -> numbered columns / cancelled columns
  Object.keys(perDayPanel).forEach(function (k) {
    var d = k.split('|')[0];
    okSlots[d] = Math.max(okSlots[d] || 0, perDayPanel[k].ok.length);
    offSlots[d] = Math.max(offSlots[d] || 0, perDayPanel[k].off.length);
  });
  var slotOf = {};   // order_item_id -> column index within its date
  Object.keys(perDayPanel).forEach(function (k) {
    var d = k.split('|')[0], P = perDayPanel[k];
    P.ok.sort(byTime).forEach(function (id, i) { slotOf[id] = i; });
    P.off.sort(byTime).forEach(function (id, i) { slotOf[id] = (okSlots[d] || 0) + i; });
  });
  var cols = [];   // [{d, s, multi, n (1-based number, or 0 for a cancelled column)}]
  dates.forEach(function (d) {
    var ok = okSlots[d] || 0, off = offSlots[d] || 0, total = Math.max(ok + off, 1);
    for (var i = 0; i < total; i++) cols.push({ d: d, s: i, multi: total > 1, n: i < ok ? (ok > 1 ? i + 1 : -1) : 0 });
  });
  function ck(c) { return c.d + '#' + c.s; }

  // group by panel, then item (by name) preserving order
  var panels = [];
  var pmap = {};
  rows.forEach(function (r) {
    var pname = pk(r);
    if (!pmap[pname]) { pmap[pname] = { name: pname, items: [], imap: {} }; panels.push(pmap[pname]); }
    var P = pmap[pname];
    if (!P.imap[r.name]) {
      P.imap[r.name] = { name: r.name, unit: r.unit, ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, ref_label: r.ref_label, byCol: {},
                         fromCancelled: r.order_status === 'cancelled' };
      P.items.push(P.imap[r.name]);
    } else if (P.imap[r.name].fromCancelled && r.order_status !== 'cancelled') {
      // the reference column shows the latest *valid* result's range, not a cancelled one's
      Object.assign(P.imap[r.name], { unit: r.unit, ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, ref_label: r.ref_label, fromCancelled: false });
    }
    P.imap[r.name].byCol[ymd(r.result_date) + '#' + (slotOf[r.order_item_id] || 0)] = r;
  });

  // ── narrowing what is shown (the window's tools) ──
  // The kind of test is a panel; only panels the patient has results for are offered.
  // A word is looked for in the test and panel names (it keeps those rows) and in the
  // dates (it keeps those columns); a column left with no value is not shown.
  var kinds = panels.map(function (P) { return P.name; });
  var panelsK = kind ? panels.filter(function (P) { return P.name === kind; }) : panels;
  var word = query.trim().toLowerCase();
  function rowHit(P, it) { return (it.name + ' ' + P.name).toLowerCase().indexOf(word) >= 0; }
  var anyRow = !!word && panelsK.some(function (P) { return P.items.some(function (it) { return rowHit(P, it); }); });
  var anyCol = !!word && cols.some(function (c) { return c.d.indexOf(word) >= 0; });
  var noMatch = !!word && !anyRow && !anyCol;
  var panelsShown = noMatch ? [] : panelsK.map(function (P) {
    return { name: P.name, items: anyRow ? P.items.filter(function (it) { return rowHit(P, it); }) : P.items };
  }).filter(function (P) { return P.items.length; });
  function hasValue(list, c) { return list.some(function (P) { return P.items.some(function (it) { return !!it.byCol[ck(c)]; }); }); }
  var colsShown = cols.filter(function (c) { return (!anyCol || c.d.indexOf(word) >= 0) && hasValue(panelsShown, c); });

  // ── ticking days and printing them ──
  // A cancelled column cannot be ticked: a cancelled test's result is not sent out. What
  // is printed: the ticked days, and of them the kind of test chosen in the drop-down
  // (a deliberate choice; the word in the search box is only a way to find one's place).
  function tick(c) {
    var k = ck(c);
    setPicked(picked.indexOf(k) >= 0 ? picked.filter(function (x) { return x !== k; }) : picked.concat([k]));
  }
  var toPrint = cols.filter(function (c) { return c.n !== 0 && picked.indexOf(ck(c)) >= 0 && hasValue(panelsK, c); });
  function sheetValues() {
    var by = {}, at = {}, visits = [];
    var outPanels = panelsK.map(function (P) {
      return { name: P.name, items: P.items.map(function (it) {
        var found = toPrint.map(function (c) { var r = it.byCol[ck(c)]; return r && r.order_status !== 'cancelled' ? r : null; });
        var first = found.filter(Boolean)[0];
        if (!first) return null;
        var rowRef = refText(first, ' – ');
        found.forEach(function (r, i) {
          if (!r) return;
          var k = ck(toPrint[i]);
          if (r.result_by_name) { by[k] = by[k] || []; if (by[k].indexOf(r.result_by_name) < 0) by[k].push(r.result_by_name); }
          var ms = r.result_at ? new Date(r.result_at).getTime() : 0;
          if (ms && (!at[k] || ms < at[k].ms)) at[k] = { ms: ms, text: hhmm(r.result_at) };
          if (r.visit_id && visits.indexOf(r.visit_id) < 0) visits.push(r.visit_id);
        });
        return { name: it.name, unit: first.unit || '', ref: rowRef, cells: found.map(function (r) {
          if (!r) return null;
          var own = refText(r, ' – ');
          return { value: String(r.value == null ? '' : r.value), flag: r.flag || '', ref: own && own !== rowRef ? own : '' };
        }) };
      }).filter(Boolean) };
    }).filter(function (P) { return P.items.length; });
    var columns = toPrint.map(function (c) {
      var k = ck(c);
      return { date: c.d, n: c.n > 0 ? c.n : 0, time: c.multi && at[k] ? at[k].text : '', by: (by[k] || []).join(', ') };
    });
    return { values: { columns: columns, panels: outPanels }, visitId: visits.length === 1 ? visits[0] : null };
  }

  function cell(r, multi) {
    if (!r) return <span style={{ color: t3 }}>·</span>;
    // An order cancelled in the consultation room keeps its results as a record
    // (decision 3): shown grey and struck through, without the high/low colour,
    // the reason on hover when there is one.
    if (r.order_status === 'cancelled') {
      var tip = t.lb_cancelled + (r.cancel_reason ? ' — ' + r.cancel_reason : '');
      return <span title={tip} style={{ color: t3, textDecoration: 'line-through' }}>{r.value}{multi ? <span style={{ display: 'block', fontSize: 10, textDecoration: 'none' }}>{hhmm(r.result_at)}</span> : null}</span>;
    }
    // 'abnormal' is a text result that differs from its reference text (e.g. a
    // positive malaria test): red like high, marked "!" since it is not "above".
    var odd = r.flag === 'low' || r.flag === 'high' || r.flag === 'abnormal';
    var color = r.flag === 'low' ? 'var(--accent-text)' : odd ? 'var(--danger-text)' : tx;
    var mark = r.flag === 'low' ? '▼' : r.flag === 'high' ? '▲' : r.flag === 'abnormal' ? '! ' : '';
    // The reference column shows one range per row (the latest), but each result
    // was judged by the range saved with it -- an older band for a child who has
    // since grown, or a range edited in Settings since. Hovering shows that one.
    var ref = refText(r);
    var tip = ref ? (t.refRange || 'Ref') + ': ' + ref + (r.unit ? ' ' + r.unit : '') + (r.ref_label ? ' · ' + r.ref_label : '') : undefined;
    var v = <span title={tip} style={{ color: color, fontWeight: odd ? 800 : 500 }}>{mark}{r.value}</span>;
    if (!multi) return v;
    return <span>{v}<span style={{ display: 'block', color: t3, fontSize: 10 }}>{hhmm(r.result_at)}</span></span>;
  }

  var th = { padding: '6px 8px', textAlign: 'left', color: t2, fontSize: 12, borderBottom: '1px solid ' + bd, position: 'sticky', top: 0, background: 'var(--panel-2)', whiteSpace: 'nowrap' };
  var td = { padding: '5px 8px', fontSize: 13, borderBottom: '1px solid var(--line-soft)', whiteSpace: 'nowrap' };
  // The last date column (often the cancelled "✕" one) kept its values against the
  // panel's right edge; a wider padding there leaves room after it, also when the
  // table is scrolled sideways to its end.
  function edge(i) { return i === colsShown.length - 1 ? { paddingRight: 20 } : null; }
  // A button of the line above the table - the imaging list's (RadiologyReadings.jsx):
  // off = greyed, and it keeps its place so the table does not move when a box is ticked.
  var act = function (on) { return { flex: 'none', background: 'var(--chip)', color: on ? 'var(--text-soft)' : t3, border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 9px', cursor: on ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {props.tools ? <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid ' + bd }}>
        {/* what is done with the ticked days - over the tick boxes, at the left where the
            day columns begin (the table is as wide as its columns in this window) */}
        <button disabled={!toPrint.length} onClick={function () { if (toPrint.length) setPrinting(sheetValues()); }}
          title={toPrint.length ? '' : t.lb_rNeedTick} style={act(toPrint.length > 0)}>🖨 {String(t.lb_rPrintN || '').replace('{n}', toPrint.length)}</button>
        <button disabled={!picked.length} onClick={function () { setPicked([]); }} style={act(picked.length > 0)}>{t.lb_rUntickAll}</button>
        <span style={{ flex: 'none', width: 1, alignSelf: 'stretch', background: bd, margin: '0 2px' }}></span>
        {/* narrowing the table: the kind of test from a drop-down (only when there are several), a word */}
        {kinds.length > 1 ? <select aria-label={t.lb_rKind} value={kind} onChange={function (e) { setKind(e.target.value); }}
          style={{ flex: '0 1 190px', minWidth: 0, background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 3, padding: '2px 4px', color: kind ? 'var(--cyan-text)' : tx, fontSize: 12, fontWeight: kind ? 700 : 400, fontFamily: 'inherit', textOverflow: 'ellipsis' }}>
          <option value="">{t.lb_rKindAll}</option>
          {kinds.map(function (k) { return <option key={k} value={k}>{k}</option>; })}
        </select> : null}
        <input value={query} onChange={function (e) { setQuery(e.target.value); }} placeholder={t.lb_rSearch} aria-label={t.lb_rSearch}
          style={{ flex: '1 1 90px', minWidth: 0, maxWidth: 220, boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 3, color: tx, fontSize: 12, padding: '2px 6px', outline: 'none' }} />
      </div> : null}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {noMatch || !panelsShown.length ? <div style={{ padding: 14, color: t3, fontSize: 13, overflowWrap: 'anywhere' }}>{t.lb_rNoMatch}</div> :
        <table style={{ borderCollapse: 'collapse', width: props.tools ? 'auto' : '100%', minWidth: props.tools ? 'min(100%, 560px)' : undefined, fontFamily: 'system-ui,sans-serif' }}>
          <thead>
            <tr>
              <th style={Object.assign({}, th, { left: 0, zIndex: 2 })}>{t.testName || '검사명'}</th>
              <th style={th}>{t.unit || '단위'}</th>
              <th style={th}>{t.refRange || '참고치'}</th>
              {colsShown.map(function (c, i) {
                var head = c.d + (c.n > 0 ? ' (' + c.n + ')' : c.n === 0 ? ' ✕' : '');
                return <th key={ck(c)} title={c.n === 0 ? t.lb_cancelled : undefined} style={Object.assign({}, th, { textAlign: 'right' }, c.n === 0 ? { color: t3 } : null, edge(i))}>
                  {props.tools ? <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: c.n === 0 ? 'not-allowed' : 'pointer' }}>
                    <input type="checkbox" checked={picked.indexOf(ck(c)) >= 0} disabled={c.n === 0} title={c.n === 0 ? t.lb_rTickCancelled : t.lb_rTick}
                      onChange={function () { tick(c); }} style={{ width: 16, height: 16, margin: 0, cursor: c.n === 0 ? 'not-allowed' : 'pointer', accentColor: 'var(--cyan-fill)' }} />
                    {head}
                  </label> : head}
                </th>;
              })}
            </tr>
          </thead>
          <tbody>
            {panelsShown.map(function (P) {
              return [
                <tr key={'p-' + P.name}><td colSpan={3 + colsShown.length} style={{ padding: '5px 8px', background: 'var(--bg-group)', color: 'var(--cyan-text-2)', fontWeight: 800, fontSize: 12, borderBottom: '1px solid ' + bd }}><span style={{ position: 'sticky', left: 8 }}>{P.name}</span></td></tr>
              ].concat(P.items.map(function (it) {
                return <tr key={P.name + '-' + it.name}>
                  <td style={Object.assign({}, td, { position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-col)', fontWeight: 600, color: tx })}>{it.name}</td>
                  <td style={Object.assign({}, td, { color: t2 })}>{it.unit || ''}</td>
                  <td style={Object.assign({}, td, { color: t3 })}>{refText(it)}{it.ref_label ? <span style={{ display: 'block', fontSize: 10, color: 'var(--cyan-text)' }}>{it.ref_label}</span> : null}</td>
                  {colsShown.map(function (c, i) { return <td key={ck(c)} style={Object.assign({}, td, { textAlign: 'right', fontFamily: 'monospace' }, edge(i), picked.indexOf(ck(c)) >= 0 ? { background: 'var(--cyan-a12)' } : null)}>{cell(it.byCol[ck(c)], c.multi)}</td>; })}
                </tr>;
              }));
            })}
          </tbody>
        </table>}
      </div>
      {printing ? <LabResultsPrint values={printing.values} visitId={printing.visitId} patientId={props.patientId} t={t} onClose={function () { setPrinting(null); }} /> : null}
    </div>
  );
}

// The lab results window: the same frame as the imaging list's window of the consultation
// screen (title, chart number and name, close; 88vw x 86vh), kept here so that every
// screen that opens it gets the same one.
//   props.patient { id, chart_no, last_name, first_name }   props.onClose()
export function LabResultsWindow(props) {
  var lc = useLang(); var t = lc.t; var p = props.patient || {};
  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role="dialog" aria-label={t.labResultsTitle} onClick={function (e) { e.stopPropagation(); }} style={{ width: '88vw', height: '86vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-2)', background: 'var(--panel-head)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--cyan-text)', whiteSpace: 'nowrap', flexShrink: 0 }}>🧪 {t.labResultsTitle || '검사결과'}</span>
          {/* a long name wraps in the room that is left; the title and the button keep theirs */}
          <span style={{ color: 'var(--text-2)', fontSize: 13, minWidth: 0, overflowWrap: 'anywhere' }}>{p.chart_no} · {p.last_name} {p.first_name}</span>
          <button onClick={props.onClose} style={{ marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap', background: 'var(--btn-neutral-2)', color: 'var(--text)', border: 'none', borderRadius: 5, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t.close || '닫기'} ✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><LabResults patientId={p.id} tools={true} /></div>
      </div>
    </div>
  );
}
