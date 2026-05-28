const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/collection  — logged-in user's game library
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT g.game_id, g.title, g.genre, g.platform, g.developer,
             ug.ug_id, ug.status, ug.acquired_at
      FROM user_games ug
      JOIN games g ON ug.game_id = g.game_id
      WHERE ug.user_id = ?
      ORDER BY ug.acquired_at DESC
    `, [req.user.user_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/collection  — add game to collection
router.post('/', auth, async (req, res) => {
  const { game_id, status = 'active' } = req.body;
  if (!game_id) return res.status(400).json({ error: 'game_id is required' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO user_games (user_id, game_id, status) VALUES (?,?,?)',
      [req.user.user_id, game_id, status]
    );
    res.status(201).json({ message: 'Added to collection', ug_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Game already in collection' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/collection/:ug_id  — update status (active/wishlist/traded)
router.patch('/:ug_id', auth, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });

  try {
    const [result] = await pool.execute(
      'UPDATE user_games SET status=? WHERE ug_id=? AND user_id=?',
      [status, req.params.ug_id, req.user.user_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Entry not found or not yours' });
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/collection/:ug_id  — remove from collection
router.delete('/:ug_id', auth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM user_games WHERE ug_id=? AND user_id=?',
      [req.params.ug_id, req.user.user_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Entry not found or not yours' });
    res.json({ message: 'Removed from collection' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
