import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Marketplace() {
  const [listings, setListings]   = useState([]);
  const [games, setGames]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [offerModal, setOfferModal] = useState(null); // listing object
  const [newListing, setNewListing] = useState({ game_id: '', ask_price: '' });
  const [offerPrice, setOfferPrice] = useState('');
  const [msg, setMsg]             = useState('');
  const { isLoggedIn, user }      = useAuth();

  const load = async () => {
    const [l, g] = await Promise.all([api.get('/marketplace'), api.get('/games')]);
    setListings(l.data); setGames(g.data); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const createListing = async e => {
    e.preventDefault();
    try {
      await api.post('/marketplace', newListing);
      flash('Listing created!'); setShowForm(false); setNewListing({ game_id: '', ask_price: '' });
      load();
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  const cancelListing = async id => {
    try {
      await api.patch(`/marketplace/${id}/cancel`);
      flash('Listing cancelled'); load();
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  const makeOffer = async e => {
    e.preventDefault();
    try {
      await api.post(`/marketplace/${offerModal.listing_id}/offers`, { offer_price: offerPrice });
      flash('Offer placed!'); setOfferModal(null); setOfferPrice('');
    } catch (err) { flash(err.response?.data?.error || 'Error'); }
  };

  if (loading) return <div className="loading">Loading marketplace...</div>;

  return (
    <div className="page">
      <div style={s.topRow}>
        <div>
          <h1 className="page-title">Marketplace</h1>
          <p className="page-sub">{listings.length} active listings</p>
        </div>
        {isLoggedIn && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Listing'}
          </button>
        )}
      </div>

      {msg && <p style={s.toast}>{msg}</p>}

      {/* Create listing form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Create Listing</h3>
          <form onSubmit={createListing}>
            <div className="form-group">
              <label>Game</label>
              <select className="form-input" value={newListing.game_id}
                onChange={e => setNewListing({ ...newListing, game_id: e.target.value })} required>
                <option value="">Select a game</option>
                {games.map(g => (
                  <option key={g.game_id} value={g.game_id}>{g.title} ({g.platform})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ask Price ($)</label>
              <input className="form-input" type="number" step="0.01" min="0.01"
                placeholder="e.g. 29.99" value={newListing.ask_price}
                onChange={e => setNewListing({ ...newListing, ask_price: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary">Create Listing</button>
          </form>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="empty-state"><h3>No active listings</h3></div>
      ) : (
        <div className="grid-2">
          {listings.map(l => (
            <div key={l.listing_id} className="card" style={s.card}>
              <div style={s.cardHead}>
                <div>
                  <h3 style={s.gameTitle}>{l.game_title}</h3>
                  <p style={s.seller}>by {l.seller} · {l.platform}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.askPrice}>${l.ask_price}</div>
                  <span className="tag">{l.genre}</span>
                </div>
              </div>

              {l.best_offer && (
                <div style={s.offerBadge}>
                  Best offer: <strong>${l.best_offer}</strong>
                </div>
              )}

              <div style={s.cardDate}>
                Listed {new Date(l.listed_at).toLocaleDateString()}
              </div>

              <div style={s.actions}>
                {isLoggedIn && user.username !== l.seller && (
                  <button className="btn btn-primary btn-sm"
                    onClick={() => setOfferModal(l)}>
                    Make Offer
                  </button>
                )}
                {isLoggedIn && user.username === l.seller && (
                  <button className="btn btn-danger btn-sm"
                    onClick={() => cancelListing(l.listing_id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offer modal */}
      {offerModal && (
        <div style={s.overlay} onClick={() => setOfferModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Make an Offer</h3>
            <p style={{ color: '#9090a8', fontSize: 13, marginBottom: 20 }}>
              {offerModal.game_title} — asking ${offerModal.ask_price}
            </p>
            <form onSubmit={makeOffer}>
              <div className="form-group">
                <label>Your Offer Price ($)</label>
                <input className="form-input" type="number" step="0.01" min="0.01"
                  placeholder={offerModal.ask_price} value={offerPrice}
                  onChange={e => setOfferPrice(e.target.value)} required autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary">Submit Offer</button>
                <button type="button" className="btn btn-outline"
                  onClick={() => setOfferModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  toast: {
    padding: '10px 16px', background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)',
    borderRadius: 8, color: '#a855f7', marginBottom: 16, fontSize: 13,
  },
  card: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  gameTitle: { fontSize: 16, fontWeight: 700 },
  seller: { color: '#9090a8', fontSize: 12, marginTop: 2 },
  askPrice: { fontSize: 22, fontWeight: 700, color: '#a855f7', fontFamily: 'Rajdhani, sans-serif' },
  offerBadge: {
    background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
    borderRadius: 6, padding: '6px 12px', fontSize: 13, color: '#9090a8',
  },
  cardDate: { color: '#5a5a70', fontSize: 11 },
  actions: { display: 'flex', gap: 8, marginTop: 4 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    background: '#111118', border: '1px solid #2a2a3a', borderRadius: 16,
    padding: 32, width: '100%', maxWidth: 400,
  },
};
