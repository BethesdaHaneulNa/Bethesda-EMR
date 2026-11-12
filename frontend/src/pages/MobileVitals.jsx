// /m - the EMR on a phone (1.7.8 vital signs; 1.7.11 lab, orders, imaging).
//
// Where there is no PC, staff open the EMR on a phone (on a Wi-Fi that reaches the server -
// the note at the bottom, Settings -> Clinic mobile_hint, can say which) and are sent here
// (vitals.js phoneHome, App.jsx). This page is the only thing a phone shows: no top bar, no
// menu, no theme button - the clinic's name, who is signed in, Log off, the FR · KO · EN
// switch, and four big buttons (clinic manager, on site, 2026-11-09):
//   🩺 Signes vitaux  type them (any staff)                       mobile/VitalsScreen.jsx
//   🧪 Labo           type results (the PC lab permission), lists  mobile/LabScreen.jsx
//   📷 Imagerie       today's imaging orders, read-only            mobile/ImagingScreen.jsx
//   📋 Ordres         every order of today's visits, read-only     mobile/OrdersScreen.jsx
// Every list is today's only and has a big refresh button. Emoji: only ones Windows 10 and
// older Android draw (not 🩻 - 1.7.10 found it as a box on site).
// Sized for 360-430 px wide: nothing is wider than the screen; text 18 px or more.
import { useState, useEffect } from 'react';
import { useLang } from '../i18n/index.jsx';
import { api, getUser, logout } from '../api/client.js';
import { clinicName } from '../documents/shared.jsx';
import { FORCE_PC_KEY } from '../vitals.js';
import { FS, col, bigBtn } from './mobile/ui.jsx';
import { VitalsScreen } from './mobile/VitalsScreen.jsx';
import { LabScreen } from './mobile/LabScreen.jsx';
import { OrdersScreen } from './mobile/OrdersScreen.jsx';
import { ImagingScreen } from './mobile/ImagingScreen.jsx';

var TITLE = 'Bethesda - Signes vitaux';
var SCREENS = [
  ['vitals', '🩺', 'm_title', 'accent'],
  ['lab', '🧪', 'mo_lab', 'cyan'],
  ['imaging', '📷', 'mo_imaging', 'warn'],
  ['orders', '📋', 'mo_orders', 'ok'],
];

export default function MobileVitalsPage() {
  var langCtx = useLang();
  var t = langCtx.t, lang = langCtx.lang, setLang = langCtx.setLang;
  var user = getUser() || {};
  var cs = useState(null), clinic = cs[0], setClinic = cs[1];
  var ss = useState(null), screen = ss[0], setScreen = ss[1];       // null = the four buttons

  useEffect(function () {
    var before = document.title;
    document.title = TITLE;
    api.get('/admin/clinic').then(setClinic).catch(function () {});
    return function () { document.title = before; };
  }, []);

  function go(s) { setScreen(s); try { window.scrollTo(0, 0); } catch (e) { /* old browser */ } }
  function home() { go(null); }

  function pcVersion(e) {
    e.preventDefault();
    try { localStorage.setItem(FORCE_PC_KEY, '1'); } catch (err) { /* storage blocked: the ?pc=1 does it */ }
    window.location.href = '/registration?pc=1';
  }

  var page = { fontFamily: 'system-ui,-apple-system,sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', width: '100%', overflowX: 'hidden', boxSizing: 'border-box', fontSize: FS };

  return (
    <div style={page}>
      <div style={{ background: 'var(--panel-head)', borderBottom: '1px solid var(--border)' }}>
        <div style={Object.assign({}, col, { padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 })}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clinicName(clinic, lang)}</div>
            <div style={{ fontSize: FS, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.login_id || ''}</div>
          </div>
          <button type="button" onClick={logout} style={{ flexShrink: 0, minHeight: 48, background: 'var(--danger-strong-a20)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a40)', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontSize: FS, fontWeight: 700 }}>{t.logOff}</button>
        </div>
      </div>

      {/* FR · KO · EN (1.7.9): the same store as the PC's switch (useLang, localStorage
          medconnect_lang), so a choice made on one screen holds on the other. On every screen. */}
      {(langCtx.enabled || []).length > 1 ? <div data-lang-switch style={Object.assign({}, col, { paddingBottom: 0, display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 })}>
        {[['fr', 'FR'], ['ko', 'KO'], ['en', 'EN']].filter(function (l) { return langCtx.enabled.indexOf(l[0]) >= 0; }).map(function (l) {
          var on = lang === l[0];
          return <button key={l[0]} type="button" onClick={function () { setLang(l[0]); }} aria-pressed={on}
            style={{ minWidth: 52, minHeight: 48, padding: '0 10px', borderRadius: 8, cursor: 'pointer', fontSize: FS, fontWeight: 700,
              background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--on-fill)' : 'var(--text-3)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-2)') }}>{l[1]}</button>;
        })}
      </div> : null}

      {screen === 'vitals' ? <VitalsScreen t={t} onHome={home} />
        : screen === 'lab' ? <LabScreen t={t} onHome={home} />
        : screen === 'imaging' ? <ImagingScreen t={t} onHome={home} />
        : screen === 'orders' ? <OrdersScreen t={t} onHome={home} />
        : (
        <div style={col}>
          <div style={{ fontSize: FS, color: 'var(--text-3)', margin: '6px 0 12px' }}>{t.mo_today}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {SCREENS.map(function (s) {
              return <button key={s[0]} type="button" onClick={function () { go(s[0]); }}
                style={Object.assign({}, bigBtn, { minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--' + s[3] + '-a20)', color: 'var(--text-strong)', border: '1px solid var(--' + s[3] + '-a50)', fontSize: 20 })}>
                <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">{s[1]}</span>
                <span style={{ overflowWrap: 'anywhere' }}>{t[s[2]]}</span>
              </button>;
            })}
          </div>
          {clinic && clinic.mobile_hint ? <div style={{ marginTop: 22, fontSize: FS, color: 'var(--text-3)', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}>{clinic.mobile_hint}</div> : null}
          <div style={{ marginTop: 14 }}><a href="/registration?pc=1" onClick={pcVersion} style={{ display: 'inline-block', minHeight: 48, lineHeight: '48px', fontSize: FS, color: 'var(--text-3)' }}>{t.m_pcLink}</a></div>
        </div>
      )}
    </div>
  );
}
