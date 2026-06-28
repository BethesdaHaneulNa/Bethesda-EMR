import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/index.jsx';
import { getUser, logout, api } from '../api/client.js';
import { allowedModules, userPerms } from '../modules.js';

var ROLE_INFO = {
  frontdesk: { icon: '🏥', color: '#3b82f6' },
  doctor: { icon: '🩺', color: '#10b981' },
  pharmacy: { icon: '💊', color: '#8b5cf6' },
  lab: { icon: '🧪', color: '#06b6d4' },
  admin: { icon: '⚙️', color: '#ef4444' },
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

  useEffect(function () {
    var i = setInterval(function () { setNow(new Date()); }, 1000);
    return function () { clearInterval(i); };
  }, []);

  useEffect(function () {
    if (!canSeeUpdate) return;
    api.get('/version').then(function (v) { setVer(v); }).catch(function () {});
  }, []);

  useEffect(function () {
    api.get('/admin/clinic').then(function (c) {
      if (c && c.app_title) { setAppTitle(c.app_title); localStorage.setItem('medconnect_app_title', c.app_title); }
    }).catch(function () {});
  }, []);

  var routes = user ? allowedModules(user) : [];
  var ri = user ? (ROLE_INFO[user.role] || { icon: '👤', color: '#94a3b8' }) : {};

  return (
    <div>
      {/* Top bar */}
      <div style={{ background: 'linear-gradient(135deg,#1a1f2e,#141824)', borderBottom: '1px solid #232838', padding: '0 12px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', cursor: 'pointer' }} onClick={function () { navigate('/'); }}>{appTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {ver && ver.updateAvailable ? (
            <button onClick={function () { setShowVer(true); }} title={(t.updateAvailable || '새 버전') + ' ' + ver.latest}
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              🔔 {t.updateAvailable || '새 버전'} {ver.latest}
            </button>
          ) : null}
          <span style={{ background: '#1e2433', borderRadius: 5, padding: '3px 8px', fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{now.toLocaleDateString('en-CA')} {now.toLocaleTimeString('en-GB')}</span>
          <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: '1px solid #2a3142' }}>
            {[['en', 'EN'], ['ko', 'KO'], ['fr', 'FR']].map(function (i) {
              return <button key={i[0]} onClick={function () { setLang(i[0]); }} style={{ background: lang === i[0] ? '#3b82f6' : '#1e2433', color: lang === i[0] ? '#fff' : '#94a3b8', border: 'none', padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{i[1]}</button>;
            })}
          </div>
          {user ? (
            <span style={{ background: ri.color + '15', border: '1px solid ' + ri.color + '30', borderRadius: 5, padding: '3px 8px', fontSize: 14, color: ri.color, fontWeight: 600 }}>{ri.icon} {user.name}</span>
          ) : null}
          <button onClick={logout} style={{ background: '#dc262620', color: '#f87171', border: '1px solid #dc262640', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{t.logOff}</button>
        </div>
      </div>

      {/* Nav bar */}
      {routes.length > 0 ? (
        <div style={{ background: '#161a26', borderBottom: '1px solid #232838', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {routes.map(function (r) {
            var isActive = location.pathname === r.path;
            return <button key={r.path} onClick={function () { navigate(r.path); }} style={{
              background: isActive ? '#3b82f615' : 'transparent',
              color: isActive ? '#60a5fa' : '#64748b',
              border: isActive ? '1px solid #3b82f630' : '1px solid transparent',
              borderRadius: 5, padding: '4px 14px', cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 400,
            }}>{t[r.key] || r.key}</button>;
          })}
        </div>
      ) : null}

      {showVer && ver ? (
        <div onClick={function () { setShowVer(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 480, maxWidth: '92vw', maxHeight: '86vh', background: '#0f1117', border: '1px solid #2a3142', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #232838', background: '#161a26', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>🔔 {t.updateTitle || '업데이트 가능'}</span>
              <button onClick={function () { setShowVer(false); }} style={{ marginLeft: 'auto', background: '#374151', color: '#e2e8f0', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t.close || '닫기'} ✕</button>
            </div>
            <div style={{ padding: 16, overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontFamily: 'monospace', fontSize: 15 }}>
                <span style={{ color: '#94a3b8' }}>{t.currentVersion || '현재'} v{ver.current}</span>
                <span style={{ color: '#475569' }}>→</span>
                <span style={{ color: '#34d399', fontWeight: 800 }}>{ver.latest}</span>
              </div>
              {ver.releaseNotes ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>{t.releaseNotes || '변경 내역'}</div>
                  <div style={{ background: '#11141c', border: '1px solid #232838', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 160, overflow: 'auto' }}>{ver.releaseNotes}</div>
                </div>
              ) : null}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>{t.howToUpdate || '업데이트 방법'}</div>
                <div style={{ background: '#11141c', border: '1px solid #232838', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                  {(t.updateSteps || '1) 백업 먼저 (설정 → 백업)\n2) 새 코드 받기 (git pull 또는 새 버전 내려받기)\n3) setup 스크립트 실행, 또는  docker compose up -d --build\n→ DB 마이그레이션은 자동 적용됩니다').split('\n').map(function (line, i) { return <div key={i}>{line}</div>; })}
                </div>
              </div>
              <a href={ver.releaseUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#1e2433', color: '#60a5fa', border: '1px solid #2a3142', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{t.viewOnGithub || 'GitHub에서 보기'} ↗</a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
