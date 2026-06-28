require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { runMigrations } = require('./config/migrate');
const { startScheduler } = require('./services/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/patients', require('./routes/patient.routes'));
app.use('/api/visits', require('./routes/visit.routes'));
app.use('/api/consultations', require('./routes/consult.routes'));
app.use('/api/billing', require('./routes/billing.routes'));
app.use('/api/pharmacy', require('./routes/pharmacy.routes'));
app.use('/api/worklist', require('./routes/worklist.routes'));
app.use('/api/pacs', require('./routes/pacs.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/order-sets', require('./routes/orderset.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/lab', require('./routes/lab.routes'));
app.use('/api/backup', require('./routes/backup.routes'));
app.use('/api/version', require('./routes/version.routes'));

// JSON fallback for unknown API routes so frontend never receives index.html for API calls
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found: ' + req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start — run pending DB migrations first; fail loudly rather than serve on a half-migrated DB.
async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('[migrate] FATAL:', err.message);
    process.exit(1);
  }
  startScheduler();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   Bethesda EMR API Server          ║
  ║   Running on port ${PORT}               ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
  });
}

start();
