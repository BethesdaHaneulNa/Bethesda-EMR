// Shared sizes and shapes of the module screens (design session - wiki/modules/design.md 3.9).
//
// Payment, pharmacy and laboratory are the same kind of screen: a tool row, a patient list
// on the left, the work in the middle, the patient's history on the right. Each was built
// by its own session and the same part came out a little different on each (the director,
// 2026-10-01: "make them the same"). The values that must stay the same live here, so the
// next change is made once.
//
// Only shape and size. What a colour means stays with each screen: the pharmacy's tab is
// violet, the laboratory's cyan, and so on - tabBtn() takes the colours as arguments.

// ── columns ──
export var LIST_COL = 300;                             // the patient list on the left, px
export var CHART_COL = 'clamp(340px, 28vw, 460px)';    // the patient's history on the right: 382px at 1366
export var PAGE_COLS = LIST_COL + 'px minmax(0,1fr) minmax(280px,' + CHART_COL + ')';

// ── the tool row under the menu ──
export var TOOL_ROW = { flexShrink: 0, background: 'var(--panel-2)', borderBottom: '1px solid var(--border)', padding: '6px 12px', minHeight: 47, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };

// every button of the tool row: one height, one text size
export var TOOL_BTN = { borderRadius: 6, padding: '6px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 34, boxSizing: 'border-box' };

// a plain tool button (find patient, refresh ...)
export function toolBtn(extra) {
  return Object.assign({}, TOOL_BTN, { background: 'var(--chip)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }, extra || {});
}

// a tab of the tool row (waiting / done): tinted when chosen, bare when not
export function tabBtn(on, bg, color, line) {
  return Object.assign({}, TOOL_BTN, { fontWeight: 800, background: on ? bg : 'transparent', color: on ? color : 'var(--text-3)', border: '1px solid ' + (on ? line : 'transparent') });
}

// ── the patient list ──
export var LIST_SEARCH_WRAP = { flexShrink: 0, padding: '7px 9px', borderBottom: '1px solid var(--border)' };
export var LIST_SEARCH = { background: 'var(--field-3)', border: '1px solid var(--field-border)', borderRadius: 5, padding: '7px 9px', color: 'var(--text)', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' };
export var ROW_PAD = '10px 12px';
export var ROW_NAME = { fontWeight: 800, fontSize: 15, color: 'var(--text-strong)' };
export var ROW_SUB = { fontSize: 13, color: 'var(--text-2)' };
export var ROW_NOTE = { fontSize: 12 };
export var ROW_EMPTY = { padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 };

// a small status tag at the right of a row's first line
export function rowTag(bg, color) {
  return { background: bg, color: color, borderRadius: 4, padding: '2px 7px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 };
}

// ── "choose a patient" in the empty middle ──
export var EMPTY_ICON = { fontSize: 54, opacity: 0.35, marginBottom: 12 };
export var EMPTY_TEXT = { fontSize: 17, fontStyle: 'italic', color: 'var(--text-3)' };
export var EMPTY_SUB = { fontSize: 14, marginTop: 6, color: 'var(--text-3)' };

// ── a side menu: the parts of a screen, one shown at a time (settings, statistics) ──
// The settings screen had this shape first (Settings.jsx keeps its own copy of the values);
// the statistics screen takes it from here.
export var SIDE_NAV_COL = 180;                         // px
export var SIDE_NAV = { borderRight: '1px solid var(--border)', background: 'var(--panel)', padding: '10px 0', overflowY: 'auto' };
export var SIDE_NAV_TITLE = { padding: '0 12px 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' };
export function sideNavItem(on) {
  return { display: 'block', width: '100%', textAlign: 'left', boxSizing: 'border-box', border: 'none', borderLeft: '3px solid ' + (on ? 'var(--accent-ink)' : 'transparent'), borderRadius: 0, margin: 0,
    padding: '8px 14px', cursor: 'pointer', background: on ? 'var(--accent-a12)' : 'transparent', color: on ? 'var(--accent-text)' : 'var(--text-2)', fontSize: 14, fontWeight: on ? 600 : 400, fontFamily: 'inherit', lineHeight: 1.35 };
}

// ── the heading of the right column ──
export var SIDE_HEAD = { flexShrink: 0, padding: '9px 12px', borderBottom: '1px solid var(--border)', background: 'var(--panel-head)', fontWeight: 800, fontSize: 14 };
