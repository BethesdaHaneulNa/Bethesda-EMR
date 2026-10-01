// Phrases and their categories (the director, 2026-10-01; migration 701): one sentence
// per phrase, categories as data. Run against an ISOLATED stack only - it creates
// categories, phrases and a staff account:
//
//   SE_ADMIN_PW=... node backend/test/settings.phrases.mjs     (default http://127.0.0.1:9187)
//
// Checks: the five categories are there after the migration, in order, and every seeded
// phrase points at one; a phrase is saved with one text and never returns text_fr /
// text_en; a caller that still sends the category by name is understood; categories are
// added, renamed (the phrases' own copy of the name follows), put in order and removed;
// a category with phrases is refused (409, with the number) unless they are moved; what
// the consultation screen reads (GET /admin/phrases: id, category, text) still holds;
// adding, renaming and removing go to the change log; no settings permission -> 403 on
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
const cats = async () => (await call('GET', '/admin/phrase-categories', null, A)).data;
const phrases = async () => (await call('GET', '/admin/phrases', null, A)).data;
const logLines = async (id) => (await call('GET', '/admin/audit?action=settings.phrase.category&limit=200', null, A)).data.rows
  .filter(r => String(r.entity_id) === String(id));

// ── after the migration ──
let c = await cats();
const five = ['General', 'Internal', 'Surgery', 'Peds', 'OBGYN'];
// On a stack nobody has touched, the migration's five in their order. Once the clinic (or
// an earlier hand test) renamed or removed one, only the order of the list is checked.
if (five.every(n => c.some(x => x.name === n))) {
  check('the five categories are there, in their order', c.filter(x => five.includes(x.name)).map(x => x.name).join() === five.join(), c.map(x => x.name));
} else {
  console.log('  [info] the seeded five were changed on this stack: ' + c.map(x => x.name).join(', '));
}
check('categories come in their own order', c.map(x => x.sort_order).every((v, i, arr) => i === 0 || arr[i - 1] <= v), c.map(x => x.sort_order));
let p = await phrases();
check('every phrase has a category id and the same name as its category', p.length > 0 && p.every(x => x.category_id && c.some(k => k.id === x.category_id && k.name === x.category)), p.find(x => !x.category_id));
check('a phrase has one text: no text_fr / text_en in the answer', p.every(x => !('text_fr' in x) && !('text_en' in x) && typeof x.text === 'string' && x.text), Object.keys(p[0] || {}));
check('what the consultation screen reads is there (id, category, text)', p.every(x => x.id && x.category && x.text), p[0]);
check('phrases come in the categories\' order', p.map(x => x.category_sort).every((v, i, a) => i === 0 || a[i - 1] <= v), p.map(x => x.category_sort).join());
check('phrase_count adds up', c.reduce((n, x) => n + x.phrase_count, 0) === p.length, [c.map(x => x.phrase_count), p.length]);

// ── categories: add, duplicate, rename, order ──
let r = await call('POST', '/admin/phrase-categories', { name: '  ' + tag + ' Urgences ' }, A);
check('add a category (trimmed), last in the order', r.status === 201 && r.data.name === tag + ' Urgences' && r.data.phrase_count === 0
  && r.data.sort_order > Math.max(...c.map(x => x.sort_order)), r);
const urg = r.data;
r = await call('POST', '/admin/phrase-categories', { name: (tag + ' urgences').toUpperCase() }, A);
check('the same name in other letters -> 409, said in words', r.status === 409 && r.data.error === 'A category with that name already exists', r);
r = await call('POST', '/admin/phrase-categories', { name: '   ' }, A);
check('empty name -> 400', r.status === 400 && r.data.error === 'Category name is required', r);
r = await call('POST', '/admin/phrase-categories', { name: 'x'.repeat(61) }, A);
check('61 characters -> 400', r.status === 400 && r.data.error === 'Category name is too long (60 characters at most)', r);
r = await call('POST', '/admin/phrase-categories', { name: tag + ' Dermato' }, A);
const derm = r.data;

// ── phrases: one text, by id and by name ──
r = await call('POST', '/admin/phrases', { category_id: urg.id, text: '  Patient stable, sortie. ', text_fr: 'ignoré', text_en: 'ignored' }, A);
check('add a phrase: one text (trimmed), text_fr / text_en ignored', r.status === 201 && r.data.text === 'Patient stable, sortie.' && r.data.category === urg.name
  && r.data.category_id === urg.id && !('text_fr' in r.data), r);
const ph1 = r.data;
r = await call('POST', '/admin/phrases', { category: urg.name, text: 'Second' }, A);
check('a caller that sends the category by name is understood', r.status === 201 && r.data.category_id === urg.id, r);
const ph2 = r.data;
r = await call('POST', '/admin/phrases', { category_id: urg.id, text: '   ' }, A);
check('empty text -> 400', r.status === 400 && r.data.error === 'Phrase text is required', r);
r = await call('POST', '/admin/phrases', { category: 'No such category ' + tag, text: 'x' }, A);
check('unknown category -> 400', r.status === 400 && r.data.error === 'Choose a category for the phrase', r);
r = await call('PUT', '/admin/phrases/' + ph2.id, { category_id: derm.id, text: 'Second, moved' }, A);
check('edit a phrase: text and category', r.status === 200 && r.data.text === 'Second, moved' && r.data.category === derm.name, r);
r = await call('PUT', '/admin/phrases/99999999', { category_id: derm.id, text: 'x' }, A);
check('no such phrase -> 404', r.status === 404, r.status);

// ── rename: the phrases follow ──
r = await call('PUT', '/admin/phrase-categories/' + urg.id, { name: tag + ' SAU' }, A);
check('rename a category', r.status === 200 && r.data.name === tag + ' SAU' && r.data.phrase_count === 1, r);
p = await phrases();
check('its phrase now carries the new name', p.find(x => x.id === ph1.id).category === tag + ' SAU', p.find(x => x.id === ph1.id));
r = await call('GET', '/admin/phrases?category=' + encodeURIComponent(tag + ' SAU'), null, A);
check('the old filter by name still works (?category=)', r.data.length === 1 && r.data[0].id === ph1.id, r.data.length);
r = await call('GET', '/admin/phrases?category_id=' + derm.id, null, A);
check('filter by id (?category_id=)', r.data.length === 1 && r.data[0].id === ph2.id, r.data.length);
r = await call('PUT', '/admin/phrase-categories/' + derm.id, { name: tag + ' sau' }, A);
check('rename onto another category\'s name -> 409', r.status === 409, r);

// ── order ──
c = await cats();
const ids = c.map(x => x.id);
const moved = [urg.id].concat(ids.filter(x => x !== urg.id));
r = await call('PUT', '/admin/phrase-categories/order', { ids: moved }, A);
check('put a category first', r.status === 200 && r.data[0].id === urg.id && r.data.map(x => x.sort_order).join() === moved.map((_, i) => i + 1).join(), r.data && r.data.map(x => x.id));
p = await phrases();
check('the phrase list follows: its phrase comes first', p[0].id === ph1.id, p[0]);
r = await call('PUT', '/admin/phrase-categories/order', { ids: moved.slice(1) }, A);
check('an order that leaves a category out -> 400, nothing changed', r.status === 400 && (await cats())[0].id === urg.id, r);
await call('PUT', '/admin/phrase-categories/order', { ids }, A);   // back

// ── remove ──
r = await call('DELETE', '/admin/phrase-categories/' + urg.id, null, A);
check('remove a category that holds a phrase -> 409 with the number', r.status === 409 && r.data.phrase_count === 1
  && r.data.error === 'This category has 1 phrase(s). Move them to another category or delete them first.', r);
check('... and it is still there, with its phrase', (await cats()).some(x => x.id === urg.id) && (await phrases()).some(x => x.id === ph1.id), null);
r = await call('DELETE', '/admin/phrase-categories/' + urg.id + '?move_to=' + urg.id, null, A);
check('move to itself -> 400', r.status === 400 && r.data.error === 'Choose another category to move the phrases to', r);
r = await call('DELETE', '/admin/phrase-categories/' + urg.id + '?move_to=' + derm.id, null, A);
check('remove with move_to: phrases moved, category gone', r.status === 200 && r.data.moved === 1 && !(await cats()).some(x => x.id === urg.id), r);
p = await phrases();
check('the moved phrase is in the other category, not lost', p.find(x => x.id === ph1.id) && p.find(x => x.id === ph1.id).category_id === derm.id
  && p.find(x => x.id === ph1.id).category === derm.name, p.find(x => x.id === ph1.id));
r = await call('POST', '/admin/phrase-categories', { name: tag + ' SAU' }, A);
check('a removed category\'s name can be used again', r.status === 201, r);
const again = r.data;
r = await call('DELETE', '/admin/phrase-categories/' + again.id, null, A);
check('remove an empty category: no question asked', r.status === 200 && r.data.moved === 0, r);
r = await call('DELETE', '/admin/phrase-categories/99999999', null, A);
check('no such category -> 404', r.status === 404, r.status);

// ── change log ──
let lines = await logLines(urg.id);
check('change log: made, renamed, removed (3 lines; the order is not logged)', lines.length === 3, lines.map(l => [l.before_value, l.after_value]));
const made = lines.find(l => l.before_value === null), ren = lines.find(l => l.before_value && l.before_value.name), gone = lines.find(l => l.after_value && l.after_value.status === 'inactive');
check('... made: the name', made && made.after_value.name === tag + ' Urgences' && made.patient_id === null, made);
check('... renamed: old name -> new name', ren && ren.before_value.name === tag + ' Urgences' && ren.after_value.name === tag + ' SAU', ren);
check('... removed: where its phrases went, and how many', gone && gone.after_value.phrases_moved_to === derm.name && gone.after_value.phrases_moved === 1, gone);
lines = await logLines(again.id);
check('removing an empty category: no "moved" fields', lines.some(l => l.after_value && l.after_value.status === 'inactive' && !('phrases_moved' in l.after_value)), lines.map(l => l.after_value));

// ── permissions ──
const login = 'zzph' + crypto.randomBytes(2).toString('hex');
const pw = crypto.randomBytes(9).toString('base64url');
const st = await call('POST', '/admin/staff', { login_id: login, password: pw, name: 'Phrases ' + login, role: 'doctor', permissions: ['consultation'] }, A);
const D = (await call('POST', '/auth/login', { login_id: login, password: pw })).data.token;
const reads = [await call('GET', '/admin/phrases', null, D), await call('GET', '/admin/phrase-categories', null, D)];
check('a doctor reads phrases and categories', reads.every(x => x.status === 200 && Array.isArray(x.data)), reads.map(x => x.status));
const writes = [
  await call('POST', '/admin/phrase-categories', { name: tag + ' no' }, D), await call('PUT', '/admin/phrase-categories/' + derm.id, { name: 'no' }, D),
  await call('PUT', '/admin/phrase-categories/order', { ids }, D), await call('DELETE', '/admin/phrase-categories/' + derm.id, null, D),
  await call('POST', '/admin/phrases', { category_id: derm.id, text: 'no' }, D), await call('PUT', '/admin/phrases/' + ph1.id, { category_id: derm.id, text: 'no' }, D),
  await call('DELETE', '/admin/phrases/' + ph1.id, null, D),
];
check('... and is refused every change (403 x 7)', writes.every(x => x.status === 403), writes.map(x => x.status));

// ── tidy: the test phrases, then the test category; the account is deactivated ──
await call('DELETE', '/admin/phrases/' + ph1.id, null, A);
await call('DELETE', '/admin/phrases/' + ph2.id, null, A);
r = await call('DELETE', '/admin/phrase-categories/' + derm.id, null, A);
check('after its phrases are deleted the category goes without moving anything', r.status === 200 && r.data.moved === 0, r);
if (st.data && st.data.id) await call('PUT', '/admin/staff/' + st.data.id, { login_id: login, name: 'Phrases ' + login, role: 'doctor', permissions: ['consultation'], status: 'inactive' }, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
