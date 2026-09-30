const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, generateToken, effectivePerms, ALL_PERMS } = require('../middleware/auth');
// Messages shown to people - translated by the screen; see settings.messages.js.
const { MSG } = require('./settings.messages');
const { writeAudit, ACTIONS } = require('../utils/audit');

const router = express.Router();

// First-run setup: true when the system has no active admin account yet.
async function noAdminExists(db) {
  const r = await (db || pool).query("SELECT COUNT(*)::int AS n FROM staff WHERE role = 'admin' AND status = 'active'");
  return r.rows[0].n === 0;
}

// GET /api/auth/setup-status — frontend shows the setup wizard when needsSetup is true.
router.get('/setup-status', async (req, res) => {
  try { res.json({ needsSetup: await noAdminExists() }); }
  catch (err) { res.status(500).json({ error: MSG.SERVER_ERROR }); }
});

// POST /api/auth/setup — create the first admin account. Only works while no admin exists,
// so it can't be used to escalate privileges once the system is set up.
//
// S3 (2026-09-29, coordinator): the login id is always 'admin'. The protection against
// locking everyone out (admin.routes.js BOOTSTRAP_ADMIN_LOGIN) recognises the setup
// account by that id; a setup under another id had none of it. A login_id sent by an
// older screen is ignored.
// S9 (2026-09-29): one setup at a time. Two first-run screens submitted together each
// found no admin and both created one; the lock makes the second wait and then find the
// first. The check, the insert and the lock are one transaction.
const SETUP_LOGIN = 'admin';
router.post('/setup', async (req, res) => {
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim() || 'Administrator';
  if (!password) return res.status(400).json({ error: MSG.LOGIN_REQUIRED });
  if (password.length < 6) return res.status(400).json({ error: MSG.PASSWORD_TOO_SHORT });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('bethesda.setup'))");
    if (!(await noAdminExists(client))) { await client.query('ROLLBACK'); return res.status(403).json({ error: MSG.SETUP_DONE }); }
    const login_id = SETUP_LOGIN;
    const allPerms = ALL_PERMS.slice();   // a plain array for the pg driver, not the frozen one
    const r = await client.query(
      "INSERT INTO staff (login_id, password_hash, name, role, permissions, status) " +
      "VALUES ($1, crypt($2, gen_salt('bf')), $3, 'admin', $4, 'active') " +
      "RETURNING id, login_id, name, role, permissions, department_id, theme",
      [login_id, password, name, allPerms]
    );
    const user = r.rows[0];
    await client.query('UPDATE staff SET last_login = NOW() WHERE id = $1', [user.id]);
    await client.query('COMMIT');
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, login_id: user.login_id, name: user.name, role: user.role, permissions: effectivePerms(user), department_id: user.department_id, theme: user.theme } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* connection already out of the transaction */ }
    if (err.code === '23505') return res.status(409).json({ error: MSG.LOGIN_EXISTS });
    console.error('Setup error:', err);
    res.status(500).json({ error: MSG.SERVER_ERROR });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      return res.status(400).json({ error: MSG.LOGIN_REQUIRED });
    }
    const result = await pool.query(
      'SELECT id, login_id, password_hash, name, role, permissions, department_id, phone, status, theme FROM staff WHERE login_id = $1',
      [login_id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: MSG.INVALID_CREDENTIALS });
    }
    const user = result.rows[0];
    // Compare password using pgcrypto-compatible check
    const pwCheck = await pool.query(
      "SELECT (password_hash = crypt($1, password_hash)) AS valid FROM staff WHERE id = $2",
      [password, user.id]
    );
    if (!pwCheck.rows[0].valid) {
      return res.status(401).json({ error: MSG.INVALID_CREDENTIALS });
    }
    // S7 (2026-09-29): said only after the password was right. Before, "this account is
    // inactive" answered any password, telling whoever tried that the login id exists.
    // The person it is meant for still sees it, with their own password.
    if (user.status !== 'active') {
      return res.status(401).json({ error: MSG.ACCOUNT_INACTIVE });
    }
    // Update last_login
    await pool.query('UPDATE staff SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = generateToken(user);
    // theme (037, dark / light): the account's own screen, sent with the login so the page
    // can switch before it draws - when someone else signs in on the same PC, the screen
    // does not show the previous person's choice first (design session). Also in /me.
    res.json({
      token,
      user: { id: user.id, login_id: user.login_id, name: user.name, role: user.role, permissions: effectivePerms(user), department_id: user.department_id, theme: user.theme }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: MSG.SERVER_ERROR });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.id, s.login_id, s.name, s.role, s.permissions, s.department_id, s.phone, s.theme, d.code as dept_code, d.name as dept_name FROM staff s LEFT JOIN department d ON s.department_id = d.id WHERE s.id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: MSG.USER_NOT_FOUND });
    // The same shape of permissions as the login answer (never null), so a screen can
    // refresh its stored copy from here. Since the server reads permissions from the
    // database on every request (S1), the browser's copy from login is the only thing
    // still out of date when an admin changes them: an added permission stays out of the
    // menu, a removed one stays in it, until the next login.
    const row = result.rows[0];
    row.permissions = effectivePerms(row);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: MSG.SERVER_ERROR });
  }
});

// POST /api/auth/password - a member of staff changes their own password.
// Decided 2026-09-29: the initial password stays 1234 and is not forced to change,
// there is no minimum length (only not empty), and each person can change their own.
// The current password is asked for so that a screen left logged in cannot be used by
// someone else to take the account over.
//
// A wrong current password is 400, not 401: api/client.js treats any 401 as "the
// session ended" and returns to the login page, which would throw away the form.
// The check and the change are one UPDATE (WHERE the hash matches), so nothing can
// change in between. The change log gets one settings.staff.password line with no
// value, as when an admin sets it. Tokens already issued stay valid until they expire
// (the server checks the account's status and permissions on every request, not the
// password), so other screens where this person is logged in are not thrown out.
router.post('/password', authMiddleware, async (req, res) => {
  const current = String((req.body && req.body.current_password) || '');
  const next = String((req.body && req.body.new_password) || '');
  if (!current || !next) return res.status(400).json({ error: MSG.PASSWORD_REQUIRED });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE staff SET password_hash = crypt($1, gen_salt('bf')), updated_at = NOW()
        WHERE id = $2 AND status = 'active' AND password_hash = crypt($3, password_hash)
        RETURNING id, login_id, name`,
      [next, req.user.id, current]);
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: MSG.CURRENT_PASSWORD_WRONG });
    }
    const me = r.rows[0];
    await writeAudit(client, req, { action: ACTIONS.STAFF_PASSWORD, entity: 'staff', entity_id: me.id,
      summary: me.name ? me.name + ' (' + me.login_id + ')' : me.login_id });
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* connection already out of the transaction */ }
    console.error('Password change error:', err.message);
    res.status(500).json({ error: MSG.SERVER_ERROR });
  } finally {
    client.release();
  }
});

module.exports = router;
