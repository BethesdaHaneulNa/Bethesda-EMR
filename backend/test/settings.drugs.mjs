// Saving a drug in Settings never changes its stock (2026-09-29). Stock moves only
// through the pharmacy's stock record; POST/PUT /api/admin/drugs ignore stock_qty and a
// new drug starts at 0. Run against an ISOLATED stack only - it creates a test drug and
// receives stock for it:
//
//   SE_ADMIN_PW=... node backend/test/settings.drugs.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_ID=admin SE_ADMIN_PW=... node backend/test/settings.drugs.mjs
//
// SE_ADMIN_ID / SE_ADMIN_PW: an account with the settings and pharmacy permissions on that
// stack (the setup admin has both). Needs Node 18+. Exit code 1 if any check fails.
const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
// 9080 is the clinic's running EMR: this script changes stock there.
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW (and SE_ADMIN_ID if not "admin")');

async function call(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; const text = await r.text(); try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

let failed = 0;
function check(label, ok, got) {
  console.log((ok ? '  [ok]   ' : '  [FAIL] ') + label + (ok ? '' : '  -> ' + JSON.stringify(got)));
  if (!ok) failed++;
}

const login = await call('POST', '/auth/login', { login_id: process.env.SE_ADMIN_ID || 'admin', password: process.env.SE_ADMIN_PW });
if (login.status !== 200) throw new Error('login failed: ' + login.status);
const T = login.data.token;

const code = 'ZZT' + Date.now().toString(36).slice(-5).toUpperCase();
const made = await call('POST', '/admin/drugs', { code, name: 'Stock test drug', category: 'Other', unit_price: 100, stock_qty: 100 }, T);
check('a new drug starts at 0, whatever stock_qty says', made.status === 201 && made.data.stock_qty === 0, made);
check('an empty minimum stock gets the default 10', made.data.min_stock === 10, made.data.min_stock);
const id = made.data.id;
const row = { ...made.data };
const stockNow = async () => (await call('GET', '/admin/drugs?q=' + code, null, T)).data.find(d => d.id === id).stock_qty;

let r = await call('POST', '/pharmacy/stock/' + id + '/receive', { qty: 30, memo: 'settings.drugs test' }, T);
check('stock arrives through the pharmacy record: 0 -> 30', r.status === 200 && (await stockNow()) === 30, r);

r = await call('PUT', '/admin/drugs/' + id, { ...row, unit_price: 150, stock_qty: 999 }, T);
check('a save that carries stock_qty is accepted, and the stock is not touched', r.status === 200 && r.data.stock_qty === 30 && Number(r.data.unit_price) === 150, r);

r = await call('PUT', '/admin/drugs/' + id, { ...row, unit_price: 160, stock_qty: 0, stock_expected: 5 }, T);
check('an old screen sending stock_expected is not refused either', r.status === 200 && r.data.stock_qty === 30, r);

r = await call('PUT', '/admin/drugs/' + id, { ...row, min_stock: 7.5 }, T);
check('fractional minimum stock -> 400', r.status === 400, r);
r = await call('PUT', '/admin/drugs/999999999', { ...row }, T);
check('unknown drug -> 404', r.status === 404, r);

const moves = (await call('GET', '/pharmacy/stock/' + id + '/movements', null, T)).data;
const list = Array.isArray(moves) ? moves : (moves && (moves.movements || moves.rows)) || [];
check('the stock record holds only the receive - no "changed outside" line from Settings',
  list.length > 0 && !list.some(m => /outside/i.test(m.memo || '')), list.map(m => m.kind + ':' + (m.memo || '')));
check('stock still 30 at the end', (await stockNow()) === 30, await stockNow());

await call('DELETE', '/admin/drugs/' + id, null, T);    // hides the test drug
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
