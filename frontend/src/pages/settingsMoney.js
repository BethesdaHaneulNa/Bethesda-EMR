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
