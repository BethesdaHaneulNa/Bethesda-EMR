// Second pass, after retoken.mjs: inside every <input>, <textarea> and <select> tag (and
// in style constants named like an input style) the background and border become the
// field tokens, so that the light screen shows a white box with a border that reads.
// When dark, the field tokens have the same values as what they replace:
//   --field = --bg (#0f1117) · --field-3 = --panel-head (#1a1f2e) · --field-border = --border-2 (#2a3142)
//   node fields.mjs frontend/src/pages/Consultation.jsx [name of a style constant ...]
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [file, ...consts] = process.argv.slice(2);
let s = fs.readFileSync(path.join(root, file), 'utf8');
let n = 0;
function fix(chunk) {
  const before = chunk;
  chunk = chunk
    .replace(/(background(?:Color)?\s*:\s*)'var\(--bg\)'/g, "$1'var(--field)'")
    .replace(/(background(?:Color)?\s*:\s*)(?:'var\(--panel-head\)'|scBg\b)/g, "$1'var(--field-3)'")
    .replace(/'var\(--border-2\)'/g, "'var(--field-border)'")
    .replace(/(solid\s*)var\(--border-2\)/g, '$1var(--field-border)')
    .replace(/'1px solid '\s*\+\s*bd2\b/g, "'1px solid var(--field-border)'")
    .replace(/(\?\s*[a-zA-Z_$][\w$]*\s*:\s*)bd2\b/g, "$1'var(--field-border)'");
  if (chunk !== before) n++;
  return chunk;
}
// tags: from "<input" to the end of the tag ("/>" or ">" not inside braces)
let out = '', i = 0; const re = /<(input|textarea|select)\b/g; let m;
while ((m = re.exec(s))) {
  let j = m.index, depth = 0, end = -1;
  for (let k = j; k < s.length; k++) { const c = s[k]; if (c === '{') depth++; else if (c === '}') depth--; else if (c === '>' && depth === 0 && s[k - 1] !== '=') { end = k + 1; break; } }
  if (end < 0) continue;
  out += s.slice(i, j) + fix(s.slice(j, end)); i = end; re.lastIndex = end;
}
s = out + s.slice(i);
// style constants given by name: var inStyle = {...};
for (const name of consts) {
  s = s.replace(new RegExp('((?:var|const|let)\\s+' + name + '\\s*=\\s*\\{)([^;]*?\\};)', 'g'), (all, a, b) => a + fix(b));
}
fs.writeFileSync(path.join(root, file), s);
console.log(file + ': ' + n + ' inputs or input styles changed to the field tokens');
