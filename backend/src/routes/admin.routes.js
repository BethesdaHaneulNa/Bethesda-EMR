const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware, ALL_PERMS } = require('../middleware/auth');
const { sendDbError } = require('../utils/dbError');
// Messages shown to people - translated by the screen; see settings.messages.js.
const { MSG, fieldMsg } = require('./settings.messages');

// Mirror the CHECK constraints so a bad value is a 400 naming the field rather
// than a 500 carrying the constraint name.
const ROLES = ['frontdesk', 'doctor', 'nurse', 'pharmacy', 'lab', 'admin'];   // nurse: sql/701
const CODE_TYPES = ['fee', 'lab', 'imaging', 'procedure'];

// Every module permission (ALL_PERMS) comes from middleware/auth.js, the backend's
// single copy of frontend/src/modules.js.

// The account the setup wizard creates is the one you log in with to fix everything
// else. Unchecking its settings permission, moving it off the admin role, renaming it
// or deactivating it locks the last door from the inside: nobody can reach Settings to
// undo it, and there is no recovery path short of editing the database by hand. Its
// role, permissions, login id and active status are therefore fixed here rather than
// merely greyed out in the UI, because the UI is not the only way to call this API.
const BOOTSTRAP_ADMIN_LOGIN = 'admin';

// Is there another way in besides this row? Used before demoting any admin, so that
// renaming the bootstrap account does not quietly remove the protection above.
async function otherSettingsAdminExists(excludeId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM staff
      WHERE id <> $1 AND status = 'active' AND role = 'admin' AND 'settings' = ANY(permissions)`,
    [excludeId]
  );
  return r.rows[0].n > 0;
}

// An UPDATE that matches no row returned `res.json(undefined)` — an empty body
// with 200, which the caller reads as "saved". Nothing was saved.
function sentMissing(res, result) {
  if (result.rows.length === 0) { res.status(404).json({ error: MSG.NOT_FOUND }); return true; }
  return false;
}

function badPrices(body, fields) {
  for (const field of fields) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!isFinite(value)) return fieldMsg.notNumber(field);
    if (value < 0) return fieldMsg.negative(field);
  }
  return null;
}

const router = express.Router();
router.use(authMiddleware);

// ── DRUGS ──
router.get('/drugs', async (req, res) => {
  try {
    const { q, category } = req.query;
    let query = 'SELECT * FROM drug WHERE is_active = true';
    const params = [];
    let idx = 1;
    if (category) { query += ` AND category = $${idx}`; params.push(category); idx++; }
    if (q) { query += ` AND (code ILIKE $${idx} OR name ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
    query += ' ORDER BY code';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

router.post('/drugs', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock } = req.body;
    const invalid = badPrices(req.body, ['unit_price', 'stock_qty', 'min_stock']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `INSERT INTO drug (code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// Sent in full (not translated) and compared by the Settings screen, which then shows
// its own se_ text: api/client.js passes the message on but not the status code.
const ERR_STOCK_CHANGED = MSG.STOCK_CHANGED;

function blank(v) { return v === undefined || v === null || v === ''; }

// The edit window used to send back the whole row it loaded, and this wrote its
// stock_qty over whatever the drug held by then. Open a drug in the morning (100),
// dispense 30 over the day (70), fix only its price in the afternoon: stock was back
// to 100, silently (pharmacy H4). Adding the difference instead is no fix, because
// "20 arrived" and "I counted 45" need opposite arithmetic and the server cannot
// tell which was meant. So stock is written only when it was actually edited, and
// only if nobody changed it in the meantime; otherwise the person is asked again.
//
//   no stock_qty sent, or stock_qty == stock_expected  -> stock left as it is now
//   stock edited, current stock still == stock_expected -> the edit is saved
//   stock edited, current stock != stock_expected     -> 409, nothing saved
//   no stock_expected at all (a screen loaded before this change) -> written as sent
//
// The row is locked FOR UPDATE for the check and the write, the same lock dispensing
// takes (pharmacy.routes.js), so a dispense cannot slip in between the two.
router.put('/drugs/:id', permMiddleware('settings'), async (req, res) => {
  const { code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock, stock_expected } = req.body;
  const invalid = badPrices(req.body, ['unit_price', 'stock_qty', 'min_stock']);
  if (invalid) return res.status(400).json({ error: invalid });
  // The column is an integer; 7.5 used to reach the database and come back as an error.
  for (const f of ['stock_qty', 'min_stock']) {
    if (!blank(req.body[f]) && !Number.isInteger(Number(req.body[f]))) return res.status(400).json({ error: fieldMsg.notWhole(f) });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT stock_qty FROM drug WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const now = cur.rows[0].stock_qty;
    const num = v => (blank(v) ? 0 : Number(v));

    let newStock = now;
    const edited = !blank(stock_qty) && (!('stock_expected' in req.body) || num(stock_qty) !== num(stock_expected));
    if (edited) {
      if ('stock_expected' in req.body && num(now) !== num(stock_expected)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: ERR_STOCK_CHANGED, current: now });
      }
      newStock = stock_qty;
    }

    const result = await client.query(
      `UPDATE drug SET code=$1, name=$2, name_en=$3, generic_name=$4, category=$5, default_dose=$6, default_freq=$7,
       default_days=$8, default_route=$9, unit_price=$10, stock_qty=$11, min_stock=$12, updated_at=NOW() WHERE id=$13 RETURNING *`,
      [code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, newStock, min_stock, req.params.id]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    sendDbError(res, err);
  } finally {
    client.release();
  }
});

// The active order sets that still prescribe this drug. An order set keeps its own copy
// of the drug id, so hiding a drug does not take it out of the sets: the set would go on
// prescribing a drug nobody can see or restock. The screen asks this before hiding a
// drug and names the sets in its confirmation; it does not refuse.
router.get('/drugs/:id/order-sets', permMiddleware('settings'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT s.id, s.name FROM order_set s JOIN order_set_item i ON i.set_id = s.id
        WHERE i.drug_id = $1 AND s.is_active = true ORDER BY s.name`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/drugs/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('UPDATE drug SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

// ── ORDER CODES ──
router.get('/order-codes', async (req, res) => {
  try {
    const { q, code_type } = req.query;
    let query = 'SELECT * FROM order_code WHERE is_active = true';
    const params = [];
    let idx = 1;
    if (code_type) { query += ` AND code_type = $${idx}`; params.push(code_type); idx++; }
    if (q) { query += ` AND (code ILIKE $${idx} OR name ILIKE $${idx} OR name_en ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
    query += ' ORDER BY code';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

router.post('/order-codes', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo } = req.body;
    if (!CODE_TYPES.includes(String(code_type))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('code_type', CODE_TYPES) });
    }
    const invalid = badPrices(req.body, ['price', 'price_clinic']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `INSERT INTO order_code (code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/order-codes/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo } = req.body;
    if (!CODE_TYPES.includes(String(code_type))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('code_type', CODE_TYPES) });
    }
    const invalid = badPrices(req.body, ['price', 'price_clinic']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `UPDATE order_code SET code=$1, name=$2, name_en=$3, code_type=$4, group_name=$5, default_dose=$6, default_freq=$7,
       default_days=$8, price=$9, price_clinic=$10, pacs_modality=$11, worklist_enabled=$12, station_ae=$13, body_part=$14, memo=$15, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo, req.params.id]
    );
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/order-codes/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('UPDATE order_code SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

// ── STAFF ──
// Doctors list for registration/reception screens.
// Front-desk users need this to assign a patient to a doctor, but they should
// not receive the full staff management list.
// S2 (decided 2026-09-29): the list carries doctors' phone numbers and e-mail, so only
// the screens that assign or see a doctor get it - reception (registration) and
// consultation. Every other reference list below stays open to any signed-in user.
router.get('/doctors', permMiddleware('registration', 'consultation'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.login_id, s.name, s.role, s.department_id, s.phone, s.email, s.status,
              d.code as dept_code, d.name as dept_name
         FROM staff s
         LEFT JOIN department d ON s.department_id = d.id
        WHERE s.role = 'doctor' AND s.status = 'active'
        ORDER BY s.name`
    );
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

router.get('/staff', permMiddleware('settings'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, d.code as dept_code, d.name as dept_name FROM staff s LEFT JOIN department d ON s.department_id = d.id ORDER BY s.name`
    );
    res.json(result.rows.map(r => { delete r.password_hash; return r; }));
  } catch (err) { sendDbError(res, err); }
});

router.post('/staff', permMiddleware('settings'), async (req, res) => {
  try {
    const { login_id, password, name, role, permissions, department_id, phone, email, status } = req.body;
    if (!String(login_id || '').trim()) return res.status(400).json({ error: MSG.LOGIN_ID_REQUIRED });
    if (!String(password || '')) return res.status(400).json({ error: MSG.PASSWORD_REQUIRED });
    if (!ROLES.includes(String(role))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('role', ROLES) });
    }
    const result = await pool.query(
      `INSERT INTO staff (login_id, password_hash, name, role, permissions, department_id, phone, email, status)
       VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, $7, $8, $9) RETURNING id, login_id, name, role, permissions, department_id, phone, email, status`,
      [login_id, password, name, role, Array.isArray(permissions) ? permissions : [], department_id, phone, email, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/staff/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const { login_id, password, name, role, permissions, department_id, phone, email, status } = req.body;
    if (!ROLES.includes(String(role))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('role', ROLES) });
    }
    let perms = Array.isArray(permissions) ? permissions : [];

    const cur = await pool.query('SELECT id, login_id FROM staff WHERE id = $1', [req.params.id]);
    if (sentMissing(res, cur)) return;

    let effLogin = login_id, effRole = String(role), effStatus = status;
    if (cur.rows[0].login_id === BOOTSTRAP_ADMIN_LOGIN) {
      // Fixed, not merely discouraged - see BOOTSTRAP_ADMIN_LOGIN. Name, password,
      // phone, email and department stay editable; the way back in does not.
      effLogin = cur.rows[0].login_id;
      effRole = 'admin';
      effStatus = 'active';
      perms = ALL_PERMS.slice();
    } else if (effRole !== 'admin' || perms.indexOf('settings') < 0 || String(status) === 'inactive') {
      // Not the bootstrap account, but it can still be the only one left holding the
      // key - the account may simply have been renamed.
      if (!(await otherSettingsAdminExists(req.params.id))) {
        return res.status(400).json({
          error: MSG.LAST_ADMIN,
        });
      }
    }

    let query, params;
    if (password) {
      query = `UPDATE staff SET login_id=$1, password_hash=crypt($2, gen_salt('bf')), name=$3, role=$4, permissions=$5, department_id=$6, phone=$7, email=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING id, login_id, name, role, permissions, department_id, phone, status`;
      params = [effLogin, password, name, effRole, perms, department_id, phone, email, effStatus, req.params.id];
    } else {
      query = `UPDATE staff SET login_id=$1, name=$2, role=$3, permissions=$4, department_id=$5, phone=$6, email=$7, status=$8, updated_at=NOW() WHERE id=$9 RETURNING id, login_id, name, role, permissions, department_id, phone, status`;
      params = [effLogin, name, effRole, perms, department_id, phone, email, effStatus, req.params.id];
    }
    const result = await pool.query(query, params);
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/staff/:id', permMiddleware('settings'), async (req, res) => {
  try {
    // Deactivating is the other way to lock everyone out, so it is gated the same way
    // as the role and permission edits above.
    const cur = await pool.query('SELECT id, login_id, role, permissions FROM staff WHERE id = $1', [req.params.id]);
    if (sentMissing(res, cur)) return;
    if (cur.rows[0].login_id === BOOTSTRAP_ADMIN_LOGIN) {
      return res.status(400).json({ error: MSG.SETUP_ADMIN_KEPT });
    }
    const held = cur.rows[0].role === 'admin' && (cur.rows[0].permissions || []).indexOf('settings') >= 0;
    if (held && !(await otherSettingsAdminExists(req.params.id))) {
      return res.status(400).json({
        error: MSG.LAST_ADMIN,
      });
    }
    await pool.query("UPDATE staff SET status = 'inactive' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

// ── DEPARTMENTS ──
router.get('/departments', async (req, res) => {
  try {
    const result = await pool.query('SELECT d.*, s.name as head_name FROM department d LEFT JOIN staff s ON d.head_doctor_id = s.id WHERE d.is_active = true ORDER BY d.code');
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

router.post('/departments', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, name_fr, head_doctor_id } = req.body;
    const result = await pool.query('INSERT INTO department (code, name, name_en, name_fr, head_doctor_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [code, name, name_en, name_fr, head_doctor_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/departments/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, name_fr, head_doctor_id } = req.body;
    const result = await pool.query('UPDATE department SET code=$1, name=$2, name_en=$3, name_fr=$4, head_doctor_id=$5 WHERE id=$6 RETURNING *', [code, name, name_en, name_fr, head_doctor_id, req.params.id]);
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// ── PHRASES ──
router.get('/phrases', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM phrase_dictionary WHERE is_active = true';
    const params = [];
    if (category) { query += ' AND category = $1'; params.push(category); }
    // id breaks ties: every seeded phrase shares sort_order 0, so without it a phrase
    // jumped to another place in its group - here and in the consultation screen's
    // list - each time it was saved.
    query += ' ORDER BY category, sort_order, id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

router.post('/phrases', permMiddleware('settings'), async (req, res) => {
  try {
    const { category, text, text_en, text_fr } = req.body;
    const result = await pool.query('INSERT INTO phrase_dictionary (category, text, text_en, text_fr, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *', [category, text, text_en, text_fr, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/phrases/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const { category, text, text_en, text_fr } = req.body;
    const result = await pool.query('UPDATE phrase_dictionary SET category=$1, text=$2, text_en=$3, text_fr=$4 WHERE id=$5 RETURNING *', [category, text, text_en, text_fr, req.params.id]);
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/phrases/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('UPDATE phrase_dictionary SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

// ── CLINIC INFO ──
router.get('/clinic', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinic LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) { sendDbError(res, err); }
});

router.put('/clinic', permMiddleware('settings'), async (req, res) => {
  try {
    const { name, name_en, name_fr, address, phone, email, working_hours, app_title } = req.body;
    const result = await pool.query(
      'UPDATE clinic SET name=$1, name_en=$2, name_fr=$3, address=$4, phone=$5, email=$6, working_hours=$7, app_title=COALESCE($8, app_title), updated_at=NOW() WHERE id=1 RETURNING *',
      [name, name_en, name_fr, address, phone, email, working_hours, app_title || null]
    );
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
