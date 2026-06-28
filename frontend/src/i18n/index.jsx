import { createContext, useContext, useState } from 'react';
import en from './en.js';
import ko from './ko.js';
import fr from './fr.js';

var langs = { en, ko, fr };

var LangContext = createContext();

export function LangProvider(props) {
  var stored = localStorage.getItem('medconnect_lang') || 'en';
  var state = useState(stored);
  var lang = state[0];
  var setLangRaw = state[1];

  function setLang(l) {
    setLangRaw(l);
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
