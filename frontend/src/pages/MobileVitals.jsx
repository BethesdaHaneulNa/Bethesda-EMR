// /m - the vital signs on a phone (1.7.8).
//
// The vital signs are taken where there is no PC. The nurse opens the EMR on her phone
// (on a Wi-Fi that reaches the server - the note under the list, Settings -> Clinic
// mobile_hint, can say which), is sent here (vitals.js phoneHome), picks the patient
// and types the eight values; the doctor finds them filled on the consultation screen.
// This page is the only thing a phone shows: no top bar, no menu, no language or theme
// buttons. Two screens - the list of today's waiting and in-consultation visits, and the
// form. Saving does not start the consultation (server side, PUT /api/visits/:id/vitals).
// Sized for 360-430 px wide: nothing is wider than the screen.
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api, getUser, logout } from '../api/client.js';
import { clinicName } from '../documents/shared.jsx';
import { VITALS, vitalsForm, vitalsBody, vitalsError, fill, hhmm, FORCE_PC_KEY } from '../vitals.js';

var TITLE = 'Bethesda - Signes vitaux';

export default function MobileVitalsPage() {
  var langCtx = useLang();
  var t = langCtx.t, lang = langCtx.lang, setLang = langCtx.setLang;
  var user = getUser() || {};
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
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

  useEffect(function () {
    var before = document.title;
    document.title = TITLE;
    api.get('/admin/clinic').then(setClinic).catch(function () {});
    return function () { document.title = before; clearTimeout(noticeTimer.current); };
  }, []);

  function loadList() {
    // Any member of staff may type vital signs (clinic manager, 2026-11-09): this list needs no
    // reception permission, unlike /visits/today. Waiting and in consultation only.
    return api.get('/visits/today/vitals-list').then(function (rows) {
      setVisits(Array.isArray(rows) ? rows : []); setListError('');
    }).catch(function (err) { setListError(vitalsError(t, err)); setVisits(function (p) { return p || []; }); });
  }
  // The list reads itself again every 30 s while the page is shown (reception keeps registering).
  useEffect(function () {
    loadList();
    var timer = setInterval(function () { if (!document.hidden) loadList(); }, 30000);
    return function () { clearInterval(timer); };
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
      var name = [sel.last_name, sel.first_name].filter(Boolean).join(' ');
      setBusy(false); setSel(null);
      setNotice(fill(t.vs_saved, { name: name }));
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

  function pcVersion(e) {
    e.preventDefault();
    try { localStorage.setItem(FORCE_PC_KEY, '1'); } catch (err) { /* storage blocked: the ?pc=1 does it */ }
    window.location.href = '/registration?pc=1';
  }

  var page = { fontFamily: 'system-ui,-apple-system,sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' };
  var col = { maxWidth: 520, margin: '0 auto', padding: '0 16px 24px', boxSizing: 'border-box', width: '100%' };
  var bigBtn = { minHeight: 52, borderRadius: 10, fontSize: 19, fontWeight: 800, cursor: 'pointer', padding: '0 16px', boxSizing: 'border-box' };
  var statusColor = function (s) { return s === 'in_progress' ? 'warn' : 'accent'; };

  return (
    <div style={page}>
      <div style={{ background: 'var(--panel-head)', borderBottom: '1px solid var(--border)' }}>
        <div style={Object.assign({}, col, { padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 })}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clinicName(clinic, lang)}</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.login_id || ''}</div>
          </div>
          <button type="button" onClick={logout} style={{ flexShrink: 0, minHeight: 44, background: 'var(--danger-strong-a20)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a40)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.logOff}</button>
        </div>
      </div>

      {!sel ? (
        <div style={col}>
          {/* FR · KO · EN (clinic manager, 1.7.9): the same store as the PC's switch (useLang,
              localStorage medconnect_lang), so a choice made on one screen holds on the other. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 10 }}>
            {[['fr', 'FR'], ['ko', 'KO'], ['en', 'EN']].map(function (l) {
              var on = lang === l[0];
              return <button key={l[0]} type="button" onClick={function () { setLang(l[0]); }} aria-pressed={on}
                style={{ minWidth: 40, minHeight: 32, padding: '0 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--on-fill)' : 'var(--text-3)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-2)') }}>{l[1]}</button>;
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 10px' }}>
            <div style={{ flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--text-strong)' }}>🩺 {t.m_title}</div>
            <button type="button" onClick={loadList} style={{ minHeight: 44, background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>↻ {t.m_refresh}</button>
          </div>
          {notice ? <div role="status" style={{ background: 'var(--ok-a18)', border: '1px solid var(--ok-a40)', color: 'var(--ok-text)', borderRadius: 8, padding: '10px 12px', fontSize: 16, fontWeight: 700, marginBottom: 10, overflowWrap: 'anywhere' }}>✓ {notice}</div> : null}
          {listError ? <div style={{ background: 'var(--danger-a15)', border: '1px solid var(--danger-a30)', color: 'var(--danger-text)', borderRadius: 8, padding: '10px 12px', fontSize: 15, marginBottom: 10 }}>⚠ {listError}</div> : null}
          {visits === null ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>{t.loading}</div> :
            visits.length === 0 ? <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-3)', fontSize: 16 }}>{t.m_empty}</div> :
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--panel)' }}>
              {visits.map(function (v) {
                var c = statusColor(v.status);
                return <button key={v.id} type="button" onClick={function () { open(v); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 64, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line-soft)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box' }}>
                  <span style={{ width: 26, flexShrink: 0, fontSize: 22, fontWeight: 900, color: 'var(--ok-ink)', textAlign: 'center' }} aria-label={v.vitals_at ? '✓' : ''}>{v.vitals_at ? '✓' : ''}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{v.last_name} {v.first_name}</span>
                    <span style={{ display: 'block', fontSize: 15, color: 'var(--text-2)', marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{v.chart_no}</span>
                      {v.reception_time ? ' · ' + String(v.reception_time).slice(0, 5) : ''}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, background: 'var(--' + c + '-a18)', color: 'var(--' + c + '-ink)', borderRadius: 5, padding: '3px 8px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{v.status === 'in_progress' ? t.in_progress : t.waiting}</span>
                </button>;
              })}
            </div>}
          {visits && visits.length ? <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-3)' }}><span style={{ color: 'var(--ok-ink)', fontWeight: 900 }}>✓</span>{String(t.m_legend || '').replace(/^✓/, '')}</div> : null}
          {clinic && clinic.mobile_hint ? <div style={{ marginTop: 18, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}>{clinic.mobile_hint}</div> : null}
          <div style={{ marginTop: 10 }}><a href="/registration?pc=1" onClick={pcVersion} style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.m_pcLink}</a></div>
        </div>
      ) : (
        <div style={col}>
          <div style={{ margin: '14px 0 12px' }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{sel.last_name} {sel.first_name}</div>
            <div style={{ fontSize: 16, color: 'var(--text-2)', marginTop: 2 }}><span style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{sel.chart_no}</span>{sel.reception_time ? ' · ' + String(sel.reception_time).slice(0, 5) : ''}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 12px' }}>
            {VITALS.map(function (f, i) {
              return <label key={f[0]} style={{ display: 'block', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t[f[1]]} <span style={{ fontWeight: 400 }}>({t[f[2]]})</span></span>
                <input ref={function (el) { refs.current[i] = el; }} value={form[f[0]]} inputMode="decimal" enterKeyHint={i < VITALS.length - 1 ? 'next' : 'done'} autoComplete="off" disabled={busy && !data}
                  onChange={function (e) { var x = e.target.value; setForm(function (p) { var n = Object.assign({}, p); n[f[0]] = x; return n; }); setError(''); }}
                  onKeyDown={function (e) { onKeyDown(e, i); }}
                  style={{ display: 'block', width: '100%', height: 52, fontSize: 22, padding: '0 12px', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 8, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </label>;
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-3)' }}>
            {data && data.vitals_at ? fill(t.vs_by, { name: data.vitals_by_name || '?', time: hhmm(data.vitals_at) }) : (data ? t.vs_none : '')}
          </div>
          {error ? <div style={{ marginTop: 10, background: 'var(--danger-a15)', border: '1px solid var(--danger-a30)', color: 'var(--danger-text)', borderRadius: 8, padding: '10px 12px', fontSize: 15, overflowWrap: 'anywhere' }}>⚠ {error}</div> : null}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="button" onClick={back} style={Object.assign({}, bigBtn, { flex: '0 0 auto', background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' })}>{t.m_back}</button>
            <button type="button" onClick={save} disabled={busy} style={Object.assign({}, bigBtn, { flex: 1, background: 'var(--accent)', color: 'var(--on-fill)', border: '1px solid var(--accent)', opacity: busy ? 0.6 : 1 })}>{busy && data ? t.vs_saving : t.save}</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-3)' }}>{t.vs_noStart}</div>
        </div>
      )}
    </div>
  );
}
