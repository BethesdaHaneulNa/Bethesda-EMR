// An order code's default directions (order_code.default_dose) are words or nothing
// (the director, 2026-10-01: the consultation screen's directions column filled itself
// with "1.000"). Run against an ISOLATED stack only - it creates order codes:
//
//   SE_ADMIN_PW=... node backend/test/settings.ordercodes.mjs     (default http://127.0.0.1:9187)
//
// Checks: after the migration no order code holds a bare number, and default_freq /
// default_days are still 1; a new code made without directions - or with the '1.000' an
// older screen still sends - is stored with none; words are kept, trimmed; the same on
// edit; the drug table's column of the same name is untouched.
//
// And price_editable (047, payment: the cashier may type the amount of a fee's line): only
// DOC has it after the migration (others may be ticked later); a fee code stores what is sent and keeps what it has when
// the field is not sent (an older screen); any other type stores false. Turning it on or
// off writes one line in the change log (settings.order.price_editable). Node 18+.
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
const tag = 'D' + crypto.randomBytes(3).toString('hex').toUpperCase();
const numeric = v => v != null && /^\s*[0-9]+([.,][0-9]*)?\s*$/.test(String(v));

// ── after the migration ──
const all = (await call('GET', '/admin/order-codes', null, A)).data;
check('there are seeded order codes to look at', all.length >= 30, all.length);
check('none holds a bare number as its directions', all.every(o => !numeric(o.default_dose)), all.filter(o => numeric(o.default_dose)).map(o => [o.code, o.default_dose]));
check('default_freq and default_days are still 1 on the seeded codes', all.filter(o => !String(o.code).startsWith('D') || o.code.length < 7).every(o => o.default_freq === 1 && o.default_days === 1),
  all.find(o => o.default_freq !== 1 || o.default_days !== 1));

// ── new codes ──
const body = (suffix, extra) => ({ code: tag + suffix, name: 'Rectoscopie ' + tag + suffix, name_en: '', code_type: 'procedure', group_name: 'Endoscopy',
  default_freq: 1, default_days: 1, price: 30000, price_clinic: 30000, pacs_modality: '', worklist_enabled: false, station_ae: '', body_part: '', memo: '', ...extra });
let r = await call('POST', '/admin/order-codes', body('A', {}), A);
check('a new code sent without default_dose has none (the column default is gone)', (r.status === 201 || r.status === 200) && r.data.default_dose === null, r);
const a = r.data;
check('... and keeps frequency 1 and days 1', a.default_freq === 1 && a.default_days === 1, [a.default_freq, a.default_days]);
r = await call('POST', '/admin/order-codes', body('B', { default_dose: '' }), A);
check('what the Settings form sends now (empty) -> none', r.data && r.data.default_dose === null, r);
for (const [i, v] of [['C', '1.000'], ['E', '1'], ['F', ' 2,5 '], ['G', '   ']]) {
  r = await call('POST', '/admin/order-codes', body(i, { default_dose: v }), A);
  check(`a bare number or blanks (${JSON.stringify(v)}) -> none, without refusing`, (r.status === 201 || r.status === 200) && r.data.default_dose === null, r);
}
r = await call('POST', '/admin/order-codes', body('H', { default_dose: '  PRN ' }), A);
check('words are kept, trimmed ("  PRN " -> PRN)', r.data && r.data.default_dose === 'PRN', r);
const h = r.data;
r = await call('POST', '/admin/order-codes', body('I', { default_dose: '1 fois' }), A);
check('a number with words is words ("1 fois")', r.data && r.data.default_dose === '1 fois', r);

// ── edit ──
r = await call('PUT', '/admin/order-codes/' + a.id, body('A', { default_dose: 'QD' }), A);
check('edit: directions added (QD)', r.status === 200 && r.data.default_dose === 'QD', r);
r = await call('PUT', '/admin/order-codes/' + h.id, body('H', { default_dose: '1.000' }), A);
check('edit: an older screen sending 1.000 back -> none', r.status === 200 && r.data.default_dose === null, r);
r = await call('PUT', '/admin/order-codes/' + a.id, body('A', { default_dose: '' }), A);
check('edit: directions removed', r.status === 200 && r.data.default_dose === null, r);

// ── price_editable: the amount of a fee's line may be typed at the till (047) ──
const fee = (suffix, extra) => body(suffix, { code_type: 'fee', group_name: 'Issuance', price: 5000, price_clinic: 5000, ...extra });
const seeded = (await call('GET', '/admin/order-codes', null, A)).data.filter(o => !String(o.code).startsWith(tag));
check('the list gives price_editable as true / false on every code', seeded.every(o => typeof o.price_editable === 'boolean'), seeded.find(o => typeof o.price_editable !== 'boolean'));
check('after the migration DOC has it', (seeded.find(o => o.code === 'DOC') || {}).price_editable === true, seeded.find(o => o.code === 'DOC'));
check('no code of another type has it', seeded.every(o => o.code_type === 'fee' || !o.price_editable), seeded.filter(o => o.code_type !== 'fee' && o.price_editable).map(o => o.code));
const ticked = seeded.filter(o => o.price_editable).map(o => o.code);
if (ticked.join() !== 'DOC') console.log('  (note)  ticked on this stack besides DOC: ' + ticked.filter(c => c !== 'DOC').join(', '));
const priceLines = async () => (await call('GET', '/admin/audit?action=settings.order.price&limit=1', null, A)).data.total;
const linesBefore = await priceLines();
// turning it on or off is a line of the change log (decided 2026-10-01)
const tickLines = async () => (await call('GET', '/admin/audit?action=settings.order.price_editable&limit=200', null, A)).data;
const ticksBefore = (await tickLines()).total;
const lastTick = async () => (await tickLines()).rows[0] || {};

r = await call('POST', '/admin/order-codes', fee('P', { price_editable: true }), A);
check('a new fee code sent with price_editable true keeps it', (r.status === 201 || r.status === 200) && r.data.price_editable === true, r);
const pe = r.data;
let line = await lastTick();
check('... and that is a line in the log: the code, nothing before, on', (await tickLines()).total === ticksBefore + 1 && String(line.entity_id) === String(pe.id) && String(line.summary).includes(pe.code)
  && line.before_value == null && line.after_value && line.after_value.price_editable === true && line.staff_name, line);
r = await call('POST', '/admin/order-codes', fee('Q', {}), A);
check('a new fee code sent without it has none', r.data && r.data.price_editable === false, r);
const pq = r.data;
r = await call('POST', '/admin/order-codes', body('R', { price_editable: true }), A);
check('a new procedure code sent with it: ignored (false)', r.data && r.data.price_editable === false, r);
r = await call('POST', '/admin/order-codes', body('S', { code_type: 'lab', group_name: 'Laboratory', price_editable: 'true' }), A);
check('... a lab code too', r.data && r.data.price_editable === false, r);
check('new codes made without it wrote no line', (await tickLines()).total === ticksBefore + 1, (await tickLines()).total - ticksBefore);

const till = (await call('GET', '/admin/order-codes?code_type=fee', null, A)).data;
check('what the payment screen reads (?code_type=fee) shows it', (till.find(o => o.id === pe.id) || {}).price_editable === true && (till.find(o => o.id === pq.id) || {}).price_editable === false,
  till.filter(o => o.id === pe.id || o.id === pq.id).map(o => [o.code, o.price_editable]));

r = await call('PUT', '/admin/order-codes/' + pe.id, fee('P', { name: 'Frais ' + tag }), A);
check('edit without the field (an older screen): kept', r.status === 200 && r.data.price_editable === true && r.data.name === 'Frais ' + tag, r);
r = await call('PUT', '/admin/order-codes/' + pe.id, fee('P', { price_editable: false }), A);
check('edit: unticked', r.status === 200 && r.data.price_editable === false, r);
line = await lastTick();
check('... one line: on -> off (the edit before it, which kept the tick, wrote none)', (await tickLines()).total === ticksBefore + 2 && String(line.entity_id) === String(pe.id)
  && line.before_value.price_editable === true && line.after_value.price_editable === false, line);
r = await call('PUT', '/admin/order-codes/' + pe.id, fee('P', {}), A);
check('edit without the field: stays unticked', r.status === 200 && r.data.price_editable === false, r);
r = await call('PUT', '/admin/order-codes/' + pq.id, fee('Q', { price_editable: true }), A);
check('edit: ticked', r.status === 200 && r.data.price_editable === true, r);
line = await lastTick();
check('... one line: off -> on', (await tickLines()).total === ticksBefore + 3 && String(line.entity_id) === String(pq.id)
  && line.before_value.price_editable === false && line.after_value.price_editable === true, line);
r = await call('PUT', '/admin/order-codes/' + pq.id, body('Q', { code_type: 'lab', group_name: 'Laboratory', price: 5000, price_clinic: 5000, price_editable: true }), A);
check('edit: the type changed to lab - false, whatever is sent', r.status === 200 && r.data.code_type === 'lab' && r.data.price_editable === false, r);
r = await call('PUT', '/admin/order-codes/' + pq.id, fee('Q', {}), A);
check('... and back to a fee without the field: still false', r.status === 200 && r.data.code_type === 'fee' && r.data.price_editable === false, r);
line = await lastTick();
check('the type change that switched it off is a line too (on -> off), and nothing after it', (await tickLines()).total === ticksBefore + 4 && String(line.entity_id) === String(pq.id)
  && line.before_value.price_editable === true && line.after_value.price_editable === false, [(await tickLines()).total - ticksBefore, line]);
check('ticking and unticking wrote no price line (the price did not change)', (await priceLines()) === linesBefore, [linesBefore, await priceLines()]);
r = await call('PUT', '/admin/order-codes/' + pe.id, fee('P', { price_editable: true, price: 7000, price_clinic: 7000 }), A);
check('a save that changes the price and the tick writes one line of each', r.status === 200 && (await priceLines()) === linesBefore + 1 && (await tickLines()).total === ticksBefore + 5,
  [(await priceLines()) - linesBefore, (await tickLines()).total - ticksBefore]);

// ── the drug table's column is another thing ──
const drugs = (await call('GET', '/admin/drugs', null, A)).data;
check('drugs are read as before (their default_dose is a dose, not touched here)', Array.isArray(drugs) && drugs.length > 0, drugs.length);

for (const o of (await call('GET', '/admin/order-codes?q=' + tag, null, A)).data) await call('DELETE', '/admin/order-codes/' + o.id, null, A);
console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
