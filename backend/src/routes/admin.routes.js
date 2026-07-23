const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { sendDbError } = require('../utils/dbError');

// Mirror the CHECK constraints so a bad value is a 400 naming the field rather
// than a 500 carrying the constraint name.
const ROLES = ['frontdesk', 'doctor', 'pharmacy', 'lab', 'admin'];
const CODE_TYPES = ['fee', 'lab', 'imaging', 'procedure'];

// An UPDATE that matches no row returned `res.json(undefined)` — an empty body
// with 200, which the caller reads as "saved". Nothing was saved.
function sentMissing(res, result) {
  if (result.rows.length === 0) { res.status(404).json({ error: 'Not found' }); return true; }
  return false;
}

function badPrices(body, fields) {
  for (const field of fields) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!isFinite(value)) return field + ' must be a number';
    if (value < 0) return field + ' must not be negative';
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

router.put('/drugs/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const { code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock } = req.body;
    const invalid = badPrices(req.body, ['unit_price', 'stock_qty', 'min_stock']);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await pool.query(
      `UPDATE drug SET code=$1, name=$2, name_en=$3, generic_name=$4, category=$5, default_dose=$6, default_freq=$7,
       default_days=$8, default_route=$9, unit_price=$10, stock_qty=$11, min_stock=$12, updated_at=NOW() WHERE id=$13 RETURNING *`,
      [code, name, name_en, generic_name, category, default_dose, default_freq, default_days, default_route, unit_price, stock_qty, min_stock, req.params.id]
    );
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
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
      return res.status(400).json({ error: 'code_type must be one of ' + CODE_TYPES.join(', ') });
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
      return res.status(400).json({ error: 'code_type must be one of ' + CODE_TYPES.join(', ') });
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
router.get('/doctors', async (req, res) => {
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
    if (!String(login_id || '').trim()) return res.status(400).json({ error: 'login_id is required' });
    if (!String(password || '')) return res.status(400).json({ error: 'password is required' });
    if (!ROLES.includes(String(role))) {
      return res.status(400).json({ error: 'role must be one of ' + ROLES.join(', ') });
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
      return res.status(400).json({ error: 'role must be one of ' + ROLES.join(', ') });
    }
    const perms = Array.isArray(permissions) ? permissions : [];
    let query, params;
    if (password) {
      query = `UPDATE staff SET login_id=$1, password_hash=crypt($2, gen_salt('bf')), name=$3, role=$4, permissions=$5, department_id=$6, phone=$7, email=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING id, login_id, name, role, permissions, department_id, phone, status`;
      params = [login_id, password, name, role, perms, department_id, phone, email, status, req.params.id];
    } else {
      query = `UPDATE staff SET login_id=$1, name=$2, role=$3, permissions=$4, department_id=$5, phone=$6, email=$7, status=$8, updated_at=NOW() WHERE id=$9 RETURNING id, login_id, name, role, permissions, department_id, phone, status`;
      params = [login_id, name, role, perms, department_id, phone, email, status, req.params.id];
    }
    const result = await pool.query(query, params);
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/staff/:id', permMiddleware('settings'), async (req, res) => {
  try {
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
    query += ' ORDER BY category, sort_order';
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
