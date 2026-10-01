// Lab result flags and reference ranges -- pure functions, no database.
//
// Shared on the server (decision 14, 2026-09-29): backend/src/routes/lab.routes.js
// requires this file. The screen cannot import it (the frontend is built from
// frontend/ alone), so it keeps copies:
//   - frontend/src/pages/Lab.jsx       readNumber / normWord / sameText / num / flagFor
//   - frontend/src/pages/Settings.jsx  rangeProblem (lab items tab) = rangeError here
// backend/test/lab.flag.mjs runs both sides on the same cases and fails if they
// differ. Change a rule here, then the copies, then run:
//   node backend/test/lab.flag.mjs
'use strict';

// Read a result value as a number the way the lab staff type it. They work in
// French, where "1,5" means 1.5 and "12 000" means 12000; parseFloat alone reads
// those as 1 and 12, which files a high creatinine as normal. Only the number is
// read this way -- the value is still stored exactly as typed.
// Same rule as readNumber() in frontend/src/pages/Lab.jsx; change both together.
function readNumber(value) {
  if (value === null || value === undefined) return NaN;
  var s = String(value).trim()
    .replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1'); // 12 000 -> 12000
  if ((s.match(/,/g) || []).length === 1) s = s.replace(/(\d),(\d)/, '$1.$2'); // 1,5 -> 1.5
  return parseFloat(s);
}

// The flag rule. Same code as flagFor() in frontend/src/pages/Lab.jsx, which
// colours the value while it is typed -- change both together.
//
// Text results (decision 12, 2026-09-29): an item with a reference text such as
// "Negative" is flagged 'abnormal' when the result says anything else. Only
// spellings of the same word count as the same -- language variants, never a
// different finding. "Trace" is deliberately not listed: whether it is abnormal
// is left to the doctors, and until they say so it is flagged like any other
// difference. Add their exceptions to SAME_WORDS.
var SAME_WORDS = [
  ['negative', 'neg', 'negatif', '-', '음성'],
];
function normWord(v) {
  // strip accents (Négatif -> negatif), then recompose so Korean (음성) stays whole
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .toLowerCase().replace(/[\s.()]/g, '');
}
function sameText(value, refText) {
  var a = normWord(value), b = normWord(refText);
  if (a === b) return true;
  return SAME_WORDS.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
}
function num(v) { return v === null || v === undefined || v === '' ? NaN : parseFloat(v); }

// 'low' | 'high' | 'normal' | 'abnormal' (text) | '' (cannot tell / nothing to compare)
// A value written as "<5" or ">500" is judged by its number only where the
// answer is certain: ">500" with an upper limit of 400 is high, "<5" with no
// lower limit and an upper limit of 40 is normal; otherwise no flag.
function flagFor(value, lo, hi, refText) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  var L = num(lo), H = num(hi), hasL = !isNaN(L), hasH = !isNaN(H);
  var cmp = String(value).trim().match(/^(<=|>=|≤|≥|<|>)\s*(.*)$/);
  var n = readNumber(cmp ? cmp[2] : value);
  if (!isNaN(n) && (hasL || hasH)) {
    if (!cmp) {
      if (hasL && n < L) return 'low';
      if (hasH && n > H) return 'high';
      return 'normal';
    }
    var op = cmp[1], below = op === '<' || op === '<=' || op === '≤', strict = op === '<' || op === '>';
    if (below) {
      if (hasL && (strict ? n <= L : n < L)) return 'low';
      if (!hasL && hasH && n <= H) return 'normal';
      return '';
    }
    if (hasH && (strict ? n >= H : n > H)) return 'high';
    if (!hasH && hasL && n >= L) return 'normal';
    return '';
  }
  if (refText) return sameText(value, refText) ? 'normal' : 'abnormal';
  return '';
}

// ── Reference ranges by sex and age (decision 4, 2026-09-29; table lab_ref_range) ──
// Same checks as rangeError() in the Settings lab items tab -- change both together.
var AGE_DAYS = { d: 1, m: 30.4375, y: 365.25 };   // only to compare bands written in different units
function dateParts(v) { var s = String(v).slice(0, 10).split('-'); return [+s[0], +s[1], +s[2]]; }
// Completed days / months / years between birth and the test day, by the calendar:
// a child is 1 y on its first birthday, so a band edge falls on the birthday itself.
function ageIn(unit, dob, on) {
  var b = dateParts(dob), o = dateParts(on);
  if (unit === 'd') return Math.round((Date.UTC(o[0], o[1] - 1, o[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 86400000);
  var months = (o[0] - b[0]) * 12 + (o[1] - b[1]) - (o[2] < b[2] ? 1 : 0);
  return unit === 'm' ? months : Math.floor(months / 12);
}
function nullInt(v) { return v === null || v === undefined || v === '' ? null : parseInt(v, 10); }
// Does the row apply to this patient? Unknown sex or birth date never matches a row
// that needs it -- the item's default range is used instead of a guess.
function rangeApplies(r, sex, dob, onDate) {
  if (r.sex && r.sex !== sex) return false;
  var lo = nullInt(r.age_min), hi = nullInt(r.age_max);
  if (lo === null && hi === null) return true;
  if (!dob || !onDate) return false;
  var a = ageIn(r.age_unit || 'y', dob, onDate);
  if (a < 0) return false;
  if (lo !== null && a < lo) return false;
  if (hi !== null && a >= hi) return false;
  return true;
}
function rangeLabel(r) {
  var u = r.age_unit || 'y', lo = nullInt(r.age_min), hi = nullInt(r.age_max), age = '';
  if (lo !== null && hi !== null) age = lo + '–' + hi + u;
  else if (lo !== null) age = '≥' + lo + u;
  else if (hi !== null) age = '<' + hi + u;
  return [r.sex || '', age].filter(Boolean).join(' · ') || '*';
}
// The reference to judge a result by: a matching sex-specific row, else a matching
// both-sexes row, else the item's own range (ref_label null).
function refFor(item, ranges, sex, dob, onDate) {
  var mine = (ranges || []).filter(function (r) { return rangeApplies(r, sex, dob, onDate); });
  var r = mine.filter(function (x) { return x.sex; })[0] || mine.filter(function (x) { return !x.sex; })[0];
  if (!r) return { ref_low: item.ref_low, ref_high: item.ref_high, ref_text: item.ref_text, ref_label: null };
  return { ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, ref_label: rangeLabel(r) };
}
// null if the rows of one item are usable, else an English message naming the item.
// Rows of the same sex (or both-sexes rows) may not overlap in age: with two
// candidates nobody could tell which one a result was judged by.
function rangeError(itemName, ranges) {
  var list = ranges || [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i], lo = nullInt(r.age_min), hi = nullInt(r.age_max);
    if (r.sex && r.sex !== 'M' && r.sex !== 'F') return 'Reference range sex must be M or F: ' + itemName;
    if (r.age_unit && !AGE_DAYS[r.age_unit]) return 'Reference range age unit must be d, m or y: ' + itemName;
    if ((lo !== null && (isNaN(lo) || lo < 0)) || (hi !== null && (isNaN(hi) || hi <= 0))) return 'Reference range age is not valid: ' + itemName;
    if (lo !== null && hi !== null && lo >= hi) return 'Reference range age "from" must be below "to": ' + itemName;
    var L = num(r.ref_low), H = num(r.ref_high);
    if (isNaN(L) && isNaN(H) && !String(r.ref_text || '').trim()) return 'Reference range needs a low, a high or a text: ' + itemName;
    if (!isNaN(L) && !isNaN(H) && L > H) return 'Reference range low is above high: ' + itemName;
  }
  function span(r) {
    var f = AGE_DAYS[r.age_unit || 'y'], lo = nullInt(r.age_min), hi = nullInt(r.age_max);
    return [lo === null ? -Infinity : lo * f, hi === null ? Infinity : hi * f];
  }
  for (var a = 0; a < list.length; a++) {
    for (var b = a + 1; b < list.length; b++) {
      if ((list[a].sex || '') !== (list[b].sex || '')) continue;
      var x = span(list[a]), y = span(list[b]);
      if (x[0] < y[1] - 0.5 && y[0] < x[1] - 0.5) return 'Reference ranges overlap: ' + itemName;   // half a day of slack for d/m/y rounding
    }
  }
  return null;
}

// ── the unit list (Settings > Lab test items) ──
// Two units are the same when they differ only by capitals, spaces, or the two
// letters for micro (µ U+00B5 and μ U+03BC look alike). Same rule as the unique
// index of lab_unit (044_lab_units.sql) and as unitKey() in Settings.jsx.
var UNIT_MAX = 30;   // lab_test_item.unit is VARCHAR(30)
function unitName(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function unitKey(v) { return unitName(v).replace(/\u03bc/g, '\u00b5').replace(/ /g, '').toLowerCase(); }
// What is wrong with a list of unit names, as a code the screen translates, or null.
function unitListError(names) {
  var seen = {};
  for (var i = 0; i < names.length; i++) {
    var n = unitName(names[i]);
    if (!n) return 'lab_unit_empty';
    if (n.length > UNIT_MAX) return 'lab_unit_too_long:' + n;
    var k = unitKey(n);
    if (seen[k]) return 'lab_unit_duplicate:' + n;
    seen[k] = true;
  }
  return null;
}

module.exports = {
  UNIT_MAX: UNIT_MAX, unitName: unitName, unitKey: unitKey, unitListError: unitListError,
  readNumber, normWord, sameText, num, flagFor, SAME_WORDS,
  AGE_DAYS, ageIn, nullInt, rangeApplies, rangeLabel, refFor, rangeError,
};
