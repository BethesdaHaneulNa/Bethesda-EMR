const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware, ALL_PERMS } = require('../middleware/auth');
const { sendDbError } = require('../utils/dbError');
// Messages shown to people - translated by the screen; see settings.messages.js.
const { MSG, fieldMsg } = require('./settings.messages');
const { writeAudit, ACTIONS } = require('../utils/audit');

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
//
// S9 (2026-09-29): run inside the change's transaction, after lockAdmins(). Two admins
// demoting each other at the same moment each saw the other still in place and both
// went through; the lock makes the second wait until the first has committed.
async function lockAdmins(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('bethesda.staff.admins'))");
}
async function otherSettingsAdminExists(excludeId, db) {
  const r = await (db || pool).query(
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

// Stock is not set here. It moves only through the pharmacy's stock record
// (/api/pharmacy/stock/:id/receive|count|discard), where every change is a line in
// stock_movement; the Settings form shows it read-only (pharmacy, 2026-09-29). A
// stock_qty in the request is ignored rather than refused, so a Settings screen
// loaded before this change and still open can save a drug's name or price without
// an error - its stock value simply does not count. A new drug starts at 0.
//
// This replaces the H4 safeguard (stock_expected + 409), which only existed because
// this form used to write stock.
function wholeOrBlank(v) { return v === undefined || v === null || v === '' || Number.isInteger(Number(v)); }

// Pack-unit drug (025_pharmacy_pack_unit.sql, pharmacy H2-B): handed out by the bottle or
// tube. pack_label mirrors drug_pack_label_check. Returns {error} or {unit, label}:
//  - pack_unit missing -> unit null, which PUT reads as "leave both as they are" (a
//    screen or script that does not know these fields must not clear them) and POST
//    reads as false.
//  - pack_unit false -> label stored as NULL, whatever was sent.
//  - pack_unit true with no label -> 'bottle' (syrups are most of these drugs, and the
//    Settings form shows 'bottle' preselected, so this is what the person already saw).
const PACK_LABELS = ['bottle', 'tube', 'inhaler', 'unit'];
function packFields(body) {
  let unit = body.pack_unit;
  if (unit === undefined || unit === null || unit === '') return { unit: null, label: null };
  if (unit === 'true') unit = true;
  if (unit === 'false') unit = false;
  if (typeof unit !== 'boolean') return { error: fieldMsg.notOneOf('pack_unit', ['true', 'false']) };
  if (!unit) return { unit: false, label: null };
  const label = body.pack_label;
  if (label === undefined || label === null || label === '') return { unit: true, label: 'bottle' };
  if (!PACK_LABELS.includes(label)) return { error: fieldMsg.notOneOf('pack_label', PACK_LABELS) };
  return { unit: true, label };
}

// The drug columns Settings may write, and only those sent (2026-09-29, decision B: the
// default dose / times a day / days / route leave the drug form, so a save without them
// must not wipe them - before, a PUT wrote every column and a missing one became NULL).
// dosage_form (the form - tablet, syrup... - added by the pharmacy's drug import) is
// written only if this database has that column yet, so this code works before and
// after that migration. stock_qty is never among them (3-8), nor pack_* (packFields).
const DRUG_FIELDS = ['code', 'name', 'name_en', 'generic_name', 'category', 'dosage_form',
  'default_dose', 'default_freq', 'default_days', 'default_route', 'unit_price', 'min_stock'];
let drugColumns = null;   // the drug table's columns, read once
async function drugFieldsHere() {
  if (!drugColumns) {
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'drug'");
    drugColumns = r.rows.map(x => x.column_name);
  }
  return DRUG_FIELDS.filter(f => drugColumns.indexOf(f) >= 0);
}
// The fields present in the request: an empty string is stored as NULL (an emptied
// field). For code and name, which are NOT NULL, that makes the database refuse it
// (400 "A required field is missing", utils/dbError.js) instead of storing "".
function sentDrugFields(body, allowed) {
  const out = {};
  allowed.forEach(f => {
    if (!Object.prototype.hasOwnProperty.call(body, f)) return;
    let v = body[f];
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;
    out[f] = v;
  });
  return out;
}
function badDrug(body) {
  const invalid = badPrices(body, ['unit_price', 'min_stock']);
  if (invalid) return invalid;
  if (!wholeOrBlank(body.min_stock)) return fieldMsg.notWhole('min_stock');
  return null;
}

router.post('/drugs', permMiddleware('settings'), async (req, res) => {
  try {
    const bad = badDrug(req.body);
    if (bad) return res.status(400).json({ error: bad });
    const pack = packFields(req.body);
    if (pack.error) return res.status(400).json({ error: pack.error });
    const f = sentDrugFields(req.body, await drugFieldsHere());
    // A field not sent takes the column's default. min_stock: the default (10) also when
    // the form sent it empty. A new drug starts with no stock (3-8).
    if (f.min_stock == null) delete f.min_stock;
    const cols = Object.keys(f);
    const vals = cols.map(c => f[c]);
    cols.push('stock_qty', 'pack_unit', 'pack_label');
    vals.push(0, pack.unit === true, pack.label);
    const result = await pool.query(
      `INSERT INTO drug (${cols.join(', ')}) VALUES (${cols.map((c, n) => '$' + (n + 1)).join(', ')}) RETURNING *`,
      vals
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/drugs/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const bad = badDrug(req.body);
    if (bad) return res.status(400).json({ error: bad });
    const pack = packFields(req.body);
    if (pack.error) return res.status(400).json({ error: pack.error });
    const f = sentDrugFields(req.body, await drugFieldsHere());
    const sets = [], vals = [];
    Object.keys(f).forEach(c => { vals.push(f[c]); sets.push(c + ' = $' + vals.length); });
    // pack_unit not sent: both pack columns stay as they are (packFields).
    if (pack.unit !== null) {
      vals.push(pack.unit); sets.push('pack_unit = $' + vals.length);
      vals.push(pack.label); sets.push('pack_label = $' + vals.length);
    }
    sets.push('updated_at = NOW()');
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE drug SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (sentMissing(res, result)) return;
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
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

// ── Change log for staff accounts (decided 2026-09-29, wiki/03-change-log.md) ──
// Account created, account edited (name, login id, role, status, department, contact),
// permissions changed, password changed. Each is written inside the same transaction
// as the change, so a refused or failed save leaves no line. The password is never in
// a line - only that it was changed, by whom and for whom (utils/audit.js also drops
// any key that looks like a secret).
const STAFF_FIELDS = ['login_id', 'name', 'role', 'status', 'department_id', 'phone', 'email'];
function staffFields(row) {
  const o = {};
  STAFF_FIELDS.forEach(k => { o[k] = row[k] === undefined ? null : row[k]; });
  return o;
}
// Same permissions in another order is not a change.
function permsInOrder(list) {
  return ALL_PERMS.filter(p => (list || []).indexOf(p) >= 0);
}
// S10 (2026-09-29): the login id is stored without surrounding spaces (" lee" and
// "lee" were two accounts, and the first could not log in by typing "lee"), and every
// permission must be one the app knows - an unknown word used to be stored and then
// ignored everywhere, so it looked granted in the database and was not.
function badStaffInput(login_id, permissions) {
  if (!String(login_id || '').trim()) return MSG.LOGIN_ID_REQUIRED;
  if (permissions !== undefined && permissions !== null && !Array.isArray(permissions)) return fieldMsg.notOneOf('permissions', ALL_PERMS);
  const unknown = (permissions || []).filter(p => ALL_PERMS.indexOf(p) < 0);
  if (unknown.length) return fieldMsg.notOneOf('permissions', ALL_PERMS);
  return null;
}

function staffLabel(row) { return row.name ? row.name + ' (' + row.login_id + ')' : row.login_id; }

router.post('/staff', permMiddleware('settings'), async (req, res) => {
  const { password, name, role, permissions, department_id, phone, email, status } = req.body;
  const bad = badStaffInput(req.body.login_id, permissions);
  if (bad) return res.status(400).json({ error: bad });
  const login_id = String(req.body.login_id).trim();
  if (!String(password || '')) return res.status(400).json({ error: MSG.PASSWORD_REQUIRED });
  if (!ROLES.includes(String(role))) {
    return res.status(400).json({ error: fieldMsg.notOneOf('role', ROLES) });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO staff (login_id, password_hash, name, role, permissions, department_id, phone, email, status)
       VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, $7, $8, $9) RETURNING id, login_id, name, role, permissions, department_id, phone, email, status`,
      [login_id, password, name, role, Array.isArray(permissions) ? permissions : [], department_id, phone, email, status || 'active']
    );
    const row = result.rows[0];
    await writeAudit(client, req, {
      action: ACTIONS.STAFF_CREATE, entity: 'staff', entity_id: row.id, summary: staffLabel(row),
      before: null, after: Object.assign(staffFields(row), { permissions: permsInOrder(row.permissions) }),
    });
    await client.query('COMMIT');
    res.status(201).json(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    sendDbError(res, err);
  } finally { client.release(); }
});

router.put('/staff/:id', permMiddleware('settings'), async (req, res) => {
  const { password, name, role, permissions, department_id, phone, email, status } = req.body;
  const bad = badStaffInput(req.body.login_id, permissions);
  if (bad) return res.status(400).json({ error: bad });
  const login_id = String(req.body.login_id).trim();
  if (!ROLES.includes(String(role))) {
    return res.status(400).json({ error: fieldMsg.notOneOf('role', ROLES) });
  }
  let perms = Array.isArray(permissions) ? permissions : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockAdmins(client);
    // The row as it was, locked: the log needs the "before", and two saves of the same
    // account at once should not interleave.
    const cur = await client.query(
      'SELECT id, login_id, name, role, status, department_id, phone, email, permissions FROM staff WHERE id = $1 FOR UPDATE',
      [req.params.id]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const was = cur.rows[0];

    // A request without status keeps the current one. It used to write NULL, which the
    // CHECK lets through, and an account with no status can neither log in nor count as
    // an administrator (wiki 7, S6).
    let effLogin = login_id, effRole = String(role);
    let effStatus = (status === undefined || status === null || status === '') ? was.status : status;
    // Bringing a deactivated account back is for an administrator only (U2) - the same
    // rule as POST /staff/:id/reactivate below, so the edit form cannot go round it.
    if (was.status === 'inactive' && String(effStatus) === 'active' && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: MSG.REACTIVATE_ADMIN_ONLY });
    }
    if (was.login_id === BOOTSTRAP_ADMIN_LOGIN) {
      // Fixed, not merely discouraged - see BOOTSTRAP_ADMIN_LOGIN. Name, password,
      // phone, email and department stay editable; the way back in does not.
      effLogin = was.login_id;
      effRole = 'admin';
      effStatus = 'active';
      perms = ALL_PERMS.slice();
    } else if (effRole !== 'admin' || perms.indexOf('settings') < 0 || String(effStatus) === 'inactive') {
      // Not the bootstrap account, but it can still be the only one left holding the
      // key - the account may simply have been renamed.
      if (!(await otherSettingsAdminExists(req.params.id, client))) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: MSG.LAST_ADMIN });
      }
    }

    let query, params;
    if (password) {
      query = `UPDATE staff SET login_id=$1, password_hash=crypt($2, gen_salt('bf')), name=$3, role=$4, permissions=$5, department_id=$6, phone=$7, email=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING id, login_id, name, role, permissions, department_id, phone, email, status`;
      params = [effLogin, password, name, effRole, perms, department_id, phone, email, effStatus, req.params.id];
    } else {
      query = `UPDATE staff SET login_id=$1, name=$2, role=$3, permissions=$4, department_id=$5, phone=$6, email=$7, status=$8, updated_at=NOW() WHERE id=$9 RETURNING id, login_id, name, role, permissions, department_id, phone, email, status`;
      params = [effLogin, name, effRole, perms, department_id, phone, email, effStatus, req.params.id];
    }
    const now = (await client.query(query, params)).rows[0];

    const common = { entity: 'staff', entity_id: now.id, summary: staffLabel(now) };
    await writeAudit(client, req, Object.assign({ action: ACTIONS.STAFF_EDIT, before: staffFields(was), after: staffFields(now) }, common));
    await writeAudit(client, req, Object.assign({ action: ACTIONS.STAFF_PERMISSIONS,
      before: { permissions: permsInOrder(was.permissions) }, after: { permissions: permsInOrder(now.permissions) } }, common));
    // No values at all: only that it happened. An admin changing their own password
    // is logged the same way (the person and the account are then the same).
    if (password) await writeAudit(client, req, Object.assign({ action: ACTIONS.STAFF_PASSWORD }, common));

    await client.query('COMMIT');
    res.json(now);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    sendDbError(res, err);
  } finally { client.release(); }
});

router.delete('/staff/:id', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockAdmins(client);
    // Deactivating is the other way to lock everyone out, so it is gated the same way
    // as the role and permission edits above.
    const cur = await client.query(
      'SELECT id, login_id, name, role, status, department_id, phone, email, permissions FROM staff WHERE id = $1 FOR UPDATE',
      [req.params.id]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const was = cur.rows[0];
    if (was.login_id === BOOTSTRAP_ADMIN_LOGIN) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: MSG.SETUP_ADMIN_KEPT });
    }
    const held = was.role === 'admin' && (was.permissions || []).indexOf('settings') >= 0;
    if (held && !(await otherSettingsAdminExists(req.params.id, client))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: MSG.LAST_ADMIN });
    }
    const now = (await client.query(
      "UPDATE staff SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING id, login_id, name, role, status, department_id, phone, email",
      [req.params.id])).rows[0];
    await writeAudit(client, req, { action: ACTIONS.STAFF_EDIT, entity: 'staff', entity_id: now.id, summary: staffLabel(now),
      before: staffFields(was), after: staffFields(now) });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    sendDbError(res, err);
  } finally { client.release(); }
});

// Bring a deactivated account back (U2, decided 2026-09-29: yes, administrators only,
// logged). The account comes back as it was: same login, password, role and
// permissions - nothing is reset, so the person can log in as before. Only the status
// changes, and the change log gets settings.staff.edit status inactive -> active.
// "Administrator" is the admin role on top of the settings permission: the whole
// Settings screen needs that permission, but a front-desk account that was given it
// does not also get to undo a deactivation. req.user.role is read from the database on
// every request (middleware/auth.js, S1), so a role taken away applies at once.
// Already active: 200 and nothing written, so a second click changes nothing.
router.post('/staff/:id/reactivate', permMiddleware('settings'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: MSG.REACTIVATE_ADMIN_ONLY });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      'SELECT id, login_id, name, role, status, department_id, phone, email, permissions FROM staff WHERE id = $1 FOR UPDATE',
      [req.params.id]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const was = cur.rows[0];
    if (was.status === 'active') { await client.query('ROLLBACK'); return res.json({ success: true, unchanged: true }); }
    const now = (await client.query(
      "UPDATE staff SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING id, login_id, name, role, status, department_id, phone, email",
      [req.params.id])).rows[0];
    await writeAudit(client, req, { action: ACTIONS.STAFF_EDIT, entity: 'staff', entity_id: now.id, summary: staffLabel(now),
      before: staffFields(was), after: staffFields(now) });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    sendDbError(res, err);
  } finally { client.release(); }
});

// ── CHANGE LOG (read only) ──
// Settings permission only. There is no route that writes, edits or deletes here:
// lines come from writeAudit() in each module, and the table refuses UPDATE/DELETE.
// Filters: from / to (YYYY-MM-DD, clinic dates - the connection runs in the clinic's
// time zone), staff_id, patient (name or chart number, part of it), action (a full
// action, or a module such as "settings"), page (1-based), limit (at most 200).
router.get('/audit', permMiddleware('settings'), async (req, res) => {
  try {
    const where = [], params = [];
    const add = (sql, v) => { params.push(v); where.push(sql.replace('?', '$' + params.length)); };
    const day = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    if (day(req.query.from)) add('at >= ?::date', req.query.from);
    if (day(req.query.to)) add('at < (?::date + 1)', req.query.to);
    if (req.query.staff_id && /^\d+$/.test(String(req.query.staff_id))) add('staff_id = ?', Number(req.query.staff_id));
    if (req.query.patient && String(req.query.patient).trim()) {
      params.push('%' + String(req.query.patient).trim() + '%');
      where.push('(patient_name ILIKE $' + params.length + ' OR chart_no ILIKE $' + params.length + ')');
    }
    if (req.query.action && /^[a-z.]+$/.test(String(req.query.action))) {
      const act = String(req.query.action);
      if (act.indexOf('.') >= 0) add('action = ?', act); else add('module = ?', act);
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const total = (await pool.query('SELECT COUNT(*)::int AS n FROM audit_log' + w, params)).rows[0].n;
    const rows = (await pool.query(
      `SELECT id, at, staff_id, staff_name, staff_role, module, action, patient_id, patient_name, chart_no, visit_id,
              entity, entity_id, summary, before_value, after_value
         FROM audit_log${w} ORDER BY at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params)).rows;
    res.json({ total, page, limit, rows });
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
      // U5 (2026-09-29): an emptied title goes back to the default (011) instead of
      // silently keeping the old one. Not sent at all (an older screen): kept (NULL).
      [name, name_en, name_fr, address, phone, email, working_hours,
       app_title === undefined || app_title === null ? null : (String(app_title).trim() || 'Bethesda EMR')]
    );
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
