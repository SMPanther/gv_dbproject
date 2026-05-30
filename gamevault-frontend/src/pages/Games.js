import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);

const EMPTY_FORM = { title: '', genre: '', price: '', platform: '', developer: '', release_date: '' };

export default function Games() {
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [genre, setGenre]       = useState('All');
  const [msg, setMsg]           = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState(null);
  const { isLoggedIn, user }    = useAuth();

  const isAdmin = user?.role === 'admin';

  const load = () => api.get('/games').then(r => { setGames(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const genres = ['All', ...new Set(games.map(g => g.genre))];

  const filtered = games.filter(g => {
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase()) ||
                        g.developer.toLowerCase().includes(search.toLowerCase());
    const matchGenre  = genre === 'All' || g.genre === genre;
    return matchSearch && matchGenre;
  });

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const addToCollection = async game_id => {
    if (!isLoggedIn) return flash('Please login first');
    try {
      await api.post('/collection', { game_id, status: 'active' });
      flash('Added to collection!');
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  const addToWishlist = async game_id => {
    if (!isLoggedIn) return flash('Please login first');
    try {
      await api.post('/collection', { game_id, status: 'wishlist' });
      flash('Added to wishlist!');
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  const addGame = async e => {
    e.preventDefault();
    try {
      await api.post('/games', form);
      flash('Game added!');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  const deleteGame = async game_id => {
    setDeleting(game_id);
    try {
      await api.delete(`/games/${game_id}`);
      flash('Game deleted!');
      load();
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
    setDeleting(null);
  };

  if (loading) return <div className="loading">Loading games...</div>;

  return (
    <div className="page">
      <div style={s.topRow}>
        <div>
          <h1 className="page-title">Game Catalog</h1>
          <p className="page-sub">{games.length} games available</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '✕ Cancel' : '+ Add Game'}
          </button>
        )}
      </div>

      {/* Admin: Add Game Form */}
      {isAdmin && showAdd && (
        <div className="card" style={s.addForm}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>➕ Add New Game to Database</h3>
          <form onSubmit={addGame}>
            <div style={s.formGrid}>
              <div className="form-group">
                <label>Title</label>
                <input className="form-input" placeholder="e.g. God of War"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Genre</label>
                <input className="form-input" placeholder="e.g. Action-Adventure"
                  value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Price ($)</label>
                <input className="form-input" type="number" step="0.01" placeholder="59.99"
                  value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select className="form-input" value={form.platform}
                  onChange={e => setForm({ ...form, platform: e.target.value })} required>
                  <option value="">Select platform</option>
                  <option>PC</option>
                  <option>PS5</option>
                  <option>Xbox</option>
                  <option>Nintendo Switch</option>
                  <option>Mobile</option>
                </select>
              </div>
              <div className="form-group">
                <label>Developer</label>
                <input className="form-input" placeholder="e.g. Santa Monica Studio"
                  value={form.developer} onChange={e => setForm({ ...form, developer: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Release Date</label>
                <input className="form-input" type="date"
                  value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Insert into Database</button>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input className="form-input" style={{ maxWidth: 280 }}
          placeholder="Search games or developer..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.genreRow}>
          {genres.map(g => (
            <button key={g} onClick={() => setGenre(g)}
              style={{ ...s.genreBtn, ...(genre === g ? s.genreActive : {}) }}>{g}</button>
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
                {!isAdmin && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => addToCollection(g.game_id)}>
                      + Collection
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => addToWishlist(g.game_id)}>
                      ♡ Wishlist
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button className="btn btn-danger btn-sm"
                    onClick={() => deleteGame(g.game_id)}
                    disabled={deleting === g.game_id}>
                    {deleting === g.game_id ? 'Deleting...' : '🗑 Delete Game'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  addForm: { marginBottom: 24, borderColor: 'rgba(124,58,237,.4)', background: 'rgba(124,58,237,.05)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 16px' },
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
