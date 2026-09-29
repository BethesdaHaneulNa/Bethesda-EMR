// Puts the module drafts of this folder together into the v1.5.0 entry of CHANGELOG.md.
//
//   node wiki/reference/changelog-1.5.0/assemble.mjs [out.md] [--date 2026-10-..]
//
// Writes the entry to out.md (default: v1.5.0.md beside this file, not tracked) - it does
// not touch CHANGELOG.md. At release the coordinator reads the result and pastes it above
// the v1.4.0 entry.
//
// What it does, and nothing more:
//   - _intro.md opens the entry (written by the coordinator).
//   - each draft follows in the order staff meet the modules; its "## Module" becomes
//     "### Module" and its "### ..." sections become "#### ...".
//   - every draft's "### After updating" is taken out of its module and gathered into one
//     "### After updating" at the end, under the module's name - a clinic updating reads
//     one list, not nine.
// The drafts stay the source: edit them, run this again.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const di = args.indexOf('--date');
const date = di >= 0 ? args[di + 1] : '(date of release)';
const out = args.find((a, i) => !a.startsWith('--') && (di < 0 || i !== di + 1)) || path.join(here, 'v1.5.0.md');

const ORDER = ['reception', 'consultation', 'laboratory', 'pharmacy', 'payment', 'pacs', 'statistics', 'settings', 'design'];

const read = (f) => fs.readFileSync(path.join(here, f), 'utf8').replace(/\r\n/g, '\n').trim();

const body = [];
const after = [];
const missing = [];

for (const id of ORDER) {
  if (!fs.existsSync(path.join(here, id + '.md'))) { missing.push(id); continue; }
  const lines = read(id + '.md').split('\n');
  let name = id;
  const keep = [];
  let inAfter = false;
  const mine = [];
  for (const l of lines) {
    const h2 = /^## (.+)$/.exec(l);
    const h3 = /^### (.+)$/.exec(l);
    if (h2) { name = h2[1].trim(); inAfter = false; keep.push('### ' + name); continue; }
    if (h3) {
      inAfter = /^after updating/i.test(h3[1].trim());
      if (!inAfter) keep.push('#### ' + h3[1].trim());
      continue;
    }
    (inAfter ? mine : keep).push(l);
  }
  body.push(keep.join('\n').replace(/\n{3,}/g, '\n\n').trim());
  const a = mine.join('\n').trim();
  if (a && !/^(nothing|none|rien)\b/i.test(a)) after.push('**' + name + '**\n\n' + a);
}

const intro = fs.existsSync(path.join(here, '_intro.md')) ? read('_intro.md') : '';
const entry = [
  '## v1.5.0 — ' + date,
  intro,
  body.join('\n\n'),
  after.length ? '### After updating\n\n' + after.join('\n\n') : '',
].filter(Boolean).join('\n\n') + '\n';

fs.writeFileSync(out, entry, 'utf8');
console.log('written: ' + out + ' (' + entry.split('\n').length + ' lines, ' + body.length + ' modules, ' + after.length + ' with steps after updating)');
if (missing.length) console.log('missing drafts: ' + missing.join(', '));
