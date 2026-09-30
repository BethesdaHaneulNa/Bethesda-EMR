import { useState, useEffect, useRef } from 'react';
import { TopBar } from '../components/TopBar.jsx';
import { useLang } from '../i18n/index.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';
import { api } from '../api/client.js';
import { LabResults } from '../components/LabResults.jsx';
import { PatientFinder } from '../components/PatientFinder.jsx';
import { DocumentModal } from '../components/DocumentModal.jsx';

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
function nm(v) { return ((v.last_name || '') + ' ' + (v.first_name || '')).trim(); }
// French typing: "1,5" is 1.5 and "12 000" is 12000 (parseFloat alone reads 1
// and 12). Same rule as readNumber() in backend/src/routes/lab.routes.js, which
// decides the flag that is saved -- change both together.
function readNumber(v) {
  if (v == null) return NaN;
  var s = String(v).trim().replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1');
  if ((s.match(/,/g) || []).length === 1) s = s.replace(/(\d),(\d)/, '$1.$2');
  return parseFloat(s);
}
function hasEntry(it) {
  return (it.value != null && String(it.value).trim() !== '') || (it.comment != null && String(it.comment).trim() !== '');
}
// The flag rule. Same code as flagFor() in backend/src/routes/lab.routes.js,
// which decides the flag that is saved -- change both together.
//
// Text results (decision 12, 2026-09-29): an item with a reference text such as
// "Negative" is flagged 'abnormal' when the result says anything else. Only
// spellings of the same word count as the same -- language variants, never a
// different finding. "Trace" is deliberately not listed: whether it is abnormal
// is left to the doctors, and until they say so it is flagged like any other
// difference. Add their exceptions to SAME_WORDS.
var SAME_WORDS = [
  ['negative', 'neg', 'negatif', '-', '음성'],
];
function normWord(v) {
  // strip accents (Négatif -> negatif), then recompose so Korean (음성) stays whole
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .toLowerCase().replace(/[\s.()]/g, '');
}
function sameText(value, refText) {
  var a = normWord(value), b = normWord(refText);
  if (a === b) return true;
  return SAME_WORDS.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
}
function num(v) { return v === null || v === undefined || v === '' ? NaN : parseFloat(v); }

// 'low' | 'high' | 'normal' | 'abnormal' (text) | '' (cannot tell / nothing to compare)
// A value written as "<5" or ">500" is judged by its number only where the
// answer is certain: ">500" with an upper limit of 400 is high, "<5" with no
// lower limit and an upper limit of 40 is normal; otherwise no flag.
function flagFor(value, lo, hi, refText) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  var L = num(lo), H = num(hi), hasL = !isNaN(L), hasH = !isNaN(H);
  var cmp = String(value).trim().match(/^(<=|>=|≤|≥|<|>)\s*(.*)$/);
  var n = readNumber(cmp ? cmp[2] : value);
  if (!isNaN(n) && (hasL || hasH)) {
    if (!cmp) {
      if (hasL && n < L) return 'low';
      if (hasH && n > H) return 'high';
      return 'normal';
    }
    var op = cmp[1], below = op === '<' || op === '<=' || op === '≤', strict = op === '<' || op === '>';
    if (below) {
      if (hasL && (strict ? n <= L : n < L)) return 'low';
      if (!hasL && hasH && n <= H) return 'normal';
      return '';
    }
    if (hasH && (strict ? n >= H : n > H)) return 'high';
    if (!hasH && hasL && n >= L) return 'normal';
    return '';
  }
  if (refText) return sameText(value, refText) ? 'normal' : 'abnormal';
  return '';
}

export default function LabPage() {
  var lc = useLang(); var t = lc.t;
  var ps = useState([]), pending = ps[0], setPending = ps[1];
  var cps = useState([]), completed = cps[0], setCompleted = cps[1];
  var tb = useState('pending'), tab = tb[0], setTab = tb[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];       // consultation group
  var vw = useState(null), view = vw[0], setView = vw[1];     // 'all' | order_item_id
  var gs = useState([]), groups = gs[0], setGroups = gs[1];   // [{order_item_id, order_name, items}]
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var fs = useState(false), finderOpen = fs[0], setFinderOpen = fs[1];
  var cvs = useState(false), chartViewOpen = cvs[0], setChartViewOpen = cvs[1];
  var nts = useState(''), notice = nts[0], setNotice = nts[1];   // what the last save did
  var tos = useState(''), toast = tos[0], setToast = tos[1];     // same, when the patient is closed after saving
  var rks = useState(0), resultsKey = rks[0], setResultsKey = rks[1]; // remounts LabResults after a save

  var viewSeq = useRef(0);   // numbers each loadView, so only the latest one may fill the grid

  // The lists refresh themselves every 30 s (while the tab is visible), so a
  // consultation the doctor just finished shows up without pressing ↻. Only the
  // left lists are refreshed; what the lab is typing in the centre is untouched.
  useEffect(function () {
    loadData();
    var timer = setInterval(function () { if (!document.hidden) loadData(true); }, 30000);
    return function () { clearInterval(timer); };
  }, []);
  function loadData(quiet) {
    if (!quiet) setLoading(true);
    Promise.all([
      api.get('/lab/pending').catch(function () { return null; }),
      api.get('/lab/completed').catch(function () { return null; }),
    ]).then(function (r) {
      // a failed background refresh keeps the lists it had instead of emptying them
      if (r[0] || !quiet) setPending(r[0] || []);
      if (r[1] || !quiet) setCompleted(r[1] || []);
      setLoading(false);
    });
  }

  function pickConsult(g) {
    setSel(g); setNotice('');
    var orders = g.lab_orders || [];
    if (orders.length > 1) loadView('all', g);
    else if (orders.length === 1) loadView(orders[0].order_item_id, g);
    else { setGroups([]); setView(null); }
  }
  function pickVisit(v) {
    api.get('/lab/visit/' + v.id + '/orders').then(function (g) {
      if (!g) { alert(t.labNoOrders || '이 내원에 검사 오더가 없습니다.'); return; }
      pickConsult(g);
    }).catch(function (e) { console.error('[lab] open visit', e); alert(t.lb_visitOpenFailed); });
  }
  function loadView(v, g) {
    g = g || sel;
    setView(v);
    // Switching tests quickly used to let a slower, older response land last and
    // show the previous test's rows under the new tab.
    var seq = ++viewSeq.current;
    var orders = g.lab_orders || [];
    var targets = v === 'all' ? orders : orders.filter(function (o) { return o.order_item_id === v; });
    Promise.all(targets.map(function (o) {
      return api.get('/lab/order/' + o.order_item_id + '/items')
        .then(function (d) { return { order_item_id: o.order_item_id, order_name: o.order_name, has_master: d.has_master !== false, items: (d.items || []).map(function (x) { return Object.assign({}, x); }) }; })
        .catch(function () { return { order_item_id: o.order_item_id, order_name: o.order_name, has_master: true, items: [] }; });
    })).then(function (gr) { if (seq === viewSeq.current) setGroups(gr); });
  }
  function setVal(gi, ii, k, val) {
    setGroups(function (prev) {
      var n = prev.slice(); n[gi] = Object.assign({}, n[gi]); n[gi].items = n[gi].items.slice();
      n[gi].items[ii] = Object.assign({}, n[gi].items[ii]); n[gi].items[ii][k] = val; return n;
    });
  }
  // Saves only the tests that have something entered; the rest stay pending, so
  // on 'All' the lab can finish the CBC now and the malaria test later. Saving
  // them all used to stop at the first empty test with the server's error, after
  // the tests before it were already completed and with the screen not refreshed.
  async function save() {
    var toSave = groups.filter(function (g) { return g.items.some(hasEntry); });
    var skipped = groups.filter(function (g) { return !g.items.some(hasEntry); });
    if (!toSave.length) { alert(t.lb_nothingToSave); return; }
    setBusy(true); setNotice('');
    var done = [], failed = null;
    for (var i = 0; i < toSave.length; i++) {
      try {
        await api.post('/lab/order/' + toSave[i].order_item_id + '/results', { results: toSave[i].items });
        done.push(toSave[i].order_name);
      } catch (e) {
        // With orders listed as soon as they are placed, the doctor can still
        // delete one (allowed while it has no result) while it is being typed
        // in here; the server then answers 404 'Order not found'.
        // ...or cancel it (decision 3): 409 'Order is cancelled'.
        var removed = e.message === 'Order not found' || e.message === 'Order is cancelled';
        failed = { name: toSave[i].order_name, removed: removed,
                   message: e.message === 'Order not found' ? t.lb_orderRemoved : e.message === 'Order is cancelled' ? t.lb_orderCancelled : e.message };
        break;
      }
    }
    loadData(); setResultsKey(function (k) { return k + 1; });
    if (!failed && !skipped.length) {
      // Everything was saved, so the patient is closed -- and with it the green line
      // that says what was saved. Show it for a few seconds on its own instead.
      setSel(null); setView(null); setGroups([]);
      setToast(t.lb_savedTests + ': ' + done.join(', '));
      setTimeout(function () { setToast(''); }, 4000);
    } else {
      // stay on this patient and reload, so the ✓ marks show what was saved
      var v = view;
      api.get('/lab/visit/' + sel.visit_id + '/orders').then(function (g) {
        if (!g) { setSel(null); setView(null); setGroups([]); return; }   // every lab order of the visit is gone
        var orders = g.lab_orders || [];
        // the test on screen may be the one removed in the consultation room
        var still = v === 'all' ? orders.length > 1 : orders.some(function (o) { return o.order_item_id === v; });
        setSel(g);
        loadView(still ? v : (orders.length > 1 ? 'all' : orders[0].order_item_id), g);
      }).catch(function () {});
      var msg = [];
      if (done.length) msg.push(t.lb_savedTests + ': ' + done.join(', '));
      if (failed) msg.push((failed.removed ? '' : t.lb_saveFailed + ': ') + failed.name + ' — ' + failed.message);
      else if (skipped.length) msg.push(t.lb_notSavedEmpty + ': ' + skipped.map(function (g) { return g.order_name; }).join(', '));
      if (failed) alert(msg.join('\n')); else setNotice(msg.join(' · '));
    }
    setBusy(false);
  }

  var bd = 'var(--border)', bd2 = 'var(--border-2)', pn = 'var(--panel)', scBg = 'var(--panel-head)', tx = 'var(--text)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', cyan = 'var(--cyan)';
  var list = tab === 'pending' ? pending : completed;
  var totalItems = groups.reduce(function (a, g) { return a + g.items.length; }, 0);

  function itemGrid(gi, g, showHeader) {
    return <div key={g.order_item_id} style={{ marginBottom: 14 }}>
      {showHeader ? <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--cyan-text)', marginBottom: 5 }}>{g.order_name}</div> : null}
      {!g.has_master && g.items.length ? <div style={{ color: 'var(--warn-text)', fontSize: 13, padding: '0 2px 5px' }}>{t.lb_noItemsDefined}</div> : null}
      {g.items.length === 0 ? <div style={{ color: t3, fontSize: 13, padding: '4px 2px' }}>{t.lb_noItems}</div> : (
        <div style={{ border: '1px solid ' + bd, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .7fr 1.15fr 1.25fr', background: 'var(--panel-2)', color: t3, fontSize: 13, fontWeight: 800 }}>
            {[t.testName || '검사명', t.refRange || '참고치', t.unit || '단위', t.labValue || '결과값', t.labComment || '비고'].map(function (h) { return <div key={h} style={{ padding: '8px 10px' }}>{h}</div>; })}
          </div>
          {g.items.map(function (it, ii) {
            var fl = flagFor(it.value, it.ref_low, it.ref_high, it.ref_text);
            var ref = it.ref_text || (it.ref_low != null && it.ref_high != null ? it.ref_low + '~' + it.ref_high : it.ref_low != null ? '≥' + it.ref_low : it.ref_high != null ? '≤' + it.ref_high : '');
            var vc = fl === 'low' ? 'var(--accent-text)' : fl === 'high' || fl === 'abnormal' ? 'var(--danger-text)' : tx;
            // Same glyphs as the results table, so high and low are not told apart by colour alone.
            var glyph = fl === 'high' ? '▲' : fl === 'low' ? '▼' : fl === 'abnormal' ? '!' : '';
            var word = fl === 'high' ? t.lb_flagHigh : fl === 'low' ? t.lb_flagLow : fl === 'abnormal' ? t.lb_flagAbnormal : '';
            var flagId = 'lb-flag-' + g.order_item_id + '-' + ii;
            return <div key={ii} style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .7fr 1.15fr 1.25fr', borderTop: '1px solid ' + bd, alignItems: 'center' }}>
              <div style={{ padding: '7px 10px', fontWeight: 600 }}>{it.name}</div>
              <div style={{ padding: '7px 10px', color: t3, fontSize: 13 }}>{ref}{it.ref_label ? <span title={t.lb_refByPatient} style={{ display: 'block', fontSize: 10, color: 'var(--cyan-text)' }}>{it.ref_label}</span> : null}</div>
              <div style={{ padding: '7px 10px', color: t2, fontSize: 13 }}>{it.unit || ''}</div>
              <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <input value={it.value || ''} onChange={function (e) { setVal(gi, ii, 'value', e.target.value); }} aria-describedby={glyph ? flagId : undefined} style={{ flex: 1, width: 0, minWidth: 0, boxSizing: 'border-box', background: 'var(--field)', border: '1px solid ' + (glyph ? vc : 'var(--field-border)'), borderRadius: 4, color: vc, fontSize: 14, fontWeight: 700, padding: '5px 8px', outline: 'none' }} />
                {/* The place is kept even when empty, so the box does not jump while typing. */}
                <span id={flagId} role={glyph ? 'img' : undefined} aria-label={word || undefined} aria-hidden={glyph ? undefined : true} title={word || undefined} style={{ width: 12, flexShrink: 0, textAlign: 'center', color: vc, fontSize: 13, fontWeight: 800 }}>{glyph}</span>
              </div>
              <div style={{ padding: '5px 8px' }}>
                <input value={it.comment || ''} onChange={function (e) { setVal(gi, ii, 'comment', e.target.value); }} placeholder="—" style={{ width: '100%', boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 4, color: t2, fontSize: 13, padding: '5px 8px', outline: 'none' }} />
              </div>
            </div>;
          })}
        </div>
      )}
    </div>;
  }

  return (
    // The page is exactly the window and only the inner areas scroll. It used to be
    // "window minus 86px" for the top bars, which are taller than that, so on a
    // 1366x768 laptop the save button and the results table's bottom scrollbar sat
    // below the window.
    <div style={{ fontFamily: 'system-ui,sans-serif', background: 'var(--bg)', color: tx, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: 15 }}>
      <TopBar />
      <div style={{ background: 'var(--panel-2)', borderBottom: '1px solid ' + bd, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={function () { setTab('pending'); setSel(null); }} style={{ background: tab === 'pending' ? tint('cyan', '20') : 'transparent', color: tab === 'pending' ? 'var(--cyan-text)' : t3, border: '1px solid ' + (tab === 'pending' ? tint('cyan', '50') : 'transparent'), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.labPending || '결과 대기'} {pending.length}</button>
        <button onClick={function () { setTab('completed'); setSel(null); }} style={{ background: tab === 'completed' ? 'var(--ok-a20)' : 'transparent', color: tab === 'completed' ? 'var(--ok-text-2)' : t3, border: '1px solid ' + (tab === 'completed' ? 'var(--ok-a50)' : 'transparent'), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.labCompleted || '입력 완료'} {completed.length}</button>
        <button onClick={function () { loadData(); }} style={{ background: 'var(--chip)', color: t2, border: '1px solid ' + bd2, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 15 }}>↻</button>
        <button onClick={function () { setFinderOpen(true); }} style={{ background: 'var(--chip)', color: t2, border: '1px solid ' + bd2, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>🔍 {t.findPatient}</button>
        <button onClick={function () { if (sel) setChartViewOpen(true); }} disabled={!sel} style={{ background: 'var(--chip)', color: sel ? 'var(--violet-text-3)' : 'var(--text-4)', border: '1px solid ' + (sel ? 'var(--violet-2)' : bd2), borderRadius: 5, padding: '5px 12px', cursor: sel ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700 }}>📋 {t.chartViewer || '차트뷰어'}</button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* LEFT: pending consultations */}
        <div style={{ width: 300, borderRight: '1px solid ' + bd, background: pn, overflow: 'auto', flexShrink: 0 }}>
          {loading ? <div style={{ padding: 16, color: t3 }}>{t.loading || 'Loading…'}</div> : null}
          {!loading && list.length === 0 ? <div style={{ padding: 16, color: t3, fontSize: 14 }}>{tab === 'pending' ? t.lb_noPending : t.lb_noCompleted}</div> : null}
          {list.map(function (g) {
            var active = sel && sel.consultation_id === g.consultation_id;
            return <div key={g.consultation_id} onClick={function () { pickConsult(g); }} style={{ padding: '9px 12px', borderBottom: '1px solid ' + bd, cursor: 'pointer', background: active ? tint('cyan', '12') : 'transparent', borderLeft: active ? '3px solid ' + cyan : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{nm(g)}</span>
                <span style={{ color: t3, fontSize: 12 }}>{ymd(g.visit_date)}</span>
              </div>
              <div style={{ fontSize: 12, color: t2 }}>{g.chart_no} · {g.doctor_name || ''}{g.consultation_status === 'in_progress' ? <span style={{ marginLeft: 6, color: 'var(--warn-text)', fontWeight: 700 }}>· {t.lb_inConsultation}</span> : null}</div>
              <div style={{ fontSize: 12, color: cyan, marginTop: 2 }}>{(g.lab_orders || []).map(function (o) { return o.order_name; }).join(', ')}</div>
            </div>;
          })}
        </div>

        {/* CENTER: entry */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!sel ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t3 }}>{t.lb_selectHint}</div> : (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + bd, background: scBg }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{nm(sel)} <span style={{ color: t2, fontSize: 14, fontWeight: 400 }}>{sel.chart_no} · {ymd(sel.visit_date)}</span>{sel.consultation_status === 'in_progress' ? <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: 'var(--warn-text)', border: '1px solid var(--warn-a66)', borderRadius: 4, padding: '1px 6px' }}>{t.lb_inConsultation}</span> : null}</div>
                {sel.allergies ? <div style={{ marginTop: 4, color: 'var(--danger-text-2)', fontSize: 13 }}>⚠ {sel.allergies}</div> : null}
              </div>
              {/* panel tabs: All + each panel */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid ' + bd, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(sel.lab_orders || []).length > 1 ? (function () {
                  var on = view === 'all';
                  return <button onClick={function () { loadView('all'); }} style={{ background: on ? cyan : 'var(--chip)', color: on ? 'var(--on-cyan)' : t2, border: '1px solid ' + (on ? cyan : bd2), borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>{t.labAll || '전체'}</button>;
                })() : null}
                {(sel.lab_orders || []).map(function (o) {
                  var on = view === o.order_item_id;
                  return <button key={o.order_item_id} onClick={function () { loadView(o.order_item_id); }} style={{ background: on ? cyan : 'var(--chip)', color: on ? 'var(--on-cyan)' : t2, border: '1px solid ' + (on ? cyan : bd2), borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{o.order_name}{o.status === 'completed' ? ' ✓' : ''}</button>;
                })}
              </div>
              {/* item grid(s) */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14 }}>
                {groups.length === 0 ? <div style={{ color: t3, fontSize: 14, padding: 10 }}>{t.lb_noItems}</div>
                  : groups.map(function (g, gi) { return itemGrid(gi, g, view === 'all'); })}
              </div>
              <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid ' + bd, background: 'var(--panel-2)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                {notice ? <div style={{ flex: 1, color: 'var(--ok-text-2)', fontSize: 13 }}>{notice}</div> : null}
                <button onClick={save} disabled={busy || totalItems === 0} style={{ background: totalItems ? 'linear-gradient(135deg,var(--cyan),var(--cyan-strong))' : 'var(--chip)', color: totalItems ? 'var(--on-cyan)' : 'var(--text-max)', border: 'none', borderRadius: 6, padding: '9px 28px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 900 }}>✓ {t.labSave || '결과 저장 · 완료'}{view === 'all' && groups.length > 1 ? ' (' + t.labAll + ')' : ''}</button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: history matrix */}
        <div style={{ width: 460, borderLeft: '1px solid ' + bd, background: pn, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + bd, background: scBg, fontWeight: 800, fontSize: 14, color: 'var(--cyan-text)' }}>🧪 {t.labResultsTitle || '검사결과'}</div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><LabResults key={resultsKey} patientId={sel ? sel.patient_id : null} /></div>
        </div>
      </div>
      {toast ? <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: 'var(--toast-bg)', color: 'var(--toast-text)', border: '1px solid var(--toast-line)', boxShadow: 'var(--toast-shadow)', borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 700, zIndex: 900 }}>✓ {toast}</div> : null}
      <PatientFinder open={finderOpen} onClose={function () { setFinderOpen(false); }} mode="visit"
        onPickVisit={function (v) { pickVisit(v); }} />
      <DocumentModal open={chartViewOpen} onClose={function () { setChartViewOpen(false); }} category="chart" readOnly={true}
        patient={sel ? { id: sel.patient_id, chart_no: sel.chart_no, last_name: sel.last_name, first_name: sel.first_name, gender: sel.gender, date_of_birth: sel.date_of_birth } : null}
        context={{}} />
    </div>
  );
}
