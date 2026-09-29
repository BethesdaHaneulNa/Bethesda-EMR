const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Read a result value as a number the way the lab staff type it. They work in
// French, where "1,5" means 1.5 and "12 000" means 12000; parseFloat alone reads
// those as 1 and 12, which files a high creatinine as normal. Only the number is
// read this way -- the value is still stored exactly as typed.
// Same rule as readNumber() in frontend/src/pages/Lab.jsx; change both together.
function readNumber(value) {
  if (value === null || value === undefined) return NaN;
  var s = String(value).trim()
    .replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1'); // 12 000 -> 12000
  if ((s.match(/,/g) || []).length === 1) s = s.replace(/(\d),(\d)/, '$1.$2'); // 1,5 -> 1.5
  return parseFloat(s);
}

function computeFlag(value, lo, hi) {
  var n = readNumber(value);
  if (isNaN(n)) return '';
  if (lo !== null && lo !== undefined && n < parseFloat(lo)) return 'low';
  if (hi !== null && hi !== undefined && n > parseFloat(hi)) return 'high';
  if ((lo === null || lo === undefined) && (hi === null || hi === undefined)) return '';
  return 'normal';
}

// ── PENDING lab orders (lab) — today's visits with un-resulted lab orders ──
// An order shows up as soon as the doctor places it, not when the consultation
// is completed: the patient usually goes to the lab mid-consultation and comes
// back with the result (director's decision 2026-09-29, decisions.md). The
// screen marks a consultation still open as "in consultation". Only today's
// visits, also by decision -- an earlier day's test is found through patient
// search. A visit cancelled at reception is left out: cancelling is limited to
// queued visits, but a visit can be set back to waiting and then cancelled,
// and older data predates that limit.
router.get('/pending', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.updated_at AS consultation_time, c.status AS consultation_status,
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
        WHERE v.visit_date = CURRENT_DATE AND v.status <> 'cancelled'
        GROUP BY c.id, v.id, p.id, s.name
        ORDER BY MIN(o.created_at) ASC, c.id ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── lab orders resulted today (lab) ──
// "Today" here is the day the result was entered, not the visit day: a sample
// from yesterday that is finished today through patient search belongs to
// today's finished work, and the pending list (today's visits only) never
// shows it. For today's visits the two are the same.
router.get('/completed', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.status AS consultation_status, v.id AS visit_id, v.visit_date,
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
              AND o.result_at >= CURRENT_DATE AND o.result_at < CURRENT_DATE + 1
        WHERE v.status <> 'cancelled'
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
      `SELECT c.id AS consultation_id, c.status AS consultation_status, v.id AS visit_id, v.visit_date,
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
    // Match saved results to the panel's items by item id, and by name for the
    // ones whose link is gone (results saved before the settings tab kept item ids
    // stable, or whose item was removed). A saved result that matches nothing is
    // still listed after the items: every row on this screen is re-saved as the
    // order's full result set, so a row left off here would be deleted.
    const used = new Set();
    function take(pred) {
      const e = existing.rows.find(function (r) { return !used.has(r.id) && pred(r); });
      if (e) used.add(e.id);
      return e;
    }
    function fromSaved(e, i) {
      return { lab_test_item_id: e.lab_test_item_id, name: e.name, unit: e.unit,
               ref_low: e.ref_low, ref_high: e.ref_high, ref_text: e.ref_text,
               value: e.value != null ? e.value : '', comment: e.comment || '', flag: e.flag || '', sort_order: i };
    }

    var items = master.rows.map(function (m, i) {
      var prev = take(function (r) { return r.lab_test_item_id === m.id; })
              || take(function (r) { return r.name === m.name && !master.rows.some(function (x) { return x.id === r.lab_test_item_id; }); })
              || {};
      return {
        lab_test_item_id: m.id, name: m.name, unit: m.unit,
        ref_low: m.ref_low, ref_high: m.ref_high, ref_text: m.ref_text,
        value: prev.value != null ? prev.value : '', comment: prev.comment || '', flag: prev.flag || '', sort_order: i,
      };
    });
    existing.rows.forEach(function (e) {
      if (!used.has(e.id)) items.push(fromSaved(e, items.length));
    });
    // A panel created in Settings can be ordered before its items are defined.
    // With no row to type into, the lab could never complete that order, so
    // offer one free row named after the test (no reference range, no flag).
    if (items.length === 0) {
      items.push({ lab_test_item_id: null, name: order.order_name, unit: null,
                   ref_low: null, ref_high: null, ref_text: null,
                   value: '', comment: '', flag: '', sort_order: 0 });
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
    const filled = results.filter((it) => it && ((it.value != null && String(it.value).trim() !== '') ||
                                                 (it.comment != null && String(it.comment).trim() !== '')));
    // Marking an order completed with nothing recorded takes it off the pending
    // list, so a test that was never resulted looks done to everyone downstream.
    if (filled.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one result value or comment is required' });
    }

    // A row that belongs to one of this panel's items takes its name, unit and
    // reference range from the item as it is now, not from what the screen sent:
    // the screen may have been opened before someone edited the range in
    // Settings, and the saved flag should follow the range in force. Rows with no
    // live item (kept from an earlier save, or the free row of a panel with no
    // items) keep what they came with.
    const master = await client.query('SELECT * FROM lab_test_item WHERE order_code_id = $1', [order.order_code_id]);
    const byId = {};
    master.rows.forEach(function (m) { byId[m.id] = m; });

    await client.query('DELETE FROM lab_result WHERE order_item_id = $1', [req.params.orderItemId]);
    for (let i = 0; i < filled.length; i++) {
      const sent = filled[i] || {};
      const m = byId[parseInt(sent.lab_test_item_id, 10)];
      const it = m ? Object.assign({}, sent, { lab_test_item_id: m.id, name: m.name, unit: m.unit,
                                               ref_low: m.ref_low, ref_high: m.ref_high, ref_text: m.ref_text })
                   : Object.assign({}, sent, { lab_test_item_id: null, name: sent.name || order.order_name });
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
// result_count: how many saved results the entry screen would show under this
// item -- the ones linked by id, plus unlinked ones of the same panel with the
// same name (the entry screen matches those by name). The settings tab uses it
// to warn before an item that already has results changes unit: the old
// numbers would then be shown, and re-flagged on a re-save, as the new unit.
async function listTestItems(db, orderCodeId) {
  const r = await db.query(
    `SELECT i.*,
            ((SELECT COUNT(*) FROM lab_result r WHERE r.lab_test_item_id = i.id)
           + (SELECT COUNT(*) FROM lab_result r JOIN order_item oi ON oi.id = r.order_item_id
               WHERE r.lab_test_item_id IS NULL AND oi.order_code_id = i.order_code_id
                 AND r.name = i.name))::int AS result_count
       FROM lab_test_item i
      WHERE ($1::int IS NULL OR i.order_code_id = $1)
      ORDER BY i.order_code_id, i.sort_order, i.id`,
    [orderCodeId || null]);
  return r.rows;
}

// Read only by the lab items tab in Settings. Was open to any signed-in account;
// the server now gives each route the permission of the screen that uses it
// (director's decision S2). 'lab' too, so the lab can read its own templates.
router.get('/test-items', permMiddleware('lab', 'settings'), async (req, res) => {
  try {
    res.json(await listTestItems(pool, req.query.order_code_id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── master: save the item list for a panel (settings) ──
// Items keep their id: rows sent back with an id are updated in place, rows
// without one are added, and only the rows no longer on the list are deleted.
// Deleting and re-inserting everything (as this used to) gave every item a new
// id, which unlinked each result already entered (lab_result.lab_test_item_id
// is ON DELETE SET NULL), so fixing one typo here emptied the entry screen of
// every finished order in that panel.
router.post('/test-items/save', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { order_code_id, items } = req.body;
    if (!order_code_id) return res.status(400).json({ error: 'order_code_id required' });
    await client.query('BEGIN');
    const arr = (Array.isArray(items) ? items : []).filter(function (it) { return it && it.name; });
    const keep = [];
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      const vals = [it.name, it.unit || null,
        it.ref_low != null && it.ref_low !== '' ? it.ref_low : null,
        it.ref_high != null && it.ref_high !== '' ? it.ref_high : null,
        it.ref_text || null, i];
      const id = parseInt(it.id, 10);
      let row = null;
      if (id && keep.indexOf(id) < 0) {
        // order_code_id in the WHERE: an id from another panel is treated as new
        const u = await client.query(
          `UPDATE lab_test_item SET name=$1, unit=$2, ref_low=$3, ref_high=$4, ref_text=$5, sort_order=$6
            WHERE id=$7 AND order_code_id=$8 RETURNING id`,
          vals.concat([id, order_code_id]));
        row = u.rows[0];
      }
      if (!row) {
        const n = await client.query(
          `INSERT INTO lab_test_item (name, unit, ref_low, ref_high, ref_text, sort_order, order_code_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          vals.concat([order_code_id]));
        row = n.rows[0];
      }
      keep.push(row.id);
    }
    await client.query('DELETE FROM lab_test_item WHERE order_code_id = $1 AND NOT (id = ANY($2::int[]))',
      [order_code_id, keep]);
    await client.query('COMMIT');
    res.json(await listTestItems(pool, order_code_id));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
