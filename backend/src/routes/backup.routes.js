const express = require('express');
const router = express.Router();
const { authMiddleware, permMiddleware } = require('../middleware/auth');
const backup = require('../services/backup');

// Backup status + list (any authenticated user can see whether backups are on).
router.get('/status', authMiddleware, (req, res) => {
  const c = backup.cfg();
  const list = backup.listBackups();
  res.json({
    enabled: c.enabled,
    hostPath: c.hostPath,
    retentionDays: c.retentionDays,
    time: c.time,
    count: list.length,
    last: list[0] ? { name: list[0].name, size: list[0].size, mtime: list[0].mtime } : null,
    backups: list.map(b => ({ name: b.name, size: b.size, mtime: b.mtime })),
  });
});

// Trigger a backup now (settings permission).
router.post('/run', authMiddleware, permMiddleware('settings'), async (req, res) => {
  const r = await backup.runBackup();
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

module.exports = router;
