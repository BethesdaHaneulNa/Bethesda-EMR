// Proof by substitution that a screen file's dark colours did not change.
//   node check-dark.mjs <git ref of the old version> <path from the repo root>
//   node check-dark.mjs develop frontend/src/components/TopBar.jsx
// Every var(--token) in the new file is replaced by the token's dark value; the result
// must then be the old file, character for character. Lines that still differ are
// printed "to read by eye" - they should only be imports and the few places where the
// code builds a colour from parts. This reaches what a walk through the running screens
// cannot: closed dialogs, error states, rare branches.
// (design session - tooling only, not part of the app)
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dark } from './tokens.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [ref, file] = process.argv.slice(2);
const norm = s => s.replace(/\r\n/g, '\n');
const oldText = norm(execSync('git show ' + ref + ':' + file, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }));
const newRaw = norm(fs.readFileSync(path.join(root, file), 'utf8'));
const D = dark(); const unknown = new Set(); let tokens = 0;
const newText = newRaw.replace(/var\(--([a-z0-9-]+)\)/g, (m, n) => { if (!(n in D)) { unknown.add(n); return m; } tokens++; return D[n]; });
// a var() the old file already had (the motion variables) is not ours; any other unknown name is a mistake
const mine = [...unknown].filter(n => oldText.indexOf('var(--' + n + ')') < 0);
if (mine.length) { console.log('UNKNOWN TOKENS: ' + mine.join(', ')); process.exit(1); }
// colours compare without regard to case; #fff and #ffffff are the same colour
const canon = s => s.replace(/rgba?\([^)]*\)/g, m => m.replace(/\s+/g, '').replace(/,\.(\d+)\)/, ',0.$1)')).replace(/#[0-9a-fA-F]{3,8}\b/g, h => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; });
const a = canon(oldText).split('\n'), b = canon(newText).split('\n');
let same = 0, i = 0, j = 0; const diff = [];
while (i < a.length || j < b.length) {
  if (i < a.length && j < b.length && a[i] === b[j]) { same++; i++; j++; continue; }
  const k = i < a.length ? b.indexOf(a[i], j) : -1;
  if (k >= 0 && k - j < 40) { while (j < k) diff.push('+ ' + (j + 1) + ': ' + b[j++].trim()); continue; }
  if (i < a.length && j < b.length) { // a changed line: show only the part that differs
    const x = a[i], y = b[j]; let p = 0; while (p < x.length && p < y.length && x[p] === y[p]) p++;
    let q = 0; while (q < x.length - p && q < y.length - p && x[x.length - 1 - q] === y[y.length - 1 - q]) q++;
    const from = Math.max(0, p - 30);
    diff.push('- ' + (i + 1) + ': …' + x.slice(from, x.length - q + 12)); diff.push('+ ' + (j + 1) + ': …' + y.slice(from, y.length - q + 12));
  } else {
    if (i < a.length) diff.push('- ' + (i + 1) + ': ' + a[i].trim());
    if (j < b.length) diff.push('+ ' + (j + 1) + ': ' + b[j].trim());
  }
  i++; j++;
}
const left = (newRaw.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []);
console.log(file + ': ' + same + ' of ' + a.length + ' lines identical after substitution · ' + tokens + ' tokens · ' + left.length + ' colours still written out · ' + diff.length + ' lines to read by eye');
if (left.length) console.log('  still written out: ' + [...new Set(left)].join(' '));
diff.forEach(d => console.log('  ' + d.slice(0, 600)));
