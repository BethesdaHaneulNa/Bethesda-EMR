const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 세트 항목 일괄 삽입 (생성/수정 공용)
async function insertItems(client, setId, items) {
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx] || {};
    await client.query(
      `INSERT INTO order_set_item (set_id, kind, drug_id, order_code_id, code, name, dose, frequency, days, route, quantity, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [setId, it.kind, it.drug_id || null, it.order_code_id || null, it.code || null, it.name || null,
       it.dose || null, it.frequency || 1, it.days || 1, it.route || null, it.quantity || 1, idx]
    );
  }
}

// 세트들에 항목을 붙여서 돌려줌 (현재 단가/코드타입을 마스터에서 조인)
async function attachItems(sets) {
  const ids = sets.map(function (s) { return s.id; });
  if (ids.length === 0) return sets;
  const r = await pool.query(
    `SELECT i.*,
            COALESCE(dr.unit_price, oc.price_clinic, 0) AS unit_price,
            oc.code_type AS order_code_type
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
router.get('/', async (req, res) => {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/order-sets/:id
router.get('/:id', async (req, res) => {
  try {
    const s = await pool.query(
      `SELECT os.*, d.code AS dept_code, d.name AS dept_name
         FROM order_set os LEFT JOIN department d ON os.department_id = d.id
        WHERE os.id = $1`, [req.params.id]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await attachItems(s.rows);
    res.json(s.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/order-sets   (admin)  body {name, department_id, description, items:[...]}
router.post('/', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, group_name, department_id, description, items } = req.body;
    if (!name) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'name required' }); }
    const s = await client.query(
      `INSERT INTO order_set (name, group_name, department_id, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, group_name || null, department_id || null, description || null]
    );
    await insertItems(client, s.rows[0].id, Array.isArray(items) ? items : []);
    await client.query('COMMIT');
    res.status(201).json(s.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT /api/order-sets/:id   (admin)  — 세트 정보 + 항목 통째로 교체
router.put('/:id', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, group_name, department_id, description, items, is_active } = req.body;
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
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// DELETE /api/order-sets/:id   (admin)
router.delete('/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('DELETE FROM order_set WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
