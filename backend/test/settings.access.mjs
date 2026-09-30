// Who may call what: every role against every API route (S2, decided 2026-09-29).
// Run against an ISOLATED stack only - it creates staff accounts, and the write routes
// are called with ids that do not exist, but a few may still write test rows:
//
//   node backend/test/settings.access.mjs                     (default http://127.0.0.1:9187)
//   SE_TEST_BASE=http://127.0.0.1:9187/api SE_ADMIN_PW=... node backend/test/settings.access.mjs
//
// The expected column is the S2 table (wiki/handoff/settings.md, "S2 초안", as decided),
// written out below - NOT read from the route files, so a route whose guard drifted
// from the table shows up. Each route lists the module permissions that may call it;
// a request passes if the account holds any of them (permMiddleware is an OR).
//   ALL  = any signed-in account     OPEN = no sign-in (bridge / login routes; not tested)
// For each account the check is only "refused or not": 403 when none of its permissions
// is listed, anything else (200, 400, 404 ...) when one is. A 401 or a 5xx is always
// reported. Fix a difference in the route's own file, not here - unless the table
// itself was decided differently.
//
// On a fresh stack it creates the first admin through /auth/setup; otherwise pass
// SE_ADMIN_PW. Test logins are kept in the OS temp folder and reused. Node 18+.
// Exit code 1 if any cell differs.
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
// 9080 is the clinic's running EMR: this script creates accounts there.
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const CREDS = path.join(os.tmpdir(), 'bethesda-se-access-' + new URL(BASE).port + '.json');

const REG = 'registration', CONS = 'consultation', PAY = 'payment', PHARM = 'pharmacy',
      LAB = 'lab', STATS = 'stats', SET = 'settings', ALL = '*';
const X = 999999;   // an id that does not exist: writes pass the guard, then find nothing

// [method, path, allowed permissions, body for writes]
const ROUTES = [
  // patient.routes.js (reception)
  ['GET',  '/patients?q=a',                 [REG, CONS, PAY, PHARM, LAB]],
  ['GET',  '/patients/' + X,                [REG, CONS, PAY, PHARM, LAB]],
  ['GET',  '/patients/chart/ZZ-000',        [REG]],
  ['GET',  '/patients/similar?last_name=Rakoto&first_name=Jean', [REG]],   // duplicate check at registration (2026-09-29)
  ['GET',  '/patients/' + X + '/history',   [REG, CONS, PAY, PHARM]],
  ['GET',  '/patients/' + X + '/billing-history', [PAY]],
  ['POST', '/patients',                     [REG], {}],
  ['PUT',  '/patients/' + X,                [REG], {}],
  // visit.routes.js (reception)
  ['GET',  '/visits/today',                 [REG, CONS]],
  // reception: one working day's visits (?date=YYYY-MM-DD), registration only
  ['GET',  '/visits/day',                   [REG]],
  // registration added 2026-09-29 (coordinator): reception reads past visits to suggest new/follow-up
  ['GET',  '/visits/patient/' + X,          [REG, CONS, LAB, PAY]],
  ['POST', '/visits',                       [REG], {}],
  ['PUT',  '/visits/' + X + '/status',      [REG], { status: 'cancelled' }],
  ['PUT',  '/visits/' + X,                  [REG, PAY], {}],
  // consult.routes.js (consultation)
  ['POST', '/consultations',                [CONS], {}],
  ['PUT',  '/consultations/' + X,           [CONS], {}],
  ['PUT',  '/consultations/' + X + '/complete', [CONS], {}],
  ['GET',  '/consultations/' + X + '/diagnoses', [CONS]],
  ['POST', '/consultations/' + X + '/diagnoses', [CONS], {}],
  ['DELETE', '/consultations/diagnosis/' + X, [CONS]],
  ['GET',  '/consultations/visit/' + X + '/prescriptions', [CONS, PAY, PHARM]],
  ['GET',  '/consultations/' + X + '/prescriptions', [CONS, PAY, PHARM]],
  ['POST', '/consultations/' + X + '/prescriptions', [CONS], {}],
  ['PUT',  '/consultations/prescription/' + X, [CONS], {}],
  ['DELETE', '/consultations/prescription/' + X, [CONS]],
  ['POST', '/consultations/' + X + '/orders', [CONS], {}],
  ['PUT',  '/consultations/order/' + X,     [CONS], {}],
  ['POST', '/consultations/order/' + X + '/cancel', [CONS], {}],   // (2026-09-29)
  ['DELETE', '/consultations/order/' + X,   [CONS]],
  ['GET',  '/consultations/' + X + '/orders', [CONS, PAY, PHARM]],
  // document.routes.js (consultation)
  ['GET',  '/documents/patient/' + X,       [CONS, PAY, PHARM, LAB, REG]],
  ['GET',  '/documents/' + X,               [CONS, PAY, PHARM, LAB, REG]],
  ['POST', '/documents',                    [CONS, PAY, PHARM], {}],
  ['POST', '/documents/' + X + '/void',     [CONS, PAY, PHARM], {}],
  // orderset.routes.js (consultation; the Settings tab writes)
  ['GET',  '/order-sets',                   [CONS, SET]],
  ['GET',  '/order-sets/' + X,              [CONS, SET]],
  ['POST', '/order-sets',                   [SET], {}],
  ['PUT',  '/order-sets/' + X,              [SET], {}],
  ['DELETE', '/order-sets/' + X,            [SET]],
  // billing.routes.js (payment)
  // the day's cash record (036, payment M9): payment and statistics
  ['GET',  '/billing/cash-day',             [PAY, STATS]],
  ['GET',  '/billing/pending',              [PAY]],
  ['GET',  '/billing/completed',            [PAY]],
  ['GET',  '/billing/' + X + '/detail',     [PAY]],
  ['GET',  '/billing/visit/' + X + '/items', [PAY]],
  ['GET',  '/billing/patient/' + X + '/history', [PAY]],
  ['GET',  '/billing/patient/' + X + '/balance', [PAY, REG]],
  ['GET',  '/billing/visit/' + X + '/correction', [PAY]],
  ['POST', '/billing',                      [PAY], {}],
  ['PUT',  '/billing/' + X + '/void',       [PAY], {}],
  ['POST', '/billing/visit/' + X + '/correct', [PAY], {}],
  ['POST', '/billing/settle',               [PAY], {}],
  // pharmacy.routes.js
  ['GET',  '/pharmacy/pending',             [PHARM]],
  ['GET',  '/pharmacy/completed',           [PHARM]],
  ['GET',  '/pharmacy/patient/' + X + '/pending', [PHARM]],
  ['GET',  '/pharmacy/patient/' + X + '/recent-rx', [PHARM]],
  ['PUT',  '/pharmacy/consultations/' + X + '/dispense', [PHARM], {}],
  ['PUT',  '/pharmacy/prescription/' + X + '/dispense-type', [PHARM], { dispense_type: 'internal' }],
  // stock ledger (pharmacy stock (1), 2026-09-29): doctors and Settings may look and adjust too
  ['GET',  '/pharmacy/stock',               [PHARM, CONS, SET]],
  ['GET',  '/pharmacy/stock/' + X + '/movements', [PHARM, CONS, SET]],
  ['GET',  '/pharmacy/stock/report',        [PHARM, SET, STATS]],   // canReport (2026-09-29)
  ['POST', '/pharmacy/stock/' + X + '/receive', [PHARM, CONS, SET], { qty: 1 }],
  ['POST', '/pharmacy/stock/' + X + '/count',   [PHARM, CONS, SET], { counted: 1, memo: 'access test' }],
  ['POST', '/pharmacy/stock/' + X + '/discard', [PHARM, CONS, SET], { qty: 1, memo: 'access test' }],
  // lab.routes.js
  ['GET',  '/lab/pending',                  [LAB]],
  ['GET',  '/lab/completed',                [LAB]],
  ['GET',  '/lab/visit/' + X + '/orders',   [LAB]],
  ['GET',  '/lab/order/' + X + '/items',    [LAB]],
  ['POST', '/lab/order/' + X + '/results',  [LAB], {}],
  ['GET',  '/lab/patient/' + X + '/results', [CONS, LAB]],
  ['GET',  '/lab/test-items',               [LAB, SET]],
  ['POST', '/lab/test-items/save',          [SET], { order_code_id: X, items: [] }],
  // stats.routes.js
  ['GET',  '/stats/summary',                [STATS]],
  ['GET',  '/stats/monthly',                [STATS]],
  ['GET',  '/stats/outstanding',            [STATS]],
  ['GET',  '/stats/drug-usage',             [STATS]],
  // pacs.routes.js / worklist.routes.js (PACS)
  ['GET',  '/pacs/config',                  [SET]],
  ['GET',  '/pacs/test?target=worklist',    [SET]],
  ['GET',  '/pacs/viewer-url?order_item_id=' + X, [CONS]],
  ['PUT',  '/pacs/reading/' + X,            [CONS], {}],
  ['GET',  '/pacs/readings/patient/' + X,   [CONS, PAY]],
  ['GET',  '/worklist',                     [CONS]],
  ['PUT',  '/worklist/' + X + '/status',    [SET], { status: 'completed' }],
  ['GET',  '/worklist/dicom-mwl',           [SET]],
  // admin.routes.js (settings): reference lists stay open, everything else is Settings
  ['GET',  '/admin/drugs',                  [ALL]],
  ['GET',  '/admin/order-codes',            [ALL]],
  ['GET',  '/admin/departments',            [ALL]],
  ['GET',  '/admin/phrases',                [ALL]],
  ['GET',  '/admin/clinic',                 [ALL]],
  ['GET',  '/admin/doctors',                [REG, CONS]],
  ['GET',  '/admin/staff',                  [SET]],
  ['GET',  '/admin/audit?limit=5',          [SET]],   // change log, read only (2026-09-29)
  ['POST', '/admin/staff',                  [SET], {}],
  ['PUT',  '/admin/staff/' + X,             [SET], { role: 'doctor', status: 'active' }],
  ['DELETE', '/admin/staff/' + X,           [SET]],
  ['POST', '/admin/drugs',                  [SET], {}],
  ['PUT',  '/admin/drugs/' + X,             [SET], {}],
  ['GET',  '/admin/drugs/' + X + '/order-sets', [SET]],
  ['DELETE', '/admin/drugs/' + X,           [SET]],
  ['POST', '/admin/order-codes',            [SET], {}],
  ['PUT',  '/admin/order-codes/' + X,       [SET], { code_type: 'fee' }],
  ['DELETE', '/admin/order-codes/' + X,     [SET]],
  ['POST', '/admin/departments',            [SET], {}],
  ['PUT',  '/admin/departments/' + X,       [SET], {}],
  ['POST', '/admin/phrases',                [SET], {}],
  ['PUT',  '/admin/phrases/' + X,           [SET], {}],
  ['DELETE', '/admin/phrases/' + X,         [SET]],
  // settings, and the admin role on top (U2); every account holding settings here is an admin
  ['POST', '/admin/staff/' + X + '/reactivate', [SET], {}],
  // backup / status / version / auth (settings)
  ['GET',  '/backup/status',                [ALL]],
  ['GET',  '/backup/download/bethesda_does-not-exist.sql.gz', [SET]],
  ['GET',  '/system/status',                [ALL]],
  ['GET',  '/version',                      [ALL]],
  ['GET',  '/auth/me',                      [ALL]],
  // empty body: 400 (nothing changed) for anyone logged in - no permission needed
  ['POST', '/auth/password',                [ALL], {}],
  // each account's own screen, dark / light (design, 037): signed in is enough; the empty
  // body is a 400 and changes nothing
  ['GET',  '/theme',                        [ALL]],
  ['PUT',  '/theme',                        [ALL], {}],
];

// One account per way the clinic hands out permissions. Single-permission accounts pin
// down each cell of the table; the role accounts use that role's default ticks
// (backend/src/middleware/permissions.js).
const ACCOUNTS = [
  ['admin',     null,        null],   // the setup admin: all seven
  ['se_doc',    'doctor',    [CONS, PHARM]],   // the doctor default since 2026-09-29
  ['se_cons',   'doctor',    [CONS]],          // consultation alone
  ['se_front',  'frontdesk', [REG, PAY]],
  ['se_nurse',  'nurse',     [REG, PHARM, LAB]],
  ['se_pharm',  'pharmacy',  [PHARM]],
  ['se_lab',    'lab',       [LAB]],
  ['se_pay',    'frontdesk', [PAY]],
  ['se_stats',  'frontdesk', [STATS]],
  ['se_set',    'admin',     [SET]],
  ['se_none',   'frontdesk', []],
];
const ALL_PERMS = [REG, CONS, PAY, PHARM, LAB, STATS, SET];

async function call(method, p, body, token) {
  const r = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; const text = await r.text(); try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

const creds = fs.existsSync(CREDS) ? JSON.parse(fs.readFileSync(CREDS, 'utf8')) : {};
const pw = () => crypto.randomBytes(9).toString('base64url');
const save = () => fs.writeFileSync(CREDS, JSON.stringify(creds, null, 1));

// the admin
if ((await call('GET', '/auth/setup-status')).data.needsSetup) {
  creds.admin = pw();
  const s = await call('POST', '/auth/setup', { login_id: 'admin', password: creds.admin, name: 'Admin' });
  if (s.status !== 200) throw new Error('setup failed: ' + s.status);
  save();
} else if (process.env.SE_ADMIN_PW) {
  creds.admin = process.env.SE_ADMIN_PW;
}
if (!creds.admin) throw new Error('This stack already has an admin: set SE_ADMIN_PW');
const adminLogin = await call('POST', '/auth/login', { login_id: 'admin', password: creds.admin });
if (adminLogin.status !== 200) throw new Error('admin login failed (' + adminLogin.status + ') - check SE_ADMIN_PW');
const AT = adminLogin.data.token;

// the test accounts: create, or put back to the expected role / permissions / password
const staff = (await call('GET', '/admin/staff', null, AT)).data;
const tokens = { admin: AT };
const perms = { admin: ALL_PERMS };
for (const [login, role, p] of ACCOUNTS) {
  if (!role) continue;
  creds[login] = creds[login] || pw();
  const body = { login_id: login, password: creds[login], name: 'Test ' + login, role, permissions: p, status: 'active' };
  const have = staff.find(s => s.login_id === login);
  const r = have ? await call('PUT', '/admin/staff/' + have.id, body, AT) : await call('POST', '/admin/staff', body, AT);
  if (r.status >= 300) throw new Error('could not prepare ' + login + ': ' + r.status + ' ' + JSON.stringify(r.data));
  const l = await call('POST', '/auth/login', { login_id: login, password: creds[login] });
  if (l.status !== 200) throw new Error('login failed for ' + login);
  tokens[login] = l.data.token;
  perms[login] = p;
}
save();

// the sweep
const problems = [];
let cells = 0;
for (const [method, p, allowed, body] of ROUTES) {
  for (const [login] of ACCOUNTS) {
    const mayPass = allowed.includes(ALL) || allowed.some(x => perms[login].includes(x));
    const r = await call(method, p, method === 'GET' || method === 'DELETE' ? null : (body || {}), tokens[login]);
    cells++;
    let bad = null;
    if (r.status === 401) bad = 'signed out (401)';
    else if (r.status >= 500) bad = 'server error ' + r.status + ': ' + (r.data && r.data.error || '');
    else if (mayPass && r.status === 403) bad = 'refused, but the table allows ' + allowed.join('/');
    else if (!mayPass && r.status !== 403) bad = 'let through (' + r.status + '), but the table allows only ' + allowed.join('/');
    if (bad) problems.push({ route: method + ' ' + p.replace(String(X), ':id'), login, perms: perms[login].join(',') || '(none)', bad });
  }
}

console.log(`${ROUTES.length} routes x ${ACCOUNTS.length} accounts = ${cells} requests`);
if (!problems.length) {
  console.log('every route answered every role as the S2 table says');
  process.exit(0);
}
const byRoute = {};
for (const x of problems) (byRoute[x.route] = byRoute[x.route] || []).push(x);
for (const [route, xs] of Object.entries(byRoute)) {
  console.log('\n  ' + route);
  for (const x of xs) console.log(`    ${x.login.padEnd(9)} [${x.perms}]  ${x.bad}`);
}
console.log(`\n${problems.length} cell(s) differ from the table - report them to the route file's owner`);
process.exit(1);
