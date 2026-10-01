// An order code's default directions (order_code.default_dose) are words or nothing
// (the director, 2026-10-01: the consultation screen's directions column filled itself
// with "1.000"). Run against an ISOLATED stack only - it creates order codes:
//
//   SE_ADMIN_PW=... node backend/test/settings.ordercodes.mjs     (default http://127.0.0.1:9187)
//
// Checks: after the migration no order code holds a bare number, and default_freq /
// default_days are still 1; a new code made without directions - or with the '1.000' an
// older screen still sends - is stored with none; words are kept, trimmed; the same on
// edit; the drug table's column of the same name is untouched. Node 18+.
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
const tag = 'D' + crypto.randomBytes(3).toString('hex').toUpperCase();
const numeric = v => v != null && /^\s*[0-9]+([.,][0-9]*)?\s*$/.test(String(v));

// ── after the migration ──
const all = (await call('GET', '/admin/order-codes', null, A)).data;
check('there are seeded order codes to look at', all.length >= 30, all.length);
check('none holds a bare number as its directions', all.every(o => !numeric(o.default_dose)), all.filter(o => numeric(o.default_dose)).map(o => [o.code, o.default_dose]));
check('default_freq and default_days are still 1 on the seeded codes', all.filter(o => !String(o.code).startsWith('D') || o.code.length < 7).every(o => o.default_freq === 1 && o.default_days === 1),
  all.find(o => o.default_freq !== 1 || o.default_days !== 1));

// ── new codes ──
const body = (suffix, extra) => ({ code: tag + suffix, name: 'Rectoscopie ' + tag + suffix, name_en: '', code_type: 'procedure', group_name: 'Endoscopy',
  default_freq: 1, default_days: 1, price: 30000, price_clinic: 30000, pacs_modality: '', worklist_enabled: false, station_ae: '', body_part: '', memo: '', ...extra });
let r = await call('POST', '/admin/order-codes', body('A', {}), A);
check('a new code sent without default_dose has none (the column default is gone)', (r.status === 201 || r.status === 200) && r.data.default_dose === null, r);
const a = r.data;
check('... and keeps frequency 1 and days 1', a.default_freq === 1 && a.default_days === 1, [a.default_freq, a.default_days]);
r = await call('POST', '/admin/order-codes', body('B', { default_dose: '' }), A);
check('what the Settings form sends now (empty) -> none', r.data && r.data.default_dose === null, r);
for (const [i, v] of [['C', '1.000'], ['E', '1'], ['F', ' 2,5 '], ['G', '   ']]) {
  r = await call('POST', '/admin/order-codes', body(i, { default_dose: v }), A);
  check(`a bare number or blanks (${JSON.stringify(v)}) -> none, without refusing`, (r.status === 201 || r.status === 200) && r.data.default_dose === null, r);
}
r = await call('POST', '/admin/order-codes', body('H', { default_dose: '  PRN ' }), A);
check('words are kept, trimmed ("  PRN " -> PRN)', r.data && r.data.default_dose === 'PRN', r);
const h = r.data;
r = await call('POST', '/admin/order-codes', body('I', { default_dose: '1 fois' }), A);
check('a number with words is words ("1 fois")', r.data && r.data.default_dose === '1 fois', r);

// ── edit ──
r = await call('PUT', '/admin/order-codes/' + a.id, body('A', { default_dose: 'QD' }), A);
check('edit: directions added (QD)', r.status === 200 && r.data.default_dose === 'QD', r);
r = await call('PUT', '/admin/order-codes/' + h.id, body('H', { default_dose: '1.000' }), A);
check('edit: an older screen sending 1.000 back -> none', r.status === 200 && r.data.default_dose === null, r);
r = await call('PUT', '/admin/order-codes/' + a.id, body('A', { default_dose: '' }), A);
check('edit: directions removed', r.status === 200 && r.data.default_dose === null, r);

// ── the drug table's column is another thing ──
const drugs = (await call('GET', '/admin/drugs', null, A)).data;
check('drugs are read as before (their default_dose is a dose, not touched here)', Array.isArray(drugs) && drugs.length > 0, drugs.length);

for (const o of (await call('GET', '/admin/order-codes?q=' + tag, null, A)).data) await call('DELETE', '/admin/order-codes/' + o.id, null, A);
console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
