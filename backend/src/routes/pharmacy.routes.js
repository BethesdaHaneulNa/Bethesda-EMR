const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(permMiddleware('pharmacy'));

// The API client hands the screen only the error text, not the status code, so
// these exact strings are what Pharmacy.jsx recognises to show a translated
// message instead of raw English. Change them together.
const ERR_NOTHING_PENDING = 'No pending prescriptions for this consultation';
const ERR_TYPE_LOCKED = 'Prescription already dispensed; dispense type can no longer change';
const ERR_TOO_OLD = 'Prescription too old to dispense here; the doctor must prescribe again';

// How far back an undispensed prescription can still be dispensed from the
// patient search (decision M3, 2026-09-29: "today's list + the patient's older
// ones"; 7 days decided by the manager the same day). This is the one place to change it.
// Older ones go back to the doctor: symptoms move on, and an antibiotic started a
// fortnight late is a different treatment.
const PAST_RX_DAYS = 7;

// One row per consultation with its waiting lines. Shared by the day's queue and
// by the per-patient lookup so both hand the screen the same shape.
function pendingQuery(where) {
  return `SELECT
         c.id AS consultation_id,
         c.updated_at AS consultation_time,
         v.id AS visit_id,
         v.visit_date,
         (CURRENT_DATE - v.visit_date) AS days_ago,
         p.id AS patient_id,
         p.chart_no,
         p.last_name,
         p.first_name,
         p.gender,
         p.date_of_birth,
         p.allergies,
         s.name AS doctor_name,
         COUNT(rx.id) AS rx_count,
         COALESCE(SUM((COALESCE(rx.total_qty,0)) * COALESCE(rx.unit_price,0)),0) AS drug_total,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', rx.id,
             'drug_id', rx.drug_id,
             'drug_code', rx.drug_code,
             'drug_name', rx.drug_name,
             'dose', rx.dose,
             'frequency', rx.frequency,
             'days', rx.days,
             'route', rx.route,
             'total_qty', rx.total_qty,
             'unit_price', rx.unit_price,
             'memo', rx.memo,
             'dispense_type', rx.dispense_type,
             'status', rx.status,
             'created_at', rx.created_at
           ) ORDER BY rx.sort_order, rx.id
         ) AS prescriptions
       FROM consultation c
       JOIN visit v ON v.id = c.visit_id
       JOIN patient p ON p.id = c.patient_id
       LEFT JOIN staff s ON s.id = c.doctor_id
       JOIN prescription rx ON rx.consultation_id = c.id AND rx.status = 'ordered'
       WHERE c.status = 'completed' AND ${where}
       GROUP BY c.id, v.id, p.id, s.name`;
}

// GET /api/pharmacy/pending - completed consultations with undispensed prescriptions
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      pendingQuery('v.visit_date = CURRENT_DATE') + ' ORDER BY c.updated_at ASC, c.id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacy/patient/:patientId/pending - this patient's waiting prescriptions
// from today back PAST_RX_DAYS days, for the patient search: the day's queue shows
// today only, so a prescription not collected on the day is reached this way.
// Anything older is only counted, so the screen can say it exists and send the
// patient back to the doctor.
router.get('/patient/:patientId/pending', async (req, res) => {
  const pid = parseInt(req.params.patientId, 10);
  if (!Number.isInteger(pid) || pid <= 0) return res.status(400).json({ error: 'patientId must be a number' });
  try {
    const groups = await pool.query(
      pendingQuery('c.patient_id = $1 AND v.visit_date >= CURRENT_DATE - $2::int') + ' ORDER BY v.visit_date DESC, c.id DESC',
      [pid, PAST_RX_DAYS]
    );
    const older = await pool.query(
      `SELECT COUNT(DISTINCT c.id)::int AS n
         FROM consultation c
         JOIN visit v ON v.id = c.visit_id
         JOIN prescription rx ON rx.consultation_id = c.id AND rx.status = 'ordered'
        WHERE c.status = 'completed' AND c.patient_id = $1 AND v.visit_date < CURRENT_DATE - $2::int`,
      [pid, PAST_RX_DAYS]
    );
    res.json({ days: PAST_RX_DAYS, groups: groups.rows, older: older.rows[0].n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacy/completed - prescription groups dispensed today
router.get('/completed', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id AS consultation_id,
         MAX(rx.dispensed_at) AS dispensed_at,
         v.id AS visit_id,
         v.visit_date,
         (CURRENT_DATE - v.visit_date) AS days_ago,
         p.id AS patient_id,
         p.chart_no,
         p.last_name,
         p.first_name,
         p.gender,
         p.date_of_birth,
         p.allergies,
         s.name AS doctor_name,
         -- One row per consultation even when lines added after the first
         -- dispense were handed out by someone else; grouping by the dispenser
         -- used to list the same consultation twice.
         STRING_AGG(DISTINCT ds.name, ', ') AS dispensed_by_name,
         COUNT(rx.id) AS rx_count,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', rx.id,
             'drug_id', rx.drug_id,
             'drug_code', rx.drug_code,
             'drug_name', rx.drug_name,
             'dose', rx.dose,
             'frequency', rx.frequency,
             'days', rx.days,
             'route', rx.route,
             'total_qty', rx.total_qty,
             'unit_price', rx.unit_price,
             'memo', rx.memo,
             'dispense_type', rx.dispense_type,
             'status', rx.status,
             'dispensed_at', rx.dispensed_at
           ) ORDER BY rx.sort_order, rx.id
         ) AS prescriptions
       FROM consultation c
       JOIN visit v ON v.id = c.visit_id
       JOIN patient p ON p.id = c.patient_id
       LEFT JOIN staff s ON s.id = c.doctor_id
       JOIN prescription rx ON rx.consultation_id = c.id AND rx.status = 'dispensed'
       LEFT JOIN staff ds ON ds.id = rx.dispensed_by
       -- Dispensed today, whatever day the visit was: a prescription from three
       -- days ago handed out this morning belongs on today's list.
       WHERE rx.dispensed_at >= CURRENT_DATE
       GROUP BY c.id, v.id, p.id, s.name
       ORDER BY MAX(rx.dispensed_at) DESC NULLS LAST
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pharmacy/patient/:patientId/recent-rx - 최근 처방 (중복/조기 재처방 확인용)
router.get('/patient/:patientId/recent-rx', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rx.drug_code, rx.drug_name, rx.days, rx.status, c.consult_date, c.id AS consultation_id
         FROM prescription rx
         JOIN consultation c ON c.id = rx.consultation_id
        WHERE c.patient_id = $1
          AND c.consult_date >= CURRENT_DATE - INTERVAL '120 days'
        ORDER BY c.consult_date DESC, rx.id DESC`,
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pharmacy/consultations/:id/dispense - mark all pending prescriptions as dispensed
router.put('/consultations/:id/dispense', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rxResult = await client.query(
      `SELECT id, drug_id, drug_name, total_qty, COALESCE(dispense_type,'internal') AS dispense_type
       FROM prescription
       WHERE consultation_id = $1 AND status = 'ordered'
       ORDER BY sort_order, id
       FOR UPDATE`,
      [req.params.id]
    );

    if (rxResult.rows.length === 0) {
      // Also what the second of two people dispensing the same patient at once
      // gets: the lock above waits for the first, then finds nothing 'ordered'.
      await client.query('ROLLBACK');
      return res.status(404).json({ error: ERR_NOTHING_PENDING });
    }

    // The screen only offers prescriptions within PAST_RX_DAYS, but it is not the
    // only way to call this.
    const age = await client.query(
      `SELECT (CURRENT_DATE - v.visit_date) AS days_ago
         FROM consultation c JOIN visit v ON v.id = c.visit_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (age.rows.length && Number(age.rows[0].days_ago) > PAST_RX_DAYS) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: ERR_TOO_OLD, days: PAST_RX_DAYS });
    }

    // An "external" line is a paper prescription the patient fills at an outside
    // pharmacy — the clinic never hands the drug over (billing skips it for the
    // same reason), so its quantity must not leave our shelf count.
    const stockDrugIds = [...new Set(
      rxResult.rows
        .filter(rx => rx.drug_id && rx.dispense_type !== 'external')
        .map(rx => rx.drug_id)
    )].sort((a, b) => a - b);

    // Take every drug row lock up front, lowest id first. Locking them line by
    // line in prescription order let two patients with the same two drugs in
    // opposite order each hold one and wait for the other - Postgres then kills
    // one dispense with "deadlock detected". The loop below re-locks rows this
    // transaction already holds, which does not wait.
    if (stockDrugIds.length) {
      await client.query('SELECT id FROM drug WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [stockDrugIds]);
    }

    const shortages = [];
    for (const rx of rxResult.rows) {
      if (rx.drug_id && rx.dispense_type !== 'external') {
        const qty = Math.ceil(Number(rx.total_qty) || 0);
        if (qty > 0) {
          // Clamping at zero keeps the count sane, but the difference would then
          // vanish without trace and the shelf and the ledger drift apart, so
          // report what could not be covered instead of swallowing it.
          const cur = await client.query(
            'SELECT COALESCE(stock_qty,0) AS stock_qty FROM drug WHERE id = $1 FOR UPDATE',
            [rx.drug_id]
          );
          const before = Number(cur.rows[0] && cur.rows[0].stock_qty);
          await client.query(
            'UPDATE drug SET stock_qty = GREATEST(COALESCE(stock_qty,0) - $1, 0), updated_at = NOW() WHERE id = $2',
            [qty, rx.drug_id]
          );
          if (isFinite(before) && before < qty) {
            shortages.push({
              prescription_id: rx.id, drug_id: rx.drug_id, drug_name: rx.drug_name,
              requested: qty, available: before, missing: qty - before,
            });
          }
        }
      }
    }

    const updated = await client.query(
      `UPDATE prescription
       SET status = 'dispensed', dispensed_by = $1, dispensed_at = NOW()
       WHERE consultation_id = $2 AND status = 'ordered'
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    await client.query('COMMIT');
    res.json({
      success: true, dispensed_count: updated.rows.length,
      prescriptions: updated.rows, shortages,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/pharmacy/prescription/:id/dispense-type  — 원내(internal)/원외(external) 지정
// Only while the line is still waiting. Once dispensed, the stock has already
// been taken (or not) on the strength of this value; flipping an internal line
// to external afterwards would drop it from the bill while the drug stays off
// the shelf count. The screen hides the switch on dispensed lines, but the
// screen is not the only way to call this.
router.put('/prescription/:id/dispense-type', async (req, res) => {
  try {
    const dt = req.body.dispense_type === 'external' ? 'external' : 'internal';
    const r = await pool.query(
      `UPDATE prescription SET dispense_type = $1 WHERE id = $2 AND status = 'ordered' RETURNING *`,
      [dt, req.params.id]
    );
    if (r.rows.length === 0) {
      const exists = await pool.query('SELECT status FROM prescription WHERE id = $1', [req.params.id]);
      if (exists.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(409).json({ error: ERR_TYPE_LOCKED });
    }
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
