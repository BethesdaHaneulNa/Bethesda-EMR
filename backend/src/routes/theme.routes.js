// The screen a member of staff chose: dark, light or paper (design session, migrations
// 037 and 902; paper was added on 2026-10-01).
//
// Decided by the director on 2026-09-29: remembered per account, so the choice follows
// the person from one PC to the next. Anyone signed in may read and change their own -
// there is no module permission to hold, and no way to name another account: the id
// comes from the token, never from the request.
//
// Not written to the change log (audit_log). It is a preference, not clinical or
// financial data, and a line for every press of the switch would bury the lines that
// matter.
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const THEMES = ['dark', 'light', 'paper'];

// GET /api/theme -> { theme: 'dark' | 'light' | 'paper' }
router.get('/', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT theme FROM staff WHERE id = $1', [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ theme: r.rows[0].theme });
  } catch (err) {
    console.error('Theme read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/theme { theme } -> { theme }
// Anything but the known values is refused rather than stored: the first-paint
// script in index.html ignores unknown values, so a stored one would silently leave the
// account on dark while the database said otherwise.
router.put('/', authMiddleware, async (req, res) => {
  const theme = req.body ? req.body.theme : undefined;
  if (typeof theme !== 'string' || THEMES.indexOf(theme) < 0) {
    return res.status(400).json({ error: "theme must be 'dark', 'light' or 'paper'" });
  }
  try {
    // updated_at is left alone: it says when the account itself was last changed.
    const r = await pool.query('UPDATE staff SET theme = $1 WHERE id = $2 RETURNING theme', [theme, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ theme: r.rows[0].theme });
  } catch (err) {
    console.error('Theme save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
