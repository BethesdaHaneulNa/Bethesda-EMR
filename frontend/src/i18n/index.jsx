import { createContext, useContext, useState } from 'react';
import en from './en.js';
import ko from './ko.js';
import fr from './fr.js';

var langs = { en, ko, fr };

var LangContext = createContext();

// The page says which language it is in (<html lang>). It was always "en", so a browser
// offered to translate the French screen and a screen reader read French as English.
function markPage(l) {
  try { document.documentElement.lang = langs[l] ? l : 'en'; } catch (e) { /* no document */ }
}

export function LangProvider(props) {
  var stored = localStorage.getItem('medconnect_lang') || 'en';
  var state = useState(stored);
  var lang = state[0];
  var setLangRaw = state[1];
  markPage(lang);

  function setLang(l) {
    setLangRaw(l);
    markPage(l);
    localStorage.setItem('medconnect_lang', l);
  }

  var t = langs[lang] || langs.en;

  return (
    <LangContext.Provider value={{ lang: lang, setLang: setLang, t: t }}>
      {props.children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
