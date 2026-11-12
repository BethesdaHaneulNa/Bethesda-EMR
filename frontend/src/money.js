// The clinic's money on the screens and the papers (Settings -> Clinic -> Money; the
// clinic row's currency_* and cash_quick, 067).
//
// The clinic's manager, 2026-11-12: "this could not be used in another country" - the
// ariary was written into every screen and receipt. The symbol, its place, the decimals
// and the quick amounts at the till now come from here. LangProvider keeps the current
// one (from /api/auth/setup-status, and what the PC kept from the last visit, so the
// screens do not flash "Ar" while the server is asked); the papers, plain functions
// without a context, read the module's current one.
var POSITIONS = ['after', 'before'];
export var DEFAULT_CURRENCY = { symbol: 'Ar', position: 'after', decimals: 0, quick: [5000, 10000, 20000, 50000] };

// A clinic row, a { symbol, position, decimals, quick } answer, or nothing -> the money.
// Never throws; what cannot be read is the default.
export function readCurrency(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  var symbol = String(raw.symbol != null ? raw.symbol : raw.currency_symbol != null ? raw.currency_symbol : '').trim();
  var position = raw.position != null ? raw.position : raw.currency_position;
  var dec = Number(raw.decimals != null ? raw.decimals : raw.currency_decimals);
  var q = raw.quick != null ? raw.quick : raw.cash_quick;
  var list = [];
  (Array.isArray(q) ? q : String(q == null ? '' : q).split(',')).forEach(function (x) {
    var n = Number(String(x).trim());
    if (isFinite(n) && n > 0 && list.indexOf(n) < 0) list.push(n);
  });
  return {
    symbol: (symbol || DEFAULT_CURRENCY.symbol).slice(0, 8),
    position: POSITIONS.indexOf(position) >= 0 ? position : 'after',
    decimals: dec === 2 ? 2 : 0,
    quick: list.length ? list.slice(0, 6) : DEFAULT_CURRENCY.quick.slice(),
  };
}

var current = DEFAULT_CURRENCY;
try { var kept = localStorage.getItem('medconnect_currency'); if (kept) current = readCurrency(JSON.parse(kept)); } catch (e) { /* the default */ }

export function currentCurrency() { return current; }
export function setCurrentCurrency(c) {
  current = readCurrency(c);
  try { localStorage.setItem('medconnect_currency', JSON.stringify(current)); } catch (e) { /* not kept */ }
  return current;
}

// The number alone. French writes thousands with a space (15 000), Korean and English a
// comma (15,000) - a no-break space so an amount never wraps across two lines. Decimals
// when the money has them (15,50 in French, 15.50 otherwise); none: a whole number.
export function fmtNumber(n, lang, decimals) {
  var d = decimals == null ? current.decimals : decimals;
  var v = Number(n) || 0, neg = v < 0;
  v = Math.abs(v);
  var parts = (d ? v.toFixed(d) : String(Math.round(v))).split('.');
  var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? ' ' : ',');
  return (neg ? '-' : '') + whole + (parts[1] ? (lang === 'fr' ? ',' : '.') + parts[1] : '');
}

// The amount with its symbol: "15 000 Ar", "$ 15.50".
export function formatMoney(n, lang, cur) {
  cur = cur || current;
  var s = fmtNumber(n, lang, cur.decimals);
  return cur.position === 'before' ? cur.symbol + ' ' + s : s + ' ' + cur.symbol;
}
