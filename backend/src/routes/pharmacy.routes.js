const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { badDateRange } = require('../utils/validate');

const router = express.Router();
router.use(authMiddleware);

// Who may do what. Dispensing and the queue stay with the pharmacy permission.
// Receiving, counting and discarding stock is open to pharmacy, consultation
// (doctors) and settings (admin) - decided 2026-09-29: there is no pharmacist,
// nurses (pharmacy permission) and doctors both handle the shelf. The monthly
// report adds stats. Every route below names its own; nothing is covered by a
// file-wide rule any more, so a new route without one is open to any signed-in
// account - give it one.
const canDispense = permMiddleware('pharmacy');
const canStock = permMiddleware('pharmacy', 'consultation', 'settings');
const canReport = permMiddleware('pharmacy', 'settings', 'stats');

// The API client hands the screen only the error text, not the status code, so
// these exact strings are what Pharmacy.jsx recognises to show a translated
// message instead of raw English. Change them together.
const ERR_NOTHING_PENDING = 'No pending prescriptions for this consultation';
const ERR_TYPE_LOCKED = 'Prescription already dispensed; dispense type can no longer change';
const ERR_TOO_OLD = 'Prescription too old to dispense here; the doctor must prescribe again';
const ERR_DISCARD_MORE = 'Cannot discard more than the recorded stock; count the shelf first';
const ERR_MEMO_REQUIRED = 'A note is required';
const ERR_WHOLE_NUMBER = 'Quantity must be a whole number';
// Stored on the ledger row; the screen recognises it and shows it translated.
const MEMO_OUTSIDE = 'Changed outside the stock record (settings screen)';

// How far back an undispensed prescription can still be dispensed from the
// patient search (decision M3, 2026-09-29: "today's list + the patient's older
// ones"; 7 days decided by the manager the same day). This is the one place to change it.
// Older ones go back to the doctor: symptoms move on, and an antibiotic started a
// fortnight late is a different treatment.
const PAST_RX_DAYS = 7;

// ── Stock ledger ─────────────────────────────────────────────────────────────
// The only way drug.stock_qty changes from this file: lock the drug row, write the
// new count, add one stock_movement row, all inside the caller's transaction.
//   receive  +qty            adjust   counted - before (0 is recorded too)
//   discard  -qty (refused when more than the record holds)
//   dispense -qty, stopping at 0 with the rest recorded as shortfall
// Settings can still set stock_qty directly until its drug form stops writing it
// (planned after this is merged). If the count no longer matches the last ledger
// row, that difference is recorded first as an adjust with staff unknown, so the
// chain of before/after stays unbroken and the outside change is visible.
//
// Order is by id, not created_at. Rows are inserted while holding the drug row
// lock, so ids follow the real sequence; NOW() is the start of the transaction, and
// one that waited for the lock carries an earlier time than the one it waited for.
// Ordering by that time found the wrong "last row" under concurrent dispensing and
// receiving and recorded outside changes that never happened. created_at is set
// with clock_timestamp() at insert, so it follows the same order and the monthly
// report's date boundaries cut the chain where it really was at that moment.
class StockError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function moveStock(client, { drugId, kind, qty, counted, memo, prescriptionId, consultationId, staffId }) {
  const cur = await client.query('SELECT id, COALESCE(stock_qty,0) AS stock_qty FROM drug WHERE id = $1 FOR UPDATE', [drugId]);
  if (cur.rows.length === 0) throw new StockError(404, 'Drug not found');
  const before = Number(cur.rows[0].stock_qty);

  const last = await client.query(
    'SELECT stock_after FROM stock_movement WHERE drug_id = $1 ORDER BY id DESC LIMIT 1', [drugId]);
  if (last.rows.length && Number(last.rows[0].stock_after) !== before) {
    const was = Number(last.rows[0].stock_after);
    await client.query(
      `INSERT INTO stock_movement (drug_id, kind, qty, stock_before, stock_after, memo, created_at)
       VALUES ($1, 'adjust', $2, $3, $4, $5, clock_timestamp())`,
      [drugId, before - was, was, before, MEMO_OUTSIDE]);
  }

  let change, shortfall = 0;
  if (kind === 'receive') change = qty;
  else if (kind === 'adjust') change = counted - before;
  else if (kind === 'discard') {
    if (qty > before) throw new StockError(409, ERR_DISCARD_MORE);
    change = -qty;
  } else if (kind === 'dispense') {
    change = -qty;
    if (before + change < 0) shortfall = -(before + change);
  } else throw new StockError(400, 'Unknown movement');
  const after = before + change + shortfall;

  await client.query('UPDATE drug SET stock_qty = $1, updated_at = NOW() WHERE id = $2', [after, drugId]);
  const row = await client.query(
    `INSERT INTO stock_movement (drug_id, kind, qty, stock_before, stock_after, shortfall,
                                 prescription_id, consultation_id, staff_id, memo, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, clock_timestamp()) RETURNING *`,
    [drugId, kind, change, before, after, shortfall, prescriptionId || null, consultationId || null, staffId || null, memo || null]);
  return { before, after, shortfall, movement: row.rows[0] };
}

function wholeNumber(v, min) {
  const n = Number(v);
  return v !== '' && v !== null && v !== undefined && Number.isInteger(n) && n >= min ? n : null;
}

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
router.get('/pending', canDispense, async (req, res) => {
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
router.get('/patient/:patientId/pending', canDispense, async (req, res) => {
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
router.get('/completed', canDispense, async (req, res) => {
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
router.get('/patient/:patientId/recent-rx', canDispense, async (req, res) => {
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
router.put('/consultations/:id/dispense', canDispense, async (req, res) => {
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
          // The count stops at zero; what could not be covered is kept on the
          // ledger row as shortfall and reported to the screen, not swallowed.
          const m = await moveStock(client, {
            drugId: rx.drug_id, kind: 'dispense', qty,
            prescriptionId: rx.id, consultationId: Number(req.params.id), staffId: req.user.id,
          });
          if (m.shortfall > 0) {
            shortages.push({
              prescription_id: rx.id, drug_id: rx.drug_id, drug_name: rx.drug_name,
              requested: qty, available: m.before, missing: m.shortfall,
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
router.put('/prescription/:id/dispense-type', canDispense, async (req, res) => {
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

// ── Stock screen ─────────────────────────────────────────────────────────────

// GET /api/pharmacy/stock?q=&category= - active drugs with their count
router.get('/stock', canStock, async (req, res) => {
  try {
    const params = [];
    let where = 'd.is_active = true';
    if (req.query.category) { params.push(req.query.category); where += ` AND d.category = $${params.length}`; }
    if (req.query.q) { params.push('%' + req.query.q + '%'); where += ` AND (d.code ILIKE $${params.length} OR d.name ILIKE $${params.length} OR d.generic_name ILIKE $${params.length})`; }
    const r = await pool.query(
      `SELECT d.id, d.code, d.name, d.generic_name, d.category, COALESCE(d.stock_qty,0) AS stock_qty, d.min_stock,
              (SELECT MAX(m.created_at) FROM stock_movement m WHERE m.drug_id = d.id AND m.kind <> 'opening') AS last_moved_at
         FROM drug d WHERE ${where} ORDER BY d.name, d.code`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pharmacy/stock/:drugId/movements?from=YYYY-MM-DD&to=YYYY-MM-DD - newest first
router.get('/stock/:drugId/movements', canStock, async (req, res) => {
  const drugId = wholeNumber(req.params.drugId, 1);
  if (!drugId) return res.status(400).json({ error: 'drugId must be a number' });
  const bad = badDateRange(req.query.from, req.query.to);
  if (bad) return res.status(400).json({ error: bad });
  try {
    const params = [drugId];
    let where = 'm.drug_id = $1';
    if (req.query.from) { params.push(req.query.from); where += ` AND m.created_at >= $${params.length}::date`; }
    if (req.query.to) { params.push(req.query.to); where += ` AND m.created_at < $${params.length}::date + 1`; }
    const r = await pool.query(
      `SELECT m.id, m.kind, m.qty, m.stock_before, m.stock_after, m.shortfall, m.memo, m.created_at,
              m.prescription_id, m.consultation_id, st.name AS staff_name,
              p.chart_no, TRIM(COALESCE(p.last_name,'') || ' ' || COALESCE(p.first_name,'')) AS patient_name
         FROM stock_movement m
         LEFT JOIN staff st ON st.id = m.staff_id
         LEFT JOIN consultation c ON c.id = m.consultation_id
         LEFT JOIN patient p ON p.id = c.patient_id
        WHERE ${where}
        ORDER BY m.id DESC
        LIMIT 500`, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pharmacy/stock/:drugId/receive   { qty, memo }      goods received
// POST /api/pharmacy/stock/:drugId/count     { counted, memo }  shelf count (note required)
// POST /api/pharmacy/stock/:drugId/discard   { qty, memo }      thrown away (reason required)
function stockWrite(kind) {
  return async (req, res) => {
    const drugId = wholeNumber(req.params.drugId, 1);
    if (!drugId) return res.status(400).json({ error: 'drugId must be a number' });
    const memo = String(req.body.memo || '').trim();
    const args = { drugId, kind, memo, staffId: req.user.id };
    if (kind === 'adjust') {
      args.counted = wholeNumber(req.body.counted, 0);
      if (args.counted === null) return res.status(400).json({ error: ERR_WHOLE_NUMBER });
    } else {
      args.qty = wholeNumber(req.body.qty, 1);
      if (args.qty === null) return res.status(400).json({ error: ERR_WHOLE_NUMBER });
    }
    if (kind !== 'receive' && !memo) return res.status(400).json({ error: ERR_MEMO_REQUIRED });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const m = await moveStock(client, args);
      await client.query('COMMIT');
      res.json({ success: true, stock_before: m.before, stock_after: m.after, movement: m.movement });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(err.status || 500).json({ error: err.message });
    } finally { client.release(); }
  };
}
router.post('/stock/:drugId/receive', canStock, stockWrite('receive'));
router.post('/stock/:drugId/count', canStock, stockWrite('adjust'));
router.post('/stock/:drugId/discard', canStock, stockWrite('discard'));

// GET /api/pharmacy/stock/report?month=YYYY-MM - monthly stock report, one row per drug
//
// Worked out from the ledger alone. For each drug:
//   start  = stock_after of the last row before the 1st (00:00, clinic time)
//   end    = stock_after of the last row before the 1st of the next month
//   in between, per kind: received, dispensed (what left), shortfall (what the
//   record was short when dispensing stopped at 0), adjusted (signed), discarded
// and start + received - dispensed + shortfall + adjusted - discarded = end, which
// every ledger row guarantees on its own; `ok` says whether it held, as a check.
// "Last row" is by id (the real order, see moveStock); created_at is stamped with
// clock_timestamp() under the same lock, so the date boundary follows that order.
// A drug whose record began inside the month starts from its opening row
// (started_on is set); a drug whose record had not begun by the month's end is
// left out, so months before the record started come back empty.
router.get('/stock/report', canReport, async (req, res) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: 'month must be YYYY-MM' });
  try {
    const r = await pool.query(
      `WITH b AS (SELECT $1::date AS s, ($1::date + INTERVAL '1 month')::date AS e)
       SELECT d.id, d.code, d.name, d.category, d.is_active,
              (SELECT m.stock_after FROM stock_movement m, b
                WHERE m.drug_id = d.id AND m.created_at < b.s ORDER BY m.id DESC LIMIT 1) AS start_qty,
              (SELECT m.stock_after FROM stock_movement m, b
                WHERE m.drug_id = d.id AND m.created_at < b.e ORDER BY m.id DESC LIMIT 1) AS end_qty,
              (SELECT TO_CHAR(MIN(m.created_at), 'YYYY-MM-DD') FROM stock_movement m, b
                WHERE m.drug_id = d.id AND m.kind = 'opening' AND m.created_at >= b.s AND m.created_at < b.e) AS started_on,
              COALESCE(SUM(m.qty) FILTER (WHERE m.kind = 'opening'), 0)   AS opening,
              COALESCE(SUM(m.qty) FILTER (WHERE m.kind = 'receive'), 0)   AS received,
              COALESCE(-SUM(m.qty) FILTER (WHERE m.kind = 'dispense'), 0) AS dispensed,
              COALESCE(SUM(m.shortfall), 0)                                AS shortfall,
              COALESCE(SUM(m.qty) FILTER (WHERE m.kind = 'adjust'), 0)    AS adjusted,
              COALESCE(-SUM(m.qty) FILTER (WHERE m.kind = 'discard'), 0)  AS discarded,
              COUNT(m.id) AS movements
         FROM drug d
         CROSS JOIN b
         LEFT JOIN stock_movement m ON m.drug_id = d.id AND m.created_at >= b.s AND m.created_at < b.e
        WHERE EXISTS (SELECT 1 FROM stock_movement x WHERE x.drug_id = d.id AND x.created_at < b.e)
        GROUP BY d.id, b.s, b.e
        ORDER BY d.name, d.code`,
      [month + '-01']
    );
    const rows = r.rows.map(x => {
      const n = v => Number(v) || 0;
      // Record began this month: its opening row is the starting balance, not a movement.
      const start = x.start_qty === null ? n(x.opening) : n(x.start_qty);
      const end = x.end_qty === null ? start : n(x.end_qty);
      const expected = start + n(x.received) - n(x.dispensed) + n(x.shortfall) + n(x.adjusted) - n(x.discarded);
      return {
        drug_id: x.id, code: x.code, name: x.name, category: x.category, is_active: x.is_active,
        started_on: x.start_qty === null ? x.started_on : null,
        start, received: n(x.received), dispensed: n(x.dispensed), shortfall: n(x.shortfall),
        adjusted: n(x.adjusted), discarded: n(x.discarded), end,
        movements: n(x.movements), ok: expected === end,
      };
    });
    res.json({ month, rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
