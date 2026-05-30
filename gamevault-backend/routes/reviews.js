const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/reviews/game/:game_id
router.get('/game/:game_id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.review_id, r.rating, r.comment, r.created_at, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.game_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.game_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reviews/stats  — uses vw_game_ratings VIEW
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM vw_game_ratings ORDER BY avg_rating DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reviews/top/:limit  — uses GetTopRatedGames stored procedure
router.get('/top/:limit', async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL GetTopRatedGames(?)', [req.params.limit]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reviews
router.post('/', auth, async (req, res) => {
  const { game_id, rating, comment } = req.body;
  if (!game_id || !rating) return res.status(400).json({ error: 'game_id and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, game_id, rating, comment) VALUES (?,?,?,?)',
      [req.user.user_id, game_id, rating, comment || null]
    );
    res.status(201).json({ message: 'Review posted', review_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'You already reviewed this game' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM reviews WHERE review_id=? AND user_id=?',
      [req.params.id, req.user.user_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Review not found or not yours' });
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
