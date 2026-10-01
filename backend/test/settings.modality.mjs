// An order code's imaging modality is any DICOM code string, not a fixed list (the
// director, 2026-10-01: the rectoscope on site probably asks its worklist with "AS").
// Run against an ISOLATED stack only - it creates order codes, a patient, a visit, a
// consultation and orders, and sets the stack's bridge token:
//
//   SE_ADMIN_PW=... node backend/test/settings.modality.mjs     (default http://127.0.0.1:9187)
//
// Checks: the value is trimmed and upper-cased; 16 characters fit (migration: the columns
// were 10 wide); empty means none; anything else than A-Z 0-9 _ or longer than 16 is
// refused in words; the same on edit. Then the road the value travels: an order made in a
// consultation from an "AS" order code carries AS, and GET /pacs/worklist-feed gives the
// line with modality AS - and only it when the feed is asked for AS, as a device asks.
// The bridge and the device are the PACS session's. Node 18+. Exit code 1 on failure.
import crypto from 'crypto';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
if (!process.env.SE_ADMIN_PW) throw new Error('Set SE_ADMIN_PW');

async function call(method, path, body, token, headers) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(headers || {}) },
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
const tag = 'M' + crypto.randomBytes(3).toString('hex').toUpperCase();
const FORMAT = 'Modality must be 1 to 16 letters, digits or underscores (for example US, CR, AS)';
// what the Settings window sends for an imaging order code
const code = (suffix, modality) => ({ code: tag + suffix, name: 'Rectoscopie ' + tag + suffix, name_en: '', code_type: 'imaging', group_name: 'Endoscopy',
  default_dose: '1.000', default_freq: 1, default_days: 1, price: 30000, price_clinic: 30000, pacs_modality: modality, worklist_enabled: true,
  station_ae: '', body_part: 'RECTUM', memo: '' });

// ── the value as it is stored ──
let r = await call('POST', '/admin/order-codes', code('A', '  as '), A);
check('" as " is stored as AS', (r.status === 201 || r.status === 200) && r.data.pacs_modality === 'AS', r);
const asCode = r.data;
r = await call('POST', '/admin/order-codes', code('B', 'us'), A);
check('a listed value still works (us -> US)', r.data && r.data.pacs_modality === 'US', r);
const usCode = r.data;
r = await call('POST', '/admin/order-codes', code('C', 'abcdefgh_1234567'), A);
check('16 characters fit (the columns were 10 wide)', (r.status === 201 || r.status === 200) && r.data.pacs_modality === 'ABCDEFGH_1234567', r);
const longCode = r.data;
r = await call('POST', '/admin/order-codes', code('D', ''), A);
check('empty means no modality (null)', (r.status === 201 || r.status === 200) && r.data.pacs_modality === null, r);
const noneCode = r.data;
for (const [bad, why] of [['X-RAY', 'a hyphen'], ['A S', 'an inner space'], ['ÉCHO', 'an accented letter'], ['ABCDEFGH_12345678', '17 characters'], ["AS'; --", 'punctuation']]) {
  r = await call('POST', '/admin/order-codes', code('E', bad), A);
  check(`refused in words: ${why}`, r.status === 400 && r.data.error === FORMAT, r);
}
r = await call('PUT', '/admin/order-codes/' + noneCode.id, { ...code('D', ' xa ') }, A);
check('edit: cleaned the same way ( xa -> XA)', r.status === 200 && r.data.pacs_modality === 'XA', r);
r = await call('PUT', '/admin/order-codes/' + noneCode.id, { ...code('D', 'no good') }, A);
check('edit: a bad value is refused and the stored one stays', r.status === 400 && r.data.error === FORMAT
  && (await call('GET', '/admin/order-codes?q=' + tag + 'D', null, A)).data[0].pacs_modality === 'XA', r);

// ── the road to the device: consultation order -> worklist -> feed ──
const depts = (await call('GET', '/admin/departments', null, A)).data;
const pat = await call('POST', '/patients', { last_name: 'MODALITE', first_name: tag, gender: 'M', date_of_birth: '1980-02-02' }, A);
const visit = await call('POST', '/visits', { patient_id: pat.data.id, visit_type: 'newVisit', department_id: depts[0].id, allow_duplicate: true }, A);
const cons = await call('POST', '/consultations', { visit_id: visit.data.id, patient_id: pat.data.id, department_id: depts[0].id }, A);
check('a consultation to order in', cons.status === 201 || cons.status === 200, cons);
const order = (c) => call('POST', '/consultations/' + cons.data.id + '/orders',
  { order_code_id: c.id, order_code: c.code, order_name: c.name, code_type: 'imaging', quantity: 1, frequency: 1, days: 1, unit_price: 30000 }, A);
const oAs = await order(asCode), oUs = await order(usCode), oLong = await order(longCode);
check('the order made from the AS code carries AS', (oAs.status === 201 || oAs.status === 200) && oAs.data.pacs_modality === 'AS', oAs);
check('the 16-character value travels onto the order', oLong.data && oLong.data.pacs_modality === 'ABCDEFGH_1234567', oLong);

const token = 'test-' + crypto.randomBytes(18).toString('hex');
r = await call('PUT', '/pacs/config', { bridge_token: token }, A);
check('bridge token set on this stack', r.status === 200, r);
const feed = async (q) => (await call('GET', '/pacs/worklist-feed?format=json' + (q || ''), null, null, { 'x-bridge-token': token }));
r = await feed();
const lines = Array.isArray(r.data) ? r.data : (r.data.items || r.data.rows || r.data.worklist || []);
const mine = lines.filter(x => String(x.procedure_code || '').startsWith(tag));
check('the feed answers', r.status === 200 && lines.length >= 3, r.status === 200 ? Object.keys(r.data) : r);
check('feed: the AS order is there with modality AS', mine.some(x => x.procedure_code === asCode.code && x.modality === 'AS'), mine.map(x => [x.procedure_code, x.modality]));
check('feed: the 16-character value arrives whole', mine.some(x => x.modality === 'ABCDEFGH_1234567'), mine.map(x => x.modality));
r = await feed('&modality=AS');
const onlyAs = (Array.isArray(r.data) ? r.data : (r.data.items || r.data.rows || r.data.worklist || [])).filter(x => String(x.procedure_code || '').startsWith(tag));
check('feed asked for AS (as a device asks): the AS line and not the US one', onlyAs.length === 1 && onlyAs[0].procedure_code === asCode.code, onlyAs.map(x => [x.procedure_code, x.modality]));
r = await feed('&modality=as');
const lower = (Array.isArray(r.data) ? r.data : (r.data.items || r.data.rows || r.data.worklist || [])).filter(x => String(x.procedure_code || '').startsWith(tag));
check('... letter for letter: asked "as" in lower case, nothing comes (why the value is stored upper-cased)', lower.length === 0, lower.length);

// tidy: hide the test order codes (orders and worklist lines stay on the throwaway stack)
for (const c of [asCode, usCode, longCode, noneCode]) await call('DELETE', '/admin/order-codes/' + c.id, null, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
