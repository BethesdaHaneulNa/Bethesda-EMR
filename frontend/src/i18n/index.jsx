import { createContext, useContext, useState, useEffect } from 'react';
import en from './en.js';
import ko from './ko.js';
import fr from './fr.js';
import { currentCurrency, setCurrentCurrency, formatMoney } from '../money.js';

var langs = { en, ko, fr };

var LangContext = createContext();

// The languages the clinic uses (Settings -> Languages, 066): what the server says, or a
// list kept from the last visit. Always in this order and never empty - what cannot be
// read is all three, so a screen is never left without a language.
var ALL_LANGS = ['fr', 'en', 'ko'];
export function readLangs(raw) {
  var list = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
  var out = ALL_LANGS.filter(function (l) { return list.indexOf(l) >= 0; });
  return out.length ? out : ALL_LANGS.slice();
}

// The page says which language it is in (<html lang>). It was always "en", so a browser
// offered to translate the French screen and a screen reader read French as English.
function markPage(l) {
  try { document.documentElement.lang = langs[l] ? l : 'fr'; } catch (e) { /* no document */ }
}

export function LangProvider(props) {
  // A PC that has never chosen a language starts in French (the clinic manager's decision,
  // 2026-09-30): the clinic's staff work in French. EN / KO / FR at the top stay as they
  // are and the PC remembers the choice.
  var stored = localStorage.getItem('medconnect_lang');
  if (!langs[stored]) stored = 'fr';
  var state = useState(stored);
  var chosen = state[0];
  var setLangRaw = state[1];

  // The languages in use. Kept on the PC between visits so that the buttons do not flash
  // while the server is asked; asked once when the page loads (no sign-in needed).
  var es = useState(function () { var kept = null; try { kept = localStorage.getItem('medconnect_langs'); } catch (e) { /* none kept */ } return readLangs(kept); });
  var enabled = es[0];
  var setEnabledRaw = es[1];
  function setEnabled(v) {
    var list = readLangs(v);
    setEnabledRaw(list);
    try { localStorage.setItem('medconnect_langs', list.join(',')); } catch (e) { /* not kept */ }
  }
  // The clinic's money (067): kept on the PC too, for the same reason; money.js keeps the
  // current one for the papers.
  var cu = useState(currentCurrency);
  var currency = cu[0];
  function setCurrency(c) { cu[1](setCurrentCurrency(c)); }
  useEffect(function () {
    fetch('/api/auth/setup-status').then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.languages) setEnabled(d.languages); if (d && d.currency) setCurrency(d.currency); })
      .catch(function () { /* what this PC kept stays */ });
  }, []);

  // What this PC chose stays remembered even while the clinic does not use it: the screen
  // then shows the first language in use, and comes back to the choice if it returns.
  var lang = enabled.indexOf(chosen) >= 0 ? chosen : enabled[0];
  markPage(lang);

  function setLang(l) {
    if (enabled.indexOf(l) < 0) return;
    setLangRaw(l);
    markPage(l);
    localStorage.setItem('medconnect_lang', l);
  }

  var t = langs[lang] || langs.fr;

  return (
    <LangContext.Provider value={{ lang: lang, setLang: setLang, t: t, enabled: enabled, setEnabled: setEnabled,
      currency: currency, setCurrency: setCurrency, money: function (n) { return formatMoney(n, lang, currency); } }}>
      {props.children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
