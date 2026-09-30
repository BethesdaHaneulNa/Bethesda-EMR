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
const { health: backupHealth, cfg: backupCfg } = require('../services/backup');
const { newestBackupVersion } = require('../services/backup-version');
const { probeOrthanc, DEFAULT_URL: DEFAULT_ORTHANC_URL } = require('../services/pacs-probe');

const router = express.Router();

// The bridge reports every POLL_SECONDS (15 by default). Three missed reports
// is a real outage rather than one slow cycle or a restart.
const BRIDGE_STALE_SECONDS = 60;
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

// B7 (2026-09-29): two places can fill up - where the backups go (/backups, which
// BACKUP_PATH may put on another drive) and Docker's own disk, where the database lives
// (seen here as this container's root filesystem). Only the first was checked, so with
// the backups on D: a full C: went unnoticed. The fuller of the two decides.
async function freeOf(dir) {
  const st = await fs.promises.statfs(dir);
  return { free: (st.bsize * st.bavail) / 1e9, total: (st.bsize * st.blocks) / 1e9 };
}
async function checkDisk() {
  try {
    const bk = await freeOf(backupCfg().dir);
    let dk = null;
    try { dk = await freeOf('/'); } catch (e) { /* not readable here - the backup disk alone */ }
    const worst = dk && dk.free < bk.free ? dk : bk;
    const freeGb = worst.free, totalGb = worst.total;
    const values = { free_gb: Math.round(freeGb), total_gb: Math.round(totalGb),
      backup_free_gb: Math.round(bk.free), docker_free_gb: dk ? Math.round(dk.free) : null };
    // A full disk stops the database from writing and the backups from being
    // taken, and it fills up long before anyone thinks to look at it.
    if (freeGb < DISK_DOWN_FREE_GB) return { key: 'disk', state: 'down', message: 'status.disk.full', values };
    if (freeGb < DISK_WARN_FREE_GB) return { key: 'disk', state: 'warn', message: 'status.disk.low', values };
    return { key: 'disk', state: 'ok', message: 'status.disk.ok', values };
  } catch (err) {
    return { key: 'disk', state: 'warn', message: 'status.disk.unknown', values: { error: err.message } };
  }
}

// Same judgement as the Backup tab (services/backup.js health()), so the two can
// never disagree about whether last night worked.
async function checkBackup() {
  const h = backupHealth();
  if (h.state === 'none') {
    return { key: 'backup', state: 'warn', message: 'status.backup.none', values: {} };
  }
  const values = { hours: h.hours == null ? null : Math.round(h.hours), name: h.newest ? h.newest.name : null, count: h.count };
  // Not urgent today, but this is the check that matters on the day the disk
  // dies -- and it is the one nobody notices has been failing for a month.
  if (h.state === 'failed') return { key: 'backup', state: 'warn', message: 'status.backup.failed', values: { ...values, at: h.lastAttempt.at } };
  if (h.state === 'stale') return { key: 'backup', state: 'warn', message: 'status.backup.stale', values };
  // Recent, but from before the last update: it restores only with DEPLOYMENT.md 5b's
  // "older than the app" commands. Take a backup now (services/backup-version.js).
  const v = await newestBackupVersion();
  if (v.state === 'older') return { key: 'backup', state: 'warn', message: 'status.backup.oldVersion', values: { ...values, missing: v.missing } };
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
    // PACS P-20: the bridge also asks Orthanc which studies have arrived, so that
    // finished patients drop off the device worklist. When that question fails
    // (wrong Orthanc password, Orthanc down) the worklist itself still syncs and
    // everything above reads green - only the bridge log knew. Agreed field:
    // `arrivals_error`, a message, empty when fine. Until the bridge and the
    // heartbeat endpoint (both PACS) send it, it is simply absent.
    arrivals_error: detail.arrivals_error || '',
  };
  // Silence is the failure we are looking for: the bridge stopped, and the
  // devices are still showing whatever worklist they had last.
  if (seconds > BRIDGE_STALE_SECONDS) return { key: 'bridge', state: 'down', message: 'status.bridge.silent', values };
  if (!row.ok) return { key: 'bridge', state: 'down', message: 'status.bridge.failing', values };
  if (values.failed > 0) return { key: 'bridge', state: 'warn', message: 'status.bridge.partial', values };
  if (values.arrivals_error) return { key: 'bridge', state: 'warn', message: 'status.bridge.arrivals', values };
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

// The nightly image backup to an external disk (PACS image-backup.ps1, decision 41). It
// reports to POST /api/pacs/image-backup-report, kept as the 'pacs_image_backup'
// heartbeat (pacs.routes.js): ok, disk_found, error, free_gb, total_gb, last_success.
// Warn when the disk was not plugged in, the run failed, nothing has succeeded for
// IMAGE_BACKUP_STALE_HOURS, the job has stopped reporting, or the disk is nearly full.
const IMAGE_BACKUP_STALE_HOURS = 36;
async function checkImageBackup() {
  const r = await pool.query(`SELECT last_seen, ok, detail FROM service_heartbeat WHERE name = 'pacs_image_backup'`);
  if (!r.rows.length) return { key: 'pacs_image_backup', state: 'off', message: 'status.imageBackup.off', values: {} };
  const row = r.rows[0];
  const d = row.detail || {};
  const hoursSince = t => (t ? (Date.now() - new Date(t).getTime()) / 3600000 : null);
  const values = {
    last_seen: row.last_seen, last_success: d.last_success || null,
    hours_since_success: d.last_success ? Math.round(hoursSince(d.last_success)) : null,
    free_gb: d.free_gb, total_gb: d.total_gb, error: d.error || '',
  };
  if (hoursSince(row.last_seen) > IMAGE_BACKUP_STALE_HOURS) return { key: 'pacs_image_backup', state: 'warn', message: 'status.imageBackup.silent', values };
  if (d.disk_found === false) return { key: 'pacs_image_backup', state: 'warn', message: 'status.imageBackup.noDisk', values };
  if (!row.ok) return { key: 'pacs_image_backup', state: 'warn', message: 'status.imageBackup.failed', values };
  if (!d.last_success || hoursSince(d.last_success) > IMAGE_BACKUP_STALE_HOURS) return { key: 'pacs_image_backup', state: 'warn', message: 'status.imageBackup.stale', values };
  if (d.total_gb > 0 && d.free_gb / d.total_gb < 0.1) return { key: 'pacs_image_backup', state: 'warn', message: 'status.imageBackup.nearlyFull', values };
  return { key: 'pacs_image_backup', state: 'ok', message: 'status.imageBackup.ok', values };
}

// The copy of the EMR's own backups to the same external disk, made by the night image
// backup after the images (the director's decision, 2026-09-29: one external disk for
// both; PACS a2e0c10 / cfc434c). Its fields travel in the same report (pacs.routes.js
// /image-backup-report). A report from the older script has no emr_backup key at all:
// nothing is known, so the line is not shown (returns null). Late is judged on
// emr_backup_last_ok, stamped by the EMR's clock when the report arrives -
// emr_backup_newest is the time in the file name, which a time zone can shift.
const EMR_COPY_STALE_HOURS = 36;
async function checkEmrBackupCopy() {
  const r = await pool.query(`SELECT detail FROM service_heartbeat WHERE name = 'pacs_image_backup'`);
  const d = (r.rows[0] && r.rows[0].detail) || {};
  if (d.emr_backup === undefined) return null;
  const lastOk = d.emr_backup_last_ok ? new Date(d.emr_backup_last_ok).getTime() : NaN;
  const hours = isFinite(lastOk) ? Math.round((Date.now() - lastOk) / 3600000) : null;
  const values = {
    count: d.emr_backup_count == null ? null : d.emr_backup_count, newest: d.emr_backup_newest || '',
    hours_since_ok: hours, error: d.emr_backup_error || '',
  };
  const warn = message => ({ key: 'emr_backup_copy', state: 'warn', message, values });
  if (d.emr_backup === 'failed') return warn('status.emrBackupCopy.failed');
  if (d.emr_backup === 'no_disk') return warn('status.emrBackupCopy.noDisk');
  if (d.emr_backup === 'not_found') return warn('status.emrBackupCopy.notFound');
  if (hours === null) return warn(d.emr_backup === 'none' ? 'status.emrBackupCopy.none' : 'status.emrBackupCopy.never');
  if (hours > EMR_COPY_STALE_HOURS) return warn('status.emrBackupCopy.stale');
  return { key: 'emr_backup_copy', state: 'ok', message: 'status.emrBackupCopy.ok', values };
}

// Does the viewer relay reach the image server (services/pacs-probe.js)? The same
// request the relay makes, from inside the EMR's container. Off where the imaging is
// not paired (no stored password - the pacs_address line already says when it should
// be). The address is part of the values (it holds no secret) so the line can say
// which one failed.
async function checkPacsRelay() {
  const r = await pool.query('SELECT orthanc_url, orthanc_password FROM pacs_config WHERE id = 1');
  const cfg = r.rows[0] || {};
  if (!cfg.orthanc_password) return { key: 'pacs_relay', state: 'off', message: 'status.pacsRelay.off', values: {} };
  const url = cfg.orthanc_url || DEFAULT_ORTHANC_URL;
  const p = await probeOrthanc(url, cfg.orthanc_password, 4000);
  const values = { url, code: p.code == null ? null : p.code, version: p.version || '' };
  if (p.state === 'ok') return { key: 'pacs_relay', state: 'ok', message: 'status.pacsRelay.ok', values };
  return { key: 'pacs_relay', state: 'warn', message: RELAY_MESSAGES[p.state] || 'status.pacsRelay.refused', values };
}
// Written out (not built from the state) so settings.status.mjs finds each one.
const RELAY_MESSAGES = {
  refused: 'status.pacsRelay.refused', unknownHost: 'status.pacsRelay.unknownHost', timeout: 'status.pacsRelay.timeout',
  unauthorized: 'status.pacsRelay.unauthorized', notOrthanc: 'status.pacsRelay.notOrthanc', badAddress: 'status.pacsRelay.badAddress',
};

// Settings > order feed: the imaging settings the EMR itself needs.
//  - An address still on a port the EMR and the PACS left behind (EMR 8080 -> 9080, the
//    image server 8090 -> 9090, both because Windows reserves the old ones). Typed from
//    the old instructions, it stays in pacs_config and travels with every backup.
//    Since P-9 (035, 2026-09-29) the EMR relays the viewer itself through orthanc_url;
//    pacs_viewer_url is no longer used and no longer checked. orthanc_url is checked
//    the same way the order-feed tab checks it.
//  - Not paired: the viewer relay needs the image server's password, written only by
//    the PACS folder's pair-with-emr script. Without it the viewer says so instead of
//    showing images. Checked only where the imaging is in use (the worklist bridge has
//    reported, or a worklist host is set) - a clinic without a PACS is not warned.
// Warn only - nothing is changed.
const OLD_PORTS = [
  { field: 'emr_base_url', old: '8080', now: '9080' },
  { field: 'orthanc_url', old: '8090', now: '9090' },
];
function portOf(url) {
  const m = String(url || '').trim().match(/^[a-z]+:\/\/[^/:]+:(\d+)(\/|$)/i);
  return m ? m[1] : null;
}
async function checkPacsAddresses() {
  const r = await pool.query(
    `SELECT c.emr_base_url, c.orthanc_url, c.worklist_scp_host,
            (c.orthanc_password IS NOT NULL AND c.orthanc_password <> '') AS paired,
            EXISTS (SELECT 1 FROM service_heartbeat h WHERE h.name = 'worklist_bridge') AS bridge_seen
       FROM pacs_config c WHERE c.id = 1`);
  const cfg = r.rows[0] || {};
  const inUse = !!(cfg.bridge_seen || cfg.worklist_scp_host);
  const old = OLD_PORTS.filter(p => portOf(cfg[p.field]) === p.old)
    .map(p => ({ field: p.field, url: cfg[p.field], port: p.old, use: p.now }));
  if (inUse && !cfg.paired) return { key: 'pacs_address', state: 'warn', message: 'status.pacsAddress.notPaired', values: { old } };
  if (old.length) return { key: 'pacs_address', state: 'warn', message: 'status.pacsAddress.oldPort', values: { old } };
  if (!inUse && !cfg.emr_base_url) return { key: 'pacs_address', state: 'off', message: 'status.pacsAddress.off', values: {} };
  return { key: 'pacs_address', state: 'ok', message: 'status.pacsAddress.ok', values: {} };
}

// Any logged-in member of staff can see this. Whoever notices the red dot is
// whoever happens to be at a screen, and making them fetch someone with the
// settings permission defeats the point of showing it.
router.get('/status', authMiddleware, async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkDisk(),
    checkBackup().catch(err => ({ key: 'backup', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    // The database being down takes these with it; report that rather than a stack trace.
    checkBridge().catch(err => ({ key: 'bridge', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkPacs().catch(err => ({ key: 'pacs', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkImageBackup().catch(err => ({ key: 'pacs_image_backup', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkEmrBackupCopy().catch(err => ({ key: 'emr_backup_copy', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkPacsAddresses().catch(err => ({ key: 'pacs_address', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
    checkPacsRelay().catch(err => ({ key: 'pacs_relay', state: 'warn', message: 'status.unknown', values: { error: err.message } })),
  ]).then(all => all.filter(Boolean));
  res.json({
    overall: worst(checks.map(c => c.state)),
    checked_at: new Date().toISOString(),
    services: checks,
  });
});

module.exports = router;
