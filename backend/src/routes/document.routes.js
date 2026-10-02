const express = require('express');
const { pool } = require('../config/database');
const { sendDbError } = require('../utils/dbError');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');

const router = express.Router();
router.use(authMiddleware);

// Decision S2 (2026-09-29): the server allows what the screens use. The document window
// (DocumentModal) is opened for editing from consultation, payment and pharmacy, and
// read-only (the chart viewer, no issue or void buttons) from lab and reception.
// Narrowing further by document kind (an outside prescription only for pharmacy and
// consultation, say) was not asked for.
const canReadDocs = permMiddleware('consultation', 'payment', 'pharmacy', 'lab', 'registration');
const canIssueDocs = permMiddleware('consultation', 'payment', 'pharmacy');
// The screen (external-rx.jsx issueBlocked) says the same in the user's language.
const NO_EXTERNAL = 'No prescription marked external: nothing to issue';

// Issued or only printed (director, 2026-10-02: "why are the imaging reports in the issue
// history? If it was printed, just keep a log line"). A document is ISSUED when a doctor
// writes it and gives it out - the referral letter, the medical certificate, the outside
// prescription, the chart records: it takes a number and a row here. A RESULT SHEET - the
// imaging report, the lab results, an exam's pictures - is a result that already exists,
// put on paper: no number, no row, one change-log line (POST /print-log below; the
// pictures' line is pacs.images.print, written by /api/pacs/export/printed).
// Rows of these three kinds issued before the change stay in document_log and are no
// longer listed by the screens. A screen still loaded from before the change would issue
// them here: refused, so that it says so instead of numbering a sheet.
const PRINT_ONLY = ['imaging-report', 'lab-results', 'imaging-images'];
const PRINTED_NOT_ISSUED = 'This sheet is printed, not issued';
const NOT_LOGGED = 'The print could not be logged';
// The people who can open the windows these sheets are printed from (the imaging list and
// the lab results window, on the consultation and payment screens).
const canPrintResults = permMiddleware('consultation', 'payment');

// Change log (decision 2026-09-30, (다) both; wiki/03-change-log.md 1절 「서류」): every
// document issued and every document voided makes one line, so the log tab shows every
// paper that left the clinic. The line names the paper (number and name) and never
// carries its contents: the payload holds diagnoses and findings, and the log tab is
// read with the settings permission. A draft print makes no document_log row and no line.
function docLabel(d) {
  return [d.doc_no, d.template_name || d.template_code].filter(Boolean).join(' ');
}

// The document row and its line are saved together, or neither is.
async function inTx(res, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query(out[0] < 300 ? 'COMMIT' : 'ROLLBACK');
    res.status(out[0]).json(out[1]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e2) { /* connection already out of the transaction */ }
    sendDbError(res, err);
  } finally {
    client.release();
  }
}

// GET /api/documents/patient/:id  — 발급 이력 (최신순)
router.get('/patient/:id', canReadDocs, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, s.name AS issued_by_name
         FROM document_log d
         LEFT JOIN staff s ON d.issued_by = s.id
        WHERE d.patient_id = $1
        ORDER BY d.issued_at DESC, d.id DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/documents/:id  — 단건 (재출력)
router.get('/:id', canReadDocs, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, s.name AS issued_by_name
         FROM document_log d
         LEFT JOIN staff s ON d.issued_by = s.id
        WHERE d.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// POST /api/documents  — 발급(저장). 발급번호 자동 부여.
// body { template_code, template_name, patient_id, visit_id, consultation_id, lang, payload }
router.post('/', canIssueDocs, (req, res) => inTx(res, async (client) => {
  const { template_code, template_name, patient_id, visit_id, consultation_id, lang, payload } = req.body;
  if (!template_code || !patient_id) {
    return [400, { error: 'template_code and patient_id required' }];
  }
  if (PRINT_ONLY.indexOf(template_code) >= 0) return [400, { error: PRINTED_NOT_ISSUED }];
  // An outside prescription lists the visit's lines marked external; with none it was
  // issued as an empty paper that still took a number (integration test 2026-09-29, A;
  // pharmacy session). Checked before a number is drawn.
  if (template_code === 'external-rx') {
    const ext = await client.query(
      `SELECT COUNT(*)::int AS n FROM prescription rx JOIN consultation c ON c.id = rx.consultation_id
        WHERE rx.dispense_type = 'external' AND (c.visit_id = $1 OR c.id = $2)`,
      [visit_id || null, consultation_id || null]);
    if (!ext.rows[0].n) return [400, { error: NO_EXTERNAL }];   // refused: no line
  }
  const noRow = await client.query('SELECT generate_doc_no() AS doc_no');
  const docNo = noRow.rows[0].doc_no;
  const r = await client.query(
    `INSERT INTO document_log
       (doc_no, template_code, template_name, patient_id, visit_id, consultation_id, lang, payload, issued_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [docNo, template_code, template_name || null, patient_id,
     visit_id || null, consultation_id || null, lang || 'fr',
     JSON.stringify(payload || {}), req.user.id]
  );
  const d = r.rows[0];
  // A paper issued for a visit still waiting starts that visit (coordinator, 2026-10-01).
  // Since opening a patient no longer starts the consultation, a document could be issued
  // on a visit that stayed "waiting" - and a document is a record: the consultation
  // screen's "back to waiting" is refused for it, and reception may not cancel it. The
  // status now says so. No consultation row is made here; the first thing the doctor
  // saves makes it. A visit already in consultation or finished is left as it is.
  if (d.visit_id) {
    await client.query(
      "UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND status IN ('registered', 'waiting')",
      [d.visit_id]);
  }
  await writeAudit(client, req, {
    action: ACTIONS.DOCUMENT_ISSUE, patient_id: d.patient_id, visit_id: d.visit_id,
    entity: 'document', entity_id: d.id, summary: docLabel(d),
    after: { doc_no: d.doc_no, template_code: d.template_code, lang: d.lang },   // never the payload
  });
  return [201, d];
}));

// POST /api/documents/print-log - a result sheet is being printed: the change-log line,
// and nothing else. The screen prints only when this answered 200 - no line, no paper.
//   { kind: 'imaging-report', patient_id, order_item_ids: [id, ...], lang }
//       one line per exam (pacs.report.print): the exam must be the patient's and have a
//       reading. after = { order_name, accession_no, lang }.
//   { kind: 'lab-results', patient_id, visit_id?, dates: ['YYYY-MM-DD', ...], test_count, lang }
//       one line (laboratory.results.print). after = { dates, test_count, lang }.
// -> { ok: true, lines: n }. 400 for a body that names nothing to print, 404 for an exam
// that is not this patient's, 409 for an exam with no reading, 500 NOT_LOGGED when the
// line could not be written (everything is rolled back: no half-logged print).
router.post('/print-log', canPrintResults, (req, res) => inTx(res, async (client) => {
  const b = req.body || {};
  const patientId = parseInt(b.patient_id, 10);
  const lang = ['fr', 'en', 'ko'].indexOf(b.lang) >= 0 ? b.lang : null;
  if (!patientId) return [400, { error: 'patient_id required' }];
  const pat = await client.query('SELECT id FROM patient WHERE id = $1', [patientId]);
  if (pat.rows.length === 0) return [404, { error: 'Patient not found' }];

  if (b.kind === 'imaging-report') {
    const ids = Array.isArray(b.order_item_ids) ? b.order_item_ids.map((x) => parseInt(x, 10)) : [];
    if (!ids.length || ids.length > 50 || ids.some((x) => !(x > 0)) || new Set(ids).size !== ids.length) {
      return [400, { error: 'order_item_ids must list the exams printed' }];
    }
    const exams = await client.query(
      `SELECT oi.id, oi.patient_id, oi.visit_id, oi.order_name, oi.result_text,
              (SELECT w.accession_no FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) AS accession_no
         FROM order_item oi WHERE oi.id = ANY($1::int[])`, [ids]);
    const byId = {};
    exams.rows.forEach((e) => { byId[e.id] = e; });
    for (const id of ids) {
      const e = byId[id];
      if (!e || e.patient_id !== patientId) return [404, { error: 'Exam not found for this patient' }];
      if (String(e.result_text || '').trim() === '') return [409, { error: 'Exam has no reading to print' }];
    }
    for (const id of ids) {
      const e = byId[id];
      const logged = await writeAudit(client, req, {
        action: ACTIONS.PACS_REPORT_PRINT, patient_id: patientId, visit_id: e.visit_id,
        entity: 'order_item', entity_id: e.id,
        summary: 'Reading of ' + e.order_name + (e.accession_no ? ' (' + e.accession_no + ')' : '') + ' printed',
        after: { order_name: e.order_name, accession_no: e.accession_no || null, lang: lang },
      });
      if (!logged) return [500, { error: NOT_LOGGED, code: 'NOT_LOGGED' }];
    }
    return [200, { ok: true, lines: ids.length }];
  }

  if (b.kind === 'lab-results') {
    const dates = Array.isArray(b.dates) ? b.dates.map(String) : [];
    const tests = parseInt(b.test_count, 10);
    if (!dates.length || dates.length > 100 || dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)) || !(tests > 0)) {
      return [400, { error: 'dates and test_count must say what is printed' }];
    }
    let visitId = null;
    if (!blankId(b.visit_id)) {
      const v = await client.query('SELECT id FROM visit WHERE id = $1 AND patient_id = $2', [parseInt(b.visit_id, 10) || 0, patientId]);
      if (v.rows.length === 0) return [404, { error: 'Visit not found for this patient' }];
      visitId = v.rows[0].id;
    }
    const days = Array.from(new Set(dates)).sort();
    const logged = await writeAudit(client, req, {
      action: ACTIONS.LAB_RESULTS_PRINT, patient_id: patientId, visit_id: visitId,
      entity: 'patient', entity_id: patientId,
      summary: 'Lab results of ' + (days.length === 1 ? days[0] : days[0] + ' .. ' + days[days.length - 1]) + ' printed',
      after: { dates: days.join(', '), test_count: tests, lang: lang },
    });
    if (!logged) return [500, { error: NOT_LOGGED, code: 'NOT_LOGGED' }];
    return [200, { ok: true, lines: 1 }];
  }

  return [400, { error: "kind must be 'imaging-report' or 'lab-results'" }];
}));
function blankId(v) { return v === undefined || v === null || v === ''; }

// POST /api/documents/:id/void  — 발급 취소 (이력은 남기고 무효 표시)
// A document already voided is returned as it is: a second void used to write its own
// reason, time and person over the first ones, and now it changes nothing and makes no
// line (2026-09-30, with the change log).
router.post('/:id/void', canIssueDocs, (req, res) => inTx(res, async (client) => {
  const { reason } = req.body;
  const r = await client.query(
    `UPDATE document_log
        SET voided = TRUE, void_reason = $1, voided_at = NOW(), voided_by = $2
      WHERE id = $3 AND voided IS NOT TRUE
      RETURNING *`,
    [reason || null, req.user.id, req.params.id]
  );
  if (r.rows.length === 0) {
    const was = await client.query('SELECT * FROM document_log WHERE id = $1', [req.params.id]);
    if (was.rows.length === 0) return [404, { error: 'Not found' }];
    return [200, was.rows[0]];
  }
  const d = r.rows[0];
  await writeAudit(client, req, {
    action: ACTIONS.DOCUMENT_VOID, patient_id: d.patient_id, visit_id: d.visit_id,
    entity: 'document', entity_id: d.id, summary: docLabel(d),
    before: { voided: false },
    after: { voided: true, void_reason: d.void_reason },
  });
  return [200, d];
}));

module.exports = router;
