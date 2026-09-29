// Saving a drug must not write back stale stock (pharmacy H4). Run against an
// ISOLATED stack only - it creates a test drug and changes its stock:
//
//   SE_ADMIN_PW=... node backend/test/settings.drugs.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_ID=admin SE_ADMIN_PW=... node backend/test/settings.drugs.mjs
//
// SE_ADMIN_ID / SE_ADMIN_PW: an account with the settings permission on that stack.
// "Meanwhile" changes are made by a second save that knows the current stock, which
// takes the same row lock dispensing does. Needs Node 18+. Exit code 1 if any check fails.
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
const made = await call('POST', '/admin/drugs', { code, name: 'H4 test drug', category: 'Other', unit_price: 100, stock_qty: 100, min_stock: 10 }, T);
check('create test drug with stock 100', made.status === 201 && made.data.stock_qty === 100, made);
const id = made.data.id;
const row = { ...made.data };            // what an edit window opened now would hold
const stockNow = async () => (await call('GET', '/admin/drugs?q=' + code, null, T)).data.find(d => d.id === id).stock_qty;

// Someone else moves the stock to 70 (a dispense, or another admin who saw 100).
let r = await call('PUT', '/admin/drugs/' + id, { ...row, stock_qty: 70, stock_expected: 100 }, T);
check('meanwhile: stock 100 -> 70 by someone who saw 100', r.status === 200 && r.data.stock_qty === 70, r);

// The window opened at 100 fixes only the price: no stock_qty sent.
r = await call('PUT', '/admin/drugs/' + id, { ...row, unit_price: 150, stock_qty: undefined, stock_expected: 100 }, T);
check('price-only save keeps the 70 (was written back to 100 before)', r.status === 200 && r.data.stock_qty === 70 && Number(r.data.unit_price) === 150, r);

// Same, but a client that still sends the unchanged stock it loaded.
r = await call('PUT', '/admin/drugs/' + id, { ...row, unit_price: 160, stock_qty: 100, stock_expected: 100 }, T);
check('unchanged stock sent along is ignored, 70 kept', r.status === 200 && r.data.stock_qty === 70, r);

// The window opened at 100 edits the stock to 120: it changed meanwhile -> ask again.
r = await call('PUT', '/admin/drugs/' + id, { ...row, unit_price: 170, stock_qty: 120, stock_expected: 100 }, T);
check('stock edit over a stock that moved -> 409, nothing saved', r.status === 409 && r.data.current === 70, r);
const after409 = await call('GET', '/admin/drugs?q=' + code, null, T);
const d409 = after409.data.find(d => d.id === id);
check('...price not saved either, stock still 70', d409.stock_qty === 70 && Number(d409.unit_price) === 160, d409);

// Reopened (sees 70) and saves 120: goes through.
r = await call('PUT', '/admin/drugs/' + id, { ...row, stock_qty: 120, stock_expected: 70 }, T);
check('stock edit after seeing the current value -> saved', r.status === 200 && r.data.stock_qty === 120, r);

// A screen from before this change sends no stock_expected: written as sent.
r = await call('PUT', '/admin/drugs/' + id, { ...row, stock_qty: 50 }, T);
check('old screen without stock_expected -> written as before', r.status === 200 && r.data.stock_qty === 50, r);

r = await call('PUT', '/admin/drugs/' + id, { ...row, stock_qty: 7.5, stock_expected: 50 }, T);
check('fractional stock -> 400 (was a database error)', r.status === 400, r);
r = await call('PUT', '/admin/drugs/999999999', { ...row, stock_qty: 1, stock_expected: 0 }, T);
check('unknown drug -> 404', r.status === 404, r);
check('stock still 50 at the end', (await stockNow()) === 50, await stockNow());

await call('DELETE', '/admin/drugs/' + id, null, T);    // deactivates the test drug
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
