import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/index.jsx';
import { getUser, logout, api } from '../api/client.js';
import { allowedModules, userPerms, homePath } from '../modules.js';
// Settings session: "change my password" opens from the name below.
import { PasswordDialog } from '../pages/settingsPassword.jsx';
// Settings session: the status dot (U3), for accounts with the settings permission.
import { StatusDot } from '../pages/settingsStatus.jsx';
// Design session: colours are tokens (index.html). tint() names a colour with an alpha.
import { tint } from '../theme.js';

// Injected by Vite from package.json (see vite.config.js). Guarded so the component still
// renders if it is ever loaded outside a Vite build.
var APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

// color is the text, tint the family of the faint background and border behind it.
var ROLE_INFO = {
  frontdesk: { icon: '🏥', color: 'var(--accent-ink)', tint: 'accent' },
  doctor: { icon: '🩺', color: 'var(--ok-ink)', tint: 'ok' },
  pharmacy: { icon: '💊', color: 'var(--violet-ink)', tint: 'violet' },
  lab: { icon: '🧪', color: 'var(--cyan-ink)', tint: 'cyan' },
  nurse: { icon: '💉', color: 'var(--warn-ink)', tint: 'warn' },
  admin: { icon: '⚙️', color: 'var(--danger-ink)', tint: 'danger' },
};

export function TopBar() {
  var langCtx = useLang();
  var t = langCtx.t;
  var lang = langCtx.lang;
  var setLang = langCtx.setLang;
  var user = getUser();
  var navigate = useNavigate();
  var location = useLocation();

  var nowState = useState(new Date());
  var now = nowState[0];
  var setNow = nowState[1];

  var titleState = useState(localStorage.getItem('medconnect_app_title') || t.appTitle || 'Bethesda EMR');
  var appTitle = titleState[0];
  var setAppTitle = titleState[1];

  var verState = useState(null); var ver = verState[0]; var setVer = verState[1];
  var showVerState = useState(false); var showVer = showVerState[0]; var setShowVer = showVerState[1];
  var canSeeUpdate = user && userPerms(user).indexOf('settings') >= 0;
  var pwState = useState(false); var showPw = pwState[0]; var setShowPw = pwState[1];

  useEffect(function () {
    var i = setInterval(function () { setNow(new Date()); }, 1000);
    return function () { clearInterval(i); };
  }, []);

  useEffect(function () {
    if (!canSeeUpdate) return;
    api.get('/version').then(function (v) { setVer(v); }).catch(function () {});
  }, []);

  // The server reads a member of staff's permissions on every request, so a change
  // made in Settings applies at once there. The menu, though, is drawn from the copy
  // stored at login: without this it kept showing a screen the account could no
  // longer use (every request on it answered 403). Re-read the account when a screen
  // opens and every five minutes; redraw only if something actually changed.
  var refreshState = useState(0); var setRefresh = refreshState[1];
  useEffect(function () {
    if (!user) return;
    function sync() {
      api.get('/auth/me').then(function (me) {
        var cur = getUser();
        if (!me || !cur) return;
        var same = cur.role === me.role && cur.name === me.name &&
          JSON.stringify(cur.permissions || null) === JSON.stringify(me.permissions || null);
        if (same) return;
        localStorage.setItem('medconnect_user', JSON.stringify(Object.assign({}, cur, {
          name: me.name, role: me.role, permissions: me.permissions, department_id: me.department_id })));
        setRefresh(function (n) { return n + 1; });
        // Someone looking at a screen when its permission is taken away would stay
        // there, every request answering 403 and the lists quietly empty. Send them
        // to the first screen they may still use.
        var now = getUser();
        var here = window.location.pathname;
        var stillAllowed = allowedModules(now).some(function (m) { return here === m.path || here.indexOf(m.path + '/') === 0; });
        if (!stillAllowed && here !== '/login') navigate(homePath(now), { replace: true });
      }).catch(function () {});
    }
    sync();
    var i = setInterval(function () { if (!document.hidden) sync(); }, 300000);
    // Coming back to the window is when someone has usually just been told
    // "I gave you the permission, look again".
    function onVisible() { if (!document.hidden) sync(); }
    document.addEventListener('visibilitychange', onVisible);
    return function () { clearInterval(i); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(function () {
    api.get('/admin/clinic').then(function (c) {
      if (c && c.app_title) { setAppTitle(c.app_title); localStorage.setItem('medconnect_app_title', c.app_title); }
    }).catch(function () {});
  }, []);

  var routes = user ? allowedModules(user) : [];
  var ri = user ? (ROLE_INFO[user.role] || { icon: '👤', color: 'var(--text-2)', tint: 'text-2' }) : {};

  return (
    <div>
      {/* Top bar */}
      <div style={{ background: 'linear-gradient(135deg,var(--panel-head),var(--panel-head-2))', borderBottom: '1px solid var(--border)', padding: '0 12px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-strong)', cursor: 'pointer' }} onClick={function () { navigate('/'); }}>{appTitle}</span>
          {APP_VERSION ? (
            <span title={(t.currentVersion || '현재') + ' v' + APP_VERSION}
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', background: 'var(--chip)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', letterSpacing: '-.02em' }}>
              v{APP_VERSION}
            </span>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ver && ver.updateAvailable ? (
            <button onClick={function () { setShowVer(true); }} title={(t.updateAvailable || '새 버전') + ' ' + ver.latest}
              style={{ background: 'linear-gradient(135deg,var(--ok-2),var(--ok-2-strong))', color: 'var(--on-fill)', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              🔔 {t.updateAvailable || '새 버전'} {ver.latest}
            </button>
          ) : null}
          {canSeeUpdate ? <StatusDot t={t} /> : null}
          <span style={{ background: 'var(--chip)', borderRadius: 5, padding: '3px 8px', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{now.toLocaleDateString('en-CA')} {now.toLocaleTimeString('en-GB')}</span>
          <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border-2)' }}>
            {[['en', 'EN'], ['ko', 'KO'], ['fr', 'FR']].map(function (i) {
              return <button key={i[0]} onClick={function () { setLang(i[0]); }} style={{ background: lang === i[0] ? 'var(--accent)' : 'var(--chip)', color: lang === i[0] ? 'var(--on-fill)' : 'var(--text-2)', border: 'none', padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{i[1]}</button>;
            })}
          </div>
          {user ? (
            <span onClick={function () { setShowPw(true); }} title={t.se_pwOpen} style={{ background: tint(ri.tint, '15'), border: '1px solid ' + tint(ri.tint, '30'), borderRadius: 5, padding: '3px 8px', fontSize: 14, color: ri.color, fontWeight: 600, cursor: 'pointer' }}>{ri.icon} {user.name} 🔑</span>
          ) : null}
          <button onClick={logout} style={{ background: 'var(--danger-strong-a20)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a40)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{t.logOff}</button>
        </div>
      </div>

      {/* Nav bar */}
      {routes.length > 0 ? (
        <div style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--border)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {routes.map(function (r) {
            var isActive = location.pathname === r.path;
            return <button key={r.path} onClick={function () { navigate(r.path); }} style={{
              background: isActive ? 'var(--accent-a15)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--text-3)',
              border: isActive ? '1px solid var(--accent-a30)' : '1px solid transparent',
              borderRadius: 5, padding: '4px 14px', cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 400,
            }}>{t[r.key] || r.key}</button>;
          })}
        </div>
      ) : null}

      {showPw ? <PasswordDialog t={t} onClose={function () { setShowPw(false); }} /> : null}

      {showVer && ver ? (
        <div onClick={function () { setShowVer(false); }} style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 480, maxWidth: '92vw', maxHeight: '86vh', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ok-text)' }}>🔔 {t.updateTitle || '업데이트 가능'}</span>
              <button onClick={function () { setShowVer(false); }} style={{ marginLeft: 'auto', background: 'var(--btn-neutral-2)', color: 'var(--text)', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t.close || '닫기'} ✕</button>
            </div>
            <div style={{ padding: 16, overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontFamily: 'monospace', fontSize: 15 }}>
                <span style={{ color: 'var(--text-2)' }}>{t.currentVersion || '현재'} v{ver.current}</span>
                <span style={{ color: 'var(--text-4)' }}>→</span>
                <span style={{ color: 'var(--ok-text)', fontWeight: 800 }}>{ver.latest}</span>
              </div>
              {ver.releaseNotes ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4 }}>{t.releaseNotes || '변경 내역'}</div>
                  <div style={{ background: 'var(--bg-col)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 160, overflow: 'auto' }}>{ver.releaseNotes}</div>
                </div>
              ) : null}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4 }}>{t.howToUpdate || '업데이트 방법'}</div>
                <div style={{ background: 'var(--bg-col)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7 }}>
                  {(t.updateSteps || '1) 백업 먼저 (설정 → 백업)\n2) 새 코드 받기 (git pull 또는 새 버전 내려받기)\n3) setup 스크립트 실행, 또는  docker compose up -d --build\n→ DB 마이그레이션은 자동 적용됩니다').split('\n').map(function (line, i) { return <div key={i}>{line}</div>; })}
                </div>
              </div>
              <a href={ver.releaseUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'var(--chip)', color: 'var(--accent-text)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{t.viewOnGithub || 'GitHub에서 보기'} ↗</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
