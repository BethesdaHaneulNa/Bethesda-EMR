const express = require('express');
const router = express.Router();
const { authMiddleware, permMiddleware, effectivePerms } = require('../middleware/auth');
const backup = require('../services/backup');

function summary(b) { return b ? { name: b.name, size: b.size, mtime: b.mtime } : null; }

// Backup status + list (any authenticated user can see whether backups are on).
router.get('/status', authMiddleware, (req, res) => {
  const c = backup.cfg();
  const h = backup.health();
  // pg_dump's own words on failure name hosts and databases; that is for whoever
  // can act on it, not for every logged-in screen.
  const canManage = effectivePerms(req.user).indexOf('settings') >= 0;
  const last = h.lastAttempt ? {
    at: h.lastAttempt.at, ok: h.lastAttempt.ok, trigger: h.lastAttempt.trigger,
    file: h.lastAttempt.file || null, error: canManage ? (h.lastAttempt.error || null) : null,
  } : null;
  res.json({
    enabled: c.enabled,
    custom: c.custom,
    hostPath: c.hostPath,
    retentionDays: c.retentionDays,
    minKeep: c.minKeep,
    staleHours: c.staleHours,
    time: c.time,
    state: h.state,
    running: h.running,
    newestAgeHours: h.hours == null ? null : Math.round(h.hours),
    lastAttempt: last,
    count: h.count,
    last: summary(h.newest),
    backups: h.list.map(summary),
  });
});

// Trigger a backup now (settings permission). If one is already running - the nightly
// one, or someone else's press - this waits for it and returns its result.
router.post('/run', authMiddleware, permMiddleware('settings'), async (req, res) => {
  const r = await backup.runBackup('manual');
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
