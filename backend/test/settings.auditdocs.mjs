// The Journal without the "document issued" lines (the director's decision (나),
// 2026-09-30): GET /api/admin/audit?exclude=documents.issue. Run against an ISOLATED
// stack only - it writes document lines straight into its database (the documents
// route is the consultation session's) and creates a staff account:
//
//   SE_ADMIN_PW=... node backend/test/settings.auditdocs.mjs     (default http://127.0.0.1:9187)
//   SE_DB_CONTAINER=bethesda-s-settings-db                        (default)
//
// Checks: excluded -> no issued lines, voided ones kept, the hidden count; not excluded ->
// all; the type filter "documents.issue" wins over the exclusion; totals and pages match;
// an unknown name in exclude is ignored; no settings permission -> 403. Node 18+.
import crypto from 'crypto';
import { execSync } from 'child_process';

const BASE = process.env.SE_TEST_BASE || 'http://127.0.0.1:9187/api';
if (new URL(BASE).port === '9080' || new URL(BASE).port === '') {
  throw new Error('Refusing to run against ' + BASE + ' - use an isolated session stack');
}
const DB = process.env.SE_DB_CONTAINER || 'bethesda-s-settings-db';
if (!/^bethesda-s-/.test(DB)) throw new Error('Refusing to write into ' + DB + ' - use an isolated session stack');
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
// 30 issued + 3 voided documents of one test patient, shaped as wiki/03-change-log.md 1
const tag = 'ZZDOC' + crypto.randomBytes(3).toString('hex').toUpperCase();
execSync(`docker exec -i ${DB} psql -q -v ON_ERROR_STOP=1 -U medconnect -d medconnect`, { input:
  `INSERT INTO audit_log (staff_name, staff_role, module, action, patient_name, chart_no, entity, entity_id, summary, before_value, after_value)
   SELECT 'Dr Test', 'doctor', 'documents', CASE WHEN g <= 3 THEN 'documents.void' ELSE 'documents.issue' END, '${tag}', '${tag}', 'document', g::text,
          'D26-' || g || ' Lettre de référence',
          CASE WHEN g <= 3 THEN '{"voided": false}'::jsonb END,
          CASE WHEN g <= 3 THEN '{"voided": true, "void_reason": "test"}'::jsonb
               ELSE jsonb_build_object('doc_no', 'D26-' || g, 'template_code', 'referral', 'lang', 'fr') END
     FROM generate_series(1, 33) g;` });

const q = (extra) => call('GET', '/admin/audit?patient=' + tag + '&' + extra, null, A);
let r = await q('limit=50&exclude=documents.issue');
check('excluded: no issued line', r.status === 200 && r.data.rows.every(x => x.action !== 'documents.issue'), r.data.rows && r.data.rows.map(x => x.action));
check('excluded: the 3 voided lines stay, total 3', r.data.total === 3 && r.data.rows.filter(x => x.action === 'documents.void').length === 3, r.data.total);
check('excluded: says 30 issued lines are hidden', r.data.excluded && r.data.excluded['documents.issue'] === 30, r.data.excluded);
r = await q('limit=50');
check('not excluded: all 33, no "excluded" in the answer', r.data.total === 33 && r.data.rows.length === 33 && !('excluded' in r.data), r.data.total);
r = await q('limit=50&action=documents.issue&exclude=documents.issue');
check('type filter "documents.issue" wins: its 30 lines', r.data.total === 30 && r.data.rows.every(x => x.action === 'documents.issue') && !r.data.excluded, r.data.total);
r = await q('limit=10&page=4');
check('pages, all lines: 33 in pages of 10 -> page 4 has 3', r.data.total === 33 && r.data.rows.length === 3, [r.data.total, r.data.rows.length]);
r = await q('limit=2&page=2&exclude=documents.issue');
check('pages, excluded: 3 in pages of 2 -> page 2 has 1', r.data.total === 3 && r.data.rows.length === 1, [r.data.total, r.data.rows.length]);
r = await q("limit=50&exclude=" + encodeURIComponent("nothing.here,documents.issue,'); DROP TABLE x;--"));
check('unknown names in exclude are ignored', r.status === 200 && r.data.total === 3 && Object.keys(r.data.excluded).join() === 'documents.issue', r.data);
r = await q('limit=50&exclude=nothing.here');
check('only unknown names: nothing excluded', r.status === 200 && r.data.total === 33 && !('excluded' in r.data), r.data.total);

const login = 'zzad' + crypto.randomBytes(2).toString('hex');
const pw = crypto.randomBytes(9).toString('base64url');
const st = await call('POST', '/admin/staff', { login_id: login, password: pw, name: 'Audit docs ' + login, role: 'doctor', permissions: ['consultation'] }, A);
const D = (await call('POST', '/auth/login', { login_id: login, password: pw })).data.token;
r = await call('GET', '/admin/audit?exclude=documents.issue', null, D);
check('no settings permission: 403', r.status === 403, r.status);
if (st.data && st.data.id) await call('PUT', '/admin/staff/' + st.data.id, { login_id: login, name: 'Audit docs ' + login, role: 'doctor', permissions: ['consultation'], status: 'inactive' }, A);

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nall checks passed');
process.exit(failed ? 1 : 0);
