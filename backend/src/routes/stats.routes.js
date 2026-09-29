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

    // 3b) 진료과별 매출. billing 은 visit 을 통해 과에 붙는다(billing.visit_id).
    //     기준은 접수에서 고른 과다: 한 의사가 여러 과의 진료를 볼 수 있으므로
    //     "무슨 진료였는지"는 방문에 붙고, 의사 본인의 소속과와는 다를 수 있다.
    const revByDept = await pool.query(
      `SELECT ${DEPT_COLS},
              COALESCE(SUM(b.net_paid),0)::numeric AS paid,
              COALESCE(SUM(b.consult_fee+b.drug_total+b.procedure_total),0)::numeric AS gross,
              COUNT(*)::int AS bill_count
         FROM billing b
         JOIN visit v ON b.visit_id = v.id
         LEFT JOIN department d ON v.department_id = d.id
        WHERE b.billing_date BETWEEN $1 AND $2 AND b.payment_status <> 'cancelled'
        GROUP BY d.id ORDER BY paid DESC`, P);

    // 3c) 의사별 매출. 과별과 따로 뽑는다 — 상여·성과 산정은 사람 단위로 봐야 하고,
    //     접수에서 고른 과로 묶으면 그 사람의 실적이 여러 과에 흩어진다.
    //     LEFT JOIN: bills for visits with no attending doctor form an
    //     "unassigned" row, so the rows add up to the clinic's takings.
    const revByDoctor = await pool.query(
      `SELECT s.id AS doctor_id, s.name AS name,
              COALESCE(SUM(b.net_paid),0)::numeric AS paid,
              COALESCE(SUM(b.consult_fee+b.drug_total+b.procedure_total),0)::numeric AS gross,
              COUNT(*)::int AS bill_count
         FROM billing b
         JOIN visit v ON b.visit_id = v.id
         LEFT JOIN staff s ON v.doctor_id = s.id
        WHERE b.billing_date BETWEEN $1 AND $2 AND b.payment_status <> 'cancelled'
        GROUP BY s.id ORDER BY paid DESC`, P);

    // 4) 매출 (취소 제외, billing_date 기준)
    const rev = await pool.query(
      `SELECT
         COALESCE(SUM(consult_fee),0)::numeric AS consult,
         COALESCE(SUM(drug_total),0)::numeric AS drug,
         COALESCE(SUM(procedure_total),0)::numeric AS procedure,
         COALESCE(SUM(consult_fee+drug_total+procedure_total),0)::numeric AS gross,
         COALESCE(SUM(net_paid),0)::numeric AS paid,
         COUNT(*) FILTER (WHERE payment_status <> 'cancelled')::int AS bill_count,
         COUNT(*) FILTER (WHERE payment_status = 'cancelled')::int AS cancelled_count
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
      // numeric comes back from pg as a string; round it here so the client can render
      // it straight into a bar without doing arithmetic on text.
      revenueByDept: revByDept.rows.map(function (x) {
        return { code: x.code, name: x.name, name_en: x.name_en, name_fr: x.name_fr,
          paid: num(x.paid), gross: num(x.gross), billCount: x.bill_count };
      }),
      revenueByDoctor: revByDoctor.rows.map(function (x) {
        return { doctor_id: x.doctor_id, name: x.name, paid: num(x.paid), gross: num(x.gross), billCount: x.bill_count };
      }),
      revenue: {
        gross: num(r.gross), paid: num(r.paid),
        consult: num(r.consult), drug: num(r.drug), procedure: num(r.procedure - issuance.rows[0].amount),
        issuance: num(issuance.rows[0].amount), issuanceCount: issuance.rows[0].cnt,
        billCount: r.bill_count, avg: r.bill_count > 0 ? num(r.paid / r.bill_count) : 0,
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
    const v = await pool.query(
      `SELECT to_char(date_trunc('month', visit_date),'YYYY-MM') AS ym, COUNT(*)::int AS visits
       FROM visit WHERE status <> 'cancelled'
         AND visit_date >= (date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval)
       GROUP BY 1 ORDER BY 1`, [months - 1]);
    const b = await pool.query(
      `SELECT to_char(date_trunc('month', billing_date),'YYYY-MM') AS ym, COALESCE(SUM(net_paid),0)::numeric AS revenue
       FROM billing WHERE payment_status <> 'cancelled'
         AND billing_date >= (date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval)
       GROUP BY 1 ORDER BY 1`, [months - 1]);
    const map = {};
    v.rows.forEach(function (x) { map[x.ym] = { ym: x.ym, visits: x.visits, revenue: 0 }; });
    b.rows.forEach(function (x) { map[x.ym] = Object.assign(map[x.ym] || { ym: x.ym, visits: 0 }, { revenue: Math.round(Number(x.revenue) || 0) }); });
    res.json(Object.values(map).sort(function (a, c) { return a.ym < c.ym ? -1 : 1; }));
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
