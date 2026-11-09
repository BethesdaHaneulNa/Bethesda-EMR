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
  if (isPack(rx)) return false;          // its total is a bottle count, not dose x days
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

// Pack-unit line (025_pharmacy_pack_unit.sql): handed out by the bottle, tube or
// inhaler. Since 1.7.16 its total is daily total x days like any line (the clinic's
// manager: « 2 · 1 · 1 means two go out »), always whole; what differs is the word the
// count is said in (« 2 flacons ») and that no intake is worked out from the numbers -
// the instructions are in the sig or memo. Lines from before carry a count written
// apart from their numbers; they are shown as saved. The flag is the one copied onto the
// line when it was written, not the drug's current one.
export function isPack(rx) { return !!(rx && rx.pack_unit); }

var PACK_WORDS = {
  bottle:  { ko: '병',    fr: ['flacon', 'flacons'],         en: ['bottle', 'bottles'] },
  tube:    { ko: '튜브',  fr: ['tube', 'tubes'],             en: ['tube', 'tubes'] },
  inhaler: { ko: '흡입기', fr: ['inhalateur', 'inhalateurs'], en: ['inhaler', 'inhalers'] },
  unit:    { ko: '개',    fr: ['unité', 'unités'],           en: ['unit', 'units'] },
};
// "2병" / "2 flacons" / "2 bottles"; without a count, just the word ("병", "flacon").
export function packWord(rx, lang, n) {
  var l = lang === 'ko' || lang === 'fr' ? lang : 'en';
  var w = PACK_WORDS[(rx && rx.pack_label) || 'unit'] || PACK_WORDS.unit;
  if (n === null || n === undefined || n === '') return l === 'ko' ? w.ko : w[l][0];
  if (l === 'ko') return (rx.pack_label === 'inhaler' ? '흡입기 ' + fmtAmount(n) + '개' : fmtAmount(n) + w.ko);
  return fmtAmount(n) + ' ' + w[l][Number(n) > 1 ? 1 : 0];
}

// One intake = daily total / times a day. "clean" when it comes out in whole or half
// tablets; anything else (2 a day in 3 intakes) is shown but flagged for the doctor.
// Not for pack-unit lines: their dose unit (mL, puffs) is not recorded, so no intake
// is worked out and nothing is flagged.
export function perDose(rx) {
  if (isPack(rx)) return null;
  var daily = parseFloat(rx && rx.dose);
  var freq = parseInt(rx && rx.frequency, 10);
  if (!(daily > 0) || !(freq > 0)) return null;
  var per = daily / freq;
  var halves = per * 2;
  return { value: per, clean: Math.abs(halves - Math.round(halves)) < 1e-6 };
}

// An ordinary line whose times a day are empty (0 or blank). Its total can still be
// there (daily x days), so the pharmacy can dispense, but the label lacks how often.
// Pack-unit lines are left out: their times are instructions only, often "as needed".
export function missingTimes(rx) {
  if (!rx || isPack(rx)) return false;
  return !(parseInt(rx.frequency, 10) > 0);
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

// A unit word only where the drug's form or name says what it is; otherwise the number
// stands alone rather than calling a syrup a tablet. The form (drug.dosage_form, set for
// the drugs imported from the old stock list, migration 034) comes first: their names
// rarely say "Tab" ("Amoxicillin 500mg" is a capsule). A line carries it only when the
// screen's query joins the drug table; without it the name is read as before, so the
// sentences of older prescriptions do not change.
var FORM_UNIT = {
  'Tablet':          { ko: '정', en: 'tab', fr: 'cp' },
  'Capsule':         { ko: '캡슐', en: 'cap', fr: 'gél.' },
  'Powder / Sachet': { ko: '포', en: 'sachet', fr: 'sachet' },
  'Suppository':     { ko: '좌약', en: 'supp.', fr: 'suppo.' },
};
function unitOf(rx) {
  if (rx && rx.dosage_form && FORM_UNIT[rx.dosage_form]) return FORM_UNIT[rx.dosage_form];
  var s = String((rx && rx.drug_name) || '');
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
  if (isPack(rx)) return packSentence(rx, l);
  var daily = parseFloat(rx && rx.dose);
  var freq = parseInt(rx && rx.frequency, 10);
  var days = parseInt(rx && rx.days, 10);
  var u = unitOf(rx);
  var unit = u ? u[l] : '';
  var total = storedTotal(rx);
  var totalText = hasTotal(rx) ? fmtAmount(total) : '—';
  // Times a day left empty (the consultation keeps an empty field empty since
  // 6e11f56): the daily amount and the days still make a total, so say what is known
  // and that the times are to be checked, rather than dropping the sentence.
  if (daily > 0 && days > 0 && !(freq > 0)) {
    var dd = fmtAmount(daily), dw = days === 1;
    if (l === 'ko') return '하루 ' + dd + unit + ', ' + days + '일 (총 ' + totalText + ') — 하루 횟수 확인 필요';
    if (l === 'fr') return dd + (unit ? ' ' + unit : '') + ' par jour pendant ' + days + (dw ? ' jour' : ' jours') + ' (total ' + totalText + ') — nombre de prises à vérifier';
    return dd + (unit ? ' ' + unit : '') + ' a day for ' + days + (dw ? ' day' : ' days') + ' (total ' + totalText + ') — times a day to check';
  }
  if (!(daily > 0) || !(freq > 0) || !(days > 0)) return '';
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

// The doctor did not write how many: say so rather than print a dash.
function missingPackCount(rx, l) {
  var w = PACK_WORDS[(rx && rx.pack_label) || 'unit'] || PACK_WORDS.unit;
  if (l === 'ko') return (rx.pack_label === 'inhaler' ? '흡입기' : w.ko) + ' 수 확인 필요';
  if (l === 'fr') return 'nombre de ' + w.fr[1] + ' à vérifier';
  return 'number of ' + w.en[1] + ' to check';
}

// Pack-unit line: the count handed out, and nothing else - « 2 flacons » / « 2병 ».
// The numbers are the count (1.7.16), so repeating them as a posology would read
// « 2 par jour pendant 1 jour »; the way to take it is in the sig and the memo, which the
// screens and papers print beside the line. A total that is missing or not whole says so.
function packSentence(rx, l) {
  var total = storedTotal(rx);
  if (!(total > 0) || Math.abs(total - Math.round(total)) > 1e-6) return missingPackCount(rx, l);
  return packWord(rx, l, total);
}
