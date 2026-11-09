// Settings > diagnosis list: the frequent diagnoses the doctor searches in the diagnosis
// box of the consultation screen (diagnosis_code, migration 050 - the consultation
// session's table; this is where the clinic keeps it).
//
// Every row is listed, switched-off ones too. A row is added, edited, switched off or on,
// and put in order; it is never deleted - a row switched off leaves the doctor's search,
// and a diagnosis already in a patient's record keeps its own code and name. The code is
// free text and may repeat: a second wording under the same code is allowed, so a repeat
// is said in the window and nothing is refused.
// Same frame as the phrases tab: a filter to pick from, a search box, "+ Add", one edit
// window. API: /api/admin/diagnosis-codes (admin.routes.js).
import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import { seMessage } from './settingsMessages.js';

var IS = { width: '100%', boxSizing: 'border-box', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '7px 10px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };
var BTN = { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 11 };
var BTN_GO = { background: 'var(--warn-a20)', color: 'var(--warn-text)', border: '1px solid var(--warn-a40)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' };
var BTN_OFF = { background: 'var(--danger-strong-a10)', color: 'var(--danger-text)', border: '1px solid var(--danger-strong-a30)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 11 };
var LBL = { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 3 };
var NOTE = { fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 };

// Lower case, accents dropped: "fievre" finds « Fièvre » (as the consultation screen searches).
function plain(x) { var s = String(x == null ? '' : x).toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* old browser */ } return s.replace(/\s+/g, ' ').trim(); }
function fill(s, o) { var r = String(s || ''); Object.keys(o).forEach(function (k) { r = r.split('{' + k + '}').join(o[k]); }); return r; }

export function DiagnosesTab(props) {
  var t = props.t;
  var rS = useState([]), rows = rS[0], setRows = rS[1];
  var fS = useState('all'), filter = fS[0], setFilter = fS[1];     // all | on | off
  var qS = useState(''), q = qS[0], setQ = qS[1];
  var eS = useState(null), edit = eS[0], setEdit = eS[1];          // the row being added or edited
  var lS = useState(''), loadErr = lS[0], setLoadErr = lS[1];
  var bS = useState(false), busy = bS[0], setBusy = bS[1];

  function fail(e) { alert(t.se_error + ': ' + seMessage(t, (e && e.message) || '')); }
  async function load() {
    try { setRows((await api.get('/admin/diagnosis-codes')) || []); setLoadErr(''); }
    catch (e) { setLoadErr((e && e.message) || 'Request failed'); }
  }
  useEffect(function () { load(); }, []);

  var nOn = rows.filter(function (r) { return r.is_active; }).length;
  var whole = filter === 'all' && !plain(q);                       // the list as it is ordered: only then can a row be moved
  var shown = useMemo(function () {
    var k = plain(q);
    return rows.filter(function (r) {
      if (filter === 'on' && !r.is_active) return false;
      if (filter === 'off' && r.is_active) return false;
      return !k || [r.code, r.name_en, r.name_fr, r.name_ko].some(function (x) { return plain(x).indexOf(k) >= 0; });
    });
  }, [rows, filter, q]);

  // ── order: the whole list, sent at once ──
  async function saveOrder(ids) {
    setBusy(true);
    try { setRows(await api.put('/admin/diagnosis-codes/order', { ids: ids })); }
    catch (e) { fail(e); await load(); }
    setBusy(false);
  }
  function move(i, by) {
    var ids = rows.map(function (r) { return r.id; }), j = i + by;
    if (busy || j < 0 || j >= ids.length) return;
    var x = ids[i]; ids[i] = ids[j]; ids[j] = x;
    saveOrder(ids);
  }

  // ── on / off ──
  async function toggle(r) {
    try { await api.put('/admin/diagnosis-codes/' + r.id, { is_active: !r.is_active }); await load(); if (props.onSaved) props.onSaved(); }
    catch (e) { fail(e); }
  }

  // ── add / edit ──
  function openNew() { setEdit({ code: '', name_en: '', name_fr: '', name_ko: '', is_active: true, position: String(rows.length + 1) }); }
  function openEdit(r) {
    var i = rows.findIndex(function (x) { return x.id === r.id; });
    setEdit({ id: r.id, code: r.code || '', name_en: r.name_en || '', name_fr: r.name_fr || '', name_ko: r.name_ko || '', is_active: !!r.is_active, position: String(i + 1) });
  }
  function ue(k, v) { setEdit(function (x) { var o = Object.assign({}, x); o[k] = v; return o; }); }
  async function save() {
    if (!plain(edit.name_en)) { alert(t.se_errDxName); return; }
    var body = { code: edit.code, name_en: edit.name_en, name_fr: edit.name_fr, name_ko: edit.name_ko, is_active: !!edit.is_active };
    try {
      var saved = edit.id ? await api.put('/admin/diagnosis-codes/' + edit.id, body) : await api.post('/admin/diagnosis-codes', body);
      // The place in the list: a new row is made last, an edited one stays where it was -
      // moved only if the number in the window says another place.
      var ids = rows.map(function (r) { return r.id; }).filter(function (id) { return id !== saved.id; });
      var was = edit.id ? rows.findIndex(function (r) { return r.id === saved.id; }) : ids.length;
      var want = Math.min(Math.max((parseInt(edit.position, 10) || was + 1) - 1, 0), ids.length);
      if (want !== was) { ids.splice(want, 0, saved.id); await api.put('/admin/diagnosis-codes/order', { ids: ids }); }
      setEdit(null); await load(); if (props.onSaved) props.onSaved();
    } catch (e) { fail(e); await load(); }
  }
  // The same code, or the same name in any language, already in the list: said, not refused.
  function others(test) {
    return rows.filter(function (r) { return (!edit || r.id !== edit.id) && test(r); }).slice(0, 3)
      .map(function (r) { return [r.code, r.name_en].filter(Boolean).join(' — ') + (r.is_active ? '' : ' (' + t.se_off + ')'); }).join(' ; ');
  }
  var sameCode = edit && plain(edit.code) ? others(function (r) { return plain(r.code) === plain(edit.code); }) : '';
  var sameName = edit ? others(function (r) {
    var mine = [edit.name_en, edit.name_fr, edit.name_ko].map(plain).filter(Boolean);
    return [r.name_en, r.name_fr, r.name_ko].map(plain).filter(Boolean).some(function (n) { return mine.indexOf(n) >= 0; });
  }) : '';

  var bd = 'var(--border)', bd2 = 'var(--border-2)', t2 = 'var(--text-2)', t3 = 'var(--text-3)', tx = 'var(--text)';
  var th = { padding: '5px 6px', textAlign: 'left', color: t3, fontSize: 11, borderBottom: '1px solid ' + bd };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid ' + bd, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--panel-head)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: tx }}>🩺 {t.se_tabDiagnoses}</span>
        <select value={filter} onChange={function (e) { setFilter(e.target.value); }} style={Object.assign({}, IS, { width: 'auto', padding: '4px 8px', fontSize: 13 })} aria-label={t.se_colStatus}>
          <option value="all">{fill(t.se_dxFilterAll, { n: rows.length })}</option>
          <option value="on">{fill(t.se_dxFilterOn, { n: nOn })}</option>
          <option value="off">{fill(t.se_dxFilterOff, { n: rows.length - nOn })}</option>
        </select>
        <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder={t.search} aria-label={t.search}
          style={Object.assign({}, IS, { width: 180, padding: '4px 8px', fontSize: 13, marginLeft: 'auto' })} />
        <button onClick={openNew} style={BTN_GO}>{t.se_addBtn}</button>
      </div>
      <div style={{ padding: '6px 14px', fontSize: 12, color: t3, borderBottom: '1px solid ' + bd, lineHeight: 1.5 }}>{t.se_dxHint}</div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loadErr ? <div style={{ padding: 14, color: 'var(--danger-text-2)' }}>⚠ {seMessage(t, loadErr)}</div> : null}
        {!loadErr && shown.length === 0 ? <div style={{ padding: 20, color: t3, fontStyle: 'italic' }}>{t.se_dxEmpty}</div> : null}
        {shown.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: 'var(--chip)' }}>
              <th style={Object.assign({}, th, { width: 54 })} title={whole ? '' : t.se_dxOrderWhole}></th>
              <th style={Object.assign({}, th, { width: 80 })}>{t.se_colCode}</th>
              <th style={th}>{t.se_dxNameEn}</th>
              <th style={th}>{t.se_dxNameFr}</th>
              <th style={th}>{t.se_dxNameKo}</th>
              <th style={Object.assign({}, th, { width: 70 })}>{t.se_colStatus}</th>
              <th style={Object.assign({}, th, { width: 150 })}></th>
            </tr></thead>
            <tbody>{shown.map(function (r) {
              var i = rows.findIndex(function (x) { return x.id === r.id; });
              var c = r.is_active ? tx : t3;
              var arrow = function (by, off, label) {
                var dead = !whole || off || busy;
                return <button onClick={function () { if (!dead) move(i, by); }} disabled={dead} title={whole ? label : t.se_dxOrderWhole} aria-label={label}
                  style={Object.assign({}, BTN, { padding: '1px 5px', color: dead ? 'var(--text-5)' : t2, cursor: dead ? 'default' : 'pointer' })}>{by < 0 ? '▲' : '▼'}</button>;
              };
              return <tr key={r.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', gap: 2 }}>{arrow(-1, i === 0, t.se_phCatUp)}{arrow(1, i === rows.length - 1, t.se_phCatDown)}</span></td>
                <td style={{ padding: '4px 6px', color: r.is_active ? 'var(--accent-text)' : t3, fontFamily: 'monospace', fontWeight: 700 }}>{r.code || '—'}</td>
                <td style={{ padding: '4px 6px', color: c }}>{r.name_en}</td>
                <td style={{ padding: '4px 6px', color: c }}>{r.name_fr || '—'}</td>
                <td style={{ padding: '4px 6px', color: c }}>{r.name_ko || '—'}</td>
                <td style={{ padding: '4px 6px', color: r.is_active ? 'var(--ok-text)' : 'var(--danger-text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.is_active ? t.se_on : t.se_off}</td>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', gap: 3 }}>
                  <button onClick={function () { openEdit(r); }} style={BTN}>{t.edit}</button>
                  {r.is_active
                    ? <button onClick={function () { toggle(r); }} style={BTN_OFF}>{t.se_dxOff}</button>
                    : <button onClick={function () { toggle(r); }} style={Object.assign({}, BTN, { color: 'var(--ok-text)' })}>{t.se_dxOn}</button>}
                </span></td>
              </tr>;
            })}</tbody>
          </table>
        ) : null}
      </div>

      {edit ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--scrim)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel-head)', borderRadius: 10, border: '1px solid ' + bd, width: 460, maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px var(--shadow-50)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: tx, padding: '18px 18px 14px' }}>{edit.id ? t.se_dxEditTitle : t.se_dxNewTitle}</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={LBL}>{t.se_colCode}</label>
                <input value={edit.code} maxLength={20} autoFocus onChange={function (e) { ue('code', e.target.value); }} style={Object.assign({}, IS, { fontFamily: 'monospace' })} />
                <div style={NOTE}>{t.se_dxCodeHint}</div>
                {sameCode ? <div style={Object.assign({}, NOTE, { color: 'var(--warn-text)' })}>ⓘ {fill(t.se_dxSameCode, { list: sameCode })} {t.se_dxSameOk}</div> : null}
              </div>
              <div>
                <label style={LBL}>{t.se_dxNameEn} *</label>
                <input value={edit.name_en} maxLength={200} onChange={function (e) { ue('name_en', e.target.value); }} style={IS} />
              </div>
              <div>
                <label style={LBL}>{t.se_dxNameFr}</label>
                <input value={edit.name_fr} maxLength={200} onChange={function (e) { ue('name_fr', e.target.value); }} style={IS} />
              </div>
              <div>
                <label style={LBL}>{t.se_dxNameKo}</label>
                <input value={edit.name_ko} maxLength={200} onChange={function (e) { ue('name_ko', e.target.value); }} style={IS} />
                <div style={NOTE}>{t.se_dxNameHint}</div>
                {sameName ? <div style={Object.assign({}, NOTE, { color: 'var(--warn-text)' })}>ⓘ {fill(t.se_dxSameName, { list: sameName })} {t.se_dxSameOk}</div> : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={LBL}>{fill(t.se_dxPosition, { n: rows.length + (edit.id ? 0 : 1) })}</label>
                  <input type="number" min={1} max={rows.length + (edit.id ? 0 : 1)} value={edit.position} onChange={function (e) { ue('position', e.target.value); }} style={IS} />
                </div>
                <div>
                  <label style={LBL}>{t.se_colStatus}</label>
                  <div className="pressable" role="checkbox" aria-checked={!!edit.is_active} tabIndex={0}
                    onClick={function () { ue('is_active', !edit.is_active); }}
                    onKeyDown={function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ue('is_active', !edit.is_active); } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--panel)', border: '1px solid ' + bd2, borderRadius: 5, padding: '7px 10px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, border: edit.is_active ? '2px solid var(--ok-ink)' : '2px solid var(--border-2)', background: edit.is_active ? 'var(--ok)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{edit.is_active ? <span style={{ color: 'var(--on-fill)', fontSize: 12 }}>✓</span> : null}</div>
                    <span style={{ fontSize: 14, color: edit.is_active ? 'var(--ok-text)' : t3 }}>{edit.is_active ? t.se_on : t.se_off}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '14px 18px 18px', borderTop: '1px solid ' + bd, marginTop: 14 }}>
              <button onClick={function () { setEdit(null); }} style={{ flex: 1, background: 'var(--chip)', color: t2, border: '1px solid var(--border-2)', borderRadius: 5, padding: '7px', cursor: 'pointer', fontSize: 14 }}>{t.cancel}</button>
              <button onClick={save} style={{ flex: 2, background: 'linear-gradient(135deg,var(--accent),var(--accent-strong))', color: 'var(--on-fill)', border: 'none', borderRadius: 5, padding: '7px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{t.save}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
