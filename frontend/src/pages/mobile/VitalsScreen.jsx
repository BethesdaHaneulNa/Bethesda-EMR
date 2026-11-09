// /m 「🩺 Signes vitaux」 (1.7.8; moved here unchanged in 1.7.11, larger text): today's
// waiting and in-consultation visits -> the eight values -> Save -> back to the list.
// Saving does not start the consultation (server side, PUT /api/visits/:id/vitals).
import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client.js';
import { VITALS, vitalsForm, vitalsBody, vitalsError, fill, hhmm } from '../../vitals.js';
import { FS, col, bigBtn, input, rowBtn, listBox, nameText, subText, nameOf, timeOf, ListHead, Notice, ErrorBox, Empty, Tag, everyHalfMinute } from './ui.jsx';

export function VitalsScreen(props) {
  var t = props.t;
  var vs = useState(null), visits = vs[0], setVisits = vs[1];      // null while the first read runs
  var les = useState(''), listError = les[0], setListError = les[1];
  var ss = useState(null), sel = ss[0], setSel = ss[1];             // the visit being typed, or null (the list)
  var fs = useState(vitalsForm(null)), form = fs[0], setForm = fs[1];
  var ds = useState(null), data = ds[0], setData = ds[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var es = useState(''), error = es[0], setError = es[1];
  var ns = useState(''), notice = ns[0], setNotice = ns[1];
  var refs = useRef([]);
  var noticeTimer = useRef(null);

  function loadList() {
    // Any member of staff may type vital signs: this list needs no reception permission,
    // unlike /visits/today. Waiting and in consultation only.
    return api.get('/visits/today/vitals-list').then(function (rows) {
      setVisits(Array.isArray(rows) ? rows : []); setListError('');
    }).catch(function (err) { setListError(vitalsError(t, err)); setVisits(function (p) { return p || []; }); });
  }
  useEffect(function () {
    var stop = everyHalfMinute(loadList);
    return function () { stop(); clearTimeout(noticeTimer.current); };
  }, []);

  function open(v) {
    setSel(v); setData(null); setForm(vitalsForm(null)); setError(''); setNotice(''); setBusy(true);
    try { window.scrollTo(0, 0); } catch (e) { /* old browser */ }
    api.get('/visits/' + v.id + '/vitals').then(function (d) {
      setData(d); setForm(vitalsForm(d)); setBusy(false);
    }).catch(function (err) { setError(vitalsError(t, err)); setBusy(false); });
  }
  function back() { setSel(null); setError(''); loadList(); }

  async function save() {
    if (busy || !sel) return;
    setBusy(true); setError('');
    try {
      await api.put('/visits/' + sel.id + '/vitals', vitalsBody(form));
      setBusy(false); setSel(null);
      setNotice(fill(t.vs_saved, { name: nameOf(sel) }));
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(function () { setNotice(''); }, 4000);
      loadList();
    } catch (err) { setBusy(false); setError(vitalsError(t, err)); }
  }
  function onKeyDown(e, i) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (i < VITALS.length - 1 && refs.current[i + 1]) refs.current[i + 1].focus();
    else save();
  }

  if (!sel) return (
    <div style={col}>
      <ListHead t={t} title={'🩺 ' + t.m_title} onBack={props.onHome} backLabel={t.mo_home} onRefresh={loadList} />
      <Notice text={notice} />
      <ErrorBox text={listError} />
      {visits === null ? <Empty text={t.loading} /> : visits.length === 0 ? <Empty text={t.m_empty} /> :
        <div style={listBox}>
          {visits.map(function (v) {
            return <button key={v.id} type="button" onClick={function () { open(v); }} style={rowBtn}>
              <span style={{ width: 26, flexShrink: 0, fontSize: 24, fontWeight: 900, color: 'var(--ok-ink)', textAlign: 'center' }} aria-label={v.vitals_at ? '✓' : ''}>{v.vitals_at ? '✓' : ''}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={nameText}>{v.last_name} {v.first_name}</span>
                <span style={subText}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{v.chart_no}</span>{timeOf(v) ? ' · ' + timeOf(v) : ''}</span>
              </span>
              <Tag c={v.status === 'in_progress' ? 'warn' : 'accent'}>{v.status === 'in_progress' ? t.in_progress : t.waiting}</Tag>
            </button>;
          })}
        </div>}
      {visits && visits.length ? <div style={{ marginTop: 8, fontSize: FS, color: 'var(--text-3)' }}><span style={{ color: 'var(--ok-ink)', fontWeight: 900 }}>✓</span>{String(t.m_legend || '').replace(/^✓/, '')}</div> : null}
    </div>
  );

  return (
    <div style={col}>
      <div style={{ margin: '14px 0 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{nameOf(sel)}</div>
        <div style={subText}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{sel.chart_no}</span>{timeOf(sel) ? ' · ' + timeOf(sel) : ''}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 12px' }}>
        {VITALS.map(function (f, i) {
          return <label key={f[0]} style={{ display: 'block', minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: FS, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t[f[1]]} <span style={{ fontWeight: 400 }}>({t[f[2]]})</span></span>
            <input ref={function (el) { refs.current[i] = el; }} value={form[f[0]]} inputMode="decimal" enterKeyHint={i < VITALS.length - 1 ? 'next' : 'done'} autoComplete="off" disabled={busy && !data}
              onChange={function (e) { var x = e.target.value; setForm(function (p) { var n = Object.assign({}, p); n[f[0]] = x; return n; }); setError(''); }}
              onKeyDown={function (e) { onKeyDown(e, i); }} style={input} />
          </label>;
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: FS, color: 'var(--text-3)' }}>
        {data && data.vitals_at ? fill(t.vs_by, { name: data.vitals_by_name || '?', time: hhmm(data.vitals_at) }) : (data ? t.vs_none : '')}
      </div>
      <div style={{ marginTop: 10 }}><ErrorBox text={error} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button type="button" onClick={back} style={Object.assign({}, bigBtn, { flex: '0 0 auto', background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' })}>{t.m_back}</button>
        <button type="button" onClick={save} disabled={busy} style={Object.assign({}, bigBtn, { flex: 1, background: 'var(--accent)', color: 'var(--on-fill)', border: '1px solid var(--accent)', opacity: busy ? 0.6 : 1 })}>{busy && data ? t.vs_saving : t.save}</button>
      </div>
      <div style={{ marginTop: 10, fontSize: FS, color: 'var(--text-3)' }}>{t.vs_noStart}</div>
    </div>
  );
}
