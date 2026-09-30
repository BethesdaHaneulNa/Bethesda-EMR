const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware, effectivePerms } = require('../middleware/auth');
const { VISIT_TYPES, VISIT_STATUSES } = require('../utils/validate');
const { sendDbError } = require('../utils/dbError');

const router = express.Router();
router.use(authMiddleware);

// Who may call what (decided 2026-09-29, S2), from the screens that call each route:
// /today - reception and consultation's queues; /patient/:id - PatientFinder in
// visit mode (consultation, lab, payment; pharmacy uses it in patient mode, which
// never lists visits) and reception, which reads the past visits to suggest first
// visit or follow-up (Registration.jsx suggestedVisitType). Registering, cancelling and editing a visit are
// reception's; payment may also PUT /:id, but only to change visit_type (below).

// One queue row: the visit, who the patient is, department and doctor.
const QUEUE_SELECT = `SELECT v.*, p.chart_no, p.last_name, p.first_name, p.date_of_birth, p.gender, p.blood_type, p.allergies, p.reception_note, p.phone as patient_phone,
                 d.code as dept_code, d.name as dept_name, s.name as doctor_name,
                 -- Reception locks the fee-type buttons once a bill exists: changing
                 -- visit_type then would put the visit back on the payment list as an
                 -- extra charge or a refund. Payment itself changes it there instead.
                 EXISTS (SELECT 1 FROM billing b WHERE b.visit_id = v.id AND b.payment_status <> 'cancelled') AS has_active_bill
                 FROM visit v
                 JOIN patient p ON v.patient_id = p.id
                 LEFT JOIN department d ON v.department_id = d.id
                 LEFT JOIN staff s ON v.doctor_id = s.id`;

// GET /api/visits/day?date=YYYY-MM-DD - reception's queue for its work date
// (decided 2026-09-29, ⑩: the screen has a work date, like the clinic's own system,
// so visits left waiting or in progress on an earlier day can be found and put in
// order). No date means the database's today - CURRENT_DATE, the same "today" that
// visit_date defaults to - and the answer always says which day it is and what today
// is, so the screen never has to trust the PC's clock to know when midnight passed.
// Answer: { date, today, visits: [rows like /today] }.
router.get('/day', permMiddleware('registration'), async (req, res) => {
  try {
    const asked = req.query.date;
    if (asked !== undefined && asked !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(asked))) {
      return res.status(400).json({ error: 'date must be a date in YYYY-MM-DD form' });
    }
    const today = (await pool.query('SELECT CURRENT_DATE AS d')).rows[0].d;
    const day = asked || today;
    const result = await pool.query(
      QUEUE_SELECT + ' WHERE v.visit_date = $1 ORDER BY v.reception_time ASC, v.created_at ASC', [day]);
    res.json({ date: day, today: today, visits: result.rows });
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/visits/today - today's queue (consultation's queue; reception uses /day)
router.get('/today', permMiddleware('registration', 'consultation'), async (req, res) => {
  try {
    const { status, doctor_id, department_id } = req.query;
    let query = QUEUE_SELECT + ' WHERE v.visit_date = CURRENT_DATE';
    const params = [];
    let idx = 1;
    if (status) { query += ` AND v.status = $${idx}`; params.push(status); idx++; }
    if (doctor_id) { query += ` AND v.doctor_id = $${idx}`; params.push(doctor_id); idx++; }
    if (department_id) { query += ` AND v.department_id = $${idx}`; params.push(department_id); idx++; }
    query += ' ORDER BY v.reception_time ASC, v.created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// GET /api/visits/patient/:patientId - 환자의 전체 내원 이력 (외래 내역)
// Each row carries the patient's sex, birth date and allergies (2026-09-30, asked by the
// consultation session): a visit opened from the patient finder then has what the chart
// bar and the allergy warning need without a second GET /patients/:id. Every role that
// may call this route may already read those through GET /patients/:id.
router.get('/patient/:patientId', permMiddleware('registration', 'consultation', 'lab', 'payment'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.patient_id, v.visit_date, v.reception_time, v.visit_type, v.status,
              v.department_id, v.doctor_id, v.chief_complaint,
              p.chart_no, p.last_name, p.first_name,
              p.gender, p.date_of_birth, p.allergies,
              d.code as dept_code, d.name as dept_name, s.name as doctor_name,
              b.id as billing_id, b.payment_status as bill_status, b.receipt_no, b.total_due
         FROM visit v
         JOIN patient p ON v.patient_id = p.id
         LEFT JOIN department d ON v.department_id = d.id
         LEFT JOIN staff s ON v.doctor_id = s.id
         LEFT JOIN LATERAL (
            SELECT id, payment_status, receipt_no, total_due
              FROM billing WHERE visit_id = v.id
              ORDER BY (payment_status <> 'cancelled') DESC, created_at DESC LIMIT 1
         ) b ON true
        WHERE v.patient_id = $1
        ORDER BY v.visit_date DESC, v.reception_time DESC`,
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    sendDbError(res, err);
  }
});

// POST /api/visits - register new visit
router.post('/', permMiddleware('registration'), async (req, res) => {
  try {
    const { patient_id, visit_type, department_id, doctor_id, chief_complaint, reception_memo } = req.body;
    // visit_type selects the consultation fee (newVisit -> C01, followUp -> C02 ...),
    // and the billing query falls back to the new-visit price for anything it does
    // not recognise, so an unknown value quietly overcharges the patient.
    if (!VISIT_TYPES.includes(String(visit_type))) {
      return res.status(400).json({ error: 'visit_type must be one of ' + VISIT_TYPES.join(', ') });
    }
    // The same patient already registered today (decided 2026-09-29, reception ④:
    // warn, do not block - a patient can come back the same day for something else).
    // The screen asks first from its own queue; this catches a second desk whose
    // queue is older. Once staff have confirmed, the screen sends allow_duplicate.
    if (req.body.allow_duplicate !== true) {
      const dup = await pool.query(
        `SELECT 1 FROM visit WHERE patient_id = $1 AND visit_date = CURRENT_DATE AND status <> 'cancelled' LIMIT 1`,
        [patient_id]
      );
      if (dup.rows.length) return res.status(409).json({ error: 'Patient already registered today' });
    }
    const now = new Date();
    const reception_time = now.toTimeString().split(' ')[0].substring(0,5);
    const result = await pool.query(
      `INSERT INTO visit (patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, status, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'waiting',$8) RETURNING *`,
      [patient_id, visit_type, department_id, doctor_id, reception_time, chief_complaint, reception_memo, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// PUT /api/visits/:id/status - update visit status
router.put('/:id/status', permMiddleware('registration'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!VISIT_STATUSES.includes(String(status))) {
      return res.status(400).json({ error: 'status must be one of ' + VISIT_STATUSES.join(', ') });
    }
    // Cancelling is only for a patient still in the queue. Reception's list does
    // not refresh by itself, so the button can be pressed on a visit the doctor
    // has since opened; cancelling that would orphan its consultation, orders and
    // bill under a visit every other screen ignores.
    //
    // Sending a visit that is still waiting straight to "completed" means no
    // consultation happened (the "Terminer →" button on the queue). The office manager
    // decided (2026-09-29, ⑳) that such a visit carries no consultation fee, so its
    // visit_type becomes 'none' in the same UPDATE - unless it has already been
    // billed, where changing the type would put it back on the payment list.
    // "in progress → completed" keeps its type: the doctor did see the patient.
    // In SET, "status" is still the old value.
    const result = await pool.query(
      `UPDATE visit SET status = $1::varchar,
              visit_type = CASE
                WHEN $1::varchar = 'completed' AND status IN ('registered', 'waiting')
                     AND NOT EXISTS (SELECT 1 FROM billing b WHERE b.visit_id = visit.id AND b.payment_status <> 'cancelled')
                THEN 'none' ELSE visit_type END,
              updated_at = NOW()
        WHERE id = $2 AND ($1::varchar <> 'cancelled' OR status IN ('registered', 'waiting'))
        RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      const found = await pool.query('SELECT status FROM visit WHERE id = $1', [req.params.id]);
      if (found.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
      return res.status(409).json({ error: 'Only a waiting visit can be cancelled', status: found.rows[0].status });
    }
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

// PUT /api/visits/:id
// Only the fields present in the body are written. Reception sends what its form
// shows; payment sends visit_type alone. department_id/doctor_id sent as null (or
// '') clear the assignment - with the old COALESCE a doctor could never be removed.
// visit_type and status are NOT NULL in practice, so null there means "unchanged".
const VISIT_FIELDS = ['visit_type', 'department_id', 'doctor_id', 'chief_complaint', 'reception_memo', 'status'];
router.put('/:id', permMiddleware('registration', 'payment'), async (req, res) => {
  try {
    const body = req.body || {};
    // Payment sets the consultation fee type at the till (Payment.jsx) and nothing
    // else. An account with payment but not registration is refused - not quietly
    // trimmed - if it sends any other field, so a wrong call is seen, not half-done.
    if (effectivePerms(req.user).indexOf('registration') < 0) {
      const others = VISIT_FIELDS.filter(function (f) {
        return f !== 'visit_type' && Object.prototype.hasOwnProperty.call(body, f);
      });
      if (others.length) {
        return res.status(403).json({ error: 'Access denied', detail: 'payment may change visit_type only, not ' + others.join(', ') });
      }
    }
    // Same checks as POST: visit_type picks the consultation fee, and billing
    // falls back to the new-visit price for anything it does not recognise.
    if (body.visit_type != null && !VISIT_TYPES.includes(String(body.visit_type))) {
      return res.status(400).json({ error: 'visit_type must be one of ' + VISIT_TYPES.join(', ') });
    }
    if (body.status != null && !VISIT_STATUSES.includes(String(body.status))) {
      return res.status(400).json({ error: 'status must be one of ' + VISIT_STATUSES.join(', ') });
    }
    const sets = [];
    const params = [];
    for (const field of VISIT_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      let value = body[field];
      if ((field === 'visit_type' || field === 'status') && value == null) continue;
      if ((field === 'department_id' || field === 'doctor_id') && value === '') value = null;
      params.push(value);
      sets.push(field + '=$' + params.length);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE visit SET ${sets.concat('updated_at=NOW()').join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    sendDbError(res, err);
  }
});

module.exports = router;
