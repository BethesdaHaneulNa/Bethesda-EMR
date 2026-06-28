// Migration runner — applies backend/sql/*.sql in order, tracked in schema_migrations.
// Runs on backend startup so new migrations auto-apply to existing databases on update.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('./database');

const SQL_DIR = path.join(__dirname, '..', '..', 'sql');
const LOCK_KEY = 873214567; // arbitrary advisory-lock id so two backends don't migrate at once

function checksum(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function listMigrationFiles() {
  if (!fs.existsSync(SQL_DIR)) return [];
  return fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql')).sort();
}

async function tableExists(client, name) {
  const r = await client.query('SELECT to_regclass($1) AS t', [name]);
  return !!r.rows[0].t;
}

async function waitForDb(retries = 60) {
  for (let i = 0; i < retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error('Database not reachable for migrations');
}

async function runMigrations() {
  await waitForDb();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      checksum   TEXT,
      baseline   BOOLEAN DEFAULT FALSE
    )`);

    const files = listMigrationFiles();
    const appliedRes = await client.query('SELECT filename, checksum FROM schema_migrations');
    const applied = new Map(appliedRes.rows.map(r => [r.filename, r.checksum]));

    // Adoption: an existing DB provisioned by the old initdb.d mechanism has the schema
    // but no tracking rows. Mark current migrations as already-applied (baseline) without
    // re-running them. Safe because the runner is introduced before any new migration the
    // existing DB hasn't seen. Fresh installs (no patient table) fall through and run all.
    if (applied.size === 0 && await tableExists(client, 'patient')) {
      for (const f of files) {
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum, baseline) VALUES ($1,$2,TRUE) ON CONFLICT (filename) DO NOTHING',
          [f, checksum(path.join(SQL_DIR, f))]
        );
      }
      console.log(`[migrate] baselined ${files.length} existing migration(s) for a pre-runner database`);
      return;
    }

    let ran = 0;
    for (const f of files) {
      const full = path.join(SQL_DIR, f);
      const sum = checksum(full);
      if (applied.has(f)) {
        const prev = applied.get(f);
        if (prev && prev !== sum) {
          console.warn(`[migrate] WARNING: ${f} differs from when it was applied (checksum mismatch). Already-applied migrations are never re-run — create a new migration instead of editing an old one.`);
        }
        continue;
      }
      console.log(`[migrate] applying ${f} ...`);
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(full, 'utf8'));
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2)', [f, sum]);
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed at ${f}: ${err.message}`);
      }
    }
    console.log(ran ? `[migrate] applied ${ran} new migration(s)` : '[migrate] database up to date');
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]); } catch (e) {}
    client.release();
  }
}

module.exports = { runMigrations };
