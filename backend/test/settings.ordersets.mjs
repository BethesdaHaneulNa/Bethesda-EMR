// Order sets: the number of bottles/tubes on a pack-unit drug line (2026-09-29). The
// consultation screen prescribes that many when the set is applied. Run against an
// ISOLATED stack only - it marks a drug and creates order sets. The route is the
// consultation session's (orderset.routes.js); this checks only what the Settings
// editor relies on. Whole numbers of at least 1 are checked by the editor itself:
//
//   SE_ADMIN_PW=... node backend/test/settings.ordersets.mjs          (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.ordersets.mjs
//
// Needs a syrup and a tablet among the drugs (the example drugs have both). Node 18+.
// Exit code 1 if any check fails.
const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
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
const T = (await call('POST', '/auth/login', { login_id: process.env.SE_ADMIN_ID || 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!T) throw new Error('admin login failed');

const drugs = (await call('GET', '/admin/drugs', null, T)).data;
const syrup = drugs.find(d => /syrup/i.test(d.name));
const tab = drugs.find(d => /tab/i.test(d.name) && !d.pack_unit);
if (!syrup || !tab) throw new Error('needs a syrup and a tablet among the drugs');
const wasPack = { pack_unit: syrup.pack_unit, pack_label: syrup.pack_label };
await call('PUT', '/admin/drugs/' + syrup.id, { ...syrup, pack_unit: true, pack_label: 'bottle' }, T);
const line = (d, q) => ({ kind: 'drug', drug_id: d.id, code: d.code, name: d.name, dose: d.default_dose,
  frequency: d.default_freq, days: d.default_days, route: d.default_route, quantity: q });
const name = 'ZZ pack set ' + Date.now().toString(36);
const get = async (id) => (await call('GET', '/order-sets/' + id, null, T)).data;

let r = await call('POST', '/order-sets', { name, items: [line(syrup, 3), line(tab, 1)] }, T);
check('a set with 3 bottles on the pack line -> 201', r.status === 201, r);
const id = r.data.id;
let g = await get(id);
const ps = g.items.find(i => i.drug_id === syrup.id), pt = g.items.find(i => i.drug_id === tab.id);
check('pack line saved with quantity 3', Number(ps.quantity) === 3, ps);
check('ordinary line keeps 1', Number(pt.quantity) === 1, pt);
r = await call('PUT', '/order-sets/' + id, { name, items: [line(syrup, ''), line(tab, 0)] }, T);
g = await get(id);
check('empty and 0 still mean 1, as before', r.status === 200 && g.items.every(i => Number(i.quantity) === 1), g.items);

await call('DELETE', '/order-sets/' + id, null, T);
await call('PUT', '/admin/drugs/' + syrup.id, { ...syrup, ...wasPack }, T);
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
