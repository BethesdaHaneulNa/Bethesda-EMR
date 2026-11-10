// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요. 시험 환자·영상 오더를 만들고 브리지 토큰을 바꿉니다.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database (it replaces
//   the bridge token of the stack it runs on).
//
// Imaging, the database side (bug hunt round 7, 2026-11-10) - no image server is needed and
// none is contacted: an imaging order reaches the device feed, the bridge's report of the
// images is checked against the chart number, the entry then leaves the feed, a reading is
// saved / emptied, and what is not a number or a day is refused in words.
// Uses the accounts reception.api.mjs made (run it first on the same stack):
//   IM_TEST_BASE=http://127.0.0.1:9187/api node backend/test/imaging.api.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE = process.env.IM_TEST_BASE || 'http://127.0.0.1:9187/api';
if (/:9080(\/|$)/.test(BASE)) { console.error('Refusing to run against 9080 (the clinic\'s EMR).'); process.exit(2); }
const RC_CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + new URL(BASE).port + '.json');
if (!fs.existsSync(RC_CREDS)) { console.error('Run backend/test/reception.api.mjs on this stack first (it makes the test accounts).'); process.exit(2); }
const creds = JSON.parse(fs.readFileSync(RC_CREDS));

async function call(method, p, body, token, headers) {
  const r = await fetch(BASE + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}, headers || {}), body: body === undefined || body === null ? undefined : JSON.stringify(body) });
  let data = null; try { data = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); if (!ok) fails++; }
const login = async (c) => (await call('POST', '/auth/login', { login_id: c.login_id, password: c.password })).data.token;

const A = await login(creds.admin), D = await login(creds.staff.doctor), F = await login(creds.staff.frontdesk), L = await login(creds.staff.lab);
const DEPT = (await call('GET', '/admin/departments', null, A)).data.filter(d => d.is_active !== false)[0].id;
const tag = String(Date.now()).slice(-6);
const TOKEN = 'test-' + crypto.randomBytes(18).toString('hex');
check('the bridge token is set in Settings', (await call('PUT', '/pacs/config', { bridge_token: TOKEN }, A)).status === 200);
const BR = { 'X-Bridge-Token': TOKEN };
const oc = (await call('POST', '/admin/order-codes', { code: 'ZIM' + tag, name: 'Échographie test ' + tag, code_type: 'imaging', group_name: 'Other', price: 20000, price_clinic: 20000, pacs_modality: 'US', body_part: 'ABDOMEN', worklist_enabled: true }, A)).data;

async function order() {
  const p = (await call('POST', '/patients', { last_name: 'Imagerie' + tag, first_name: 'P', gender: 'M', date_of_birth: '1980-01-02' }, F)).data;
  const v = (await call('POST', '/visits', { patient_id: p.id, visit_type: 'newVisit', department_id: DEPT, allow_duplicate: true }, F)).data;
  const c = (await call('POST', '/consultations', { visit_id: v.id, patient_id: p.id }, D)).data;
  const o = (await call('POST', '/consultations/' + c.id + '/orders', { order_code_id: oc.id, order_code: oc.code, order_name: oc.name, code_type: 'imaging', quantity: 1, days: 1, unit_price: 20000 }, D)).data;
  return { p, v, c, o };
}
const feedRow = async (chart) => ((await call('GET', '/pacs/worklist-feed', null, null, BR)).data.rows || []).find(r => r.patient_id === chart) || null;
const reading = async (p) => ((await call('GET', '/pacs/readings/patient/' + p.id, null, D)).data || [])[0];

// ── the order reaches the device feed ──
const a = await order();
check('an imaging order of a worklist code is sent at once', a.o.worklist_status === 'sent' && a.o.pacs_modality === 'US', { st: a.o.worklist_status, mod: a.o.pacs_modality });
const row = await feedRow(a.p.chart_no);
check('the feed lists it with the chart number, the DICOM name, the birth date and its study number', !!row && row.dicom_patient_name === 'Imagerie' + tag + '^P' && row.birth_date === '19800102' && row.sex === 'M' && row.modality === 'US' && /^\d{6}-\d+$/.test(row.accession_no) && !!row.study_instance_uid, row);
const noToken = await call('GET', '/pacs/worklist-feed', null, null), wrong = await call('GET', '/pacs/worklist-feed', null, null, { 'X-Bridge-Token': 'wrong' }), asDoctor = await call('GET', '/pacs/worklist-feed', null, D);
check('without the token, with a wrong one, with a doctor\'s login: 401', noToken.status === 401 && wrong.status === 401 && asDoctor.status === 401, [noToken.status, wrong.status, asDoctor.status]);
check('a day that is not one: 400', (await call('GET', '/pacs/worklist-feed?date=hello', null, null, BR)).status === 400 && (await call('GET', '/pacs/worklist-feed?date=2026-02-30', null, null, BR)).status === 400);

// ── the images arrive ──
const other = await call('POST', '/pacs/study-arrived', { worklist_id: row.worklist_id, study_instance_uid: '1.2.3' }, null, BR);
check('a report for another study does not land on this entry: 409', other.status === 409, other);
const mismatch = await call('POST', '/pacs/study-arrived', { worklist_id: row.worklist_id, study_instance_uid: row.study_instance_uid, patient_id: 'XX-99999', patient_name: 'AUTRE^Patient', instances: 2 }, null, BR);
check('images carrying another patient number are kept and flagged: mismatch', mismatch.status === 200 && mismatch.data.patient_check === 'mismatch' && (await reading(a.p)).patient_check === 'mismatch', mismatch);
const match = await call('POST', '/pacs/study-arrived', { worklist_id: row.worklist_id, study_instance_uid: row.study_instance_uid, patient_id: a.p.chart_no, patient_name: 'x', instances: 3 }, null, BR);
const after = await reading(a.p);
check('images with the chart number: match, the count is kept', match.status === 200 && match.data.patient_check === 'match' && after.image_count === 3 && !!after.images_received_at, { n: after.image_count });
check('the finished entry left the device feed', (await feedRow(a.p.chart_no)) === null);
check('the order can no longer be deleted', (await call('DELETE', '/consultations/order/' + a.o.id, null, D)).status === 409);

// ── the reading ──
const saved = await call('PUT', '/pacs/reading/' + a.o.id, { result_text: 'Pas de foyer. Cœur de taille normale.' }, D);
const r1 = await reading(a.p);
check('a reading is saved with who and when', saved.status === 200 && r1.result_text === 'Pas de foyer. Cœur de taille normale.' && !!r1.result_at && !!r1.result_by_name, r1 && { at: r1.result_at, by: r1.result_by_name });
const emptied = await call('PUT', '/pacs/reading/' + a.o.id, { result_text: '   ' }, D);
const r2 = await reading(a.p);
check('a reading emptied has no author and no date left', emptied.status === 200 && r2.result_text === '' && r2.result_at === null && r2.result_by_name === null, r2 && { text: r2.result_text, at: r2.result_at, by: r2.result_by_name });
const bad = [
  await call('PUT', '/pacs/reading/' + a.o.id, { result_text: { a: 1 } }, D), await call('PUT', '/pacs/reading/abc', { result_text: 'x' }, D),
  await call('GET', '/pacs/readings/patient/abc', null, D), await call('GET', '/pacs/viewer-url?order_item_id=abc', null, D),
  await call('GET', '/pacs/moves/patient/abc', null, D), await call('GET', '/worklist?date=hello', null, D), await call('PUT', '/worklist/abc/status', { status: 'completed' }, A),
];
check('a reading that is not a text, ids that are not numbers, a day that is not one: 400', bad.every(r => r.status === 400), bad.map(r => r.status));
check('an unknown order: 404; the lab account may not write a reading: 403', (await call('PUT', '/pacs/reading/99999999', { result_text: 'x' }, D)).status === 404 && (await call('PUT', '/pacs/reading/' + a.o.id, { result_text: 'x' }, L)).status === 403);

// ── the bridge's own reports ──
check('heartbeat and image-backup report are taken with the token only', (await call('POST', '/pacs/bridge-heartbeat', { ok: true, synced: 1 }, null, BR)).status === 200 && (await call('POST', '/pacs/bridge-heartbeat', { ok: true }, null)).status === 401
  && (await call('POST', '/pacs/image-backup-report', { ok: true, disk_found: true, copied: 1 }, null, BR)).status === 200 && (await call('POST', '/pacs/image-backup-report', { ok: true }, null)).status === 401);
check('the settings refuse a port that is not one and a title too long', (await call('PUT', '/pacs/config', { worklist_scp_port: 70000 }, A)).status === 400 && (await call('PUT', '/pacs/config', { worklist_scp_ae: 'A'.repeat(60) }, A)).status === 400);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
