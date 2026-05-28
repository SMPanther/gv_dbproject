import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Reviews() {
  const [stats, setStats]   = useState([]);
  const [games, setGames]   = useState([]);
  const [form, setForm]     = useState({ game_id: '', rating: 5, comment: '' });
  const [msg, setMsg]       = useState('');
  const [tab, setTab]       = useState('leaderboard');
  const { isLoggedIn }      = useAuth();

  const loadStats = () => api.get('/reviews/stats').then(r => setStats(r.data));

  useEffect(() => {
    loadStats();
    api.get('/games').then(r => setGames(r.data));
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const submitReview = async e => {
    e.preventDefault();
    try {
      await api.post('/reviews', form);
      flash('Review posted!');
      setForm({ game_id: '', rating: 5, comment: '' });
      loadStats();
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="page">
      <h1 className="page-title">Reviews & Ratings</h1>
      <p className="page-sub">Community scores powered by SQL aggregates</p>

      {msg && <p style={s.toast}>{msg}</p>}

      {/* Tabs */}
      <div style={s.tabs}>
        {['leaderboard', 'write'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
            {t === 'leaderboard' ? '🏆 Leaderboard' : '✏️ Write Review'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div>
          {/* Top 3 podium */}
          {stats.length > 0 && (
            <div style={s.podium}>
              {stats.slice(0, 3).map((g, i) => (
                <div key={g.game_id} style={{ ...s.podiumCard, ...podiumStyle[i] }}>
                  <div style={s.podiumRank}>{['🥇','🥈','🥉'][i]}</div>
                  <div style={s.podiumTitle}>{g.title}</div>
                  <div style={s.podiumGenre}>{g.genre}</div>
                  <div style={s.podiumScore}>{g.avg_rating}</div>
                  <div style={s.stars}>{STARS(Math.round(g.avg_rating))}</div>
                  <div style={s.podiumCount}>{g.review_count} reviews</div>
                </div>
              ))}
            </div>
          )}

          {/* Full table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
            <div style={s.tableHeader}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>All Ratings</span>
              <span style={{ color: '#9090a8', fontSize: 12 }}>
                GROUP BY game + AVG(rating)
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Game</th>
                    <th>Genre</th>
                    <th>Avg Rating</th>
                    <th>Reviews</th>
                    <th>Stars</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((g, i) => (
                    <tr key={g.game_id}>
                      <td style={{ color: '#5a5a70' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{g.title}</td>
                      <td><span className="tag">{g.genre}</span></td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {g.avg_rating}
                        </span>
                      </td>
                      <td style={{ color: '#9090a8' }}>{g.review_count}</td>
                      <td className="stars" style={{ fontSize: 12 }}>
                        {STARS(Math.round(g.avg_rating))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'write' && (
        <div style={{ maxWidth: 520 }}>
          {!isLoggedIn ? (
            <div className="empty-state">
              <h3>Login to write a review</h3>
            </div>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Post a Review</h3>
              <form onSubmit={submitReview}>
                <div className="form-group">
                  <label>Game</label>
                  <select className="form-input" value={form.game_id}
                    onChange={e => setForm({ ...form, game_id: e.target.value })} required>
                    <option value="">Select a game</option>
                    {games.map(g => (
                      <option key={g.game_id} value={g.game_id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <div style={s.ratingPicker}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setForm({ ...form, rating: n })}
                        style={{ ...s.starBtn, color: n <= form.rating ? '#f59e0b' : '#2a2a3a' }}>
                        ★
                      </button>
                    ))}
                    <span style={{ color: '#9090a8', fontSize: 13, marginLeft: 8 }}>
                      {form.rating}/5
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Comment (optional)</label>
                  <textarea className="form-input" rows={4}
                    placeholder="What did you think of this game?"
                    value={form.comment}
                    onChange={e => setForm({ ...form, comment: e.target.value })}
                    style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn btn-primary">Post Review</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const podiumStyle = [
  { borderColor: 'rgba(245,158,11,.4)', background: 'rgba(245,158,11,.05)' },
  { borderColor: 'rgba(148,163,184,.3)', background: 'rgba(148,163,184,.04)' },
  { borderColor: 'rgba(180,120,60,.3)', background: 'rgba(180,120,60,.04)' },
];

const s = {
  toast: {
    padding: '10px 16px', background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)',
    borderRadius: 8, color: '#a855f7', marginBottom: 16, fontSize: 13,
  },
  tabs: { display: 'flex', gap: 6, marginBottom: 24 },
  tab: {
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    background: 'transparent', color: '#9090a8', border: '1px solid #2a2a3a', cursor: 'pointer',
  },
  tabActive: { background: 'rgba(124,58,237,.15)', color: '#e8e8f0', borderColor: '#7c3aed' },
  podium: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  podiumCard: {
    flex: '1 1 180px',
    border: '1px solid',
    borderRadius: 12, padding: '20px 16px', textAlign: 'center',
  },
  podiumRank: { fontSize: 28, marginBottom: 8 },
  podiumTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  podiumGenre: { color: '#9090a8', fontSize: 12, marginBottom: 10 },
  podiumScore: { fontSize: 32, fontWeight: 700, color: '#f59e0b', fontFamily: 'Rajdhani, sans-serif' },
  stars: { color: '#f59e0b', fontSize: 14, margin: '4px 0' },
  podiumCount: { color: '#5a5a70', fontSize: 11, marginTop: 4 },
  tableHeader: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a3a' },
  ratingPicker: { display: 'flex', alignItems: 'center', gap: 4 },
  starBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, padding: '0 2px', transition: 'color 0.15s' },
};
