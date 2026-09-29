const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { badAmounts } = require('../utils/validate');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// Writing prescriptions and orders is the doctor's job. The menu already hides this
// screen from other roles, but the menu is not a lock - a pharmacy or cashier account
// could still post prescriptions straight to these endpoints.
const canConsult = permMiddleware('consultation');
// Reading them: the screens that show a visit's prescriptions and orders -
// consultation, and payment / pharmacy through PatientChart and the document window
// (DocumentModal reads /visit/:id/prescriptions to fill a new document). Lab and
// reception open documents read-only with no visit context, so they never call these.
// Decision S2 (2026-09-29): the server checks what the screens already check; the
// route-by-route table is in wiki/handoff/settings.md "S2".
const canReadRx = permMiddleware('consultation', 'payment', 'pharmacy');

// Refusals the consultation screen recognises and translates. Keep these strings in
// step with LOCK_MESSAGES in frontend/src/pages/Consultation.jsx.
const RX_DISPENSED = 'Prescription already dispensed';
const ORDER_HAS_RESULT = 'Order already has a result';

// POST /api/consultations - start or reopen consultation
router.post('/', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { visit_id, patient_id, department_id } = req.body;

    if (!visit_id || !patient_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'visit_id and patient_id are required' });
    }

    // Reuse an existing consultation for this visit instead of creating duplicates
    // every time the doctor clicks the same waiting patient.
    const existing = await client.query(
      `SELECT * FROM consultation
        WHERE visit_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [visit_id]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].status !== 'completed' && existing.rows[0].status !== 'signed') {
        await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
      }
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }

    // First time this visit is opened for consultation.
    await client.query("UPDATE visit SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [visit_id]);
    const result = await client.query(
      `INSERT INTO consultation (visit_id, patient_id, doctor_id, department_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [visit_id, patient_id, req.user.id, department_id || req.user.department_id]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/consultations/:id - save consultation note
router.put('/:id', canConsult, async (req, res) => {
  try {
    const { subjective, objective, assessment, plan, note_text,
            bp_systolic, bp_diastolic, temperature, pulse, spo2, respiratory_rate, weight, height } = req.body;
    const result = await pool.query(
      `UPDATE consultation SET subjective=$1, objective=$2, assessment=$3, plan=$4, note_text=$5,
       bp_systolic=$6, bp_diastolic=$7, temperature=$8, pulse=$9, spo2=$10, respiratory_rate=$11, weight=$12, height=$13,
       updated_at=NOW() WHERE id=$14 RETURNING *`,
      [subjective, objective, assessment, plan, note_text, bp_systolic, bp_diastolic, temperature, pulse, spo2, respiratory_rate, weight, height, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/consultations/:id/complete - complete consultation
router.put('/:id/complete', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const consult = await client.query('SELECT visit_id FROM consultation WHERE id = $1', [req.params.id]);
    if (consult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query("UPDATE consultation SET status = 'completed', updated_at = NOW() WHERE id = $1", [req.params.id]);
    await client.query("UPDATE visit SET status = 'completed', updated_at = NOW() WHERE id = $1", [consult.rows[0].visit_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Diagnosis ──

// GET /api/consultations/:id/diagnoses
router.get('/:id/diagnoses', canConsult, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diagnosis WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/consultations/:id/diagnoses
router.post('/:id/diagnoses', canConsult, async (req, res) => {
  try {
    const { icd_code, diagnosis_name, diagnosis_type, sort_order } = req.body;
    const result = await pool.query(
      'INSERT INTO diagnosis (consultation_id, icd_code, diagnosis_name, diagnosis_type, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, icd_code, diagnosis_name, diagnosis_type || 'primary', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/consultations/diagnosis/:dxId
router.delete('/diagnosis/:dxId', canConsult, async (req, res) => {
  try {
    await pool.query('DELETE FROM diagnosis WHERE id = $1', [req.params.dxId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Prescriptions ──

// GET /api/consultations/visit/:visitId/prescriptions  — 내원 단위 처방(문서 발급용)
router.get('/visit/:visitId/prescriptions', canReadRx, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rx.* FROM prescription rx
         JOIN consultation c ON c.id = rx.consultation_id
        WHERE c.visit_id = $1 ORDER BY rx.sort_order, rx.id`,
      [req.params.visitId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/consultations/:id/prescriptions
router.get('/:id/prescriptions', canReadRx, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescription WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// The one place the total of a prescription line is worked out. The clinic prescribes
// the Korean way: `dose` is the DAILY total (일총투여), `frequency` how many times a day
// it is split into, `days` how long. So 3.000 / 3 / 7 is three tablets a day, one at a
// time, for a week: 21. Frequency only divides the day's amount for the label (one
// dose = dose / frequency, shown on screen); it does not change the total.
// Until 2026-09-29 the screen sent dose x frequency x days, three times too much on a
// TID line; rows saved then keep their total (see the PUT below).
// Everything else - the pharmacy's stock deduction, the bill, the drug statistics -
// reads total_qty as stored, so the formula lives here and nowhere else.
function rxTotal(dose, days) {
  const d = parseFloat(dose) || 0;
  const n = parseInt(days) || 1;
  return Math.round(d * n * 1000) / 1000;   // DECIMAL(10,3)
}

// POST /api/consultations/:id/prescriptions
router.post('/:id/prescriptions', canConsult, async (req, res) => {
  try {
    // total_qty from the client is ignored: the server works it out (rxTotal).
    const { drug_id, drug_code, drug_name, dose, frequency, days, route, unit_price, memo } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'unit_price']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `INSERT INTO prescription (consultation_id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.params.id, drug_id, drug_code, drug_name, dose, frequency, days, route, rxTotal(dose, days), unit_price, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// A write that matched no row either hit a dispensed line or a missing one; say which.
async function rxRefusal(res, rxId) {
  const r = await pool.query('SELECT status FROM prescription WHERE id = $1', [rxId]);
  if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  return res.status(409).json({ error: RX_DISPENSED });
}

// PUT /api/consultations/prescription/:rxId - update prescription details
router.put('/prescription/:rxId', canConsult, async (req, res) => {
  try {
    // total_qty from the client is ignored: the server works it out (rxTotal).
    const { dose, frequency, days, route, memo, unit_price } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'unit_price']);
    if (invalid) return res.status(400).json({ error: invalid });
    const freq = parseInt(frequency) || 1, nDays = parseInt(days) || 1;
    const newDose = dose === undefined || dose === null || String(dose).trim() === '' ? null : Number(dose);
    // Once the pharmacy has handed the drug over, its stock is already deducted.
    // Changing the line afterwards would move the bill but not the shelf, so the two
    // would disagree for good. The status test sits in the UPDATE itself so a
    // dispense landing at the same moment cannot slip between a check and the write.
    //
    // total_qty is recomputed only when the dose, the times a day or the days really
    // changed (compared as numbers: "3" and "3.000" are the same dose). The screen
    // saves a row whenever a field loses focus, so without this an old visit opened
    // after the formula change would have its totals cut to a third just by clicking
    // through them - and a visit already paid for would show up for a refund.
    // In the comparison the columns are the row's values before this UPDATE.
    const result = await pool.query(
      `UPDATE prescription
       SET dose=$1, frequency=$2, days=$3, route=$4, memo=$5, unit_price=COALESCE($7, unit_price),
           total_qty = CASE
             WHEN (CASE WHEN dose ~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$' THEN dose::numeric END) IS DISTINCT FROM $9::numeric
               OR frequency IS DISTINCT FROM $2
               OR days IS DISTINCT FROM $3
             THEN $6 ELSE total_qty END
       WHERE id=$8 AND status <> 'dispensed' RETURNING *`,
      [dose, freq, nDays, route, memo, rxTotal(dose, nDays), unit_price, req.params.rxId, newDose]
    );
    if (result.rows.length === 0) return rxRefusal(res, req.params.rxId);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/consultations/prescription/:rxId
router.delete('/prescription/:rxId', canConsult, async (req, res) => {
  try {
    // Same reason as the PUT above: a dispensed line stays.
    const result = await pool.query(
      "DELETE FROM prescription WHERE id = $1 AND status <> 'dispensed' RETURNING id", [req.params.rxId]);
    if (result.rows.length === 0) return rxRefusal(res, req.params.rxId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Order Items (Lab, Imaging, Procedures) ──

// POST /api/consultations/:id/orders
router.post('/:id/orders', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { order_code_id, order_code, order_name, code_type, dose, frequency, days, quantity, unit_price, memo } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'quantity', 'unit_price']);
    if (invalid) { await client.query('ROLLBACK'); return res.status(400).json({ error: invalid }); }
    // Get consultation info
    const cResult = await client.query('SELECT visit_id, patient_id FROM consultation WHERE id = $1', [req.params.id]);
    if (cResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Consultation not found' }); }
    const { visit_id, patient_id } = cResult.rows[0];

    // Get order code details for order-feed mapping.
    // The visible order window stays unified. For PACS/SmartServer, the EMR exports
    // the order type and modality; station AE is optional and is not auto-assigned.
    let pacs_modality = null, station_ae = null, body_part = null, worklist_enabled = false;
    if (order_code_id) {
      const ocResult = await client.query('SELECT * FROM order_code WHERE id = $1', [order_code_id]);
      if (ocResult.rows.length > 0) {
        const oc = ocResult.rows[0];
        pacs_modality = oc.pacs_modality;
        // Station AE intentionally ignored by default. The EMR sends modality/order,
        // not a device assignment.
        station_ae = null;
        body_part = oc.body_part;
        worklist_enabled = oc.worklist_enabled;
      }
    }

    await client.query(`CREATE TABLE IF NOT EXISTS pacs_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      worklist_scp_host VARCHAR(100) DEFAULT '192.168.0.222', worklist_scp_port INTEGER DEFAULT 10004, worklist_scp_ae VARCHAR(50) DEFAULT 'BROKER',
      bridge_token VARCHAR(100) DEFAULT 'change-me-bridge-token', emr_base_url VARCHAR(200) DEFAULT '',
      auto_create_worklist BOOLEAN DEFAULT TRUE, facility_name VARCHAR(100) DEFAULT 'Yonsei Shintong Clinic', notes TEXT,
      updated_by INTEGER, updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await client.query('INSERT INTO pacs_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
    const cfgResult = await client.query('SELECT * FROM pacs_config WHERE id = 1');
    const cfg = cfgResult.rows[0] || {};
    // Do not auto-fill station AE from device names. Multiple US rooms/devices can
    // share the same US order pool; assignment belongs to PACS/Worklist/workflow.
    station_ae = station_ae || null;
    if (cfg.auto_create_worklist === false) worklist_enabled = false;

    const oResult = await client.query(
      `INSERT INTO order_item (consultation_id, visit_id, patient_id, order_code_id, order_code, order_name, code_type,
       dose, frequency, days, quantity, unit_price, pacs_modality, station_ae, body_part, ordered_by, memo,
       worklist_status, scheduled_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,CURRENT_DATE) RETURNING *`,
      [req.params.id, visit_id, patient_id, order_code_id, order_code, order_name, code_type,
       dose, frequency, days, quantity, unit_price, pacs_modality, station_ae, body_part, req.user.id, memo,
       worklist_enabled ? 'pending' : 'completed']
    );

    const orderItem = oResult.rows[0];

    // If worklist enabled, create worklist log entry
    if (worklist_enabled && pacs_modality) {
      const today = todayLocal().replace(/-/g, '');
      // DICOM AccessionNumber is VR=SH (max 16 chars). order_item.id is globally
      // unique, so 'YYMMDD-<orderId>' is unique, traceable and well under 16 chars.
      const accession = `${today.slice(2)}-${orderItem.id}`;
      const studyUid = `1.2.826.0.1.3680043.${today}.${orderItem.id}.${Math.floor(Math.random() * 10000)}`;
      await client.query(
        `INSERT INTO worklist_log (order_item_id, patient_id, modality, station_ae, body_part, accession_no, study_instance_uid, scheduled_date, scheduled_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,CURRENT_TIME)`,
        [orderItem.id, patient_id, pacs_modality, station_ae || null, body_part, accession, studyUid]
      );
      // Update order item worklist status
      await client.query("UPDATE order_item SET worklist_status = 'sent', worklist_sent_at = NOW() WHERE id = $1", [orderItem.id]);
    }

    await client.query('COMMIT');
    res.status(201).json(orderItem);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});



// PUT /api/consultations/order/:orderId - update order item dosing/quantity details
router.put('/order/:orderId', canConsult, async (req, res) => {
  try {
    const { dose, frequency, days, quantity, memo, unit_price } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'quantity', 'unit_price']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `UPDATE order_item
       SET dose=$1, frequency=$2, days=$3, quantity=$4, memo=$5, unit_price=COALESCE($6, unit_price), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [dose, parseInt(frequency) || 1, parseInt(days) || 1, quantity === undefined || quantity === null || quantity === '' ? 1 : quantity, memo, unit_price, req.params.orderId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/consultations/order/:orderId
router.delete('/order/:orderId', canConsult, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // An order that has produced something is a record, not a request any more.
    // lab_result and worklist_log both hang off order_item with ON DELETE CASCADE, so
    // deleting a resulted order would silently take the lab values, the imaging
    // accession and the radiology reading with it. Refuse instead.
    // FOR UPDATE first: a lab result being saved right now needs a key lock on this
    // row, so it either finishes before the check below sees it, or waits and then
    // fails on the missing order - never lands on an order we are deleting.
    const oi = await client.query(
      'SELECT id, result_text FROM order_item WHERE id = $1 FOR UPDATE', [req.params.orderId]);
    if (oi.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    const produced = await client.query(
      `SELECT EXISTS (SELECT 1 FROM lab_result WHERE order_item_id = $1)
           OR EXISTS (SELECT 1 FROM worklist_log WHERE order_item_id = $1
                                                   AND status IN ('in_progress','completed')) AS yes`,
      [req.params.orderId]);
    if (produced.rows[0].yes || String(oi.rows[0].result_text || '').trim() !== '') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: ORDER_HAS_RESULT });
    }
    // An unstarted worklist entry goes with the order (the FK cascades; explicit so
    // the intent is visible here).
    await client.query('DELETE FROM worklist_log WHERE order_item_id = $1', [req.params.orderId]);
    await client.query('DELETE FROM order_item WHERE id = $1', [req.params.orderId]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/consultations/:id/orders
router.get('/:id/orders', canReadRx, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM order_item WHERE consultation_id = $1 ORDER BY created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
