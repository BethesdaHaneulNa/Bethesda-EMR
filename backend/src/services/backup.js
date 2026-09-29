// Database backup service. Backups are ON by default — /backups is always mounted (to the
// app's own ./backups folder unless BACKUP_PATH points to another drive). We write gzipped
// pg_dump files there, prune beyond the retention window, run daily at BACKUP_TIME, and let
// the UI download any backup so a copy can be saved to a USB / another drive.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DIR = '/backups';
const PREFIX = 'bethesda_';
// A dump is written here and moved into DIR only once it has been proven complete.
// Everything that reads backups (this file, the status window, verify-backup, the
// restore instructions) looks at DIR alone, so a dump still being written - or one
// left behind by a container killed half way - can never be mistaken for a backup.
const WORK_DIR = path.join(DIR, '.inprogress');

// Backups run nightly, so a day and a half without a new one means one was missed.
// Shared with /api/system/status so the Backup tab and the status check agree.
const STALE_HOURS = 36;
// Pruning by age alone deletes by the calendar, not by what is left. A server that was
// off for longer than the retention window came back, took one backup, and deleted
// every other one on the strength of it - the same happens if the PC clock jumps
// ahead. However old they are, the newest few are never pruned.
const MIN_KEEP = 7;

function cfg() {
  const hostPath = (process.env.BACKUP_PATH || '').trim();
  return {
    enabled: true,            // always on (/backups is always mounted)
    custom: !!hostPath,       // true if a specific drive/folder was set via BACKUP_PATH
    hostPath,                 // empty = the app's own ./backups folder
    dir: DIR,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10) || 30,
    time: (process.env.BACKUP_TIME || '02:00').trim(),
    minKeep: MIN_KEEP,
    staleHours: STALE_HOURS,
  };
}

function listBackups() {
  try {
    if (!fs.existsSync(DIR)) return [];
    return fs.readdirSync(DIR)
      .filter(f => (f.startsWith(PREFIX) || f.startsWith('medconnect_')) && f.endsWith('.sql.gz'))
      .map(f => { const st = fs.statSync(path.join(DIR, f)); return { name: f, size: st.size, mtime: st.mtime }; })
      .filter(b => b.size > 0)
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) { return []; }
}

// Resolve a backup file path safely (no traversal) for download. Returns null if invalid/missing.
function resolveBackup(name) {
  if (!/^[A-Za-z0-9_.-]+\.sql\.gz$/.test(name || '')) return null;
  const full = path.join(DIR, name);
  if (path.dirname(full) !== DIR) return null;
  return fs.existsSync(full) ? full : null;
}

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Oldest first, stopping while MIN_KEEP remain - see MIN_KEEP.
function prune(days) {
  const cutoff = Date.now() - days * 86400000;
  const list = listBackups();                     // newest first
  for (let i = list.length - 1; i >= MIN_KEEP; i--) {
    if (list[i].mtime.getTime() < cutoff) {
      try { fs.unlinkSync(path.join(DIR, list[i].name)); } catch (e) {}
    }
  }
}

// Anything in WORK_DIR when no backup is running is the remains of one that was
// interrupted (container stopped, power cut). It was never moved into DIR, so it was
// never a backup; this only reclaims the space.
function clearWorkDir() {
  try {
    if (!fs.existsSync(WORK_DIR)) return;
    fs.readdirSync(WORK_DIR).forEach(f => { try { fs.unlinkSync(path.join(WORK_DIR, f)); } catch (e) {} });
  } catch (e) {}
}

// The outcome of the most recent attempt, scheduled or manual. Kept in memory: after a
// restart it is gone, but the age of the newest file still shows a missed night.
let lastAttempt = null;
// The backup in progress, if any. Two runs at once - "Back up now" pressed on two PCs,
// or during the nightly run - used to write the same minute-stamped file together, and
// the one that failed deleted the file the other had just finished. Now a second
// request waits for the first and gets its result.
let running = null;

function dumpOnce(trigger) {
  return new Promise((resolve) => {
    const c = cfg();
    if (!fs.existsSync(DIR)) return resolve({ ok: false, error: 'backup directory not mounted' });
    try { fs.mkdirSync(WORK_DIR, { recursive: true }); } catch (e) { return resolve({ ok: false, error: e.message }); }
    clearWorkDir();
    const name = `${PREFIX}${stamp()}.sql.gz`;
    const work = path.join(WORK_DIR, name);
    const env = Object.assign({}, process.env, { PGPASSWORD: process.env.DB_PASSWORD || '' });
    // `set -o pipefail` matters: a pipeline reports the status of its LAST command,
    // so without it a pg_dump that dies half way through still exits 0 (gzip
    // succeeded) and we would file a truncated dump as a good backup. `gzip -t`
    // then proves the archive is complete rather than cut short.
    const cmd = 'set -o pipefail; ' +
      `pg_dump -h ${process.env.DB_HOST || 'db'} -p ${process.env.DB_PORT || 5432} ` +
      `-U ${process.env.DB_USER || 'medconnect'} -d ${process.env.DB_NAME || 'medconnect'} ` +
      `--no-owner --clean --if-exists | gzip > "${work}" && gzip -t "${work}"`;
    const ps = spawn('sh', ['-c', cmd], { env });
    let err = '';
    ps.stderr.on('data', d => { err += d.toString(); });
    ps.on('error', e => { try { fs.unlinkSync(work); } catch (x) {} resolve({ ok: false, error: e.message }); });
    ps.on('close', code => {
      let size = 0; try { size = fs.statSync(work).size; } catch (e) {}
      if (code === 0 && size > 0) {
        try {
          // Same filesystem, so this is atomic: the file appears in DIR complete or not at all.
          fs.renameSync(work, path.join(DIR, name));
        } catch (e) {
          try { fs.unlinkSync(work); } catch (x) {}
          return resolve({ ok: false, error: 'could not move the finished backup into place: ' + e.message });
        }
        try { prune(c.retentionDays); } catch (e) {}
        resolve({ ok: true, file: name, size });
      } else {
        // Only our own unfinished file is removed; nothing in DIR is touched.
        try { fs.unlinkSync(work); } catch (e) {}
        const why = code === 0 ? 'backup file is empty' : ('pg_dump exited ' + code);
        resolve({ ok: false, error: (err || why).trim().slice(-500) });
      }
    });
  });
}

function runBackup(trigger) {
  if (running) return running;
  const startedAt = new Date();
  running = dumpOnce(trigger).then(r => {
    lastAttempt = Object.assign({ at: startedAt.toISOString(), trigger: trigger || 'manual' }, r);
    running = null;
    return r;
  });
  return running;
}

// One answer to "are the backups all right?", for the Backup tab and /api/system/status.
//   ok      the newest backup is recent
//   failed  the latest attempt failed and nothing has succeeded since
//   stale   no backup for STALE_HOURS
//   none    there are no backups at all
function health() {
  const list = listBackups();
  const newest = list[0] || null;
  const hours = newest ? (Date.now() - newest.mtime.getTime()) / 3600000 : null;
  let state = 'ok';
  if (lastAttempt && !lastAttempt.ok && (!newest || newest.mtime < new Date(lastAttempt.at))) state = 'failed';
  else if (!newest) state = 'none';
  else if (hours > STALE_HOURS) state = 'stale';
  return { state, hours, newest, count: list.length, list, lastAttempt, running: !!running };
}

// The most recent time the backup was supposed to run, at or before `now`.
function lastDueTime(now, hhmm) {
  const [h, m] = String(hhmm || '02:00').split(':').map(n => parseInt(n, 10));
  const due = new Date(now);
  due.setHours(isNaN(h) ? 2 : h, isNaN(m) ? 0 : m, 0, 0);
  if (due > now) due.setDate(due.getDate() - 1);  // today's slot has not come round yet
  return due;
}

// Wait this long between attempts when a backup keeps failing, so a database
// that is down does not mean a pg_dump every thirty seconds all night.
const RETRY_MINUTES = 30;
let lastScheduledAttempt = 0;

// Ask "has a backup happened since it was last due?" rather than "is it 02:00
// right now?". The old check only fired if the container happened to be running
// during that exact minute: a power cut at two in the morning meant the night's
// backup simply never happened, nothing retried it, and nobody was told. The
// gaps that leaves are invisible until the day someone needs to restore.
//
// Comparing against the most recent slot also means a machine that was off for
// a week takes one backup when it comes back, not seven.
function backupDue() {
  const c = cfg();
  if (!c.enabled) return false;
  if (running) return false;
  if (Date.now() - lastScheduledAttempt < RETRY_MINUTES * 60000) return false;
  const newest = listBackups()[0];
  if (!newest) return true;                       // nothing at all yet
  return newest.mtime < lastDueTime(new Date(), c.time);
}

function tick() {
  if (!backupDue()) return;
  lastScheduledAttempt = Date.now();
  console.log('[backup] backup is due — starting…');
  runBackup('scheduled').then(r => console.log('[backup] ' + (r.ok ? `done ${r.file} (${r.size}b)` : `FAILED ${r.error}`)));
}

function startScheduler() {
  const c = cfg();
  if (!c.enabled) { console.log('[backup] disabled (BACKUP_PATH not set) — no automatic backups'); return; }
  console.log(`[backup] enabled → ${c.hostPath || './backups'} · daily at ${c.time} · keep ${c.retentionDays}d (never fewer than ${MIN_KEEP})`);
  clearWorkDir();
  // Catch up shortly after boot rather than immediately: the machine has just
  // come back, and the database is the thing we are about to read.
  setTimeout(tick, 120000);
  setInterval(tick, 60000);
}

module.exports = { cfg, listBackups, runBackup, startScheduler, resolveBackup, health, STALE_HOURS };
