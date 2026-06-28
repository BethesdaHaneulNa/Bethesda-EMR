const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getVersionInfo } = require('../services/version');

// GET /api/version  — current build vs latest GitHub release (cached). ?force=1 to re-check now.
router.get('/', authMiddleware, async (req, res) => {
  try { res.json(await getVersionInfo(req.query.force === '1')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
