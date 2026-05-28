import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Games() {
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [genre, setGenre]     = useState('All');
  const [msg, setMsg]         = useState('');
  const { isLoggedIn }        = useAuth();

  useEffect(() => {
    api.get('/games').then(r => { setGames(r.data); setLoading(false); });
  }, []);

  const genres = ['All', ...new Set(games.map(g => g.genre))];

  const filtered = games.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase()) ||
                        g.developer.toLowerCase().includes(search.toLowerCase());
    const matchGenre  = genre === 'All' || g.genre === genre;
    return matchSearch && matchGenre;
  });

  const addToCollection = async game_id => {
    if (!isLoggedIn) return setMsg('Please login first');
    try {
      await api.post('/collection', { game_id, status: 'active' });
      setMsg('Added to collection!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const addToWishlist = async game_id => {
    if (!isLoggedIn) return setMsg('Please login first');
    try {
      await api.post('/collection', { game_id, status: 'wishlist' });
      setMsg('Added to wishlist!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return <div className="loading">Loading games...</div>;

  return (
    <div className="page">
      <h1 className="page-title">Game Catalog</h1>
      <p className="page-sub">{games.length} games available</p>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="Search games or developer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={s.genreRow}>
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              style={{ ...s.genreBtn, ...(genre === g ? s.genreActive : {}) }}
            >{g}</button>
          ))}
        </div>
      </div>

      {msg && <p style={s.toast}>{msg}</p>}

      {filtered.length === 0 ? (
        <div className="empty-state"><h3>No games found</h3></div>
      ) : (
        <div className="grid-3">
          {filtered.map(g => (
            <div key={g.game_id} className="card" style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardIcon}>{g.genre[0]}</div>
                <div>
                  <span className="tag">{g.genre}</span>
                  <span style={s.platform}>{g.platform}</span>
                </div>
              </div>
              <h3 style={s.gameTitle}>{g.title}</h3>
              <p style={s.dev}>{g.developer}</p>

              {g.avg_rating && (
                <div style={s.ratingRow}>
                  <span className="stars">{STARS(Math.round(g.avg_rating))}</span>
                  <span style={s.ratingNum}>{g.avg_rating} ({g.review_count})</span>
                </div>
              )}

              <div style={s.priceRow}>
                <span style={s.price}>${g.price}</span>
              </div>

              <div style={s.actions}>
                <button className="btn btn-primary btn-sm"
                  onClick={() => addToCollection(g.game_id)}>
                  + Collection
                </button>
                <button className="btn btn-outline btn-sm"
                  onClick={() => addToWishlist(g.game_id)}>
                  ♡ Wishlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' },
  genreRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  genreBtn: {
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
    background: 'transparent', color: '#9090a8', border: '1px solid #2a2a3a',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  genreActive: { background: 'rgba(124,58,237,.2)', color: '#a855f7', borderColor: '#7c3aed' },
  toast: {
    padding: '10px 16px', background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)',
    borderRadius: 8, color: '#a855f7', marginBottom: 16, fontSize: 13,
  },
  card: { display: 'flex', flexDirection: 'column', gap: 8 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIcon: {
    width: 42, height: 42, borderRadius: 10, background: 'rgba(124,58,237,.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, color: '#a855f7', fontWeight: 700,
  },
  platform: { fontSize: 11, color: '#5a5a70', marginLeft: 6 },
  gameTitle: { fontSize: 17, fontWeight: 700, marginTop: 4 },
  dev: { color: '#9090a8', fontSize: 12 },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 6 },
  ratingNum: { color: '#9090a8', fontSize: 12 },
  priceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 20, fontWeight: 700, color: '#a855f7', fontFamily: 'Rajdhani, sans-serif' },
  actions: { display: 'flex', gap: 8, marginTop: 4 },
};
