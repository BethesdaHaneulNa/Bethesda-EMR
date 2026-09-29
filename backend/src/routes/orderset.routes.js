const express = require('express');
const { pool } = require('../config/database');
const { sendDbError } = require('../utils/dbError');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Decision S2 (2026-09-29): order sets are read by the consultation screen (applying a
// set) and the Settings order-set tab; written from Settings only.
const canReadSets = permMiddleware('consultation', 'settings');

// Every item is checked before anything is written (2026-09-29): the director wants the
// dose, times and days set in the order set itself (decision B: drugs no longer carry a
// default dose), and applying a set copies them onto the prescription, where they
// become the total - stock and money. A bad value is a 400 and nothing changes.
//   drug line:  dose (the daily total) a number > 0 · frequency and days whole numbers
//               (1-24, 1-365) · route (the sig) at most 10 characters, the prescription
//               column's size · quantity (the bottle/tube count of a pack-unit drug, which
//               the consultation server takes only as a whole number) a whole number >= 1
//   order line: quantity a number > 0 · frequency and days whole numbers
// An empty field is allowed (an old set, or one not filled in yet); see insertItems.
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
function badItems(items) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const at = 'items[' + i + '].';
    const whole = (v, max) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max; };
    if (!blank(it.frequency) && !whole(it.frequency, 24)) return at + 'frequency must be a whole number from 1 to 24';
    if (!blank(it.days) && !whole(it.days, 365)) return at + 'days must be a whole number from 1 to 365';
    if (it.kind === 'drug') {
      if (!blank(it.dose) && !(Number(it.dose) > 0 && Number(it.dose) <= 1000)) return at + 'dose must be a number greater than 0';
      if (!blank(it.route) && String(it.route).length > 10) return at + 'route (sig) must be at most 10 characters';
      if (!blank(it.quantity) && !whole(it.quantity, 10000)) return at + 'quantity must be a whole number of at least 1';
    } else if (!blank(it.quantity) && !(Number(it.quantity) > 0)) {
      return at + 'quantity must be a positive number';
    }
  }
  return null;
}

// 세트 항목 일괄 삽입 (생성/수정 공용)
async function insertItems(client, setId, items) {
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx] || {};
    await client.query(
      `INSERT INTO order_set_item (set_id, kind, drug_id, order_code_id, code, name, dose, frequency, days, route, quantity, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      // A drug line's empty dose / times / days stay empty (NULL): applying the set then
      // leaves those fields empty on the prescription, where the doctor is told to fill
      // them, instead of prescribing "1 a day for 1 day" nobody wrote. An order line
      // keeps 1 · 1 · 1 (lab and imaging always start so; decision of 2026-09-29).
      [setId, it.kind, it.drug_id || null, it.order_code_id || null, it.code || null, it.name || null,
       blank(it.dose) ? null : String(it.dose),
       blank(it.frequency) ? (it.kind === 'drug' ? null : 1) : parseInt(it.frequency, 10),
       blank(it.days) ? (it.kind === 'drug' ? null : 1) : parseInt(it.days, 10),
       blank(it.route) ? null : it.route,
       blank(it.quantity) ? 1 : it.quantity, idx]
    );
  }
}

// 세트들에 항목을 붙여서 돌려줌 (현재 단가/코드타입을 마스터에서 조인)
async function attachItems(sets) {
  const ids = sets.map(function (s) { return s.id; });
  if (ids.length === 0) return sets;
  const r = await pool.query(
    // drug_active: false when a drug line points at a drug hidden from the list
    // (drug.is_active = false). A set keeps its own copy of the drug id and name, so
    // without this a hidden sample drug was prescribed through a set, silently, at its
    // old price. The screen leaves such lines out (Consultation.jsx applySet). NULL
    // for order lines and for a drug that no longer exists.
    `SELECT i.*,
            COALESCE(dr.unit_price, oc.price_clinic, 0) AS unit_price,
            oc.code_type AS order_code_type,
            dr.is_active AS drug_active
       FROM order_set_item i
       LEFT JOIN drug dr ON i.drug_id = dr.id
       LEFT JOIN order_code oc ON i.order_code_id = oc.id
      WHERE i.set_id = ANY($1::int[])
      ORDER BY i.set_id, i.sort_order, i.id`,
    [ids]
  );
  const byset = {};
  r.rows.forEach(function (it) { (byset[it.set_id] = byset[it.set_id] || []).push(it); });
  sets.forEach(function (s) { s.items = byset[s.id] || []; });
  return sets;
}

// GET /api/order-sets   (?department_id= 로 과별 필터, 과 없는 세트는 공통으로 포함)
router.get('/', canReadSets, async (req, res) => {
  try {
    const { department_id } = req.query;
    let q = `SELECT os.*, d.code AS dept_code, d.name AS dept_name
               FROM order_set os
               LEFT JOIN department d ON os.department_id = d.id
              WHERE os.is_active = true`;
    const params = [];
    if (department_id) { params.push(department_id); q += ` AND (os.department_id = $1 OR os.department_id IS NULL)`; }
    q += ` ORDER BY os.sort_order, os.id`;
    const sets = await pool.query(q, params);
    await attachItems(sets.rows);
    res.json(sets.rows);
  } catch (err) { sendDbError(res, err); }
});

// GET /api/order-sets/:id
router.get('/:id', canReadSets, async (req, res) => {
  try {
    const s = await pool.query(
      `SELECT os.*, d.code AS dept_code, d.name AS dept_name
         FROM order_set os LEFT JOIN department d ON os.department_id = d.id
        WHERE os.id = $1`, [req.params.id]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await attachItems(s.rows);
    res.json(s.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// POST /api/order-sets   (admin)  body {name, department_id, description, items:[...]}
router.post('/', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, group_name, department_id, description, items } = req.body;
    if (!name) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'name required' }); }
    const badQty = badItems(Array.isArray(items) ? items : []);
    if (badQty) { await client.query('ROLLBACK'); return res.status(400).json({ error: badQty }); }
    const s = await client.query(
      `INSERT INTO order_set (name, group_name, department_id, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, group_name || null, department_id || null, description || null]
    );
    await insertItems(client, s.rows[0].id, Array.isArray(items) ? items : []);
    await client.query('COMMIT');
    res.status(201).json(s.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally { client.release(); }
});

// PUT /api/order-sets/:id   (admin)  — 세트 정보 + 항목 통째로 교체
router.put('/:id', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, group_name, department_id, description, items, is_active } = req.body;
    const badQty = badItems(Array.isArray(items) ? items : []);
    if (badQty) { await client.query('ROLLBACK'); return res.status(400).json({ error: badQty }); }
    await client.query(
      `UPDATE order_set SET name=COALESCE($1,name), group_name=$2, department_id=$3, description=$4,
              is_active=COALESCE($5,is_active), updated_at=NOW() WHERE id=$6`,
      [name, group_name || null, department_id || null, description || null, (is_active === undefined ? null : is_active), req.params.id]
    );
    if (Array.isArray(items)) {
      await client.query('DELETE FROM order_set_item WHERE set_id=$1', [req.params.id]);
      await insertItems(client, req.params.id, items);
    }
    await client.query('COMMIT');
    const out = await pool.query('SELECT * FROM order_set WHERE id=$1', [req.params.id]);
    res.json(out.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    sendDbError(res, err);
  } finally { client.release(); }
});

// DELETE /api/order-sets/:id   (admin)
router.delete('/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('DELETE FROM order_set WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
