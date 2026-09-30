// Builds the theme CSS for the light-theme mockups from the tokenized snapshots in ./snaps.
// Dark = the original values, untouched. Light A/B/C = mapped by role. Run: node themes.mjs && node build.mjs
// (design session, 2026-09-29 - mockup tooling only, not part of the app)
import fs from 'fs';

// ── colour maths ──
export const rgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
export const hex = c => c.map(v => ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2)).join('');
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const chroma = c => (Math.max(...c) - Math.min(...c)) / 255;
const isColored = h => chroma(rgb(h)) >= 0.2;
const over = (top, a, base) => top.map((v, i) => v * a + base[i] * (1 - a));
function toHsl(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function fromHsl(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return s === 0 ? [l * 255, l * 255, l * 255] : [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
// darken (or lighten) a colour along L until it reaches the wanted contrast on bg
function reach(c, bg, want, dir) { let [h, s, l] = toHsl(c); let out = c; for (let i = 0; i < 100 && contrast(out, bg) < want; i++) { l += dir * 0.01; if (l < 0 || l > 1) break; out = fromHsl(h, s, l); } return out; }

// ── themes ──
export const THEMES = {
  A: {
    name: '맑은 흰색', scheme: 'light',
    bg: { '0c0f16': 'e3e8ef', '0f1117': 'eff2f7', '11141c': 'f8fafc', '11151f': 'ffffff', '13161f': 'ffffff', '161a26': 'f3f5f9', '1a1f2e': 'e8ecf2', '141824': 'dfe5ee', '1e2433': 'e3e8ef', '232838': 'd5dbe4', '2a3142': 'c5cdd9', '334155': 'd5dbe4', '374151': 'd5dbe4' },
    field: 'ffffff',
    bd: { '1e2433': 'e1e6ee', '232838': 'd5dbe4', '2a3142': 'c3cbd7', '334155': 'c3cbd7', '374151': 'c3cbd7' },
    fieldBd: '8793a6',
    fg: { 'ffffff': '0b1220', 'f8fafc': '0b1220', 'f1f5f9': '0b1220', 'e2e8f0': '1b2534', 'cbd5e1': '2c3a4d', '94a3b8': '4a5668', '64748b': '596578', '475569': '667286', '334155': '9aa5b5' },
  },
  B: {
    name: '따뜻한 종이색', scheme: 'light',
    bg: { '0c0f16': 'e6dfd0', '0f1117': 'f3efe6', '11141c': 'faf7f0', '11151f': 'fffdf8', '13161f': 'fffdf8', '161a26': 'f1ece1', '1a1f2e': 'e9e3d6', '141824': 'e1dacb', '1e2433': 'e8e2d5', '232838': 'd8d0bf', '2a3142': 'cbc2ae', '334155': 'd8d0bf', '374151': 'd8d0bf' },
    field: 'ffffff',
    bd: { '1e2433': 'e6dfd0', '232838': 'd8d0bf', '2a3142': 'c9c0ac', '334155': 'c9c0ac', '374151': 'c9c0ac' },
    fieldBd: '8f8672',
    fg: { 'ffffff': '17140f', 'f8fafc': '17140f', 'f1f5f9': '17140f', 'e2e8f0': '26221b', 'cbd5e1': '3a342a', '94a3b8': '544d40', '64748b': '635b4c', '475569': '6e6656', '334155': 'a59c88' },
  },
  C: {
    name: '또렷한 흰색', scheme: 'light', darkTop: true,
    bg: { '0c0f16': 'e6e9ee', '0f1117': 'ffffff', '11141c': 'ffffff', '11151f': 'ffffff', '13161f': 'ffffff', '161a26': 'f1f3f6', '1a1f2e': 'e6e9ee', '141824': 'dde1e8', '1e2433': 'e6e9ee', '232838': 'c9ced6', '2a3142': 'aab2be', '334155': 'c9ced6', '374151': 'c9ced6' },
    field: 'ffffff',
    bd: { '1e2433': 'cfd4dc', '232838': 'b4bbc7', '2a3142': '98a1af', '334155': '98a1af', '374151': '98a1af' },
    fieldBd: '5b6472',
    fg: { 'ffffff': '000000', 'f8fafc': '000000', 'f1f5f9': '000000', 'e2e8f0': '0a0d12', 'cbd5e1': '161c26', '94a3b8': '333c48', '64748b': '434c59', '475569': '4d5663', '334155': '8a93a1' },
  },
};
export const ACCENTS = { blue: null, teal: 186, indigo: 243 };
// the blue family of the current design (hue 205..235) is the accent
function accentShift(c, accent) { const target = ACCENTS[accent]; if (target == null) return c; const [h, s, l] = toHsl(c); if (chroma(c) < 0.2 || h < 205 || h > 236) return c; return fromHsl(target, Math.min(s, 0.78), target === 186 ? l * 0.86 : l); }

export function parseVar(name) {
  const m = /^--k-([0-9a-f]{6})([0-9a-f]{2})?-(bgf|bg|fg|bdf|bd|sh)-(?:t([0-9a-f]{6,8}|x)-)?on-(.+)$/.exec(name);
  if (!m) throw new Error('bad var ' + name);
  return { name, hex: m[1], a: m[2] ? parseInt(m[2], 16) / 255 : 1, kind: m[3], text: m[4], chain: m[5].split('_') };
}
const neutralBg = (T, h) => T.bg[h] || hex(fromHsl(toHsl(rgb(h))[0], 0.15, 1 - toHsl(rgb(h))[2] * 0.6));
function layer(T, key, accent) { // one background layer of the chain → [rgb, alpha]
  const h = key.slice(0, 6), a = key.length > 6 ? parseInt(key.slice(6), 16) / 255 : 1;
  if (isColored(h)) return [accentShift(rgb(h), accent), a < 1 ? Math.min(1, a * 1.5) : 1];
  return [rgb(neutralBg(T, h)), a];
}
function surface(T, chain, accent) { // composite the chain, base last
  let c = null; for (let i = chain.length - 1; i >= 0; i--) { const [col, a] = layer(T, chain[i], accent); c = c ? over(col, a, c) : col; } return c;
}
const darkSurface = chain => { let c = null; for (let i = chain.length - 1; i >= 0; i--) { const k = chain[i], col = rgb(k.slice(0, 6)), a = k.length > 6 ? parseInt(k.slice(6), 16) / 255 : 1; c = c ? over(col, a, c) : col; } return c; };

// → { css: 'rgba(...)' or '#hex', solid: rgb used for contrast, bg: rgb behind it }
export function value(themeKey, v, accent) {
  const orig = rgb(v.hex);
  const css = (c, a) => a >= 1 ? '#' + hex(c) : 'rgba(' + c.map(Math.round).join(',') + ',' + (+a.toFixed(3)) + ')';
  if (themeKey === 'dark') { const bg = darkSurface(v.chain); return { css: css(orig, v.a), solid: over(orig, v.a, bg), bg }; }
  const T = THEMES[themeKey];
  const base = v.chain[v.chain.length - 1].slice(0, 6);
  const bg = surface(T, v.chain, accent);
  const onFill = isColored(base);
  if (onFill) { // sits on a coloured band or button: keep it, but a filled button darkens until its light text reads
    let c = accentShift(orig, accent);
    if ((v.kind === 'bg' || v.kind === 'bgf') && v.a >= 1 && isColored(v.hex) && v.text && v.text !== 'x' && lum(rgb(v.text.slice(0, 6))) > 0.5) c = reach(c, rgb(v.text.slice(0, 6)), 4.6, -1);
    let b = bg;
    if (v.kind === 'fg' && lum(c) > 0.5 && v.chain[0].length === 6 && isColored(v.chain[0])) b = reach(accentShift(rgb(v.chain[0]), accent), c, 4.6, -1);
    return { css: css(c, v.a), solid: over(c, v.a, b), bg: b };
  }
  if (v.kind === 'bg' || v.kind === 'bgf') {
    if (isColored(v.hex)) {
      let c = accentShift(orig, accent);
      if (v.a < 1) { const a = Math.min(1, v.a * 1.5); return { css: css(c, a), solid: over(c, a, bg), bg }; }
      // a filled button: its text must read on it
      if (v.text && v.text !== 'x') { const t = rgb(v.text.slice(0, 6)); if (lum(t) > 0.5) c = reach(c, t, 4.6, -1); }
      return { css: css(c, 1), solid: c, bg };
    }
    const c = rgb(v.kind === 'bgf' ? T.field : (v.hex === '0f1117' && base !== '0f1117' ? T.field : neutralBg(T, v.hex)));
    return { css: css(c, v.a), solid: over(c, v.a, bg), bg };
  }
  if (v.kind === 'bd' || v.kind === 'bdf') {
    if (isColored(v.hex)) { const c = accentShift(orig, accent); const a = v.a < 1 ? Math.min(1, v.a * 1.7) : 1; const cc = v.a < 1 ? reach(c, [255, 255, 255], 3, -1) : c; return { css: css(cc, a), solid: over(cc, a, bg), bg }; }
    const c = rgb(v.kind === 'bdf' ? T.fieldBd : (T.bd[v.hex] || T.bd['232838'])); return { css: css(c, v.a), solid: over(c, v.a, bg), bg };
  }
  if (v.kind === 'sh') return { css: 'rgba(15,23,42,' + (+(v.a * 0.4).toFixed(3)) + ')', solid: bg, bg };
  // text
  if (isColored(v.hex)) { const c = reach(accentShift(orig, accent), bg, 4.6, -1); return { css: css(c, v.a), solid: c, bg }; }
  let c = rgb(T.fg[v.hex] || T.fg['e2e8f0']);
  if (v.hex !== '334155') c = reach(c, bg, 4.6, -1);
  return { css: css(c, v.a), solid: c, bg };
}

// ── main: read snapshots, mark fields and the top bar, write themes.json ──
if ((process.argv[1] || '').endsWith('themes.mjs')) {
  const snaps = {}; const names = new Set();
  for (const f of fs.readdirSync('snaps').filter(f => f.startsWith('tok_'))) {
    const j = JSON.parse(fs.readFileSync('snaps/' + f, 'utf8'));
    let h = j.html
      .replace(/<(input|textarea|select)\b[^>]*>/g, m => m.replace(/-bg-t/g, '-bgf-t').replace(/-bd-on-/g, '-bdf-on-'))
      .replace(/min-height: 100vh/g, 'min-height: 768px').replace(/calc\((-\d+)px \+ 100vh\)/g, (m, n) => (768 + +n) + 'px')
      .replace(/color-scheme: dark/g, 'color-scheme: var(--scheme)')
      .replace('<div style="background: linear-gradient(135deg, var(--k-1a1f2e', '<div data-zone="top" style="background: linear-gradient(135deg, var(--k-1a1f2e');
    (h.match(/--k-[0-9a-z_-]+/g) || []).forEach(n => names.add(n));
    snaps[f.replace('tok_', '').replace('.json', '')] = h;
  }
  const vars = [...names].sort().map(parseVar);
  const blocks = []; const report = {};
  const block = (sel, tk, accent, scheme) => sel + '{--scheme:' + scheme + ';color-scheme:' + scheme + ';' + vars.map(v => v.name + ':' + value(tk, v, accent).css).join(';') + '}';
  blocks.push(block('.mock', 'dark', 'blue', 'dark'));
  for (const tk of Object.keys(THEMES)) for (const ac of Object.keys(ACCENTS)) {
    blocks.push(block('.mock.t-' + tk + '.a-' + ac, tk, ac, 'light'));
    if (THEMES[tk].darkTop) blocks.push(block('.mock.t-' + tk + '.a-' + ac + ' [data-zone="top"]', 'dark', 'blue', 'dark'));
  }
  // contrast report
  const ROLE = h => ({ 'ffffff': '본문', 'f8fafc': '본문', 'f1f5f9': '본문', 'e2e8f0': '본문', 'cbd5e1': '본문', '94a3b8': '보조', '64748b': '흐린', '475569': '흐린' }[h]) ||
    (isColored(h) ? (() => { const hu = toHsl(rgb(h))[0]; return hu < 20 || hu > 340 ? '빨강' : hu < 60 ? '노랑' : hu < 175 ? '초록' : hu < 200 ? '청록' : hu < 240 ? '파랑' : '보라'; })() : null);
  for (const tk of ['dark', 'A', 'B', 'C']) {
    const r = {}; const add = (k, ratio, what) => { if (!r[k] || ratio < r[k].min) r[k] = { min: +ratio.toFixed(2), what, n: (r[k] ? r[k].n : 0) }; r[k].n = (r[k].n || 0) + 1; };
    for (const v of vars) {
      const base = v.chain[v.chain.length - 1].slice(0, 6);
      if (v.kind === 'fg' && v.hex !== '334155') { const x = value(tk, v, 'blue'); const role = isColored(base) ? '색 띠 위 글자' : ROLE(v.hex); if (role) add(role, contrast(x.solid, x.bg), v.name); }
      if ((v.kind === 'bg' || v.kind === 'bgf') && v.a >= 1 && isColored(v.hex) && v.text && v.text !== 'x') { const x = value(tk, v, 'blue'); add('색 단추 위 글자', contrast(rgb(v.text.slice(0, 6)), x.solid), v.name); }
      if (v.kind === 'bdf') { const x = value(tk, v, 'blue'); const f = tk === 'dark' ? rgb('0f1117') : rgb(THEMES[tk].field); add('입력 칸 테두리', contrast(x.solid, f), v.name); }
    }
    report[tk] = r;
  }
  fs.writeFileSync('themes.json', JSON.stringify({ snaps, css: blocks.join('\n'), report }, null, 0));
  console.log('vars', vars.length, 'css bytes', blocks.join('\n').length);
  for (const tk in report) { console.log('== ' + tk); for (const k in report[tk]) console.log('  ', k.padEnd(12), String(report[tk][k].min).padStart(6), report[tk][k].what); }
}
