const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authMiddleware, generateToken, effectivePerms } = require('../middleware/auth');

const router = express.Router();

// First-run setup: true when the system has no active admin account yet.
async function noAdminExists() {
  const r = await pool.query("SELECT COUNT(*)::int AS n FROM staff WHERE role = 'admin' AND status = 'active'");
  return r.rows[0].n === 0;
}

// GET /api/auth/setup-status — frontend shows the setup wizard when needsSetup is true.
router.get('/setup-status', async (req, res) => {
  try { res.json({ needsSetup: await noAdminExists() }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/setup — create the first admin account. Only works while no admin exists,
// so it can't be used to escalate privileges once the system is set up.
router.post('/setup', async (req, res) => {
  try {
    if (!(await noAdminExists())) return res.status(403).json({ error: 'Setup already completed' });
    const login_id = String(req.body.login_id || '').trim();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim() || 'Administrator';
    if (!login_id || !password) return res.status(400).json({ error: 'Login ID and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const allPerms = ['registration', 'consultation', 'payment', 'pharmacy', 'lab', 'stats', 'settings'];
    const r = await pool.query(
      "INSERT INTO staff (login_id, password_hash, name, role, permissions, status) " +
      "VALUES ($1, crypt($2, gen_salt('bf')), $3, 'admin', $4, 'active') " +
      "RETURNING id, login_id, name, role, permissions, department_id",
      [login_id, password, name, allPerms]
    );
    const user = r.rows[0];
    await pool.query('UPDATE staff SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, login_id: user.login_id, name: user.name, role: user.role, permissions: effectivePerms(user), department_id: user.department_id } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Login ID already exists' });
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      return res.status(400).json({ error: 'Login ID and password required' });
    }
    const result = await pool.query(
      'SELECT id, login_id, password_hash, name, role, permissions, department_id, phone, status FROM staff WHERE login_id = $1',
      [login_id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }
    // Compare password using pgcrypto-compatible check
    const pwCheck = await pool.query(
      "SELECT (password_hash = crypt($1, password_hash)) AS valid FROM staff WHERE id = $2",
      [password, user.id]
    );
    if (!pwCheck.rows[0].valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Update last_login
    await pool.query('UPDATE staff SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, login_id: user.login_id, name: user.name, role: user.role, permissions: effectivePerms(user), department_id: user.department_id }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.id, s.login_id, s.name, s.role, s.permissions, s.department_id, s.phone, d.code as dept_code, d.name as dept_name FROM staff s LEFT JOIN department d ON s.department_id = d.id WHERE s.id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
