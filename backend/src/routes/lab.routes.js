const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Read a result value as a number the way the lab staff type it. They work in
// French, where "1,5" means 1.5 and "12 000" means 12000; parseFloat alone reads
// those as 1 and 12, which files a high creatinine as normal. Only the number is
// read this way -- the value is still stored exactly as typed.
// Same rule as readNumber() in frontend/src/pages/Lab.jsx; change both together.
function readNumber(value) {
  if (value === null || value === undefined) return NaN;
  var s = String(value).trim()
    .replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1'); // 12 000 -> 12000
  if ((s.match(/,/g) || []).length === 1) s = s.replace(/(\d),(\d)/, '$1.$2'); // 1,5 -> 1.5
  return parseFloat(s);
}

// The flag rule. Same code as flagFor() in frontend/src/pages/Lab.jsx, which
// colours the value while it is typed -- change both together.
//
// Text results (decision 12, 2026-09-29): an item with a reference text such as
// "Negative" is flagged 'abnormal' when the result says anything else. Only
// spellings of the same word count as the same -- language variants, never a
// different finding. "Trace" is deliberately not listed: whether it is abnormal
// is left to the doctors, and until they say so it is flagged like any other
// difference. Add their exceptions to SAME_WORDS.
var SAME_WORDS = [
  ['negative', 'neg', 'negatif', '-', '음성'],
];
function normWord(v) {
  // strip accents (Négatif -> negatif), then recompose so Korean (음성) stays whole
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .toLowerCase().replace(/[\s.()]/g, '');
}
function sameText(value, refText) {
  var a = normWord(value), b = normWord(refText);
  if (a === b) return true;
  return SAME_WORDS.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
}
function num(v) { return v === null || v === undefined || v === '' ? NaN : parseFloat(v); }

// 'low' | 'high' | 'normal' | 'abnormal' (text) | '' (cannot tell / nothing to compare)
// A value written as "<5" or ">500" is judged by its number only where the
// answer is certain: ">500" with an upper limit of 400 is high, "<5" with no
// lower limit and an upper limit of 40 is normal; otherwise no flag.
function flagFor(value, lo, hi, refText) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  var L = num(lo), H = num(hi), hasL = !isNaN(L), hasH = !isNaN(H);
  var cmp = String(value).trim().match(/^(<=|>=|≤|≥|<|>)\s*(.*)$/);
  var n = readNumber(cmp ? cmp[2] : value);
  if (!isNaN(n) && (hasL || hasH)) {
    if (!cmp) {
      if (hasL && n < L) return 'low';
      if (hasH && n > H) return 'high';
      return 'normal';
    }
    var op = cmp[1], below = op === '<' || op === '<=' || op === '≤', strict = op === '<' || op === '>';
    if (below) {
      if (hasL && (strict ? n <= L : n < L)) return 'low';
      if (!hasL && hasH && n <= H) return 'normal';
      return '';
    }
    if (hasH && (strict ? n >= H : n > H)) return 'high';
    if (!hasH && hasL && n >= L) return 'normal';
    return '';
  }
  if (refText) return sameText(value, refText) ? 'normal' : 'abnormal';
  return '';
}

// ── Reference ranges by sex and age (decision 4, 2026-09-29; table lab_ref_range) ──
// Same checks as rangeError() in the Settings lab items tab -- change both together.
var AGE_DAYS = { d: 1, m: 30.4375, y: 365.25 };   // only to compare bands written in different units
function dateParts(v) { var s = String(v).slice(0, 10).split('-'); return [+s[0], +s[1], +s[2]]; }
// Completed days / months / years between birth and the test day, by the calendar:
// a child is 1 y on its first birthday, so a band edge falls on the birthday itself.
function ageIn(unit, dob, on) {
  var b = dateParts(dob), o = dateParts(on);
  if (unit === 'd') return Math.round((Date.UTC(o[0], o[1] - 1, o[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 86400000);
  var months = (o[0] - b[0]) * 12 + (o[1] - b[1]) - (o[2] < b[2] ? 1 : 0);
  return unit === 'm' ? months : Math.floor(months / 12);
}
function nullInt(v) { return v === null || v === undefined || v === '' ? null : parseInt(v, 10); }
// Does the row apply to this patient? Unknown sex or birth date never matches a row
// that needs it -- the item's default range is used instead of a guess.
function rangeApplies(r, sex, dob, onDate) {
  if (r.sex && r.sex !== sex) return false;
  var lo = nullInt(r.age_min), hi = nullInt(r.age_max);
  if (lo === null && hi === null) return true;
  if (!dob || !onDate) return false;
  var a = ageIn(r.age_unit || 'y', dob, onDate);
  if (a < 0) return false;
  if (lo !== null && a < lo) return false;
  if (hi !== null && a >= hi) return false;
  return true;
}
function rangeLabel(r) {
  var u = r.age_unit || 'y', lo = nullInt(r.age_min), hi = nullInt(r.age_max), age = '';
  if (lo !== null && hi !== null) age = lo + '–' + hi + u;
  else if (lo !== null) age = '≥' + lo + u;
  else if (hi !== null) age = '<' + hi + u;
  return [r.sex || '', age].filter(Boolean).join(' · ') || '*';
}
// The reference to judge a result by: a matching sex-specific row, else a matching
// both-sexes row, else the item's own range (ref_label null).
function refFor(item, ranges, sex, dob, onDate) {
  var mine = (ranges || []).filter(function (r) { return rangeApplies(r, sex, dob, onDate); });
  var r = mine.filter(function (x) { return x.sex; })[0] || mine.filter(function (x) { return !x.sex; })[0];
  if (!r) return { ref_low: item.ref_low, ref_high: item.ref_high, ref_text: item.ref_text, ref_label: null };
  return { ref_low: r.ref_low, ref_high: r.ref_high, ref_text: r.ref_text, ref_label: rangeLabel(r) };
}
// null if the rows of one item are usable, else an English message naming the item.
// Rows of the same sex (or both-sexes rows) may not overlap in age: with two
// candidates nobody could tell which one a result was judged by.
function rangeError(itemName, ranges) {
  var list = ranges || [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i], lo = nullInt(r.age_min), hi = nullInt(r.age_max);
    if (r.sex && r.sex !== 'M' && r.sex !== 'F') return 'Reference range sex must be M or F: ' + itemName;
    if (r.age_unit && !AGE_DAYS[r.age_unit]) return 'Reference range age unit must be d, m or y: ' + itemName;
    if ((lo !== null && (isNaN(lo) || lo < 0)) || (hi !== null && (isNaN(hi) || hi <= 0))) return 'Reference range age is not valid: ' + itemName;
    if (lo !== null && hi !== null && lo >= hi) return 'Reference range age "from" must be below "to": ' + itemName;
    var L = num(r.ref_low), H = num(r.ref_high);
    if (isNaN(L) && isNaN(H) && !String(r.ref_text || '').trim()) return 'Reference range needs a low, a high or a text: ' + itemName;
    if (!isNaN(L) && !isNaN(H) && L > H) return 'Reference range low is above high: ' + itemName;
  }
  function span(r) {
    var f = AGE_DAYS[r.age_unit || 'y'], lo = nullInt(r.age_min), hi = nullInt(r.age_max);
    return [lo === null ? -Infinity : lo * f, hi === null ? Infinity : hi * f];
  }
  for (var a = 0; a < list.length; a++) {
    for (var b = a + 1; b < list.length; b++) {
      if ((list[a].sex || '') !== (list[b].sex || '')) continue;
      var x = span(list[a]), y = span(list[b]);
      if (x[0] < y[1] - 0.5 && y[0] < x[1] - 0.5) return 'Reference ranges overlap: ' + itemName;   // half a day of slack for d/m/y rounding
    }
  }
  return null;
}
async function rangesFor(db, itemIds) {
  if (!itemIds.length) return {};
  const r = await db.query('SELECT * FROM lab_ref_range WHERE lab_test_item_id = ANY($1::int[]) ORDER BY sort_order, id', [itemIds]);
  const by = {};
  r.rows.forEach(function (x) { (by[x.lab_test_item_id] = by[x.lab_test_item_id] || []).push(x); });
  return by;
}
// sex, birth date and test day of the patient an order belongs to
async function patientForOrder(db, orderItemId) {
  const r = await db.query(
    `SELECT p.gender, p.date_of_birth, v.visit_date
       FROM order_item o JOIN patient p ON p.id = o.patient_id JOIN visit v ON v.id = o.visit_id
      WHERE o.id = $1`, [orderItemId]);
  return r.rows[0] || {};
}

// ── PENDING lab orders (lab) — today's visits with un-resulted lab orders ──
// An order shows up as soon as the doctor places it, not when the consultation
// is completed: the patient usually goes to the lab mid-consultation and comes
// back with the result (director's decision 2026-09-29, decisions.md). The
// screen marks a consultation still open as "in consultation". Only today's
// visits, also by decision -- an earlier day's test is found through patient
// search. A visit cancelled at reception is left out: cancelling is limited to
// queued visits, but a visit can be set back to waiting and then cancelled,
// and older data predates that limit.
router.get('/pending', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.updated_at AS consultation_time, c.status AS consultation_status,
              v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth, p.allergies,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT(
                'order_item_id', o.id, 'order_code', o.order_code, 'order_name', o.order_name,
                'order_code_id', o.order_code_id, 'status', o.status
              ) ORDER BY o.id) AS lab_orders
         FROM consultation c
         JOIN visit v ON v.id = c.visit_id
         JOIN patient p ON p.id = c.patient_id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.consultation_id = c.id AND o.code_type = 'lab'
              AND o.status NOT IN ('completed','cancelled')
        WHERE v.visit_date = CURRENT_DATE AND v.status <> 'cancelled'
        GROUP BY c.id, v.id, p.id, s.name
        ORDER BY MIN(o.created_at) ASC, c.id ASC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── lab orders resulted today (lab) ──
// "Today" here is the day the result was entered, not the visit day: a sample
// from yesterday that is finished today through patient search belongs to
// today's finished work, and the pending list (today's visits only) never
// shows it. For today's visits the two are the same.
router.get('/completed', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.status AS consultation_status, v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code,
                'order_name', o.order_name, 'order_code_id', o.order_code_id, 'status', o.status,
                'result_at', o.result_at) ORDER BY o.id) AS lab_orders
         FROM consultation c
         JOIN visit v ON v.id = c.visit_id
         JOIN patient p ON p.id = c.patient_id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.consultation_id = c.id AND o.code_type = 'lab' AND o.status = 'completed'
              AND o.result_at >= CURRENT_DATE AND o.result_at < CURRENT_DATE + 1
        WHERE v.status <> 'cancelled'
        GROUP BY c.id, v.id, p.id, s.name
        ORDER BY MAX(o.result_at) DESC NULLS LAST`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── lab orders for a specific visit (lab) — used by patient-search for any date ──
router.get('/visit/:visitId/orders', permMiddleware('lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id AS consultation_id, c.status AS consultation_status, v.id AS visit_id, v.visit_date,
              p.id AS patient_id, p.chart_no, p.last_name, p.first_name, p.gender, p.date_of_birth, p.allergies,
              s.name AS doctor_name,
              JSON_AGG(JSON_BUILD_OBJECT('order_item_id', o.id, 'order_code', o.order_code,
                'order_name', o.order_name, 'order_code_id', o.order_code_id, 'status', o.status) ORDER BY o.id) AS lab_orders
         FROM visit v
         JOIN patient p ON p.id = v.patient_id
         LEFT JOIN consultation c ON c.visit_id = v.id
         LEFT JOIN staff s ON s.id = c.doctor_id
         JOIN order_item o ON o.visit_id = v.id AND o.code_type = 'lab' AND o.status <> 'cancelled'
        WHERE v.id = $1
        GROUP BY c.id, v.id, p.id, s.name`,
      [req.params.visitId]
    );
    if (r.rows.length === 0) return res.json(null);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── items + existing results for one lab order (lab) ──
router.get('/order/:orderItemId/items', permMiddleware('lab'), async (req, res) => {
  try {
    const oi = await pool.query('SELECT * FROM order_item WHERE id = $1', [req.params.orderItemId]);
    if (oi.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = oi.rows[0];
    const master = await pool.query(
      'SELECT * FROM lab_test_item WHERE order_code_id = $1 ORDER BY sort_order, id', [order.order_code_id]
    );
    const existing = await pool.query(
      'SELECT * FROM lab_result WHERE order_item_id = $1 ORDER BY sort_order, id', [req.params.orderItemId]
    );
    // Match saved results to the panel's items by item id, and by name for the
    // ones whose link is gone (results saved before the settings tab kept item ids
    // stable, or whose item was removed). A saved result that matches nothing is
    // still listed after the items: every row on this screen is re-saved as the
    // order's full result set, so a row left off here would be deleted.
    const used = new Set();
    function take(pred) {
      const e = existing.rows.find(function (r) { return !used.has(r.id) && pred(r); });
      if (e) used.add(e.id);
      return e;
    }
    function fromSaved(e, i) {
      return { lab_test_item_id: e.lab_test_item_id, name: e.name, unit: e.unit,
               ref_low: e.ref_low, ref_high: e.ref_high, ref_text: e.ref_text, ref_label: e.ref_label || null,
               value: e.value != null ? e.value : '', comment: e.comment || '', flag: e.flag || '', sort_order: i };
    }
    // the reference shown is this patient's (sex, age on the visit day), as saving will use
    const pt = await patientForOrder(pool, req.params.orderItemId);
    const ranges = await rangesFor(pool, master.rows.map(function (m) { return m.id; }));

    var items = master.rows.map(function (m, i) {
      var prev = take(function (r) { return r.lab_test_item_id === m.id; })
              || take(function (r) { return r.name === m.name && !master.rows.some(function (x) { return x.id === r.lab_test_item_id; }); })
              || {};
      var ref = refFor(m, ranges[m.id], pt.gender, pt.date_of_birth, pt.visit_date);
      return {
        lab_test_item_id: m.id, name: m.name, unit: m.unit,
        ref_low: ref.ref_low, ref_high: ref.ref_high, ref_text: ref.ref_text, ref_label: ref.ref_label,
        value: prev.value != null ? prev.value : '', comment: prev.comment || '', flag: prev.flag || '', sort_order: i,
      };
    });
    existing.rows.forEach(function (e) {
      if (!used.has(e.id)) items.push(fromSaved(e, items.length));
    });
    // A panel created in Settings can be ordered before its items are defined.
    // With no row to type into, the lab could never complete that order, so
    // offer one free row named after the test (no reference range, no flag).
    if (items.length === 0) {
      items.push({ lab_test_item_id: null, name: order.order_name, unit: null,
                   ref_low: null, ref_high: null, ref_text: null,
                   value: '', comment: '', flag: '', sort_order: 0 });
    }
    res.json({ order: order, has_master: master.rows.length > 0, items: items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── save results for one lab order (lab) ──
router.post('/order/:orderItemId/results', permMiddleware('lab'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: the consultation room may be cancelling this order right now
    // (POST /api/consultations/order/:id/cancel locks it the same way).
    const oi = await client.query('SELECT * FROM order_item WHERE id = $1 FOR UPDATE', [req.params.orderItemId]);
    if (oi.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    const order = oi.rows[0];
    // Only a lab order belongs on this screen. Accepting any order id would let a
    // consultation fee or an imaging order be flipped to 'completed' from here,
    // which drops it out of the worklist that department is still waiting on.
    if (order.code_type !== 'lab') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is not a lab order' });
    }
    // An order cancelled in the consultation room (decision 3, a wrong order that
    // already had results) keeps its results as a record. Saving into it would set
    // it back to 'completed' and put it back on the bill, so refuse.
    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Order is cancelled' });
    }
    const vis = await client.query('SELECT visit_date FROM visit WHERE id = $1', [order.visit_id]);
    const rdate = (vis.rows[0] && vis.rows[0].visit_date) || null;

    const results = Array.isArray(req.body.results) ? req.body.results : [];
    const filled = results.filter((it) => it && ((it.value != null && String(it.value).trim() !== '') ||
                                                 (it.comment != null && String(it.comment).trim() !== '')));
    // Marking an order completed with nothing recorded takes it off the pending
    // list, so a test that was never resulted looks done to everyone downstream.
    if (filled.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one result value or comment is required' });
    }

    // A row that belongs to one of this panel's items takes its name, unit and
    // reference range from the item as it is now, not from what the screen sent:
    // the screen may have been opened before someone edited the range in
    // Settings, and the saved flag should follow the range in force. Rows with no
    // live item (kept from an earlier save, or the free row of a panel with no
    // items) keep what they came with.
    const master = await client.query('SELECT * FROM lab_test_item WHERE order_code_id = $1', [order.order_code_id]);
    const byId = {};
    master.rows.forEach(function (m) { byId[m.id] = m; });
    // ...and the range is the one for this patient's sex and age on the visit day
    // (decision 4). Birth date or sex unknown -> the item's default range.
    const pt = await patientForOrder(client, req.params.orderItemId);
    const ranges = await rangesFor(client, master.rows.map(function (m) { return m.id; }));

    await client.query('DELETE FROM lab_result WHERE order_item_id = $1', [req.params.orderItemId]);
    for (let i = 0; i < filled.length; i++) {
      const sent = filled[i] || {};
      const m = byId[parseInt(sent.lab_test_item_id, 10)];
      const it = m ? Object.assign({}, sent, { lab_test_item_id: m.id, name: m.name, unit: m.unit },
                                   refFor(m, ranges[m.id], pt.gender, pt.date_of_birth, pt.visit_date))
                   : Object.assign({}, sent, { lab_test_item_id: null, name: sent.name || order.order_name,
                                               ref_label: sent.ref_label || null });
      const flag = flagFor(it.value, it.ref_low, it.ref_high, it.ref_text);
      await client.query(
        `INSERT INTO lab_result
           (order_item_id, lab_test_item_id, visit_id, patient_id, name, value, unit, ref_low, ref_high, ref_text, flag, comment, result_date, result_by, sort_order, ref_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [req.params.orderItemId, it.lab_test_item_id || null, order.visit_id, order.patient_id,
         it.name, it.value != null ? String(it.value) : null, it.unit || null,
         it.ref_low != null && it.ref_low !== '' ? it.ref_low : null,
         it.ref_high != null && it.ref_high !== '' ? it.ref_high : null,
         it.ref_text || null, flag, it.comment || null, rdate, req.user.id, i,
         it.ref_label ? String(it.ref_label).slice(0, 40) : null]
      );
    }
    await client.query(
      `UPDATE order_item SET status = 'completed', result_at = NOW(), result_by = $1 WHERE id = $2`,
      [req.user.id, req.params.orderItemId]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ── all lab results for a patient (doctors view + the lab's own screen) ──
// Only Consultation.jsx and Lab.jsx read this. Left open to every logged-in
// account it also handed a patient's full result history to reception.
router.get('/patient/:patientId/results', permMiddleware('consultation', 'lab'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT lr.*, oc.code AS panel_code, oc.name AS panel_name,
              oi.status AS order_status,
              -- read through jsonb so this works before and after the consultation
              -- session's migration adds order_item.cancel_reason
              to_jsonb(oi)->>'cancel_reason' AS cancel_reason
         FROM lab_result lr
         LEFT JOIN order_item oi ON oi.id = lr.order_item_id
         LEFT JOIN order_code oc ON oc.id = oi.order_code_id
        WHERE lr.patient_id = $1
        ORDER BY lr.result_date DESC NULLS LAST, lr.order_item_id, lr.sort_order`,
      [req.params.patientId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── master: list test items (read) ──
// result_count: how many saved results the entry screen would show under this
// item -- the ones linked by id, plus unlinked ones of the same panel with the
// same name (the entry screen matches those by name). The settings tab uses it
// to warn before an item that already has results changes unit: the old
// numbers would then be shown, and re-flagged on a re-save, as the new unit.
async function listTestItems(db, orderCodeId) {
  const r = await db.query(
    `SELECT i.*,
            ((SELECT COUNT(*) FROM lab_result r WHERE r.lab_test_item_id = i.id)
           + (SELECT COUNT(*) FROM lab_result r JOIN order_item oi ON oi.id = r.order_item_id
               WHERE r.lab_test_item_id IS NULL AND oi.order_code_id = i.order_code_id
                 AND r.name = i.name))::int AS result_count,
            COALESCE((SELECT json_agg(rr ORDER BY rr.sort_order, rr.id) FROM lab_ref_range rr
                       WHERE rr.lab_test_item_id = i.id), '[]'::json) AS ranges
       FROM lab_test_item i
      WHERE ($1::int IS NULL OR i.order_code_id = $1)
      ORDER BY i.order_code_id, i.sort_order, i.id`,
    [orderCodeId || null]);
  return r.rows;
}

// Read only by the lab items tab in Settings. Was open to any signed-in account;
// the server now gives each route the permission of the screen that uses it
// (director's decision S2). 'lab' too, so the lab can read its own templates.
router.get('/test-items', permMiddleware('lab', 'settings'), async (req, res) => {
  try {
    res.json(await listTestItems(pool, req.query.order_code_id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── master: save the item list for a panel (settings) ──
// Items keep their id: rows sent back with an id are updated in place, rows
// without one are added, and only the rows no longer on the list are deleted.
// Deleting and re-inserting everything (as this used to) gave every item a new
// id, which unlinked each result already entered (lab_result.lab_test_item_id
// is ON DELETE SET NULL), so fixing one typo here emptied the entry screen of
// every finished order in that panel.
router.post('/test-items/save', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { order_code_id, items } = req.body;
    if (!order_code_id) return res.status(400).json({ error: 'order_code_id required' });
    const arr = (Array.isArray(items) ? items : []).filter(function (it) { return it && it.name; });
    // every item's sex/age rows are checked before anything is written
    for (let i = 0; i < arr.length; i++) {
      const bad = rangeError(arr[i].name, arr[i].ranges);
      if (bad) return res.status(400).json({ error: bad });
    }
    await client.query('BEGIN');
    const keep = [];
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      const vals = [it.name, it.unit || null,
        it.ref_low != null && it.ref_low !== '' ? it.ref_low : null,
        it.ref_high != null && it.ref_high !== '' ? it.ref_high : null,
        it.ref_text || null, i];
      const id = parseInt(it.id, 10);
      let row = null;
      if (id && keep.indexOf(id) < 0) {
        // order_code_id in the WHERE: an id from another panel is treated as new
        const u = await client.query(
          `UPDATE lab_test_item SET name=$1, unit=$2, ref_low=$3, ref_high=$4, ref_text=$5, sort_order=$6
            WHERE id=$7 AND order_code_id=$8 RETURNING id`,
          vals.concat([id, order_code_id]));
        row = u.rows[0];
      }
      if (!row) {
        const n = await client.query(
          `INSERT INTO lab_test_item (name, unit, ref_low, ref_high, ref_text, sort_order, order_code_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          vals.concat([order_code_id]));
        row = n.rows[0];
      }
      keep.push(row.id);
      // the item keeps its id, so its rows can simply be replaced: nothing refers
      // to a row's id (a saved result keeps a copy of the range and its label)
      await client.query('DELETE FROM lab_ref_range WHERE lab_test_item_id = $1', [row.id]);
      const rs = Array.isArray(it.ranges) ? it.ranges : [];
      for (let j = 0; j < rs.length; j++) {
        const r = rs[j];
        await client.query(
          `INSERT INTO lab_ref_range (lab_test_item_id, sex, age_min, age_max, age_unit, ref_low, ref_high, ref_text, note, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [row.id, r.sex || null, nullInt(r.age_min), nullInt(r.age_max), r.age_unit || 'y',
           r.ref_low != null && r.ref_low !== '' ? r.ref_low : null,
           r.ref_high != null && r.ref_high !== '' ? r.ref_high : null,
           r.ref_text || null, r.note ? String(r.note).slice(0, 200) : null, j]);
      }
    }
    await client.query('DELETE FROM lab_test_item WHERE order_code_id = $1 AND NOT (id = ANY($2::int[]))',
      [order_code_id, keep]);
    await client.query('COMMIT');
    res.json(await listTestItems(pool, order_code_id));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
