const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { todayLocal } = require('../utils/localDate');
const { PAYMENT_STATUSES } = require('../utils/validate');

const router = express.Router();
router.use(authMiddleware);
// The menu is not a lock: without this any logged-in account (a doctor, the lab)
// could void a receipt or record a payment through the API. Every route needs the
// payment permission, except the balance, which reception shows at registration.
const canPay = permMiddleware('payment');
const canSeeBalance = permMiddleware('payment', 'registration');

// Voiding a bill undoes the balances it absorbed: the older bills go back to
// carrying their own outstanding amount. amount_paid was never touched when the
// balance was carried, so total_due - amount_paid restores the original figure.
async function restoreCarried(client, billingId) {
  await client.query(
    `UPDATE billing SET outstanding = GREATEST(total_due - amount_paid, 0),
            carried_into_id = NULL, updated_at = NOW()
      WHERE carried_into_id = $1`,
    [billingId]
  );
}

// One patient's bills are written one transaction at a time. Creating, voiding
// and settling all move money between a patient's bills (carry-over reads every
// open balance), so two cashiers - or one cashier clicking twice - must not
// interleave. The lock is held until COMMIT/ROLLBACK.
async function lockPatient(client, patientId) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1), $2)', ['billing_patient', parseInt(patientId, 10) || 0]);
}

async function lockPatientOfBill(client, billingId) {
  const r = await client.query('SELECT patient_id FROM billing WHERE id = $1', [billingId]);
  if (r.rows.length) await lockPatient(client, r.rows[0].patient_id);
}

async function activeBillIds(client, visitId) {
  const r = await client.query(
    `SELECT id FROM billing WHERE visit_id = $1 AND payment_status <> 'cancelled' ORDER BY id`,
    [visitId]
  );
  return r.rows.map(function (x) { return x.id; });
}

// Receipt number: R-YYYYMMDD-NNNN, sequential per day.
//
// This used to be a random 4-digit suffix, which collides with the UNIQUE
// constraint on receipt_no long before a clinic runs out of numbers: with a
// 9000-value space the odds of a repeat pass 50% at ~110 receipts in a day,
// and a collision surfaces to the cashier as a raw 500 error mid-payment.
// The advisory lock serialises number allocation for the duration of this
// transaction, so concurrent cashiers cannot pick the same number.
async function nextReceiptNo(client) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['billing_receipt_no']);
  const seqResult = await client.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_no, '^R-\\d{8}-', ''), '')::int), 0) + 1 AS next
       FROM billing
      WHERE billing_date = CURRENT_DATE
        AND receipt_no ~ '^R-\\d{8}-\\d+$'`
  );
  const dayStamp = (await client.query(`SELECT to_char(CURRENT_DATE, 'YYYYMMDD') AS d`)).rows[0].d;
  return 'R-' + dayStamp + '-' + String(seqResult.rows[0].next).padStart(4, '0');
}

// Counter fees - certificates, CD copies and the like - are added by the cashier
// and stored as billing_item rows of type 'fee'. They belong to no clinical item
// of the visit, so a comparison between what the visit costs now (prescriptions,
// orders, consultation) and what was billed must leave them out; otherwise every
// visit with a counter fee looks overbilled by exactly that fee and sits on the
// waiting list as a refund (H6, decided 2026-09-29). A fee-type code the doctor
// ordered (possible through an order set) is an order_item, so it is on both sides
// of the comparison and is not a counter fee. GET /pending and buildCorrection()
// both use this one definition.
function counterFeeCond(itemAlias, visitRef) {
  return itemAlias + ".item_type = 'fee' AND COALESCE(" + itemAlias + ".item_code,'') NOT IN " +
    "(SELECT COALESCE(o.order_code,'') FROM order_item o WHERE o.visit_id = " + visitRef + ')';
}

// Quantity of a prescription line. Consultation stores total_qty whenever a line is
// saved and is the one place that knows how it is computed (decided 2026-09-29:
// daily total x days, the Korean way). Billing reads it and nothing else - it used
// to fall back to dose x frequency x days, a second copy of the formula that
// pharmacy and statistics never had (they count a missing quantity as 0). A line
// with no total_qty is never billed as 0 silently: the waiting list flags it and
// billing refuses until consultation saves the line again.
const QTY_MISSING = 'QTY_MISSING';
function MISSING_QTY_SQL(visitRef) {
  return "EXISTS (SELECT 1 FROM prescription mq WHERE mq.consultation_id IN (SELECT id FROM consultation WHERE visit_id = " + visitRef + ")" +
    " AND COALESCE(mq.dispense_type,'internal') <> 'external' AND mq.total_qty IS NULL)";
}

// Prefix the client recognises: the screen was showing an older state of this
// visit or patient, so the request is refused rather than billed twice.
const BILL_CHANGED = 'BILL_CHANGED';

// GET /api/billing/pending - visits awaiting payment
router.get('/pending', canPay, async (req, res) => {
  try {
    const result = await pool.query(
      `WITH live AS (
         SELECT v.id AS visit_id,
           ( COALESCE((SELECT price_clinic FROM order_code WHERE code = CASE v.visit_type
                         WHEN 'newVisit' THEN 'C01' WHEN 'followUp' THEN 'C02'
                         WHEN 'emergency' THEN 'C03' WHEN 'referral' THEN 'C04' WHEN 'none' THEN NULL ELSE 'C01' END),0)
           + COALESCE((SELECT SUM(COALESCE(p.total_qty,0)*COALESCE(p.unit_price,0))
                         FROM prescription p WHERE p.consultation_id IN (SELECT id FROM consultation WHERE visit_id=v.id)
                               AND COALESCE(p.dispense_type,'internal') <> 'external'),0)
           + COALESCE((SELECT SUM(COALESCE(o.quantity,1)*COALESCE(o.unit_price,0)) FROM order_item o WHERE o.visit_id=v.id),0)
           ) AS live_total,
           COALESCE((SELECT SUM(b.consult_fee+b.drug_total+b.procedure_total) FROM billing b WHERE b.visit_id=v.id AND b.payment_status<>'cancelled'),0)
           - COALESCE((SELECT SUM(bi.total_price) FROM billing_item bi JOIN billing b ON b.id = bi.billing_id
                        WHERE b.visit_id=v.id AND b.payment_status<>'cancelled' AND ${counterFeeCond('bi', 'v.id')}),0) AS billed_total,
           EXISTS(SELECT 1 FROM billing b2 WHERE b2.visit_id=v.id AND b2.payment_status<>'cancelled') AS has_active_bill
         FROM visit v WHERE v.status='completed'
       )
       SELECT v.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.allergies,
       d.code as dept_code, s.name as doctor_name,
       (SELECT COALESCE(SUM(outstanding),0) FROM billing WHERE patient_id = p.id AND outstanding > 0 AND payment_status <> 'cancelled') as previous_balance,
       -- re-billing means "cancelled and nothing replaced it"; a corrected visit also
       -- has a cancelled bill, but its replacement is active and may still be owed
       (EXISTS (SELECT 1 FROM billing bx WHERE bx.visit_id = v.id AND bx.payment_status = 'cancelled')
        AND NOT l.has_active_bill) as needs_rebill,
       COALESCE((SELECT net_paid FROM billing WHERE visit_id = v.id AND payment_status = 'cancelled' ORDER BY cancelled_at DESC NULLS LAST, id DESC LIMIT 1),0) as prior_paid,
       ${MISSING_QTY_SQL('v.id')} as missing_qty,
       (l.has_active_bill AND (l.live_total - l.billed_total) > 0.01) as needs_additional,
       (l.has_active_bill AND (l.billed_total - l.live_total) > 0.01) as needs_refund,
       GREATEST(l.live_total - l.billed_total, 0) as extra_due,
       GREATEST(l.billed_total - l.live_total, 0) as refund_due,
       (SELECT id FROM billing WHERE visit_id = v.id AND payment_status <> 'cancelled' ORDER BY created_at DESC, id DESC LIMIT 1) as active_bill_id,
       COALESCE((SELECT SUM(net_paid) FROM billing WHERE visit_id = v.id AND payment_status <> 'cancelled'),0) as active_paid
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
router.get('/completed', canPay, async (req, res) => {
  try {
    const { date } = req.query;
    const billDate = date || todayLocal();
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
router.get('/:billingId/detail', canPay, async (req, res) => {
  try {
    const billResult = await pool.query(
      `SELECT b.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.allergies,
       v.visit_date, v.visit_type, d.code as dept_code, s.name as doctor_name, c.name as cashier_name,
       COALESCE(NULLIF(d.name_fr,''), NULLIF(d.name_en,''), d.name) as dept_name_fr,
       x.name as cancelled_by_name,
       ci.receipt_no as carried_into_receipt_no, ci.billing_date as carried_into_date
       FROM billing b
       JOIN patient p ON b.patient_id = p.id
       LEFT JOIN visit v ON b.visit_id = v.id
       LEFT JOIN department d ON v.department_id = d.id
       LEFT JOIN staff s ON v.doctor_id = s.id
       LEFT JOIN staff c ON b.cashier_id = c.id
       LEFT JOIN staff x ON b.cancelled_by = x.id
       LEFT JOIN billing ci ON ci.id = b.carried_into_id
       WHERE b.id = $1`,
      [req.params.billingId]
    );
    if (!billResult.rows.length) return res.status(404).json({ error: 'Billing not found' });
    const itemResult = await pool.query('SELECT * FROM billing_item WHERE billing_id = $1 ORDER BY id', [req.params.billingId]);
    // The older receipts whose unpaid balance this one took over (016), so the
    // printed receipt can say where "previous balance" came from.
    const fromResult = await pool.query(
      `SELECT receipt_no, billing_date, GREATEST(total_due - amount_paid, 0) AS amount
         FROM billing WHERE carried_into_id = $1 ORDER BY billing_date, id`,
      [req.params.billingId]
    );
    res.json({ bill: billResult.rows[0], items: itemResult.rows, carried_from: fromResult.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/billing/visit/:visitId/items - get billable items for a visit
router.get('/visit/:visitId/items', canPay, async (req, res) => {
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
      billed_consult: billedConsult,
      // what the screen is billing against; POST / refuses if this has changed
      active_bill_ids: await activeBillIds(pool, req.params.visitId)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing - create billing record
router.post('/', canPay, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { visit_id, patient_id, consult_fee, drug_total, procedure_total, subtotal,
            discount_amount, discount_type, discount_value, previous_balance, total_due,
            amount_paid, change_amount, outstanding, payment_status, note, items,
            expected_active_bill_ids } = req.body;

    // A receipt is a financial record, so refuse impossible figures here rather
    // than storing them. The payment screen already clamps these, but a stale
    // browser tab, a future UI change or a direct API call should not be able to
    // write a negative charge or a discount larger than the bill. Note that
    // amount_paid legitimately exceeds total_due — it is the cash handed over,
    // with the difference returned as change_amount.
    const money = { consult_fee, drug_total, procedure_total, subtotal, discount_amount,
                    previous_balance, total_due, amount_paid, change_amount, outstanding };
    for (const [field, raw] of Object.entries(money)) {
      const value = parseFloat(raw ?? 0);
      if (!isFinite(value) || value < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: field + ' must be a number >= 0' });
      }
    }
    if (parseFloat(discount_amount ?? 0) > parseFloat(subtotal ?? 0) + 0.5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'discount cannot exceed the subtotal' });
    }
    if (parseFloat(change_amount ?? 0) > parseFloat(amount_paid ?? 0) + 0.5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'change cannot exceed the amount received' });
    }
    // Mirrors the billing_payment_status_check constraint. Left to the database
    // an unknown status aborts the insert as a 500 carrying the raw constraint
    // text, which tells the cashier nothing about what to do next.
    if (payment_status != null && payment_status !== '' && !PAYMENT_STATUSES.includes(String(payment_status))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'payment_status must be one of ' + PAYMENT_STATUSES.join(', ') });
    }
    // The figures must follow from one another. "Leave unpaid" used to send
    // amount_paid 0 while still subtracting whatever sat in the cash box from
    // outstanding, so the debt on record was smaller than the bill and the payment
    // screen and the statistics disagreed about what the patient owed.
    const due = parseFloat(total_due) || 0, handed = parseFloat(amount_paid) || 0;
    const back = parseFloat(change_amount) || 0, owed = parseFloat(outstanding) || 0;
    const figuresBad =
      Math.abs(back - Math.max(0, handed - due)) > 0.5 ||
      Math.abs(owed - Math.max(0, due - (handed - back))) > 0.5 ||
      (payment_status === 'unpaid' && handed > 0.5) ||
      (payment_status === 'paid' && owed > 0.5) ||
      (payment_status === 'partial' && !(owed > 0.5 && handed - back > 0.5));
    if (figuresBad) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'change_amount, outstanding and payment_status must follow from total_due and amount_paid' });
    }

    const visitRes = await client.query('SELECT patient_id FROM visit WHERE id = $1', [visit_id]);
    if (!visitRes.rows.length || String(visitRes.rows[0].patient_id) !== String(patient_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'visit_id does not belong to patient_id' });
    }

    const mq = await client.query(
      `SELECT drug_name FROM prescription
        WHERE consultation_id IN (SELECT id FROM consultation WHERE visit_id = $1)
          AND COALESCE(dispense_type,'internal') <> 'external' AND total_qty IS NULL`,
      [visit_id]
    );
    if (mq.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: QTY_MISSING + ': ' + mq.rows.map(function (r) { return r.drug_name; }).join(', ') });
    }

    // Duplicate guard. The screen sends the active bills it was billing against;
    // if another request billed this visit in the meantime (a second click, a
    // second cashier, a tab left open) the sets differ and nothing is written.
    // Without this, a double click stored two receipts for the same visit.
    if (!Array.isArray(expected_active_bill_ids)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: BILL_CHANGED + ': reload the payment screen and try again' });
    }
    await lockPatient(client, patient_id);
    const nowActive = await activeBillIds(client, visit_id);
    const expected = expected_active_bill_ids.map(function (x) { return parseInt(x, 10); }).sort(function (a, b) { return a - b; });
    if (nowActive.join(',') !== expected.join(',')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: BILL_CHANGED + ': this visit was billed while the screen was open' });
    }
    // The previous balance must still be there to carry. If another bill already
    // absorbed it, adding it again would charge the same debt twice.
    const carriedIn = parseFloat(previous_balance) || 0;
    if (carriedIn > 0.5) {
      const avail = await client.query(
        `SELECT COALESCE(SUM(outstanding),0) AS amt FROM billing
          WHERE patient_id = $1 AND payment_status <> 'cancelled'
            AND carried_into_id IS NULL AND outstanding > 0`,
        [patient_id]
      );
      if (carriedIn > (parseFloat(avail.rows[0].amt) || 0) + 0.5) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: BILL_CHANGED + ': the previous balance has already been settled' });
      }
    }

    const receipt_no = await nextReceiptNo(client);
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

    // Absorb the carried-forward balance. `previous_balance` was added to this
    // bill's total_due, so the older bills it came from must stop carrying it —
    // otherwise the debt is counted twice and every later visit re-bills it.
    // Oldest first, and only bills that fit entirely within previous_balance, so
    // that voiding this bill can restore them exactly (see the void route).
    const carried = parseFloat(previous_balance) || 0;
    if (carried > 0.01) {
      const priorRes = await client.query(
        `SELECT id, outstanding FROM billing
          WHERE patient_id = $1 AND id <> $2
            AND payment_status <> 'cancelled'
            AND carried_into_id IS NULL
            AND outstanding > 0
          ORDER BY billing_date ASC, id ASC`,
        [patient_id, billing.id]
      );
      let remaining = carried;
      for (const prior of priorRes.rows) {
        const amount = parseFloat(prior.outstanding) || 0;
        if (amount > remaining + 0.01) break;
        await client.query(
          `UPDATE billing SET outstanding = 0, carried_into_id = $2, updated_at = NOW()
            WHERE id = $1`,
          [prior.id, billing.id]
        );
        remaining -= amount;
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
router.get('/patient/:patientId/history', canPay, async (req, res) => {
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
router.put('/:billingId/void', canPay, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { reason } = req.body;
    await lockPatientOfBill(client, req.params.billingId);
    // A bill whose balance a later bill absorbed (016) cannot be voided on its own:
    // the later bill's total_due still charges that balance, so the debt would
    // outlive the bill it came from. Void the later bill first - that restores this
    // one's balance - then this one. carried_into_id always names an active bill:
    // voiding that bill clears it and a correction moves it to the replacement.
    const carried = await client.query(
      `SELECT i.receipt_no FROM billing b JOIN billing i ON i.id = b.carried_into_id
        WHERE b.id = $1 AND b.payment_status <> 'cancelled'`,
      [req.params.billingId]
    );
    if (carried.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'BILL_CARRIED: ' + carried.rows[0].receipt_no });
    }
    // 취소된 영수는 잔액 계산에서 제외되므로 outstanding=0 (크레딧 누적 방지)
    const result = await client.query(
      `UPDATE billing SET payment_status='cancelled', outstanding=0,
              cancelled_at=NOW(), cancelled_by=$2, cancel_reason=$3, updated_at=NOW()
        WHERE id=$1 AND payment_status<>'cancelled' RETURNING *`,
      [req.params.billingId, req.user.id, reason || null]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found or already cancelled' });
    }
    await restoreCarried(client, req.params.billingId);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ── Correction (정정) ────────────────────────────────────────────────────────
//
// When a visit's items shrink after it was billed, its active bills are replaced
// by one bill for what the visit costs now. This used to be done by the screen in
// two requests (void everything, then post a bill it had computed itself), which
// recorded money that was never received:
//   - amount_paid was set to the new total whatever had actually been paid, so
//     correcting an unpaid bill stored it as paid in full;
//   - the refund went into change_amount on top of that, so net_paid came out as
//     total minus refund - short by exactly the refund;
//   - discount, previously billed issuance fees and carried-forward balances were
//     dropped, and the cash that had paid those balances was counted as refund
//     while the balances themselves were restored as debt.
// Now the server builds the replacement from the database, in one transaction.
//
// Rules (approved 2026-09-29):
//   - the new bill records the cash actually kept for this visit so far
//     (sum of net_paid of the bills it replaces) as amount_paid;
//   - discount and carried-forward balances stay as they were billed; issuance
//     fees billed at the counter stay too - they are not clinical items;
//   - kept >= new total: status paid, change_amount = refund handed back now;
//   - kept <  new total: the difference stays as outstanding (partial / unpaid).

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// Everything the replacement bill would contain, from what is in the database
// now. Throws { status, error } when a correction is not possible.
async function buildCorrection(db, visitId) {
  const vr = await db.query('SELECT id, patient_id, visit_type FROM visit WHERE id = $1', [visitId]);
  if (!vr.rows.length) throw { status: 404, error: 'Visit not found' };
  const visit = vr.rows[0];

  const ar = await db.query(
    `SELECT id, receipt_no, net_paid, discount_amount, previous_balance, carried_into_id
       FROM billing WHERE visit_id = $1 AND payment_status <> 'cancelled' ORDER BY id`,
    [visitId]
  );
  const active = ar.rows;
  if (!active.length) throw { status: 409, error: BILL_CHANGED + ': this visit has no active bill' };
  // A bill whose balance a later bill absorbed cannot be replaced here: the later
  // bill already charges that balance. Voiding the later bill first restores it.
  const carried = active.find(function (b) { return b.carried_into_id; });
  if (carried) {
    const into = await db.query('SELECT receipt_no FROM billing WHERE id = $1', [carried.carried_into_id]);
    throw { status: 409, error: 'BILL_CARRIED: ' + ((into.rows[0] && into.rows[0].receipt_no) || carried.carried_into_id) };
  }
  const ids = active.map(function (b) { return b.id; });

  // Same price sources as GET /pending, so the correction agrees with the flag
  // that put the visit on the list.
  const cr = await db.query(
    `SELECT COALESCE((SELECT price_clinic FROM order_code WHERE code = CASE $1::text
        WHEN 'newVisit' THEN 'C01' WHEN 'followUp' THEN 'C02'
        WHEN 'emergency' THEN 'C03' WHEN 'referral' THEN 'C04' WHEN 'none' THEN NULL ELSE 'C01' END),0) AS fee`,
    [visit.visit_type]
  );
  const rx = await db.query(
    `SELECT drug_code, drug_name, total_qty AS qty, COALESCE(unit_price,0) AS unit_price
       FROM prescription
      WHERE consultation_id IN (SELECT id FROM consultation WHERE visit_id = $1)
        AND COALESCE(dispense_type,'internal') <> 'external'
      ORDER BY id`,
    [visitId]
  );
  const missing = rx.rows.filter(function (r) { return r.qty == null; });
  if (missing.length) throw { status: 409, error: QTY_MISSING + ': ' + missing.map(function (r) { return r.drug_name; }).join(', ') };
  const orders = await db.query(
    `SELECT order_code, order_name, code_type, COALESCE(quantity,1) AS qty, COALESCE(unit_price,0) AS unit_price
       FROM order_item WHERE visit_id = $1 ORDER BY id`,
    [visitId]
  );
  // Counter fees are kept as billed; a fee-type code the doctor ordered is already
  // in `orders` above and must not be counted twice.
  const fees = await db.query(
    `SELECT bi.item_code, bi.item_name, bi.quantity, bi.unit_price, bi.total_price
       FROM billing_item bi WHERE bi.billing_id = ANY($1::int[]) AND ${counterFeeCond('bi', '$2')} ORDER BY bi.id`,
    [ids, visitId]
  );

  const items = [];
  const consultFee = round2(cr.rows[0].fee);
  if (consultFee > 0) items.push({ item_type: 'consultation', item_name: 'Consultation', item_code: '', quantity: 1, unit_price: consultFee, total_price: consultFee });
  let drugTotal = 0, procTotal = 0;
  rx.rows.forEach(function (r) {
    const q = Number(r.qty) || 0, up = Number(r.unit_price) || 0, tot = round2(q * up);
    drugTotal += tot;
    items.push({ item_type: 'drug', item_name: r.drug_name, item_code: r.drug_code, quantity: q, unit_price: up, total_price: tot });
  });
  orders.rows.forEach(function (o) {
    const q = Number(o.qty) || 0, up = Number(o.unit_price) || 0, tot = round2(q * up);
    procTotal += tot;
    items.push({ item_type: o.code_type || 'procedure', item_name: o.order_name, item_code: o.order_code, quantity: q, unit_price: up, total_price: tot });
  });
  fees.rows.forEach(function (f) {
    const tot = round2(f.total_price);
    procTotal += tot;
    items.push({ item_type: 'fee', item_name: f.item_name, item_code: f.item_code, quantity: Number(f.quantity) || 1, unit_price: Number(f.unit_price) || 0, total_price: tot });
  });

  const subtotal = round2(consultFee + drugTotal + procTotal);
  const discount = round2(Math.min(subtotal, active.reduce(function (s, b) { return s + (Number(b.discount_amount) || 0); }, 0)));
  const previousBalance = round2(active.reduce(function (s, b) { return s + (Number(b.previous_balance) || 0); }, 0));
  const totalDue = round2(Math.max(0, subtotal - discount + previousBalance));
  const kept = round2(active.reduce(function (s, b) { return s + (Number(b.net_paid) || 0); }, 0));
  const refund = round2(Math.max(0, kept - totalDue));
  const outstanding = round2(Math.max(0, totalDue - kept));
  const status = outstanding > 0.5 ? (kept > 0.5 ? 'partial' : 'unpaid') : 'paid';

  return {
    visit_id: visit.id, patient_id: visit.patient_id,
    active_bill_ids: ids, replaces: active.map(function (b) { return b.receipt_no; }),
    items: items,
    consult_fee: consultFee, drug_total: round2(drugTotal), procedure_total: round2(procTotal),
    subtotal: subtotal, discount_amount: discount, previous_balance: previousBalance, total_due: totalDue,
    paid_so_far: kept, amount_paid: kept, change_amount: refund, refund: refund,
    outstanding: outstanding, payment_status: status,
  };
}

// GET /api/billing/visit/:visitId/correction - what a correction would record (no changes)
router.get('/visit/:visitId/correction', canPay, async (req, res) => {
  try {
    res.json(await buildCorrection(pool, req.params.visitId));
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/visit/:visitId/correct - replace the visit's active bills with one
// bill for what it costs now. Body: { expected_active_bill_ids, expected_refund,
// expected_outstanding, reason } - the figures the cashier was shown; if anything
// changed since, nothing is written (409) so the refund handed over is the one shown.
router.post('/visit/:visitId/correct', canPay, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vr = await client.query('SELECT patient_id FROM visit WHERE id = $1', [req.params.visitId]);
    if (!vr.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Visit not found' }); }
    await lockPatient(client, vr.rows[0].patient_id);

    const c = await buildCorrection(client, req.params.visitId);
    const expected = (Array.isArray(req.body.expected_active_bill_ids) ? req.body.expected_active_bill_ids : [])
      .map(function (x) { return parseInt(x, 10); }).sort(function (a, b) { return a - b; });
    if (expected.join(',') !== c.active_bill_ids.join(',') ||
        Math.abs((parseFloat(req.body.expected_refund) || 0) - c.refund) > 0.5 ||
        Math.abs((parseFloat(req.body.expected_outstanding) || 0) - c.outstanding) > 0.5) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: BILL_CHANGED + ': the bill changed while the screen was open' });
    }

    // Replace, do not restore: balances the old bills absorbed move to the new
    // bill (below) instead of reappearing as debt, because the new bill charges them.
    await client.query(
      `UPDATE billing SET payment_status='cancelled', outstanding=0,
              cancelled_at=NOW(), cancelled_by=$2, cancel_reason=$3, updated_at=NOW()
        WHERE id = ANY($1::int[])`,
      [c.active_bill_ids, req.user.id, req.body.reason || 'correction']
    );
    const receipt_no = await nextReceiptNo(client);
    const note = 'correction of ' + c.replaces.join(', ') + (c.refund > 0 ? ' · refund ' + c.refund : '');
    const ins = await client.query(
      `INSERT INTO billing (visit_id, patient_id, receipt_no, consult_fee, drug_total, procedure_total, subtotal,
       discount_amount, discount_type, discount_value, previous_balance, total_due, amount_paid, change_amount,
       outstanding, payment_status, note, cashier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'amount',$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [c.visit_id, c.patient_id, receipt_no, c.consult_fee, c.drug_total, c.procedure_total, c.subtotal,
       c.discount_amount, c.previous_balance, c.total_due, c.amount_paid, c.change_amount,
       c.outstanding, c.payment_status, note, req.user.id]
    );
    const bill = ins.rows[0];
    for (const it of c.items) {
      await client.query(
        'INSERT INTO billing_item (billing_id, item_type, item_name, item_code, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [bill.id, it.item_type, it.item_name, it.item_code, it.quantity, it.unit_price, it.total_price]
      );
    }
    await client.query(
      'UPDATE billing SET carried_into_id = $1, updated_at = NOW() WHERE carried_into_id = ANY($2::int[])',
      [bill.id, c.active_bill_ids]
    );
    await client.query('COMMIT');
    res.status(201).json(Object.assign({}, bill, { refund: c.refund }));
  } catch (err) {
    await client.query('ROLLBACK');
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// GET /api/billing/patient/:patientId/balance - 환자 잔액(owed>0 미수 / refund>0 환불예정)
router.get('/patient/:patientId/balance', canSeeBalance, async (req, res) => {
  try {
    // 취소된 영수는 '없던 일'로 완전 제외.
    // 미수는 outstanding 기준 — 이월된 영수는 outstanding=0 이라 이중 계산되지 않는다.
    // (total_due - amount_paid 로 계산하면 이월분이 옛 영수와 새 영수 양쪽에 잡힌다.)
    const r = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(outstanding,0)),0) AS owed,
              COALESCE(SUM(GREATEST(net_paid - total_due,0)),0) AS refund
         FROM billing WHERE patient_id = $1 AND payment_status <> 'cancelled'`,
      [req.params.patientId]
    );
    res.json({
      owed: parseFloat(r.rows[0].owed) || 0,
      refund: parseFloat(r.rows[0].refund) || 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/:id/pay - 기존 영수의 미수를 받아서 정산 (부분/전액)
router.post('/:id/pay', canPay, async (req, res) => {
  const client = await pool.connect();
  try {
    const amount = parseFloat(req.body.amount);
    if (!isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    await client.query('BEGIN');
    await lockPatientOfBill(client, req.params.id);
    // FOR UPDATE: read-modify-write on money. Without the row lock two cashiers
    // settling the same bill at once both read the old amount_paid and the second
    // UPDATE overwrites the first — both get a success response but only one
    // payment is recorded, so cash collected goes missing from the books.
    const cur = await client.query(
      `SELECT total_due, amount_paid, net_paid, carried_into_id FROM billing
        WHERE id=$1 AND payment_status<>'cancelled' FOR UPDATE`,
      [req.params.id]
    );
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found or cancelled' });
    }
    // A carried bill's debt now lives on the later bill that absorbed it (016):
    // its outstanding is 0 but total_due - net_paid below still shows the old
    // amount, so paying it here collected the same debt a second time. Refuse,
    // naming the bill where the debt is now. Nothing else about the sum changes.
    if (cur.rows[0].carried_into_id) {
      const into = await client.query('SELECT receipt_no FROM billing WHERE id = $1', [cur.rows[0].carried_into_id]);
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'BILL_CARRIED: ' + ((into.rows[0] && into.rows[0].receipt_no) || cur.rows[0].carried_into_id) });
    }
    const due = parseFloat(cur.rows[0].total_due) || 0;
    const paid = parseFloat(cur.rows[0].amount_paid) || 0;
    // What is still owed depends on the cash kept, not the note handed over.
    const outstanding = due - (parseFloat(cur.rows[0].net_paid) || 0);
    if (amount > outstanding + 0.5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'amount exceeds outstanding' });
    }
    const newPaid = paid + amount;
    const newOut = outstanding - amount;
    const status = newOut <= 0.5 ? 'paid' : 'partial';
    const result = await client.query(
      `UPDATE billing SET amount_paid=$2, outstanding=$3, payment_status=$4, cashier_id=$5, updated_at=NOW()
        WHERE id=$1 RETURNING *`,
      [req.params.id, newPaid, newOut > 0 ? newOut : 0, status, req.user.id]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
