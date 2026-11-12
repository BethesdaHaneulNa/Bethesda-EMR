// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// The clinic's money (067; the clinic's manager, 2026-11-12): Settings -> Clinic -> Money
// says the symbol, its place, the decimals and the quick amounts at the till. This checks
// the server's side: what is stored, what the sign-in page is told before anyone signs in,
// and what is refused. It puts the ariary back at the end.
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.currency.mjs
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
const AR = { symbol: 'Ar', position: 'after', decimals: 0, quick: [5000, 10000, 20000, 50000] };

const A = (await call('POST', '/auth/login', { login_id: 'admin', password: process.env.SE_ADMIN_PW })).data.token;
if (!A) throw new Error('admin login failed');
const put = (body) => call('PUT', '/admin/clinic/currency', body, A);
const told = async () => (await call('GET', '/auth/setup-status')).data.currency;      // no sign-in
const stored = async () => { const c = (await call('GET', '/admin/clinic', null, A)).data; return [c.currency_symbol, c.currency_position, c.currency_decimals, c.cash_quick]; };

try {
  let r = await put({ symbol: 'Ar', position: 'after', decimals: 0, quick: '5000,10000,20000,50000' });
  check('the ariary (where every clinic starts)', r.status === 200 && same(r.data.currency, AR), r);
  check('the sign-in page is told it without a sign-in', same(await told(), AR), await told());
  check('the clinic row carries it', same(await stored(), ['Ar', 'after', 0, '5000,10000,20000,50000']), await stored());

  r = await put({ symbol: ' FCFA ', position: 'after', decimals: 0, quick: [500, 1000, 2000, 5000, 10000] });
  check('another money, the quick amounts as a list, the symbol trimmed', r.status === 200 && same(r.data.currency, { symbol: 'FCFA', position: 'after', decimals: 0, quick: [500, 1000, 2000, 5000, 10000] }), r);
  r = await put({ symbol: '$', position: 'BEFORE', decimals: '2', quick: '20, 5 ; 5  10' });
  check('before the amount, two decimals (sent as text), quick amounts sorted, the same one once', r.status === 200 && same(r.data.currency, { symbol: '$', position: 'before', decimals: 2, quick: [5, 10, 20] }), r);
  check('... and the sign-in page is told that', same(await told(), { symbol: '$', position: 'before', decimals: 2, quick: [5, 10, 20] }), await told());
  r = await put({ symbol: '€', quick: '1' });
  check('position and decimals not sent: after, none', r.status === 200 && same(r.data.currency, { symbol: '€', position: 'after', decimals: 0, quick: [1] }), r);

  const symbol = [];
  for (const v of [{}, { quick: '5' }, { symbol: '', quick: '5' }, { symbol: '   ', quick: '5' }, { symbol: '123456789', quick: '5' }, { symbol: null, quick: '5' }]) symbol.push(await put(v));
  symbol.push(await call('PUT', '/admin/clinic/currency', undefined, A));
  check('no symbol, a blank one, nine characters, nothing sent: 400 "Currency symbol must be 1 to 8 characters"', symbol.every(x => x.status === 400 && x.data.error === 'Currency symbol must be 1 to 8 characters'), symbol.map(x => [x.status, x.data.error]));
  r = await put({ symbol: 'Ar', position: 'middle', quick: '5' });
  check('a place the screens do not have: 400', r.status === 400 && /^position must be one of/.test(r.data.error), r);
  const dec = [];
  for (const v of [1, 3, -1, 'two', 2.5]) dec.push(await put({ symbol: 'Ar', decimals: v, quick: '5' }));
  check('decimals other than 0 or 2: 400', dec.every(x => x.status === 400 && /^decimals must be one of 0, 2$/.test(x.data.error)), dec.map(x => [x.status, x.data.error]));
  const quick = [];
  for (const v of [undefined, '', '  ', 'a,b', '0', '-5', '5,x', [], [0], '1,2,3,4,5,6,7', 1e10]) quick.push(await put({ symbol: 'Ar', quick: v }));
  check('quick amounts missing, empty, not numbers, zero, negative, seven of them: 400 "Quick amounts must be 1 to 6 positive numbers"', quick.every(x => x.status === 400 && x.data.error === 'Quick amounts must be 1 to 6 positive numbers'), quick.map(x => [x.status, x.data.error]));
  check('... and what was chosen is still there', same(await told(), { symbol: '€', position: 'after', decimals: 0, quick: [1] }), await told());

  // the clinic form (name, address ...) does not send the money and must not touch it
  const row = (await call('GET', '/admin/clinic', null, A)).data;
  r = await call('PUT', '/admin/clinic', { name: row.name, name_en: row.name_en, name_fr: row.name_fr, address: row.address, phone: row.phone, email: row.email, working_hours: row.working_hours }, A);
  check('saving the clinic form leaves the money as it is', r.status === 200 && r.data.currency_symbol === '€' && r.data.cash_quick === '1' && r.data.name === row.name, [r.status, r.data && r.data.currency_symbol]);

  check('without a sign-in the money cannot be changed (401)', (await call('PUT', '/admin/clinic/currency', { symbol: 'Ar', quick: '5' })).status === 401);
} finally {
  const back = await put({ symbol: 'Ar', position: 'after', decimals: 0, quick: '5000,10000,20000,50000' });
  check('the ariary is back', back.status === 200 && same(await told(), AR), back);
}

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
