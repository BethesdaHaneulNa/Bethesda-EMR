// Is the newest backup from the version of the app that is running now?
//
// A backup restores with the usual steps only onto the version that made it: after an
// update has added tables, restoring a backup from before the update stops ("cannot drop
// constraint ... depend on it", DEPLOYMENT.md 5b) and needs the "older than the app"
// commands. Found in the restore drill of 2026-09-29 (wiki/modules/settings.md 2.13).
// The update scripts now take a backup straight after updating (backup-cli.js); this is
// for everything else - an update made by hand, or that backup having failed.
//
// The answer is read from the backup itself: the rows of schema_migrations in the dump,
// against the rows in the database. A backup file never changes once written, so each
// file is read once and remembered by name, size and time.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { pool } = require('../config/database');
const { listBackups } = require('./backup');

const DIR = '/backups';
const cache = new Map();   // "name|size|mtime" -> Promise<string[] | null>

// The migration file names listed in a dump's schema_migrations data, or null if the
// dump has none (a dump older than the migration table, or not ours). Streams, and stops
// reading as soon as the block has ended.
function dumpMigrations(file) {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(file).pipe(zlib.createGunzip());
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let inBlock = false, done = false;
    const names = [];
    const finish = (v) => { if (done) return; done = true; rl.close(); stream.destroy(); resolve(v); };
    rl.on('line', (line) => {
      // close() does not stop lines readline has already buffered.
      if (done) return;
      if (!inBlock) { if (/^COPY public\.schema_migrations /.test(line)) inBlock = true; return; }
      if (line === '\\.') return finish(names);
      names.push(line.split('\t')[0]);
    });
    rl.on('close', () => finish(inBlock ? names : null));
    stream.on('error', () => finish(null));
  });
}

function migrationsOf(b) {
  const key = b.name + '|' + b.size + '|' + new Date(b.mtime).getTime();
  if (!cache.has(key)) cache.set(key, dumpMigrations(path.join(DIR, b.name)));
  return cache.get(key);
}

// { state, file, missing, extra }
//   same     the newest backup has every migration the database has
//   older    the database has migrations the backup does not - it needs 5b's
//            "older than the app" commands; missing lists them
//   newer    the backup has migrations this app does not know (restored onto an older
//            install); extra lists them
//   none     no backups;  unknown  the file could not be read
async function newestBackupVersion() {
  const newest = listBackups()[0];
  if (!newest) return { state: 'none', file: null, missing: [], extra: [] };
  const inBackup = await migrationsOf(newest);
  if (!inBackup) return { state: 'unknown', file: newest.name, missing: [], extra: [] };
  const r = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
  const inDb = r.rows.map((x) => x.filename);
  const have = new Set(inBackup), known = new Set(inDb);
  const missing = inDb.filter((f) => !have.has(f));
  const extra = inBackup.filter((f) => !known.has(f));
  const state = missing.length ? 'older' : (extra.length ? 'newer' : 'same');
  return { state, file: newest.name, missing, extra };
}

module.exports = { newestBackupVersion, dumpMigrations };
