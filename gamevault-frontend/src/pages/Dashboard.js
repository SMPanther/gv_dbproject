import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STARS = n => '★'.repeat(Math.round(n || 0)) + '☆'.repeat(5 - Math.round(n || 0));

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoggedIn }  = useAuth();
  const navigate              = useNavigate();

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') { navigate('/'); return; }
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); });
  }, [isLoggedIn, user, navigate]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data)   return null;

  const { counts, activeListings, gameRatings, userCollections, recentListings, recentOffers, recentSales } = data;

  return (
    <div className="page">
      <h1 className="page-title">⚡ Live Database Dashboard</h1>
      <p className="page-sub">Real-time stats from MySQL — views, aggregates, JOINs</p>

      {/* ── ROW COUNTS ── */}
      <div style={s.countGrid}>
        {Object.entries(counts).map(([key, val]) => (
          <div key={key} className="card" style={s.countCard}>
            <div style={s.countVal}>{val}</div>
            <div style={s.countLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</div>
          </div>
        ))}
      </div>

      {/* ── GAME RATINGS VIEW ── */}
      <h2 style={s.sectionTitle}>📊 vw_game_ratings — Ratings Leaderboard</h2>
      <p style={s.sectionSub}>Source: VIEW using LEFT JOIN + AVG() + COUNT() + GROUP BY</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Genre</th>
                <th>Price</th>
                <th>Avg Rating</th>
                <th>Reviews</th>
                <th>High / Low</th>
                <th>Stars</th>
              </tr>
            </thead>
            <tbody>
              {gameRatings.map((g, i) => (
                <tr key={g.game_id}>
                  <td style={{ color: '#5a5a70' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{g.title}</td>
                  <td><span className="tag">{g.genre}</span></td>
                  <td style={{ color: '#9090a8' }}>${g.price}</td>
                  <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>{g.avg_rating ?? '—'}</span></td>
                  <td style={{ color: '#9090a8' }}>{g.review_count}</td>
                  <td style={{ color: '#9090a8', fontSize: 12 }}>
                    {g.highest_rating ? `${g.highest_rating} / ${g.lowest_rating}` : '—'}
                  </td>
                  <td style={{ color: '#f59e0b', fontSize: 12 }}>{g.avg_rating ? STARS(g.avg_rating) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── USER COLLECTIONS VIEW ── */}
      <h2 style={s.sectionTitle}>👥 vw_user_collections — User Library Summary</h2>
      <p style={s.sectionSub}>Source: VIEW using LEFT JOIN + SUM(CASE WHEN) + COUNT()</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Total Games</th>
                <th>Active</th>
                <th>Wishlist</th>
                <th>Traded</th>
                <th>Library Value</th>
              </tr>
            </thead>
            <tbody>
              {userCollections.map(u => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td><span className={`badge badge-${u.role === 'admin' ? 'active' : u.role === 'seller' ? 'wishlist' : 'traded'}`}>{u.role}</span></td>
                  <td style={{ fontWeight: 700 }}>{u.total_games}</td>
                  <td style={{ color: '#22c55e' }}>{u.active_count}</td>
                  <td style={{ color: '#06b6d4' }}>{u.wishlist_count}</td>
                  <td style={{ color: '#9090a8' }}>{u.traded_count}</td>
                  <td style={{ color: '#a855f7', fontWeight: 700 }}>
                    {u.total_library_value ? `$${u.total_library_value}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIVE LISTINGS VIEW ── */}
      <h2 style={s.sectionTitle}>🛒 vw_active_listings — Marketplace Overview</h2>
      <p style={s.sectionSub}>Source: VIEW using INNER JOIN + correlated subquery for best offer</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Seller</th>
                <th>Ask Price</th>
                <th>Best Offer</th>
                <th>Total Offers</th>
                <th>Listed</th>
              </tr>
            </thead>
            <tbody>
              {activeListings.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#5a5a70' }}>No active listings</td></tr>
              ) : activeListings.map(l => (
                <tr key={l.listing_id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{l.game_title}</span>
                    <br/><span style={{ color: '#9090a8', fontSize: 11 }}>{l.platform}</span>
                  </td>
                  <td style={{ color: '#9090a8' }}>{l.seller}</td>
                  <td style={{ color: '#a855f7', fontWeight: 700 }}>${l.ask_price}</td>
                  <td style={{ color: '#22c55e', fontWeight: 600 }}>{l.best_offer ? `$${l.best_offer}` : '—'}</td>
                  <td style={{ color: '#9090a8' }}>{l.total_offers}</td>
                  <td style={{ color: '#9090a8' }}>{new Date(l.listed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={s.sectionTitle}>📌 Recent Marketplace Actions</h2>
      <p style={s.sectionSub}>Admin provenance: who listed, who offered, who sold, who bought.</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Game</th>
                <th>Seller</th>
                <th>Ask</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentListings.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#5a5a70' }}>No recent listings</td></tr>
              ) : recentListings.map(r => (
                <tr key={r.listing_id}>
                  <td>{r.listing_id}</td>
                  <td style={{ fontWeight: 600 }}>{r.game_title}</td>
                  <td style={{ color: '#9090a8' }}>{r.seller}</td>
                  <td style={{ color: '#a855f7', fontWeight: 700 }}>${r.ask_price}</td>
                  <td style={{ color: '#9090a8' }}>{new Date(r.listed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offer</th>
                <th>Game</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Status</th>
                <th>Offered</th>
              </tr>
            </thead>
            <tbody>
              {recentOffers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#5a5a70' }}>No recent offers</td></tr>
              ) : recentOffers.map(o => (
                <tr key={o.offer_id}>
                  <td>{o.offer_id}</td>
                  <td style={{ fontWeight: 600 }}>{o.game_title}</td>
                  <td style={{ color: '#9090a8' }}>{o.seller}</td>
                  <td style={{ color: '#22c55e' }}>{o.buyer}</td>
                  <td style={{ color: '#a855f7', fontWeight: 700 }}>${o.offer_price}</td>
                  <td style={{ color: '#5a5a70' }}>{o.offer_status}</td>
                  <td style={{ color: '#9090a8' }}>{new Date(o.offered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sale</th>
                <th>Game</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Sold At</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#5a5a70' }}>No recent sales</td></tr>
              ) : recentSales.map(sale => (
                <tr key={sale.offer_id}>
                  <td>{sale.offer_id}</td>
                  <td style={{ fontWeight: 600 }}>{sale.game_title}</td>
                  <td style={{ color: '#9090a8' }}>{sale.seller}</td>
                  <td style={{ color: '#22c55e' }}>{sale.buyer}</td>
                  <td style={{ color: '#a855f7', fontWeight: 700 }}>${sale.offer_price}</td>
                  <td style={{ color: '#9090a8' }}>{new Date(sale.offered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ color: '#5a5a70', fontSize: 11, textAlign: 'center' }}>
        Last refreshed: {new Date(data.timestamp).toLocaleTimeString()} · Admin only
      </p>
    </div>
  );
}

const s = {
  countGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 32 },
  countCard: { textAlign: 'center', padding: '20px 16px' },
  countVal:  { fontSize: 36, fontWeight: 700, color: '#a855f7', fontFamily: 'Rajdhani, sans-serif' },
  countLabel:{ color: '#9090a8', fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  sectionSub:   { color: '#5a5a70', fontSize: 12, marginBottom: 12, fontFamily: 'monospace' },
};
