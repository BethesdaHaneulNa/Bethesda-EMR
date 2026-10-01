// A finished imaging order whose images the image server no longer has under the
// number the EMR kept: find them again by accession number (2026-10-01).
//
// How it happens: someone corrects a study in Orthanc's own administration screen
// ("Modify", whose default choice gives the study a new StudyInstanceUID and deletes
// the original). The order's line still says "2 image(s)" and the image window says
// the server does not have them - for good, because the bridge only looks for the
// images of orders that are still waiting.
//
// The rule is the bridge's own (find_stable_study in the PACS's bridge.py): the study
// is taken only when exactly one carries the order's accession number and Orthanc
// calls it stable, and the patient number inside the images is compared with the
// chart again - a study that turns out to be another patient's gets its warning.
// Nothing is changed on the image server: only what the EMR noted about the order.
//
// Never in the way: if the image server cannot be asked, or anything here fails, the
// image window opens as it did before.

const { pool } = require('../config/database');
const { writeAudit, ACTIONS } = require('../utils/audit');
const { orthancJson } = require('./pacs.viewer');
const { OPEN_ON } = require('./pacs.exam');

const MAX_ASKED = 60;        // studies of one patient asked about in one go
const ASK_MS = 2000;         // an image server that is switched off must not hold the window long

function samePatientId(a, b) {
  return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
}
function patientCheck(imagePatientId, chartNo) {
  return !String(imagePatientId || '').trim() ? 'missing' : (samePatientId(imagePatientId, chartNo) ? 'match' : 'mismatch');
}

const linkOf = w => w.image_study_uid || w.study_instance_uid;

// The one stable study carrying this accession number, or null.
async function studyByAccession(cfg, accession) {
  const found = await orthancJson(cfg, '/tools/find', 'POST', { Level: 'Study', Query: { AccessionNumber: accession }, Expand: true }, ASK_MS);
  if (!Array.isArray(found) || found.length !== 1 || !found[0].IsStable) return null;
  const s = found[0];
  // Orthanc matches with wildcards; an accession number has none, but be exact anyway.
  if (String((s.MainDicomTags || {}).AccessionNumber || '') !== accession) return null;
  const uid = String((s.MainDicomTags || {}).StudyInstanceUID || '');
  if (!/^[0-9.]{1,64}$/.test(uid)) return null;
  const stats = await orthancJson(cfg, '/studies/' + s.ID + '/statistics', 'GET', null, ASK_MS);
  if (!stats) return null;
  const tags = s.PatientMainDicomTags || {};
  return { id: String(s.ID), uid, instances: Number(stats.CountInstances) || 0,
           patient_id: String(tags.PatientID || '').trim().slice(0, 64), patient_name: String(tags.PatientName || '').trim().slice(0, 200) };
}

// Before the image window of an order opens: every finished imaging order of that
// patient whose study the image server does not have (one question for all of them)
// is looked up again by accession. Returns how many were found again.
async function relinkLostStudies(req, orderItemId) {
  try {
    if (!/^[0-9]{1,9}$/.test(String(orderItemId))) return 0;
    const cfg = (await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1')).rows[0] || {};
    if (!cfg.orthanc_password) return 0;
    // The opened order first, then the most recent.
    const r = await pool.query(
      `SELECT wl.id, wl.accession_no, wl.study_instance_uid, wl.image_study_uid
         FROM order_item me
         JOIN order_item oi ON oi.patient_id = me.patient_id
         JOIN LATERAL (SELECT w.* FROM worklist_log w WHERE w.order_item_id = oi.id ORDER BY w.id DESC LIMIT 1) wl ON true
        WHERE me.id = $1 AND wl.images_received_at IS NOT NULL
          AND NOT ${OPEN_ON('oi.id')}       -- images being moved (pacs.move.js) are not "lost"
        ORDER BY (oi.id = me.id) DESC, oi.id DESC LIMIT ${MAX_ASKED}`, [orderItemId]);
    const rows = r.rows.filter(w => linkOf(w));
    if (!rows.length) return 0;
    // DICOM list matching: one question, the studies the server has come back.
    const have = await orthancJson(cfg, '/tools/find', 'POST',
      { Level: 'Study', Query: { StudyInstanceUID: [...new Set(rows.map(linkOf))].join('\\') }, Expand: true }, ASK_MS);
    if (!Array.isArray(have)) return 0;
    const present = new Set(have.map(s => String((s.MainDicomTags || {}).StudyInstanceUID || '')));
    let n = 0;
    for (const w of rows) {
      if (present.has(linkOf(w)) || !w.accession_no) continue;
      const found = await studyByAccession(cfg, w.accession_no);
      if (found && found.uid !== linkOf(w) && await relink(req, w.id, linkOf(w), found)) n++;
    }
    return n;
  } catch (e) {
    console.error('[pacs] looking for lost studies:', e.message);
    return 0;
  }
}

// Point the worklist entry at the study that was found, and say so in the change log.
async function relink(req, worklistId, lostUid, found) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(
      `SELECT wl.id, wl.order_item_id, wl.patient_id, wl.accession_no, wl.study_instance_uid, wl.image_study_uid,
              wl.image_count, wl.image_patient_id, wl.patient_check, p.chart_no, oi.visit_id, oi.order_name
         FROM worklist_log wl JOIN patient p ON p.id = wl.patient_id JOIN order_item oi ON oi.id = wl.order_item_id
        WHERE wl.id = $1 AND wl.images_received_at IS NOT NULL FOR UPDATE OF wl`, [worklistId]);
    const row = q.rows[0];
    // Two image windows opened at once: the other one did it.
    if (!row || linkOf(row) !== lostUid) { await client.query('ROLLBACK'); return false; }
    const check = patientCheck(found.patient_id, row.chart_no);
    await client.query(
      `UPDATE worklist_log
          SET image_study_uid = $2, orthanc_study_id = $3, image_count = $4,
              image_patient_id = $5, image_patient_name = $6, patient_check = $7
        WHERE id = $1`,
      [row.id, found.uid === row.study_instance_uid ? null : found.uid, found.id, found.instances,
       found.patient_id || null, found.patient_name || null, check]);
    await writeAudit(client, req, {
      action: ACTIONS.PACS_STUDY_RELINK, patient_id: row.patient_id, visit_id: row.visit_id,
      entity: 'worklist_log', entity_id: row.id,
      summary: [row.accession_no, row.order_name].filter(Boolean).join(' - '),
      before: { study_uid: lostUid, image_count: row.image_count, image_patient_id: row.image_patient_id || '', patient_check: row.patient_check || '' },
      after: { study_uid: found.uid, image_count: found.instances, image_patient_id: found.patient_id, patient_check: check },
    });
    await client.query('COMMIT');
    console.log('[pacs] study found again by accession', row.accession_no, '- order item', row.order_item_id,
                '- images', row.image_count, '->', found.instances, '- patient check', row.patient_check, '->', check);
    return true;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[pacs] re-linking a study:', e.message);
    return false;
  } finally {
    client.release();
  }
}

module.exports = { relinkLostStudies, samePatientId, patientCheck };
