// Folders, and folders inside folders, for the lab tests and the order sets (065, 1.8.0;
// folder.routes.js). Run against an ISOLATED stack only - it makes folders, a lab test and
// an order set:
//
//   SE_ADMIN_PW=... node backend/test/settings.folders.mjs     (default http://127.0.0.1:9187)
//
// Checks: a folder, a folder inside it, five levels and no more; no two of one name side by
// side; rename; move (not into itself, not too deep); the order of siblings; filing a lab
// test and an order set, through /place and through the order set's own save; an empty
// folder only can be removed; the two trees do not mix; who may read and who may write;
// the change log. Node 18+. Exit code 1 if any check fails.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') throw new Error('Refusing to run against ' + BASE);
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW');
async function call(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data; const text = await r.text(); try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
let failed = 0;
function check(label, ok, got) { console.log((ok ? '  [ok]   ' : '  [FAIL] ') + label + (ok ? '' : '  -> ' + JSON.stringify(got))); if (!ok) failed++; }
const login = (id, pw) => call('POST', '/auth/login', { login_id: id, password: pw });
const A = (await login('admin', process.env.SE_ADMIN_PW)).data.token;
if (!A) throw new Error('admin login failed');
const tag = crypto.randomBytes(3).toString('hex');
const pw = () => crypto.randomBytes(9).toString('base64url');
const tree = async (kind, token) => (await call('GET', '/folders/tree?kind=' + kind, null, token || A)).data;
const mk = (kind, name, parent_id) => call('POST', '/folders', { kind, name, parent_id: parent_id === undefined ? null : parent_id }, A);

// ── folders inside folders ──
let r = await mk('lab', 'Sang ' + tag);
check('a folder at the top level -> 201', r.status === 201 && r.data.parent_id === null && r.data.name === 'Sang ' + tag, r);
const top = r.data;
r = await mk('lab', 'Hématologie', top.id);
check('a folder inside it -> 201', r.status === 201 && r.data.parent_id === top.id, r);
const hema = r.data;
check('the same name side by side (other capitals) -> 409', (await mk('lab', 'HÉMATOLOGIE', top.id)).status === 409);
check('the same name in another folder is fine', (await mk('lab', 'Hématologie ' + tag)).status === 201);
check('no name, a name of 81 characters, an unknown parent, another kind -> 400', (await mk('lab', '  ')).status === 400 && (await mk('lab', 'x'.repeat(81))).status === 400
  && (await mk('lab', 'x', 99999999)).status === 400 && (await mk('drug', 'x')).status === 400);
let cur = hema.id; const chain = [top.id, hema.id];
for (let i = 3; i <= 5; i++) { r = await mk('lab', 'Niveau ' + i, cur); cur = r.data.id; chain.push(cur); }
check('five levels deep is the limit: the fifth is made, a sixth is refused', r.status === 201 && (await mk('lab', 'Niveau 6', cur)).status === 400, r);

// ── rename, move, order ──
r = await call('PUT', '/folders/' + hema.id, { name: 'Hémato' }, A);
check('rename -> 200', r.status === 200 && r.data.name === 'Hémato' && r.data.parent_id === top.id, r);
const other = (await mk('lab', 'Urines ' + tag)).data;
check('a folder cannot go into itself or into one of its own -> 400', (await call('PUT', '/folders/' + top.id, { parent_id: top.id }, A)).status === 400 && (await call('PUT', '/folders/' + top.id, { parent_id: chain[3] }, A)).status === 400);
check('moving a tree of five levels under another folder would make six -> 400', (await call('PUT', '/folders/' + top.id, { parent_id: other.id }, A)).status === 400);
r = await call('PUT', '/folders/' + chain[4], { parent_id: other.id }, A);
check('moving the deepest one elsewhere -> 200', r.status === 200 && r.data.parent_id === other.id, r);
r = await call('PUT', '/folders/' + chain[4], { parent_id: null }, A);
check('…and to the top level', r.status === 200 && r.data.parent_id === null, r);
const tops = (await tree('lab')).folders.filter(f => f.parent_id === null).map(f => f.id);
const turned = tops.slice().reverse();
r = await call('PUT', '/folders/order', { kind: 'lab', parent_id: null, ids: turned }, A);
const after = (await tree('lab')).folders.filter(f => f.parent_id === null).map(f => f.id);
check('the order of the folders side by side is kept as sent', r.status === 200 && JSON.stringify(after) === JSON.stringify(turned), after);
check('an order that leaves one out changes nothing -> 409', (await call('PUT', '/folders/order', { kind: 'lab', parent_id: null, ids: turned.slice(1) }, A)).status === 409);

// ── filing a lab test ──
const code = (await call('POST', '/admin/order-codes', { code: ('ZF' + tag).toUpperCase(), name: 'NFS dossier ' + tag, code_type: 'lab', group_name: 'Other', price: 1000, price_clinic: 1000 }, A)).data;
await call('POST', '/lab/test-items/save', { order_code_id: code.id, items: [{ name: 'Hb', unit: 'g/dL', ref_low: 12, ref_high: 16 }, { name: 'GB' }] }, A);
let leaf = (await tree('lab')).items.find(x => x.id === code.id);
check('a new lab test is listed, unfiled, with its number of items', !!leaf && leaf.folder_id === null && leaf.count === 2, leaf);
r = await call('PUT', '/folders/place', { kind: 'lab', id: code.id, folder_id: hema.id }, A);
leaf = (await tree('lab')).items.find(x => x.id === code.id);
check('filed in a folder', r.status === 200 && leaf.folder_id === hema.id, leaf);
check('a folder with something in it cannot be removed -> 409', (await call('DELETE', '/folders/' + hema.id, null, A)).status === 409);

// ── filing an order set; the two trees do not mix ──
const osTop = (await mk('orderset', 'Infections ' + tag)).data;
const osSub = (await mk('orderset', 'Paludisme', osTop.id)).data;
r = await call('POST', '/order-sets', { name: 'Palu simple ' + tag, folder_id: osSub.id, items: [] }, A);
check('an order set is made straight in a folder', r.status === 201 && r.data.folder_id === osSub.id, r);
const set = r.data;
check('…not in a folder of lab tests, not in one that does not exist -> 400', (await call('POST', '/order-sets', { name: 'x ' + tag, folder_id: hema.id, items: [] }, A)).status === 400 && (await call('PUT', '/order-sets/' + set.id, { name: set.name, folder_id: 99999999 }, A)).status === 400);
r = await call('PUT', '/order-sets/' + set.id, { name: 'Palu simple ' + tag, description: 'x' }, A);
check('a save that does not speak of the folder leaves it where it is', r.status === 200 && r.data.folder_id === osSub.id, r);
r = await call('PUT', '/order-sets/' + set.id, { name: 'Palu simple ' + tag, folder_id: null }, A);
check('a save with no folder puts it at the top level', r.status === 200 && r.data.folder_id === null, r);
r = await call('PUT', '/folders/place', { kind: 'orderset', id: set.id, folder_id: osTop.id }, A);
const osLeaf = (await tree('orderset')).items.find(x => x.id === set.id);
check('/place files an order set too', r.status === 200 && osLeaf && osLeaf.folder_id === osTop.id, osLeaf);
check('an order set cannot be filed in a lab folder, a lab test not in an order-set folder -> 400', (await call('PUT', '/folders/place', { kind: 'orderset', id: set.id, folder_id: hema.id }, A)).status === 400 && (await call('PUT', '/folders/place', { kind: 'lab', id: code.id, folder_id: osTop.id }, A)).status === 400);
check('a folder cannot move into the other tree -> 400', (await call('PUT', '/folders/' + osSub.id, { parent_id: top.id }, A)).status === 400);
check('filing what does not exist -> 404', (await call('PUT', '/folders/place', { kind: 'lab', id: 99999999, folder_id: null }, A)).status === 404 && (await call('PUT', '/folders/place', { kind: 'lab', id: set.id + 0.5, folder_id: null }, A)).status === 404);

// ── a folder that only holds a hidden lab test looks empty, and can go ──
{
  const f = (await mk('lab', 'Caché ' + tag)).data;
  const c2 = (await call('POST', '/admin/order-codes', { code: ('ZG' + tag).toUpperCase(), name: 'Analyse cachée ' + tag, code_type: 'lab', group_name: 'Other', price: 0, price_clinic: 0 }, A)).data;
  await call('PUT', '/folders/place', { kind: 'lab', id: c2.id, folder_id: f.id }, A);
  const shown = await call('DELETE', '/folders/' + f.id, null, A);
  await call('DELETE', '/admin/order-codes/' + c2.id, null, A);     // hidden from the lists
  const hidden = await call('DELETE', '/folders/' + f.id, null, A);
  check('a folder with a shown test stays (409); once the test is hidden it can be removed (200)', shown.status === 409 && hidden.status === 200, [shown.status, hidden.status]);
}

// ── removing ──
check('an empty folder is removed; a second time it is not found', (await call('DELETE', '/folders/' + osSub.id, null, A)).status === 200 && (await call('DELETE', '/folders/' + osSub.id, null, A)).status === 404);
await call('DELETE', '/order-sets/' + set.id, null, A);
check('once its order set is gone the folder can go', (await call('DELETE', '/folders/' + osTop.id, null, A)).status === 200);
check('an id that is not a number -> 404', (await call('DELETE', '/folders/abc', null, A)).status === 404 && (await call('PUT', '/folders/abc', { name: 'x' }, A)).status === 404);

// ── who may ──
const acct = async (suffix, role, permissions, extra) => { const p = pw(); await call('POST', '/admin/staff', { login_id: 'zfo' + tag + suffix, password: p, name: 'Folders ' + suffix, role, permissions, status: 'active', ...(extra || {}) }, A); return (await login('zfo' + tag + suffix, p)).data.token; };
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const DOC = await acct('d', 'doctor', ['consultation'], { department_id: DEPT }), LAB = await acct('l', 'lab', ['lab']), DESK = await acct('f', 'frontdesk', ['registration', 'payment']);
check('the doctor and the lab read the trees; reception does not', (await call('GET', '/folders/tree?kind=orderset', null, DOC)).status === 200 && (await call('GET', '/folders/tree?kind=lab', null, LAB)).status === 200 && (await call('GET', '/folders/tree?kind=lab', null, DESK)).status === 403);
check('only Settings writes', (await call('POST', '/folders', { kind: 'lab', name: 'x' }, DOC)).status === 403 && (await call('PUT', '/folders/place', { kind: 'lab', id: code.id, folder_id: null }, LAB)).status === 403 && (await call('DELETE', '/folders/' + hema.id, null, DOC)).status === 403);
check('a kind that is not one -> 400', (await call('GET', '/folders/tree?kind=drug', null, A)).status === 400 && (await call('GET', '/folders/tree', null, A)).status === 400);
const log = ((await call('GET', '/admin/audit?action=settings.folder&limit=200', null, A)).data.rows || []).filter(x => String(x.entity_id) === String(hema.id));
check('the change log has the folder made and renamed', log.length === 2 && log.some(x => x.after_value && x.after_value.name === 'Hémato'), log.map(x => [x.before_value, x.after_value]));

// tidy: the test's lab test goes back to the top level and is hidden; its folders stay empty
await call('PUT', '/folders/place', { kind: 'lab', id: code.id, folder_id: null }, A);
await call('DELETE', '/admin/order-codes/' + code.id, null, A);
for (const id of chain.slice().reverse().concat([other.id])) await call('DELETE', '/folders/' + id, null, A);
for (const f of (await tree('lab')).folders.filter(x => x.name === 'Hématologie ' + tag)) await call('DELETE', '/folders/' + f.id, null, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
