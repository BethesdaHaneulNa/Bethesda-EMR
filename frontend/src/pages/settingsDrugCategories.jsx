// Settings > Médicaments > 🗂 Catégories: the classes a drug is filed under, kept by the
// clinic (drug_category, migration 060; the clinic's manager, 2026-11-09, from the site).
//
// One row per category: ▲▼ for the order, the three names (French required; Korean and
// English fall back to the French one), how many drugs carry it, Masquer / Afficher, and
// Supprimer - only when no drug carries it; otherwise the row says to hide it instead.
// "Other" (the form's fallback) can be neither hidden nor removed. The key (what the drugs
// store) is shown small and never changes. API: /api/admin/drug-categories (admin.routes.js).
import { useState } from 'react';
import { api } from '../api/client.js';
import { seMessage } from './settingsMessages.js';

var IS = { boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' };
var BTN = { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' };
var BTN_GO = { background: 'var(--warn-a20)', color: 'var(--warn-text)', border: '1px solid var(--warn-a40)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' };
var BTN_DEL = { background: 'var(--danger-strong-a10)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a30)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' };
var TAG = { background: 'var(--chip)', color: 'var(--text-3)', borderRadius: 3, padding: '1px 6px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };
var LANGS = ['fr', 'ko', 'en'];

// props: t, cats (the rows), reload() (re-reads the shared list), onChanged() (the Settings
// screen re-reads its drugs so the table shows new names at once).
export function DrugCategoriesPanel(props) {
  var t = props.t, cats = props.cats || [];
  var eS = useState({}), edits = eS[0], setEdits = eS[1];     // key -> { name_fr, name_ko, name_en } being typed
  var nS = useState({ name_fr: '', name_ko: '', name_en: '' }), fresh = nS[0], setFresh = nS[1];
  var bS = useState(false), busy = bS[0], setBusy = bS[1];

  function fail(e) { alert(t.se_error + ': ' + seMessage(t, (e && e.message) || '')); }
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try { await fn(); await props.reload(); if (props.onChanged) props.onChanged(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  }
  function typed(c) { return edits[c.key] || { name_fr: c.name_fr || '', name_ko: c.name_ko || '', name_en: c.name_en || '' }; }
  function changed(c) {
    var e = edits[c.key]; if (!e) return false;
    return LANGS.some(function (l) { return (e['name_' + l] || '').trim() !== (c['name_' + l] || ''); });
  }
  function setName(c, l, v) {
    setEdits(function (p) { var o = Object.assign({}, p); o[c.key] = Object.assign({}, typed(c), { ['name_' + l]: v }); return o; });
  }
  function saveNames(c) {
    var e = typed(c);
    run(async function () {
      await api.put('/admin/drug-categories/' + encodeURIComponent(c.key), { name_fr: e.name_fr, name_ko: e.name_ko, name_en: e.name_en });
      setEdits(function (p) { var o = Object.assign({}, p); delete o[c.key]; return o; });
    });
  }
  function toggleHidden(c) {
    run(async function () { await api.put('/admin/drug-categories/' + encodeURIComponent(c.key), { is_hidden: !c.is_hidden }); });
  }
  function move(i, by) {
    var keys = cats.map(function (c) { return c.key; });
    var j = i + by; if (j < 0 || j >= keys.length) return;
    var x = keys[i]; keys[i] = keys[j]; keys[j] = x;
    run(async function () { await api.put('/admin/drug-categories/order', { keys: keys }); });
  }
  function remove(c) {
    if (c.drug_count > 0 || c.fixed) return;
    if (!confirm(String(t.se_dcConfirmDelete || '').replace('{name}', c.name_fr))) return;
    run(async function () { await api.del('/admin/drug-categories/' + encodeURIComponent(c.key)); });
  }
  function add() {
    if (!fresh.name_fr.trim()) return;
    run(async function () {
      await api.post('/admin/drug-categories', fresh);
      setFresh({ name_fr: '', name_ko: '', name_en: '' });
    });
  }

  var bd = 'var(--border)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', tx = 'var(--text)';
  var COLS = { display: 'grid', gridTemplateColumns: '26px 26px 120px 1fr 1fr 1fr auto auto auto', gap: 6, alignItems: 'center' };
  // The panel sits above the drug table in a column that fills the screen; with twenty rows
  // it would push the table and its own last line (the new category) out of reach, so it
  // scrolls on its own and leaves room below.
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + bd, background: 'var(--panel)', maxHeight: '60vh', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontSize: 12, color: t3, marginBottom: 8, lineHeight: 1.5 }}>{t.se_dcHint}</div>
      <div style={Object.assign({}, COLS, { marginBottom: 4, fontSize: 11, color: t3, fontWeight: 600 })}>
        <span></span><span></span><span>{t.se_dcKey}</span><span>{t.se_dcNameFr}</span><span>{t.se_dcNameKo}</span><span>{t.se_dcNameEn}</span><span></span><span></span><span></span>
      </div>
      {cats.map(function (c, i) {
        var e = typed(c), dirty = changed(c), first = i === 0, last = i === cats.length - 1;
        return <div key={c.key} style={Object.assign({}, COLS, { marginBottom: 5, opacity: c.is_hidden ? 0.6 : 1 })}>
          <button onClick={function () { move(i, -1); }} disabled={first || busy} title={t.se_phCatUp} aria-label={t.se_phCatUp} style={Object.assign({}, BTN, { padding: '3px 0', color: first ? t3 : t2, cursor: first ? 'default' : 'pointer' })}>▲</button>
          <button onClick={function () { move(i, 1); }} disabled={last || busy} title={t.se_phCatDown} aria-label={t.se_phCatDown} style={Object.assign({}, BTN, { padding: '3px 0', color: last ? t3 : t2, cursor: last ? 'default' : 'pointer' })}>▼</button>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.key}>{c.key}{c.is_hidden ? <span style={Object.assign({}, TAG, { marginLeft: 4 })}>{t.se_dcHidden}</span> : null}</span>
          {LANGS.map(function (l) {
            return <input key={l} value={e['name_' + l]} maxLength={60} aria-label={t['se_dcName' + l.charAt(0).toUpperCase() + l.slice(1)]} placeholder={l === 'fr' ? '' : e.name_fr}
              onChange={function (ev) { setName(c, l, ev.target.value); }}
              onKeyDown={function (ev) { if (ev.key === 'Enter' && dirty) saveNames(c); }}
              style={Object.assign({}, IS, { width: '100%' })} />;
          })}
          <span style={{ fontSize: 12, color: t3, whiteSpace: 'nowrap', minWidth: 70, textAlign: 'right' }}>{String(t.se_dcCount || '').replace('{n}', c.drug_count)}</span>
          {dirty
            ? <button onClick={function () { saveNames(c); }} disabled={busy} style={BTN_GO}>{t.save}</button>
            : (c.fixed
              ? <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }} title={t.se_dcFixed}>{t.se_dcFixedShort}</span>
              : <button onClick={function () { toggleHidden(c); }} disabled={busy} style={BTN}>{c.is_hidden ? t.se_dcShow : t.se_dcHide}</button>)}
          {c.fixed ? <span></span>
            : (c.drug_count > 0
              ? <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }} title={t.se_dcInUseHint}>—</span>
              : <button onClick={function () { remove(c); }} disabled={busy} style={BTN_DEL}>{t.delete}</button>)}
        </div>;
      })}
      <div style={Object.assign({}, COLS, { marginTop: 10 })}>
        <span></span><span></span><span style={{ fontSize: 12, color: t3 }}>{t.se_dcNew}</span>
        {LANGS.map(function (l) {
          return <input key={l} value={fresh['name_' + l]} maxLength={60} placeholder={t['se_dcName' + l.charAt(0).toUpperCase() + l.slice(1)]}
            onChange={function (ev) { var v = ev.target.value; setFresh(function (f) { var o = Object.assign({}, f); o['name_' + l] = v; return o; }); }}
            onKeyDown={function (ev) { if (ev.key === 'Enter') add(); }}
            style={Object.assign({}, IS, { width: '100%' })} />;
        })}
        <span></span>
        <button onClick={add} disabled={busy || !fresh.name_fr.trim()} style={Object.assign({}, BTN_GO, fresh.name_fr.trim() ? {} : { color: t3, cursor: 'default' })}>{t.se_dcAdd}</button>
        <span></span>
      </div>
      <div style={{ fontSize: 11, color: t3, marginTop: 6 }}>{t.se_dcInUseHint}</div>
    </div>
  );
}
