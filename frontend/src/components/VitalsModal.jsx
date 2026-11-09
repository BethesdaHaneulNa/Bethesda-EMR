// Reception's 「Signes vitaux」 window (clinic manager, on site, 2026-11-09): the vital signs are
// taken at the desk, where the doctor's screen is not open. The eight boxes are read from
// and saved to GET / PUT /api/visits/:id/vitals - the consultation's own columns, so the
// doctor finds them filled. Saving does not start the consultation (server side).
// Enter goes to the next box (and saves from the last one), Esc closes.
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { VITALS, vitalsForm, vitalsBody, vitalsError, fill, hhmm } from '../vitals.js';

export function VitalsModal(props) {
  var t = useLang().t;
  var v = props.visit;
  var fs = useState(vitalsForm(null)), form = fs[0], setForm = fs[1];
  var ds = useState(null), data = ds[0], setData = ds[1];
  var ls = useState(true), loading = ls[0], setLoading = ls[1];
  var ss = useState(false), saving = ss[0], setSaving = ss[1];
  var es = useState(''), error = es[0], setError = es[1];
  var refs = useRef([]);

  useEffect(function () {
    var alive = true;
    api.get('/visits/' + v.id + '/vitals').then(function (d) {
      if (!alive) return;
      setData(d); setForm(vitalsForm(d)); setLoading(false);
      setTimeout(function () { if (refs.current[0]) refs.current[0].focus(); }, 0);
    }).catch(function (err) { if (alive) { setError(vitalsError(t, err)); setLoading(false); } });
    return function () { alive = false; };
  }, [v.id]);

  useEffect(function () {
    function onKey(e) { if (e.key === 'Escape') props.onClose(); }
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('keydown', onKey); };
  }, []);

  async function save() {
    if (saving || loading) return;
    setSaving(true); setError('');
    try {
      var d = await api.put('/visits/' + v.id + '/vitals', vitalsBody(form));
      setSaving(false);
      props.onSaved(d);
    } catch (err) { setSaving(false); setError(vitalsError(t, err)); }
  }

  function onKeyDown(e, i) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (i < VITALS.length - 1 && refs.current[i + 1]) refs.current[i + 1].focus();
    else save();
  }

  var name = [v.last_name, v.first_name].filter(Boolean).join(' ');
  var IS = { width: '100%', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontSize: 17, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div onMouseDown={function (e) { if (e.target === e.currentTarget) props.onClose(); }} style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
      <div role="dialog" aria-modal="true" aria-label={t.vs_title} style={{ background: 'var(--panel)', border: '1px solid var(--border-2)', borderRadius: 12, width: 460, maxWidth: '94vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-head)' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-strong)' }}>{t.vs_button}</div>
          <div style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 3, overflowWrap: 'anywhere' }}>
            <strong style={{ color: 'var(--text)' }}>{name}</strong>{v.chart_no ? <span style={{ fontFamily: 'monospace', color: 'var(--accent-text)', marginLeft: 8 }}>{v.chart_no}</span> : null}
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
          {VITALS.map(function (f, i) {
            return <label key={f[0]} style={{ display: 'block' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>{t[f[1]]} <span style={{ fontWeight: 400 }}>({t[f[2]]})</span></span>
              <input ref={function (el) { refs.current[i] = el; }} value={form[f[0]]} inputMode="decimal" disabled={loading}
                onChange={function (e) { var x = e.target.value; setForm(function (p) { var n = Object.assign({}, p); n[f[0]] = x; return n; }); setError(''); }}
                onKeyDown={function (e) { onKeyDown(e, i); }} style={IS} />
            </label>;
          })}
        </div>
        <div style={{ padding: '0 16px 10px', fontSize: 13, color: 'var(--text-3)' }}>
          {data && data.vitals_at ? fill(t.vs_by, { name: data.vitals_by_name || '?', time: hhmm(data.vitals_at) }) : t.vs_none}
          <div style={{ marginTop: 2 }}>{t.vs_noStart}</div>
        </div>
        {error ? <div style={{ margin: '0 16px 10px', background: 'var(--danger-a15)', border: '1px solid var(--danger-a30)', borderRadius: 7, padding: '8px 12px', fontSize: 14, color: 'var(--danger-text)' }}>⚠ {error}</div> : null}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={props.onClose} style={{ background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.cancel}</button>
          <button type="button" onClick={save} disabled={saving || loading} style={{ background: 'var(--accent)', color: 'var(--on-fill)', border: '1px solid var(--accent)', borderRadius: 7, padding: '9px 18px', cursor: saving ? 'wait' : 'pointer', fontSize: 15, fontWeight: 800, opacity: loading ? 0.6 : 1 }}>{saving ? t.vs_saving : t.save}</button>
        </div>
      </div>
    </div>
  );
}
