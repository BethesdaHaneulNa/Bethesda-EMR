// The diagnosis list kept in Settings (diagnosis_code, migration 050; routes
// /api/admin/diagnosis-codes in admin.routes.js). Run against an ISOLATED stack only - it
// adds rows to the list (there is no delete: they are left switched off) and one patient:
//
//   SE_ADMIN_PW=... node backend/test/settings.diagnoses.mjs     (default http://127.0.0.1:9187)
//
// Checks: the whole list is read, switched-off rows too; a row needs its English name and
// nothing else; text is trimmed, empty is none, lengths are held; the same code and name
// twice is allowed; an edit writes only what is sent; switching off takes the row out of
// the consultation screen's read and back; the order of the whole list; no delete; a
// diagnosis already on a consultation keeps its own code and name; each change is one
// line in the change log, the order is not. Node 18+.
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
const tag = 'T' + crypto.randomBytes(3).toString('hex').toUpperCase();
const list = async () => (await call('GET', '/admin/diagnosis-codes', null, A)).data;
const doctorsRead = async () => (await call('GET', '/consultations/diagnosis-codes', null, A)).data;
const lines = async () => (await call('GET', '/admin/audit?action=settings.diagnosis.code&limit=200', null, A)).data;

// ── the list ──
const before = await list();
check('the list is read, with the seeded diagnoses', Array.isArray(before) && before.length >= 100, before.length || before);
check('every row says whether it is on', before.every(r => typeof r.is_active === 'boolean'), before.find(r => typeof r.is_active !== 'boolean'));
check('rows come in list order', before.every((r, i) => i === 0 || before[i - 1].sort_order <= r.sort_order), null);
const linesBefore = (await lines()).total;

// ── add ──
let r = await call('POST', '/admin/diagnosis-codes', { code: 'X1' }, A);
check('no English name: refused', r.status === 400 && r.data.error === 'The English name of the diagnosis is required', r);
r = await call('POST', '/admin/diagnosis-codes', { name_en: '   ', name_fr: 'Fièvre' }, A);
check('a blank English name: refused', r.status === 400, r);
r = await call('POST', '/admin/diagnosis-codes', { name_en: 'x', code: 'C'.repeat(21) }, A);
check('a code of 21 characters: refused', r.status === 400 && r.data.error === 'The diagnosis code is too long (20 characters at most)', r);
r = await call('POST', '/admin/diagnosis-codes', { name_en: 'n'.repeat(201) }, A);
check('a name of 201 characters: refused', r.status === 400 && r.data.error === 'A diagnosis name is too long (200 characters at most)', r);
r = await call('POST', '/admin/diagnosis-codes', { name_en: 'x', is_active: 'yes' }, A);
check('is_active that is not true / false: refused', r.status === 400, r);
check('nothing was added by the refusals', (await list()).length === before.length, (await list()).length);

r = await call('POST', '/admin/diagnosis-codes', { code: '  ' + tag + ' ', name_en: '  Test   fever  ' + tag, name_fr: '', name_ko: '  ' }, A);
check('a row with a code and an English name is made', r.status === 201 && r.data.id, r);
const a = r.data;
check('text is trimmed, inner blanks made one', a.code === tag && a.name_en === 'Test fever ' + tag, a);
check('empty names are none', a.name_fr === null && a.name_ko === null, a);
check('it is on, and last in the list', a.is_active === true && a.sort_order > Math.max(...before.map(x => x.sort_order)), a);
let log = await lines();
check('one line in the change log: nothing before, the row after', log.total === linesBefore + 1 && log.rows[0].before_value == null
  && log.rows[0].after_value.code === tag && log.rows[0].after_value.status === 'active' && String(log.rows[0].summary).includes(tag), log.rows[0]);

r = await call('POST', '/admin/diagnosis-codes', { name_en: 'No code ' + tag }, A);
check('a row without a code is made', r.status === 201 && r.data.code === null, r);
const b = r.data;
r = await call('POST', '/admin/diagnosis-codes', { code: tag, name_en: 'Test fever ' + tag, name_fr: 'Autre formulation ' + tag }, A);
check('the same code and the same name again: allowed', r.status === 201 && r.data.id !== a.id, r);
const c = r.data;

// ── edit ──
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { name_fr: 'Fièvre de test ' + tag }, A);
check('an edit writes only what is sent', r.status === 200 && r.data.name_fr === 'Fièvre de test ' + tag && r.data.name_en === a.name_en && r.data.code === tag && r.data.is_active === true, r);
log = await lines();
check('... one line, with only what changed', log.rows[0].before_value.name_fr === null && log.rows[0].after_value.name_fr === 'Fièvre de test ' + tag
  && Object.keys(log.rows[0].after_value).join() === 'name_fr', log.rows[0]);
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { name_en: ' ' }, A);
check('the English name cannot be emptied', r.status === 400 && (await list()).find(x => x.id === a.id).name_en === a.name_en, r);
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { code: '', name_ko: '시험 열 ' + tag }, A);
check('the code can be emptied', r.status === 200 && r.data.code === null && r.data.name_ko === '시험 열 ' + tag, r);
const n1 = (await lines()).total;
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { code: '', name_ko: '시험 열 ' + tag, name_en: a.name_en }, A);
check('a save that changes nothing writes no line', r.status === 200 && (await lines()).total === n1, [(await lines()).total, n1]);
r = await call('PUT', '/admin/diagnosis-codes/999999', { name_en: 'x' }, A);
check('an unknown row: 404', r.status === 404, r);
r = await call('PUT', '/admin/diagnosis-codes/abc', { name_en: 'x' }, A);
check('an id that is not a number: 404', r.status === 404, r);

// ── off and on ──
const read0 = await doctorsRead();
check('the consultation screen reads the new rows', [a, b, c].every(x => read0.some(y => y.id === x.id)), read0.length);
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { is_active: false }, A);
check('switched off (is_active alone)', r.status === 200 && r.data.is_active === false && r.data.name_en === a.name_en, r);
check('... it leaves the consultation screen\'s read', !(await doctorsRead()).some(x => x.id === a.id), null);
check('... and stays in the Settings list, marked off', ((await list()).find(x => x.id === a.id) || {}).is_active === false, null);
log = await lines();
check('... one line: active -> inactive', log.rows[0].before_value.status === 'active' && log.rows[0].after_value.status === 'inactive', log.rows[0]);
r = await call('PUT', '/admin/diagnosis-codes/' + a.id, { is_active: true }, A);
check('switched on again: back in the consultation screen\'s read', r.status === 200 && (await doctorsRead()).some(x => x.id === a.id), r);

// ── order ──
const all = await list();
const ids = all.map(x => x.id);
const n2 = (await lines()).total;
r = await call('PUT', '/admin/diagnosis-codes/order', { ids: ids.slice(1) }, A);
check('an order that leaves a row out: refused', r.status === 400 && r.data.error === 'ids must list every diagnosis once', r);
r = await call('PUT', '/admin/diagnosis-codes/order', { ids: ids.slice(1).concat(ids[1]) }, A);
check('an order that names a row twice: refused', r.status === 400, r);
const moved = [c.id].concat(ids.filter(x => x !== c.id));
r = await call('PUT', '/admin/diagnosis-codes/order', { ids: moved }, A);
check('the last row moved to the top', r.status === 200 && r.data.map(x => x.id).join() === moved.join(), r.status);
check('... the consultation screen reads it first', (await doctorsRead())[0].id === c.id, (await doctorsRead())[0]);
check('... the order writes no line in the change log', (await lines()).total === n2, [(await lines()).total, n2]);
r = await call('PUT', '/admin/diagnosis-codes/order', { ids }, A);
check('the order put back', r.status === 200 && r.data.map(x => x.id).join() === ids.join(), r.status);

// ── no delete ──
r = await call('DELETE', '/admin/diagnosis-codes/' + b.id, null, A);
check('there is no delete', r.status === 404 && (await list()).some(x => x.id === b.id), r);

// ── a diagnosis already on a consultation keeps its own words ──
const depts = (await call('GET', '/admin/departments', null, A)).data;
const pat = (await call('POST', '/patients', { last_name: 'DIAG', first_name: tag, gender: 'F', date_of_birth: '1990-01-01' }, A)).data;
const visit = (await call('POST', '/visits', { patient_id: pat.id, visit_type: 'newVisit', department_id: depts[0].id, allow_duplicate: true }, A)).data;
const cons = (await call('POST', '/consultations', { visit_id: visit.id, patient_id: pat.id, department_id: depts[0].id }, A)).data;
r = await call('POST', '/consultations/' + cons.id + '/diagnoses', { diagnosis_code_id: c.id, icd_code: c.code, diagnosis_name: c.name_en }, A);
check('a diagnosis picked from the list goes on a consultation', r.status === 201, r);
r = await call('PUT', '/admin/diagnosis-codes/' + c.id, { code: tag + 'Z', name_en: 'Renamed ' + tag, is_active: false }, A);
check('its list row is renamed and switched off', r.status === 200 && r.data.is_active === false, r);
const dx = (await call('GET', '/consultations/' + cons.id + '/diagnoses', null, A)).data;
const line = (Array.isArray(dx) ? dx : dx.diagnoses || []).find(x => x.diagnosis_code_id === c.id);
check('... the patient\'s line still points at it and keeps its own code and name', line && line.icd_code === tag && line.diagnosis_name === 'Test fever ' + tag, line || dx);

// the test's rows cannot be deleted: left switched off, out of the doctors' search
for (const x of [a, b, c]) await call('PUT', '/admin/diagnosis-codes/' + x.id, { is_active: false }, A);
check('the test\'s rows are left switched off', (await list()).filter(x => [a.id, b.id, c.id].includes(x.id)).every(x => !x.is_active), null);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
