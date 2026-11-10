// ⚠ 격리 스택 전용 — 운영 EMR(9080)·운영 DB에 절대 돌리지 마세요.
//   ISOLATED SESSION STACK ONLY — never against the clinic's EMR or database.
//
// Statistics against the till (bug hunt round 9, 2026-11-10; the routes had no test). It
// writes nothing: it reads what the other tests left and checks that the figures agree
// with one another and with the payment screen's own - run billing.api.mjs first, so there
// are part payments, carried balances, a correction and cancelled receipts to add up:
//   ST_TEST_BASE=http://127.0.0.1:9187/api node backend/test/stats.api.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.ST_TEST_BASE || 'http://127.0.0.1:9187/api';
if (/:9080(\/|$)/.test(BASE)) { console.error('Refusing to run against 9080 (the clinic\'s EMR).'); process.exit(2); }
const RC_CREDS = path.join(os.tmpdir(), 'bethesda-rc-test-' + new URL(BASE).port + '.json');
if (!fs.existsSync(RC_CREDS)) { console.error('Run backend/test/reception.api.mjs and billing.api.mjs on this stack first.'); process.exit(2); }
const creds = JSON.parse(fs.readFileSync(RC_CREDS));
async function call(method, p, body, token) {
  const r = await fetch(BASE + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch (e) { /* no body */ }
  return { status: r.status, data };
}
let fails = 0;
function check(name, ok, extra) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); if (!ok) fails++; }
const login = async (c) => (await call('POST', '/auth/login', { login_id: c.login_id, password: c.password })).data.token;
const A = await login(creds.admin), F = await login(creds.staff.frontdesk), SO = await login(creds.staff.statsOnly);
const n = (x) => Number(x) || 0;
const today = (await call('GET', '/billing/cash-day', null, A)).data.today;
const day = '?from=' + today + '&to=' + today;

const sum = (await call('GET', '/stats/summary' + day, null, A)).data;
const till = (await call('GET', '/billing/cash-day?date=' + today, null, A)).data;
check('there is money to add up (run billing.api.mjs first)', n(sum.revenue.billCount) > 0 && n(till.net) > 0, { bills: sum.revenue.billCount, till: till.net });
check('the day\'s cash in the statistics = the till\'s (in, out, net)', sum.cash.net === Math.round(n(till.net)) && sum.cash.in === Math.round(n(till.cash_in)) && sum.cash.out === Math.round(n(till.cash_out)), [sum.cash, till.net]);
check('cash by kind adds up to the net', Object.values(sum.cash.byKind).reduce((s, v) => s + n(v), 0) === sum.cash.net, sum.cash.byKind);
const deptPaid = sum.revenueByDept.reduce((s, r) => s + n(r.paid), 0), docPaid = sum.revenueByDoctor.reduce((s, r) => s + n(r.paid), 0);
check('money received by department = by doctor = the total', Math.abs(deptPaid - docPaid) < 1 && Math.abs(deptPaid - n(sum.revenue.paid)) < 1, { deptPaid, docPaid, paid: sum.revenue.paid });
check('billed by department = the total billed = consultation + drugs + acts', Math.abs(sum.revenueByDept.reduce((s, r) => s + n(r.gross), 0) - n(sum.revenue.gross)) < 1 && Math.abs(n(sum.revenue.consult) + n(sum.revenue.drug) + n(sum.revenue.procedure) - n(sum.revenue.gross)) < 1, sum.revenue);
const out = (await call('GET', '/stats/outstanding', null, A)).data;
let owed = 0; for (const o of out.owed) owed += n((await call('GET', '/billing/patient/' + o.patient_id + '/balance', null, A)).data.owed);
check('the list of balances = each patient\'s balance at the till, and = the summary\'s figure', Math.abs(owed - n(out.owedTotal)) < 1 && Math.abs(out.owed.reduce((s, o) => s + n(o.amount), 0) - n(out.owedTotal)) < 1 && Math.abs(n(sum.outstanding.owed) - n(out.owedTotal)) < 1, { owed, total: out.owedTotal, summary: sum.outstanding });
const cash = (await call('GET', '/stats/cash' + day, null, A)).data;
check('cash per day: the one day = its total = the till', cash.periods.length === 1 && cash.total.net === cash.periods[0].net && cash.total.net === Math.round(n(till.net)), cash.total);
const month = (await call('GET', '/stats/cash?granularity=month', null, A)).data;
check('cash per month: the periods add up to the total', month.periods.reduce((s, p) => s + n(p.net), 0) === month.total.net, month.total);
check('visits: new + follow-up + other = total, and by department too', n(sum.visits.new_visits) + n(sum.visits.follow_ups) + n(sum.visits.other_visits) === n(sum.visits.total) && sum.byDept.reduce((s, r) => s + n(r.cnt), 0) === n(sum.visits.total), sum.visits);
const wl = (await call('GET', '/stats/workload' + day, null, A)).data;
check('workload: visits by department add up, and equal the summary\'s visits', wl.departments.reduce((s, r) => s + n(r.visits), 0) === n(wl.total.visits) && n(wl.total.visits) === n(sum.visits.total), wl.total);
const pt = (await call('GET', '/stats/patients' + day, null, A)).data;
check('patients: the age bands add up; men + women + unknown = each band', pt.bands.reduce((s, r) => s + n(r.patients), 0) === n(pt.total.patients) && pt.bands.every(b => n(b.male) + n(b.female) + n(b.sex_unknown) === n(b.patients)) && n(pt.total.patients) === n(sum.visits.unique_patients), pt.total);
const ord = (await call('GET', '/stats/orders' + day, null, A)).data;
check('orders: the lines add up to the total', ord.rows.reduce((s, r) => s + n(r.count), 0) === n(ord.total.count) && Math.abs(ord.rows.reduce((s, r) => s + n(r.amount), 0) - n(ord.total.amount)) < 1, ord.total);
const mo = (await call('GET', '/stats/monthly', null, A)).data;
const all = (await call('GET', '/stats/summary', null, A)).data;
check('the month in the monthly chart = the summary of the month', Array.isArray(mo) && mo.length > 0 && n(mo[mo.length - 1].revenue) === n(all.revenue.paid) && n(mo[mo.length - 1].visits) === n(all.visits.total), mo[mo.length - 1]);

// what is asked wrongly
const bad = ['/stats/summary?from=hello', '/stats/summary?from=2026-13-45&to=2026-11-10', '/stats/summary?from=2026-02-30&to=2026-03-01', '/stats/summary?from=2026-11-10&to=2026-11-01',
  '/stats/cash?from=hello', '/stats/drug-usage?from=2026-02-30', '/stats/orders?type=nonsense', '/stats/orders?department_id=abc', '/stats/diagnoses?scope=nonsense', '/stats/workload?doctor_id=abc', '/stats/patients?from=hello'];
const got = []; for (const p of bad) got.push((await call('GET', p, null, A)).status);
check('a date that is not one (the 30th of February too), a range backwards, a filter that is not a number: 400', got.every(s => s === 400), got);
const odd = ['/stats/cash?granularity=century', '/stats/drug-usage?basis=nonsense', '/stats/monthly?months=abc', '/stats/monthly?months=100000', '/stats/outstanding?limit=abc', '/stats/cash?from=1900-01-01&to=2100-01-01'];
const got2 = []; for (const p of odd) got2.push((await call('GET', p, null, A)).status);
check('odd options fall back to the usual answer, never a 500', got2.every(s => s === 200), got2);
check('reception has no statistics (403); an account with statistics only reads them (200)', (await call('GET', '/stats/summary', null, F)).status === 403 && (await call('GET', '/stats/summary', null, SO)).status === 200 && (await call('GET', '/stats/outstanding', null, SO)).status === 200);

console.log(fails ? '\n' + fails + ' check(s) FAILED' : '\nall checks passed');
process.exit(fails ? 1 : 0);
