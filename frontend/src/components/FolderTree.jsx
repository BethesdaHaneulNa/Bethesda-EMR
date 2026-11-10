// A list filed in folders, a folder inside a folder (065, 1.8.0). The clinic's manager,
// 2026-11-10: the lab tests and the order sets must be seen all at once, as a list, in
// folders the clinic makes itself. Used by Settings > Lab items, Settings > Order sets
// (with the folder tools) and by the consultation screen's order-set tab (readOnly: it only
// shows and picks).
//
//   <FolderTree kind="lab" folders={[{id,parent_id,name}]} items={[{id,folder_id,...}]}
//               itemText={fn(item)}      what the search reads (and the default label)
//               renderItem={fn(item)}    the line of an item (optional)
//               selectedId onSelect={fn(item)}
//               onAddItem={fn(folderId)} addItemLabel="+ ..."   (optional)
//               onChanged={fn()}         after a folder was made / renamed / moved / removed,
//                                        or an item filed elsewhere: the parent reads the tree again
//               errText={fn(message)}    the server's English text -> the screen's language
//               readOnly />
// Folder changes go to /api/folders (folder.routes.js); the component keeps nothing but
// what is open, what is selected and the small form in use.
import { useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/index.jsx';
import { fold } from '../fold.js';

var BTN = { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', fontFamily: 'inherit' };
var BTN_GO = Object.assign({}, BTN, { background: 'var(--ok-a20)', color: 'var(--ok-text)', border: '1px solid var(--ok-a40)', fontWeight: 700 });
var BTN_DANGER = Object.assign({}, BTN, { background: 'var(--danger-strong-a10)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a30)' });
var INPUT = { boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '5px 8px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', minWidth: 0 };

export function folderPath(folders, id) {
  var by = {}; (folders || []).forEach(function (f) { by[f.id] = f; });
  var parts = [], cur = id, n = 0;
  while (cur != null && by[cur] && n++ < 20) { parts.unshift(by[cur].name); cur = by[cur].parent_id; }
  return parts.join(' / ');
}
// every folder as "A / B / C", in the tree's own order - for a "which folder" box
export function folderChoices(folders) {
  var out = [];
  (function walk(parent, depth) {
    (folders || []).filter(function (f) { return (f.parent_id == null ? null : f.parent_id) === parent; }).forEach(function (f) {
      out.push({ id: f.id, path: folderPath(folders, f.id), depth: depth });
      walk(f.id, depth + 1);
    });
  })(null, 0);
  return out;
}

export function FolderTree(p) {
  var t = useLang().t;
  var folders = p.folders || [], items = p.items || [];
  var os = useState({}), open = os[0], setOpen = os[1];              // folder id -> false when closed (open by default)
  var fs = useState(null), focus = fs[0], setFocus = fs[1];          // the folder whose tools are shown
  var es = useState(null), form = es[0], setForm = es[1];            // { mode:'new'|'rename'|'moveFolder'|'moveItem', id, parent, text }
  var qs = useState(''), q = qs[0], setQ = qs[1];
  var bs = useState(false), busy = bs[0], setBusy = bs[1];
  var word = fold(q.trim());
  var itemText = p.itemText || function (it) { return it.name || ''; };

  var known = {}; folders.forEach(function (f) { known[f.id] = true; });
  function kidsOf(parent) { return folders.filter(function (f) { return (f.parent_id == null ? null : f.parent_id) === parent; }); }
  // an item whose folder is gone is shown at the top level
  function itemsOf(parent) { return items.filter(function (it) { var fid = it.folder_id != null && known[it.folder_id] ? it.folder_id : null; return fid === parent; }); }
  function hit(it) { return !word || fold(itemText(it)).indexOf(word) >= 0; }
  function nameHit(f) { return !!word && fold(f.name).indexOf(word) >= 0; }
  // how many items a folder holds, its sub-folders included; with a search, how many match
  function countIn(f, all) {
    var n = itemsOf(f.id).filter(function (it) { return all || hit(it); }).length;
    kidsOf(f.id).forEach(function (k) { n += countIn(k, all); });
    return n;
  }
  function shows(f, underNameHit) { return !word || underNameHit || nameHit(f) || countIn(f, false) > 0 || kidsOf(f.id).some(function (k) { return shows(k, false); }); }
  function isDescendant(id, of) { var by = {}; folders.forEach(function (f) { by[f.id] = f; }); var cur = id, n = 0; while (cur != null && by[cur] && n++ < 20) { if (cur === of) return true; cur = by[cur].parent_id; } return false; }

  function say(err) { var m = String(err && err.message || ''); alert(p.errText ? p.errText(m) : m); }
  async function run(fn) {
    if (busy) return; setBusy(true);
    try { await fn(); setForm(null); if (p.onChanged) await p.onChanged(); } catch (err) { say(err); }
    setBusy(false);
  }
  function saveForm() {
    if (!form) return;
    var name = String(form.text || '').replace(/\s+/g, ' ').trim();
    if (form.mode === 'new') {
      if (!name) return;
      return run(async function () { var made = await api.post('/folders', { kind: p.kind, parent_id: form.parent, name: name }); if (form.parent != null) setOpen(function (o) { var n = Object.assign({}, o); delete n[form.parent]; return n; }); if (made && made.id) setFocus(made.id); });
    }
    if (form.mode === 'rename') { if (!name) return; return run(function () { return api.put('/folders/' + form.id, { name: name }); }); }
  }
  function moveFolder(id, to) { return run(function () { return api.put('/folders/' + id, { parent_id: to }); }); }
  function moveItem(id, to) { return run(function () { return api.put('/folders/place', { kind: p.kind, id: id, folder_id: to }); }); }
  function removeFolder(f) {
    if (!window.confirm(String(t.fo_confirmDelete || '').replace('{name}', f.name))) return;
    run(async function () { await api.del('/folders/' + f.id); if (focus === f.id) setFocus(null); });
  }
  function shift(f, by) {
    var sibs = kidsOf(f.parent_id == null ? null : f.parent_id).map(function (x) { return x.id; });
    var i = sibs.indexOf(f.id), j = i + by;
    if (i < 0 || j < 0 || j >= sibs.length) return;
    sibs.splice(i, 1); sibs.splice(j, 0, f.id);
    run(function () { return api.put('/folders/order', { kind: p.kind, parent_id: f.parent_id == null ? null : f.parent_id, ids: sibs }); });
  }

  function nameForm(indent) {
    return <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 8px 6px ' + indent + 'px' }}>
      <span style={{ fontSize: 13 }}>📁</span>
      <input autoFocus value={form.text} maxLength={80} placeholder={t.fo_namePh} aria-label={t.fo_namePh}
        onChange={function (e) { setForm(Object.assign({}, form, { text: e.target.value })); }}
        onKeyDown={function (e) { if (e.key === 'Enter') saveForm(); if (e.key === 'Escape') setForm(null); }}
        style={Object.assign({}, INPUT, { flex: 1 })} />
      <button type="button" onClick={saveForm} disabled={busy} style={BTN_GO}>{t.fo_ok}</button>
      <button type="button" onClick={function () { setForm(null); }} style={BTN}>{t.fo_cancel}</button>
    </div>;
  }
  function moveBox(indent, current, skipId, onPick) {
    var choices = folderChoices(folders).filter(function (c) { return skipId == null || !isDescendant(c.id, skipId); });
    return <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 8px 6px ' + indent + 'px' }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{t.fo_moveTo}</span>
      <select autoFocus defaultValue={current == null ? '' : String(current)} aria-label={t.fo_moveTo}
        onChange={function (e) { var v = e.target.value; onPick(v === '' ? null : Number(v)); }} style={Object.assign({}, INPUT, { flex: 1 })}>
        <option value="">{t.fo_top}</option>
        {choices.map(function (c) { return <option key={c.id} value={c.id}>{c.path}</option>; })}
      </select>
      <button type="button" onClick={function () { setForm(null); }} style={BTN}>{t.fo_cancel}</button>
    </div>;
  }

  function itemRow(it, depth) {
    var sel = p.selectedId != null && String(p.selectedId) === String(it.id);
    var indent = 10 + depth * 16;
    var moving = form && form.mode === 'moveItem' && form.id === it.id;
    return <div key={'i' + it.id}>
      <div className="pressable" onClick={function () { if (p.onSelect) p.onSelect(it); }} data-tree-item={it.id}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px 6px ' + (indent + 14) + 'px', cursor: 'pointer', borderLeft: '3px solid ' + (sel ? 'var(--accent-ink)' : 'transparent'), background: sel ? 'var(--accent-a15)' : 'transparent' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{p.renderItem ? p.renderItem(it, sel) : <span style={{ fontSize: 14, color: 'var(--text)' }}>{itemText(it)}</span>}</div>
        {!p.readOnly && sel ? <button type="button" title={t.fo_moveHint} onClick={function (e) { e.stopPropagation(); setForm(moving ? null : { mode: 'moveItem', id: it.id }); }} style={BTN}>{t.fo_move}</button> : null}
      </div>
      {moving ? moveBox(indent + 14, it.folder_id != null && known[it.folder_id] ? it.folder_id : null, null, function (to) { moveItem(it.id, to); }) : null}
    </div>;
  }
  function folderRow(f, depth, underNameHit) {
    if (!shows(f, underNameHit)) return null;
    var under = underNameHit || nameHit(f);
    var isOpen = word ? true : open[f.id] !== false;
    var on = focus === f.id && !p.readOnly;
    var indent = 10 + depth * 16;
    var kids = kidsOf(f.id), mine = itemsOf(f.id).filter(function (it) { return under || hit(it); });
    var n = countIn(f, true);
    var sibs = kidsOf(f.parent_id == null ? null : f.parent_id), at = sibs.map(function (x) { return x.id; }).indexOf(f.id);
    return <div key={'f' + f.id}>
      <div className="pressable" data-tree-folder={f.id}
        onClick={function () { if (p.readOnly || focus === f.id || word) setOpen(function (o) { var x = Object.assign({}, o); x[f.id] = !isOpen; return x; }); setFocus(f.id); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px 6px ' + indent + 'px', cursor: 'pointer', background: on ? 'var(--panel-head)' : 'transparent', borderTop: depth === 0 ? '1px solid var(--line-soft)' : 'none' }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', width: 10, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, flexShrink: 0 }}>📁</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{f.name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{n}</span>
      </div>
      {on && !(form && form.id === f.id) ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 8px 6px ' + (indent + 26) + 'px', background: 'var(--panel-head)' }}>
        {p.onAddItem ? <button type="button" onClick={function () { p.onAddItem(f.id); }} style={BTN_GO}>{p.addItemLabel}</button> : null}
        <button type="button" onClick={function () { setForm({ mode: 'new', parent: f.id, text: '' }); }} style={BTN}>{t.fo_newSub}</button>
        <button type="button" onClick={function () { setForm({ mode: 'rename', id: f.id, text: f.name }); }} style={BTN}>{t.fo_rename}</button>
        <button type="button" onClick={function () { setForm({ mode: 'moveFolder', id: f.id }); }} style={BTN}>{t.fo_move}</button>
        <button type="button" disabled={at <= 0} onClick={function () { shift(f, -1); }} title={t.fo_up} aria-label={t.fo_up} style={Object.assign({}, BTN, { opacity: at <= 0 ? 0.4 : 1 })}>▲</button>
        <button type="button" disabled={at >= sibs.length - 1} onClick={function () { shift(f, 1); }} title={t.fo_down} aria-label={t.fo_down} style={Object.assign({}, BTN, { opacity: at >= sibs.length - 1 ? 0.4 : 1 })}>▼</button>
        <button type="button" onClick={function () { removeFolder(f); }} style={BTN_DANGER}>{t.fo_delete}</button>
      </div> : null}
      {form && form.mode === 'rename' && form.id === f.id ? nameForm(indent + 26) : null}
      {form && form.mode === 'moveFolder' && form.id === f.id ? moveBox(indent + 26, f.parent_id == null ? null : f.parent_id, f.id, function (to) { moveFolder(f.id, to); }) : null}
      {isOpen ? <div>
        {form && form.mode === 'new' && form.parent === f.id ? nameForm(indent + 16) : null}
        {kids.map(function (k) { return folderRow(k, depth + 1, under); })}
        {mine.map(function (it) { return itemRow(it, depth + 1); })}
        {!word && !kids.length && !mine.length && !(form && form.mode === 'new' && form.parent === f.id) ? <div style={{ padding: '3px 8px 6px ' + (indent + 30) + 'px', fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic' }}>{t.fo_empty}</div> : null}
      </div> : null}
    </div>;
  }

  var tops = kidsOf(null), loose = itemsOf(null).filter(hit);
  var anything = tops.some(function (f) { return shows(f, false); }) || loose.length > 0;
  return <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
    <div style={{ flexShrink: 0, display: 'flex', gap: 5, alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={p.searchPlaceholder || t.fo_search} aria-label={p.searchPlaceholder || t.fo_search} autoComplete="off" style={Object.assign({}, INPUT, { flex: '1 1 120px' })} />
      {!p.readOnly ? <button type="button" onClick={function () { setForm({ mode: 'new', parent: null, text: '' }); }} style={BTN}>{t.fo_newFolder}</button> : null}
      {!p.readOnly && p.onAddItem ? <button type="button" onClick={function () { p.onAddItem(focus != null && known[focus] ? focus : null); }} style={BTN_GO}>{p.addItemLabel}</button> : null}
    </div>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {form && form.mode === 'new' && form.parent == null ? nameForm(10) : null}
      {tops.map(function (f) { return folderRow(f, 0, false); })}
      {loose.length && tops.length ? <div style={{ borderTop: '1px solid var(--line-soft)' }}></div> : null}
      {loose.map(function (it) { return itemRow(it, 0); })}
      {!anything ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 14, fontStyle: 'italic' }}>{word ? t.fo_noMatch : (p.emptyText || t.fo_nothing)}</div> : null}
    </div>
  </div>;
}
