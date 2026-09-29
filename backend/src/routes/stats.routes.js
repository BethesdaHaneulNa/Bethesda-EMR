const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { badDateRange } = require('../utils/validate');

router.use(authMiddleware);
// The sidebar only shows the Statistics tile to accounts holding 'stats', but the
// routes themselves were open to any logged-in user — so reception or the
// pharmacy could read the clinic's takings and the full debtor list, names and
// phone numbers included, straight from the API.
router.use(permMiddleware('stats'));

// What a bill still owes, and what the clinic owes back on it — the same two
// expressions as the payment screen's patient balance (billing.routes.js,
// /patient/:id/balance), so both screens name the same people and amounts.
// Owed comes from the `outstanding` column, not total_due - net_paid: when an
// old debt is carried into a newer bill (migration 016) the old bill's
// outstanding drops to 0 but its total_due - net_paid does not, so the latter
// kept listing debts that had already been paid on the newer bill.
const OWED_SQL = 'GREATEST(outstanding, 0)';
const REFUND_SQL = 'GREATEST(net_paid - total_due, 0)';

// Dates leave as 'YYYY-MM-DD' text, never as a DATE column. node-pg turns a
// DATE into a Date at local midnight, which JSON writes out in UTC — so at
// UTC+3 every date reached the screen as the day before ('…-28T21:00:00Z').
function ymd(expr) { return `to_char(${expr}, 'YYYY-MM-DD')`; }

// Department columns for the breakdowns. All three names go to the screen,
// which picks the viewer's language; a visit with no department has code NULL.
const DEPT_COLS = 'd.code AS code, d.name AS name, d.name_en AS name_en, d.name_fr AS name_fr';

// A balance-settlement receipt (payment M2): issued when an old debt is paid
// later, dated the day the money came in. It charges nothing itself and only
// carries the debt, so it is recognised by that shape — no charges, a previous
// balance — rather than by its note, which is free text. Ordinary carry-over
// receipts always have charges of their own, so no receipt from before M2
// matches. Settlements are money received, not treatments: they count in
// Encaissé but not in the receipt count or the average (decision 14).
function settlementSql(a) {
  const p = a ? a + '.' : '';
  return `(${p}consult_fee + ${p}drug_total + ${p}procedure_total = 0 AND ${p}previous_balance > 0)`;
}

// Which visit a receipt's money belongs to (decision 9, 2026-09-29).
//
// A receipt can carry older debts (carry-over, migration 016; settlements,
// payment M2): the older bills point at it through carried_into_id. Grouped by
// the receipt's own visit, the cash paid on an old debt landed on whichever
// visit happened to collect it — a doctor was credited for treatment someone
// else gave. The office manager chose to give it back to the visit that
// created the debt, with a partial payment settling the oldest debt first (the
// same order carry-over absorbs debts in). Dates do not move: the money still
// counts on the day of the receipt that took it (decision 8).
//
// Each bill's total_due is broken into pieces, oldest first: what it carried
// from each older bill (that bill's unpaid remainder, itself broken the same
// way), then its own charges. Its net_paid pays the pieces in that order. A
// cancelled bill carries nothing: a correction may leave replaced bills
// pointing at the new one, but the new bill's previous_balance already
// excludes them.
async function paidByVisit(bills) {
  const byId = new Map();
  bills.forEach(function (b) { byId.set(b.id, b); });
  const src = await pool.query(
    `WITH RECURSIVE src AS (
       SELECT c.id, c.visit_id, c.net_paid, c.total_due, c.billing_date, c.carried_into_id
         FROM billing c WHERE c.carried_into_id = ANY($1::int[]) AND c.payment_status <> 'cancelled'
       UNION
       SELECT c.id, c.visit_id, c.net_paid, c.total_due, c.billing_date, c.carried_into_id
         FROM billing c JOIN src ON c.carried_into_id = src.id WHERE c.payment_status <> 'cancelled'
     )
     SELECT * FROM src`,
    [bills.map(function (b) { return b.id; })]
  );
  const carriedFrom = new Map();
  src.rows.forEach(function (c) {
    if (!byId.has(c.id)) byId.set(c.id, c);
    if (!carriedFrom.has(c.carried_into_id)) carriedFrom.set(c.carried_into_id, []);
    carriedFrom.get(c.carried_into_id).push(c);
  });
  const n = function (x) { return Number(x) || 0; };
  const piecesMemo = new Map();
  function pieces(id) {                 // [{visit_id, amount}] making up total_due, oldest first
    if (piecesMemo.has(id)) return piecesMemo.get(id);
    const b = byId.get(id);
    const older = (carriedFrom.get(id) || []).slice().sort(function (x, y) {
      return x.billing_date < y.billing_date ? -1 : x.billing_date > y.billing_date ? 1 : x.id - y.id;
    });
    const out = []; let carried = 0;
    older.forEach(function (c) { unpaid(c.id).forEach(function (p) { out.push(p); carried += p.amount; }); });
    const own = n(b.total_due) - carried;
    if (own > 0.005) out.push({ visit_id: b.visit_id, amount: own });
    piecesMemo.set(id, out);
    return out;
  }
  function split(id) {                  // net_paid laid over the pieces: [paid pieces, unpaid pieces]
    const b = byId.get(id); let pay = n(b.net_paid); const paid = [], left = [];
    pieces(id).forEach(function (p) {
      const take = Math.min(pay, p.amount); pay -= take;
      if (take > 0.005) paid.push({ visit_id: p.visit_id, amount: take });
      if (p.amount - take > 0.005) left.push({ visit_id: p.visit_id, amount: p.amount - take });
    });
    // Paid beyond what was due (a refund owed) stays with the receipt's own visit.
    if (pay > 0.005) paid.push({ visit_id: b.visit_id, amount: pay });
    return [paid, left];
  }
  function unpaid(id) { return split(id)[1]; }
  const total = new Map();
  bills.forEach(function (b) {
    split(b.id)[0].forEach(function (p) { total.set(p.visit_id, (total.get(p.visit_id) || 0) + p.amount); });
  });
  return total;
}

// GET /api/stats/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// 운영 현황(내원) + 매출/정산(수납)을 한 번에 반환. 기간 미지정 시 이번 달.
router.get('/summary', async (req, res) => {
  try {
    let { from, to } = req.query;
    const badRange = badDateRange(from, to);
    if (badRange) return res.status(400).json({ error: badRange });
    if (!from || !to) {
      const r = await pool.query(`SELECT ${ymd("date_trunc('month', CURRENT_DATE)")} AS f, ${ymd('CURRENT_DATE')} AS t`);
      from = from || r.rows[0].f;
      to = to || r.rows[0].t;
    }
    const P = [from, to];

    // 1) 내원 요약. A cancelled registration is not a visit: it stays out of the
    //    total, the new/follow-up split, unique patients and the breakdowns
    //    below, and is shown only in its own "cancelled" count.
    const visits = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status<>'cancelled')::int AS total,
         COUNT(*) FILTER (WHERE status<>'cancelled' AND visit_type='newVisit')::int AS new_visits,
         COUNT(*) FILTER (WHERE status<>'cancelled' AND visit_type='followUp')::int AS follow_ups,
         COUNT(*) FILTER (WHERE status<>'cancelled' AND visit_type NOT IN ('newVisit','followUp'))::int AS other_visits,
         COUNT(*) FILTER (WHERE status='completed')::int AS completed,
         COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status IN ('registered','waiting','in_progress'))::int AS active,
         COUNT(DISTINCT patient_id) FILTER (WHERE status<>'cancelled')::int AS unique_patients
       FROM visit WHERE visit_date BETWEEN $1 AND $2`, P);

    // 2) 진료과별. A visit with no department comes back with code NULL and the
    //    screen labels it in the viewer's language.
    const byDept = await pool.query(
      `SELECT ${DEPT_COLS}, COUNT(*)::int AS cnt
       FROM visit v LEFT JOIN department d ON v.department_id=d.id
       WHERE v.visit_date BETWEEN $1 AND $2 AND v.status<>'cancelled'
       GROUP BY d.id ORDER BY cnt DESC`, P);

    // 3) 의사별. LEFT JOIN so visits with no attending doctor form their own
    //    row instead of vanishing; grouped by id so two staff sharing a name
    //    stay two rows.
    const byDoctor = await pool.query(
      `SELECT s.id AS doctor_id, s.name AS name, COUNT(*)::int AS cnt
       FROM visit v LEFT JOIN staff s ON v.doctor_id=s.id
       WHERE v.visit_date BETWEEN $1 AND $2 AND v.status<>'cancelled'
       GROUP BY s.id ORDER BY cnt DESC`, P);

    // 3b) 진료과별·의사별 매출. Money goes to the visit that created the debt it
    //     paid (paidByVisit, decision 9); charges (Facturé) and the receipt count
    //     stay with each receipt's own visit. 과는 접수에서 고른 과, 의사는 담당의 —
    //     한 의사가 여러 과의 진료를 볼 수 있고, 상여·성과는 사람 단위로 보므로
    //     둘을 따로 묶는다. 과·의사 없는 방문은 code/name 이 null 인 한 줄.
    const periodBills = (await pool.query(
      `SELECT b.id, b.visit_id, b.net_paid, b.total_due, b.billing_date,
              b.consult_fee + b.drug_total + b.procedure_total AS gross,
              ${settlementSql('b')} AS is_settlement
         FROM billing b
        WHERE b.billing_date BETWEEN $1 AND $2 AND b.payment_status <> 'cancelled'`, P)).rows;
    const paidVisit = await paidByVisit(periodBills);
    const visitIds = Array.from(new Set(periodBills.map(function (b) { return b.visit_id; }).concat(Array.from(paidVisit.keys()))));
    const visitInfo = new Map();
    (await pool.query(
      `SELECT v.id, d.id AS dept_id, ${DEPT_COLS}, s.id AS doctor_id, s.name AS doctor_name
         FROM visit v LEFT JOIN department d ON v.department_id = d.id LEFT JOIN staff s ON v.doctor_id = s.id
        WHERE v.id = ANY($1::int[])`, [visitIds])).rows.forEach(function (v) { visitInfo.set(v.id, v); });
    function breakdown(keyOf, rowOf) {
      const rows = new Map();
      function row(visitId) {
        const v = visitInfo.get(visitId) || {};
        const k = keyOf(v);
        if (!rows.has(k)) rows.set(k, Object.assign(rowOf(v), { paid: 0, gross: 0, billCount: 0 }));
        return rows.get(k);
      }
      paidVisit.forEach(function (amount, visitId) { row(visitId).paid += amount; });
      periodBills.forEach(function (b) {
        const r = row(b.visit_id);
        r.gross += Number(b.gross) || 0;
        if (!b.is_settlement) r.billCount += 1;
      });
      return Array.from(rows.values()).map(function (r) {
        return Object.assign(r, { paid: Math.round(r.paid), gross: Math.round(r.gross) });
      }).sort(function (x, y) { return y.paid - x.paid; });
    }
    const revenueByDept = breakdown(function (v) { return v.dept_id == null ? 'none' : v.dept_id; },
      function (v) { return { code: v.code || null, name: v.name || null, name_en: v.name_en || null, name_fr: v.name_fr || null }; });
    const revenueByDoctor = breakdown(function (v) { return v.doctor_id == null ? 'none' : v.doctor_id; },
      function (v) { return { doctor_id: v.doctor_id || null, name: v.doctor_name || null }; });

    // 4) 매출 (취소 제외, billing_date 기준)
    const rev = await pool.query(
      `SELECT
         COALESCE(SUM(consult_fee),0)::numeric AS consult,
         COALESCE(SUM(drug_total),0)::numeric AS drug,
         COALESCE(SUM(procedure_total),0)::numeric AS procedure,
         COALESCE(SUM(consult_fee+drug_total+procedure_total),0)::numeric AS gross,
         COALESCE(SUM(net_paid),0)::numeric AS paid,
         COUNT(*) FILTER (WHERE NOT ${settlementSql()})::int AS bill_count,
         COUNT(*) FILTER (WHERE ${settlementSql()})::int AS settlement_count,
         COUNT(DISTINCT visit_id) FILTER (WHERE consult_fee+drug_total+procedure_total > 0)::int AS billed_visits
       FROM billing
       WHERE billing_date BETWEEN $1 AND $2 AND payment_status <> 'cancelled'`, P);

    // 4b) 취소 영수 건수 (취소건은 위 WHERE에서 빠지므로 별도 집계)
    const voided = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM billing
       WHERE payment_status='cancelled' AND COALESCE(cancelled_at::date, billing_date) BETWEEN $1 AND $2`, P);

    // 4c) 서류/행정 수가 매출 (item_type='fee'). The payment screen files these
    //     under procedure_total (everything that is neither consultation nor
    //     drug), so they are taken back out of `procedure` below — otherwise the
    //     same money is drawn twice and the item bars add up to more than billed.
    const issuance = await pool.query(
      `SELECT COALESCE(SUM(bi.total_price),0)::numeric AS amount, COUNT(*)::int AS cnt
       FROM billing_item bi JOIN billing b ON bi.billing_id=b.id
       WHERE b.billing_date BETWEEN $1 AND $2 AND b.payment_status <> 'cancelled' AND bi.item_type='fee'`, P);

    // 5) 미수 / 환불 (실시간 잔액, 기간 무관). 계산식은 OWED_SQL / REFUND_SQL 참고.
    const bal = await pool.query(
      `SELECT COALESCE(SUM(${OWED_SQL}),0)::numeric AS owed,
              COALESCE(SUM(${REFUND_SQL}),0)::numeric AS refund
         FROM billing WHERE payment_status <> 'cancelled'`);

    const r = rev.rows[0];
    const num = function (x) { return Math.round(Number(x) || 0); };
    res.json({
      range: { from: String(from), to: String(to) },
      visits: visits.rows[0],
      byDept: byDept.rows,
      byDoctor: byDoctor.rows,
      revenueByDept: revenueByDept,
      revenueByDoctor: revenueByDoctor,
      revenue: {
        gross: num(r.gross), paid: num(r.paid),
        consult: num(r.consult), drug: num(r.drug), procedure: num(r.procedure - issuance.rows[0].amount),
        issuance: num(issuance.rows[0].amount), issuanceCount: issuance.rows[0].cnt,
        // Receipts for treatment only; balance settlements are counted apart.
        billCount: r.bill_count, settlementCount: r.settlement_count,
        // Average billed per visit (decision 14): Facturé over the visits that
        // were charged something. Unlike cash over receipts, it does not move
        // with unpaid bills, with old debts collected, or with a visit billed on
        // several receipts.
        billedVisits: r.billed_visits,
        avgBilledPerVisit: r.billed_visits > 0 ? num(r.gross / r.billed_visits) : 0,
      },
      voidedCount: voided.rows[0].cnt,
      outstanding: { owed: num(bal.rows[0].owed), refund: num(bal.rows[0].refund) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/monthly?months=6  — 월별 추이(내원/수납)
router.get('/monthly', async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
    // Every month in the window gets a row, zero or not. Built only from the
    // months that had data, a quiet month simply vanished from the chart and
    // the bars either side of it read as consecutive.
    const r = await pool.query(
      `WITH m AS (
         SELECT to_char(g, 'YYYY-MM') AS ym
           FROM generate_series(date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval,
                                date_trunc('month', CURRENT_DATE), interval '1 month') g
       ), v AS (
         SELECT to_char(visit_date, 'YYYY-MM') AS ym, COUNT(*)::int AS visits
           FROM visit WHERE status <> 'cancelled'
            AND visit_date >= date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval
          GROUP BY 1
       ), b AS (
         SELECT to_char(billing_date, 'YYYY-MM') AS ym, SUM(net_paid) AS revenue
           FROM billing WHERE payment_status <> 'cancelled'
            AND billing_date >= date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval
          GROUP BY 1
       )
       SELECT m.ym, COALESCE(v.visits, 0) AS visits, COALESCE(b.revenue, 0)::numeric AS revenue
         FROM m LEFT JOIN v ON v.ym = m.ym LEFT JOIN b ON b.ym = m.ym
        ORDER BY m.ym`, [months - 1]);
    res.json(r.rows.map(function (x) { return { ym: x.ym, visits: x.visits, revenue: Math.round(Number(x.revenue) || 0) }; }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/outstanding — 미수/환불 명단 (환자별: 누가·얼마·언제·연락처)
router.get('/outstanding', async (req, res) => {
  try {
    // Owed and refund are summed separately per patient, not netted against each
    // other, so each list adds up to its card on the summary and matches the
    // payment screen, which also shows the two side by side. per_bill spells out
    // OWED_SQL / REFUND_SQL with the b. qualifier.
    const rows = await pool.query(
      `WITH per_bill AS (
         SELECT b.patient_id, b.billing_date,
                GREATEST(b.outstanding, 0) AS owed,
                GREATEST(b.net_paid - b.total_due, 0) AS refund
           FROM billing b
          WHERE b.payment_status <> 'cancelled'
       ), bal AS (
         SELECT patient_id,
                SUM(owed) AS owed, SUM(refund) AS refund,
                ${ymd('MIN(billing_date) FILTER (WHERE owed > 0)')} AS owed_since,
                ${ymd('MAX(billing_date)')} AS last_date,
                COUNT(*) FILTER (WHERE owed > 0) AS owed_bills,
                COUNT(*) FILTER (WHERE refund > 0) AS refund_bills
           FROM per_bill GROUP BY patient_id
       )
       SELECT p.id, p.chart_no, p.last_name, p.first_name,
              COALESCE(NULLIF(p.mobile,''), p.phone) AS contact, bal.*
         FROM bal JOIN patient p ON p.id = bal.patient_id
        WHERE bal.owed > 0.5 OR bal.refund > 0.5`);
    const owed = [], refund = [];
    rows.rows.forEach(function (r) {
      const base = { patient_id: r.id, chart_no: r.chart_no, name: (r.last_name || '') + ' ' + (r.first_name || ''),
        contact: r.contact || '', last_date: r.last_date };
      const o = Math.round(Number(r.owed) || 0), f = Math.round(Number(r.refund) || 0);
      if (Number(r.owed) > 0.5) owed.push(Object.assign({ amount: o, since: r.owed_since, open_bills: r.owed_bills }, base));
      if (Number(r.refund) > 0.5) refund.push(Object.assign({ amount: f, open_bills: r.refund_bills }, base));
    });
    owed.sort(function (a, b) { return b.amount - a.amount; });
    refund.sort(function (a, b) { return b.amount - a.amount; });
    res.json({
      owed: owed, refund: refund,
      owedTotal: owed.reduce(function (s, x) { return s + x.amount; }, 0),
      refundTotal: refund.reduce(function (s, x) { return s + x.amount; }, 0),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/drug-usage?granularity=day|month|year&from&to&status=all|dispensed&dispense_type=all|internal|external
// 약품 사용량 통계: 처방 데이터를 기간(일/월/년)별·약품별로 집계해 피벗 형태로 반환.
router.get('/drug-usage', async (req, res) => {
  try {
    const gran = ['day', 'month', 'year'].includes(req.query.granularity) ? req.query.granularity : 'month';
    const fmt = gran === 'day' ? 'YYYY-MM-DD' : (gran === 'year' ? 'YYYY' : 'YYYY-MM');

    let { from, to } = req.query;
    const badRange = badDateRange(from, to);
    if (badRange) return res.status(400).json({ error: badRange });
    if (!from || !to) {
      const span = gran === 'day' ? "interval '29 days'" : (gran === 'year' ? "interval '4 years'" : "interval '11 months'");
      const trunc = gran === 'day' ? 'day' : (gran === 'year' ? 'year' : 'month');
      const r = await pool.query(`SELECT ${ymd(`date_trunc('${trunc}', CURRENT_DATE) - ${span}`)} AS f, ${ymd('CURRENT_DATE')} AS t`);
      from = from || r.rows[0].f;
      to = to || r.rows[0].t;
    }

    const conds = ['v.visit_date BETWEEN $1 AND $2'];
    const P = [from, to];
    if (req.query.status === 'dispensed') conds.push("rx.status = 'dispensed'");
    else conds.push("rx.status <> 'cancelled'");
    // A cancelled registration's prescriptions were never used — unless the
    // pharmacy had already handed the drug over, in which case it left the
    // shelf and counts (decision 12). Reception can now cancel only a waiting
    // visit, so this concerns older records.
    conds.push("(v.status <> 'cancelled' OR rx.status = 'dispensed')");
    if (req.query.dispense_type === 'internal' || req.query.dispense_type === 'external') {
      P.push(req.query.dispense_type);
      conds.push(`rx.dispense_type = $${P.length}`);
    }

    const result = await pool.query(
      `SELECT to_char(v.visit_date, '${fmt}') AS period,
              COALESCE(NULLIF(rx.drug_code,''),'-') AS drug_code,
              rx.drug_name,
              COALESCE(d.category,'') AS category,
              SUM(COALESCE(rx.total_qty,0))::numeric AS qty,
              COUNT(*)::int AS rx_count
         FROM prescription rx
         JOIN consultation c ON c.id = rx.consultation_id
         JOIN visit v ON v.id = c.visit_id
         LEFT JOIN drug d ON d.id = rx.drug_id
        WHERE ${conds.join(' AND ')}
        GROUP BY period, rx.drug_code, rx.drug_name, d.category`,
      P
    );

    const periods = Array.from(new Set(result.rows.map(r => r.period))).sort();
    const drugMap = {};
    for (const r of result.rows) {
      const key = r.drug_code + '|' + r.drug_name;
      if (!drugMap[key]) drugMap[key] = { drug_code: r.drug_code, drug_name: r.drug_name, category: r.category, total_qty: 0, total_count: 0, by_period: {} };
      const g = drugMap[key];
      g.by_period[r.period] = (g.by_period[r.period] || 0) + Number(r.qty);
      g.total_qty += Number(r.qty);
      g.total_count += r.rx_count;
    }
    const drugs = Object.keys(drugMap).map(k => drugMap[k]).sort((a, b) => b.total_qty - a.total_qty);
    const periodTotals = {};
    periods.forEach(p => { periodTotals[p] = drugs.reduce((s, d) => s + (d.by_period[p] || 0), 0); });

    res.json({ granularity: gran, from, to, periods, drugs, periodTotals, grandTotal: drugs.reduce((s, d) => s + d.total_qty, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
