// The drug categories, as the clinic keeps them (drug_category, migration 060; Settings >
// Médicaments > 🗂 Catégories). One list for every screen that names a drug's class: the
// Settings drug form and table, the pharmacy's stock filter, the statistics export.
//
// Read once per page load from GET /api/admin/drug-categories (any signed-in account) and
// shared between the screens through this module; reload() after a change in Settings
// brings every open component up to date. A category key that is not in the list - a value
// an old drug still carries, or the list not loaded yet - is shown through the fixed
// translations the screens had before (ph_cat_*), then as the key itself, so nothing is
// ever blank.
import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import { useLang } from './i18n/index.jsx';

var cache = null;        // the rows, once read
var pending = null;      // the read in progress
var listeners = [];      // components to tell when the rows change

export function loadDrugCategories(force) {
  if (cache && !force) return Promise.resolve(cache);
  if (!pending) {
    pending = api.get('/admin/drug-categories').then(function (rows) {
      cache = Array.isArray(rows) ? rows : []; pending = null;
      listeners.forEach(function (fn) { fn(cache); });
      return cache;
    }, function (e) { pending = null; throw e; });
  }
  return pending;
}

// The name of a category in the screen's language: its own name in that language, else
// its French name (the clinic's language, always filled), else the old fixed translation,
// else the key.
export function drugCategoryLabel(cats, lang, t, key) {
  if (!key) return '';
  var c = null;
  for (var i = 0; i < (cats || []).length; i++) { if (cats[i].key === key) { c = cats[i]; break; } }
  if (c) return c['name_' + lang] || c.name_fr || c.name_en || key;
  return (t && t['ph_cat_' + key]) || key;
}

// { cats, visible, label(key), reload() }. visible: the rows a form offers (not hidden).
export function useDrugCategories() {
  var lc = useLang();
  var s = useState(cache || []), cats = s[0], setCats = s[1];
  useEffect(function () {
    listeners.push(setCats);
    loadDrugCategories().then(function (rows) { setCats(rows); }, function () { /* shown through ph_cat_* */ });
    return function () { listeners = listeners.filter(function (fn) { return fn !== setCats; }); };
  }, []);
  return {
    cats: cats,
    visible: cats.filter(function (c) { return !c.is_hidden; }),
    label: function (key) { return drugCategoryLabel(cats, lc.lang, lc.t, key); },
    reload: function () { return loadDrugCategories(true); },
  };
}
