const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ── LISTINGS ─────────────────────────────────────────────────

// GET /api/marketplace  — uses vw_active_listings VIEW
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM vw_active_listings ORDER BY listed_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/marketplace  — create listing
router.post('/', auth, async (req, res) => {
  const { game_id, ask_price } = req.body;
  if (!game_id || !ask_price)
    return res.status(400).json({ error: 'game_id and ask_price are required' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO marketplace_listings (seller_id, game_id, ask_price) VALUES (?,?,?)',
      [req.user.user_id, game_id, ask_price]
    );
    res.status(201).json({ message: 'Listing created', listing_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/marketplace/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE marketplace_listings SET listing_status='cancelled' WHERE listing_id=? AND seller_id=?`,
      [req.params.id, req.user.user_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Listing not found or not yours' });
    res.json({ message: 'Listing cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── OFFERS ────────────────────────────────────────────────────

// GET /api/marketplace/:id/offers  — uses GetListingOffers stored procedure
router.get('/:id/offers', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL GetListingOffers(?)', [req.params.id]);
    res.json(rows[0]); // stored procedure returns array of result sets
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/marketplace/my-offers  — offers made by logged-in buyer
router.get('/my/offers', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT o.offer_id, o.offer_price, o.offer_status, o.offered_at,
             g.title AS game_title, g.platform,
             ml.ask_price, ml.listing_id,
             u.username AS seller
      FROM offers o
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      JOIN games g  ON ml.game_id   = g.game_id
      JOIN users u  ON ml.seller_id = u.user_id
      WHERE o.buyer_id = ?
      ORDER BY o.offered_at DESC
    `, [req.user.user_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/marketplace/my/listings  — seller's own listings with offers
router.get('/my/listings', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT ml.listing_id, ml.ask_price, ml.listing_status, ml.listed_at,
             g.title AS game_title, g.platform, g.genre,
             COUNT(o.offer_id)    AS offer_count,
             MAX(o.offer_price)   AS best_offer
      FROM marketplace_listings ml
      JOIN games g ON ml.game_id = g.game_id
      LEFT JOIN offers o ON ml.listing_id = o.listing_id
      WHERE ml.seller_id = ?
      GROUP BY ml.listing_id, ml.ask_price, ml.listing_status, ml.listed_at,
               g.title, g.platform, g.genre
      ORDER BY ml.listed_at DESC
    `, [req.user.user_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/marketplace/:id/offers  — make an offer
router.post('/:id/offers', auth, async (req, res) => {
  const { offer_price } = req.body;
  if (!offer_price) return res.status(400).json({ error: 'offer_price is required' });
  try {
    const [listing] = await pool.execute(
      'SELECT seller_id FROM marketplace_listings WHERE listing_id=?', [req.params.id]
    );
    if (listing.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (listing[0].seller_id === req.user.user_id)
      return res.status(400).json({ error: 'Cannot offer on your own listing' });

    const [result] = await pool.execute(
      'INSERT INTO offers (listing_id, buyer_id, offer_price) VALUES (?,?,?)',
      [req.params.id, req.user.user_id, offer_price]
    );
    res.status(201).json({ message: 'Offer placed', offer_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/marketplace/offers/:offer_id  — accept/reject using TRANSACTION
router.patch('/offers/:offer_id', auth, async (req, res) => {
  const { offer_status } = req.body;
  if (!['accepted', 'rejected'].includes(offer_status))
    return res.status(400).json({ error: 'offer_status must be accepted or rejected' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify caller is the seller
    const [rows] = await conn.execute(`
      SELECT ml.seller_id, ml.listing_id
      FROM offers o
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      WHERE o.offer_id = ?
    `, [req.params.offer_id]);

    if (rows.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Offer not found' }); }
    if (rows[0].seller_id !== req.user.user_id) { await conn.rollback(); return res.status(403).json({ error: 'Only seller can respond' }); }

    const { listing_id } = rows[0];

    if (offer_status === 'accepted') {
      // TRANSACTION: accept this offer + reject others + mark listing sold
      await conn.execute(
        'UPDATE offers SET offer_status=? WHERE offer_id=?',
        ['accepted', req.params.offer_id]
      );
      await conn.execute(
        `UPDATE offers SET offer_status='rejected'
         WHERE listing_id=? AND offer_id!=? AND offer_status='pending'`,
        [listing_id, req.params.offer_id]
      );
      await conn.execute(
        `UPDATE marketplace_listings SET listing_status='sold' WHERE listing_id=?`,
        [listing_id]
      );
    } else {
      await conn.execute(
        'UPDATE offers SET offer_status=? WHERE offer_id=?',
        ['rejected', req.params.offer_id]
      );
    }

    await conn.commit();
    res.json({ message: `Offer ${offer_status}` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
