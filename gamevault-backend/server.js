const express    = require('express');
const cors       = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/games',       require('./routes/games'));
app.use('/api/collection',  require('./routes/collection'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/reviews',     require('./routes/reviews'));

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'GameVault API', version: '1.0.0' });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎮 GameVault API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
