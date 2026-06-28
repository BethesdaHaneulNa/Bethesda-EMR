// Database backup service. Backups are ON by default — /backups is always mounted (to the
// app's own ./backups folder unless BACKUP_PATH points to another drive). We write gzipped
// pg_dump files there, prune beyond the retention window, run daily at BACKUP_TIME, and let
// the UI download any backup so a copy can be saved to a USB / another drive.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DIR = '/backups';
const PREFIX = 'bethesda_';

function cfg() {
  const hostPath = (process.env.BACKUP_PATH || '').trim();
  return {
    enabled: true,            // always on (/backups is always mounted)
    custom: !!hostPath,       // true if a specific drive/folder was set via BACKUP_PATH
    hostPath,                 // empty = the app's own ./backups folder
    dir: DIR,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10) || 30,
    time: (process.env.BACKUP_TIME || '02:00').trim(),
  };
}

function listBackups() {
  try {
    if (!fs.existsSync(DIR)) return [];
    return fs.readdirSync(DIR)
      .filter(f => (f.startsWith(PREFIX) || f.startsWith('medconnect_')) && f.endsWith('.sql.gz'))
      .map(f => { const st = fs.statSync(path.join(DIR, f)); return { name: f, size: st.size, mtime: st.mtime }; })
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

function prune(days) {
  const cutoff = Date.now() - days * 86400000;
  listBackups().forEach(b => {
    if (b.mtime.getTime() < cutoff) { try { fs.unlinkSync(path.join(DIR, b.name)); } catch (e) {} }
  });
}

function runBackup() {
  return new Promise((resolve) => {
    const c = cfg();
    if (!c.enabled) return resolve({ ok: false, error: 'backup path not configured' });
    if (!fs.existsSync(DIR)) return resolve({ ok: false, error: 'backup directory not mounted' });
    const file = path.join(DIR, `${PREFIX}${stamp()}.sql.gz`);
    const env = Object.assign({}, process.env, { PGPASSWORD: process.env.DB_PASSWORD || '' });
    const cmd = `pg_dump -h ${process.env.DB_HOST || 'db'} -p ${process.env.DB_PORT || 5432} ` +
      `-U ${process.env.DB_USER || 'medconnect'} -d ${process.env.DB_NAME || 'medconnect'} ` +
      `--no-owner --clean --if-exists | gzip > "${file}"`;
    const ps = spawn('sh', ['-c', cmd], { env });
    let err = '';
    ps.stderr.on('data', d => { err += d.toString(); });
    ps.on('error', e => resolve({ ok: false, error: e.message }));
    ps.on('close', code => {
      if (code === 0) {
        let size = 0; try { size = fs.statSync(file).size; } catch (e) {}
        try { prune(c.retentionDays); } catch (e) {}
        resolve({ ok: true, file: path.basename(file), size });
      } else {
        try { fs.unlinkSync(file); } catch (e) {}
        resolve({ ok: false, error: (err || ('pg_dump exited ' + code)).trim() });
      }
    });
  });
}

let lastSlot = '';
function startScheduler() {
  const c = cfg();
  if (!c.enabled) { console.log('[backup] disabled (BACKUP_PATH not set) — no automatic backups'); return; }
  console.log(`[backup] enabled → ${c.hostPath} · daily at ${c.time} · keep ${c.retentionDays}d`);
  setInterval(() => {
    const cur = cfg();
    if (!cur.enabled) return;
    const d = new Date(); const p = n => String(n).padStart(2, '0');
    const hhmm = `${p(d.getHours())}:${p(d.getMinutes())}`;
    const slot = `${d.toDateString()} ${cur.time}`;
    if (hhmm === cur.time && lastSlot !== slot) {
      lastSlot = slot;
      console.log('[backup] scheduled backup starting…');
      runBackup().then(r => console.log('[backup] ' + (r.ok ? `done ${r.file} (${r.size}b)` : `FAILED ${r.error}`)));
    }
  }, 30000); // check twice a minute
}

module.exports = { cfg, listBackups, runBackup, startScheduler, resolveBackup };
