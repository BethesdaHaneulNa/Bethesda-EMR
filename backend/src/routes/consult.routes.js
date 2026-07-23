const express = require('express');
const { pool } = require('../config/database');
const { todayLocal } = require('../utils/localDate');
const { badAmounts } = require('../utils/validate');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// POST /api/consultations - start or reopen consultation
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.put('/:id/complete', async (req, res) => {
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
router.get('/:id/diagnoses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diagnosis WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/consultations/:id/diagnoses
router.post('/:id/diagnoses', async (req, res) => {
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
router.delete('/diagnosis/:dxId', async (req, res) => {
  try {
    await pool.query('DELETE FROM diagnosis WHERE id = $1', [req.params.dxId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Prescriptions ──

// GET /api/consultations/visit/:visitId/prescriptions  — 내원 단위 처방(문서 발급용)
router.get('/visit/:visitId/prescriptions', async (req, res) => {
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
router.get('/:id/prescriptions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescription WHERE consultation_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/consultations/:id/prescriptions
router.post('/:id/prescriptions', async (req, res) => {
  try {
    const { drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'total_qty', 'unit_price']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `INSERT INTO prescription (consultation_id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.params.id, drug_id, drug_code, drug_name, dose, frequency, days, route, total_qty, unit_price, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// PUT /api/consultations/prescription/:rxId - update prescription details
router.put('/prescription/:rxId', async (req, res) => {
  try {
    const { dose, frequency, days, route, memo, total_qty, unit_price } = req.body;
    const invalid = badAmounts(req.body, ['dose', 'frequency', 'days', 'total_qty', 'unit_price']);
    if (invalid) return res.status(400).json({ error: invalid });
    const calcQty = total_qty !== undefined && total_qty !== null && total_qty !== ''
      ? total_qty
      : ((parseFloat(dose) || 0) * (parseInt(frequency) || 1) * (parseInt(days) || 1));
    const result = await pool.query(
      `UPDATE prescription
       SET dose=$1, frequency=$2, days=$3, route=$4, memo=$5, total_qty=$6, unit_price=COALESCE($7, unit_price)
       WHERE id=$8 RETURNING *`,
      [dose, parseInt(frequency) || 1, parseInt(days) || 1, route, memo, calcQty, unit_price, req.params.rxId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/consultations/prescription/:rxId
router.delete('/prescription/:rxId', async (req, res) => {
  try {
    await pool.query('DELETE FROM prescription WHERE id = $1', [req.params.rxId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Order Items (Lab, Imaging, Procedures) ──

// POST /api/consultations/:id/orders
router.post('/:id/orders', async (req, res) => {
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
router.put('/order/:orderId', async (req, res) => {
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
router.delete('/order/:orderId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 검사 작업로그(worklist_log)가 이 오더를 참조하므로 먼저 정리
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
router.get('/:id/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM order_item WHERE consultation_id = $1 ORDER BY created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
