// Do the lab screen and the server still judge results the same way?
//
//   node backend/test/lab.flag.mjs
//
// The flag rule and the reference-range rules live in backend/src/utils/labFlag.js,
// which the server uses. The screen cannot import a backend file (the frontend is
// built from frontend/ alone), so it keeps copies: flagFor() in pages/Lab.jsx colours
// a value while it is typed, and rangeProblem() in the Settings lab items tab refuses
// overlapping sex/age rows before the server does. If the copies drift, the colour on
// screen disagrees with the flag that is saved, or Settings lets through what the
// server refuses -- nothing fails loudly. This does. No install, server or database
// needed. Exit code 1 on any mismatch.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const require = createRequire(import.meta.url);
const server = require(path.join(root, 'backend/src/utils/labFlag.js'));

function slice(text, from, to, what) {
  const a = text.indexOf(from);
  const b = text.indexOf(to, a + from.length);
  if (a < 0 || b < 0) { console.error('could not find ' + what); process.exit(1); }
  return text.slice(a, b);
}

// ---- the screen's copies ----
const labJsx = fs.readFileSync(path.join(root, 'frontend/src/pages/Lab.jsx'), 'utf8');
const labCode = slice(labJsx, 'function readNumber', 'export default function', 'the flag rule in Lab.jsx');
const screen = new Function(labCode + '\nreturn { flagFor: flagFor };')();

const settingsJsx = fs.readFileSync(path.join(root, 'frontend/src/pages/Settings.jsx'), 'utf8');
const rpCode = slice(settingsJsx, 'function rangeProblem(it){', '\n  }\n', 'rangeProblem in Settings.jsx') + '\n  }';
const t = { lb_errRangeAge: 'age {item}', lb_errRangeEmpty: 'empty {item}', lb_errRangeLowHigh: 'lowhigh {item}', lb_errRangeOverlap: 'overlap {item}' };
const rangeProblem = new Function('t', rpCode + '\nreturn rangeProblem;')(t);

let bad = 0;
function check(label, a, b) {
  if (a !== b) { bad++; console.log('MISMATCH ' + label + ': server ' + JSON.stringify(a) + ' / screen ' + JSON.stringify(b)); }
}

// ---- flags: values x references ----
const values = ['', '  ', '0', '5', '12.5', '1,5', '12 000', '1 234 567', '-2,5', '5.2 H', 'abc',
  '<5', '<3', '<20', '<=5', '≤5', '>500', '>400', '>=400', '≥400', '>300', '>=90', '>100',
  'Positive', 'positive', 'Negative', 'NEGATIVE', 'Négatif', 'negatif', 'Neg', 'neg.', '-', '(-)', '음성', '양성',
  'Trace', 'trace', '1+', '++', '+'];
const refs = [
  [null, null, null], ['4.0', '10.0', null], ['0.6', '1.2', null], ['150', '400', null], ['5', '40', null],
  ['90', null, null], [null, '40', null], ['0', '200', null], [null, null, 'Negative'], [null, null, 'Négatif'],
  ['5.0', '8.0', null], ['', '', ''], [5, 40, null],
];
let n = 0;
for (const v of values) for (const r of refs) {
  n++;
  check('flag ' + JSON.stringify([v].concat(r)), server.flagFor(v, r[0], r[1], r[2]), screen.flagFor(v, r[0], r[1], r[2]));
}

// ---- sex/age rows: refused or not ----
const R = (sex, lo, hi, unit, low, high, text) => ({ sex, age_min: lo, age_max: hi, age_unit: unit, ref_low: low, ref_high: high, ref_text: text });
const rangeCases = [
  [],
  [R('F', 18, '', 'y', 12, 16, '')],
  [R('F', 18, '', 'y', 12, 16, ''), R('M', 18, '', 'y', 13, 17, '')],
  [R('', 0, 6, 'm', 9.5, 13.5, ''), R('', 6, 24, 'm', 10.5, 13.5, '')],
  [R('', 0, 6, 'm', 9.5, 13.5, ''), R('', 5, 24, 'm', 10.5, 13.5, '')],
  [R('', 0, 30, 'd', 1, '', ''), R('', 1, 12, 'm', 1, '', '')],
  [R('', 0, 2, 'm', 1, '', ''), R('', 30, 90, 'd', 1, '', '')],
  [R('F', '', '', 'y', 1, '', ''), R('', '', '', 'y', 1, '', '')],
  [R('', '', '', 'y', 1, '', ''), R('', '', '', 'y', 2, '', '')],
  [R('M', 5, 3, 'y', 1, '', '')],
  [R('M', -1, 3, 'y', 1, '', '')],
  [R('M', '', '', 'y', 5, 3, '')],
  [R('M', '', '', 'y', '', '', '')],
  [R('M', '', '', 'y', '', '', 'Negative')],
  [R('', 18, '', 'y', 12, 16, ''), R('F', 12, 20, 'y', 1, '', '')],
];
for (const rs of rangeCases) {
  n++;
  const s = server.rangeError('Hb', rs) ? 'refused' : 'ok';
  const c = rangeProblem({ name: 'Hb', ranges: rs }) ? 'refused' : 'ok';
  check('ranges ' + JSON.stringify(rs), s, c);
}

// ---- the unit list: which names are "the same unit", and which lists are refused ----
// (Settings checks before the server does; the unique index of lab_unit has the last word.)
const unitCode = slice(settingsJsx, '  function unitName(v){', '  function loadLabUnits', 'unitName/unitKey in Settings.jsx');
const unitProblemCode = slice(settingsJsx, '  function unitProblem(names){', '\n  }\n', 'unitProblem in Settings.jsx') + '\n  }';
const tu = { lb_errUnitEmpty: 'empty', lb_errUnitLong: 'long {u}', lb_errUnitDup: 'dup {u}' };
const screenUnits = new Function('t', unitCode + unitProblemCode + '\nreturn { unitKey: unitKey, unitName: unitName, unitProblem: unitProblem };')(tu);
const unitNames = ['mg/dL', 'MG/DL', ' mg / dL ', 'mg/dl', 'g/dL', 'µmol/L', 'μmol/L', '10^9/L', '10^9 /l',
  '', '   ', '%', 'mL/min/1.73m²', 'x'.repeat(30), 'x'.repeat(31), 'mm / h', null];
for (const u of unitNames) {
  n++;
  check('unit key ' + JSON.stringify(u), server.unitKey(u), screenUnits.unitKey(u));
  check('unit name ' + JSON.stringify(u), server.unitName(u), screenUnits.unitName(u));
}
const kind = function (r) { return !r ? 'ok' : /dup/.test(r) ? 'dup' : /long/.test(r) ? 'long' : 'empty'; };
for (const a of unitNames) for (const b of unitNames) {
  n++;
  const list = [a == null ? '' : a, b == null ? '' : b];
  check('unit list ' + JSON.stringify(list), kind(server.unitListError(list)), kind(screenUnits.unitProblem(list)));
}

// ---- the body of "save the unit list": no list is refused, an empty list is a list ----
const bodies = [
  [undefined, null], [null, null], ['mg/dL', null], [{ 0: 'mg/dL' }, null], [{ units: [] }, null], [0, null],
  [[], []], [['mg/dL', ' g / dL ']], [[{ name: 'U/L' }, 'fL']], [[null]],
];
bodies[7][1] = ['mg/dL', 'g / dL']; bodies[8][1] = ['U/L', 'fL']; bodies[9][1] = [''];
for (const b of bodies) {
  n++;
  check('unit list body ' + JSON.stringify(b[0]), JSON.stringify(b[1]), JSON.stringify(server.unitNamesOf(b[0])));
}

console.log(n + ' cases, ' + bad + ' mismatches');
process.exit(bad ? 1 : 0);
