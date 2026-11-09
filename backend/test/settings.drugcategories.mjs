// Drug categories as data (the clinic's manager, 2026-11-09, from the site; migration 060).
// Run against an ISOLATED stack only - it creates categories and a drug:
//
//   SE_ADMIN_PW=... node backend/test/settings.drugcategories.mjs     (default http://127.0.0.1:9187)
//
// Checks: the eighteen seeded keys are there (the seventeen the screens knew plus
// Anesthetic), 'Other' last, every drug's category is a known key; a category is added
// (key from its English name, numbered when taken), renamed (names in three languages,
// French required, a duplicate name refused), hidden and shown, put in order, removed when
// empty and refused (409, with the number) when a drug carries it; 'Other' can be neither
// hidden nor removed; a drug saved with an unknown category is refused (400) and with a
// hidden one accepted; every write goes to the change log; no settings permission -> 403 on
// every write, reading stays open to anyone signed in. Node 18+. Exit code 1 on failure.
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
const tag = 'ZZ' + crypto.randomBytes(3).toString('hex').toUpperCase();
const cats = async () => (await call('GET', '/admin/drug-categories', null, A)).data;
const logLines = async (key) => ((await call('GET', '/admin/audit?action=settings.drug.category&limit=200', null, A)).data.rows || [])
  .filter(r => String(r.entity_id) === String(key));

// ── after the migration ──
let c = await cats();
const seeded = ['Analgesic', 'Anesthetic', 'Antibiotic', 'Antihistamine', 'Antimalarial', 'Antiparasitic', 'Cardiovascular', 'Corticosteroid',
  'Dermatology', 'Endocrine', 'GI', 'Gynecology', 'Musculoskeletal', 'Ophthalmic', 'Respiratory', 'Urology', 'Vitamin', 'Other'];
check('the eighteen seeded keys are there', seeded.every(k => c.some(x => x.key === k)), c.map(x => x.key));
check("'Other' comes last and is fixed", c[c.length - 1].key === 'Other' && c[c.length - 1].fixed === true, c[c.length - 1]);
check('Anesthetic is named in three languages', (() => { const a = c.find(x => x.key === 'Anesthetic'); return a && a.name_fr === 'Anesthésie' && a.name_ko === '마취제' && a.name_en === 'Anesthetic'; })(), c.find(x => x.key === 'Anesthetic'));
check('rows come in their order', c.map(x => x.sort_order).every((v, i, a) => i === 0 || a[i - 1] <= v), c.map(x => x.sort_order));
check('every row says how many drugs carry it', c.every(x => typeof x.drug_count === 'number'), c[0]);
const drugs = (await call('GET', '/admin/drugs', null, A)).data;
const keys = new Set(c.map(x => x.key));
check("every drug's category is a known key (or empty)", drugs.every(d => !d.category || keys.has(d.category)), drugs.filter(d => d.category && !keys.has(d.category)).map(d => d.code + ':' + d.category));

// ── add ──
let r = await call('POST', '/admin/drug-categories', { name_fr: 'Soins de plaie ' + tag, name_ko: '상처 처치 ' + tag, name_en: 'Wound care ' + tag }, A);
check('a category is added (201)', r.status === 201 && r.data.key, r);
const K1 = r.data.key;
check('its key comes from the English name, plain letters', K1 === 'Wound_care_' + tag, K1);
check('a new category goes before Other', (await cats()).findIndex(x => x.key === K1) === (await cats()).length - 2, (await cats()).map(x => x.key));
r = await call('POST', '/admin/drug-categories', { name_fr: 'Soins de plaie ' + tag, name_en: 'Something else ' + tag }, A);
check('the same name again (any language) is refused (409)', r.status === 409, r);
r = await call('POST', '/admin/drug-categories', { name_ko: '이름만 한국어' }, A);
check('no French name -> 400', r.status === 400, r);
r = await call('POST', '/admin/drug-categories', { name_fr: 'Pansement ' + tag }, A);
check('French only is enough (201); key from the French name', r.status === 201 && r.data.key === 'Pansement_' + tag && r.data.name_en === null, r.data);
const K2 = r.data.key;
r = await call('POST', '/admin/drug-categories', { name_fr: 'Pansements ' + tag, name_en: 'Pansement ' + tag }, A);
check('a key already taken is numbered', r.status === 201 && r.data.key === 'Pansement_' + tag + '_2', r.data);
const K3 = r.data.key;
check('adding is in the change log', (await logLines(K1)).length === 1, await logLines(K1));

// ── rename, hide, show ──
r = await call('PUT', '/admin/drug-categories/' + K1, { name_fr: 'Soins des plaies ' + tag, name_ko: '', name_en: 'Wound care ' + tag }, A);
check('renamed; an emptied Korean name is stored as null', r.status === 200 && r.data.name_fr === 'Soins des plaies ' + tag && r.data.name_ko === null && r.data.key === K1, r.data);
r = await call('PUT', '/admin/drug-categories/' + K1, { name_fr: 'Pansement ' + tag }, A);
check("renaming to another row's name is refused (409)", r.status === 409, r);
r = await call('PUT', '/admin/drug-categories/' + K1, { name_fr: '' }, A);
check('an empty French name is refused (400)', r.status === 400, r);
r = await call('PUT', '/admin/drug-categories/' + K1, { is_hidden: true }, A);
check('hidden', r.status === 200 && r.data.is_hidden === true, r.data);
r = await call('PUT', '/admin/drug-categories/' + K1, { is_hidden: false }, A);
check('shown again', r.status === 200 && r.data.is_hidden === false, r.data);
check('rename, hide and show are in the change log (4 lines)', (await logLines(K1)).length === 4, (await logLines(K1)).length);
r = await call('PUT', '/admin/drug-categories/Other', { is_hidden: true }, A);
check("'Other' cannot be hidden (400)", r.status === 400, r);
r = await call('PUT', '/admin/drug-categories/Other', { name_fr: 'Autres' }, A);
check("'Other' can be renamed", r.status === 200 && r.data.name_fr === 'Autres', r.data);
await call('PUT', '/admin/drug-categories/Other', { name_fr: 'Autre' }, A);
r = await call('PUT', '/admin/drug-categories/NoSuchKey' + tag, { name_fr: 'x' }, A);
check('an unknown key -> 404', r.status === 404, r);

// ── order ──
c = await cats();
const order = c.map(x => x.key); const i1 = order.indexOf(K1), i2 = order.indexOf(K2);
order[i1] = K2; order[i2] = K1;
r = await call('PUT', '/admin/drug-categories/order', { keys: order }, A);
check('the order is saved and returned', r.status === 200 && r.data.map(x => x.key).join() === order.join(), r.data && r.data.map(x => x.key));
r = await call('PUT', '/admin/drug-categories/order', { keys: order.slice(1) }, A);
check('an order that misses a key is refused (400)', r.status === 400, r);

// ── a drug and its category ──
const code = 'ZT' + tag;
r = await call('POST', '/admin/drugs', { code, name: 'Test ' + tag, category: 'Nope' + tag, unit_price: 0 }, A);
check('a drug with an unknown category is refused (400)', r.status === 400, r);
r = await call('POST', '/admin/drugs', { code, name: 'Test ' + tag, category: K1, unit_price: 0 }, A);
check('a drug with a new category is saved', r.status === 201 && r.data.category === K1, r);
const drugId = r.data.id;
await call('PUT', '/admin/drug-categories/' + K1, { is_hidden: true }, A);
r = await call('PUT', '/admin/drugs/' + drugId, { code, name: 'Test ' + tag, category: K1, unit_price: 0 }, A);
check('a drug keeps a hidden category on save', r.status === 200 && r.data.category === K1, r);
r = await call('PUT', '/admin/drugs/' + drugId, { code, name: 'Test ' + tag, category: '', unit_price: 0 }, A);
check('an emptied category is allowed (stored null)', r.status === 200 && r.data.category === null, r);
await call('PUT', '/admin/drugs/' + drugId, { code, name: 'Test ' + tag, category: K1, unit_price: 0 }, A);
check('the row counts its drug', (await cats()).find(x => x.key === K1).drug_count === 1, (await cats()).find(x => x.key === K1));

// ── remove ──
r = await call('DELETE', '/admin/drug-categories/' + K1, null, A);
check('a category on a drug is not removed (409, with the number)', r.status === 409 && r.data.drug_count === 1 && /1 drug/.test(r.data.error), r);
r = await call('DELETE', '/admin/drug-categories/Other', null, A);
check("'Other' is not removed (400)", r.status === 400, r);
r = await call('DELETE', '/admin/drug-categories/' + K3, null, A);
check('an empty category is removed', r.status === 200 && !(await cats()).some(x => x.key === K3), r);
check('removing is in the change log', (await logLines(K3)).length === 2, (await logLines(K3)).length);

// ── permissions ──
const sid = 'zz' + tag.toLowerCase();
r = await call('POST', '/admin/staff', { login_id: sid, password: 'test1234', name: 'No settings ' + tag, role: 'pharmacy', permissions: ['pharmacy'] }, A);
const S = (await call('POST', '/auth/login', { login_id: sid, password: 'test1234' })).data.token;
check('an account without the settings permission signs in', !!S, r);
if (S) {
  r = await call('GET', '/admin/drug-categories', null, S);
  check('reading is open to anyone signed in', r.status === 200 && Array.isArray(r.data), r.status);
  for (const [m, p, b] of [['POST', '/admin/drug-categories', { name_fr: 'x' + tag }], ['PUT', '/admin/drug-categories/' + K2, { name_fr: 'y' + tag }],
    ['PUT', '/admin/drug-categories/order', { keys: [] }], ['DELETE', '/admin/drug-categories/' + K2, null]]) {
    r = await call(m, p, b, S);
    check('no settings permission -> 403 on ' + m + ' ' + p.replace(tag, '…'), r.status === 403, r.status);
  }
}

// ── tidy up ──
await call('DELETE', '/admin/drugs/' + drugId, null, A);
await call('PUT', '/admin/drugs/' + drugId, { category: 'Other' }, A);
for (const k of [K1, K2]) await call('DELETE', '/admin/drug-categories/' + k, null, A);
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
