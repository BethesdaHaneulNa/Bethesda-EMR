// "Change my password" - opened from the name in the top bar (TopBar.jsx), for every
// member of staff whatever their permissions. POST /api/auth/password (auth.routes.js).
// Decided 2026-09-29: the initial password stays 1234 and is not forced to change,
// and there is no minimum length - only not empty. The new password is typed twice
// because a typo here locks the person out until an admin resets it.
import { useState } from 'react';
import { api } from '../api/client.js';
import { seMessage } from './settingsMessages.js';

var IS = { width: '100%', boxSizing: 'border-box', background: '#11141c', border: '1px solid #2a3142', borderRadius: 5, padding: '7px 9px', color: '#e2e8f0', fontSize: 14 };

export function PasswordDialog(props) {
  var t = props.t;
  var fS = useState({ current: '', next: '', again: '' }), f = fS[0], setF = fS[1];
  var shS = useState(false), show = shS[0], setShow = shS[1];
  var erS = useState(''), err = erS[0], setErr = erS[1];     // raw text; translated when shown
  var okS = useState(false), done = okS[0], setDone = okS[1];
  var bzS = useState(false), busy = bzS[0], setBusy = bzS[1];

  function set(k, v) { setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); setErr(''); }

  async function submit() {
    if (busy) return;
    if (!f.current || !f.next) { setErr('password is required'); return; }
    if (f.next !== f.again) { setErr('mismatch'); return; }
    setBusy(true);
    try {
      await api.post('/auth/password', { current_password: f.current, new_password: f.next });
      setDone(true);
      setF({ current: '', next: '', again: '' });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  function onKey(e) { if (e.key === 'Enter') submit(); if (e.key === 'Escape') props.onClose(); }

  var type = show ? 'text' : 'password';
  function field(label, k, auto) {
    return <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} value={f[k]} autoComplete={auto} onChange={function (e) { set(k, e.target.value); }} onKeyDown={onKey} style={IS} />
    </div>;
  }

  return (
    <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 380, maxWidth: '92vw', background: '#0f1117', border: '1px solid #2a3142', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #232838', background: '#161a26', fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>🔑 {t.se_pwTitle}</div>
        <div style={{ padding: 16 }}>
          {done ? (
            <div style={{ color: '#86efac', fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>✓ {t.se_pwDone}</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 12 }}>{t.se_pwHint}</div>
              {field(t.se_pwCurrent, 'current', 'current-password')}
              {field(t.se_pwNew, 'next', 'new-password')}
              {field(t.se_pwAgain, 'again', 'new-password')}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={show} onChange={function (e) { setShow(e.target.checked); }} /> {t.se_showPw}
              </label>
              {err ? <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>⚠ {err === 'mismatch' ? t.se_pwMismatch : seMessage(t, err)}</div> : null}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={props.onClose} style={{ background: '#1e2433', color: '#cbd5e1', border: '1px solid #2a3142', borderRadius: 5, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>{done ? t.se_pwClose : t.cancel}</button>
            {done ? null : <button onClick={submit} disabled={busy} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 14px', cursor: busy ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, opacity: busy ? .6 : 1 }}>{t.se_pwChange}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
