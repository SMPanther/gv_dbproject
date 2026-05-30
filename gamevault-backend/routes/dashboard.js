const express = require('express');
const pool    = require('../config/db');
const router  = express.Router();

// GET /api/dashboard  — queries all 3 views + row counts
router.get('/', async (req, res) => {
  try {
    const [users]      = await pool.execute('SELECT COUNT(*) AS count FROM users');
    const [games]      = await pool.execute('SELECT COUNT(*) AS count FROM games');
    const [collection] = await pool.execute('SELECT COUNT(*) AS count FROM user_games');
    const [listings]   = await pool.execute('SELECT COUNT(*) AS count FROM marketplace_listings');
    const [offers]     = await pool.execute('SELECT COUNT(*) AS count FROM offers');
    const [reviews]    = await pool.execute('SELECT COUNT(*) AS count FROM reviews');

    const [activeListings]  = await pool.execute('SELECT * FROM vw_active_listings ORDER BY listed_at DESC LIMIT 5');
    const [gameRatings]     = await pool.execute('SELECT * FROM vw_game_ratings ORDER BY avg_rating DESC');
    const [userCollections] = await pool.execute('SELECT * FROM vw_user_collections ORDER BY total_games DESC');

    res.json({
      counts: {
        users:      users[0].count,
        games:      games[0].count,
        collection: collection[0].count,
        listings:   listings[0].count,
        offers:     offers[0].count,
        reviews:    reviews[0].count,
      },
      activeListings,
      gameRatings,
      userCollections,
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
