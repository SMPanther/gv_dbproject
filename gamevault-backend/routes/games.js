const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/games  — list all games (with avg rating via JOIN)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT g.*,
             ROUND(AVG(r.rating), 1)  AS avg_rating,
             COUNT(r.review_id)        AS review_count
      FROM games g
      LEFT JOIN reviews r ON g.game_id = r.game_id
      GROUP BY g.game_id
      ORDER BY g.title
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/games/:id  — single game + reviews
router.get('/:id', async (req, res) => {
  try {
    const [games] = await pool.execute(
      'SELECT * FROM games WHERE game_id = ?', [req.params.id]
    );
    if (games.length === 0) return res.status(404).json({ error: 'Game not found' });

    const [reviews] = await pool.execute(`
      SELECT r.*, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.game_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    res.json({ ...games[0], reviews });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/games  — add a game (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  const { title, genre, price, platform, developer, release_date } = req.body;
  if (!title || !genre || !price || !platform || !developer)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO games (title, genre, price, platform, developer, release_date) VALUES (?,?,?,?,?,?)',
      [title, genre, price, platform, developer, release_date || null]
    );
    res.status(201).json({ message: 'Game added', game_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Game already exists on this platform' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
