const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, permMiddleware, roleMiddleware, ALL_PERMS } = require('../middleware/auth');
const { sendDbError } = require('../utils/dbError');
// Messages shown to people - translated by the screen; see settings.messages.js.
const { MSG, fieldMsg, phraseMsg, drugMsg } = require('./settings.messages');
const { LANGS, readLanguages, cleanLanguages } = require('../utils/languages');
const { POSITIONS: CURRENCY_POSITIONS, readCurrency, cleanCurrency } = require('../utils/currency');
const { writeAudit, ACTIONS } = require('../utils/audit');
const KNOWN_ACTIONS = new Set(Object.values(ACTIONS));

// Mirror the CHECK constraints so a bad value is a 400 naming the field rather
// than a 500 carrying the constraint name.
const ROLES = ['frontdesk', 'doctor', 'nurse', 'pharmacy', 'lab', 'admin'];   // nurse: sql/701
// 'supply' (1.7.0): a consumable - gloves, a syringe, a suture - found and billed like
// a procedure, counted like a drug (supply.routes.js).
const CODE_TYPES = ['fee', 'lab', 'imaging', 'procedure', 'supply'];
// The paper the receipts print on (clinic.receipt_paper, 061): mirrors clinic_receipt_paper_check.
const RECEIPT_PAPERS = ['A4', 'A5'];

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
// The category sent must be one of the clinic's rows (drug_category, 060) - hidden ones
// included, so a drug whose class was hidden can still be saved with it. Not sent or
// emptied: nothing to check (sentDrugFields stores NULL).
async function badDrugCategory(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'category')) return null;
  const v = typeof body.category === 'string' ? body.category.trim() : body.category;
  if (v === null || v === undefined || v === '') return null;
  const r = await pool.query('SELECT 1 FROM drug_category WHERE key = $1', [String(v)]);
  return r.rows.length ? null : MSG.DRUG_CATEGORY_UNKNOWN;
}

router.post('/drugs', permMiddleware('settings'), async (req, res) => {
  try {
    const bad = badDrug(req.body) || await badDrugCategory(req.body);
    if (bad) return res.status(400).json({ error: bad });
    const pack = packFields(req.body);
    if (pack.error) return res.status(400).json({ error: pack.error });
    const f = sentDrugFields(req.body, await drugFieldsHere());
    // A field not sent takes the column's default. min_stock: the default (0 since 059, i.e.
    // no warning until the pharmacy sets one) also when the form sent it empty. A new drug starts with no stock (3-8).
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

// A price change goes to the change log (the clinic manager's decision (나), 2026-09-30): who,
// when, which item, old price -> new price - the price only, whatever else the same save
// changed. Nothing when the price did not change: compared as numbers, so the "100.00"
// the database returns and the 100 a screen sends are the same price. A first price on
// an imported drug (0 -> 100) is a change and is logged; a new drug (POST) is not.
// No patient or visit. Order codes the same way (decided the same day): fee, lab,
// imaging and procedure prices, ACTIONS.ORDER_PRICE; a new code is not logged either.
// fields: the price columns; one line holds those that changed. sameAs: a column left
// out when it moved exactly like another - the order-code window has one "Prix" field
// and writes it to both price_clinic (what the payment screen bills) and price, so a
// normal save would otherwise show the same change twice.
function priceOf(v) { return v === null || v === undefined || v === '' ? null : Number(v); }
async function auditPrice(client, req, action, entity, was, now, fields, sameAs) {
  const before = {}, after = {};
  fields.forEach(f => {
    const b = priceOf(was[f]), a = priceOf(now[f]);
    if (b !== a) { before[f] = b; after[f] = a; }
  });
  Object.keys(sameAs || {}).forEach(f => {
    const o = sameAs[f];
    if (f in after && o in after && before[f] === before[o] && after[f] === after[o]) { delete before[f]; delete after[f]; }
  });
  if (!Object.keys(after).length) return;
  await writeAudit(client, req, {
    action, entity, entity_id: now.id, summary: [now.code, now.name].filter(Boolean).join(' '),
    before, after,
  });
}

router.put('/drugs/:id', permMiddleware('settings'), async (req, res) => {
  const bad = badDrug(req.body);
  if (bad) return res.status(400).json({ error: bad });
  const pack = packFields(req.body);
  if (pack.error) return res.status(400).json({ error: pack.error });
  let client;
  try {
    const badCat = await badDrugCategory(req.body);
    if (badCat) return res.status(400).json({ error: badCat });
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
    // The price before and the save in one transaction, the row locked between them, so
    // two saves at once cannot both log the same old price.
    client = await pool.connect();
    await client.query('BEGIN');
    const was = await client.query('SELECT id, code, name, unit_price FROM drug WHERE id = $1 FOR UPDATE', [req.params.id]);
    const result = await client.query(
      `UPDATE drug SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (!result.rows.length) { await client.query('ROLLBACK'); return sentMissing(res, result); }
    await auditPrice(client, req, ACTIONS.DRUG_PRICE, 'drug', was.rows[0], result.rows[0], ['unit_price']);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ } }
    sendDbError(res, err);
  } finally {
    if (client) client.release();
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
// The imaging modality of an order code is whatever the device asks its worklist for: a
// device only receives the lines whose Modality equals its own value, letter for letter,
// and what an older device asks (the rectoscope seen on site probably "AS") is only known
// on site. So any DICOM code string is accepted, not a fixed list (the clinic's manager,
// 2026-10-01): trimmed, upper-cased, 1-16 of A-Z 0-9 _ (VR CS; no inner spaces - a typed
// space is far more likely a mistake than a value). Empty means "no modality".
// An order code's default_dose is its default *directions* - words (QD, PRN) the
// consultation screen copies onto a procedure order. It is a text column that used to
// default to '1.000', and every code carried that (the clinic's manager, 2026-10-01: "why do the
// directions fill in with 1 by themselves?"; migration 041 cleared them). A bare number
// or blanks are not directions: stored as NULL, without refusing - an older screen still
// open somewhere sends back the '1.000' it loaded.
function cleanDirections(raw) {
  const v = String(raw == null ? '' : raw).trim();
  if (!v || /^[0-9]+([.,][0-9]*)?$/.test(v)) return null;
  return v;
}

// order_code.price_editable (047, payment): the cashier may type the amount of this code's
// line at the till (the clinic's manager, 2026-10-01: the document fee depends on the document).
// Only fee codes are offered at the till, so any other type stores FALSE whatever is sent.
// For a fee code: true / false as sent; not sent at all -> null, which keeps what is stored
// on an edit (a Settings screen opened before this field existed does not send it, and
// must not untick DOC by saving something else) and is FALSE on a new code.
function cleanPriceEditable(raw, codeType) {
  if (String(codeType) !== 'fee') return false;
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return null;
}

// Turning it on or off goes to the change log (decided 2026-10-01: a setting about money -
// it opens the amount to the cashier): who, which code, off -> on. One line of its own,
// next to the price line when the same save changed both. A new code made with it on is
// a line too (nothing before): from that moment its amount can be typed at the till.
async function auditPriceEditable(db, req, was, now) {
  const b = was ? was.price_editable === true : null, a = now.price_editable === true;
  if (was ? b === a : !a) return;
  await writeAudit(db, req, {
    action: ACTIONS.ORDER_PRICE_EDITABLE, entity: 'order_code', entity_id: now.id,
    summary: [now.code, now.name].filter(Boolean).join(' '),
    before: was ? { price_editable: b } : null, after: { price_editable: a },
  });
}

// The two supply-only fields of the order code form: the word the count is in and the
// level under which the stock screen shows it in red. Empty on every other type.
function supplyFields(body, codeType) {
  if (codeType !== 'supply') return { unit: null, min_stock: 0 };
  const unit = String(body.unit == null ? '' : body.unit).trim().slice(0, 20) || null;
  const min = Number(body.min_stock);
  return { unit, min_stock: Number.isInteger(min) && min >= 0 ? min : 0 };
}

function cleanModality(raw) {
  const v = String(raw == null ? '' : raw).trim().toUpperCase();
  if (!v) return { value: null };
  if (!/^[A-Z0-9_]{1,16}$/.test(v)) return { error: MSG.MODALITY_FORMAT };
  return { value: v };
}

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
    const badGroup = await badOrderGroup(req.body);
    if (badGroup) return res.status(400).json({ error: badGroup });
    const { code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo } = req.body;
    if (!CODE_TYPES.includes(String(code_type))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('code_type', CODE_TYPES) });
    }
    const invalid = badPrices(req.body, ['price', 'price_clinic']);
    if (invalid) return res.status(400).json({ error: invalid });
    const modality = cleanModality(pacs_modality);
    if (modality.error) return res.status(400).json({ error: modality.error });
    // A new supply starts with a count of 0; the count itself changes only through
    // the supply routes (receive, shelf count), never from this form - as a drug's.
    const supply = supplyFields(req.body, code_type);
    const result = await pool.query(
      `INSERT INTO order_code (code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo, price_editable,
                               unit, min_stock, stock_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [code, name, name_en, code_type, group_name, cleanDirections(default_dose), default_freq, default_days, price, price_clinic, modality.value, worklist_enabled, station_ae, body_part, memo,
       cleanPriceEditable(req.body.price_editable, code_type) === true,
       supply.unit, supply.min_stock, code_type === 'supply' ? 0 : null]
    );
    await auditPriceEditable(pool, req, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/order-codes/:id', permMiddleware('settings'), async (req, res) => {
  let client;
  try {
    const badGroup = await badOrderGroup(req.body);
    if (badGroup) return res.status(400).json({ error: badGroup });
    const { code, name, name_en, code_type, group_name, default_dose, default_freq, default_days, price, price_clinic, pacs_modality, worklist_enabled, station_ae, body_part, memo } = req.body;
    if (!CODE_TYPES.includes(String(code_type))) {
      return res.status(400).json({ error: fieldMsg.notOneOf('code_type', CODE_TYPES) });
    }
    const invalid = badPrices(req.body, ['price', 'price_clinic']);
    if (invalid) return res.status(400).json({ error: invalid });
    const modality = cleanModality(pacs_modality);
    if (modality.error) return res.status(400).json({ error: modality.error });
    // The prices before and the save in one transaction, the row locked between them
    // (the change log, as for a drug's price).
    client = await pool.connect();
    await client.query('BEGIN');
    const was = await client.query('SELECT id, code, name, price, price_clinic, price_editable FROM order_code WHERE id = $1 FOR UPDATE', [req.params.id]);
    // stock_qty is not in this form (see POST); a code turned into a supply starts at 0,
    // one that stops being a supply loses its count.
    const supply = supplyFields(req.body, code_type);
    const result = await client.query(
      `UPDATE order_code SET code=$1, name=$2, name_en=$3, code_type=$4, group_name=$5, default_dose=$6, default_freq=$7,
       default_days=$8, price=$9, price_clinic=$10, pacs_modality=$11, worklist_enabled=$12, station_ae=$13, body_part=$14, memo=$15,
       price_editable=COALESCE($17::boolean, price_editable), unit=$18, min_stock=$19,
       stock_qty = CASE WHEN $20::boolean THEN COALESCE(stock_qty, 0) ELSE NULL END, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [code, name, name_en, code_type, group_name, cleanDirections(default_dose), default_freq, default_days, price, price_clinic, modality.value, worklist_enabled, station_ae, body_part, memo, req.params.id,
       cleanPriceEditable(req.body.price_editable, code_type), supply.unit, supply.min_stock, code_type === 'supply']
    );
    if (!result.rows.length) { await client.query('ROLLBACK'); return sentMissing(res, result); }
    await auditPrice(client, req, ACTIONS.ORDER_PRICE, 'order_code', was.rows[0], result.rows[0],
      ['price_clinic', 'price'], { price: 'price_clinic' });
    await auditPriceEditable(client, req, was.rows[0], result.rows[0]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ } }
    sendDbError(res, err);
  } finally {
    if (client) client.release();
  }
});

// The price alone (the clinic's manager, 2026-11-11: "can the price of a lab test be changed
// right in Lab items?"). That tab knows a test by its id, not the rest of the order code's
// form, so it cannot send the whole row PUT /order-codes/:id wants. Same rules and the same
// line in the change log as a price changed in the order code form; the two prices move
// together, as that form moves them.
router.put('/order-codes/:id/price', permMiddleware('settings'), async (req, res) => {
  if (!/^\d{1,9}$/.test(String(req.params.id))) return res.status(404).json({ error: MSG.NOT_FOUND });
  const raw = req.body ? req.body.price : undefined;
  if (raw === undefined || raw === null || typeof raw === 'boolean' || typeof raw === 'object' || String(raw).trim() === '') {
    return res.status(400).json({ error: fieldMsg.notNumber('price') });
  }
  const invalid = badPrices({ price: raw }, ['price']);
  if (invalid) return res.status(400).json({ error: invalid });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const was = await client.query('SELECT id, code, name, price, price_clinic FROM order_code WHERE id = $1 AND is_active = true FOR UPDATE', [req.params.id]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const result = await client.query('UPDATE order_code SET price = $2, price_clinic = $2, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id, Number(raw)]);
    await auditPrice(client, req, ACTIONS.ORDER_PRICE, 'order_code', was.rows[0], result.rows[0],
      ['price_clinic', 'price'], { price: 'price_clinic' });
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ } }
    sendDbError(res, err);
  } finally {
    if (client) client.release();
  }
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
    // theme (migration 037) is each account's own screen choice: read and written only
    // through /api/theme, so it does not travel with the staff list.
    res.json(result.rows.map(r => { delete r.password_hash; delete r.theme; return r; }));
  } catch (err) { sendDbError(res, err); }
});

// ── Change log for staff accounts (decided 2026-09-29, the project notes) ──
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

// A staff account has a department only when it is a doctor (the clinic's manager, from the
// site, 2026-11-10): nurses, reception, pharmacy, lab and administrators need none, and the
// box was one more thing to get wrong. A doctor's is required while the account is active -
// reception refuses to register a visit to a doctor without one (1.7.14) - and must be a
// department that is not hidden; the one the account already has stays valid after it is
// hidden, so the account can still be edited. Any other role is stored without a
// department, whatever the request says (changing a doctor to another role empties it).
// -> { value } (what to store) or { error } (the message for a 400).
async function staffDepartment(db, role, status, sent, stored) {
  if (String(role) !== 'doctor') return { value: null };
  if (sent === undefined || sent === null || String(sent).trim() === '') {
    return String(status) === 'inactive' ? { value: null } : { error: MSG.STAFF_DEPT_REQUIRED };
  }
  if (!/^\d+$/.test(String(sent))) return { error: MSG.STAFF_DEPT_BAD };
  const d = await db.query('SELECT is_active FROM department WHERE id = $1', [Number(sent)]);
  const same = stored != null && Number(stored) === Number(sent);
  if (!d.rows.length || (d.rows[0].is_active === false && !same)) return { error: MSG.STAFF_DEPT_BAD };
  return { value: Number(sent) };
}

router.post('/staff', permMiddleware('settings'), async (req, res) => {
  const { password, name, role, permissions, phone, email, status } = req.body;
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
    const dept = await staffDepartment(client, role, status || 'active', req.body.department_id, null);
    if (dept.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: dept.error }); }
    const department_id = dept.value;
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
  const { password, name, role, permissions, phone, email, status } = req.body;
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
    // an administrator (settings rule S6).
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

    // The department goes with the role the account ends up with (staffDepartment).
    const dept = await staffDepartment(client, effRole, effStatus, req.body.department_id, was.department_id);
    if (dept.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: dept.error }); }
    const department_id = dept.value;

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

// Remove for good an account that never served (the clinic's manager, 2026-11-10, after two
// test accounts had to be removed from the database by hand): an account made by mistake,
// or one from a trial. Administrators only, never one's own account nor the one made at
// setup, and only an account that is already deactivated - so the button that deactivates
// stays the everyday one and this is a second, deliberate step.
// "Never served" is decided here, not by the screen: no row anywhere may point at the
// account - every foreign key to staff, and the columns that hold a staff id without one
// (the logs keep working when a table is restored). Lines of the change log ABOUT the
// account (who made it, who edited it) are another person's acts and stay; a line the
// account wrote itself counts as use. Its own screen choices go with it.
const STAFF_PREFS = ['consultation_queue_filter'];
const STAFF_REFS_EXTRA = [
  ['audit_log', 'staff_id'], ['billing', 'cancelled_by'], ['billing', 'cashier_id'], ['billing_saved_fee', 'saved_by'],
  ['cash_movement', 'staff_id'], ['consultation', 'doctor_id'], ['consultation', 'vitals_by'], ['diagnosis', 'created_by'],
  ['document_log', 'issued_by'], ['document_log', 'voided_by'], ['drug', 'import_check_done_by'], ['lab_result', 'result_by'],
  ['order_item', 'cancelled_by'], ['order_item', 'ordered_by'], ['order_item', 'result_by'], ['pacs_config', 'updated_by'],
  ['pacs_import', 'staff_id'], ['pacs_import', 'undone_by'], ['pacs_study_attach', 'staff_id'], ['pacs_study_move', 'staff_id'],
  ['phrase_dictionary', 'created_by'], ['prescription', 'dispensed_by'], ['prescription', 'prescribed_by'],
  ['stock_movement', 'staff_id'], ['supply_movement', 'staff_id'], ['visit', 'doctor_id'], ['visit', 'registered_by'],
];
const PLAIN_NAME = /^[a-z_][a-z0-9_]*$/;
// -> the "table.column" places that hold a row of this account ([] = it never served).
async function staffReferences(db, staffId) {
  const fk = await db.query(
    `SELECT c.conrelid::regclass::text AS tbl, a.attname::text AS col
       FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f' AND c.confrelid = 'staff'::regclass AND array_length(c.conkey, 1) = 1`);
  const cols = await db.query(
    `SELECT table_name::text AS tbl, column_name::text AS col FROM information_schema.columns WHERE table_schema = 'public'`);
  const exists = new Set(cols.rows.map(function (r) { return r.tbl + '.' + r.col; }));
  const pairs = {};
  fk.rows.forEach(function (r) { pairs[r.tbl + '.' + r.col] = [r.tbl, r.col]; });
  STAFF_REFS_EXTRA.forEach(function (p) { if (exists.has(p[0] + '.' + p[1])) pairs[p[0] + '.' + p[1]] = p; });
  const found = [];
  for (const key of Object.keys(pairs).sort()) {
    const tbl = pairs[key][0], col = pairs[key][1];
    if (tbl === 'staff' || STAFF_PREFS.indexOf(tbl) >= 0) continue;
    // a name this cannot read safely is not skipped: the account stays
    if (!PLAIN_NAME.test(tbl) || !PLAIN_NAME.test(col)) { found.push(key); continue; }
    const r = await db.query(`SELECT 1 FROM "${tbl}" WHERE "${col}" = $1 LIMIT 1`, [staffId]);
    if (r.rows.length) found.push(key);
  }
  return found;
}

router.post('/staff/:id/remove', permMiddleware('settings'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: MSG.REMOVE_ADMIN_ONLY });
  if (!/^\d{1,9}$/.test(String(req.params.id))) return res.status(404).json({ error: MSG.NOT_FOUND });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      'SELECT id, login_id, name, role, status, department_id, phone, email, permissions FROM staff WHERE id = $1 FOR UPDATE',
      [req.params.id]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const was = cur.rows[0];
    if (String(was.id) === String(req.user.id)) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.STAFF_REMOVE_SELF }); }
    if (was.login_id === BOOTSTRAP_ADMIN_LOGIN) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.SETUP_ADMIN_KEPT }); }
    if (was.status !== 'inactive') { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.STAFF_REMOVE_ACTIVE }); }
    const used = await staffReferences(client, was.id);
    if (used.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.STAFF_HAS_RECORDS, places: used }); }
    for (const pref of STAFF_PREFS) {
      const has = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'staff_id'`, [pref]);
      if (has.rows.length) await client.query(`DELETE FROM "${pref}" WHERE staff_id = $1`, [was.id]);
    }
    await client.query('DELETE FROM staff WHERE id = $1', [was.id]);
    await writeAudit(client, req, { action: ACTIONS.STAFF_DELETE, entity: 'staff', entity_id: was.id, summary: staffLabel(was),
      before: staffFields(was), after: null });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    // a row this did not know about still points at the account (23503): it has been used
    if (err && err.code === '23503') return res.status(409).json({ error: MSG.STAFF_HAS_RECORDS });
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
// Administrators only (clinic manager, 2026-11-08: the log is for the administrator account,
// not for everyone who may edit the settings) - the settings permission AND the admin
// role. There is no route that writes, edits or deletes here:
// lines come from writeAudit() in each module, and the table refuses UPDATE/DELETE.
// Filters: from / to (YYYY-MM-DD, clinic dates - the connection runs in the clinic's
// time zone), staff_id, patient (name or chart number, part of it), action (a full
// action, or a module such as "settings"), page (1-based), limit (at most 200).
router.get('/audit', permMiddleware('settings'), roleMiddleware('admin'), async (req, res) => {
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
    // (an action name may hold an underscore - settings.order.price_editable; without it in
    // the pattern that filter was dropped and every line came back)
    const chosen = req.query.action && /^[a-z_.]+$/.test(String(req.query.action)) ? String(req.query.action) : '';
    if (chosen) {
      if (chosen.indexOf('.') >= 0) add('action = ?', chosen); else add('module = ?', chosen);
    }
    // exclude=<action>[,<action>] (the clinic manager's decision (나), 2026-09-30): the Journal
    // opens without the many "document issued" lines. Only known action names count;
    // anything else is ignored. An action picked in the type filter is never excluded.
    // The answer says how many lines each exclusion hid (same other filters), so the
    // screen can say they are folded away rather than missing.
    const exclude = String(req.query.exclude || '').split(',').map(a => a.trim())
      .filter((a, i, all) => a && KNOWN_ACTIONS.has(a) && a !== chosen && all.indexOf(a) === i);
    let excluded;
    if (exclude.length) {
      const w0 = where.length ? ' WHERE ' + where.join(' AND ') + ' AND' : ' WHERE';
      const hid = await pool.query(
        'SELECT action, COUNT(*)::int AS n FROM audit_log' + w0 + ' action = ANY($' + (params.length + 1) + '::text[]) GROUP BY action',
        params.concat([exclude]));
      excluded = {};
      exclude.forEach(a => { excluded[a] = 0; });
      hid.rows.forEach(r => { excluded[r.action] = r.n; });
      add('action <> ALL(?::text[])', exclude);
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const total = (await pool.query('SELECT COUNT(*)::int AS n FROM audit_log' + w, params)).rows[0].n;
    const rows = (await pool.query(
      `SELECT id, at, staff_id, staff_name, staff_role, module, action, patient_id, patient_name, chart_no, visit_id,
              entity, entity_id, summary, before_value, after_value
         FROM audit_log${w} ORDER BY at DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params)).rows;
    res.json(excluded ? { total, page, limit, rows, excluded } : { total, page, limit, rows });
  } catch (err) { sendDbError(res, err); }
});

// ── DEPARTMENTS ──
// The active ones, as every screen lists them; ?all=1 (Settings) adds the hidden ones.
// Hidden (is_active false, the clinic's manager 2026-11-09: « only GEN is in use now »):
// not offered at reception, kept on its visits, accounts and statistics. At least one
// department stays active.
router.get('/departments', async (req, res) => {
  try {
    const all = req.query.all === '1' || req.query.all === 'true';
    const result = await pool.query('SELECT d.*, s.name as head_name FROM department d LEFT JOIN staff s ON d.head_doctor_id = s.id' + (all ? '' : ' WHERE d.is_active = true') + ' ORDER BY d.is_active DESC, d.code');
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

// Only the fields sent change (the Settings row's Masquer / Afficher sends is_active alone;
// the edit window sends the names). Hiding the last active department is refused.
router.put('/departments/:id', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT * FROM department WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const cur = was.rows[0], b = req.body || {};
    const has = f => Object.prototype.hasOwnProperty.call(b, f);
    const next = {
      code: has('code') ? b.code : cur.code, name: has('name') ? b.name : cur.name,
      name_en: has('name_en') ? b.name_en : cur.name_en, name_fr: has('name_fr') ? b.name_fr : cur.name_fr,
      head_doctor_id: has('head_doctor_id') ? (b.head_doctor_id || null) : cur.head_doctor_id,
      is_active: has('is_active') ? (b.is_active === true || b.is_active === 'true') : cur.is_active,
    };
    if (cur.is_active && !next.is_active) {
      const others = await client.query('SELECT COUNT(*)::int AS n FROM department WHERE is_active AND id <> $1', [cur.id]);
      if (!others.rows[0].n) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DEPARTMENT_LAST_ACTIVE }); }
    }
    const result = await client.query(
      'UPDATE department SET code=$1, name=$2, name_en=$3, name_fr=$4, head_doctor_id=$5, is_active=$6 WHERE id=$7 RETURNING *',
      [next.code, next.name, next.name_en, next.name_fr, next.head_doctor_id, next.is_active, cur.id]);
    if (cur.is_active !== next.is_active) {
      await writeAudit(client, req, { action: ACTIONS.DEPARTMENT, entity: 'department', entity_id: cur.id, summary: cur.code + ' ' + (cur.name_fr || cur.name),
        before: { status: cur.is_active ? 'active' : 'hidden' }, after: { status: next.is_active ? 'active' : 'hidden' } });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// ── ORDER-CODE GROUPS ──
// The groups an order code is filed under (order_group, migration 063; the clinic's
// manager, 2026-11-09, like the drug categories). Read by anyone signed in; changed with
// the settings permission. The name is the key and is stored on the codes
// (order_code.group_name), so renaming renames it on every code in one transaction; a
// group still on codes is hidden, not removed. 'Other' can be neither hidden nor removed.
const ORDER_GROUP_SELECT = `SELECT g.name, g.sort_order, g.is_hidden,
                                   (SELECT COUNT(*)::int FROM order_code oc WHERE oc.group_name = g.name AND oc.is_active) AS code_count,
                                   (g.name = 'Other') AS fixed
                              FROM order_group g`;
const ORDER_GROUP_ORDER = ' ORDER BY g.sort_order, lower(g.name)';
function badGroupName(raw) {
  const name = String(raw == null ? '' : raw).trim();
  if (!name) return { error: MSG.ORDER_GROUP_NAME_REQUIRED };
  if (name.length > 50) return { error: MSG.ORDER_GROUP_NAME_LONG };
  return { name };
}
async function groupTaken(db, name, except) {
  const r = await db.query('SELECT 1 FROM order_group WHERE lower(name) = lower($1) AND name <> $2', [name, except || '']);
  return r.rows.length > 0;
}
// An order code's group must be one of the rows (hidden ones included: an old code keeps
// its group). Not sent or empty: nothing to check.
async function badOrderGroup(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'group_name')) return null;
  const v = body.group_name == null ? '' : String(body.group_name).trim();
  if (!v) return null;
  const r = await pool.query('SELECT 1 FROM order_group WHERE name = $1', [v]);
  return r.rows.length ? null : MSG.ORDER_GROUP_UNKNOWN;
}

router.get('/order-groups', async (req, res) => {
  try { res.json((await pool.query(ORDER_GROUP_SELECT + ORDER_GROUP_ORDER)).rows); }
  catch (err) { sendDbError(res, err); }
});

router.post('/order-groups', permMiddleware('settings'), async (req, res) => {
  const n = badGroupName(req.body.name);
  if (n.error) return res.status(400).json({ error: n.error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('bethesda.order_group'))");
    if (await groupTaken(client, n.name, null)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.ORDER_GROUP_EXISTS }); }
    await client.query(
      `INSERT INTO order_group (name, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM order_group WHERE name <> 'Other'))`, [n.name]);
    await writeAudit(client, req, { action: ACTIONS.ORDER_GROUP, entity: 'order_group', entity_id: n.name, summary: n.name, before: null, after: { name: n.name, hidden: false } });
    await client.query('COMMIT');
    res.status(201).json((await pool.query(ORDER_GROUP_SELECT + ' WHERE g.name = $1', [n.name])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

router.put('/order-groups/order', permMiddleware('settings'), async (req, res) => {
  const names = Array.isArray(req.body.names) ? req.body.names.map(String) : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const have = (await client.query('SELECT name FROM order_group FOR UPDATE')).rows.map(r => r.name);
    const same = names.length === have.length && new Set(names).size === names.length && names.every(k => have.includes(k));
    if (!same) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.ORDER_GROUP_ORDER }); }
    for (let i = 0; i < names.length; i++) {
      await client.query('UPDATE order_group SET sort_order = $1, updated_at = NOW() WHERE name = $2', [(i + 1) * 10, names[i]]);
    }
    await client.query('COMMIT');
    res.json((await pool.query(ORDER_GROUP_SELECT + ORDER_GROUP_ORDER)).rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// Rename (the codes follow), hide or show.
router.put('/order-groups/:name', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT * FROM order_group WHERE name = $1 FOR UPDATE', [req.params.name]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const cur = was.rows[0];
    let name = cur.name, hidden = cur.is_hidden, renamed = 0;
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const n = badGroupName(req.body.name);
      if (n.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: n.error }); }
      if (n.name !== cur.name) {
        if (cur.fixed || cur.name === 'Other') { /* 'Other' may be renamed like any group */ }
        if (await groupTaken(client, n.name, cur.name)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.ORDER_GROUP_EXISTS }); }
        name = n.name;
      }
    }
    if (req.body.is_hidden !== undefined) {
      const h = req.body.is_hidden === true || req.body.is_hidden === 'true';
      if (h && cur.name === 'Other') { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DRUG_CATEGORY_FIXED.replace('"Other"', '"Other"') }); }
      hidden = h;
    }
    if (name !== cur.name) {
      // The key changes: a new row under the new name, the codes moved, the old row gone,
      // so the sort order and the hidden flag travel with it.
      await client.query('INSERT INTO order_group (name, sort_order, is_hidden, created_at) VALUES ($1, $2, $3, $4)', [name, cur.sort_order, hidden, cur.created_at]);
      renamed = (await client.query('UPDATE order_code SET group_name = $1 WHERE group_name = $2', [name, cur.name])).rowCount;
      await client.query('DELETE FROM order_group WHERE name = $1', [cur.name]);
    } else if (hidden !== cur.is_hidden) {
      await client.query('UPDATE order_group SET is_hidden = $1, updated_at = NOW() WHERE name = $2', [hidden, cur.name]);
    }
    if (name !== cur.name || hidden !== cur.is_hidden) {
      await writeAudit(client, req, { action: ACTIONS.ORDER_GROUP, entity: 'order_group', entity_id: name, summary: name,
        before: { name: cur.name, hidden: cur.is_hidden, codes_renamed: null }, after: { name, hidden, codes_renamed: name !== cur.name ? renamed : null } });
    }
    await client.query('COMMIT');
    res.json((await pool.query(ORDER_GROUP_SELECT + ' WHERE g.name = $1', [name])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

router.delete('/order-groups/:name', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT * FROM order_group WHERE name = $1 FOR UPDATE', [req.params.name]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const g = was.rows[0];
    if (g.name === 'Other') { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DRUG_CATEGORY_FIXED }); }
    // Active codes only: a code taken out of use (is_active false) keeps its old group name as text.
    const n = (await client.query('SELECT COUNT(*)::int AS n FROM order_code WHERE group_name = $1 AND is_active', [g.name])).rows[0].n;
    if (n > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: drugMsg.groupInUse(n), code_count: n }); }
    await client.query('DELETE FROM order_group WHERE name = $1', [g.name]);
    await writeAudit(client, req, { action: ACTIONS.ORDER_GROUP, entity: 'order_group', entity_id: g.name, summary: g.name, before: { name: g.name, hidden: g.is_hidden }, after: null });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// ── PHRASES ──
// One sentence per phrase and categories the clinic makes itself (the clinic's manager,
// 2026-10-01; migration 039). text_fr / text_en are no longer read or written - the
// columns keep what they had. `category` (the name) is still sent with every phrase and
// kept equal to its category's name, because the consultation screen reads and filters
// on it; category_id and category_sort are the new way.
const PHRASE_SELECT = `SELECT p.id, p.category_id, COALESCE(pc.name, p.category) AS category, COALESCE(pc.sort_order, 0) AS category_sort,
                              p.text, p.sort_order, p.is_active, p.created_by, p.created_at
                         FROM phrase_dictionary p LEFT JOIN phrase_category pc ON pc.id = p.category_id`;

router.get('/phrases', async (req, res) => {
  try {
    const { category, category_id } = req.query;
    let query = PHRASE_SELECT + ' WHERE p.is_active = true';
    const params = [];
    if (category_id && /^\d+$/.test(String(category_id))) { params.push(Number(category_id)); query += ' AND p.category_id = $' + params.length; }
    if (category) { params.push(category); query += ' AND COALESCE(pc.name, p.category) = $' + params.length; }
    // The categories in their own order, then the phrases; id breaks ties (every seeded
    // phrase shares sort_order 0, and without it a phrase jumped each time it was saved).
    query += ' ORDER BY COALESCE(pc.sort_order, 0), lower(COALESCE(pc.name, p.category)), p.sort_order, p.id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { sendDbError(res, err); }
});

// The category a phrase is saved under: category_id, or - for a caller that still sends
// the name - the category of that name. null when neither names a category in use.
async function phraseCategoryOf(db, body) {
  if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
    if (!/^\d+$/.test(String(body.category_id))) return null;
    const r = await db.query('SELECT id, name FROM phrase_category WHERE id = $1 AND is_active', [Number(body.category_id)]);
    return r.rows[0] || null;
  }
  const name = String(body.category || '').trim();
  if (!name) return null;
  const r = await db.query('SELECT id, name FROM phrase_category WHERE lower(name) = lower($1) AND is_active', [name]);
  return r.rows[0] || null;
}

router.post('/phrases', permMiddleware('settings'), async (req, res) => {
  try {
    const text = String(req.body.text == null ? '' : req.body.text).trim();
    if (!text) return res.status(400).json({ error: MSG.PHRASE_TEXT_REQUIRED });
    const cat = await phraseCategoryOf(pool, req.body);
    if (!cat) return res.status(400).json({ error: MSG.PHRASE_CATEGORY_REQUIRED });
    const made = await pool.query(
      'INSERT INTO phrase_dictionary (category_id, category, text, created_by) VALUES ($1,$2,$3,$4) RETURNING id',
      [cat.id, cat.name.slice(0, 30), text, req.user.id]);
    const result = await pool.query(PHRASE_SELECT + ' WHERE p.id = $1', [made.rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.put('/phrases/:id', permMiddleware('settings'), async (req, res) => {
  try {
    const text = String(req.body.text == null ? '' : req.body.text).trim();
    if (!text) return res.status(400).json({ error: MSG.PHRASE_TEXT_REQUIRED });
    const cat = await phraseCategoryOf(pool, req.body);
    if (!cat) return res.status(400).json({ error: MSG.PHRASE_CATEGORY_REQUIRED });
    const saved = await pool.query(
      'UPDATE phrase_dictionary SET category_id=$1, category=$2, text=$3 WHERE id=$4 RETURNING id',
      [cat.id, cat.name.slice(0, 30), text, req.params.id]);
    if (sentMissing(res, saved)) return;
    const result = await pool.query(PHRASE_SELECT + ' WHERE p.id = $1', [saved.rows[0].id]);
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

router.delete('/phrases/:id', permMiddleware('settings'), async (req, res) => {
  try {
    await pool.query('UPDATE phrase_dictionary SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { sendDbError(res, err); }
});

// ── PHRASE CATEGORIES ──
// Read by anyone signed in (the consultation screen lists them); changed with the
// settings permission. A category is never removed while it still holds phrases: the
// answer says how many (409), and the caller either moves them (move_to) or deletes
// them first. Adding, renaming and removing go to the change log; the order does not.
const CATEGORY_SELECT = `SELECT pc.id, pc.name, pc.sort_order,
                                (SELECT COUNT(*)::int FROM phrase_dictionary p WHERE p.category_id = pc.id AND p.is_active) AS phrase_count
                           FROM phrase_category pc WHERE pc.is_active`;
const CATEGORY_ORDER = ' ORDER BY pc.sort_order, pc.id';
function badCategoryName(raw) {
  const name = String(raw == null ? '' : raw).trim();
  if (!name) return { error: MSG.CATEGORY_NAME_REQUIRED };
  if (name.length > 60) return { error: MSG.CATEGORY_NAME_LONG };
  return { name };
}
// The partial unique index (active names, case-insensitive) is the real guard; this
// turns its refusal into words.
function categoryDbError(res, err) {
  if (err && err.code === '23505') return res.status(409).json({ error: MSG.CATEGORY_EXISTS });
  return sendDbError(res, err);
}

router.get('/phrase-categories', async (req, res) => {
  try { res.json((await pool.query(CATEGORY_SELECT + CATEGORY_ORDER)).rows); }
  catch (err) { sendDbError(res, err); }
});

router.post('/phrase-categories', permMiddleware('settings'), async (req, res) => {
  const n = badCategoryName(req.body.name);
  if (n.error) return res.status(400).json({ error: n.error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const made = await client.query(
      'INSERT INTO phrase_category (name, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM phrase_category WHERE is_active)) RETURNING id, name',
      [n.name]);
    await writeAudit(client, req, { action: ACTIONS.PHRASE_CATEGORY, entity: 'phrase_category', entity_id: made.rows[0].id,
      summary: made.rows[0].name, before: null, after: { name: made.rows[0].name } });
    await client.query('COMMIT');
    res.status(201).json((await pool.query(CATEGORY_SELECT + ' AND pc.id = $1', [made.rows[0].id])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    categoryDbError(res, err);
  } finally { client.release(); }
});

// The order of all categories at once: ids as they should be listed.
router.put('/phrase-categories/order', permMiddleware('settings'), async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const have = (await client.query('SELECT id FROM phrase_category WHERE is_active FOR UPDATE')).rows.map(r => r.id);
    const same = ids.length === have.length && new Set(ids).size === ids.length && ids.every(id => have.includes(id));
    if (!same) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.CATEGORY_ORDER }); }
    for (let i = 0; i < ids.length; i++) {
      await client.query('UPDATE phrase_category SET sort_order = $1, updated_at = NOW() WHERE id = $2', [i + 1, ids[i]]);
    }
    await client.query('COMMIT');
    res.json((await pool.query(CATEGORY_SELECT + CATEGORY_ORDER)).rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// Rename. The phrases' own copy of the name (phrase_dictionary.category) follows in the
// same transaction.
router.put('/phrase-categories/:id', permMiddleware('settings'), async (req, res) => {
  const n = badCategoryName(req.body.name);
  if (n.error) return res.status(400).json({ error: n.error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT id, name FROM phrase_category WHERE id = $1 AND is_active FOR UPDATE', [req.params.id]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    await client.query('UPDATE phrase_category SET name = $1, updated_at = NOW() WHERE id = $2', [n.name, was.rows[0].id]);
    await client.query('UPDATE phrase_dictionary SET category = $1 WHERE category_id = $2', [n.name.slice(0, 30), was.rows[0].id]);
    await writeAudit(client, req, { action: ACTIONS.PHRASE_CATEGORY, entity: 'phrase_category', entity_id: was.rows[0].id,
      summary: n.name, before: { name: was.rows[0].name }, after: { name: n.name } });
    await client.query('COMMIT');
    res.json((await pool.query(CATEGORY_SELECT + ' AND pc.id = $1', [was.rows[0].id])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    categoryDbError(res, err);
  } finally { client.release(); }
});

// Remove. With phrases in it: 409 and the number, unless ?move_to=<another category>,
// which moves them there first. The category is kept as "not in use" (removed phrases
// still point at it), so its name can be used again.
router.delete('/phrase-categories/:id', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT id, name FROM phrase_category WHERE id = $1 AND is_active FOR UPDATE', [req.params.id]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const cat = was.rows[0];
    const n = (await client.query('SELECT COUNT(*)::int AS n FROM phrase_dictionary WHERE category_id = $1 AND is_active', [cat.id])).rows[0].n;
    let moved = null;
    if (n > 0) {
      const to = req.query.move_to;
      if (to === undefined || to === '') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: phraseMsg.categoryInUse(n), phrase_count: n });
      }
      const target = /^\d+$/.test(String(to))
        ? (await client.query('SELECT id, name FROM phrase_category WHERE id = $1 AND is_active AND id <> $2', [Number(to), cat.id])).rows[0]
        : null;
      if (!target) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.CATEGORY_MOVE_TARGET }); }
      await client.query('UPDATE phrase_dictionary SET category_id = $1, category = $2 WHERE category_id = $3 AND is_active',
        [target.id, target.name.slice(0, 30), cat.id]);
      moved = { to: target.name, count: n };
    }
    await client.query('UPDATE phrase_category SET is_active = false, updated_at = NOW() WHERE id = $1', [cat.id]);
    await writeAudit(client, req, { action: ACTIONS.PHRASE_CATEGORY, entity: 'phrase_category', entity_id: cat.id, summary: cat.name,
      before: { status: 'active', phrases_moved_to: null, phrases_moved: null },
      after: { status: 'inactive', phrases_moved_to: moved ? moved.to : null, phrases_moved: moved ? moved.count : null } });
    await client.query('COMMIT');
    res.json({ success: true, moved: moved ? moved.count : 0 });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// ── DRUG CATEGORIES ──
// The classes a drug is filed under (drug_category, migration 060; the clinic's manager,
// 2026-11-09, from the site: a class was missing and the list was fixed in the screen).
// Read by anyone signed in (the pharmacy's stock screen and the statistics name the
// classes); changed with the settings permission. A category still on drugs is never
// removed - the answer says how many (409) and the screen offers "hide" - and 'Other',
// the form's fallback, can be neither hidden nor removed. drug.category stores the key,
// so renaming changes nothing on the drugs. Adding, renaming, hiding, showing and removing
// go to the change log; the order does not.
const DRUG_CAT_SELECT = `SELECT c.key, c.name_fr, c.name_ko, c.name_en, c.sort_order, c.is_hidden,
                                (SELECT COUNT(*)::int FROM drug d WHERE d.category = c.key) AS drug_count,
                                (c.key = 'Other') AS fixed
                           FROM drug_category c`;
const DRUG_CAT_ORDER = ' ORDER BY c.sort_order, lower(c.name_fr), c.key';
const DRUG_CAT_FIXED = 'Other';
// {name_fr, name_ko, name_en} trimmed; French required (the clinic works in French), the
// other two may be empty (the screen then shows the French name). Returns {error} or {names}.
function badDrugCatNames(body) {
  const names = {};
  for (const f of ['name_fr', 'name_ko', 'name_en']) {
    const v = String(body[f] == null ? '' : body[f]).trim();
    if (v.length > 60) return { error: MSG.DRUG_CATEGORY_NAME_LONG };
    names[f] = v || null;
  }
  if (!names.name_fr) return { error: MSG.DRUG_CATEGORY_NAME_REQUIRED };
  return { names };
}
// Another row already called that (in any of the three languages, case-insensitive)?
async function drugCatNameTaken(db, names, exceptKey) {
  const r = await db.query(
    `SELECT key FROM drug_category
      WHERE key <> $4 AND (lower(name_fr) = lower($1)
         OR ($2::text IS NOT NULL AND lower(name_ko) = lower($2))
         OR ($3::text IS NOT NULL AND lower(name_en) = lower($3)))`,
    [names.name_fr, names.name_ko, names.name_en, exceptKey || '']);
  return r.rows.length > 0;
}
// The key a new category is stored under: the English name (or the French one) as plain
// letters and digits, e.g. "Anesthetic", "Soins_de_plaie"; numbered when taken. Keys never
// change afterwards - the drugs point at them.
async function newDrugCatKey(db, names) {
  const base = String(names.name_en || names.name_fr).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'Category';
  const have = new Set((await db.query('SELECT key FROM drug_category')).rows.map(r => r.key.toLowerCase()));
  if (!have.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) { const k = base + '_' + n; if (!have.has(k.toLowerCase())) return k; }
}
function drugCatAudit(c) {
  return { name_fr: c.name_fr, name_ko: c.name_ko, name_en: c.name_en, hidden: c.is_hidden };
}

router.get('/drug-categories', async (req, res) => {
  try { res.json((await pool.query(DRUG_CAT_SELECT + DRUG_CAT_ORDER)).rows); }
  catch (err) { sendDbError(res, err); }
});

router.post('/drug-categories', permMiddleware('settings'), async (req, res) => {
  const n = badDrugCatNames(req.body);
  if (n.error) return res.status(400).json({ error: n.error });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('bethesda.drug_category'))");
    if (await drugCatNameTaken(client, n.names, null)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.DRUG_CATEGORY_EXISTS }); }
    const key = await newDrugCatKey(client, n.names);
    // Before 'Other' (999) and after every other row.
    const made = await client.query(
      `INSERT INTO drug_category (key, name_fr, name_ko, name_en, sort_order)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM drug_category WHERE key <> $5))
       RETURNING *`,
      [key, n.names.name_fr, n.names.name_ko, n.names.name_en, DRUG_CAT_FIXED]);
    await writeAudit(client, req, { action: ACTIONS.DRUG_CATEGORY, entity: 'drug_category', entity_id: key,
      summary: key + ' ' + n.names.name_fr, before: null, after: drugCatAudit(made.rows[0]) });
    await client.query('COMMIT');
    res.status(201).json((await pool.query(DRUG_CAT_SELECT + ' WHERE c.key = $1', [key])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// The order of all categories at once: keys as they should be listed.
router.put('/drug-categories/order', permMiddleware('settings'), async (req, res) => {
  const keys = Array.isArray(req.body.keys) ? req.body.keys.map(String) : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const have = (await client.query('SELECT key FROM drug_category FOR UPDATE')).rows.map(r => r.key);
    const same = keys.length === have.length && new Set(keys).size === keys.length && keys.every(k => have.includes(k));
    if (!same) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DRUG_CATEGORY_ORDER }); }
    for (let i = 0; i < keys.length; i++) {
      await client.query('UPDATE drug_category SET sort_order = $1, updated_at = NOW() WHERE key = $2', [(i + 1) * 10, keys[i]]);
    }
    await client.query('COMMIT');
    res.json((await pool.query(DRUG_CAT_SELECT + DRUG_CAT_ORDER)).rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// Rename, hide or show. Names not sent stay as they are; is_hidden only when sent.
router.put('/drug-categories/:key', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT * FROM drug_category WHERE key = $1 FOR UPDATE', [req.params.key]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const cur = was.rows[0];
    const next = { name_fr: cur.name_fr, name_ko: cur.name_ko, name_en: cur.name_en, is_hidden: cur.is_hidden };
    const has = f => Object.prototype.hasOwnProperty.call(req.body, f);
    if (['name_fr', 'name_ko', 'name_en'].some(has)) {
      const n = badDrugCatNames({ name_fr: has('name_fr') ? req.body.name_fr : cur.name_fr,
        name_ko: has('name_ko') ? req.body.name_ko : cur.name_ko, name_en: has('name_en') ? req.body.name_en : cur.name_en });
      if (n.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: n.error }); }
      if (await drugCatNameTaken(client, n.names, cur.key)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.DRUG_CATEGORY_EXISTS }); }
      Object.assign(next, n.names);
    }
    if (req.body.is_hidden !== undefined) {
      const h = req.body.is_hidden === true || req.body.is_hidden === 'true';
      if (h && cur.key === DRUG_CAT_FIXED) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DRUG_CATEGORY_FIXED }); }
      next.is_hidden = h;
    }
    const upd = await client.query(
      'UPDATE drug_category SET name_fr = $1, name_ko = $2, name_en = $3, is_hidden = $4, updated_at = NOW() WHERE key = $5 RETURNING *',
      [next.name_fr, next.name_ko, next.name_en, next.is_hidden, cur.key]);
    const b = drugCatAudit(cur), a = drugCatAudit(upd.rows[0]);
    const before = {}, after = {};
    Object.keys(a).forEach(f => { if (a[f] !== b[f]) { before[f] = b[f]; after[f] = a[f]; } });
    if (Object.keys(after).length) {
      await writeAudit(client, req, { action: ACTIONS.DRUG_CATEGORY, entity: 'drug_category', entity_id: cur.key,
        summary: cur.key + ' ' + next.name_fr, before, after });
    }
    await client.query('COMMIT');
    res.json((await pool.query(DRUG_CAT_SELECT + ' WHERE c.key = $1', [cur.key])).rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// Remove - only a category no drug carries (active or not). Otherwise 409 with the number:
// hide it instead.
router.delete('/drug-categories/:key', permMiddleware('settings'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = await client.query('SELECT * FROM drug_category WHERE key = $1 FOR UPDATE', [req.params.key]);
    if (!was.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const cat = was.rows[0];
    if (cat.key === DRUG_CAT_FIXED) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DRUG_CATEGORY_FIXED }); }
    const n = (await client.query('SELECT COUNT(*)::int AS n FROM drug WHERE category = $1', [cat.key])).rows[0].n;
    if (n > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: drugMsg.categoryInUse(n), drug_count: n }); }
    await client.query('DELETE FROM drug_category WHERE key = $1', [cat.key]);
    await writeAudit(client, req, { action: ACTIONS.DRUG_CATEGORY, entity: 'drug_category', entity_id: cat.key,
      summary: cat.key + ' ' + cat.name_fr, before: drugCatAudit(cat), after: null });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// ── DIAGNOSIS LIST ──
// The list of frequent diagnoses the consultation screen searches (diagnosis_code, migration
// 050, made by the consultation session, which reads the active rows through its own route
// GET /consultations/diagnosis-codes). Here the clinic keeps it: every row - switched off
// ones too - added, edited, switched off and on, put in order.
//   - No delete. A row switched off leaves the doctor's search; the lines of patients that
//     were picked from it keep pointing at it and still read in the screen's language (a
//     line has its own copy of the code and the name either way, so nothing in a record
//     changes when a row is edited).
//   - The code is free text: not tied to a coding system, not unique (two wordings may
//     share a code - the screen says so, the server does not refuse), and may be empty.
//     Only the English name is required: it is what a screen falls back on.
//   - A change is one line in the change log (code, names, status); the order is not.
const DX_SELECT = 'SELECT id, code, name_en, name_fr, name_ko, is_active, sort_order FROM diagnosis_code';
const DX_ORDER = ' ORDER BY sort_order, id';
const DX_TEXT = ['code', 'name_en', 'name_fr', 'name_ko'];
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// The fields the body holds, cleaned: { fields } or { error }. Text is trimmed and inner
// runs of blanks made one; empty is NULL. Only what is sent is written (the on/off switch
// of the list sends is_active alone).
function diagnosisFields(body, creating) {
  const b = body || {}, f = {};
  for (const k of DX_TEXT) {
    if (!has(b, k)) continue;
    const v = String(b[k] == null ? '' : b[k]).replace(/\s+/g, ' ').trim();
    if (v.length > (k === 'code' ? 20 : 200)) return { error: k === 'code' ? MSG.DIAGNOSIS_CODE_LONG : MSG.DIAGNOSIS_NAME_LONG };
    f[k] = v || null;
  }
  if ((creating || has(f, 'name_en')) && !f.name_en) return { error: MSG.DIAGNOSIS_NAME_REQUIRED };
  if (has(b, 'is_active')) {
    if (typeof b.is_active !== 'boolean') return { error: fieldMsg.notOneOf('is_active', ['true', 'false']) };
    f.is_active = b.is_active;
  }
  return { fields: f };
}
// What a change-log line says of a row.
const diagnosisLogged = r => ({ code: r.code, name_en: r.name_en, name_fr: r.name_fr, name_ko: r.name_ko, status: r.is_active ? 'active' : 'inactive' });
const diagnosisSummary = r => [r.code, r.name_en].filter(Boolean).join(' ');

router.get('/diagnosis-codes', permMiddleware('settings'), async (req, res) => {
  try { res.json((await pool.query(DX_SELECT + DX_ORDER)).rows); }
  catch (err) { sendDbError(res, err); }
});

// A new row goes to the end of the list.
router.post('/diagnosis-codes', permMiddleware('settings'), async (req, res) => {
  const c = diagnosisFields(req.body, true);
  if (c.error) return res.status(400).json({ error: c.error });
  const f = c.fields;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const made = (await client.query(
      `INSERT INTO diagnosis_code (code, name_en, name_fr, name_ko, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM diagnosis_code))
       RETURNING id, code, name_en, name_fr, name_ko, is_active, sort_order`,
      [f.code || null, f.name_en, f.name_fr || null, f.name_ko || null, f.is_active !== false])).rows[0];
    await writeAudit(client, req, { action: ACTIONS.DIAGNOSIS_CODE, entity: 'diagnosis_code', entity_id: made.id,
      summary: diagnosisSummary(made), before: null, after: diagnosisLogged(made) });
    await client.query('COMMIT');
    res.status(201).json(made);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// The order of the whole list at once: every id, as the rows should be listed.
router.put('/diagnosis-codes/order', permMiddleware('settings'), async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const have = new Set((await client.query('SELECT id FROM diagnosis_code FOR UPDATE')).rows.map(r => r.id));
    const same = ids.length === have.size && new Set(ids).size === ids.length && ids.every(id => have.has(id));
    if (!same) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DIAGNOSIS_ORDER }); }
    await client.query(
      `UPDATE diagnosis_code d SET sort_order = o.n * 10, updated_at = NOW()
         FROM unnest($1::int[]) WITH ORDINALITY AS o(id, n)
        WHERE d.id = o.id AND d.sort_order IS DISTINCT FROM o.n * 10`, [ids]);
    await client.query('COMMIT');
    res.json((await pool.query(DX_SELECT + DX_ORDER)).rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

router.put('/diagnosis-codes/:id', permMiddleware('settings'), async (req, res) => {
  const c = diagnosisFields(req.body, false);
  if (c.error) return res.status(400).json({ error: c.error });
  const f = c.fields;
  if (!/^\d+$/.test(String(req.params.id))) return res.status(404).json({ error: MSG.NOT_FOUND });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const was = (await client.query(DX_SELECT + ' WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!was) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const sets = [], vals = [];
    Object.keys(f).forEach(k => { vals.push(f[k]); sets.push(k + ' = $' + vals.length); });
    let now = was;
    if (sets.length) {
      vals.push(was.id);
      now = (await client.query('UPDATE diagnosis_code SET ' + sets.join(', ') + ', updated_at = NOW() WHERE id = $' + vals.length +
        ' RETURNING id, code, name_en, name_fr, name_ko, is_active, sort_order', vals)).rows[0];
      await writeAudit(client, req, { action: ACTIONS.DIAGNOSIS_CODE, entity: 'diagnosis_code', entity_id: was.id,
        summary: diagnosisSummary(now), before: diagnosisLogged(was), after: diagnosisLogged(now) });
    }
    await client.query('COMMIT');
    res.json(now);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
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
    const { name, name_en, name_fr, address, phone, email, working_hours, app_title, mobile_hint, receipt_paper } = req.body;
    // mobile_hint (058): the note on the phone page. Not sent (an older screen): kept;
    // sent empty: cleared, and the phone page shows nothing.
    const hintSent = mobile_hint !== undefined;
    const hint = mobile_hint == null ? null : (String(mobile_hint).trim() || null);
    // receipt_paper (061): A4 or A5 for the receipts. Not sent or empty: kept.
    const paper = receipt_paper === undefined || receipt_paper === null || receipt_paper === '' ? null : String(receipt_paper).trim().toUpperCase();
    if (paper !== null && !RECEIPT_PAPERS.includes(paper)) return res.status(400).json({ error: fieldMsg.notOneOf('receipt_paper', RECEIPT_PAPERS) });
    const result = await pool.query(
      'UPDATE clinic SET name=$1, name_en=$2, name_fr=$3, address=$4, phone=$5, email=$6, working_hours=$7, app_title=COALESCE($8, app_title), mobile_hint=CASE WHEN $9::boolean THEN $10 ELSE mobile_hint END, receipt_paper=COALESCE($11, receipt_paper), updated_at=NOW() WHERE id=1 RETURNING *',
      // U5 (2026-09-29): an emptied title goes back to the default (011) instead of
      // silently keeping the old one. Not sent at all (an older screen): kept (NULL).
      [name, name_en, name_fr, address, phone, email, working_hours,
       app_title === undefined || app_title === null ? null : (String(app_title).trim() || 'Bethesda EMR'),
       hintSent, hint, paper]
    );
    res.json(result.rows[0]);
  } catch (err) { sendDbError(res, err); }
});

// The languages the clinic uses (066; the clinic's manager, 2026-11-11). Its own route: the
// form above sends the whole clinic row, and the Languages tab knows nothing of it.
// Everyone reads them (GET /clinic, and GET /auth/setup-status before signing in).
router.put('/clinic/languages', permMiddleware('settings'), async (req, res) => {
  const clean = cleanLanguages(req.body ? req.body.languages : undefined);
  if (clean.error === 'none') return res.status(400).json({ error: MSG.LANG_NEED_ONE });
  if (clean.error) return res.status(400).json({ error: fieldMsg.notOneOf('languages', LANGS) });
  try {
    const result = await pool.query('UPDATE clinic SET languages = $1, updated_at = NOW() WHERE id = 1 RETURNING languages', [clean.value]);
    if (sentMissing(res, result)) return;
    res.json({ languages: readLanguages(result.rows[0].languages) });
  } catch (err) { sendDbError(res, err); }
});

// The clinic's money (067; the clinic's manager, 2026-11-12: "this could not be used in
// another country"). Its own route, as the languages: the clinic form sends the whole row
// and knows nothing of it. Everyone reads it (GET /clinic, GET /auth/setup-status).
router.put('/clinic/currency', permMiddleware('settings'), async (req, res) => {
  const clean = cleanCurrency(req.body);
  if (clean.error === 'symbol') return res.status(400).json({ error: MSG.CURRENCY_SYMBOL });
  if (clean.error === 'position') return res.status(400).json({ error: fieldMsg.notOneOf('position', CURRENCY_POSITIONS) });
  if (clean.error === 'decimals') return res.status(400).json({ error: fieldMsg.notOneOf('decimals', ['0', '2']) });
  if (clean.error) return res.status(400).json({ error: MSG.CURRENCY_QUICK });
  try {
    const v = clean.value;
    const result = await pool.query(
      'UPDATE clinic SET currency_symbol = $1, currency_position = $2, currency_decimals = $3, cash_quick = $4, updated_at = NOW() WHERE id = 1 RETURNING currency_symbol, currency_position, currency_decimals, cash_quick',
      [v.symbol, v.position, v.decimals, v.quick]);
    if (sentMissing(res, result)) return;
    res.json({ currency: readCurrency(result.rows[0]) });
  } catch (err) { sendDbError(res, err); }
});

module.exports = router;
