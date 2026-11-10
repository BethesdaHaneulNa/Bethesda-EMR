// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 환자·내원·진료를 만듭니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Consultation API checks (bug hunt, 2026-11-10):
// 1. POST /consultations files the consultation under the VISIT's patient; another
//    patient_id is refused (400 PATIENT_MISMATCH) instead of landing in that patient's history.
// 2. PUT /consultations/:id reads the vital signs as reception's route does: "36,5" is
//    36.5, '' empties, impossible values are refused with the field's name.
// 3. The same diagnosis twice: case, repeated spaces and accents aside.
//
// Uses the accounts reception.api.mjs made (run that first on the same stack):
//   node backend/test/reception.api.mjs && node backend/test/consult.api.mjs
//   CS_TEST_BASE=http://127.0.0.1:9187/api node backend/test/consult.api.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.CS_TEST_BASE || 'http://127.0.0.1:9187/api';
if (/:9080(\/|$)/.test(BASE)) { console.error('Refusing to run against 9080 (the clinic\'s EMR).'); process.exit(2); }
const RC_CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + new URL(BASE).port + '.json');
if (!fs.existsSync(RC_CREDS)) { console.error('Run backend/test/reception.api.mjs on this stack first (it makes the test accounts).'); process.exit(2); }
const creds = JSON.parse(fs.readFileSync(RC_CREDS));

async function call(method, p, body, token) {
  const r = await fetch(BASE + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body === undefined || body === null ? undefined : JSON.stringify(body) });
  let data = null; try { data = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + JSON.stringify(extra) : '')); if (!ok) fails++; }
const login = async (c) => (await call('POST', '/auth/login', { login_id: c.login_id, password: c.password })).data.token;

const A = await login(creds.admin), D = await login(creds.staff.doctor), F = await login(creds.staff.frontdesk);
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const tag = String(Date.now()).slice(-6);
const newVisit = async (n) => {
  const p = (await call('POST', '/patients', { last_name: 'Consult' + tag, first_name: n, gender: 'M' }, F)).data;
  const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit', department_id: DEPT }, F)).data;
  return { p, v };
};

// ── 1. the consultation belongs to the visit's patient ──
const a = await newVisit('A'), b = await newVisit('B');
const wrong = await call('POST', '/consultations', { visit_id: a.v.id, patient_id: b.p.id }, D);
check('POST /consultations with another patient\'s id → 400 PATIENT_MISMATCH', wrong.status === 400 && wrong.data.code === 'PATIENT_MISMATCH', { status: wrong.status, data: wrong.data });
const stillWaiting = (await call('GET', '/consultations/visit/' + a.v.id, null, D)).data;
check('… and nothing was started: the visit is still waiting, without a consultation', stillWaiting.visit_status === 'waiting' && stillWaiting.consultation === null, stillWaiting);
const right = await call('POST', '/consultations', { visit_id: a.v.id, patient_id: a.p.id }, D);
const asText = await call('POST', '/consultations', { visit_id: b.v.id, patient_id: String(b.p.id) }, D);
check('the visit\'s own patient → 201 (the id as text too)', right.status === 201 && right.data.patient_id === a.p.id && asText.status === 201 && asText.data.patient_id === b.p.id, { right: right.status, text: asText.status });
const C = right.data.id;

// ── 2. vital signs on the doctor's route ──
const put = (body) => call('PUT', '/consultations/' + C, body, D);
const comma = await put({ temperature: '36,5', bp_systolic: '120', bp_diastolic: ' 80 ', pulse: 72 });
check('"36,5" is saved as 36.5; "120" and " 80 " as numbers', comma.status === 200 && Number(comma.data.temperature) === 36.5 && comma.data.bp_systolic === 120 && comma.data.bp_diastolic === 80 && comma.data.pulse === 72, { status: comma.status, t: comma.data && comma.data.temperature });
const refusals = [[{ temperature: 99 }, 'temperature'], [{ spo2: 150 }, 'spo2'], [{ bp_systolic: -5 }, 'bp_systolic'], [{ pulse: 80.5 }, 'pulse'], [{ temperature: '37.2°' }, 'temperature'], [{ pulse: '80 bpm' }, 'pulse']];
for (const [body, field] of refusals) {
  const r = await put(body);
  check('refused: ' + JSON.stringify(body), r.status === 400 && String(r.data.error).indexOf(field + ' must ') === 0, { status: r.status, error: r.data && r.data.error });
}
const kept = (await call('GET', '/consultations/visit/' + a.v.id, null, D)).data.consultation;
check('a refused save changes nothing: temperature still 36.5, pulse still 72', Number(kept.temperature) === 36.5 && kept.pulse === 72, { t: kept.temperature, p: kept.pulse });
const emptied = await put({ temperature: '', pulse: null });
check('\'\' and null empty a field', emptied.status === 200 && emptied.data.temperature === null && emptied.data.pulse === null && emptied.data.bp_systolic === 120, { status: emptied.status });

// ── 3. the same diagnosis twice ──
const dx = (name) => call('POST', '/consultations/' + C + '/diagnoses', { diagnosis_name: name }, D);
const d1 = await dx('Fièvre typhoïde ' + tag);
const d2 = await dx('fievre  typhoide ' + tag), d3 = await dx('  FIÈVRE TYPHOÏDE ' + tag + ' '), d4 = await dx('Fièvre paratyphoïde ' + tag);
check('same words with other case, spaces or accents → 409; other words → 201', d1.status === 201 && d2.status === 409 && d3.status === 409 && d4.status === 201, { d1: d1.status, d2: d2.status, d3: d3.status, d4: d4.status });

// tidy: finish the two visits so no queue is left
await call('PUT', '/consultations/' + C + '/complete', null, D);
await call('PUT', '/consultations/' + asText.data.id + '/complete', null, D);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
