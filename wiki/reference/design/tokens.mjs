// The colour tokens of the app: dark = the values the screens had before themes existed
// (must never change), light = proposal A chosen by the director on 2026-09-29.
// Prints the <style id="bethesda-theme"> block for frontend/index.html and checks the
// light values against WCAG AA.   Run: node tokens.mjs            (prints CSS + report)
//                                       node tokens.mjs --check    (report only, exit 1 on a miss)
// (design session - tooling only, not part of the app)
import { rgb, hex, contrast } from './themes.mjs';

const over = (top, a, base) => top.map((v, i) => v * a + base[i] * (1 - a));

// ── neutrals: [name, dark, light, kind] ── kind: s surface · t text · l line · x other
export const NEUTRAL = [
  ['bg',           '#0f1117', '#eff2f7', 's'],   // page background
  ['bg-col',       '#11141c', '#f8fafc', 's'],   // consultation columns, sunken boxes
  ['bg-deep',      '#0c0f16', '#e3e8ef', 's'],
  ['panel',        '#13161f', '#ffffff', 's'],   // pn
  ['panel-2',      '#161a26', '#f3f5f9', 's'],   // menu row, sub-headers
  ['panel-head',   '#1a1f2e', '#e8ecf2', 's'],   // scBg: section headers, top bar start
  ['panel-head-2', '#141824', '#dfe5ee', 's'],   // top bar gradient end
  ['chip',         '#1e2433', '#e3e8ef', 's'],   // neutral buttons, tags
  ['field',        '#0f1117', '#ffffff', 's'],   // input background (same as --bg when dark)
  ['btn-neutral',  '#334155', '#d5dbe4', 's'],
  ['btn-neutral-2','#374151', '#d5dbe4', 's'],
  ['line-soft',    '#1e2433', '#e1e6ee', 'l'],   // table row separators
  ['border',       '#232838', '#d5dbe4', 'l'],   // bd
  ['border-2',     '#2a3142', '#c3cbd7', 'l'],   // bd2 on boxes
  ['field-border', '#2a3142', '#8793a6', 'f'],   // bd2 on inputs: 3:1 against the field
  ['text-max',     '#ffffff', '#0b1220', 't'],   // #fff used as text on a panel (not on a coloured button)
  ['text-strong',  '#f1f5f9', '#0b1220', 't'],
  ['text-strong-2','#f8fafc', '#0b1220', 't'],
  ['text',         '#e2e8f0', '#1b2534', 't'],   // tx
  ['text-soft',    '#cbd5e1', '#2c3a4d', 't'],
  ['text-2',       '#94a3b8', '#4a5668', 't'],   // t2
  ['text-3',       '#64748b', '#566274', 't'],   // t3
  ['text-4',       '#475569', '#5b6779', 't'],
  ['on-fill',      '#ffffff', '#ffffff', 'x'],   // text on a coloured button: white in both
];

// ── colour families: [name, dark, light, kind] ── kind: c fill (white text reads on it) · t text (reads on every surface and on its family's tints)
// A dark colour used both ways gets two tokens with the same dark value: --accent (fill) and --accent-ink (text).
export const COLOR = [
  ['accent',        '#3b82f6', '#2563eb', 'c'],
  ['accent-strong', '#2563eb', '#1d4ed8', 'c'],
  ['accent-ink',    '#3b82f6', '#1451d6', 't'],
  ['accent-text',   '#60a5fa', '#1451d6', 't'],
  ['accent-text-2', '#93c5fd', '#1e40af', 't'],
  ['ok',            '#10b981', '#047857', 'c'],
  ['ok-strong',     '#059669', '#046c4e', 'c'],
  ['ok-2',          '#16a34a', '#15803d', 'c'],
  ['ok-ink',        '#10b981', '#04694c', 't'],
  ['ok-text',       '#34d399', '#04694c', 't'],
  ['ok-text-2',     '#6ee7b7', '#065f46', 't'],
  ['warn',          '#f59e0b', '#b45309', 'c'],
  ['warn-strong',   '#b45309', '#92400e', 'c'],
  ['warn-ink',      '#f59e0b', '#944407', 't'],
  ['warn-text',     '#fbbf24', '#944407', 't'],
  ['warn-text-2',   '#fcd34d', '#854008', 't'],
  ['danger',        '#ef4444', '#dc2626', 'c'],
  ['danger-strong', '#dc2626', '#b91c1c', 'c'],
  ['danger-deep',   '#b91c1c', '#991b1b', 'c'],
  ['danger-ink',    '#ef4444', '#b01c1c', 't'],
  ['danger-text',   '#f87171', '#b01c1c', 't'],
  ['danger-text-2', '#fca5a5', '#991b1b', 't'],
  ['violet',        '#8b5cf6', '#7c3aed', 'c'],
  ['violet-2',      '#a855f7', '#9333ea', 'c'],
  ['violet-strong', '#7c3aed', '#6d28d9', 'c'],
  ['violet-ink',    '#8b5cf6', '#6c23eb', 't'],
  ['violet-text',   '#a78bfa', '#6c23eb', 't'],
  ['violet-text-2', '#c084fc', '#6b21a8', 't'],
  ['cyan',          '#06b6d4', '#0e7490', 'c'],
  ['cyan-ink',      '#06b6d4', '#0d6e89', 't'],
  ['cyan-text',     '#67e8f9', '#0d6e89', 't'],
  ['teal',          '#14b8a6', '#0f766e', 'c'],
  ['teal-ink',      '#14b8a6', '#0e716a', 't'],
];

// ── tints: family + two hex digits of alpha, as the screens write them (#3b82f640 → --accent-a40) ──
const TINT_BASE = { '3b82f6': 'accent', 'ef4444': 'danger', 'dc2626': 'danger-strong', 'f59e0b': 'warn', '10b981': 'ok', '16a34a': 'ok-2', '059669': 'ok-strong', '34d399': 'ok-text', '8b5cf6': 'violet', 'a855f7': 'violet-2', '7c3aed': 'violet-strong', 'a78bfa': 'violet-text', '06b6d4': 'cyan', '94a3b8': 'text-2', '64748b': 'text-3' };
const TINTS_USED = '3b82f640 3b82f620 ef444418 f59e0b20 10b98118 ef444440 3b82f618 10b98140 3b82f612 f59e0b60 dc262630 dc262610 f59e0b18 f59e0b14 10b98120 8b5cf620 3b82f615 f59e0b55 f59e0b40 ef444450 ef444420 ef444412 3b82f660 3b82f650 f59e0b50 f59e0b12 ef444460 ef444430 a855f750 a855f718 8b5cf615 7c3aed55 7c3aed22 10b98150 f59e0b66 f59e0b45 f59e0b30 f59e0b0d ef444455 ef444415 ef44440d dc262640 dc262620 a855f714 a78bfa40 a78bfa18 94a3b818 8b5cf650 8b5cf640 64748b55 64748b22 64748b18 3b82f680 3b82f630 3b82f608 34d39940 34d39918 16a34a40 16a34a15 10b98115 10b98112 10b98108 06b6d455 05966915';
// Tints the screens build by joining a colour and an alpha ("c + '18'") are added screen by screen in stage 3.
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
  ['scrim',        'rgba(0,0,0,0.6)', 'rgba(15,23,42,0.45)'],
  ['hover-filter', 'brightness(1.12)', 'brightness(0.95)'],
  ['scheme',       'dark', 'light'],
];

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
  return { out, bad };
}

if (process.argv[1].endsWith('tokens.mjs')) {
  const r = check();
  if (process.argv.indexOf('--check') < 0) console.log(css() + '\n');
  console.log(r.out.join('\n')); console.log(r.bad ? r.bad + ' below the line' : 'all light values pass');
  console.log(all.length + ' colours, ' + TINT.length + ' tints');
  process.exit(r.bad ? 1 : 0);
}
