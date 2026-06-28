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
    custom: c.custom,
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

// Download a backup file so it can be saved to a USB / another drive (settings permission).
router.get('/download/:name', authMiddleware, permMiddleware('settings'), (req, res) => {
  const full = backup.resolveBackup(req.params.name);
  if (!full) return res.status(404).json({ error: 'Backup not found' });
  res.download(full, req.params.name);
});

module.exports = router;
