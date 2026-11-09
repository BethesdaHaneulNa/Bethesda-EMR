// Amounts in ariary on the Settings screens (coordinator's decision, 2026-09-30): the
// thousands grouped as the payment and statistics screens do - a no-break space
// (U+00A0) in French, a comma in Korean and English - and no ".00", since the ariary
// has no cents. A value that really has a fraction keeps it (a unit price of 0.50),
// with the language's decimal mark. Only for showing: an input field keeps the plain
// number the person types.
export function seMoney(v, lang) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  if (!isFinite(n)) return String(v);
  var neg = n < 0;
  n = Math.abs(n);
  var whole = Math.floor(n), cents = Math.round((n - whole) * 100);
  if (cents === 100) { whole += 1; cents = 0; }
  var s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? ' ' : ',');
  if (cents) s += (lang === 'fr' ? ',' : '.') + (cents < 10 ? '0' : '') + cents;
  return (neg ? '-' : '') + s;
}

// A stored price as an input field shows it: '15000.00' -> '15000', '0.50' -> '0.5'.
export function seMoneyInput(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isFinite(n) ? n : v;
}

// Any other number on the Settings screens (gigabytes free, hours, counts), with the same
// marks as seMoney - thousands grouped, a decimal comma in French and a point in Korean
// and English - but its fraction as it is: 97.5 -> "97,5" (not "97,50").
export function seNumber(v, lang) {
  if (typeof v !== 'number' || !isFinite(v)) return v == null ? '' : String(v);
  var parts = String(Math.abs(v)).split('.');
  var s = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? '\u00a0' : ',');
  if (parts[1]) s += (lang === 'fr' ? ',' : '.') + parts[1];
  return (v < 0 ? '-' : '') + s;
}
