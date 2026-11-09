// Which orders are imaging exams for the PACS - the one place that says it: those of the
// imaging type, and any other order that carries a device type (pacs_modality, copied
// from its order code when it was ordered). An endoscopy is priced as a procedure
// (order codes E1, E2; the rectoscope on site, modality AS) and still sends pictures.
// It is the consultation screen's own rule for the image button (code_type imaging or
// pacs_modality), so whatever can be opened there is also in the patient's list, takes
// a reading, can be compared and printed (2026-10-01; before, saving such a reading
// answered "Imaging order not found" and the list left the exam out).
// `a` is the SQL alias (or table name) of order_item.
const isExam = a => `(${a}.code_type = 'imaging' OR COALESCE(${a}.pacs_modality, '') <> '')`;

// SQL: "a correction of images that is not finished involves this order item"
// (pacs.move.js, table pacs_study_move). While it is, the worklist feed, the bridge's
// arrival report, the accession re-link, comparisons and the image window leave the
// order alone. The four states are the table's own open states.
const OPEN_ON = col => `EXISTS (SELECT 1 FROM pacs_study_move pm WHERE pm.state IN ('started', 'emr-done', 'cleanup-pending', 'undo-pending')
                                 AND (pm.from_order_item_id = ${col} OR pm.to_order_item_id = ${col}))`;

module.exports = { isExam, OPEN_ON };
