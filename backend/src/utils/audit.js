// The change log (decision 2026-09-29, table audit_log, migration 022).
//
// Usage, inside the transaction that makes the change:
//
//   const { writeAudit, ACTIONS } = require('../utils/audit');
//   await writeAudit(client, req, {
//     action: ACTIONS.LAB_RESULT_EDIT, patient_id, visit_id,
//     entity: 'lab_result', entity_id: row.id,
//     summary: 'Hb',                       // short, what the reader looks for
//     before: { value: '12.1', flag: 'L' },
//     after:  { value: '13.1', flag: '' },
//   });
//
// Rules for callers:
//   - Log a CHANGE, not the first entry: a result typed for the first time, a new
//     prescription, a new patient are ordinary work and are not written here.
//   - Pass only the fields that matter; before/after are cut down to the keys whose
//     value differs. If nothing differs, nothing is written.
//   - Pass the transaction's client, so the line and the change are saved together
//     or not at all. Passing the pool is allowed for a change made without one.
//
// The log never stops the work. If the line cannot be written (a bug here, a full
// disk) the error goes to the server log and the change itself still goes through:
// at a clinic with no developer on site, a lab result that cannot be corrected is
// worse than a correction with no line. With a client this needs a savepoint,
// because one failed statement would otherwise abort the caller's transaction.

const { pool } = require('../config/database');

// module.action - the first part is the module code used everywhere else.
const ACTIONS = {
  LAB_RESULT_EDIT:      'laboratory.result.edit',
  CONSULT_RECORD_EDIT:  'consultation.record.edit',     // edited after the consultation was finished
  PRESCRIPTION_DELETE:  'consultation.prescription.delete',
  ORDER_DELETE:         'consultation.order.delete',
  ORDER_CANCEL:         'consultation.order.cancel',
  RECEIPT_CANCEL:       'payment.receipt.cancel',
  RECEIPT_CORRECT:      'payment.receipt.correct',
  RECEIPT_PRINT_COMBINED: 'payment.receipt.print_combined',   // several receipts printed as one paper (2026-10-02): which receipts, which paper, how grouped - no money changes
  PATIENT_EDIT:         'reception.patient.edit',
  VISIT_TRANSFER:       'visit.transfer',               // a visit moved to another department or doctor (2026-09-30): before/after department and doctor, reason
  STAFF_CREATE:         'settings.staff.create',
  STAFF_EDIT:           'settings.staff.edit',          // name, role, status, department
  STAFF_PERMISSIONS:    'settings.staff.permissions',
  STAFF_PASSWORD:       'settings.staff.password',      // that it was changed and by whom - never the value
  DRUG_PRICE:           'settings.drug.price',          // unit price changed (decision 2026-09-30): before/after unit_price only
  PHRASE_CATEGORY:      'settings.phrase.category',     // a phrase category made, renamed or removed (2026-10-01): name, status, phrases moved
  ORDER_PRICE:          'settings.order.price',         // an order code's price changed (fee, lab, imaging, procedure): same shape
  DIAGNOSIS_CODE:       'settings.diagnosis.code',      // the list of frequent diagnoses (2026-10-02): a row added, edited, switched off or on - code, names, status
  ORDER_PRICE_EDITABLE: 'settings.order.price_editable', // "the amount can be changed at payment" turned on or off for a fee code (2026-10-01)
  // Documents (decision 2026-09-30, both): issuing is logged although it is a first entry -
  // the director wants every paper that left the clinic in the one log. A draft print is not an issue.
  DOCUMENT_ISSUE:       'documents.issue',
  DOCUMENT_VOID:        'documents.void',
  // Result sheets (director, 2026-10-02): printing a reading or the lab results is not
  // issuing a document - no number, no row in the documents history, only this line: who,
  // whose, which exam or which days, in which language (routes/document.routes.js
  // POST /print-log). An exam's pictures on paper already have their line, pacs.images.print.
  PACS_REPORT_PRINT:    'pacs.report.print',
  LAB_RESULTS_PRINT:    'laboratory.results.print',
  // PACS (2026-10-01): a finished order's images were no longer on the image server under the
  // number the EMR kept and were found again by accession (routes/pacs.relink.js). Done by the
  // EMR itself when the image window is opened; the line names who opened it.
  PACS_STUDY_RELINK:    'pacs.study.relink',
  // PACS (2026-10-01): the images taken under one order were put under another order of the same
  // patient, on the image server and in the EMR (routes/pacs.move.js): which orders, how many
  // images, whether the reading went with them, the reason typed.
  PACS_STUDY_MOVE:      'pacs.study.move',
  // PACS (2026-10-01): an exam's images given out of the clinic - printed on paper
  // (routes/pacs.export.js; the paper itself is a documents.issue line), or copied to a disc or a
  // file: whose, which exam(s), how many pictures, and for a copy its size and medium.
  PACS_IMAGES_PRINT:    'pacs.images.print',
  PACS_IMAGES_EXPORT:   'pacs.images.export',
};
const KNOWN = new Set(Object.values(ACTIONS));

// Never written, whatever the caller passes.
const SECRET_KEY = /pass|pwd|secret|token|hash|salt/i;

function plain(v) {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return v;
}
function same(a, b) {
  return JSON.stringify(plain(a)) === JSON.stringify(plain(b));
}

// Keep only the keys that differ; drop anything that looks like a secret.
function changedOnly(before, after) {
  const b = {}, a = {};
  const keys = new Set([].concat(Object.keys(before || {}), Object.keys(after || {})));
  keys.forEach(function (k) {
    if (SECRET_KEY.test(k)) return;
    const bv = before ? before[k] : undefined, av = after ? after[k] : undefined;
    if (before && after && same(bv, av)) return;
    if (before) b[k] = plain(bv);
    if (after) a[k] = plain(av);
  });
  return { before: before ? b : null, after: after ? a : null };
}

async function patientLabel(db, patientId) {
  if (!patientId) return { name: null, chart: null };
  const r = await db.query('SELECT to_jsonb(p) AS p FROM patient p WHERE id = $1', [patientId]);
  const p = r.rows[0] && r.rows[0].p;
  if (!p) return { name: null, chart: null };
  const name = [p.last_name, p.first_name].filter(Boolean).join(' ') || p.name || null;
  return { name: name, chart: p.chart_no || p.chart_number || null };
}

async function insert(db, req, e, cut) {
  const u = (req && req.user) || {};
  const who = await patientLabel(db, e.patient_id);
  await db.query(
    `INSERT INTO audit_log (staff_id, staff_name, staff_role, module, action,
                            patient_id, patient_name, chart_no, visit_id,
                            entity, entity_id, summary, before_value, after_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [u.id || null, u.name || u.login_id || null, u.role || null,
     String(e.action).split('.')[0], e.action,
     e.patient_id || null, who.name, who.chart, e.visit_id || null,
     e.entity || null, e.entity_id == null ? null : String(e.entity_id),
     e.summary ? String(e.summary).slice(0, 300) : null,
     cut.before ? JSON.stringify(cut.before) : null,
     cut.after ? JSON.stringify(cut.after) : null]);
}

// db: the transaction's client, or nothing / the pool for a change made without one.
// Returns true when a line was written.
async function writeAudit(db, req, entry) {
  const e = entry || {};
  if (!KNOWN.has(e.action)) {
    console.error('[audit] unknown action, nothing written:', e.action);
    return false;
  }
  const cut = changedOnly(e.before || null, e.after || null);
  if (e.before && e.after && !Object.keys(cut.after).length && !Object.keys(cut.before).length) return false;

  const inTx = !!db && db !== pool;
  const target = inTx ? db : pool;
  try {
    if (inTx) await target.query('SAVEPOINT audit_line');
    await insert(target, req, e, cut);
    if (inTx) await target.query('RELEASE SAVEPOINT audit_line');
    return true;
  } catch (err) {
    console.error('[audit] line not written (' + e.action + '):', err.message);
    if (inTx) {
      try { await target.query('ROLLBACK TO SAVEPOINT audit_line'); } catch (e2) { /* not in a transaction */ }
    }
    return false;
  }
}

module.exports = { writeAudit, ACTIONS, changedOnly };
