// The small status dot in the top bar (U3, decided 2026-09-29): green / yellow / red from
// GET /api/system/status (status.routes.js), shown only to accounts with the settings
// permission (TopBar.jsx decides). Click -> the list of checks in words.
//
// It must never hold the top bar up: the request has a time limit, and a failed or slow
// answer is a grey dot, not an error. It asks when the screen opens, every five minutes
// while the window is visible, and when the window becomes visible again - the same beat
// as TopBar's /auth/me sync. "off" (not set up here, e.g. no image backup) is grey and
// does not count as a warning; the server's `overall` already ranks it with ok.
import { useState, useEffect } from 'react';

var TIMEOUT_MS = 8000;
var COLORS = { ok: 'var(--status-ok)', warn: 'var(--status-warn)', down: 'var(--status-down)', off: 'var(--status-off)', none: 'var(--status-off)' };

// 'status.backup.oldVersion' -> 'se_sys_backup_oldVersion'
function msgKey(message) { return 'se_sys_' + String(message || '').replace(/^status\./, '').replace(/\./g, '_'); }

// The message in words, with {name} filled from the check's values. Two values are lists.
export function statusText(t, s) {
  var v = Object.assign({}, s.values || {});
  if (Array.isArray(v.missing)) v.missing = v.missing.length;
  if (Array.isArray(v.old)) v.old = v.old.map(function (o) { return o.port + ' → ' + o.use; }).join(', ');
  var text = t[msgKey(s.message)] || s.message;
  return String(text).replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? '' : String(v[k]); });
}

export function StatusDot(props) {
  var t = props.t;
  var dS = useState(null), data = dS[0], setData = dS[1];
  var fS = useState(false), failed = fS[0], setFailed = fS[1];
  var oS = useState(false), open = oS[0], setOpen = oS[1];
  var pS = useState(null), pos = pS[0], setPos = pS[1];   // where the list opens (fixed, in the window)

  function load() {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    var token = localStorage.getItem('medconnect_token');
    // Not through api/client.js: a 401 there sends the page to the login screen, and
    // this dot is no reason to do that. Any trouble is just a grey dot.
    fetch('/api/system/status', { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { setData(j); setFailed(false); })
      .catch(function () { setFailed(true); })
      .then(function () { clearTimeout(timer); });
  }

  useEffect(function () {
    load();
    var i = setInterval(function () { if (!document.hidden) load(); }, 300000);
    function onVisible() { if (!document.hidden) load(); }
    document.addEventListener('visibilitychange', onVisible);
    return function () { clearInterval(i); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  var state = failed || !data ? 'none' : (data.overall || 'none');
  var title = failed ? t.se_sysFailed : (!data ? t.se_sysChecking : t['se_sysOverall_' + state]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={function (e) {
          // The list opens under the dot but stays inside the window: with the theme switch
          // the dot moved left in the top bar, and a list hung from its right edge ran off
          // the left of the screen (2026-09-30).
          var r = e.currentTarget.getBoundingClientRect(), w = Math.min(380, window.innerWidth * 0.92);
          setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)), width: w });
          setOpen(!open); if (!open) load();
        }} title={title}
        style={{ background: 'var(--chip)', border: '1px solid var(--border-2)', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: COLORS[state] || COLORS.none, boxShadow: state === 'ok' || state === 'none' ? 'none' : '0 0 6px ' + COLORS[state] }}></span>
      </button>
      {open ? (
        <span>
          <span onClick={function () { setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 1999 }}></span>
          <span style={{ position: 'fixed', top: pos ? pos.top : 40, left: pos ? pos.left : 8, zIndex: 2000, width: pos ? pos.width : 380, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, boxShadow: '0 8px 24px var(--shadow-50)', padding: 12, display: 'block' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: COLORS[state] === COLORS.none ? 'var(--text-soft)' : COLORS[state], marginBottom: 8 }}>{title}</span>
            {failed ? <span style={{ display: 'block', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{t.se_sysFailedHint}</span> : null}
            {data && !failed ? (data.services || []).map(function (s) {
              return <span key={s.key} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 0', borderTop: '1px solid var(--line-soft)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS[s.state] || COLORS.none, flex: 'none', position: 'relative', top: 1 }}></span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, width: 150, flex: 'none' }}>{t['se_sysItem_' + s.key] || s.key}</span>
                <span style={{ fontSize: 12, color: s.state === 'ok' || s.state === 'off' ? 'var(--text-2)' : COLORS[s.state], lineHeight: 1.4, wordBreak: 'break-word' }}>{statusText(t, s)}</span>
              </span>;
            }) : null}
            <span style={{ display: 'flex', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
              {data && data.checked_at ? (t.se_sysCheckedAt || '') + ' ' + new Date(data.checked_at).toLocaleTimeString('en-GB') : ''}
              <span style={{ flex: 1 }}></span>
              <button onClick={load} style={{ background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>↻</button>
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
