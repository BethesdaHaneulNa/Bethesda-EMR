// Folders, and folders inside folders, for the lab tests and the order sets (065, 1.8.0).
//
// The clinic's manager, 2026-11-10: Settings > Lab items and Settings > Order sets become a
// list on the left that shows everything, filed in folders the clinic makes itself; the
// consultation screen's order-set tab shows the same folders. This router keeps the two
// trees (kind 'lab' and 'orderset'); what is inside a lab test or an order set stays with
// lab.routes.js and orderset.routes.js.
//
//   GET    /api/folders/tree?kind=          folders + what is filed (one request per screen)
//   POST   /api/folders                     { kind, parent_id, name }
//   PUT    /api/folders/order               { kind, parent_id, ids }   the order of siblings
//   PUT    /api/folders/place               { kind, id, folder_id }    file a test / a set
//   PUT    /api/folders/:id                 { name?, parent_id? }      rename, move
//   DELETE /api/folders/:id                 an empty folder only
//
// Reading: the screens that show the trees (Settings; consultation for the order sets; the
// lab for its own tests). Writing: Settings only. Every change is one line of the change
// log (settings.folder).
const express = require('express');
const { pool } = require('../config/database');
const { sendDbError } = require('../utils/dbError');
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const { writeAudit, ACTIONS } = require('../utils/audit');

const router = express.Router();
router.use(authMiddleware);

const canRead = permMiddleware('settings', 'consultation', 'lab');
const canWrite = permMiddleware('settings');

// Fixed English texts; the screens match on them (FolderTree users: settingsMessages.js).
const MSG = {
  KIND: 'kind must be lab or orderset',
  NAME: 'A folder needs a name (80 characters at most)',
  EXISTS: 'A folder of this name is already here',
  PARENT: 'The folder it goes into does not exist',
  DEEP: 'Folders can be five levels deep at most',
  INSIDE_ITSELF: 'A folder cannot be moved into itself',
  NOT_EMPTY: 'This folder is not empty: move or remove what is in it first',
  NOT_FOUND: 'Not found',
  ITEM: 'Nothing to file under this number',
};
const KINDS = ['lab', 'orderset'];
const MAX_DEPTH = 5;
const ID_RE = /^\d{1,9}$/;
const idOrNull = (v) => (v === undefined || v === null || v === '' ? null : (ID_RE.test(String(v)) ? Number(v) : NaN));
function cleanName(v) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s && s.length <= 80 ? s : null;
}
// One lock for all folder changes: two moves at once could each look fine and together
// make a loop or a sixth level.
const lockTree = (client) => client.query("SELECT pg_advisory_xact_lock(hashtext('bethesda.item_folder'))");
const allOf = async (db, kind) => (await db.query('SELECT id, parent_id, name, sort_order FROM item_folder WHERE kind = $1 ORDER BY sort_order, lower(name), id', [kind])).rows;
// level of a folder (1 = top) and how many levels hang under it
function depthOf(rows, id) { let d = 0, cur = id; const by = {}; rows.forEach(r => { by[r.id] = r; }); while (cur != null && by[cur] && d < 50) { d++; cur = by[cur].parent_id; } return d; }
function heightOf(rows, id) { const kids = rows.filter(r => r.parent_id === id); return 1 + (kids.length ? Math.max.apply(null, kids.map(k => heightOf(rows, k.id))) : 0); }
function isInside(rows, id, maybeAncestor) { const by = {}; rows.forEach(r => { by[r.id] = r; }); let cur = id, n = 0; while (cur != null && by[cur] && n++ < 50) { if (cur === maybeAncestor) return true; cur = by[cur].parent_id; } return false; }
function pathOf(rows, id) { const by = {}; rows.forEach(r => { by[r.id] = r; }); const parts = []; let cur = id, n = 0; while (cur != null && by[cur] && n++ < 50) { parts.unshift(by[cur].name); cur = by[cur].parent_id; } return parts.join(' / '); }

// What is filed, per kind. count: the items of a lab test, the lines of an order set.
const ITEMS_SQL = {
  lab: `SELECT oc.id, oc.code, oc.name, oc.lab_folder_id AS folder_id, oc.is_active,
               (SELECT COUNT(*)::int FROM lab_test_item i WHERE i.order_code_id = oc.id) AS count
          FROM order_code oc WHERE oc.code_type = 'lab' AND oc.is_active = true
         ORDER BY lower(oc.name), oc.id`,
  orderset: `SELECT os.id, os.name, os.folder_id, d.code AS dept_code, os.department_id,
                    (SELECT COUNT(*)::int FROM order_set_item i WHERE i.set_id = os.id) AS count
               FROM order_set os LEFT JOIN department d ON d.id = os.department_id
              WHERE os.is_active = true
              ORDER BY os.sort_order, lower(os.name), os.id`,
};

router.get('/tree', canRead, async (req, res) => {
  const kind = String(req.query.kind || '');
  if (KINDS.indexOf(kind) < 0) return res.status(400).json({ error: MSG.KIND });
  try {
    const folders = await allOf(pool, kind);
    const items = (await pool.query(ITEMS_SQL[kind])).rows;
    res.json({ kind, folders, items });
  } catch (err) { sendDbError(res, err); }
});

router.post('/', canWrite, async (req, res) => {
  const kind = String((req.body || {}).kind || '');
  if (KINDS.indexOf(kind) < 0) return res.status(400).json({ error: MSG.KIND });
  const name = cleanName(req.body.name);
  if (!name) return res.status(400).json({ error: MSG.NAME });
  const parentId = idOrNull(req.body.parent_id);
  if (Number.isNaN(parentId)) return res.status(400).json({ error: MSG.PARENT });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockTree(client);
    const rows = await allOf(client, kind);
    if (parentId !== null && !rows.some(r => r.id === parentId)) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.PARENT }); }
    if ((parentId === null ? 0 : depthOf(rows, parentId)) + 1 > MAX_DEPTH) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DEEP }); }
    if (rows.some(r => r.parent_id === parentId && r.name.toLowerCase() === name.toLowerCase())) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.EXISTS }); }
    const made = (await client.query(
      `INSERT INTO item_folder (kind, parent_id, name, sort_order)
       VALUES ($1::varchar, $2::int, $3, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM item_folder WHERE kind = $1::varchar AND parent_id IS NOT DISTINCT FROM $2::int))
       RETURNING id, parent_id, name, sort_order`, [kind, parentId, name])).rows[0];
    await writeAudit(client, req, { action: ACTIONS.FOLDER, entity: 'item_folder', entity_id: made.id,
      summary: kind + ': ' + pathOf(rows.concat([made]), made.id), before: null, after: { name: made.name, parent_id: made.parent_id } });
    await client.query('COMMIT');
    res.status(201).json(made);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    if (err && err.code === '23505') return res.status(409).json({ error: MSG.EXISTS });
    sendDbError(res, err);
  } finally { client.release(); }
});

// The order of the folders that sit side by side: all of them, in the order wanted.
router.put('/order', canWrite, async (req, res) => {
  const kind = String((req.body || {}).kind || '');
  if (KINDS.indexOf(kind) < 0) return res.status(400).json({ error: MSG.KIND });
  const parentId = idOrNull(req.body.parent_id);
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(idOrNull) : null;
  if (Number.isNaN(parentId) || !ids || ids.some(x => x === null || Number.isNaN(x)) || new Set(ids).size !== ids.length) return res.status(400).json({ error: MSG.PARENT });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockTree(client);
    const sibs = (await allOf(client, kind)).filter(r => r.parent_id === parentId).map(r => r.id);
    // exactly the folders that are there: a list from a stale screen changes nothing
    if (sibs.length !== ids.length || sibs.some(id => ids.indexOf(id) < 0)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.NOT_FOUND }); }
    for (let i = 0; i < ids.length; i++) await client.query('UPDATE item_folder SET sort_order = $2, updated_at = NOW() WHERE id = $1', [ids[i], (i + 1) * 10]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

// File a lab test or an order set in a folder (folder_id null = the top level).
router.put('/place', canWrite, async (req, res) => {
  const kind = String((req.body || {}).kind || '');
  if (KINDS.indexOf(kind) < 0) return res.status(400).json({ error: MSG.KIND });
  const itemId = idOrNull(req.body.id), folderId = idOrNull(req.body.folder_id);
  if (itemId === null || Number.isNaN(itemId)) return res.status(404).json({ error: MSG.ITEM });
  if (Number.isNaN(folderId)) return res.status(400).json({ error: MSG.PARENT });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (folderId !== null && !(await client.query('SELECT 1 FROM item_folder WHERE id = $1 AND kind = $2 FOR SHARE', [folderId, kind])).rows.length) {
      await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.PARENT });
    }
    const r = kind === 'lab'
      ? await client.query("UPDATE order_code SET lab_folder_id = $2::int, updated_at = NOW() WHERE id = $1 AND code_type = 'lab' RETURNING id", [itemId, folderId])
      : await client.query('UPDATE order_set SET folder_id = $2::int, updated_at = NOW() WHERE id = $1 RETURNING id', [itemId, folderId]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.ITEM }); }
    await client.query('COMMIT');
    res.json({ success: true, id: itemId, folder_id: folderId });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    sendDbError(res, err);
  } finally { client.release(); }
});

router.put('/:id', canWrite, async (req, res) => {
  if (!ID_RE.test(String(req.params.id))) return res.status(404).json({ error: MSG.NOT_FOUND });
  const id = Number(req.params.id), body = req.body || {};
  const renaming = Object.prototype.hasOwnProperty.call(body, 'name');
  const moving = Object.prototype.hasOwnProperty.call(body, 'parent_id');
  const name = renaming ? cleanName(body.name) : null;
  if (renaming && !name) return res.status(400).json({ error: MSG.NAME });
  const parentId = moving ? idOrNull(body.parent_id) : null;
  if (moving && Number.isNaN(parentId)) return res.status(400).json({ error: MSG.PARENT });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockTree(client);
    const me = (await client.query('SELECT id, kind, parent_id, name, sort_order FROM item_folder WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!me) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const rows = await allOf(client, me.kind);
    const toParent = moving ? parentId : me.parent_id, toName = renaming ? name : me.name;
    if (moving && toParent !== me.parent_id) {
      if (toParent !== null && !rows.some(r => r.id === toParent)) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.PARENT }); }
      if (toParent !== null && isInside(rows, toParent, id)) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.INSIDE_ITSELF }); }
      if ((toParent === null ? 0 : depthOf(rows, toParent)) + heightOf(rows, id) > MAX_DEPTH) { await client.query('ROLLBACK'); return res.status(400).json({ error: MSG.DEEP }); }
    }
    if (rows.some(r => r.id !== id && r.parent_id === toParent && r.name.toLowerCase() === toName.toLowerCase())) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.EXISTS }); }
    const now = (await client.query(
      `UPDATE item_folder SET name = $2, parent_id = $3::int, updated_at = NOW(),
              sort_order = CASE WHEN parent_id IS NOT DISTINCT FROM $3::int THEN sort_order
                                ELSE (SELECT COALESCE(MAX(f.sort_order), 0) + 10 FROM item_folder f WHERE f.kind = $4::varchar AND f.parent_id IS NOT DISTINCT FROM $3::int) END
        WHERE id = $1 RETURNING id, parent_id, name, sort_order`, [id, toName, toParent, me.kind])).rows[0];
    await writeAudit(client, req, { action: ACTIONS.FOLDER, entity: 'item_folder', entity_id: id, summary: me.kind + ': ' + pathOf(rows, id),
      before: { name: me.name, parent_id: me.parent_id }, after: { name: now.name, parent_id: now.parent_id } });
    await client.query('COMMIT');
    res.json(now);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    if (err && err.code === '23505') return res.status(409).json({ error: MSG.EXISTS });
    sendDbError(res, err);
  } finally { client.release(); }
});

router.delete('/:id', canWrite, async (req, res) => {
  if (!ID_RE.test(String(req.params.id))) return res.status(404).json({ error: MSG.NOT_FOUND });
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockTree(client);
    const me = (await client.query('SELECT id, kind, parent_id, name FROM item_folder WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!me) { await client.query('ROLLBACK'); return res.status(404).json({ error: MSG.NOT_FOUND }); }
    const rows = await allOf(client, me.kind);
    // What the list shows in it: sub-folders, lab tests that are not hidden, order sets
    // that are not switched off. A folder holding only a hidden test looked empty and could
    // not be removed; such a test simply loses its folder (the column is ON DELETE SET
    // NULL) and is at the top level if it is ever shown again.
    const inside = (await client.query(
      `SELECT (SELECT COUNT(*) FROM item_folder WHERE parent_id = $1)
            + (SELECT COUNT(*) FROM order_set WHERE folder_id = $1 AND is_active = true)
            + (SELECT COUNT(*) FROM order_code WHERE lab_folder_id = $1 AND is_active = true AND code_type = 'lab') AS n`, [id])).rows[0].n;
    if (Number(inside) > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: MSG.NOT_EMPTY }); }
    await client.query('DELETE FROM item_folder WHERE id = $1', [id]);
    await writeAudit(client, req, { action: ACTIONS.FOLDER, entity: 'item_folder', entity_id: id, summary: me.kind + ': ' + pathOf(rows, id),
      before: { name: me.name, parent_id: me.parent_id }, after: null });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* not in a transaction */ }
    if (err && err.code === '23503') return res.status(409).json({ error: MSG.NOT_EMPTY });
    sendDbError(res, err);
  } finally { client.release(); }
});

module.exports = router;
module.exports.MSG = MSG;
