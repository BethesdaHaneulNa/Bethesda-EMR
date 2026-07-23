// Is the system actually working?
//
// "The containers are running" is not the same question. A container can sit
// there answering HTTP while the thing it is supposed to do quietly stopped
// happening -- that is exactly how the worklist bridge could fail for hours
// with nobody the wiser. Each check below asks whether the work is getting
// done, and returns a translation key rather than a sentence, because the
// people reading this screen work in French and Malagasy.
const express = require('express');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { tcpCheck } = require('../utils/tcpCheck');
const { listBackups, cfg: backupCfg } = require('../services/backup');

const router = express.Router();

// The bridge reports every POLL_SECONDS (15 by default). Three missed reports
// is a real outage rather than one slow cycle or a restart.
const BRIDGE_STALE_SECONDS = 60;
// Backups run nightly, so a day and a half of silence means one was missed.
const BACKUP_STALE_HOURS = 36;
const DISK_WARN_FREE_GB = 20;
const DISK_DOWN_FREE_GB = 5;

// 'ok' working | 'warn' working but needs attention | 'down' not working
// | 'off' not set up on this site (the PACS is optional)
const RANK = { ok: 0, off: 0, warn: 1, down: 2 };
function worst(states) {
  return states.reduce((acc, s) => (RANK[s] > RANK[acc] ? s : acc), 'ok');
}

async function checkDatabase() {
  const started = Date.now();
  try {
    await pool.query('SELECT 1');
    return { key: 'database', state: 'ok', message: 'status.db.ok', values: { ms: Date.now() - started } };
  } catch (err) {
    // Nothing works without this one: no records, no payments, no login.
    return { key: 'database', state: 'down', message: 'status.db.down', values: { error: err.message } };
  }
}

async function checkDisk() {
  try {
    const st = await fs.promises.statfs(backupCfg().dir);
    const freeGb = (st.bsize * st.bavail) / 1e9;
    const totalGb = (st.bsize * st.blocks) / 1e9;
    const values = { free_gb: Math.round(freeGb), total_gb: Math.round(totalGb) };
    // A full disk stops the database from writing and the backups from being
    // taken, and it fills up long before anyone thinks to look at it.
    if (freeGb < DISK_DOWN_FREE_GB) return { key: 'disk', state: 'down', message: 'status.disk.full', values };
    if (freeGb < DISK_WARN_FREE_GB) return { key: 'disk', state: 'warn', message: 'status.disk.low', values };
    return { key: 'disk', state: 'ok', message: 'status.disk.ok', values };
  } catch (err) {
    return { key: 'disk', state: 'warn', message: 'status.disk.unknown', values: { error: err.message } };
  }
}

function checkBackup() {
  const backups = listBackups();
  if (!backups.length) {
    return { key: 'backup', state: 'warn', message: 'status.backup.none', values: {} };
  }
  const hours = (Date.now() - new Date(backups[0].mtime).getTime()) / 3600000;
  const values = { hours: Math.round(hours), name: backups[0].name, count: backups.length };
  // Not urgent today, but this is the check that matters on the day the disk
  // dies -- and it is the one nobody notices has been failing for a month.
  if (hours > BACKUP_STALE_HOURS) return { key: 'backup', state: 'warn', message: 'status.backup.stale', values };
  return { key: 'backup', state: 'ok', message: 'status.backup.ok', values };
}

async function checkBridge() {
  const r = await pool.query(`SELECT last_seen, ok, detail FROM service_heartbeat WHERE name = 'worklist_bridge'`);
  if (!r.rows.length) {
    // Never reported at all: this clinic does not run the imaging bridge.
    return { key: 'bridge', state: 'off', message: 'status.bridge.off', values: {} };
  }
  const row = r.rows[0];
  const seconds = Math.round((Date.now() - new Date(row.last_seen).getTime()) / 1000);
  const detail = row.detail || {};
  const values = {
    seconds, minutes: Math.round(seconds / 60),
    synced: detail.synced || 0, failed: detail.failed || 0,
    error: detail.error || '',
  };
  // Silence is the failure we are looking for: the bridge stopped, and the
  // devices are still showing whatever worklist they had last.
  if (seconds > BRIDGE_STALE_SECONDS) return { key: 'bridge', state: 'down', message: 'status.bridge.silent', values };
  if (!row.ok) return { key: 'bridge', state: 'down', message: 'status.bridge.failing', values };
  if (values.failed > 0) return { key: 'bridge', state: 'warn', message: 'status.bridge.partial', values };
  return { key: 'bridge', state: 'ok', message: 'status.bridge.ok', values };
}

async function checkPacs() {
  const r = await pool.query('SELECT worklist_scp_host, worklist_scp_port FROM pacs_config WHERE id = 1');
  const cfg = r.rows[0] || {};
  if (!cfg.worklist_scp_host) {
    return { key: 'pacs', state: 'off', message: 'status.pacs.off', values: {} };
  }
  const result = await tcpCheck(cfg.worklist_scp_host, cfg.worklist_scp_port);
  const values = { host: cfg.worklist_scp_host, port: cfg.worklist_scp_port };
  if (!result.ok) return { key: 'pacs', state: 'down', message: 'status.pacs.unreachable', values: { ...values, error: result.message } };
  return { key: 'pacs', state: 'ok', message: 'status.pacs.ok', values };
}

// Any logged-in member of staff can see this. Whoever notices the red dot is
// whoever happens to be at a screen, and making them fetch someone with the
// settings permission defeats the point of showing it.
router.get('/status', authMiddleware, async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkDisk(),
    Promise.resolve(checkBackup()),
    // The database being down takes these with it; report that rather than a stack trace.
    checkBridge().catch(err => ({ key: 'bridge', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkPacs().catch(err => ({ key: 'pacs', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
  ]);
  res.json({
    overall: worst(checks.map(c => c.state)),
    checked_at: new Date().toISOString(),
    services: checks,
  });
});

module.exports = router;
