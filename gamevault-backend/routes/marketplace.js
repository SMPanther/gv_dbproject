const express = require('express');
const pool    = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ── LISTINGS ─────────────────────────────────────────────────

// GET /api/marketplace  — browse active listings, excluding own listings when authenticated
router.get('/', auth.optional, async (req, res) => {
  try {
    if (req.user) {
      const [rows] = await pool.execute(`
        SELECT ml.listing_id,
               u.username AS seller,
               g.title    AS game_title,
               g.genre,
               g.platform,
               ml.ask_price,
               ml.listed_at,
               (SELECT MAX(o.offer_price) FROM offers o WHERE o.listing_id = ml.listing_id) AS best_offer,
               (SELECT COUNT(*) FROM offers o WHERE o.listing_id = ml.listing_id) AS total_offers
        FROM marketplace_listings ml
        JOIN users u ON ml.seller_id = u.user_id
        JOIN games g ON ml.game_id = g.game_id
        WHERE ml.listing_status = 'active' AND ml.seller_id != ?
        ORDER BY ml.listed_at DESC
      `, [req.user.user_id]);
      return res.json(rows);
    }

    const [rows] = await pool.execute(`
      SELECT ml.listing_id,
             u.username AS seller,
             g.title    AS game_title,
             g.genre,
             g.platform,
             ml.ask_price,
             ml.listed_at,
             (SELECT MAX(o.offer_price) FROM offers o WHERE o.listing_id = ml.listing_id) AS best_offer,
             (SELECT COUNT(*) FROM offers o WHERE o.listing_id = ml.listing_id) AS total_offers
      FROM marketplace_listings ml
      JOIN users u ON ml.seller_id = u.user_id
      JOIN games g ON ml.game_id = g.game_id
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
    const [owned] = await pool.execute(
      `SELECT ug_id FROM user_games
       WHERE user_id = ? AND game_id = ? AND status = 'active'`,
      [req.user.user_id, game_id]
    );
    if (owned.length === 0)
      return res.status(400).json({ error: 'You can only sell games that are in your active collection' });

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

// GET /api/marketplace/my/offers  — offers made by logged-in buyer
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

// GET /api/marketplace/:id/offers  — seller-only listing offer details
router.get('/:id/offers', auth, async (req, res) => {
  try {
    const [listing] = await pool.execute(
      'SELECT seller_id, ask_price FROM marketplace_listings WHERE listing_id = ?',
      [req.params.id]
    );
    if (listing.length === 0)
      return res.status(404).json({ error: 'Listing not found' });
    if (listing[0].seller_id !== req.user.user_id)
      return res.status(403).json({ error: 'Only seller can view offers' });

    const [rows] = await pool.execute(`
      SELECT o.offer_id, o.offer_price, o.offer_status, o.offered_at,
             u.username AS buyer,
             g.title AS game_title, g.platform,
             ml.ask_price,
             ROUND(o.offer_price / ml.ask_price * 100, 0) AS pct_of_ask
      FROM offers o
      JOIN users u ON o.buyer_id = u.user_id
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      JOIN games g ON ml.game_id = g.game_id
      WHERE o.listing_id = ?
      ORDER BY o.offered_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/marketplace/:id/offers  — make an offer and hold the buyer's funds
router.post('/:id/offers', auth, async (req, res) => {
  const { offer_price } = req.body;
  if (!offer_price) return res.status(400).json({ error: 'offer_price is required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [listingRows] = await conn.execute(
      'SELECT seller_id, listing_status FROM marketplace_listings WHERE listing_id = ? FOR UPDATE',
      [req.params.id]
    );
    if (listingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Listing not found' });
    }
    const listing = listingRows[0];
    if (listing.seller_id === req.user.user_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot offer on your own listing' });
    }
    if (listing.listing_status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot offer on an inactive listing' });
    }

    const [walletRows] = await conn.execute(
      'SELECT wallet_id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.user_id]
    );
    if (walletRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Wallet not found for user' });
    }

    const wallet = walletRows[0];
    if (parseFloat(wallet.balance) < parseFloat(offer_price)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Insufficient wallet balance to place this offer' });
    }

    const [offerResult] = await conn.execute(
      'INSERT INTO offers (listing_id, buyer_id, offer_price) VALUES (?,?,?)',
      [req.params.id, req.user.user_id, offer_price]
    );

    await conn.execute(
      'UPDATE wallets SET balance = balance - ? WHERE wallet_id = ?',
      [offer_price, wallet.wallet_id]
    );

    const [updatedWallet] = await conn.execute(
      'SELECT balance FROM wallets WHERE wallet_id = ?',
      [wallet.wallet_id]
    );

    await conn.execute(
      `INSERT INTO wallet_transactions
        (wallet_id, transaction_type, amount, balance_after, related_offer_id, related_listing_id, note)
       VALUES (?, 'hold', ?, ?, ?, ?, ?)`,
      [wallet.wallet_id, offer_price, updatedWallet[0].balance, offerResult.insertId, req.params.id, 'Offer held']
    );

    await conn.commit();
    res.status(201).json({ message: 'Offer placed', offer_id: offerResult.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/marketplace/offers/:offer_id  — accept/reject using TRANSACTION and settle wallets
router.patch('/offers/:offer_id', auth, async (req, res) => {
  const { offer_status } = req.body;
  if (!['accepted', 'rejected'].includes(offer_status))
    return res.status(400).json({ error: 'offer_status must be accepted or rejected' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`
      SELECT o.offer_id,
             o.offer_price,
             o.offer_status,
             o.buyer_id,
             ml.listing_id,
             ml.seller_id,
             ml.listing_status,
             ml.game_id
      FROM offers o
      JOIN marketplace_listings ml ON o.listing_id = ml.listing_id
      WHERE o.offer_id = ? FOR UPDATE
    `, [req.params.offer_id]);

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = rows[0];
    if (offer.seller_id !== req.user.user_id) {
      await conn.rollback();
      return res.status(403).json({ error: 'Only seller can respond' });
    }
    if (offer.offer_status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ error: 'Only pending offers can be updated' });
    }
    if (offer.listing_status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ error: 'Listing is not active' });
    }

    if (offer_status === 'accepted') {
      await conn.execute(
        'UPDATE offers SET offer_status = ? WHERE offer_id = ?',
        ['accepted', req.params.offer_id]
      );

      const [pendingOffers] = await conn.execute(
        'SELECT offer_id, buyer_id, offer_price FROM offers WHERE listing_id = ? AND offer_status = ? AND offer_id != ? FOR UPDATE',
        [offer.listing_id, 'pending', req.params.offer_id]
      );

      await conn.execute(
        'UPDATE offers SET offer_status = ? WHERE listing_id = ? AND offer_status = ? AND offer_id != ?',
        ['rejected', offer.listing_id, 'pending', req.params.offer_id]
      );

      await conn.execute(
        'UPDATE marketplace_listings SET listing_status = ? WHERE listing_id = ?',
        ['sold', offer.listing_id]
      );

      const [sellerWalletRows] = await conn.execute(
        'SELECT wallet_id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [req.user.user_id]
      );
      if (sellerWalletRows.length === 0) {
        await conn.rollback();
        return res.status(500).json({ error: 'Seller wallet not found' });
      }

      const sellerWallet = sellerWalletRows[0];
      await conn.execute(
        'UPDATE wallets SET balance = balance + ? WHERE wallet_id = ?',
        [offer.offer_price, sellerWallet.wallet_id]
      );

      const [sellerBalanceRows] = await conn.execute(
        'SELECT balance FROM wallets WHERE wallet_id = ?',
        [sellerWallet.wallet_id]
      );
      await conn.execute(
        `INSERT INTO wallet_transactions
          (wallet_id, transaction_type, amount, balance_after, related_offer_id, related_listing_id, note)
         VALUES (?, 'sale_credit', ?, ?, ?, ?, ?)`,
        [sellerWallet.wallet_id, offer.offer_price, sellerBalanceRows[0].balance, req.params.offer_id, offer.listing_id, 'Sale completed']
      );

      await conn.execute(
        `UPDATE user_games SET status = 'traded'
         WHERE user_id = ? AND game_id = ? AND status = 'active'`,
        [req.user.user_id, offer.game_id]
      );

      await conn.execute(
        `INSERT INTO user_games (user_id, game_id, status)
         VALUES (?, ?, 'active')
         ON DUPLICATE KEY UPDATE status = 'active'`,
        [offer.buyer_id, offer.game_id]
      );

      for (const pending of pendingOffers) {
        const [buyerWalletRows] = await conn.execute(
          'SELECT wallet_id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
          [pending.buyer_id]
        );
        if (buyerWalletRows.length === 0) continue;

        await conn.execute(
          'UPDATE wallets SET balance = balance + ? WHERE wallet_id = ?',
          [pending.offer_price, buyerWalletRows[0].wallet_id]
        );
        const [buyerBalanceRows] = await conn.execute(
          'SELECT balance FROM wallets WHERE wallet_id = ?',
          [buyerWalletRows[0].wallet_id]
        );
        await conn.execute(
          `INSERT INTO wallet_transactions
            (wallet_id, transaction_type, amount, balance_after, related_offer_id, related_listing_id, note)
           VALUES (?, 'refund', ?, ?, ?, ?, ?)`,
          [buyerWalletRows[0].wallet_id, pending.offer_price, buyerBalanceRows[0].balance, pending.offer_id, offer.listing_id, 'Offer rejected, funds returned']
        );
      }
    } else {
      await conn.execute(
        'UPDATE offers SET offer_status = ? WHERE offer_id = ?',
        ['rejected', req.params.offer_id]
      );

      const [buyerWalletRows] = await conn.execute(
        'SELECT wallet_id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [offer.buyer_id]
      );
      if (buyerWalletRows.length === 0) {
        await conn.rollback();
        return res.status(500).json({ error: 'Buyer wallet not found' });
      }

      await conn.execute(
        'UPDATE wallets SET balance = balance + ? WHERE wallet_id = ?',
        [offer.offer_price, buyerWalletRows[0].wallet_id]
      );

      const [buyerBalanceRows] = await conn.execute(
        'SELECT balance FROM wallets WHERE wallet_id = ?',
        [buyerWalletRows[0].wallet_id]
      );
      await conn.execute(
        `INSERT INTO wallet_transactions
          (wallet_id, transaction_type, amount, balance_after, related_offer_id, related_listing_id, note)
         VALUES (?, 'refund', ?, ?, ?, ?, ?)`,
        [buyerWalletRows[0].wallet_id, offer.offer_price, buyerBalanceRows[0].balance, req.params.offer_id, offer.listing_id, 'Offer rejected, funds returned']
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
