// First pass over a screen file: replaces the colours written into inline styles with
// var(--token), choosing the token by what the colour paints (the style property) and
// where (an input or not, on a coloured button or not).
//   node retoken.mjs frontend/src/components/TopBar.jsx          (rewrites the file)
//   node retoken.mjs --dry frontend/src/pages/Lab.jsx            (report only)
// It does not decide everything. What it leaves is listed, and the result is then read
// by eye and checked with check-dark.mjs (dark unchanged) and in the isolated stack
// (light readable). Colours only - nothing else in the file is touched.
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dark } from './tokens.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2); const dry = args[0] === '--dry'; const file = args[dry ? 1 : 0];
const D = dark();
const canon = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };

// by role. A colour missing from a table is left as it is and reported.
const SURFACE = { '#101521': 'bg-col-2', '#1e3a5f': 'accent-chip', '#7f1d1d': 'danger-box', '#1f2937': 'notice', '#0f1622': 'bg-group', '#111827': 'bg-row', '#151a28': 'panel-head-3', '#0f1117': 'bg', '#11141c': 'bg-col', '#0c0f16': 'bg-deep', '#13161f': 'panel', '#161a26': 'panel-2', '#1a1f2e': 'panel-head', '#141824': 'panel-head-2', '#1e2433': 'chip', '#334155': 'btn-neutral', '#374151': 'btn-neutral-2' };
const LINE = { '#161b27': 'line-soft-2', '#4b5563': 'notice-line', '#1e2433': 'line-soft', '#232838': 'border', '#2a3142': 'border-2' };
const TEXT = { '#334155': 'text-5', '#ffffff': 'text-max', '#f8fafc': 'text-strong-2', '#f1f5f9': 'text-strong', '#e2e8f0': 'text', '#cbd5e1': 'text-soft', '#94a3b8': 'text-2', '#64748b': 'text-3', '#475569': 'text-4' };
const EXTRA = { '#78350f55': 'warn-chip', '#7f1d1d55': 'danger-chip', '#ffffff06': 'hover-row', '#ffffff08': 'hover-row-2' };
const DEEP = { '#1e4fa0': 'accent-deep', '#0f766e': 'teal-deep', '#0e7490': 'cyan-deep', '#5b21b6': 'violet-deep', '#7c3aed': 'violet-strong', '#b45309': 'warn-strong', '#b91c1c': 'danger-deep', '#dc2626': 'danger-strong' };
const ONFILL = { '#dbeafe': 'on-fill-blue', '#bfdbfe': 'on-fill-blue-2', '#ccfbf1': 'on-fill-teal', '#cffafe': 'on-fill-cyan', '#ede9fe': 'on-fill-violet', '#ddd6fe': 'on-fill-violet-2', '#c4b5fd': 'on-fill-violet-3', '#fde68a': 'on-fill-amber', '#fecaca': 'on-fill-red' };
const FILL = {}, INK = {}, TINT = {};
for (const n in D) {
  const v = D[n]; if (!/^#/.test(v)) continue;
  if (/^on-/.test(n) || EXTRA[v]) continue;
  if (/-a[0-9a-f]{2}$/.test(n)) { TINT[v] = n; continue; }
  if (SURFACE[v] || LINE[v] || TEXT[v]) continue;
  if (/-ink$|-text(-2)?$/.test(n)) INK[v] = INK[v] || n; else FILL[v] = FILL[v] || n;
}
for (const v in FILL) if (!INK[v] && D[FILL[v] + '-ink'] === v) INK[v] = FILL[v] + '-ink';

const PROP = /\b(background|backgroundColor|color|border|borderTop|borderRight|borderBottom|borderLeft|borderColor|outline|boxShadow|caretColor|accentColor)\s*:/g;
const kindOf = p => /^background/.test(p) ? 'bg' : p === 'color' || p === 'caretColor' ? 'fg' : p === 'boxShadow' ? 'sh' : 'bd';

let src = fs.readFileSync(path.join(root, file), 'utf8');
const left = {}; let n = 0;
const out = src.split('\n').map((line, li) => {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
  return line.replace(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba\(0,\s*0,\s*0,\s*0?\.\d+\)/g, (m, off) => {
    const before = line.slice(0, off);
    // the style property this colour belongs to: the nearest one before it
    let prop = null, pm; PROP.lastIndex = 0; while ((pm = PROP.exec(before))) prop = pm;
    const miss = why => { left[m.toLowerCase() + ' (' + why + ')'] = (left[m.toLowerCase() + ' (' + why + ')'] || []).concat(li + 1); return m; };
    // the line of local colour names every screen starts with: var bd='#232838', pn='#13161f', ...
    const vm = /\b(bd|bd2|pn|scBg|dk|tx|t2|t3)\s*=\s*['"]$/.exec(before);
    if (vm) { const t0 = { '#232838': 'border', '#2a3142': 'border-2', '#13161f': 'panel', '#1a1f2e': 'panel-head', '#e2e8f0': 'text', '#94a3b8': 'text-2', '#64748b': 'text-3' }[canon(m)]; if (t0) { n++; return 'var(--' + t0 + ')'; } }
    if (!prop) return miss('no style property on the line before it');
    const kind = kindOf(prop[1]);
    if (/^rgba/.test(m)) { // black with an alpha: behind a dialog, or a box shadow
      const a = Math.round(parseFloat(m.replace(/\s/g, '').split(',')[3]) * 100);
      const tk = kind === 'bg' ? (a === 60 ? 'scrim' : 'scrim-' + a) : kind === 'sh' ? 'shadow-' + a : null;
      if (!tk || !(tk in D)) return miss(kind + ', no token for black at this alpha');
      n++; return 'var(--' + tk + ')';
    }
    const h = canon(m);
    // the style object this colour sits in, to see what else is set there
    const open = before.lastIndexOf('{'), close = line.indexOf('}', off); const obj = line.slice(open < 0 ? 0 : open, close < 0 ? line.length : close);
    const tag = (before.match(/<([a-zA-Z]+)\b[^<]*$/) || [])[1] || '';
    // an input: the tag itself, or a style constant named like one (var IS = {...}, var IN = {...})
    const isField = /^(input|textarea|select)$/.test(tag) || /^\s*(var|const|let)\s+(IS|IN|INP|inp\w*|input\w*|\w*Input\w*|field\w*)\s*=/.test(line);
    let t = null;
    // what is painted behind this colour in the same style object: a coloured button or a neutral surface
    const bgHere = (obj.match(/background(?:Color)?\s*:([^,}]*(?:\([^)]*\))?[^,}]*)/) || [])[1] || '';
    const bgHex = (bgHere.match(/#[0-9a-fA-F]{6}\b/g) || []).map(canon);
    const onDeep = bgHex.length > 0 && bgHex.every(x => DEEP[x] || (FILL[x] && !SURFACE[x])) && !/\?/.test(bgHere);
    if (h.length === 9) t = TINT[h] || EXTRA[h];
    else if (kind === 'bg') t = isField && h === '#0f1117' ? 'field' : (SURFACE[h] || FILL[h]);
    else if (kind === 'bd') t = isField && h === '#2a3142' ? 'field-border' : (LINE[h] || INK[h] || FILL[h]);
    else if (kind === 'fg') {
      if (h === '#ffffff') { // white on a coloured button stays white; white on a panel becomes the darkest text
        const bg = (obj.match(/background(?:Color)?\s*:([^,}]*(?:\([^)]*\))?[^,}]*)/) || [])[1] || '';
        const onFill = /gradient|#[0-9a-fA-F]{3,8}|var\(--(accent|ok|warn|danger|violet|cyan|teal)/.test(bg) && !Object.keys(SURFACE).some(s => bg.toLowerCase().indexOf(s) >= 0 && !/\?/.test(bg));
        t = onFill ? 'on-fill' : null; if (!t) return miss('white text: on a coloured button (on-fill) or on a panel (text-max)? decide by eye');
      } else if (onDeep && ONFILL[h]) t = ONFILL[h];   // pale text on a deep button: fixed
      else t = TEXT[h] || INK[h];
    }
    if (!t) return miss(kind + ', no token for this role');
    n++; return 'var(--' + t + ')';
  });
}).join('\n');

console.log(file + ': ' + n + ' colours replaced');
const keys = Object.keys(left);
if (keys.length) { console.log('left for the eye:'); keys.sort().forEach(k => console.log('  ' + k + '  lines ' + left[k].join(', '))); }
if (!dry) fs.writeFileSync(path.join(root, file), out);
