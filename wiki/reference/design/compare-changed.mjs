// For a change that is MEANT to alter colours (the dark screen brought up to WCAG AA,
// 2026-09-30): proves that nothing changed except what was decided.
//   node compare-changed.mjs <folder of dumps> <changes.json> [before] [after]
// The dumps are what compare-in-browser.js wrote before and after. changes.json lists the
// tokens whose dark value changed: { "text-3": ["#64748b", "#8793a6"], ... }.
// Every value that differs between a before line and its after line must be one of those
// pairs (old colour -> new colour). Anything else is printed as unexpected.
// The placeholder line of an input and the outline colour are compared the same way.
// (design session - tooling only, not part of the app)
import fs from 'fs';
import path from 'path';

const [dir, changesFile, B = 'before', A = 'after'] = process.argv.slice(2);
const CH = JSON.parse(fs.readFileSync(changesFile, 'utf8'));
const rgbOf = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', '); };
const pairs = new Set(); const used = {};
for (const k of Object.keys(CH)) pairs.add(rgbOf(CH[k][0]) + '>' + rgbOf(CH[k][1]));
const colours = s => (s.match(/rgba?\([^)]*\)/g) || []).map(c => c.replace(/rgba?\(/, '').replace(')', '').split(',').slice(0, 3).map(x => x.trim()).join(', ') + '|' + (c.split(',')[3] || '1').replace(')', '').trim());
let files = 0, lines = 0, changed = 0, bad = 0; const unexpected = {};
for (const f of fs.readdirSync(dir).filter(f => f.startsWith(A + '_') && f.endsWith('.txt')).sort()) {
  const bf = path.join(dir, B + f.slice(A.length)); if (!fs.existsSync(bf)) { console.log('no before for ' + f); bad++; continue; }
  const strip = s => s.split('\n').filter(l => !/^RULE |^HOVERVAR/.test(l));
  const a = strip(fs.readFileSync(path.join(dir, f), 'utf8')), b = strip(fs.readFileSync(bf, 'utf8'));
  files++;
  if (a.length !== b.length) { console.log('DIFFERENT NUMBER OF ELEMENTS ' + f + ': ' + b.length + ' -> ' + a.length); bad++; continue; }
  for (let i = 0; i < a.length; i++) {
    lines++; if (a[i] === b[i]) continue; changed++;
    const x = b[i].split(' | '), y = a[i].split(' | ');
    if (x.length !== y.length || x[0] !== y[0]) { (unexpected['shape: ' + x[0] + ' -> ' + y[0]] = unexpected['shape: ' + x[0] + ' -> ' + y[0]] || []).push(f); bad++; continue; }
    for (let k = 1; k < x.length; k++) {
      if (x[k] === y[k]) continue;
      const cx = colours(x[k]), cy = colours(y[k]);
      const textX = x[k].replace(/rgba?\([^)]*\)/g, 'C'), textY = y[k].replace(/rgba?\([^)]*\)/g, 'C');
      if (textX !== textY || cx.length !== cy.length) { const key = 'value: ' + x[k] + ' -> ' + y[k]; (unexpected[key] = unexpected[key] || []).push(f); bad++; continue; }
      for (let c = 0; c < cx.length; c++) {
        if (cx[c] === cy[c]) continue;
        const [r1, a1] = cx[c].split('|'), [r2, a2] = cy[c].split('|');
        const p = r1 + '>' + r2;
        if (a1 === a2 && pairs.has(p)) { used[p] = (used[p] || 0) + 1; continue; }
        const key = 'colour: rgb(' + r1 + ')' + (a1 !== '1' ? ' a' + a1 : '') + ' -> rgb(' + r2 + ')' + (a2 !== '1' ? ' a' + a2 : ''); (unexpected[key] = unexpected[key] || []).push(f + ' ' + x[0]); bad++;
      }
    }
  }
}
console.log(files + ' screen states, ' + lines + ' elements, ' + changed + ' elements with a changed colour');
console.log('decided changes seen:');
for (const k of Object.keys(CH)) { const p = rgbOf(CH[k][0]) + '>' + rgbOf(CH[k][1]); console.log('  ' + (used[p] ? String(used[p]).padStart(6) : ' never') + '  ' + CH[k][0] + ' -> ' + CH[k][1] + '  ' + k); }
const u = Object.keys(unexpected);
if (u.length) { console.log('UNEXPECTED (' + u.length + ' kinds):'); u.forEach(k => console.log('  ' + k + '   x' + unexpected[k].length + '  first in ' + unexpected[k][0])); }
else console.log('nothing unexpected: every changed colour is one of the decided pairs');
process.exit(u.length ? 1 : 0);
