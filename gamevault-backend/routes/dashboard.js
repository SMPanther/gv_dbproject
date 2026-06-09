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
    const [recentListings]  = await pool.execute(`
      SELECT ml.listing_id, ml.ask_price, ml.listing_status, ml.listed_at,
             g.title AS game_title, u.username AS seller
      FROM marketplace_listings ml
      JOIN games g ON ml.game_id = g.game_id
      JOIN users u ON ml.seller_id = u.user_id
      ORDER BY ml.listed_at DESC
      LIMIT 10
    `);
    const [recentOffers] = await pool.execute(`
      SELECT o.offer_id, o.offer_price, o.offer_status, o.offered_at,
             b.username AS buyer,
             s.username AS seller,
             g.title AS game_title
      FROM offers o
      JOIN users b ON o.buyer_id = b.user_id
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      JOIN users s ON ml.seller_id = s.user_id
      JOIN games g ON ml.game_id = g.game_id
      ORDER BY o.offered_at DESC
      LIMIT 10
    `);
    const [recentSales] = await pool.execute(`
      SELECT o.offer_id, o.offer_price, o.offered_at,
             b.username AS buyer,
             s.username AS seller,
             g.title AS game_title
      FROM offers o
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      JOIN users b ON o.buyer_id = b.user_id
      JOIN users s ON ml.seller_id = s.user_id
      JOIN games g ON ml.game_id = g.game_id
      WHERE o.offer_status = 'accepted'
      ORDER BY o.offered_at DESC
      LIMIT 10
    `);

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
      recentListings,
      recentOffers,
      recentSales,
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
