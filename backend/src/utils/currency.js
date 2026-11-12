// The clinic's money (clinic.currency_*, cash_quick; 067).
//
// The clinic's manager, 2026-11-12, seeing the screens: "this could not be used in another
// country" - the ariary ("Ar") was written into every screen and every receipt. Settings ->
// Clinic -> Money now says the symbol, where it goes, whether amounts have decimals, and
// which amounts make the quick buttons at the till. Everyone reads it (GET /clinic, and
// GET /auth/setup-status before signing in); only the settings permission changes it.
//
// The database keeps what the clinic stores (numeric(12,2)): the setting changes how
// amounts are written, never the amounts.
const POSITIONS = ['after', 'before'];
const DECIMALS = [0, 2];
const DEFAULT = Object.freeze({ symbol: 'Ar', position: 'after', decimals: 0, quick: [5000, 10000, 20000, 50000] });
const SYMBOL_MAX = 8;
const QUICK_MAX = 6;

function readQuick(raw) {
  const list = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
  const out = [];
  list.forEach(x => {
    const n = Number(String(x).trim());
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  });
  return out.length ? out.slice(0, QUICK_MAX) : DEFAULT.quick.slice();
}

// What a clinic row (or nothing) means: never throws, and what cannot be read is the default.
function readCurrency(row) {
  row = row || {};
  const symbol = String(row.currency_symbol == null ? '' : row.currency_symbol).trim();
  return {
    symbol: (symbol || DEFAULT.symbol).slice(0, SYMBOL_MAX),
    position: POSITIONS.includes(row.currency_position) ? row.currency_position : DEFAULT.position,
    decimals: Number(row.currency_decimals) === 2 ? 2 : 0,
    quick: readQuick(row.cash_quick),
  };
}

// What the settings screen sends -> { value: { symbol, position, decimals, quick: '5000,10000' } }
// or { error: 'symbol' | 'position' | 'decimals' | 'quick' }.
function cleanCurrency(body) {
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const symbol = body.symbol == null ? '' : String(body.symbol).trim();
  if (!symbol || symbol.length > SYMBOL_MAX) return { error: 'symbol' };
  const position = body.position == null || body.position === '' ? DEFAULT.position : String(body.position).trim().toLowerCase();
  if (!POSITIONS.includes(position)) return { error: 'position' };
  const decimals = body.decimals == null || body.decimals === '' ? 0 : Number(body.decimals);
  if (!DECIMALS.includes(decimals)) return { error: 'decimals' };
  const q = body.quick;
  const list = (Array.isArray(q) ? q : String(q == null ? '' : q).split(/[,;\s]+/)).map(x => String(x).trim()).filter(Boolean);
  const nums = list.map(Number);
  if (!nums.length || nums.length > QUICK_MAX || nums.some(n => !Number.isFinite(n) || n <= 0 || n > 1e9)) return { error: 'quick' };
  const quick = Array.from(new Set(nums.map(n => Math.round(n * 100) / 100))).sort((a, b) => a - b);
  return { value: { symbol, position, decimals, quick: quick.join(',') } };
}

module.exports = { POSITIONS, DECIMALS, DEFAULT_CURRENCY: DEFAULT, readCurrency, cleanCurrency };
