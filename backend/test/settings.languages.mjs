// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// The languages the clinic uses (066; the clinic's manager, 2026-11-11): Settings ->
// Languages says which of French, English and Korean are in use; the screens show only
// those buttons, and none when there is one. This checks the server's side: what is
// stored, what the sign-in page is told before anyone signs in, and what is refused.
// It puts the three languages back at the end.
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.languages.mjs
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
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const A = (await call('POST', '/auth/login', { login_id: 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!A) throw new Error('admin login failed');
const put = (languages) => call('PUT', '/admin/clinic/languages', languages === undefined ? {} : { languages }, A);
const told = async () => (await call('GET', '/auth/setup-status')).data.languages;      // no sign-in
const stored = async () => (await call('GET', '/admin/clinic', null, A)).data.languages;

try {
  let r = await put(['fr', 'en', 'ko']);
  check('the three languages (where every clinic starts)', r.status === 200 && same(r.data.languages, ['fr', 'en', 'ko']), r);
  check('the sign-in page is told them without a sign-in', same(await told(), ['fr', 'en', 'ko']), await told());
  check('the clinic row carries them', (await stored()) === 'fr,en,ko', await stored());

  r = await put(['ko', 'fr']);
  check('two chosen, in any order: kept in the fixed order', r.status === 200 && same(r.data.languages, ['fr', 'ko']) && (await stored()) === 'fr,ko', r);
  check('... and the sign-in page is told those two', same(await told(), ['fr', 'ko']), await told());

  r = await put('en');
  check('one chosen (sent as text too)', r.status === 200 && same(r.data.languages, ['en']) && same(await told(), ['en']), r);
  r = await put(['FR', ' fr ', 'fr']);
  check('capitals, spaces, the same one twice: one language', r.status === 200 && same(r.data.languages, ['fr']), r);

  const none = [];
  for (const v of [[], '', '  ', ' , ', null, 5, true, {}]) none.push(await put(v));
  none.push(await put(undefined));
  check('none chosen (or nothing sent): 400, "Choose at least one language"', none.every(x => x.status === 400 && x.data.error === 'Choose at least one language'), none.map(x => [x.status, x.data.error]));
  const unknown = [];
  for (const v of [['xx'], ['fr', 'de'], 'fr,de', [5], [['fr']], [null]]) unknown.push(await put(v));
  check('a language the screens do not have: 400', unknown.every(x => x.status === 400 && /must be one of/.test(x.data.error)), unknown.map(x => [x.status, x.data.error]));
  check('... and what was chosen is still there', same(await told(), ['fr']), await told());

  // the clinic form (name, address ...) does not send the languages and must not touch them
  const row = (await call('GET', '/admin/clinic', null, A)).data;
  r = await call('PUT', '/admin/clinic', { name: row.name, name_en: row.name_en, name_fr: row.name_fr, address: row.address, phone: row.phone, email: row.email, working_hours: row.working_hours }, A);
  check('saving the clinic form leaves the languages as they are', r.status === 200 && r.data.languages === 'fr' && r.data.name === row.name, [r.status, r.data && r.data.languages]);

  check('without a sign-in the languages cannot be changed (401)', (await call('PUT', '/admin/clinic/languages', { languages: ['ko'] })).status === 401);
} finally {
  const back = await put(['fr', 'en', 'ko']);
  check('the three languages are back', back.status === 200 && same(await told(), ['fr', 'en', 'ko']), back);
}

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
