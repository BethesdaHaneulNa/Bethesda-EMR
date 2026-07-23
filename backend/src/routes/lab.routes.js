const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function computeFlag(value, lo, hi) {
  var n = parseFloat(value);
  if (isNaN(n)) return '';
  if (lo !== null && lo !== undefined && n < parseFloat(lo)) return 'low';
  if (hi !== null && hi !== undefined && n > parseFloat(hi)) return 'high';
  if ((lo === null || lo === undefined) && (hi === null || hi === undefined)) return '';
  return 'normal';
}

// ── PENDING lab orders (lab) — completed consultations w/ un-resulted lab orders ──
router.get('/pending', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.updated_at AS consultation_time,
              v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth, p.allergies,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT(
                'order_item_id', o.id, 'order_code', o.order_code, 'order_name', o.order_name,
                'order_code_id', o.order_code_id, 'status', o.status
              ) ORDER BY o.id) AS lab_orders
         FROM consultation c
         JOIN visit v ON v.id = c.visit_id
         JOIN patient p ON p.id = c.patient_id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.consultation_id = c.id AND o.code_type = 'lab'
              AND o.status NOT IN ('completed','cancelled')
        WHERE c.status = 'completed' AND v.visit_date = CURRENT_DATE
        GROUP BY c.id, v.id, p.id, s.name
        ORDER BY c.updated_at ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── recently completed lab orders (lab) ──
router.get('/completed', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code,
                'order_name', o.order_name, 'order_code_id', o.order_code_id, 'status', o.status,
                'result_at', o.result_at) ORDER BY o.id) AS lab_orders
         FROM consultation c
         JOIN visit v ON v.id = c.visit_id
         JOIN patient p ON p.id = c.patient_id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.consultation_id = c.id AND o.code_type = 'lab' AND o.status = 'completed'
        WHERE v.visit_date = CURRENT_DATE
        GROUP BY c.id, v.id, p.id, s.name
        ORDER BY MAX(o.result_at) DESC NULLS LAST`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── lab orders for a specific visit (lab) — used by patient-search for any date ──
router.get('/visit/:visitId/orders', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth, p.allergies,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code,
                'order_name', o.order_name, 'order_code_id', o.order_code_id, 'status', o.status) ORDER BY o.id) AS lab_orders
         FROM visit v
         JOIN patient p ON p.id = v.patient_id
         LEFT JOIN consultation c ON c.visit_id = v.id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.visit_id = v.id AND o.code_type = 'lab' AND o.status <> 'cancelled'
        WHERE v.id = $1
        GROUP BY c.id, v.id, p.id, s.name`,
      [req.params.visitId]
    );
    if (r.rows.length === 0) return res.json(null);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── items + existing results for one lab order (lab) ──
router.get('/order/:orderItemId/items', permMiddleware('lab'), async (req, res) => {
  try {
    const oi = await pool.query('SELECT * FROM order_item WHERE id = $1', [req.params.orderItemId]);
    if (oi.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = oi.rows[0];
    const master = await pool.query(
      'SELECT * FROM lab_test_item WHERE order_code_id = $1 ORDER BY sort_order, id', [order.order_code_id]
    );
    const existing = await pool.query(
      'SELECT * FROM lab_result WHERE order_item_id = $1 ORDER BY sort_order, id', [req.params.orderItemId]
    );
    const byItem = {};
    existing.rows.forEach(function (e) { if (e.lab_test_item_id) byItem[e.lab_test_item_id] = e; });

    var items;
    if (master.rows.length > 0) {
      items = master.rows.map(function (m, i) {
        var prev = byItem[m.id] || {};
        return {
          lab_test_item_id: m.id, name: m.name, unit: m.unit,
          ref_low: m.ref_low, ref_high: m.ref_high, ref_text: m.ref_text,
          value: prev.value != null ? prev.value : '', comment: prev.comment || '', flag: prev.flag || '', sort_order: i,
        };
      });
    } else {
      // no master defined: show existing entries, or a single blank row to fill
      items = existing.rows.length > 0
        ? existing.rows.map(function (e, i) { return { lab_test_item_id: e.lab_test_item_id, name: e.name, unit: e.unit, ref_low: e.ref_low, ref_high: e.ref_high, ref_text: e.ref_text, value: e.value || '', comment: e.comment || '', flag: e.flag || '', sort_order: i }; })
        : [];
    }
    res.json({ order: order, has_master: master.rows.length > 0, items: items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── save results for one lab order (lab) ──
router.post('/order/:orderItemId/results', permMiddleware('lab'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oi = await client.query('SELECT * FROM order_item WHERE id = $1', [req.params.orderItemId]);
    if (oi.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    const order = oi.rows[0];
    // Only a lab order belongs on this screen. Accepting any order id would let a
    // consultation fee or an imaging order be flipped to 'completed' from here,
    // which drops it out of the worklist that department is still waiting on.
    if (order.code_type !== 'lab') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is not a lab order' });
    }
    const vis = await client.query('SELECT visit_date FROM visit WHERE id = $1', [order.visit_id]);
    const rdate = (vis.rows[0] && vis.rows[0].visit_date) || null;

    const results = Array.isArray(req.body.results) ? req.body.results : [];
    const filled = results.filter((it) => it && ((it.value != null && it.value !== '') ||
                                                 (it.comment != null && it.comment !== '')));
    // Marking an order completed with nothing recorded takes it off the pending
    // list, so a test that was never resulted looks done to everyone downstream.
    if (filled.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one result value or comment is required' });
    }

    await client.query('DELETE FROM lab_result WHERE order_item_id = $1', [req.params.orderItemId]);
    for (let i = 0; i < filled.length; i++) {
      const it = filled[i] || {};
      const flag = computeFlag(it.value, it.ref_low, it.ref_high);
      await client.query(
        `INSERT INTO lab_result
           (order_item_id, lab_test_item_id, visit_id, patient_id, name, value, unit, ref_low, ref_high, ref_text, flag, comment, result_date, result_by, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [req.params.orderItemId, it.lab_test_item_id || null, order.visit_id, order.patient_id,
         it.name, it.value != null ? String(it.value) : null, it.unit || null,
         it.ref_low != null && it.ref_low !== '' ? it.ref_low : null,
         it.ref_high != null && it.ref_high !== '' ? it.ref_high : null,
         it.ref_text || null, flag, it.comment || null, rdate, req.user.id, i]
      );
    }
    await client.query(
      `UPDATE order_item SET status = 'completed', result_at = NOW(), result_by = $1 WHERE id = $2`,
      [req.user.id, req.params.orderItemId]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ── all lab results for a patient (doctors view + the lab's own screen) ──
// Only Consultation.jsx and Lab.jsx read this. Left open to every logged-in
// account it also handed a patient's full result history to reception.
router.get('/patient/:patientId/results', permMiddleware('consultation', 'lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT lr.*, oc.code AS panel_code, oc.name AS panel_name
         FROM lab_result lr
         LEFT JOIN order_item oi ON oi.id = lr.order_item_id
         LEFT JOIN order_code oc ON oc.id = oi.order_code_id
        WHERE lr.patient_id = $1
        ORDER BY lr.result_date DESC NULLS LAST, lr.order_item_id, lr.sort_order`,
      [req.params.patientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── master: list test items (read) ──
router.get('/test-items', async (req, res) => {
  try {
    const { order_code_id } = req.query;
    const r = order_code_id
      ? await pool.query('SELECT * FROM lab_test_item WHERE order_code_id = $1 ORDER BY sort_order, id', [order_code_id])
      : await pool.query('SELECT * FROM lab_test_item ORDER BY order_code_id, sort_order, id');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── master: replace all items for a panel (settings) ──
router.post('/test-items/save', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { order_code_id, items } = req.body;
    if (!order_code_id) return res.status(400).json({ error: 'order_code_id required' });
    await client.query('BEGIN');
    await client.query('DELETE FROM lab_test_item WHERE order_code_id = $1', [order_code_id]);
    const arr = Array.isArray(items) ? items : [];
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i] || {};
      if (!it.name) continue;
      await client.query(
        `INSERT INTO lab_test_item (order_code_id, name, unit, ref_low, ref_high, ref_text, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order_code_id, it.name, it.unit || null,
         it.ref_low != null && it.ref_low !== '' ? it.ref_low : null,
         it.ref_high != null && it.ref_high !== '' ? it.ref_high : null,
         it.ref_text || null, i]
      );
    }
    await client.query('COMMIT');
    const out = await pool.query('SELECT * FROM lab_test_item WHERE order_code_id = $1 ORDER BY sort_order, id', [order_code_id]);
    res.json(out.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
