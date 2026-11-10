// Pharmacy → Supplies (Settings → Supplies in 1.7.0): the count of every consumable (order codes of type 'supply') and
// its record - goods received, shelf counts, discards, and the lines the consultation
// screen used or gave back. The pharmacy's Stock tab (PharmacyStock.jsx) in a smaller
// form: every change goes through the server's moveSupply() (supply.routes.js), which
// writes the count and a ledger row together; this screen only asks and shows.
// Coordinator, 1.7.0.
import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { fold } from '../fold.js';
import { LIST_COL, LIST_SEARCH, ROW_EMPTY } from '../layout.js';

// Exact texts from supply.routes.js (the same words as the pharmacy's).
var ERR_DISCARD_MORE = 'Cannot discard more than the recorded stock; count the shelf first';
var ERR_MEMO_REQUIRED = 'A note is required';
var ERR_WHOLE_NUMBER = 'Quantity must be a whole number';
// More than any shelf holds (a barcode typed into the box): said here and by the server.
var ERR_TOO_LARGE = 'Quantity is too large';
var MAX_QTY = 10000000;
var MEMO_OUTSIDE = 'Changed outside the stock record (settings screen)';
var MEMO_OPENING = 'Start of the stock record (workbook count of 2026-11-05)';

var KIND_COLOR = { opening: 'var(--text-2)', receive: 'var(--ok-text)', use: 'var(--accent-text)', return: 'var(--teal-ink)', adjust: 'var(--warn-text)', discard: 'var(--danger-text)' };

function belowMin(s) {
  var min = Number(s.min_stock);
  return min > 0 && Number(s.stock_qty) <= min;
}

export function SupplyStock() {
  var lc = useLang(); var t = lc.t;
  var locale = lc.lang === 'ko' ? 'ko-KR' : lc.lang === 'fr' ? 'fr-FR' : 'en-GB';
  var ss = useState([]), items = ss[0], setItems = ss[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var is = useState(null), selId = is[0], setSelId = is[1];
  var ms = useState([]), moves = ms[0], setMoves = ms[1];
  // form: null | { kind: 'receive'|'count'|'discard', amount: '', memo: '' }
  var fs = useState(null), form = fs[0], setForm = fs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var ns = useState(''), notice = ns[0], setNotice = ns[1];

  async function loadItems() {
    setLoading(true);
    try { setItems(await api.get('/supply/stock')); } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  }
  async function loadMoves(id) {
    if (!id) { setMoves([]); return; }
    try { setMoves(await api.get('/supply/stock/' + id + '/movements')); } catch (err) { setMoves([]); alert('Error: ' + err.message); }
  }
  useEffect(function () { loadItems(); }, []);
  useEffect(function () { loadMoves(selId); setForm(null); setNotice(''); }, [selId]);

  var shown = useMemo(function () {
    var s = fold(q.trim());   // accents ignored, as in the pharmacy's stock
    if (!s) return items;
    return items.filter(function (d) {
      return fold(d.name).indexOf(s) >= 0 || fold(d.code).indexOf(s) >= 0 || fold(d.name_en).indexOf(s) >= 0;
    });
  }, [items, q]);
  var sel = items.find(function (d) { return d.id === selId; }) || null;
  var low = items.filter(belowMin).length;

  function openForm(kind) { setForm({ kind: kind, amount: '', memo: '' }); setNotice(''); }

  async function submit() {
    if (!sel || !form || busy) return;
    var n = Number(form.amount);
    var minN = form.kind === 'count' ? 0 : 1;
    if (form.amount === '' || !Number.isInteger(n) || n < minN) { alert(t.ph_errWhole); return; }
    if (n > MAX_QTY) { alert(t.ph_errTooLarge); return; }
    if (form.kind !== 'receive' && !form.memo.trim()) { alert(t.ph_errMemo); return; }
    if (form.kind === 'discard' && n > Number(sel.stock_qty)) { alert(t.ph_errDiscardMore); return; }
    var body = form.kind === 'count' ? { counted: n, memo: form.memo.trim() } : { qty: n, memo: form.memo.trim() };
    setBusy(true);
    try {
      var r = await api.post('/supply/stock/' + sel.id + '/' + form.kind, body);
      setNotice(sel.name + ': ' + r.stock_before + ' → ' + r.stock_after);
      setForm(null);
      await loadItems();
      await loadMoves(sel.id);
    } catch (err) {
      if (err.message === ERR_DISCARD_MORE) alert(t.ph_errDiscardMore);
      else if (err.message === ERR_MEMO_REQUIRED) alert(t.ph_errMemo);
      else if (err.message === ERR_WHOLE_NUMBER) alert(t.ph_errWhole);
      else if (err.message === ERR_TOO_LARGE) alert(t.ph_errTooLarge);
      else alert('Error: ' + err.message);
      await loadItems();
    }
    setBusy(false);
  }

  function memoText(m) {
    if (m.memo === MEMO_OUTSIDE) return t.ph_memoOutside;
    if (m.memo === MEMO_OPENING) return t.su_memoOpening;
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
  var COLS = 'minmax(0,1.35fr) minmax(0,1fr) minmax(0,.6fr) minmax(0,.8fr) minmax(0,.6fr) minmax(0,.8fr) minmax(0,1.75fr) minmax(0,1.2fr)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: LIST_COL + 'px minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', flex: 1, minHeight: 0 }}>
      <div style={{ borderRight: '1px solid ' + bd, display: 'flex', flexDirection: 'column', background: pn }}>
        <div style={{ padding: '7px 8px', borderBottom: '1px solid ' + bd, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input autoComplete="off" value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={t.su_search} aria-label={t.su_search} style={LIST_SEARCH} />
          <div style={{ color: t3, fontSize: 12 }}>{items.length} · {low ? <span style={{ color: 'var(--danger-text)', fontWeight: 800 }}>{low} {t.ph_belowMin}</span> : null}</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {loading ? <div style={{ padding: 20, textAlign: 'center', color: t3 }}>{t.loading}</div> : null}
          {!loading && items.length > 0 && shown.length === 0 && q.trim() ? <div style={Object.assign({}, ROW_EMPTY, { overflowWrap: 'anywhere' })}>{String(t.su_searchNone || '').replace('{q}', q.trim())}</div> : null}
          {shown.map(function (d) {
            var active = d.id === selId; var isLow = belowMin(d);
            return <div key={d.id} onClick={function () { setSelId(d.id); }} style={{ padding: '9px 12px', borderBottom: '1px solid ' + bd, cursor: 'pointer', background: active ? 'var(--teal-a15)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: tx, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ color: t3, fontSize: 13 }}>{d.code}{d.unit ? ' · ' + d.unit : ''}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: isLow ? 'var(--danger-text)' : 'var(--ok-text)', whiteSpace: 'nowrap' }}>{d.stock_qty}</div>
            </div>;
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {!sel ? <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t3, fontSize: 17, gap: 10, padding: 24, textAlign: 'center' }}>
          <div>{t.su_pick}</div>
          <div style={{ fontSize: 13, maxWidth: 520 }}>{t.su_hint}</div>
        </div> : <>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: scBg, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-strong-2)' }}>{sel.name}</div>
              <div style={{ marginTop: 4, fontSize: 15, color: t2 }}>{sel.code}{sel.unit ? ' · ' + sel.unit : ''}{sel.group_name ? ' · ' + sel.group_name : ''}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['receive', 'count', 'discard'].map(function (k) {
                  var on = form && form.kind === k;
                  return <button key={k} onClick={function () { openForm(k); }} style={{ background: on ? FORM[k].color : 'var(--chip)', color: on ? 'var(--on-bright)' : tx, border: '1px solid ' + FORM[k].color, borderRadius: 5, padding: '6px 14px', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>{FORM[k].title}</button>;
                })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: t3, fontSize: 14 }}>{t.ph_stockNow}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: belowMin(sel) ? 'var(--danger-text)' : 'var(--text-strong-2)' }}>{sel.stock_qty}{sel.unit ? <span style={{ fontSize: 16, fontWeight: 800, marginLeft: 6, color: t2 }}>{sel.unit}</span> : null}</div>
              {Number(sel.min_stock) > 0 ? <div style={{ color: belowMin(sel) ? 'var(--danger-text)' : t3, fontSize: 13, fontWeight: belowMin(sel) ? 800 : 400 }}>{t.ph_minStock} {sel.min_stock}{belowMin(sel) ? ' — ' + t.ph_belowMin : ''}</div> : null}
            </div>
          </div>

          {form ? <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + bd, background: 'var(--panel-2)', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: t2, fontSize: 13, fontWeight: 700 }}>{FORM[form.kind].amount}
              <input type="number" min={form.kind === 'count' ? 0 : 1} step="1" value={form.amount} autoFocus onChange={function (e) { setForm(Object.assign({}, form, { amount: e.target.value })); }} style={Object.assign({}, IN, { width: 140 })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: t2, fontSize: 13, fontWeight: 700, flex: 1, minWidth: 240 }}>{t.ph_memoLabel}
              <input value={form.memo} placeholder={FORM[form.kind].memo} onChange={function (e) { setForm(Object.assign({}, form, { memo: e.target.value })); }} style={Object.assign({}, IN, { width: '100%' })} />
            </label>
            {form.kind === 'count' && form.amount !== '' && Number.isInteger(Number(form.amount)) ? <div style={{ color: t2, fontSize: 14, paddingBottom: 8 }}>{t.ph_countDiff} {Number(form.amount) - Number(sel.stock_qty) > 0 ? '+' : ''}{Number(form.amount) - Number(sel.stock_qty)}</div> : null}
            <button onClick={submit} disabled={busy} style={{ background: FORM[form.kind].color, color: 'var(--on-bright)', border: 'none', borderRadius: 5, padding: '8px 18px', cursor: busy ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800 }}>{t.save}</button>
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
