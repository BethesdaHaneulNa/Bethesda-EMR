import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/index.jsx';
import { api, saveAuth } from '../api/client.js';

var ROLE_ROUTES = {
  frontdesk: '/registration',
  doctor: '/consultation',
  pharmacy: '/pharmacy',
  admin: '/settings',
};

var IN = { width: '100%', background: '#0f1117', border: '1px solid #2a3142', borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box' };
var LB = { fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 };

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
      .then(function (r) { setMode(r && r.needsSetup ? 'setup' : 'login'); })
      .catch(function () { setMode('login'); });
  }, []);

  async function handleLogin() {
    setError('');
    if (!username || !password) { setError(t.loginError); return; }
    setLoading(true);
    try {
      var data = await api.post('/auth/login', { login_id: username, password: password });
      saveAuth(data.token, data.user);
      navigate(ROLE_ROUTES[data.user.role] || '/');
    } catch (err) {
      setError(err.message || t.loginError);
    } finally { setLoading(false); }
  }

  async function handleSetup() {
    setError('');
    if (!username || !password) { setError(t.loginError || 'ID/PW required'); return; }
    if (password.length < 6) { setError(t.pwTooShort || '비밀번호는 6자 이상이어야 합니다'); return; }
    if (password !== sPass2) { setError(t.pwMismatch || '비밀번호가 일치하지 않습니다'); return; }
    setLoading(true);
    try {
      var data = await api.post('/auth/setup', { login_id: username, password: password, name: sName });
      saveAuth(data.token, data.user);
      navigate('/settings');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally { setLoading(false); }
  }

  function handleKey(e) { if (e.key === 'Enter') { mode === 'setup' ? handleSetup() : handleLogin(); } }

  var isSetup = mode === 'setup';

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: '#0f1117', color: '#e2e8f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,#3b82f608,transparent 70%)' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,#10b98108,transparent 70%)' }}></div>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a3142', zIndex: 10 }}>
        {[['en', 'EN'], ['ko', 'KO'], ['fr', 'FR']].map(function (i) {
          return <button key={i[0]} onClick={function () { setLang(i[0]); }} style={{ background: lang === i[0] ? '#3b82f6' : '#1e2433', color: lang === i[0] ? '#fff' : '#94a3b8', border: 'none', padding: '4px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{i[1]}</button>;
        })}
      </div>

      <div style={{ width: 380, zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', borderRadius: 16, width: 60, height: 60, marginBottom: 14, boxShadow: '0 8px 28px #3b82f640' }}>
            <span style={{ fontSize: 31, fontWeight: 800, color: '#fff' }}>M</span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 700, color: '#f1f5f9' }}>{t.appTitle}</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 3 }}>Electronic Medical Records</div>
        </div>

        {mode === 'checking' ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 14, padding: 30 }}>···</div>
        ) : (
        <div style={{ background: 'linear-gradient(135deg,#1a1f2e,#151a28)', border: '1px solid #2a3142', borderRadius: 14, padding: '28px', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
          {isSetup ? (
            <div style={{ marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>🔐 {t.setupTitle || '초기 설정'}</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{t.setupSubtitle || '관리자 계정을 만드세요'}</div>
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
            <input value={username} onChange={function (e) { setUsername(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder={isSetup ? (t.adminId || '관리자 아이디') : t.username} style={IN} autoComplete="username" />
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

          {error ? <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#f87171', textAlign: 'center' }}>⚠ {error}</div> : null}

          <button onClick={isSetup ? handleSetup : handleLogin} disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: loading ? '#1e2433' : (isSetup ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#3b82f6,#2563eb)'),
            color: '#fff', fontSize: 17, fontWeight: 700, boxShadow: loading ? 'none' : '0 4px 16px #3b82f640',
          }}>
            {loading ? (t.loggingIn || '...') : (isSetup ? (t.createAdmin || '관리자 계정 만들기') : t.login)}
          </button>
        </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#334155' }}>{t.appTitle} v1.0</div>
      </div>
    </div>
  );
}
