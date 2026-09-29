// How a prescription line reads, for the pharmacy screen and the outside prescription.
// Owned by the pharmacy session; the consultation screen may use the same rules.
//
// The clinic writes prescriptions the Korean way (decision 2026-09-29):
//   dose       = the DAILY total (일총투여), e.g. 3 tablets a day
//   frequency  = how many times a day it is taken, e.g. 3
//   days       = for how many days
//   total_qty  = daily total x days, worked out and stored by the consultation screen
// The total is what is billed and what leaves the stock, so nothing here recomputes
// it: a line without a stored total is shown as missing rather than guessed at.

export function storedTotal(rx) {
  var raw = rx ? rx.total_qty : null;
  if (raw === null || raw === undefined || raw === '') return null;
  var q = parseFloat(raw);
  return isFinite(q) ? q : null;
}

// A total saved before the switch to daily totals was dose x frequency x days, so
// read now it disagrees with its own line ("1 × 3 a day, 5 days (total 45)").
// Same test as the consultation screen: stored total != daily total x days, to
// three decimals. Such lines are left as saved (they were billed and dispensed on
// that figure) and only labelled.
export function isLegacyTotal(rx) {
  var total = storedTotal(rx);
  var daily = parseFloat(rx && rx.dose);
  var days = parseInt(rx && rx.days, 10);
  // A zero total is "missing" (hasTotal), not an old formula.
  if (total === null || total <= 0 || !(daily > 0) || !(days > 0)) return false;
  return Math.round(total * 1000) !== Math.round(daily * days * 1000);
}

// A total that can be dispensed and billed. Zero counts as missing: a line saved
// with the daily total left blank comes out as 0 x days = 0 on the server, and
// would otherwise be dispensed and charged as nothing without a word. Drugs brought
// in from the old stock list start with no default dose, so this is common.
export function hasTotal(rx) {
  var q = storedTotal(rx);
  return q !== null && q > 0;
}

// One intake = daily total / times a day. "clean" when it comes out in whole or half
// tablets; anything else (2 a day in 3 intakes) is shown but flagged for the doctor.
export function perDose(rx) {
  var daily = parseFloat(rx && rx.dose);
  var freq = parseInt(rx && rx.frequency, 10);
  if (!(daily > 0) || !(freq > 0)) return null;
  var per = daily / freq;
  var halves = per * 2;
  return { value: per, clean: Math.abs(halves - Math.round(halves)) < 1e-6 };
}

// 3 -> "3", 0.5 -> "½", 1.5 -> "1½", 0.667 -> "0.67"
export function fmtAmount(n) {
  if (n === null || n === undefined || !isFinite(n)) return '';
  var whole = Math.floor(n + 1e-9);
  var frac = n - whole;
  if (Math.abs(frac) < 1e-6) return String(whole);
  if (Math.abs(frac - 0.5) < 1e-6) return (whole ? String(whole) : '') + '½';
  return String(Math.round(n * 100) / 100);
}

// A unit word only where the drug name says what it is; otherwise the number stands
// alone rather than calling a syrup a tablet.
function unitOf(name) {
  var s = String(name || '');
  if (/\b(tab|tabs|tablet|comprim)/i.test(s)) return { ko: '정', en: 'tab', fr: 'cp' };
  if (/\b(cap|caps|capsule|gélule|gelule)/i.test(s)) return { ko: '캡슐', en: 'cap', fr: 'gél.' };
  if (/\bsachet/i.test(s)) return { ko: '포', en: 'sachet', fr: 'sachet' };
  return null;
}

// « 1 cp × 3 fois/jour pendant 7 jours (total 21) » and the same in ko / en.
// When one intake does not come out in halves the sentence gives the daily amount
// instead of printing 0.67 of a tablet on paper the patient takes away.
export function doseSentence(rx, lang) {
  var l = lang === 'ko' || lang === 'fr' ? lang : 'en';
  var daily = parseFloat(rx && rx.dose);
  var freq = parseInt(rx && rx.frequency, 10);
  var days = parseInt(rx && rx.days, 10);
  if (!(daily > 0) || !(freq > 0) || !(days > 0)) return '';
  var u = unitOf(rx.drug_name);
  var unit = u ? u[l] : '';
  var total = storedTotal(rx);
  var totalText = hasTotal(rx) ? fmtAmount(total) : '—';
  var p = perDose(rx);

  if (p && p.clean) {
    var per = fmtAmount(p.value);
    if (l === 'ko') return '1회 ' + per + unit + ' × 하루 ' + freq + '회, ' + days + '일 (총 ' + totalText + ')';
    if (l === 'fr') return per + (unit ? ' ' + unit : '') + ' × ' + freq + ' fois/jour pendant ' + days + (days === 1 ? ' jour' : ' jours') + ' (total ' + totalText + ')';
    return per + (unit ? ' ' + unit : '') + ' × ' + freq + (freq === 1 ? ' time' : ' times') + '/day for ' + days + (days === 1 ? ' day' : ' days') + ' (total ' + totalText + ')';
  }
  var d = fmtAmount(daily);
  if (l === 'ko') return '하루 ' + d + unit + ', ' + freq + '회로 나눠 ' + days + '일 (총 ' + totalText + ')';
  if (l === 'fr') return d + (unit ? ' ' + unit : '') + ' par jour en ' + freq + ' prises, pendant ' + days + (days === 1 ? ' jour' : ' jours') + ' (total ' + totalText + ')';
  return d + (unit ? ' ' + unit : '') + ' a day in ' + freq + ' doses for ' + days + (days === 1 ? ' day' : ' days') + ' (total ' + totalText + ')';
}
