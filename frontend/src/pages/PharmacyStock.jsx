// The pharmacy screen's Stock tab: current count per drug, receive / shelf count /
// discard, and the drug's stock record. Every change goes through the server's
// moveStock() (pharmacy.routes.js), which writes the count and a ledger row
// together; this screen only asks and shows. Pharmacy session. See
// wiki/modules/pharmacy.md 3.8 and 3.9.
import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { formLabel, checkList, checkOpen, checkText } from '../documents/drug-info.js';
import { packWord } from '../documents/rx-dosing.js';

// Exact texts from pharmacy.routes.js; the API client passes on only the message.
var ERR_DISCARD_MORE = 'Cannot discard more than the recorded stock; count the shelf first';
var ERR_MEMO_REQUIRED = 'A note is required';
var ERR_WHOLE_NUMBER = 'Quantity must be a whole number';
var ERR_NOTHING_TO_CHECK = 'Nothing left to check on this drug';
// Memos the server writes itself, shown translated.
var MEMO_OUTSIDE = 'Changed outside the stock record (settings screen)';
var MEMO_OPENING = 'Start of the stock record';
// Written by the import of the old stock program's list (migration 034).
var MEMO_IMPORT = 'Imported from the old stock program (count of 2026-05-15)';
// Value of the category filter that shows the imported drugs still to check.
var TO_CHECK = '__to_check';

var KIND_COLOR = { opening: 'var(--text-2)', receive: 'var(--ok-text)', dispense: 'var(--accent-text)', adjust: 'var(--warn-text)', discard: 'var(--danger-text)' };

function belowMin(d) {
  var min = Number(d.min_stock);
  return min > 0 && Number(d.stock_qty) <= min;
}
// The unit of a pack-unit drug's count ("flacons", "병"), shown after the number;
// empty for a drug counted in doses. The stock number itself has no unit (H2).
function stockUnit(d, lang) {
  if (!d || !d.pack_unit) return '';
  if (lang === 'ko') return packWord(d, 'ko');
  var n = Number(d.stock_qty);
  return packWord(d, lang, n === 1 ? 1 : 2).replace(/^[\d½.]+\s*/, '');
}
function catLabel(t, c) { return (c && t['ph_cat_' + c]) || c || ''; }
function thisMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
// Excel opens a UTF-8 file with a BOM correctly (accents, Korean); without it the
// accents in French drug names and headings come out garbled.
function downloadCsv(filename, header, rows) {
  var esc = function (v) { var x = v === null || v === undefined ? '' : String(v); return /[",\r\n;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
  var text = '\uFEFF' + [header].concat(rows).map(function (r) { return r.map(esc).join(','); }).join('\r\n') + '\r\n';
  var url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  var a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

export function PharmacyStock() {
  var lc = useLang(); var t = lc.t;
  var locale = lc.lang === 'ko' ? 'ko-KR' : lc.lang === 'fr' ? 'fr-FR' : 'en-GB';
  var ds = useState([]), drugs = ds[0], setDrugs = ds[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var cs = useState(''), cat = cs[0], setCat = cs[1];
  var ss = useState(null), selId = ss[0], setSelId = ss[1];
  var ms = useState([]), moves = ms[0], setMoves = ms[1];
  // form: null | { kind: 'receive'|'count'|'discard', amount: '', memo: '' }
  var fs = useState(null), form = fs[0], setForm = fs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var ns = useState(''), notice = ns[0], setNotice = ns[1];
  // 'drug' shows the chosen drug; 'report' the monthly report (step 3).
  var vs = useState('drug'), view = vs[0], setView = vs[1];
  var mos = useState(thisMonth()), month = mos[0], setMonth = mos[1];
  var rps = useState(null), report = rps[0], setReport = rps[1];
  var rls = useState(false), reportLoading = rls[0], setReportLoading = rls[1];

  async function loadReport(m) {
    setReportLoading(true);
    try { setReport(await api.get('/pharmacy/stock/report?month=' + encodeURIComponent(m))); }
    catch (err) { setReport(null); alert('Error: ' + err.message); }
    setReportLoading(false);
  }
  useEffect(function () { if (view === 'report') loadReport(month); }, [view, month]);

  var REPORT_HEAD = [t.code, t.colDrugName, t.ph_category, t.ph_rStart, t.ph_rReceived, t.ph_rDispensed, t.ph_colShortfall, t.ph_rAdjusted, t.ph_rDiscarded, t.ph_rEnd, t.ph_rCheck];
  function exportCsv() {
    if (!report) return;
    var rows = report.rows.map(function (r) {
      return [r.code, r.name, catLabel(t, r.category), r.start, r.received, r.dispensed, r.shortfall, r.adjusted, r.discarded, r.end,
        (r.ok ? 'OK' : t.ph_rMismatch) + (r.started_on ? ' · ' + fill(t.ph_rStarted, r.started_on) : '') + (r.mixed_units ? ' · ' + t.ph_rMixed : '')];
    });
    downloadCsv('stock-' + report.month + '.csv', REPORT_HEAD, rows);
  }
  function fill(sText, date) { return String(sText || '').replace('{date}', date); }

  async function loadDrugs() {
    setLoading(true);
    try { setDrugs(await api.get('/pharmacy/stock')); } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  }
  async function loadMoves(id) {
    if (!id) { setMoves([]); return; }
    try { setMoves(await api.get('/pharmacy/stock/' + id + '/movements')); } catch (err) { setMoves([]); alert('Error: ' + err.message); }
  }
  useEffect(function () { loadDrugs(); }, []);
  useEffect(function () { loadMoves(selId); setForm(null); setNotice(''); }, [selId]);

  var categories = useMemo(function () {
    var seen = {}; drugs.forEach(function (d) { if (d.category) seen[d.category] = true; });
    return Object.keys(seen).sort();
  }, [drugs]);
  var shown = useMemo(function () {
    var s = q.trim().toLowerCase();
    return drugs.filter(function (d) {
      if (cat === TO_CHECK) { if (!checkOpen(d)) return false; }
      else if (cat && d.category !== cat) return false;
      if (!s) return true;
      return (d.name || '').toLowerCase().indexOf(s) >= 0 || (d.code || '').toLowerCase().indexOf(s) >= 0 || (d.generic_name || '').toLowerCase().indexOf(s) >= 0;
    });
  }, [drugs, q, cat]);
  var sel = drugs.find(function (d) { return d.id === selId; }) || null;
  var toCheck = drugs.filter(checkOpen).length;

  async function markChecked() {
    if (!sel || busy) return;
    if (!window.confirm(String(t.ph_checkDoneConfirm || '').replace('{name}', sel.name))) return;
    setBusy(true);
    try { await api.post('/pharmacy/stock/' + sel.id + '/check-done', {}); }
    catch (err) { alert(err.message === ERR_NOTHING_TO_CHECK ? t.ph_errNothingToCheck : 'Error: ' + err.message); }
    await loadDrugs();
    setBusy(false);
  }

  function openForm(kind) { setForm({ kind: kind, amount: '', memo: '' }); setNotice(''); }

  async function submit() {
    if (!sel || !form || busy) return;
    var n = Number(form.amount);
    var minN = form.kind === 'count' ? 0 : 1;
    if (form.amount === '' || !Number.isInteger(n) || n < minN) { alert(t.ph_errWhole); return; }
    if (form.kind !== 'receive' && !form.memo.trim()) { alert(t.ph_errMemo); return; }
    if (form.kind === 'discard' && n > Number(sel.stock_qty)) { alert(t.ph_errDiscardMore); return; }
    var body = form.kind === 'count' ? { counted: n, memo: form.memo.trim() } : { qty: n, memo: form.memo.trim() };
    setBusy(true);
    try {
      var r = await api.post('/pharmacy/stock/' + sel.id + '/' + form.kind, body);
      setNotice(sel.name + ': ' + r.stock_before + ' → ' + r.stock_after);
      setForm(null);
      await loadDrugs();
      await loadMoves(sel.id);
    } catch (err) {
      if (err.message === ERR_DISCARD_MORE) alert(t.ph_errDiscardMore);
      else if (err.message === ERR_MEMO_REQUIRED) alert(t.ph_errMemo);
      else if (err.message === ERR_WHOLE_NUMBER) alert(t.ph_errWhole);
      else alert('Error: ' + err.message);
      await loadDrugs();
    }
    setBusy(false);
  }

  function memoText(m) {
    if (m.memo === MEMO_OUTSIDE) return t.ph_memoOutside;
    if (m.memo === MEMO_OPENING) return t.ph_memoOpening;
    if (m.memo === MEMO_IMPORT) return t.ph_memoImport;
    return m.memo || '';
  }
  function when(v) { try { return new Date(v).toLocaleString(locale, { hour12: false }); } catch (e) { return v; } }

  var bd = 'var(--border)', bd2 = 'var(--border-2)', scBg = 'var(--panel-head)', pn = 'var(--panel)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)';
  var IN = { background: 'var(--field-3)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '6px 9px', color: tx, outline: 'none', boxSizing: 'border-box', fontSize: 16 };
  var FORM = {
    receive: { title: t.ph_receive, amount: t.ph_receiveQty, memo: t.ph_memoReceiveHint, color: 'var(--ok)' },
    count: { title: t.ph_count, amount: t.ph_countedQty, memo: t.ph_memoCountHint, color: 'var(--warn)' },
    discard: { title: t.ph_discard, amount: t.ph_discardQty, memo: t.ph_memoDiscardHint, color: 'var(--danger)' },
  };
  // Fixed shares, as in the prescription table: every row is its own grid, and with plain
  // fr a long word (a patient's name) widened its column in that row only.
  var COLS = 'minmax(0,1.35fr) minmax(0,.9fr) minmax(0,.6fr) minmax(0,.8fr) minmax(0,.6fr) minmax(0,.8fr) minmax(0,1.75fr) minmax(0,1.2fr)';

  return (
    // Fills what the pharmacy screen leaves under its top bars; only the list, the
    // record and the report scroll (Pharmacy.jsx is a window-high column).
    <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', flex: 1, minHeight: 0 }}>
      <div style={{ borderRight: '1px solid ' + bd, display: 'flex', flexDirection: 'column', background: pn }}>
        <div style={{ padding: '7px 8px', borderBottom: '1px solid ' + bd, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={t.ph_stockSearch} style={Object.assign({}, IN, { width: '100%' })} />
          <button onClick={function () { setView('report'); }} style={{ background: view === 'report' ? 'var(--violet)' : 'var(--chip)', color: view === 'report' ? 'var(--on-fill)' : tx, border: '1px solid var(--violet-ink)', borderRadius: 5, padding: '6px 10px', cursor: 'pointer', fontSize: 15, fontWeight: 800, textAlign: 'left' }}>📊 {t.ph_reportTitle}</button>
          <select value={cat} onChange={function (e) { setCat(e.target.value); }} style={Object.assign({}, IN, { width: '100%' })}>
            <option value="">{t.ph_allCategories}</option>
            {toCheck ? <option value={TO_CHECK}>⚠ {t.ph_toCheckFilter} ({toCheck})</option> : null}
            {categories.map(function (c) { return <option key={c} value={c}>{catLabel(t, c)}</option>; })}
          </select>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {loading ? <div style={{ padding: 20, textAlign: 'center', color: t3 }}>{t.loading}</div> : null}
          {shown.map(function (d) {
            var active = d.id === selId; var low = belowMin(d);
            return <div key={d.id} onClick={function () { setSelId(d.id); setView('drug'); }} style={{ padding: '9px 12px', borderBottom: '1px solid ' + bd, cursor: 'pointer', background: active ? 'var(--violet-a15)' : 'transparent', borderLeft: active ? '3px solid var(--violet-ink)' : '3px solid transparent', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: tx, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{checkOpen(d) ? <span title={t.ph_toCheck} style={{ color: 'var(--warn-text)' }}>⚠ </span> : null}{d.name}</div>
                <div style={{ color: t3, fontSize: 13 }}>{d.code} · {catLabel(t, d.category)}{d.dosage_form ? ' · ' + formLabel(t, d.dosage_form) : ''}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: low ? 'var(--danger-text)' : 'var(--ok-text)', whiteSpace: 'nowrap' }}>{d.stock_qty}{d.pack_unit ? <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 3 }}>{stockUnit(d, lc.lang)}</span> : null}</div>
            </div>;
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {view === 'report' ? <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-strong-2)' }}>📊 {t.ph_reportTitle}</div>
            <label style={{ color: t2, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{t.ph_month}
              <input type="month" value={month} max={thisMonth()} onChange={function (e) { if (e.target.value) setMonth(e.target.value); }} style={Object.assign({}, IN, { width: 170 })} />
            </label>
            <div style={{ flex: 1 }}></div>
            <button onClick={exportCsv} disabled={!report || !report.rows.length} style={{ background: 'var(--chip)', color: report && report.rows.length ? tx : 'var(--text-4)', border: '1px solid ' + bd2, borderRadius: 5, padding: '6px 14px', cursor: report && report.rows.length ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 800 }}>⬇ CSV</button>
          </div>
          <div style={{ padding: '8px 16px', color: t3, fontSize: 13, borderBottom: '1px solid ' + bd }}>{t.ph_rFormula}</div>
          <div style={{ padding: 16, overflow: 'auto', flex: 1, minHeight: 0 }}>
            {reportLoading ? <div style={{ color: t3 }}>{t.loading}</div> : null}
            {!reportLoading && report && report.rows.length === 0 ? <div style={{ color: t3, fontSize: 16 }}>{t.ph_reportEmpty}</div> : null}
            {!reportLoading && report && report.rows.length ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ background: 'var(--panel-2)' }}>
                {REPORT_HEAD.map(function (h, i) { return <th key={i} style={{ padding: '7px 8px', textAlign: i >= 3 ? 'right' : 'left', color: t3, borderBottom: '1px solid ' + bd, whiteSpace: i >= 3 ? 'nowrap' : 'normal' }}>{h}</th>; })}
              </tr></thead>
              <tbody>{report.rows.map(function (r) {
                var num = { padding: '6px 8px', textAlign: 'right', color: t2, borderBottom: '1px solid ' + bd, fontVariantNumeric: 'tabular-nums' };
                return <tr key={r.drug_id}>
                  <td style={{ padding: '6px 8px', color: 'var(--accent-text)', borderBottom: '1px solid ' + bd, fontFamily: 'monospace' }}>{r.code}</td>
                  <td style={{ padding: '6px 8px', color: tx, borderBottom: '1px solid ' + bd }}>{r.name}{r.started_on ? <div style={{ color: 'var(--warn-text)', fontSize: 12 }}>{fill(t.ph_rStarted, r.started_on)}</div> : null}</td>
                  <td style={{ padding: '6px 8px', color: t2, borderBottom: '1px solid ' + bd }}>{catLabel(t, r.category)}</td>
                  <td style={num}>{r.start}</td>
                  <td style={Object.assign({}, num, { color: r.received ? 'var(--ok-text)' : t3 })}>{r.received ? '+' + r.received : 0}</td>
                  <td style={Object.assign({}, num, { color: r.dispensed ? 'var(--accent-text)' : t3 })}>{r.dispensed ? '−' + r.dispensed : 0}{r.mixed_units ? <div title={t.ph_rMixedHint} style={{ color: 'var(--warn-text)', fontSize: 12, fontWeight: 800, whiteSpace: 'normal' }}>{t.ph_rMixed}</div> : null}</td>
                  <td style={Object.assign({}, num, { color: r.shortfall ? 'var(--danger-text)' : t3, fontWeight: r.shortfall ? 800 : 400 })}>{r.shortfall || 0}</td>
                  <td style={Object.assign({}, num, { color: r.adjusted ? 'var(--warn-text)' : t3 })}>{r.adjusted > 0 ? '+' : ''}{r.adjusted}</td>
                  <td style={Object.assign({}, num, { color: r.discarded ? 'var(--danger-text)' : t3 })}>{r.discarded ? '−' + r.discarded : 0}</td>
                  <td style={Object.assign({}, num, { color: tx, fontWeight: 900 })}>{r.end}</td>
                  <td style={Object.assign({}, num, { color: r.ok ? 'var(--ok-text)' : 'var(--danger-text)', fontWeight: 800 })}>{r.ok ? '✓' : '✗ ' + t.ph_rMismatch}</td>
                </tr>;
              })}</tbody>
            </table> : null}
          </div>
        </div> : !sel ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t3, fontSize: 17 }}>{t.ph_pickDrug}</div> : <>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-strong-2)' }}>{sel.name}</div>
              <div style={{ marginTop: 4, fontSize: 15, color: t2 }}>{sel.code} · {catLabel(t, sel.category)}{sel.dosage_form ? ' · ' + formLabel(t, sel.dosage_form) : ''}{sel.generic_name ? ' · ' + sel.generic_name : ''}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['receive', 'count', 'discard'].map(function (k) {
                  var on = form && form.kind === k;
                  return <button key={k} onClick={function () { openForm(k); }} style={{ background: on ? FORM[k].color : 'var(--chip)', color: on ? 'var(--on-bright)' : tx, border: '1px solid ' + FORM[k].color, borderRadius: 5, padding: '6px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>{FORM[k].title}</button>;
                })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: t3, fontSize: 14 }}>{t.ph_stockNow}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: belowMin(sel) ? 'var(--danger-text)' : 'var(--text-strong-2)' }}>{sel.stock_qty}{sel.pack_unit ? <span style={{ fontSize: 16, fontWeight: 800, marginLeft: 5 }}>{stockUnit(sel, lc.lang)}</span> : null}</div>
              {Number(sel.min_stock) > 0 ? <div style={{ color: belowMin(sel) ? 'var(--danger-text)' : t3, fontSize: 13, fontWeight: belowMin(sel) ? 800 : 400 }}>{t.ph_minStock} {sel.min_stock}{belowMin(sel) ? ' — ' + t.ph_belowMin : ''}</div> : null}
            </div>
          </div>

          {checkList(sel).length ? <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + bd, background: checkOpen(sel) ? 'var(--warn-a14)' : 'transparent', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ color: checkOpen(sel) ? 'var(--warn-text)' : t3, fontWeight: 800, fontSize: 14 }}>{checkOpen(sel) ? '⚠ ' : '✓ '}{t.ph_checkTitle}</div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20, color: checkOpen(sel) ? tx : t3, fontSize: 14 }}>
                {checkList(sel).map(function (c, i) { return <li key={i}>{checkText(t, c)}</li>; })}
              </ul>
            </div>
            {checkOpen(sel)
              ? <button onClick={markChecked} disabled={busy} style={{ background: 'var(--chip)', color: 'var(--warn-text)', border: '1px solid var(--warn-ink)', borderRadius: 5, padding: '6px 14px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800 }}>✓ {t.ph_checkDone}</button>
              : <div style={{ color: t3, fontSize: 13 }}>{String(t.ph_checkDoneBy || '').replace('{who}', sel.import_check_done_by_name || '-').replace('{date}', when(sel.import_check_done_at))}</div>}
          </div> : null}

          {form ? <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: 'var(--panel-2)', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: t2, fontSize: 13, fontWeight: 700 }}>{FORM[form.kind].amount}
              <input type="number" min={form.kind === 'count' ? 0 : 1} step="1" value={form.amount} autoFocus onChange={function (e) { setForm(Object.assign({}, form, { amount: e.target.value })); }} style={Object.assign({}, IN, { width: 150 })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: t2, fontSize: 13, fontWeight: 700, flex: 1, minWidth: 240 }}>{t.ph_memoLabel}
              <input value={form.memo} placeholder={FORM[form.kind].memo} onChange={function (e) { setForm(Object.assign({}, form, { memo: e.target.value })); }} style={Object.assign({}, IN, { width: '100%' })} />
            </label>
            {form.kind === 'count' && form.amount !== '' && Number.isInteger(Number(form.amount)) ? <div style={{ color: t2, fontSize: 14, paddingBottom: 8 }}>{t.ph_countDiff} {Number(form.amount) - Number(sel.stock_qty) > 0 ? '+' : ''}{Number(form.amount) - Number(sel.stock_qty)}</div> : null}
            <button onClick={submit} disabled={busy} style={{ background: FORM[form.kind].color, color: 'var(--on-bright)', border: 'none', borderRadius: 5, padding: '8px 18px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 900 }}>{t.save}</button>
            <button onClick={function () { setForm(null); }} style={{ background: 'var(--chip)', color: t2, border: '1px solid ' + bd2, borderRadius: 5, padding: '8px 14px', cursor: 'pointer', fontSize: 15 }}>{t.cancel}</button>
          </div> : null}
          {notice ? <div style={{ padding: '8px 16px', background: 'var(--ok-a18)', color: 'var(--ok-text-2)', fontWeight: 800, fontSize: 15, borderBottom: '1px solid ' + bd }}>✓ {notice}</div> : null}

          <div style={{ padding: 16, overflow: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ fontWeight: 800, color: t2, marginBottom: 8 }}>{t.ph_history}</div>
            <div style={{ background: pn, border: '1px solid ' + bd, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, background: 'var(--panel-2)', borderBottom: '1px solid ' + bd, color: t3, fontSize: 14, fontWeight: 800 }}>
                {[t.ph_colWhen, t.ph_colKind, t.ph_colChange, t.ph_colBeforeAfter, t.ph_colShortfall, t.ph_colWho, t.ph_colPatient, t.ph_memoLabel].map(function (h, i) { return <div key={i} style={{ padding: '7px 9px' }}>{h}</div>; })}
              </div>
              {moves.length === 0 ? <div style={{ padding: 16, color: t3 }}>{t.ph_noHistory}</div> : null}
              {moves.map(function (m) {
                return <div key={m.id} style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid ' + bd, fontSize: 14, color: t2 }}>
                  <div style={{ padding: '7px 9px' }}>{when(m.created_at)}</div>
                  <div style={{ padding: '7px 9px', color: KIND_COLOR[m.kind] || t2, fontWeight: 800 }}>{t['ph_kind_' + m.kind] || m.kind}</div>
                  <div style={{ padding: '7px 9px', fontWeight: 800, color: m.qty > 0 ? 'var(--ok-text)' : m.qty < 0 ? 'var(--danger-text)' : t2 }}>{m.qty > 0 ? '+' : ''}{m.qty}</div>
                  <div style={{ padding: '7px 9px' }}>{m.stock_before} → {m.stock_after}</div>
                  <div style={{ padding: '7px 9px', color: m.shortfall > 0 ? 'var(--danger-text)' : t3, fontWeight: m.shortfall > 0 ? 800 : 400 }}>{m.shortfall > 0 ? m.shortfall : '-'}</div>
                  <div style={{ padding: '7px 9px' }}>{m.staff_name || '-'}</div>
                  <div style={{ padding: '7px 9px', overflowWrap: 'anywhere' }}>{m.chart_no ? <>{m.patient_name || ''} <span style={{ whiteSpace: 'nowrap' }}>#{m.chart_no}</span></> : '-'}</div>
                  <div style={{ padding: '7px 9px', color: m.memo === MEMO_OUTSIDE ? 'var(--warn-text)' : t2 }}>{memoText(m)}</div>
                </div>;
              })}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
