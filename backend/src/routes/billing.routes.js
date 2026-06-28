const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/billing/pending - visits awaiting payment
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH live AS (
         SELECT v.id AS visit_id,
           ( COALESCE((SELECT price_clinic FROM order_code WHERE code = CASE v.visit_type
                         WHEN 'newVisit' THEN 'C01' WHEN 'followUp' THEN 'C02'
                         WHEN 'emergency' THEN 'C03' WHEN 'referral' THEN 'C04' WHEN 'none' THEN NULL ELSE 'C01' END),0)
           + COALESCE((SELECT SUM(COALESCE(p.total_qty, p.dose::numeric*p.frequency*p.days)*COALESCE(p.unit_price,0))
                         FROM prescription p WHERE p.consultation_id IN (SELECT id FROM consultation WHERE visit_id=v.id)
                               AND COALESCE(p.dispense_type,'internal') <> 'external'),0)
           + COALESCE((SELECT SUM(COALESCE(o.quantity,1)*COALESCE(o.unit_price,0)) FROM order_item o WHERE o.visit_id=v.id),0)
           ) AS live_total,
           COALESCE((SELECT SUM(b.consult_fee+b.drug_total+b.procedure_total) FROM billing b WHERE b.visit_id=v.id AND b.payment_status<>'cancelled'),0) AS billed_total,
           EXISTS(SELECT 1 FROM billing b2 WHERE b2.visit_id=v.id AND b2.payment_status<>'cancelled') AS has_active_bill
         FROM visit v WHERE v.status='completed'
       )
       SELECT v.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.allergies,
       d.code as dept_code, s.name as doctor_name,
       (SELECT COALESCE(SUM(outstanding),0) FROM billing WHERE patient_id = p.id AND outstanding > 0 AND payment_status <> 'cancelled') as previous_balance,
       EXISTS (SELECT 1 FROM billing bx WHERE bx.visit_id = v.id AND bx.payment_status = 'cancelled') as needs_rebill,
       COALESCE((SELECT amount_paid FROM billing WHERE visit_id = v.id AND payment_status = 'cancelled' ORDER BY cancelled_at DESC NULLS LAST, id DESC LIMIT 1),0) as prior_paid,
       (l.has_active_bill AND (l.live_total - l.billed_total) > 0.01) as needs_additional,
       (l.has_active_bill AND (l.billed_total - l.live_total) > 0.01) as needs_refund,
       GREATEST(l.live_total - l.billed_total, 0) as extra_due,
       GREATEST(l.billed_total - l.live_total, 0) as refund_due,
       (SELECT id FROM billing WHERE visit_id = v.id AND payment_status <> 'cancelled' ORDER BY created_at DESC, id DESC LIMIT 1) as active_bill_id,
       COALESCE((SELECT SUM(amount_paid) FROM billing WHERE visit_id = v.id AND payment_status <> 'cancelled'),0) as active_paid
       FROM visit v
       JOIN patient p ON v.patient_id = p.id
       JOIN live l ON l.visit_id = v.id
       LEFT JOIN department d ON v.department_id = d.id
       LEFT JOIN staff s ON v.doctor_id = s.id
       WHERE v.status = 'completed'
       AND (
         ( v.visit_date = CURRENT_DATE
           AND v.id NOT IN (SELECT visit_id FROM billing WHERE payment_status IN ('paid','waived')) )
         OR ( EXISTS (SELECT 1 FROM billing bc WHERE bc.visit_id = v.id AND bc.payment_status = 'cancelled')
              AND NOT EXISTS (SELECT 1 FROM billing ba WHERE ba.visit_id = v.id AND ba.payment_status <> 'cancelled') )
         OR ( l.has_active_bill AND ABS(l.live_total - l.billed_total) > 0.01 )
       )
       ORDER BY (l.has_active_bill AND ABS(l.live_total - l.billed_total) > 0.01) DESC, needs_rebill DESC, v.visit_date DESC, v.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});



// GET /api/billing/completed - today's paid/partial/unpaid bills
router.get('/completed', async (req, res) => {
  try {
    const { date } = req.query;
    const billDate = date || new Date().toISOString().slice(0,10);
    const result = await pool.query(
      `SELECT b.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender,
       v.id as visit_id, v.visit_date, d.code as dept_code, s.name as doctor_name, c.name as cashier_name
       FROM billing b
       JOIN patient p ON b.patient_id = p.id
       LEFT JOIN visit v ON b.visit_id = v.id
       LEFT JOIN department d ON v.department_id = d.id
       LEFT JOIN staff s ON v.doctor_id = s.id
       LEFT JOIN staff c ON b.cashier_id = c.id
       WHERE b.billing_date = $1
       ORDER BY b.created_at DESC`,
      [billDate]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/:billingId/detail - completed bill with item detail
router.get('/:billingId/detail', async (req, res) => {
  try {
    const billResult = await pool.query(
      `SELECT b.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.allergies,
       v.visit_date, v.visit_type, d.code as dept_code, s.name as doctor_name, c.name as cashier_name
       FROM billing b
       JOIN patient p ON b.patient_id = p.id
       LEFT JOIN visit v ON b.visit_id = v.id
       LEFT JOIN department d ON v.department_id = d.id
       LEFT JOIN staff s ON v.doctor_id = s.id
       LEFT JOIN staff c ON b.cashier_id = c.id
       WHERE b.id = $1`,
      [req.params.billingId]
    );
    if (!billResult.rows.length) return res.status(404).json({ error: 'Billing not found' });
    const itemResult = await pool.query('SELECT * FROM billing_item WHERE billing_id = $1 ORDER BY id', [req.params.billingId]);
    res.json({ bill: billResult.rows[0], items: itemResult.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/visit/:visitId/items - get billable items for a visit
router.get('/visit/:visitId/items', async (req, res) => {
  try {
    const rxResult = await pool.query(
      "SELECT * FROM prescription WHERE consultation_id IN (SELECT id FROM consultation WHERE visit_id = $1) AND COALESCE(dispense_type,'internal') <> 'external'",
      [req.params.visitId]
    );
    const orderResult = await pool.query(
      'SELECT * FROM order_item WHERE visit_id = $1',
      [req.params.visitId]
    );
    const visitResult = await pool.query('SELECT visit_type FROM visit WHERE id = $1', [req.params.visitId]);
    // 이미 청구된 항목 집계(취소 영수 제외) — 추가분만 받기 위함
    const billedRes = await pool.query(
      `SELECT bi.item_type, bi.item_code, SUM(bi.quantity) AS qty, SUM(bi.total_price) AS amount
         FROM billing_item bi JOIN billing b ON b.id = bi.billing_id
        WHERE b.visit_id = $1 AND b.payment_status <> 'cancelled'
        GROUP BY bi.item_type, bi.item_code`,
      [req.params.visitId]
    );
    const billedConsult = billedRes.rows.some(function(r){ return r.item_type === 'consultation'; });
    res.json({
      visit_type: visitResult.rows[0]?.visit_type,
      prescriptions: rxResult.rows,
      orders: orderResult.rows,
      billed_items: billedRes.rows,
      billed_consult: billedConsult
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing - create billing record
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { visit_id, patient_id, consult_fee, drug_total, procedure_total, subtotal,
            discount_amount, discount_type, discount_value, previous_balance, total_due,
            amount_paid, change_amount, outstanding, payment_status, note, items } = req.body;
    // Generate receipt number
    const now = new Date();
    const receipt_no = 'R-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*9000)+1000);
    const result = await client.query(
      `INSERT INTO billing (visit_id, patient_id, receipt_no, consult_fee, drug_total, procedure_total, subtotal,
       discount_amount, discount_type, discount_value, previous_balance, total_due, amount_paid, change_amount,
       outstanding, payment_status, note, cashier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [visit_id, patient_id, receipt_no, consult_fee, drug_total, procedure_total, subtotal,
       discount_amount, discount_type, discount_value, previous_balance, total_due, amount_paid, change_amount,
       outstanding, payment_status, note, req.user.id]
    );
    const billing = result.rows[0];
    // Insert billing items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO billing_item (billing_id, item_type, item_name, item_code, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [billing.id, item.item_type, item.item_name, item.item_code, item.quantity, item.unit_price, item.total_price]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(billing);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/billing/patient/:patientId/history - receipt history
router.get('/patient/:patientId/history', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `SELECT b.*, s.name as cashier_name, v.visit_date, d.code as dept_code
                 FROM billing b
                 LEFT JOIN staff s ON b.cashier_id = s.id
                 LEFT JOIN visit v ON b.visit_id = v.id
                 LEFT JOIN department d ON v.department_id = d.id
                 WHERE b.patient_id = $1`;
    const params = [req.params.patientId];
    let idx = 2;
    if (from) { query += ` AND b.billing_date >= $${idx}`; params.push(from); idx++; }
    if (to) { query += ` AND b.billing_date <= $${idx}`; params.push(to); idx++; }
    query += ' ORDER BY b.billing_date DESC, b.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/billing/:billingId/void - 영수 취소 (해당 내원은 다시 수납 대기로 돌아감)
router.put('/:billingId/void', async (req, res) => {
  try {
    const { reason } = req.body;
    // 취소된 영수는 잔액 계산에서 제외되므로 outstanding=0 (크레딧 누적 방지)
    const result = await pool.query(
      `UPDATE billing SET payment_status='cancelled', outstanding=0,
              cancelled_at=NOW(), cancelled_by=$2, cancel_reason=$3, updated_at=NOW()
        WHERE id=$1 AND payment_status<>'cancelled' RETURNING *`,
      [req.params.billingId, req.user.id, reason || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found or already cancelled' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/billing/visit/:visitId/void-active - 내원의 모든 활성(미취소) 영수를 일괄 취소
// (정정 처리 시 잔재 영수가 남아 합계가 부풀지 않도록)
router.put('/visit/:visitId/void-active', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE billing SET payment_status='cancelled', outstanding=0,
              cancelled_at=NOW(), cancelled_by=$2, cancel_reason=$3, updated_at=NOW()
        WHERE visit_id=$1 AND payment_status<>'cancelled' RETURNING id`,
      [req.params.visitId, req.user.id, reason || null]
    );
    res.json({ voided: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/patient/:patientId/balance - 환자 잔액(owed>0 미수 / refund>0 환불예정)
router.get('/patient/:patientId/balance', async (req, res) => {
  try {
    // 취소된 영수는 '없던 일'로 완전 제외. 잔액 = 살아있는 영수들의 (청구 - 수납) 합.
    const r = await pool.query(
      `SELECT COALESCE(SUM(total_due - amount_paid),0) AS net
         FROM billing WHERE patient_id = $1 AND payment_status <> 'cancelled'`,
      [req.params.patientId]
    );
    const net = parseFloat(r.rows[0].net) || 0;  // >0: 미수(더 받아야), <0: 환불(돌려줘야)
    res.json({ owed: net > 0 ? net : 0, refund: net < 0 ? -net : 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/:id/pay - 기존 영수의 미수를 받아서 정산 (부분/전액)
router.post('/:id/pay', async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount) || 0;
    if (amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const cur = await pool.query(
      `SELECT total_due, amount_paid FROM billing WHERE id=$1 AND payment_status<>'cancelled'`,
      [req.params.id]
    );
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Not found or cancelled' });
    const due = parseFloat(cur.rows[0].total_due) || 0;
    const paid = parseFloat(cur.rows[0].amount_paid) || 0;
    const outstanding = due - paid;
    if (amount > outstanding + 0.5) return res.status(400).json({ error: 'amount exceeds outstanding' });
    const newPaid = paid + amount;
    const newOut = due - newPaid;
    const status = newOut <= 0.5 ? 'paid' : 'partial';
    const result = await pool.query(
      `UPDATE billing SET amount_paid=$2, outstanding=$3, payment_status=$4, cashier_id=$5, updated_at=NOW()
        WHERE id=$1 RETURNING *`,
      [req.params.id, newPaid, newOut > 0 ? newOut : 0, status, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
