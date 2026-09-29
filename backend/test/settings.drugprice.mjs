// A drug's price change in the change log (the director's decision (나), 2026-09-30,
// wiki/03-change-log.md): one line when the price changes, with the price only - who,
// when, which drug, old -> new. Run against an ISOLATED stack only - it creates a drug
// and a staff account:
//
//   SE_ADMIN_PW=... node backend/test/settings.drugprice.mjs     (default http://127.0.0.1:9187)
//
// Checks: a new drug writes nothing; price only -> 1 line; name only -> 0; the same price
// again (also as "150.00") -> 0; price and name together -> 1 line with the price only;
// a refused save (no settings permission 403, no such drug 404, bad price 400) -> 0.
// Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW');

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

const A = (await call('POST', '/auth/login', { login_id: 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!A) throw new Error('admin login failed');
const tag = 'DP' + crypto.randomBytes(3).toString('hex').toUpperCase();
const lines = async (id) => (await call('GET', '/admin/audit?action=settings.drug.price&limit=200', null, A)).data.rows
  .filter(r => r.entity === 'drug' && String(r.entity_id) === String(id));

// a new drug: no line
const made = await call('POST', '/admin/drugs', { code: tag, name: 'Price test ' + tag, unit_price: 100 }, A);
check('create a drug', made.status === 201 || made.status === 200, made);
const id = made.data.id;
check('a new drug writes no line', (await lines(id)).length === 0, await lines(id));

// the screen sends the whole form; only the price changes
const form = { code: tag, name: 'Price test ' + tag, unit_price: 100 };
let r = await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: 150 }, A);
check('price 100 -> 150 saved', r.status === 200 && Number(r.data.unit_price) === 150, r);
let rows = await lines(id);
check('one line', rows.length === 1, rows);
const one = rows[0] || {};
check('the line: price only, 100 -> 150', JSON.stringify(one.before_value) === '{"unit_price":100}' && JSON.stringify(one.after_value) === '{"unit_price":150}', one);
check('the line: code and name, who, no patient or visit', one.summary === tag + ' Price test ' + tag && one.staff_role === 'admin'
  && one.patient_id === null && one.visit_id === null && one.module === 'settings', one);

// name only
await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: 150, name: 'Price test renamed ' + tag }, A);
check('name only: no new line', (await lines(id)).length === 1, (await lines(id)).length);
// the same price, as a number and as the database writes it
await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: 150 }, A);
await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: '150.00' }, A);
check('the same price again (150, "150.00"): no new line', (await lines(id)).length === 1, (await lines(id)).length);
// a save without the price field keeps it and writes nothing
await call('PUT', '/admin/drugs/' + id, { code: tag, name: 'Price test ' + tag }, A);
check('a save without unit_price: no new line', (await lines(id)).length === 1, (await lines(id)).length);

// price and name together: one line, price only
r = await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: 200, name: 'Price test both ' + tag }, A);
rows = await lines(id);
const both = rows.find(x => x.after_value && x.after_value.unit_price === 200);
check('price and name together: one more line', r.status === 200 && rows.length === 2, rows.length);
check('... with the price only, 150 -> 200', both && Object.keys(both.before_value).join() === 'unit_price' && both.before_value.unit_price === 150
  && Object.keys(both.after_value).join() === 'unit_price', both);

// refused saves write nothing
const login = 'zzdp' + crypto.randomBytes(2).toString('hex');
const pw = crypto.randomBytes(9).toString('base64url');
const st = await call('POST', '/admin/staff', { login_id: login, password: pw, name: 'Price test ' + login, role: 'pharmacy', permissions: ['pharmacy'] }, A);
const P = (await call('POST', '/auth/login', { login_id: login, password: pw })).data.token;
r = await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: 999 }, P);
check('no settings permission: 403, no line', r.status === 403 && (await lines(id)).length === 2, r.status);
r = await call('PUT', '/admin/drugs/99999999', { ...form, unit_price: 999 }, A);
check('no such drug: 404, no line', r.status === 404 && (await lines(99999999)).length === 0, r);
r = await call('PUT', '/admin/drugs/' + id, { ...form, unit_price: -5 }, A);
check('negative price: 400, no line', r.status === 400 && (await lines(id)).length === 2, r);

// the change log refuses to be edited, so the lines stay; the test drug and account are hidden
await call('DELETE', '/admin/drugs/' + id, null, A);
if (st.data && st.data.id) await call('PUT', '/admin/staff/' + st.data.id, { login_id: login, name: 'Price test ' + login, role: 'pharmacy', permissions: ['pharmacy'], status: 'inactive' }, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
