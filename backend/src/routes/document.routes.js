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
