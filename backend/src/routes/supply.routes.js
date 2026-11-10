// Supplies (consumables): the count of every order code of type 'supply' and the
// record of why it changed. Mirrors the pharmacy's stock (pharmacy.routes.js
// moveStock / stock_movement, 021) on order_code.stock_qty / supply_movement (055).
//
// A supply leaves the shelf when the doctor puts it on a consultation (the
// consultation routes call useSupply / returnSupply in their own transaction); goods
// received, shelf counts and discards come through this router. Coordinator, 1.7.0.
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Who may count: the same hands as the pharmacy's stock. The consultation permission
// is there because at the clinic the nurse who uses the supplies also receives them.
const canStock = permMiddleware('pharmacy', 'consultation', 'settings');

// Exact texts the screen matches on (SupplyStock.jsx); the API client passes on only
// the message. Same words as the pharmacy's, so one translation serves both.
const ERR_DISCARD_MORE = 'Cannot discard more than the recorded stock; count the shelf first';
const ERR_MEMO_REQUIRED = 'A note is required';
const ERR_WHOLE_NUMBER = 'Quantity must be a whole number';
const ERR_NOT_SUPPLY = 'Not a supply';
// As the pharmacy's (pharmacy.routes.js): a number no shelf holds is refused in words,
// not by the integer column.
const ERR_TOO_LARGE = 'Quantity is too large';
const MAX_QTY = 10000000;
const MAX_STOCK = 2000000000;
const MEMO_OUTSIDE = 'Changed outside the stock record (settings screen)';

class SupplyError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// The one place the count changes. The row is locked first; if stock_qty no longer
// matches the last movement (a hand edit that bypassed the record), an 'adjust' row
// closes the gap before this change, so the record is whole again.
// kind: receive (+qty), use (-qty, stops at zero with the shortfall noted), return
// (+qty, a line taken off a consultation), adjust (counted = new count), discard (-qty).
async function moveSupply(client, { codeId, kind, qty, counted, memo, orderItemId, consultationId, staffId }) {
  const cur = await client.query(
    'SELECT id, code_type, COALESCE(stock_qty,0) AS stock_qty FROM order_code WHERE id = $1 FOR UPDATE', [codeId]);
  if (cur.rows.length === 0) throw new SupplyError(404, 'Supply not found');
  if (cur.rows[0].code_type !== 'supply') throw new SupplyError(400, ERR_NOT_SUPPLY);
  const before = Number(cur.rows[0].stock_qty);

  const last = await client.query(
    'SELECT stock_after FROM supply_movement WHERE order_code_id = $1 ORDER BY id DESC LIMIT 1', [codeId]);
  if (last.rows.length && Number(last.rows[0].stock_after) !== before) {
    const was = Number(last.rows[0].stock_after);
    await client.query(
      `INSERT INTO supply_movement (order_code_id, kind, qty, stock_before, stock_after, memo, created_at)
       VALUES ($1, 'adjust', $2, $3, $4, $5, clock_timestamp())`,
      [codeId, before - was, was, before, MEMO_OUTSIDE]);
  }

  let change, shortfall = 0;
  if (kind === 'receive' || kind === 'return') change = qty;
  else if (kind === 'adjust') change = counted - before;
  else if (kind === 'discard') {
    if (qty > before) throw new SupplyError(409, ERR_DISCARD_MORE);
    change = -qty;
  } else if (kind === 'use') {
    change = -qty;
    if (before + change < 0) shortfall = -(before + change);
  } else throw new SupplyError(400, 'Unknown movement');
  const after = before + change + shortfall;
  if (after > MAX_STOCK) throw new SupplyError(400, ERR_TOO_LARGE);

  await client.query('UPDATE order_code SET stock_qty = $1, updated_at = NOW() WHERE id = $2', [after, codeId]);
  const row = await client.query(
    `INSERT INTO supply_movement (order_code_id, kind, qty, stock_before, stock_after, shortfall,
                                  order_item_id, consultation_id, staff_id, memo, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, clock_timestamp()) RETURNING *`,
    [codeId, kind, change, before, after, shortfall, orderItemId || null, consultationId || null, staffId || null, memo || null]);
  return { before, after, shortfall, movement: row.rows[0] };
}

// The whole number of pieces an order line stands for: its total (quantity x days,
// ⑭) rounded up, at least 1. A supply is counted in pieces, never in fractions.
function piecesOf(orderItem) {
  const n = Number(orderItem.total_qty != null ? orderItem.total_qty : orderItem.quantity);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 1;
}

// Called by the consultation routes, inside their transaction. A line that is not a
// supply, or has no order code, does nothing.
async function useSupply(client, orderItem, staffId) {
  if (orderItem.code_type !== 'supply' || !orderItem.order_code_id) return null;
  return moveSupply(client, { codeId: orderItem.order_code_id, kind: 'use', qty: piecesOf(orderItem),
    orderItemId: orderItem.id, consultationId: orderItem.consultation_id, staffId });
}
async function returnSupply(client, orderItem, staffId, memo) {
  if (orderItem.code_type !== 'supply' || !orderItem.order_code_id) return null;
  return moveSupply(client, { codeId: orderItem.order_code_id, kind: 'return', qty: piecesOf(orderItem),
    orderItemId: orderItem.id, consultationId: orderItem.consultation_id, staffId, memo });
}
// A line whose count changed: the difference leaves or comes back.
async function resupplyDiff(client, was, now, staffId) {
  if (now.code_type !== 'supply' || !now.order_code_id) return null;
  const diff = piecesOf(now) - piecesOf(was);
  if (diff === 0) return null;
  return moveSupply(client, { codeId: now.order_code_id, kind: diff > 0 ? 'use' : 'return', qty: Math.abs(diff),
    orderItemId: now.id, consultationId: now.consultation_id, staffId });
}

function wholeNumber(v, min) {
  // A number, or a text of digits only: Number(true) is 1 and Number([7]) is 7.
  if (typeof v === 'string') { if (!/^\s*\d+\s*$/.test(v)) return null; }
  else if (typeof v !== 'number') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min ? n : null;
}

// GET /api/supply/stock - every active supply with its count.
router.get('/stock', canStock, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, code, name, name_en, group_name, unit, price, price_clinic, min_stock,
              COALESCE(stock_qty, 0) AS stock_qty, is_active
         FROM order_code WHERE code_type = 'supply' AND is_active = true
        ORDER BY name`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/supply/stock/:id/movements - the record, newest first.
router.get('/stock/:id/movements', canStock, async (req, res) => {
  try {
    const id = wholeNumber(req.params.id, 1);
    if (!id) return res.status(400).json({ error: 'id must be a number' });
    const r = await pool.query(
      `SELECT m.id, m.kind, m.qty, m.stock_before, m.stock_after, m.shortfall, m.memo, m.created_at,
              m.order_item_id, m.consultation_id, st.name AS staff_name,
              p.chart_no, TRIM(COALESCE(p.last_name,'') || ' ' || COALESCE(p.first_name,'')) AS patient_name
         FROM supply_movement m
         LEFT JOIN staff st ON st.id = m.staff_id
         LEFT JOIN consultation c ON c.id = m.consultation_id
         LEFT JOIN patient p ON p.id = c.patient_id
        WHERE m.order_code_id = $1
        ORDER BY m.id DESC
        LIMIT 500`, [id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/supply/stock/:id/receive   { qty, memo }      goods received
// POST /api/supply/stock/:id/count     { counted, memo }  shelf count (note required)
// POST /api/supply/stock/:id/discard   { qty, memo }      thrown away (reason required)
function stockWrite(kind) {
  return async (req, res) => {
    const codeId = wholeNumber(req.params.id, 1);
    if (!codeId) return res.status(400).json({ error: 'id must be a number' });
    const memo = String(req.body.memo || '').trim();
    const args = { codeId, kind, memo, staffId: req.user.id };
    if (kind === 'adjust') {
      args.counted = wholeNumber(req.body.counted, 0);
      if (args.counted === null) return res.status(400).json({ error: ERR_WHOLE_NUMBER });
    } else {
      args.qty = wholeNumber(req.body.qty, 1);
      if (args.qty === null) return res.status(400).json({ error: ERR_WHOLE_NUMBER });
    }
    if ((kind === 'adjust' ? args.counted : args.qty) > MAX_QTY) return res.status(400).json({ error: ERR_TOO_LARGE });
    if (kind !== 'receive' && !memo) return res.status(400).json({ error: ERR_MEMO_REQUIRED });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const m = await moveSupply(client, args);
      await client.query('COMMIT');
      res.json({ success: true, stock_before: m.before, stock_after: m.after, movement: m.movement });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(err.status || 500).json({ error: err.message });
    } finally { client.release(); }
  };
}
router.post('/stock/:id/receive', canStock, stockWrite('receive'));
router.post('/stock/:id/count', canStock, stockWrite('adjust'));
router.post('/stock/:id/discard', canStock, stockWrite('discard'));

module.exports = router;
module.exports.useSupply = useSupply;
module.exports.returnSupply = returnSupply;
module.exports.resupplyDiff = resupplyDiff;
