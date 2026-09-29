const { Pool, types } = require('pg');

// A DATE has no time and no zone, so hand it over as the 'YYYY-MM-DD' Postgres sent.
// By default node-postgres builds a Date at local midnight, and JSON then writes that
// in UTC: in Antananarivo (UTC+3) a birth date of 1990-01-01 left the API as
// 1989-12-31T21:00:00.000Z. Every screen cuts at 'T', so the patient showed a day
// early, and saving the registration form wrote the earlier day back.
types.setTypeParser(1082, function (v) { return v; });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'medconnect',
  user: process.env.DB_USER || 'medconnect',
  password: process.env.DB_PASSWORD || 'medconnect2026!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Every connection works in the clinic's time zone. The server's own default is
  // whatever postgresql.conf was given when the database was first created - UTC on
  // this install - so CURRENT_DATE and now()::date in our queries were the UTC date:
  // between midnight and 03:00 in Antananarivo, "today's" queues and reports still
  // meant yesterday, while Node (TZ) had already moved on. psql inside the database
  // container hides this, because PGTZ there sets it for that client only.
  options: '-c TimeZone=' + (process.env.TZ || 'UTC'),
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

module.exports = { pool };
