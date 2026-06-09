const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

async function getOrCreateWallet(connOrPool, userId, useConn = false) {
  if (!userId) throw new Error('Invalid user ID for wallet operations');
  const executor = useConn ? connOrPool.execute.bind(connOrPool) : connOrPool.execute.bind(connOrPool);
  const [rows] = await executor(
    'SELECT wallet_id, balance FROM wallets WHERE user_id = ?' + (useConn ? ' FOR UPDATE' : ''),
    [userId]
  );
  if (rows.length > 0) return rows[0];

  await executor('INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)', [userId]);
  const [newRows] = await executor(
    'SELECT wallet_id, balance FROM wallets WHERE user_id = ?' + (useConn ? ' FOR UPDATE' : ''),
    [userId]
  );
  return newRows[0];
}

// GET /api/wallet
router.get('/', auth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(pool, req.user.user_id);
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/deposit
router.post('/deposit', auth, async (req, res) => {
  const { amount } = req.body;
  const deposit = parseFloat(amount);
  if (Number.isNaN(deposit) || deposit <= 0)
    return res.status(400).json({ error: 'Deposit amount must be a positive number' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const wallet = await getOrCreateWallet(conn, req.user.user_id, true);
    await conn.execute(
      'UPDATE wallets SET balance = balance + ? WHERE wallet_id = ?',
      [deposit, wallet.wallet_id]
    );

    const [updatedRows] = await conn.execute(
      'SELECT balance FROM wallets WHERE wallet_id = ?',
      [wallet.wallet_id]
    );

    await conn.execute(
      `INSERT INTO wallet_transactions
        (wallet_id, transaction_type, amount, balance_after, note)
       VALUES (?, 'deposit', ?, ?, ?)`,
      [wallet.wallet_id, deposit, updatedRows[0].balance, 'Wallet deposit']
    );

    await conn.commit();
    res.json({ message: 'Deposit successful', balance: updatedRows[0].balance });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/wallet/transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT transaction_id, transaction_type, amount, balance_after, related_offer_id, related_listing_id, note, created_at
       FROM wallet_transactions wt
       JOIN wallets w ON wt.wallet_id = w.wallet_id
       WHERE w.user_id = ?
       ORDER BY wt.created_at DESC
       LIMIT 50`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
