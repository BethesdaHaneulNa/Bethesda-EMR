// /m 「🧪 Labo」 (1.7.11, clinic manager on site): lab results typed on the phone.
//   1. today's visits with lab orders (GET /api/visits/today/lab-list), pending / done;
//   2. tap -> the visit's lab orders;
//   3. tap an order -> its result boxes, read and saved through the PC lab screen's own
//      routes (GET /api/lab/order/:id/items, POST /api/lab/order/:id/results): same
//      reference range for this patient, same flag, same change log and result_by / result_at,
//      so the doctor's screen shows the results exactly as when typed on the PC.
// Saving needs the PC lab permission (ui.jsx LAB_ENTRY_PERMS); other accounts see the
// lists only, read-only.
import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../../api/client.js';
import { fill } from '../../vitals.js';
import { flagFor, hasEntry, typedValue, TYPE_IT } from '../Lab.jsx';
import { FS, TAP, col, bigBtn, input, rowBtn, listBox, nameText, subText, nameOf, timeOf, ListHead, Notice, ErrorBox, Empty, Tag, canEnterLab, everyHalfMinute } from './ui.jsx';

// The server's English refusals of the lab routes, in the screen's language (as Lab.jsx).
function labError(t, err) {
  var m = (err && err.message) || '';
  if (m === 'Order not found') return t.lb_orderRemoved;
  if (m === 'Order is cancelled') return t.lb_orderCancelled;
  if (m === 'At least one result value or comment is required') return t.lb_nothingToSave;
  if (err && err.status === 403) return t.mo_labReadOnly;
  return fill(t.vs_error, { msg: m });
}
function refOf(it) {
  return it.ref_text || (it.ref_low != null && it.ref_high != null ? it.ref_low + ' ~ ' + it.ref_high
    : it.ref_low != null ? '≥ ' + it.ref_low : it.ref_high != null ? '≤ ' + it.ref_high : '');
}

export function LabScreen(props) {
  var t = props.t;
  var canSave = canEnterLab(getUser());
  var ls = useState(null), list = ls[0], setList = ls[1];
  var les = useState(''), listError = les[0], setListError = les[1];
  var vs = useState(null), visitId = vs[0], setVisitId = vs[1];     // the visit opened (step 2)
  var os = useState(null), order = os[0], setOrder = os[1];         // the order opened (step 3)
  var is = useState(null), items = is[0], setItems = is[1];
  var hm = useState(true), hasMaster = hm[0], setHasMaster = hm[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var es = useState(''), error = es[0], setError = es[1];
  var ns = useState(''), notice = ns[0], setNotice = ns[1];
  var noticeTimer = useRef(null);

  function loadList() {
    return api.get('/visits/today/lab-list').then(function (rows) {
      setList(Array.isArray(rows) ? rows : []); setListError('');
    }).catch(function (err) { setListError(labError(t, err)); setList(function (p) { return p || []; }); });
  }
  useEffect(function () {
    var stop = everyHalfMinute(loadList);
    return function () { stop(); clearTimeout(noticeTimer.current); };
  }, []);

  var visit = visitId != null && list ? list.filter(function (v) { return v.id === visitId; })[0] || null : null;

  function openOrder(o) {
    setOrder(o); setItems(null); setError(''); setNotice('');
    try { window.scrollTo(0, 0); } catch (e) { /* old browser */ }
    if (!canSave) return;
    setBusy(true);
    api.get('/lab/order/' + o.order_item_id + '/items').then(function (d) {
      setHasMaster(d.has_master !== false);
      setItems((d.items || []).map(function (x) { return Object.assign({}, x, { _free: typedValue(x) }); }));
      setBusy(false);
    }).catch(function (err) { setError(labError(t, err)); setBusy(false); });
  }
  function setVal(i, k, val) {
    setItems(function (prev) { var n = prev.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = val; return n; });
    setError('');
  }
  async function save() {
    if (busy || !order || !items) return;
    if (!items.some(hasEntry)) { setError(t.lb_nothingToSave); return; }
    setBusy(true); setError('');
    try {
      await api.post('/lab/order/' + order.order_item_id + '/results', { results: items });
      setBusy(false);
      var name = order.order_name;
      setOrder(null); setItems(null);
      setNotice(fill(t.mo_labSaved, { name: name }));
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(function () { setNotice(''); }, 4000);
      loadList();
    } catch (err) {
      setBusy(false); setError(labError(t, err));
      if (err && (err.message === 'Order not found' || err.message === 'Order is cancelled')) { setOrder(null); setItems(null); loadList(); }
    }
  }

  // ── step 3: one order's results ──
  if (order) return (
    <div style={col}>
      <ListHead t={t} title={'🧪 ' + order.order_name} onBack={function () { setOrder(null); setItems(null); setError(''); }} />
      {visit ? <div style={Object.assign({}, subText, { marginBottom: 10 })}>{nameOf(visit)} · <span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{visit.chart_no}</span></div> : null}
      {!canSave ? <div style={{ fontSize: FS, color: 'var(--warn-text)', background: 'var(--warn-a14)', border: '1px solid var(--warn-a40)', borderRadius: 8, padding: 12 }}>{t.mo_labReadOnly}</div> : null}
      {canSave && items === null && !error ? <Empty text={t.loading} /> : null}
      {canSave && items && !hasMaster ? <div style={{ fontSize: FS, color: 'var(--warn-text)', marginBottom: 8 }}>{t.lb_noItemsDefined}</div> : null}
      {canSave && items ? items.map(function (it, i) {
        var fl = flagFor(it.value, it.ref_low, it.ref_high, it.ref_text);
        var bad = fl === 'high' || fl === 'low' || fl === 'abnormal';
        var vc = fl === 'low' ? 'var(--accent-text)' : bad ? 'var(--danger-text)' : 'var(--text)';
        var glyph = fl === 'high' ? '▲ ' + t.lb_flagHigh : fl === 'low' ? '▼ ' + t.lb_flagLow : fl === 'abnormal' ? '! ' + t.lb_flagAbnormal : '';
        var ref = refOf(it);
        var numeric = !(it.choices || []).length && !it.ref_text && (it.ref_low != null || it.ref_high != null);
        var box = Object.assign({}, input, { color: vc, fontWeight: 800, border: '2px solid ' + (bad ? vc : 'var(--field-border)'), background: bad ? 'var(--danger-a15)' : 'var(--field)' });
        return <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere' }}>{it.name}</span>
            {ref || it.unit ? <span style={{ fontSize: FS, color: 'var(--text-3)' }}>{ref ? t.mo_ref + ' ' + ref : ''}{it.unit ? ' ' + it.unit : ''}</span> : null}
            {it.ref_label ? <span style={{ fontSize: 16, color: 'var(--cyan-text)' }}>{it.ref_label}</span> : null}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(it.choices || []).length && !it._free
              ? <select value={it.value || ''} onChange={function (e) {
                  var v = e.target.value;
                  if (v === TYPE_IT) { setVal(i, 'value', ''); setVal(i, '_free', true); } else setVal(i, 'value', v);
                }} style={Object.assign({}, box, { flex: 1, minWidth: 0 })}>
                  <option value=""></option>
                  {it.choices.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                  <option value={TYPE_IT}>{t.lb_valueType}</option>
                </select>
              : <input value={it.value || ''} inputMode={numeric ? 'decimal' : 'text'} autoComplete="off" onChange={function (e) { setVal(i, 'value', e.target.value); }} style={Object.assign({}, box, { flex: 1, minWidth: 0 })} />}
            {(it.choices || []).length && it._free ? <button type="button" aria-label={t.lb_valueList} onClick={function () { if (it.choices.indexOf(it.value) < 0) setVal(i, 'value', ''); setVal(i, '_free', false); }}
              style={Object.assign({}, bigBtn, { flexShrink: 0, background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' })}>☰</button> : null}
          </div>
          {glyph ? <div style={{ marginTop: 4, fontSize: FS, fontWeight: 800, color: vc }}>{glyph}</div> : null}
          <input value={it.comment || ''} placeholder={t.mo_comment} autoComplete="off" onChange={function (e) { setVal(i, 'comment', e.target.value); }}
            style={Object.assign({}, input, { marginTop: 8, height: 48, fontSize: FS, color: 'var(--text-2)' })} />
        </div>;
      }) : null}
      <div style={{ marginTop: 12 }}><ErrorBox text={error} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button type="button" onClick={function () { setOrder(null); setItems(null); setError(''); }} style={Object.assign({}, bigBtn, { flex: '0 0 auto', background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' })}>{t.m_back}</button>
        {canSave ? <button type="button" onClick={save} disabled={busy || !items} style={Object.assign({}, bigBtn, { flex: 1, background: 'var(--accent)', color: 'var(--on-fill)', border: '1px solid var(--accent)', opacity: busy || !items ? 0.6 : 1 })}>{busy && items ? t.vs_saving : t.save}</button> : null}
      </div>
    </div>
  );

  // ── step 2: the visit's lab orders ──
  if (visit) return (
    <div style={col}>
      <ListHead t={t} title={nameOf(visit)} onBack={function () { setVisitId(null); }} onRefresh={loadList} />
      <div style={Object.assign({}, subText, { marginBottom: 10 })}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{visit.chart_no}</span>{timeOf(visit) ? ' · ' + timeOf(visit) : ''}</div>
      <Notice text={notice} />
      {!canSave ? <div style={{ fontSize: FS, color: 'var(--text-3)', marginBottom: 10 }}>{t.mo_labReadOnly}</div> : null}
      <div style={listBox}>
        {(visit.orders || []).map(function (o) {
          var done = o.status === 'completed';
          return <button key={o.order_item_id} type="button" onClick={function () { openOrder(o); }} style={rowBtn}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={nameText}>{o.order_name}</span>
              {o.memo ? <span style={subText}>{o.memo}</span> : null}
            </span>
            <Tag c={done ? 'ok' : 'warn'}>{done ? '✓ ' + t.mo_labDone : t.mo_labPending}</Tag>
          </button>;
        })}
      </div>
    </div>
  );

  // ── step 1: today's visits with lab orders ──
  return (
    <div style={col}>
      <ListHead t={t} title={'🧪 ' + t.mo_lab} onBack={props.onHome} backLabel={t.mo_home} onRefresh={loadList} />
      <Notice text={notice} />
      <ErrorBox text={listError} />
      {list === null ? <Empty text={t.loading} /> : list.length === 0 ? <Empty text={t.mo_emptyLab} /> :
        <div style={listBox}>
          {list.map(function (v) {
            return <button key={v.id} type="button" onClick={function () { setVisitId(v.id); setNotice(''); }} style={rowBtn}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nameText}>{nameOf(v)}</span>
                <span style={subText}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{v.chart_no}</span>{timeOf(v) ? ' · ' + timeOf(v) : ''}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {v.pending ? <Tag c="warn">{fill(t.mo_nPending, { n: v.pending })}</Tag> : null}
                {v.done ? <Tag c="ok">{fill(t.mo_nDone, { n: v.done })}</Tag> : null}
              </span>
            </button>;
          })}
        </div>}
    </div>
  );
}
