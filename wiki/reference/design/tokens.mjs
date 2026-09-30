// The colour tokens of the app: dark = the values the screens had before themes existed
// (must never change), light = proposal A chosen by the director on 2026-09-29.
// Prints the <style id="bethesda-theme"> block for frontend/index.html and checks the
// light values against WCAG AA.   Run: node tokens.mjs            (prints CSS + report)
//                                       node tokens.mjs --check    (report only, exit 1 on a miss)
// (design session - tooling only, not part of the app)
import fs from 'fs';
import { rgb, hex, contrast } from './themes.mjs';

const over = (top, a, base) => top.map((v, i) => v * a + base[i] * (1 - a));

// ── neutrals: [name, dark, light, kind] ── kind: s surface · t text · l line · x other
export const NEUTRAL = [
  ['bg',           '#0f1117', '#eff2f7', 's'],   // page background
  ['bg-2',         '#0d0f16', '#eff2f7', 's'],   // page background of the statistics screen
  ['bg-col',       '#11141c', '#f8fafc', 's'],   // consultation columns, sunken boxes
  ['bg-deep',      '#0c0f16', '#e3e8ef', 's'],
  ['panel',        '#13161f', '#ffffff', 's'],   // pn
  ['panel-2',      '#161a26', '#f3f5f9', 's'],   // menu row, sub-headers
  ['panel-head',   '#1a1f2e', '#e8ecf2', 's'],   // scBg: section headers, top bar start
  ['panel-head-2', '#141824', '#dfe5ee', 's'],   // top bar gradient end
  ['panel-head-3', '#151a28', '#e1e6ee', 's'],   // login card gradient end
  ['chip',         '#1e2433', '#e3e8ef', 's'],   // neutral buttons, tags
  ['field',        '#0f1117', '#ffffff', 's'],
  ['field-2',      '#11151f', '#ffffff', 's'],
  ['field-3',      '#1a1f2e', '#ffffff', 's'],
  ['field-4',      '#0c0f16', '#ffffff', 's'],   // fields of the document window
  ['field-5',      '#13161f', '#ffffff', 's'],   // date fields of the statistics screen
  ['field-6',      '#11141c', '#ffffff', 's'],   // fields of the password window
  ['field-locked', '#15181f', '#eef1f5', 's'],   // a field that cannot be changed (settings)   // an input drawn on the section-header colour (queue search)   // the note box inside the amber frame (reception)
  ['bg-row',       '#111827', '#f8fafc', 's'],   // a row of search results
  ['bg-group',     '#0f1622', '#eaf3f8', 's'],
  ['bg-col-2',     '#101521', '#f8fafc', 's'],
  ['accent-chip',  '#1e3a5f', '#dbeafe', 's'],   // a small blue tag on a panel
  ['danger-box',   '#7f1d1d', '#fee2e2', 's'],   // a red warning box on a panel
  ['notice',       '#1f2937', '#eef1f5', 's'],   // a grey notice box (a cancelled imaging order)
  ['notice-line',  '#4b5563', '#aab2be', 'l'],
  ['line-soft-2',  '#161b27', '#e6eaf0', 'l'],
  ['line-soft-3',  '#1a1f2e', '#e6eaf0', 'l'],   // table rows of the statistics screen   // a group heading row inside a results table   // input background (same as --bg when dark)
  ['btn-neutral',  '#334155', '#d5dbe4', 's'],
  ['btn-neutral-2','#374151', '#d5dbe4', 's'],
  ['line-soft',    '#1e2433', '#e1e6ee', 'l'],   // table row separators
  ['border',       '#232838', '#d5dbe4', 'l'],   // bd
  ['border-2',     '#2a3142', '#c3cbd7', 'l'],   // bd2 on boxes
  ['field-border', '#64718a', '#77839a', 'f'],   // bd2 on inputs: 3:1 against the field and against the panel around it
  ['text-max',     '#ffffff', '#0b1220', 't'],   // #fff used as text on a panel (not on a coloured button)
  ['text-strong',  '#f1f5f9', '#0b1220', 't'],
  ['text-strong-2','#f8fafc', '#0b1220', 't'],
  ['text',         '#e2e8f0', '#1b2534', 't'],   // tx
  ['text-soft',    '#cbd5e1', '#2c3a4d', 't'],
  ['text-soft-2',  '#e5e7eb', '#2c3a4d', 't'],
  ['text-2',       '#94a3b8', '#4a5668', 't'],   // t2
  ['text-3',       '#8793a6', '#566274', 't'],   // t3
  ['text-4',       '#8290a3', '#5b6779', 't'],
  ['text-5',       '#8290a3', '#5b6779', 't'],
  ['text-faint',   '#8290a3', '#5b6779', 't'],
  ['text-locked',  '#8b95a5', '#566274', 't'],   // text in a locked field   // the dot in an empty table cell   // barely visible when dark; it is still text, so readable when light
  ['on-fill',      '#ffffff', '#ffffff', 'x'],   // text on a coloured button: white in both
  ['on-bright',    '#ffffff', '#ffffff', 'x'],   // text on a bright green / amber / red button: near-black when dark (the colour is bright), white when light (the colour is deep)
  ['on-fill-blue', '#dbeafe', '#dbeafe', 'x'],   // pale text on a deep coloured button: the same on both screens
  ['on-fill-blue-2','#bfdbfe', '#bfdbfe', 'x'],
  ['on-fill-teal', '#ccfbf1', '#ccfbf1', 'x'],
  ['on-fill-cyan', '#cffafe', '#cffafe', 'x'],
  ['on-fill-violet','#ede9fe', '#ede9fe', 'x'],
  ['on-fill-violet-2','#ddd6fe', '#ddd6fe', 'x'],
  ['on-fill-violet-3','#c4b5fd', '#c4b5fd', 'x'],
  ['on-fill-amber','#fde68a', '#fde68a', 'x'],
  ['on-fill-red',  '#fecaca', '#fecaca', 'x'],
  ['on-cyan',      '#08161a', '#ffffff', 'x'],   // text on the lab's cyan button: near-black when dark (the cyan is bright), white when light (the cyan is deep)
];

// ── colour families: [name, dark, light, kind] ── kind: c fill (white text reads on it) · t text (reads on every surface and on its family's tints)
// A dark colour used both ways gets two tokens with the same dark value: --accent (fill) and --accent-ink (text).
export const COLOR = [
  ['accent',        '#2563eb', '#2563eb', 'c'],
  ['accent-strong', '#1d4ed8', '#1d4ed8', 'c'],
  ['accent-ink',    '#60a5fa', '#1451d6', 't'],
  ['accent-text',   '#60a5fa', '#1451d6', 't'],
  ['accent-text-2', '#93c5fd', '#1e40af', 't'],
  ['accent-text-3', '#bfdbfe', '#1e40af', 't'],
  ['ok',            '#047857', '#047857', 'c'],
  ['ok-strong',     '#046c4e', '#046c4e', 'c'],
  ['ok-2',          '#15803d', '#15803d', 'c'],
  ['ok-2-strong',   '#166534', '#166534', 'c'],
  ['ok-3',          '#22c55e', '#15803d', 'c'],
  ['ok-bar',        '#34d399', '#047857', 'c'],   // bars of a chart
  ['accent-bar',    '#60a5fa', '#2563eb', 'c'],
  ['ok-ink',        '#10b981', '#04694c', 't'],
  ['ok-text',       '#34d399', '#04694c', 't'],
  ['ok-text-2',     '#6ee7b7', '#065f46', 't'],
  ['ok-text-3',     '#86efac', '#065f46', 't'],
  ['warn',          '#b45309', '#b45309', 'c'],
  ['warn-strong',   '#92400e', '#92400e', 'c'],
  ['warn-ink',      '#f59e0b', '#944407', 't'],
  ['warn-text',     '#fbbf24', '#944407', 't'],
  ['warn-text-2',   '#fcd34d', '#854008', 't'],
  ['warn-text-3',   '#fde68a', '#854008', 't'],
  ['danger',        '#dc2626', '#dc2626', 'c'],
  ['danger-strong', '#dc2626', '#b91c1c', 'c'],
  ['danger-deep',   '#b91c1c', '#991b1b', 'c'],
  ['danger-ink',    '#f87171', '#b01c1c', 't'],
  ['danger-text',   '#f87171', '#b01c1c', 't'],
  ['danger-text-2', '#fca5a5', '#991b1b', 't'],
  ['danger-text-3', '#fecaca', '#991b1b', 't'],
  ['violet',        '#7c3aed', '#7c3aed', 'c'],
  ['violet-2',      '#9333ea', '#9333ea', 'c'],
  ['violet-strong', '#7c3aed', '#6d28d9', 'c'],
  ['violet-ink',    '#a78bfa', '#6c23eb', 't'],
  ['violet-text',   '#a78bfa', '#6c23eb', 't'],
  ['violet-text-2', '#c084fc', '#6b21a8', 't'],
  ['violet-text-3', '#ddd6fe', '#5b21b6', 't'],
  ['violet-text-4', '#c4b5fd', '#5b21b6', 't'],
  ['cyan',          '#06b6d4', '#0e7490', 'c'],
  ['cyan-strong',   '#0891b2', '#155e75', 'c'],
  // the lab's buttons, apart from --cyan: the lab screen also writes text and lines in --cyan,
  // so a button cannot be made deeper through it without dimming that text.
  ['cyan-fill',     '#06b6d4', '#0e7490', 'c'],
  ['cyan-fill-2',   '#0891b2', '#155e75', 'c'],
  ['cyan-ink',      '#06b6d4', '#0b6279', 't'],
  ['cyan-text',     '#67e8f9', '#0b6279', 't'],
  ['cyan-text-2',   '#7dd3fc', '#0b6279', 't'],
  ['teal',          '#0f766e', '#0f766e', 'c'],
  // deep buttons: dark enough for pale text on both screens, so the light value is the same
  ['accent-deep',   '#1e4fa0', '#1e4fa0', 'c'],
  ['teal-deep',     '#0f766e', '#0f766e', 'c'],
  ['cyan-deep',     '#0e7490', '#0e7490', 'c'],
  ['violet-deep',   '#5b21b6', '#5b21b6', 'c'],
  ['teal-ink',      '#14b8a6', '#0c625c', 't'],
  // the server status dot and the words beside it (settings): one colour for both
  ['status-ok',     '#22c55e', '#166534', 't'],
  ['status-warn',   '#eab308', '#854008', 't'],
  ['status-down',   '#f87171', '#b01c1c', 't'],
  ['status-off',    '#8793a6', '#566274', 't'],
];

// ── tints: family + two hex digits of alpha, as the screens write them (#3b82f640 → --accent-a40) ──
const TINT_BASE = { '3b82f6': 'accent', '60a5fa': 'accent-text', '14b8a6': 'teal', '0e7490': 'cyan-deep', 'fbbf24': 'warn-text', 'f87171': 'danger-text', 'ef4444': 'danger', 'dc2626': 'danger-strong', 'f59e0b': 'warn', '10b981': 'ok', '16a34a': 'ok-2', '059669': 'ok-strong', '34d399': 'ok-text', '8b5cf6': 'violet', 'a855f7': 'violet-2', '7c3aed': 'violet-strong', 'a78bfa': 'violet-text', '06b6d4': 'cyan', '94a3b8': 'text-2', '64748b': 'text-3' };
const TINTS_USED = '3b82f640 3b82f620 ef444418 f59e0b20 10b98118 ef444440 3b82f618 10b98140 3b82f612 f59e0b60 dc262630 dc262610 f59e0b18 f59e0b14 10b98120 8b5cf620 3b82f615 f59e0b55 f59e0b40 ef444450 ef444420 ef444412 3b82f660 3b82f650 f59e0b50 f59e0b12 ef444460 ef444430 a855f750 a855f718 8b5cf615 7c3aed55 7c3aed22 10b98150 f59e0b66 f59e0b45 f59e0b30 f59e0b0d ef444455 ef444415 ef44440d dc262640 dc262620 a855f714 a78bfa40 a78bfa18 94a3b818 8b5cf650 8b5cf640 64748b55 64748b22 64748b18 3b82f680 3b82f630 3b82f608 34d39940 34d39918 16a34a40 16a34a15 10b98115 10b98112 10b98108 06b6d455 05966915'
  // tints the screens build by joining a colour and an alpha ("c + '18'") - added screen by screen in stage 3
  + ' 10b98130 8b5cf630 06b6d415 06b6d430 f59e0b15 94a3b815 94a3b830'   // TopBar: the role chip
  + ' 06b6d420 06b6d450 06b6d412'   // Lab: the pending tab, the chosen patient
  + ' 60a5fa15'   // Payment: the change line
  + ' 14b8a615 0e749022 34d39914 34d39955 fbbf2414 fbbf2455 f8717114 f8717155';   // Settings: the nurse role tag, the ranges button, the backup box
const all = [...NEUTRAL, ...COLOR];
const byName = Object.fromEntries(all.map(t => [t[0], t]));
const lightAlpha = a => Math.min(1, a * 1.25);   // a tint needs more ink on white than on near-black
export const TINT = [...new Set(TINTS_USED.split(/\s+/))].sort().map(k => {
  const base = TINT_BASE[k.slice(0, 6)]; if (!base) throw new Error('no family for ' + k);
  const a = parseInt(k.slice(6), 16) / 255, l = rgb(byName[base][2].slice(1));
  return [base + '-a' + k.slice(6), '#' + k, 'rgba(' + l.join(',') + ',' + (+lightAlpha(a).toFixed(3)) + ')', base, a];
});

// ── other values that differ by theme ──
export const OTHER = [
  ['scrim',        'rgba(0,0,0,0.6)', 'rgba(15,23,42,0.45)'],   // behind a dialog
  ['scrim-30',     'rgba(0,0,0,0.3)', 'rgba(15,23,42,0.2)'],
  ['scrim-40',     'rgba(0,0,0,0.4)', 'rgba(15,23,42,0.3)'],
  ['scrim-50',     'rgba(0,0,0,0.5)', 'rgba(15,23,42,0.4)'],
  ['scrim-70',     'rgba(0,0,0,0.7)', 'rgba(15,23,42,0.5)'],
  ['shadow-30',    'rgba(0,0,0,0.3)', 'rgba(15,23,42,0.10)'],  // box shadows: much lighter on white
  ['shadow-40',    'rgba(0,0,0,0.4)', 'rgba(15,23,42,0.12)'],
  ['shadow-50',    'rgba(0,0,0,0.5)', 'rgba(15,23,42,0.15)'],
  ['shadow-60',    'rgba(0,0,0,0.6)', 'rgba(15,23,42,0.18)'],
  ['shadow-70',    'rgba(0,0,0,0.7)', 'rgba(15,23,42,0.20)'],
  ['hover-filter', 'brightness(1.12)', 'brightness(0.95)'],
  ['hover-row',    '#ffffff06', 'rgba(15,23,42,0.04)'],   // a list row under the mouse
  ['hover-row-2',  '#ffffff08', 'rgba(15,23,42,0.05)'],
  ['warn-chip',    '#78350f55', 'rgba(180,83,9,0.14)'],   // small warning tags in the prescription table
  ['danger-chip',  '#7f1d1d55', 'rgba(220,38,38,0.12)'],
  ['scheme',       'dark', 'light'],
  // a notice that floats over the screen ("saved"). When dark these are the values the lab
  // screen had (panel-2, ok-text-2, ok at 50, no shadow); when light the notice is a pale
  // green card with a deep border and a shadow, so it does not sink into the page.
  ['toast-bg',     '#161a26', '#ecfdf5'],
  ['toast-text',   '#6ee7b7', '#065f46'],
  ['toast-line',   '#10b98150', '#047857'],
  ['toast-shadow', 'none', '0 6px 20px rgba(15,23,42,0.18)'],
  // a card faded to say "cancelled" or "replaced": fading also fades its small text below
  // what can be read on white, so the light screen does not fade (the red border and the
  // tag already say it). opacity: 'var(--fade-85)'
  ['fade-85',      '0.85', '1'],
  // text on the black panel of the image viewer: the same on both screens
  ['viewer-text',  '#8290a3', '#8290a3'],
  // the example text inside an empty input (see the rules
  // under the token block in index.html). Until 2026-09-30 it was the browser's own grey
  // (#757575) on both screens.
  ['placeholder',  '#8290a3', '#5b6779'],
  // the ring around the input that has the keyboard
  ['focus-ring',   '#60a5fa', '#1d4ed8'],
];

export const dark = () => Object.fromEntries([...all, ...TINT, ...OTHER].map(t => [t[0], t[1]]));

export function css() {
  const line = (list, i) => list.map(t => '      --' + t[0] + ': ' + t[i] + ';').join('\n');
  return '    :root {\n' + line([...all, ...TINT, ...OTHER], 1) + '\n    }\n' +
    '    :root[data-theme="light"] {\n' + line([...all, ...TINT, ...OTHER], 2) + '\n      color-scheme: light;\n    }';
}

// ── checks (light values) ──
export function check() {
  const out = []; let bad = 0;
  const surfaces = NEUTRAL.filter(t => t[3] === 's' && !/^btn-neutral/.test(t[0]));
  const add = (what, ratio, need, where) => { const ok = ratio >= need; if (!ok) bad++; out.push((ok ? 'ok  ' : 'MISS') + ' ' + what.padEnd(16) + ratio.toFixed(2).padStart(6) + '  (>= ' + need + ')  ' + where); };
  const worst = (c, list) => list.map(s => [contrast(c, s[1]), s[0]]).sort((a, b) => a[0] - b[0])[0];
  const surf = surfaces.map(s => [s[0], rgb(s[2].slice(1))]);
  for (const t of NEUTRAL.filter(t => t[3] === 't')) { const w = worst(rgb(t[2].slice(1)), surf); add(t[0], w[0], 4.5, 'on --' + w[1]); }
  for (const t of COLOR) {
    const c = rgb(t[2].slice(1));
    if (t[3] === 'c') { add(t[0], contrast([255, 255, 255], c), 4.5, 'white text on it'); continue; }
    const w = worst(c, surf); add(t[0], w[0], 4.5, 'as text on --' + w[1]);
    // on its own family's background tints (alpha up to 0x20), over the darkest surface
    const fam = t[0].split('-')[0];   // danger-strong tints count for the danger family
    const tints = TINT.filter(x => x[3].split('-')[0] === fam && x[4] <= 0x20 / 255);
    const main = surf.filter(s => ['bg', 'bg-col', 'panel', 'panel-2', 'panel-head'].indexOf(s[0]) >= 0);
    let lo = null; for (const x of tints) for (const s of main) { const bg = over(rgb(byName[x[3]][2].slice(1)), lightAlpha(x[4]), s[1]); const r = contrast(c, bg); if (!lo || r < lo[0]) lo = [r, x[0] + ' over --' + s[0]]; }
    if (lo) add(t[0], lo[0], 4.5, 'on --' + lo[1]);
  }
  const fb = NEUTRAL.find(t => t[0] === 'field-border'); add('field-border', contrast(rgb(fb[2].slice(1)), rgb(byName.field[2].slice(1))), 3, 'against --field');
  { const w = worst(rgb(fb[2].slice(1)), surf.filter(s => ['bg', 'bg-col', 'panel', 'panel-2', 'panel-head'].indexOf(s[0]) >= 0)); add('field-border', w[0], 3, 'against --' + w[1] + ' around the field'); }
  return { out, bad };
}

if ((process.argv[1] || '').endsWith('tokens.mjs')) {
  const r = check();
  const wi = process.argv.indexOf('--write');
  if (wi >= 0) { // replace the block in index.html
    const f = process.argv[wi + 1]; let h = fs.readFileSync(f, 'utf8'); const crlf = h.includes('\r\n'); if (crlf) h = h.replace(/\r\n/g, '\n');
    const a = h.indexOf('<style id="bethesda-theme">'), b = h.indexOf('</style>', a); if (a < 0 || b < 0) throw new Error('no bethesda-theme block in ' + f);
    h = h.slice(0, a) + '<style id="bethesda-theme">\n' + css() + '\n  ' + h.slice(b); fs.writeFileSync(f, crlf ? h.replace(/\n/g, '\r\n') : h); console.log('wrote ' + f);
  }
  if (process.argv.indexOf('--check') < 0 && wi < 0) console.log(css() + '\n');
  console.log(r.out.join('\n')); console.log(r.bad ? r.bad + ' below the line' : 'all light values pass');
  console.log(all.length + ' colours, ' + TINT.length + ' tints');
  process.exit(r.bad ? 1 : 0);
}
