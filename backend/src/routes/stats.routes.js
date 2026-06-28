const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/stats/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// 운영 현황(내원) + 매출/정산(수납)을 한 번에 반환. 기간 미지정 시 이번 달.
router.get('/summary', async (req, res) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const r = await pool.query("SELECT date_trunc('month', CURRENT_DATE)::date AS f, CURRENT_DATE AS t");
      from = from || r.rows[0].f;
      to = to || r.rows[0].t;
    }
    const P = [from, to];

    // 1) 내원 요약
    const visits = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE visit_type='newVisit')::int AS new_visits,
         COUNT(*) FILTER (WHERE visit_type='followUp')::int AS follow_ups,
         COUNT(*) FILTER (WHERE visit_type NOT IN ('newVisit','followUp'))::int AS other_visits,
         COUNT(*) FILTER (WHERE status='completed')::int AS completed,
         COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status IN ('registered','waiting','in_progress'))::int AS active,
         COUNT(DISTINCT patient_id)::int AS unique_patients
       FROM visit WHERE visit_date BETWEEN $1 AND $2`, P);

    // 2) 진료과별
    const byDept = await pool.query(
      `SELECT COALESCE(d.code,'-') AS code, COALESCE(d.name,'(미지정)') AS name, COUNT(*)::int AS cnt
       FROM visit v LEFT JOIN department d ON v.department_id=d.id
       WHERE v.visit_date BETWEEN $1 AND $2
       GROUP BY d.code, d.name ORDER BY cnt DESC`, P);

    // 3) 의사별
    const byDoctor = await pool.query(
      `SELECT s.name AS name, COUNT(*)::int AS cnt
       FROM visit v JOIN staff s ON v.doctor_id=s.id
       WHERE v.visit_date BETWEEN $1 AND $2
       GROUP BY s.name ORDER BY cnt DESC`, P);

    // 4) 매출 (취소 제외, billing_date 기준)
    const rev = await pool.query(
      `SELECT
         COALESCE(SUM(consult_fee),0)::numeric AS consult,
         COALESCE(SUM(drug_total),0)::numeric AS drug,
         COALESCE(SUM(procedure_total),0)::numeric AS procedure,
         COALESCE(SUM(consult_fee+drug_total+procedure_total),0)::numeric AS gross,
         COALESCE(SUM(amount_paid),0)::numeric AS paid,
         COUNT(*) FILTER (WHERE payment_status <> 'cancelled')::int AS bill_count,
         COUNT(*) FILTER (WHERE payment_status = 'cancelled')::int AS cancelled_count
       FROM billing
       WHERE billing_date BETWEEN $1 AND $2 AND payment_status <> 'cancelled'`, P);

    // 4b) 취소 영수 건수 (취소건은 위 WHERE에서 빠지므로 별도 집계)
    const voided = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM billing
       WHERE payment_status='cancelled' AND COALESCE(cancelled_at::date, billing_date) BETWEEN $1 AND $2`, P);

    // 4c) 서류/행정 수가 매출 (item_type='fee')
    const issuance = await pool.query(
      `SELECT COALESCE(SUM(bi.total_price),0)::numeric AS amount, COUNT(*)::int AS cnt
       FROM billing_item bi JOIN billing b ON bi.billing_id=b.id
       WHERE b.billing_date BETWEEN $1 AND $2 AND b.payment_status <> 'cancelled' AND bi.item_type='fee'`, P);

    // 5) 미수 / 환불 (실시간 잔액, 기간 무관)
    const bal = await pool.query(
      `SELECT
         COALESCE(SUM(total_due-amount_paid) FILTER (WHERE total_due-amount_paid > 0),0)::numeric AS owed,
         COALESCE(-SUM(total_due-amount_paid) FILTER (WHERE total_due-amount_paid < 0),0)::numeric AS refund
       FROM billing WHERE payment_status <> 'cancelled'`);

    const r = rev.rows[0];
    const num = function (x) { return Math.round(Number(x) || 0); };
    res.json({
      range: { from: String(from), to: String(to) },
      visits: visits.rows[0],
      byDept: byDept.rows,
      byDoctor: byDoctor.rows,
      revenue: {
        gross: num(r.gross), paid: num(r.paid),
        consult: num(r.consult), drug: num(r.drug), procedure: num(r.procedure),
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
       FROM visit WHERE visit_date >= (date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval)
       GROUP BY 1 ORDER BY 1`, [months - 1]);
    const b = await pool.query(
      `SELECT to_char(date_trunc('month', billing_date),'YYYY-MM') AS ym, COALESCE(SUM(amount_paid),0)::numeric AS revenue
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
    const rows = await pool.query(
      `WITH bal AS (
         SELECT p.id, p.chart_no, p.last_name, p.first_name,
                COALESCE(NULLIF(p.mobile,''), p.phone) AS contact,
                SUM(b.total_due - b.amount_paid) AS net,
                MIN(b.billing_date) FILTER (WHERE b.total_due - b.amount_paid > 0) AS owed_since,
                MAX(b.billing_date) AS last_date,
                COUNT(*) FILTER (WHERE (b.total_due - b.amount_paid) <> 0) AS open_bills
         FROM billing b JOIN patient p ON b.patient_id = p.id
         WHERE b.payment_status <> 'cancelled'
         GROUP BY p.id, p.chart_no, p.last_name, p.first_name, p.mobile, p.phone
       )
       SELECT * FROM bal WHERE ABS(net) > 0.5 ORDER BY net DESC`);
    const owed = [], refund = [];
    rows.rows.forEach(function (r) {
      const net = Math.round(Number(r.net) || 0);
      const base = { patient_id: r.id, chart_no: r.chart_no, name: (r.last_name || '') + ' ' + (r.first_name || ''),
        contact: r.contact || '', last_date: r.last_date, open_bills: r.open_bills };
      if (net > 0) owed.push(Object.assign({ amount: net, since: r.owed_since }, base));
      else if (net < 0) refund.push(Object.assign({ amount: -net }, base));
    });
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
    if (!from || !to) {
      const span = gran === 'day' ? "interval '29 days'" : (gran === 'year' ? "interval '4 years'" : "interval '11 months'");
      const trunc = gran === 'day' ? 'day' : (gran === 'year' ? 'year' : 'month');
      const r = await pool.query(`SELECT (date_trunc('${trunc}', CURRENT_DATE) - ${span})::date AS f, CURRENT_DATE AS t`);
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
