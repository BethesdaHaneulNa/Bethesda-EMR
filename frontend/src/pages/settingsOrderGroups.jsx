// Settings > Codes d'actes > 🗂 Groupes: the groups an order code is filed under, kept by the
// clinic (order_group, migration 063; the clinic's manager, 2026-11-09, like the drug
// categories). One name per group (the stored value); renaming renames it on the codes.
// ▲▼ for the order, Masquer / Afficher, Supprimer only when no code carries it; 'Other'
// stays. API: /api/admin/order-groups (admin.routes.js).
import { useState } from 'react';
import { api } from '../api/client.js';
import { seMessage } from './settingsMessages.js';

var IS = { boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' };
var BTN = { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' };
var BTN_GO = { background: 'var(--warn-a20)', color: 'var(--warn-text)', border: '1px solid var(--warn-a40)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' };
var BTN_DEL = { background: 'var(--danger-strong-a10)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a30)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' };
var TAG = { background: 'var(--chip)', color: 'var(--text-3)', borderRadius: 3, padding: '1px 6px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };

// props: t, groups, reload(), onChanged() (the order-code table re-reads: a rename shows at once)
export function OrderGroupsPanel(props) {
  var t = props.t, groups = props.groups || [];
  var eS = useState({}), edits = eS[0], setEdits = eS[1];     // name -> the new name being typed
  var nS = useState(''), fresh = nS[0], setFresh = nS[1];
  var bS = useState(false), busy = bS[0], setBusy = bS[1];

  function fail(e) { alert(t.se_error + ': ' + seMessage(t, (e && e.message) || '')); }
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try { await fn(); await props.reload(); if (props.onChanged) props.onChanged(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  }
  function rename(g) {
    var v = (edits[g.name] || '').trim();
    run(async function () {
      await api.put('/admin/order-groups/' + encodeURIComponent(g.name), { name: v });
      setEdits(function (p) { var o = Object.assign({}, p); delete o[g.name]; return o; });
    });
  }
  function toggle(g) { run(async function () { await api.put('/admin/order-groups/' + encodeURIComponent(g.name), { is_hidden: !g.is_hidden }); }); }
  function move(i, by) {
    var names = groups.map(function (g) { return g.name; });
    var j = i + by; if (j < 0 || j >= names.length) return;
    var x = names[i]; names[i] = names[j]; names[j] = x;
    run(async function () { await api.put('/admin/order-groups/order', { names: names }); });
  }
  function remove(g) {
    if (g.code_count > 0 || g.fixed) return;
    if (!confirm(String(t.se_ogConfirmDelete || '').replace('{name}', g.name))) return;
    run(async function () { await api.del('/admin/order-groups/' + encodeURIComponent(g.name)); });
  }
  function add() {
    if (!fresh.trim()) return;
    run(async function () { await api.post('/admin/order-groups', { name: fresh }); setFresh(''); });
  }

  var bd = 'var(--border)', t2 = 'var(--text-2)', t3 = 'var(--text-3)';
  var COLS = { display: 'grid', gridTemplateColumns: '26px 26px 1fr auto auto auto', gap: 6, alignItems: 'center' };
  // Scrolls on its own above the code table, as the drug-category panel does.
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + bd, background: 'var(--panel)', maxHeight: '55vh', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontSize: 12, color: t3, marginBottom: 8, lineHeight: 1.5 }}>{t.se_ogHint}</div>
      {groups.map(function (g, i) {
        var typed = edits[g.name], dirty = typed !== undefined && typed.trim() !== '' && typed.trim() !== g.name;
        var first = i === 0, last = i === groups.length - 1;
        return <div key={g.name} style={Object.assign({}, COLS, { marginBottom: 5, opacity: g.is_hidden ? 0.6 : 1 })}>
          <button onClick={function () { move(i, -1); }} disabled={first || busy} title={t.se_phCatUp} aria-label={t.se_phCatUp} style={Object.assign({}, BTN, { padding: '3px 0', color: first ? t3 : t2, cursor: first ? 'default' : 'pointer' })}>▲</button>
          <button onClick={function () { move(i, 1); }} disabled={last || busy} title={t.se_phCatDown} aria-label={t.se_phCatDown} style={Object.assign({}, BTN, { padding: '3px 0', color: last ? t3 : t2, cursor: last ? 'default' : 'pointer' })}>▼</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <input value={typed === undefined ? g.name : typed} maxLength={50} aria-label={t.se_ogName}
              onChange={function (e) { var v = e.target.value; setEdits(function (p) { var o = Object.assign({}, p); o[g.name] = v; return o; }); }}
              onKeyDown={function (e) { if (e.key === 'Enter' && dirty) rename(g); }}
              style={Object.assign({}, IS, { width: 240 })} />
            {dirty ? <button onClick={function () { rename(g); }} disabled={busy} style={BTN_GO}>{t.save}</button> : null}
            {g.is_hidden ? <span style={TAG}>{t.se_dcHidden}</span> : null}
            {g.fixed ? <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }} title={t.se_dcFixed}>{t.se_dcFixedShort}</span> : null}
          </div>
          <span style={{ fontSize: 12, color: t3, whiteSpace: 'nowrap', minWidth: 70, textAlign: 'right' }}>{String(t.se_ogCount || '').replace('{n}', g.code_count)}</span>
          {g.fixed ? <span></span> : <button onClick={function () { toggle(g); }} disabled={busy} style={BTN}>{g.is_hidden ? t.se_dcShow : t.se_dcHide}</button>}
          {g.fixed ? <span></span>
            : (g.code_count > 0
              ? <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }} title={t.se_ogInUseHint}>—</span>
              : <button onClick={function () { remove(g); }} disabled={busy} style={BTN_DEL}>{t.delete}</button>)}
        </div>;
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <input value={fresh} maxLength={50} placeholder={t.se_ogNewPh} onChange={function (e) { setFresh(e.target.value); }}
          onKeyDown={function (e) { if (e.key === 'Enter') add(); }} style={Object.assign({}, IS, { width: 240, marginLeft: 64 })} />
        <button onClick={add} disabled={busy || !fresh.trim()} style={Object.assign({}, BTN_GO, fresh.trim() ? {} : { color: t3, cursor: 'default' })}>{t.se_ogAdd}</button>
      </div>
      <div style={{ fontSize: 11, color: t3, marginTop: 6 }}>{t.se_ogInUseHint}</div>
    </div>
  );
}
