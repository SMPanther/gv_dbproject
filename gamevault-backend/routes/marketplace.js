const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ── LISTINGS ─────────────────────────────────────────────────

// GET /api/marketplace  — all active listings (JOIN: seller, game, best offer)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT ml.listing_id, ml.ask_price, ml.listed_at, ml.listing_status,
             u.username      AS seller,
             g.title         AS game_title,
             g.genre, g.platform,
             (SELECT MAX(o.offer_price)
              FROM offers o
              WHERE o.listing_id = ml.listing_id) AS best_offer
      FROM marketplace_listings ml
      JOIN users u ON ml.seller_id = u.user_id
      JOIN games g ON ml.game_id   = g.game_id
      WHERE ml.listing_status = 'active'
      ORDER BY ml.listed_at DESC
    `);
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

// PATCH /api/marketplace/:id/cancel  — cancel own listing
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE marketplace_listings
       SET listing_status = 'cancelled'
       WHERE listing_id = ? AND seller_id = ?`,
      [req.params.id, req.user.user_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Listing not found or not yours' });
    res.json({ message: 'Listing cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── OFFERS ────────────────────────────────────────────────────

// GET /api/marketplace/:id/offers  — offers on a listing
router.get('/:id/offers', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT o.*, u.username AS buyer
      FROM offers o
      JOIN users u ON o.buyer_id = u.user_id
      WHERE o.listing_id = ?
      ORDER BY o.offer_price DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/marketplace/:id/offers  — make an offer
router.post('/:id/offers', auth, async (req, res) => {
  const { offer_price } = req.body;
  if (!offer_price) return res.status(400).json({ error: 'offer_price is required' });

  try {
    // Prevent seller from offering on own listing
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

// PATCH /api/marketplace/offers/:offer_id  — accept / reject offer (seller only)
router.patch('/offers/:offer_id', auth, async (req, res) => {
  const { offer_status } = req.body; // 'accepted' | 'rejected'
  if (!['accepted', 'rejected'].includes(offer_status))
    return res.status(400).json({ error: 'offer_status must be accepted or rejected' });

  try {
    // Verify caller is the seller of the listing
    const [rows] = await pool.execute(`
      SELECT ml.seller_id, ml.listing_id
      FROM offers o
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      WHERE o.offer_id = ?
    `, [req.params.offer_id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Offer not found' });
    if (rows[0].seller_id !== req.user.user_id)
      return res.status(403).json({ error: 'Only the seller can respond to offers' });

    await pool.execute(
      'UPDATE offers SET offer_status=? WHERE offer_id=?',
      [offer_status, req.params.offer_id]
    );

    // If accepted, mark listing as sold
    if (offer_status === 'accepted') {
      await pool.execute(
        `UPDATE marketplace_listings SET listing_status='sold' WHERE listing_id=?`,
        [rows[0].listing_id]
      );
    }
    res.json({ message: `Offer ${offer_status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
