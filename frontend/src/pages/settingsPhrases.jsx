// Settings > phrases: the ready-made sentences a doctor adds to a note with one click
// (the consultation screen's list), and their categories.
//
// The director, 2026-10-01: one name for the thing on both screens (t.se_phraseName),
// one sentence per phrase - no French and English copies - and categories the clinic
// makes itself. Categories are rows now (phrase_category, migration 701): added, renamed,
// put in order and removed here. A category that still holds phrases is not removed
// silently: the screen asks where to move them, and the server refuses otherwise.
// API: /api/admin/phrases, /api/admin/phrase-categories (admin.routes.js).
import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { seMessage } from './settingsMessages.js';

var IS = { width: '100%', boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '7px 10px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };
var BTN = { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12 };
var BTN_GO = { background: 'var(--warn-a20)', color: 'var(--warn-text)', border: '1px solid var(--warn-a40)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' };
var BTN_DEL = { background: 'var(--danger-strong-a10)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a30)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12 };
var TAG = { background: 'var(--warn-a20)', color: 'var(--warn-text)', borderRadius: 3, padding: '1px 6px', fontSize: 11, fontWeight: 600, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 };

export function PhrasesTab(props) {
  var t = props.t;
  var pS = useState([]), phrases = pS[0], setPhrases = pS[1];
  var cS = useState([]), cats = cS[0], setCats = cS[1];
  var fS = useState(''), filter = fS[0], setFilter = fS[1];            // category id as text, '' = all
  var mS = useState(false), manage = mS[0], setManage = mS[1];         // the category panel
  var eS = useState(null), edit = eS[0], setEdit = eS[1];              // the phrase being added or edited
  var nS = useState(''), newName = nS[0], setNewName = nS[1];
  var rS = useState({}), names = rS[0], setNames = rS[1];              // category id -> name being typed
  var dS = useState(null), del = dS[0], setDel = dS[1];                // { id, count, to } - a category about to go
  var lS = useState(''), loadErr = lS[0], setLoadErr = lS[1];

  function fail(e) { alert(t.se_error + ': ' + seMessage(t, (e && e.message) || '')); }
  async function load() {
    try {
      var r = await Promise.all([api.get('/admin/phrases'), api.get('/admin/phrase-categories')]);
      setPhrases(r[0] || []); setCats(r[1] || []); setLoadErr('');
      // A filter on a category that no longer exists would show an empty list for no visible reason.
      setFilter(function (f) { return f && !(r[1] || []).some(function (c) { return String(c.id) === f; }) ? '' : f; });
    } catch (e) { setLoadErr((e && e.message) || 'Request failed'); }
  }
  useEffect(function () { load(); }, []);

  var shown = filter ? phrases.filter(function (p) { return String(p.category_id) === filter; }) : phrases;

  // ── phrases ──
  function openNew() {
    if (!cats.length) { setManage(true); return; }
    setEdit({ category_id: filter ? Number(filter) : cats[0].id, text: '' });
  }
  async function savePhrase() {
    var body = { category_id: edit.category_id, text: edit.text };
    try {
      if (edit.id) await api.put('/admin/phrases/' + edit.id, body); else await api.post('/admin/phrases', body);
      setEdit(null); await load(); if (props.onSaved) props.onSaved();
    } catch (e) { fail(e); }
  }
  async function removePhrase(p) {
    if (!confirm(t.se_confirmDelete)) return;
    try { await api.del('/admin/phrases/' + p.id); await load(); } catch (e) { fail(e); }
  }

  // ── categories ──
  async function addCat() {
    try { await api.post('/admin/phrase-categories', { name: newName }); setNewName(''); await load(); } catch (e) { fail(e); }
  }
  async function renameCat(c) {
    try {
      await api.put('/admin/phrase-categories/' + c.id, { name: names[c.id] });
      setNames(function (n) { var o = Object.assign({}, n); delete o[c.id]; return o; });
      await load();
    } catch (e) { fail(e); }
  }
  async function moveCat(i, by) {
    var ids = cats.map(function (c) { return c.id; });
    var j = i + by; if (j < 0 || j >= ids.length) return;
    var x = ids[i]; ids[i] = ids[j]; ids[j] = x;
    try { setCats(await api.put('/admin/phrase-categories/order', { ids: ids })); await load(); } catch (e) { fail(e); }
  }
  // An empty category goes after a plain question. One with phrases opens the "move
  // them where?" line instead - nothing is removed until a destination is chosen.
  function askRemoveCat(c) {
    if (c.phrase_count > 0) {
      var other = cats.filter(function (x) { return x.id !== c.id; })[0];
      setDel({ id: c.id, count: c.phrase_count, to: other ? other.id : '' });
      return;
    }
    if (!confirm(String(t.se_phCatConfirmDelete || '').replace('{name}', c.name))) return;
    removeCat(c.id, null);
  }
  async function removeCat(id, moveTo) {
    try {
      await api.del('/admin/phrase-categories/' + id + (moveTo ? '?move_to=' + encodeURIComponent(moveTo) : ''));
      setDel(null); await load();
    } catch (e) { fail(e); }
  }

  var bd = 'var(--border)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', tx = 'var(--text)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid ' + bd, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--panel-head)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: tx }}>📝 {t.se_phraseName}</span>
        {/* A list to pick from, not a row of buttons: it still works with twenty categories. */}
        <select value={filter} onChange={function (e) { setFilter(e.target.value); }} style={Object.assign({}, IS, { width: 'auto', padding: '4px 8px', fontSize: 13 })} aria-label={t.se_fCategory}>
          <option value="">{t.se_phCatAll} ({phrases.length})</option>
          {cats.map(function (c) { return <option key={c.id} value={String(c.id)}>{c.name} ({c.phrase_count})</option>; })}
        </select>
        <div style={{ flex: 1 }}></div>
        <button onClick={function () { setManage(!manage); setDel(null); }} style={Object.assign({}, BTN, { fontSize: 13, padding: '4px 10px', fontWeight: 600, background: manage ? 'var(--warn-a20)' : BTN.background })}>🗂 {t.se_phCats}</button>
        <button onClick={openNew} style={BTN_GO}>{t.se_addBtn}</button>
      </div>

      {manage ? (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + bd, background: 'var(--panel)' }}>
          <div style={{ fontSize: 12, color: t3, marginBottom: 8, lineHeight: 1.5 }}>{t.se_phCatHint}</div>
          {cats.length === 0 ? <div style={{ fontSize: 13, color: 'var(--warn-text)', marginBottom: 8 }}>{t.se_phCatNone}</div> : null}
          {cats.map(function (c, i) {
            var typed = names[c.id], changed = typed !== undefined && typed.trim() !== c.name;
            return <div key={c.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={function () { moveCat(i, -1); }} disabled={i === 0} title={t.se_phCatUp} aria-label={t.se_phCatUp} style={Object.assign({}, BTN, { opacity: 1, color: i === 0 ? t3 : t2, cursor: i === 0 ? 'default' : 'pointer' })}>▲</button>
                <button onClick={function () { moveCat(i, 1); }} disabled={i === cats.length - 1} title={t.se_phCatDown} aria-label={t.se_phCatDown} style={Object.assign({}, BTN, { color: i === cats.length - 1 ? t3 : t2, cursor: i === cats.length - 1 ? 'default' : 'pointer' })}>▼</button>
                <input value={typed === undefined ? c.name : typed} maxLength={60} aria-label={t.se_phCatName}
                  onChange={function (e) { var v = e.target.value; setNames(function (n) { var o = Object.assign({}, n); o[c.id] = v; return o; }); }}
                  onKeyDown={function (e) { if (e.key === 'Enter' && changed) renameCat(c); }}
                  style={Object.assign({}, IS, { width: 240, padding: '4px 8px' })} />
                {changed ? <button onClick={function () { renameCat(c); }} style={BTN_GO}>{t.se_phCatRename}</button> : null}
                <span style={{ fontSize: 12, color: t3, whiteSpace: 'nowrap' }}>{String(t.se_phCatCount || '').replace('{n}', c.phrase_count)}</span>
                <div style={{ flex: 1 }}></div>
                <button onClick={function () { askRemoveCat(c); }} style={BTN_DEL}>{t.delete}</button>
              </div>
              {del && del.id === c.id ? (
                <div style={{ margin: '6px 0 4px 62px', padding: '8px 10px', border: '1px solid var(--warn-a40)', background: 'var(--warn-a20)', borderRadius: 5, fontSize: 13, color: tx, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>⚠ {String(t.se_phCatInUse || '').replace('{n}', del.count)}</span>
                  {cats.length > 1 ? (<>
                    <span>{t.se_phCatMoveTo}</span>
                    <select value={String(del.to)} onChange={function (e) { var v = e.target.value; setDel(function (d) { return Object.assign({}, d, { to: v }); }); }} style={Object.assign({}, IS, { width: 'auto', padding: '3px 8px', fontSize: 13 })}>
                      {cats.filter(function (x) { return x.id !== c.id; }).map(function (x) { return <option key={x.id} value={String(x.id)}>{x.name}</option>; })}
                    </select>
                    <button onClick={function () { removeCat(c.id, del.to); }} style={BTN_DEL}>{t.se_phCatMoveDelete}</button>
                  </>) : <span>{t.se_phCatNoOther}</span>}
                  <button onClick={function () { setDel(null); }} style={BTN}>{t.cancel}</button>
                </div>
              ) : null}
            </div>;
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <input value={newName} maxLength={60} placeholder={t.se_phCatNewPh} onChange={function (e) { setNewName(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Enter' && newName.trim()) addCat(); }} style={Object.assign({}, IS, { width: 240, padding: '4px 8px', marginLeft: 62 })} />
            <button onClick={addCat} disabled={!newName.trim()} style={Object.assign({}, BTN_GO, newName.trim() ? {} : { color: t3, cursor: 'default' })}>{t.se_phCatAdd}</button>
          </div>
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loadErr ? <div style={{ padding: 14, color: 'var(--danger-text-2)' }}>⚠ {seMessage(t, loadErr)}</div> : null}
        {!loadErr && shown.length === 0 ? <div style={{ padding: 20, color: t3, fontStyle: 'italic' }}>{t.se_phEmpty}</div> : null}
        {shown.map(function (p) {
          return <div key={p.id} style={{ padding: '7px 14px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 8 }}>
            <span style={TAG}>{p.category}</span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>{p.text}</span>
            <button onClick={function () { setEdit({ id: p.id, category_id: p.category_id, text: p.text || '' }); }} style={Object.assign({}, BTN, { alignSelf: 'flex-start', fontSize: 11, padding: '2px 6px' })}>{t.edit}</button>
            <button onClick={function () { removePhrase(p); }} style={Object.assign({}, BTN_DEL, { alignSelf: 'flex-start', fontSize: 11, padding: '2px 6px' })}>{t.delete}</button>
          </div>;
        })}
      </div>

      {edit ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--scrim)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel-head)', borderRadius: 10, border: '1px solid ' + bd, width: 440, maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px var(--shadow-50)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: tx, padding: '18px 18px 14px' }}>{edit.id ? t.se_editTitle_phrase : t.se_newTitle_phrase}</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t3, display: 'block', marginBottom: 3 }}>{t.se_fCategory}</label>
                <select value={String(edit.category_id == null ? '' : edit.category_id)} onChange={function (e) { var v = e.target.value; setEdit(function (x) { return Object.assign({}, x, { category_id: v ? Number(v) : null }); }); }} style={IS}>
                  {/* A phrase left in a removed category: nothing chosen until the person picks one. */}
                  {cats.some(function (c) { return c.id === edit.category_id; }) ? null : <option value="">—</option>}
                  {cats.map(function (c) { return <option key={c.id} value={String(c.id)}>{c.name}</option>; })}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t3, display: 'block', marginBottom: 3 }}>{t.se_fPhraseText}</label>
                <textarea value={edit.text} rows={4} autoFocus onChange={function (e) { var v = e.target.value; setEdit(function (x) { return Object.assign({}, x, { text: v }); }); }} style={Object.assign({}, IS, { resize: 'vertical' })} />
                <div style={{ fontSize: 12, color: t3, marginTop: 4, lineHeight: 1.5 }}>{t.se_phraseOneHint}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '14px 18px 18px', borderTop: '1px solid ' + bd, marginTop: 14 }}>
              <button onClick={function () { setEdit(null); }} style={{ flex: 1, background: 'var(--chip)', color: t2, border: '1px solid var(--border-2)', borderRadius: 5, padding: '7px', cursor: 'pointer', fontSize: 14 }}>{t.cancel}</button>
              <button onClick={savePhrase} style={{ flex: 2, background: 'linear-gradient(135deg,var(--accent),var(--accent-strong))', color: 'var(--on-fill)', border: 'none', borderRadius: 5, padding: '7px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{t.save}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
