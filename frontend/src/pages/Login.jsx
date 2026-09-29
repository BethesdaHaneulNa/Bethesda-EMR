import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/index.jsx';
import { api, saveAuth } from '../api/client.js';
// The server answers in English ("Invalid credentials", "Account is inactive");
// show it in the screen's language. See settingsMessages.js.
import { seMessage } from './settingsMessages.js';

var ROLE_ROUTES = {
  frontdesk: '/registration',
  doctor: '/consultation',
  pharmacy: '/pharmacy',
  admin: '/settings',
};

// Login and setup are sent here rather than through api/client.js. That client
// treats every 401 as "your session ran out" and reloads the login page - right
// everywhere else, but here a 401 is the answer to a wrong password or an inactive
// account, and the reload wiped the message before anyone could read it: a wrong
// password just emptied the form, with nothing said.
// The same build-time version the top bar shows (vite.config.js define), so the login
// page no longer says "v1.0" while the menu bar says v1.4.0.
var APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

async function authPost(path, body) {
  var res = await fetch('/api' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  var data = null;
  try { data = await res.json(); } catch (e) { throw new Error('API response was not JSON'); }
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
}

var IN = { width: '100%', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontSize: 16, outline: 'none', boxSizing: 'border-box' };
var LB = { fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 };

export default function LoginPage() {
  var langCtx = useLang();
  var t = langCtx.t;
  var lang = langCtx.lang;
  var setLang = langCtx.setLang;
  var navigate = useNavigate();

  var ms = useState('checking'), mode = ms[0], setMode = ms[1]; // checking | login | setup
  var us = useState(''), username = us[0], setUsername = us[1];
  var ps = useState(''), password = ps[0], setPassword = ps[1];
  var es = useState(''), error = es[0], setError = es[1];
  var ls = useState(false), loading = ls[0], setLoading = ls[1];

  // setup-wizard fields
  var sn = useState(''), sName = sn[0], setSName = sn[1];
  var sp2 = useState(''), sPass2 = sp2[0], setSPass2 = sp2[1];

  useEffect(function () {
    api.get('/auth/setup-status')
      // The setup account's login id is always admin (S3, auth.routes.js SETUP_LOGIN).
      .then(function (r) { if (r && r.needsSetup) { setUsername('admin'); setMode('setup'); } else setMode('login'); })
      .catch(function () { setMode('login'); });
  }, []);

  async function handleLogin() {
    setError('');
    if (!username || !password) { setError(t.loginError); return; }
    setLoading(true);
    try {
      var data = await authPost('/auth/login', { login_id: username, password: password });
      saveAuth(data.token, data.user);
      navigate(ROLE_ROUTES[data.user.role] || '/');
    } catch (err) {
      setError(err.message || t.loginError);   // translated where it is shown
    } finally { setLoading(false); }
  }

  async function handleSetup() {
    setError('');
    if (!username || !password) { setError(t.loginError || 'ID/PW required'); return; }
    if (password.length < 6) { setError(t.pwTooShort || '비밀번호는 6자 이상이어야 합니다'); return; }
    if (password !== sPass2) { setError(t.pwMismatch || '비밀번호가 일치하지 않습니다'); return; }
    setLoading(true);
    try {
      var data = await authPost('/auth/setup', { login_id: username, password: password, name: sName });
      saveAuth(data.token, data.user);
      navigate('/settings');
    } catch (err) {
      setError(err.message || t.se_errServer);
    } finally { setLoading(false); }
  }

  function handleKey(e) { if (e.key === 'Enter') { mode === 'setup' ? handleSetup() : handleLogin(); } }

  var isSetup = mode === 'setup';

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,var(--accent-a08),transparent 70%)' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,var(--ok-a08),transparent 70%)' }}></div>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-2)', zIndex: 10 }}>
        {[['en', 'EN'], ['ko', 'KO'], ['fr', 'FR']].map(function (i) {
          return <button key={i[0]} onClick={function () { setLang(i[0]); }} style={{ background: lang === i[0] ? 'var(--accent)' : 'var(--chip)', color: lang === i[0] ? 'var(--on-fill)' : 'var(--text-2)', border: 'none', padding: '4px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{i[1]}</button>;
        })}
      </div>

      <div style={{ width: 380, zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,var(--accent),var(--accent-strong))', borderRadius: 16, width: 60, height: 60, marginBottom: 14, boxShadow: '0 8px 28px var(--accent-a40)' }}>
            <span style={{ fontSize: 31, fontWeight: 800, color: 'var(--on-fill)' }}>B</span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 700, color: 'var(--text-strong)' }}>{t.appTitle}</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>Electronic Medical Records</div>
        </div>

        {mode === 'checking' ? (
          <div style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 14, padding: 30 }}>···</div>
        ) : (
        <div style={{ background: 'linear-gradient(135deg,var(--panel-head),var(--panel-head-3))', border: '1px solid var(--border-2)', borderRadius: 14, padding: '28px', boxShadow: '0 16px 48px var(--shadow-40)' }}>
          {isSetup ? (
            <div style={{ marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-strong)' }}>🔐 {t.setupTitle || '초기 설정'}</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{t.setupSubtitle || '관리자 계정을 만드세요'}</div>
            </div>
          ) : null}

          {isSetup ? (
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>{t.displayName || '이름 (표시용)'}</label>
              <input value={sName} onChange={function (e) { setSName(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder={t.displayName || '이름'} style={IN} />
            </div>
          ) : null}

          <div style={{ marginBottom: 14 }}>
            <label style={LB}>{t.username}</label>
            <input value={username} readOnly={isSetup} onChange={function (e) { setUsername(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder={isSetup ? (t.adminId || '관리자 아이디') : t.username} style={isSetup ? Object.assign({}, IN, { opacity: .7, cursor: 'default' }) : IN} autoComplete="username" />
            {isSetup ? <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>{t.se_setupIdFixed}</div> : null}
          </div>

          <div style={{ marginBottom: isSetup ? 14 : 18 }}>
            <label style={LB}>{t.password}</label>
            <input type="password" value={password} onChange={function (e) { setPassword(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder={isSetup ? (t.setupPwHint || '6자 이상') : t.password} style={IN} autoComplete={isSetup ? 'new-password' : 'current-password'} />
          </div>

          {isSetup ? (
            <div style={{ marginBottom: 18 }}>
              <label style={LB}>{t.confirmPassword || '비밀번호 확인'}</label>
              <input type="password" value={sPass2} onChange={function (e) { setSPass2(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder={t.confirmPassword || '비밀번호 확인'} style={IN} autoComplete="new-password" />
            </div>
          ) : null}

          {error ? <div style={{ background: 'var(--danger-a15)', border: '1px solid var(--danger-a30)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: 'var(--danger-text)', textAlign: 'center' }}>⚠ {seMessage(t, error)}</div> : null}

          <button onClick={isSetup ? handleSetup : handleLogin} disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: loading ? 'var(--chip)' : (isSetup ? 'linear-gradient(135deg,var(--ok),var(--ok-strong))' : 'linear-gradient(135deg,var(--accent),var(--accent-strong))'),
            color: loading ? 'var(--text-max)' : 'var(--on-fill)', fontSize: 17, fontWeight: 700, boxShadow: loading ? 'none' : '0 4px 16px var(--accent-a40)',
          }}>
            {loading ? (t.loggingIn || '...') : (isSetup ? (t.createAdmin || '관리자 계정 만들기') : t.login)}
          </button>
        </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-5)' }}>{t.appTitle}{APP_VERSION ? ' v' + APP_VERSION : ''}</div>
      </div>
    </div>
  );
}
