// Saving a drug in Settings never changes its stock (2026-09-29), and it saves the
// pack-unit fields (pack_unit / pack_label, 025) without clearing them when left out.
// Stock moves only through the pharmacy's stock record; POST/PUT /api/admin/drugs ignore stock_qty and a
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

// Pack-unit drug (025_pharmacy_pack_unit.sql): pack_unit / pack_label.
check('a new drug is not a pack-unit drug unless asked', made.data.pack_unit === false && made.data.pack_label === null, made.data);
const listed = async () => (await call('GET', '/admin/drugs?q=' + code, null, T)).data.find(d => d.id === id);
r = await call('PUT', '/admin/drugs/' + id, { ...row, pack_unit: true, pack_label: 'tube' }, T);
check('pack_unit true + tube is saved', r.status === 200 && r.data.pack_unit === true && r.data.pack_label === 'tube', r);
const l1 = await listed();
check('GET /admin/drugs returns both fields', l1.pack_unit === true && l1.pack_label === 'tube', l1);
const { pack_unit: _u, pack_label: _l, ...noPack } = row;
r = await call('PUT', '/admin/drugs/' + id, { ...noPack, name: 'Stock test drug 2' }, T);
check('a save without the pack fields leaves them as they are', r.status === 200 && r.data.pack_unit === true && r.data.pack_label === 'tube' && r.data.name === 'Stock test drug 2', r);
r = await call('PUT', '/admin/drugs/' + id, { ...row, pack_unit: false, pack_label: 'tube' }, T);
check('pack_unit false -> label stored empty', r.status === 200 && r.data.pack_unit === false && r.data.pack_label === null, r);
r = await call('PUT', '/admin/drugs/' + id, { ...row, pack_unit: true, pack_label: '' }, T);
check('pack_unit true with no label -> bottle', r.status === 200 && r.data.pack_unit === true && r.data.pack_label === 'bottle', r);
r = await call('PUT', '/admin/drugs/' + id, { ...row, pack_unit: true, pack_label: 'box' }, T);
check('an unknown label -> 400 naming pack_label', r.status === 400 && /^pack_label must be one of/.test(r.data.error), r);
r = await call('PUT', '/admin/drugs/' + id, { ...row, pack_unit: 'yes' }, T);
check('pack_unit that is not true/false -> 400', r.status === 400 && /^pack_unit must be one of/.test(r.data.error), r);
const l2 = await listed();
check('the refused saves changed nothing (still bottle)', l2.pack_unit === true && l2.pack_label === 'bottle', l2);
const code2 = code + 'P';
const made2 = await call('POST', '/admin/drugs', { code: code2, name: 'Pack test syrup', category: 'Other', unit_price: 500, pack_unit: true, pack_label: 'inhaler' }, T);
check('a new pack-unit drug keeps its label', made2.status === 201 && made2.data.pack_unit === true && made2.data.pack_label === 'inhaler' && made2.data.stock_qty === 0, made2);
const made3 = await call('POST', '/admin/drugs', { code: code2 + 'X', name: 'Pack test bad', category: 'Other', unit_price: 1, pack_unit: true, pack_label: 'sachet' }, T);
check('a new drug with an unknown label -> 400, nothing made', made3.status === 400 &&
  !(await call('GET', '/admin/drugs?q=' + code2 + 'X', null, T)).data.length, made3);
if (made2.data && made2.data.id) await call('DELETE', '/admin/drugs/' + made2.data.id, null, T);

await call('DELETE', '/admin/drugs/' + id, null, T);    // hides the test drug
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
