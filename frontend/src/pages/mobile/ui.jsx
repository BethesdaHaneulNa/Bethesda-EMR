// The phone page's shared pieces (/m, 1.7.11). The phone is the main tool wherever there is
// no PC (clinic manager, on site, 2026-11-09): text 18 px or more, everything tapped 48 px
// tall or more, and every list with one big refresh button on top. Colours are the
// design tokens (index.html), as on the PC screens.
import { userPerms } from '../../modules.js';

export var FS = 18;          // the smallest text on /m
export var TAP = 52;         // the height of anything tapped (48 px is the minimum)

// Who may SAVE lab results from the phone: the same permission as the PC lab screen
// (backend/src/routes/lab.routes.js, POST /order/:id/results, permMiddleware('lab')).
// The one place the phone says it - change it together with that route if the clinic
// decides to open result entry to more accounts. Everyone else sees the lists read-only.
export var LAB_ENTRY_PERMS = ['lab'];
export function canEnterLab(user) {
  var have = userPerms(user);
  return LAB_ENTRY_PERMS.some(function (p) { return have.indexOf(p) >= 0; });
}

export var col = { maxWidth: 560, margin: '0 auto', padding: '0 16px 24px', boxSizing: 'border-box', width: '100%' };
export var bigBtn = { minHeight: TAP, borderRadius: 10, fontSize: 20, fontWeight: 800, cursor: 'pointer', padding: '0 16px', boxSizing: 'border-box', fontFamily: 'inherit' };
export var input = { display: 'block', width: '100%', height: TAP, fontSize: 22, padding: '0 12px', background: 'var(--field)', border: '1px solid var(--field-border)', borderRadius: 8, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
export var rowBtn = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 68, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line-soft)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: FS };
export var listBox = { border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--panel)' };
export var nameText = { display: 'block', fontSize: 20, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere', lineHeight: 1.25 };
export var subText = { display: 'block', fontSize: FS, color: 'var(--text-2)', marginTop: 2, overflowWrap: 'anywhere' };

export function nameOf(v) { return [v.last_name, v.first_name].filter(Boolean).join(' '); }
export function timeOf(v) { return v && v.reception_time ? String(v.reception_time).slice(0, 5) : ''; }

// Title of a list, a big refresh button under it, and "← back" when there is somewhere to go back to.
export function ListHead(props) {
  var t = props.t;
  return <div style={{ margin: '10px 0 12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {props.onBack ? <button type="button" onClick={props.onBack} style={Object.assign({}, bigBtn, { flexShrink: 0, background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)', fontSize: FS })}>{props.backLabel || t.m_back}</button> : null}
      <div style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', overflowWrap: 'anywhere' }}>{props.title}</div>
    </div>
    {props.onRefresh ? <button type="button" onClick={props.onRefresh} disabled={props.busy} style={Object.assign({}, bigBtn, { width: '100%', marginTop: 10, background: 'var(--accent-a18)', color: 'var(--accent-text)', border: '1px solid var(--accent-a40)', opacity: props.busy ? 0.6 : 1 })}>↻ {t.m_refresh}</button> : null}
  </div>;
}

export function Notice(props) {
  if (!props.text) return null;
  return <div role="status" style={{ background: 'var(--ok-a18)', border: '1px solid var(--ok-a40)', color: 'var(--ok-text)', borderRadius: 8, padding: '12px', fontSize: FS, fontWeight: 700, marginBottom: 10, overflowWrap: 'anywhere' }}>✓ {props.text}</div>;
}
export function ErrorBox(props) {
  if (!props.text) return null;
  return <div role="alert" style={{ background: 'var(--danger-a15)', border: '1px solid var(--danger-a30)', color: 'var(--danger-text)', borderRadius: 8, padding: '12px', fontSize: FS, marginBottom: 10, overflowWrap: 'anywhere' }}>⚠ {props.text}</div>;
}
export function Empty(props) {
  return <div style={{ padding: '28px 8px', textAlign: 'center', color: 'var(--text-3)', fontSize: FS }}>{props.text}</div>;
}
// A small coloured label (status). c: accent | warn | ok | danger | cyan
export function Tag(props) {
  var c = props.c || 'accent';
  return <span style={{ flexShrink: 0, background: 'var(--' + c + '-a20)', color: 'var(--' + c + '-ink)', borderRadius: 6, padding: '4px 9px', fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap' }}>{props.children}</span>;
}

// The order's status in words and colour, the same five the table allows.
export function orderStatus(t, s) {
  var w = { ordered: t.mo_s_ordered, scheduled: t.mo_s_scheduled, in_progress: t.mo_s_in_progress, completed: t.mo_s_completed, cancelled: t.mo_s_cancelled }[s] || s || '';
  var c = s === 'completed' ? 'ok' : s === 'cancelled' ? 'danger' : s === 'in_progress' || s === 'scheduled' ? 'warn' : 'accent';
  return { word: w, c: c };
}
export function typeWord(t, type) {
  return { fee: t.mo_t_fee, lab: t.mo_t_lab, imaging: t.mo_t_imaging, procedure: t.mo_t_procedure, supply: t.mo_t_supply }[type] || t.mo_t_other;
}

// The list reads itself on opening and again every 30 s while the page is shown.
export function everyHalfMinute(fn) {
  fn();
  var timer = setInterval(function () { if (!document.hidden) fn(); }, 30000);
  return function () { clearInterval(timer); };
}
