import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/index.jsx';
import { getUser, logout, api } from '../api/client.js';
import { allowedModules } from '../modules.js';

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

  useEffect(function () {
    var i = setInterval(function () { setNow(new Date()); }, 1000);
    return function () { clearInterval(i); };
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
    </div>
  );
}
