import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Marketplace() {
  const [listings, setListings]     = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myOffers, setMyOffers]     = useState([]);
  const [games, setGames]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('browse');
  const [showForm, setShowForm]     = useState(false);
  const [offerModal, setOfferModal] = useState(null);
  const [offersPanel, setOffersPanel] = useState(null); // listing to show offers for
  const [panelOffers, setPanelOffers] = useState([]);
  const [newListing, setNewListing] = useState({ game_id: '', ask_price: '' });
  const [offerPrice, setOfferPrice] = useState('');
  const [msg, setMsg]               = useState({ text: '', type: 'ok' });
  const { isLoggedIn, user }        = useAuth();

  const flash = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'ok' }), 3000); };

  const loadAll = async () => {
    try {
      const [l, g] = await Promise.all([api.get('/marketplace'), api.get('/games')]);
      setListings(l.data); setGames(g.data);
      if (isLoggedIn) {
        const [ml, mo] = await Promise.all([
          api.get('/marketplace/my/listings'),
          api.get('/marketplace/my/offers'),
        ]);
        setMyListings(ml.data);
        setMyOffers(mo.data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [isLoggedIn]);

  const createListing = async e => {
    e.preventDefault();
    try {
      await api.post('/marketplace', newListing);
      flash('Listing created!');
      setShowForm(false);
      setNewListing({ game_id: '', ask_price: '' });
      loadAll();
    } catch (err) { flash(err.response?.data?.error || 'Error', 'err'); }
  };

  const cancelListing = async id => {
    try {
      await api.patch(`/marketplace/${id}/cancel`);
      flash('Listing cancelled');
      loadAll();
    } catch (err) { flash(err.response?.data?.error || 'Error', 'err'); }
  };

  const makeOffer = async e => {
    e.preventDefault();
    try {
      await api.post(`/marketplace/${offerModal.listing_id}/offers`, { offer_price: offerPrice });
      flash('Offer placed!');
      setOfferModal(null);
      setOfferPrice('');
      loadAll();
    } catch (err) { flash(err.response?.data?.error || 'Error', 'err'); }
  };

  const viewOffers = async listing => {
    setOffersPanel(listing);
    try {
      const res = await api.get(`/marketplace/${listing.listing_id}/offers`);
      setPanelOffers(res.data);
    } catch (err) { setPanelOffers([]); }
  };

  const respondOffer = async (offer_id, offer_status) => {
    try {
      await api.patch(`/marketplace/offers/${offer_id}`, { offer_status });
      flash(offer_status === 'accepted' ? '✅ Offer accepted — listing sold!' : 'Offer rejected');
      setOffersPanel(null);
      loadAll();
    } catch (err) { flash(err.response?.data?.error || 'Error', 'err'); }
  };

  const TABS = ['browse', ...(isLoggedIn ? ['my listings', 'my offers'] : [])];

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

      {/* Flash message */}
      {msg.text && (
        <p style={{ ...s.toast, background: msg.type === 'err' ? 'rgba(239,68,68,.15)' : 'rgba(124,58,237,.15)', borderColor: msg.type === 'err' ? 'rgba(239,68,68,.3)' : 'rgba(124,58,237,.3)', color: msg.type === 'err' ? '#ef4444' : '#a855f7' }}>
          {msg.text}
        </p>
      )}

      {/* Create listing form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 480, borderColor: 'rgba(124,58,237,.4)' }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Create Listing</h3>
          <form onSubmit={createListing}>
            <div className="form-group">
              <label>Game</label>
              <select className="form-input" value={newListing.game_id}
                onChange={e => setNewListing({ ...newListing, game_id: e.target.value })} required>
                <option value="">Select a game</option>
                {games.map(g => <option key={g.game_id} value={g.game_id}>{g.title} ({g.platform})</option>)}
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

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'my listings' && <span style={s.badge}>{myListings.length}</span>}
            {t === 'my offers'   && <span style={s.badge}>{myOffers.length}</span>}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        listings.length === 0 ? (
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
                <div style={s.statsRow}>
                  {l.best_offer && (
                    <span style={s.offerBadge}>Best offer: <strong>${l.best_offer}</strong></span>
                  )}
                  <span style={s.offerCount}>{l.total_offers} offer{l.total_offers !== 1 ? 's' : ''}</span>
                </div>
                <div style={s.cardDate}>Listed {new Date(l.listed_at).toLocaleDateString()}</div>
                <div style={s.actions}>
                  {isLoggedIn && user.username !== l.seller && (
                    <button className="btn btn-primary btn-sm" onClick={() => setOfferModal(l)}>
                      Make Offer
                    </button>
                  )}
                  {!isLoggedIn && (
                    <span style={{ color: '#5a5a70', fontSize: 12 }}>Login to make an offer</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── MY LISTINGS TAB ── */}
      {tab === 'my listings' && (
        myListings.length === 0 ? (
          <div className="empty-state"><h3>No listings yet</h3><p>Click + New Listing to start selling</p></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Ask Price</th>
                    <th>Status</th>
                    <th>Offers</th>
                    <th>Best Offer</th>
                    <th>Listed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myListings.map(l => (
                    <tr key={l.listing_id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{l.game_title}</span>
                        <br/><span style={{ color: '#9090a8', fontSize: 11 }}>{l.platform}</span>
                      </td>
                      <td style={{ color: '#a855f7', fontWeight: 700 }}>${l.ask_price}</td>
                      <td><span className={`badge badge-${l.listing_status}`}>{l.listing_status}</span></td>
                      <td style={{ color: '#9090a8' }}>{l.offer_count}</td>
                      <td style={{ color: '#22c55e', fontWeight: 600 }}>
                        {l.best_offer ? `$${l.best_offer}` : '—'}
                      </td>
                      <td style={{ color: '#9090a8' }}>{new Date(l.listed_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {l.listing_status === 'active' && l.offer_count > 0 && (
                            <button className="btn btn-primary btn-sm" onClick={() => viewOffers(l)}>
                              View Offers ({l.offer_count})
                            </button>
                          )}
                          {l.listing_status === 'active' && (
                            <button className="btn btn-danger btn-sm" onClick={() => cancelListing(l.listing_id)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── MY OFFERS TAB ── */}
      {tab === 'my offers' && (
        myOffers.length === 0 ? (
          <div className="empty-state"><h3>No offers made yet</h3></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Seller</th>
                    <th>Ask Price</th>
                    <th>My Offer</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myOffers.map(o => (
                    <tr key={o.offer_id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{o.game_title}</span>
                        <br/><span style={{ color: '#9090a8', fontSize: 11 }}>{o.platform}</span>
                      </td>
                      <td style={{ color: '#9090a8' }}>{o.seller}</td>
                      <td style={{ color: '#9090a8' }}>${o.ask_price}</td>
                      <td style={{ color: '#a855f7', fontWeight: 700 }}>${o.offer_price}</td>
                      <td><span className={`badge badge-${o.offer_status}`}>{o.offer_status}</span></td>
                      <td style={{ color: '#9090a8' }}>{new Date(o.offered_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── MAKE OFFER MODAL ── */}
      {offerModal && (
        <div style={s.overlay} onClick={() => setOfferModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Make an Offer</h3>
            <p style={{ color: '#9090a8', fontSize: 13, marginBottom: 20 }}>
              {offerModal.game_title} — asking ${offerModal.ask_price}
              {offerModal.best_offer && ` · Best so far: $${offerModal.best_offer}`}
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
                <button type="button" className="btn btn-outline" onClick={() => setOfferModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW OFFERS PANEL (seller) ── */}
      {offersPanel && (
        <div style={s.overlay} onClick={() => setOffersPanel(null)}>
          <div style={{ ...s.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Offers on {offersPanel.game_title}</h3>
            <p style={{ color: '#9090a8', fontSize: 13, marginBottom: 20 }}>
              Your asking price: ${offersPanel.ask_price} · {panelOffers.length} offer(s)
            </p>
            {panelOffers.length === 0 ? (
              <p style={{ color: '#9090a8' }}>No offers yet</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Offer</th>
                      <th>% of Ask</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelOffers.map(o => (
                      <tr key={o.offer_id}>
                        <td style={{ fontWeight: 600 }}>{o.buyer}</td>
                        <td style={{ color: '#a855f7', fontWeight: 700 }}>${o.offer_price}</td>
                        <td style={{ color: o.pct_of_ask >= 90 ? '#22c55e' : '#f59e0b' }}>
                          {o.pct_of_ask}%
                        </td>
                        <td><span className={`badge badge-${o.offer_status}`}>{o.offer_status}</span></td>
                        <td>
                          {o.offer_status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary btn-sm"
                                onClick={() => respondOffer(o.offer_id, 'accepted')}>
                                Accept
                              </button>
                              <button className="btn btn-danger btn-sm"
                                onClick={() => respondOffer(o.offer_id, 'rejected')}>
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-outline" style={{ marginTop: 20 }}
              onClick={() => setOffersPanel(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  toast: { padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: '1px solid' },
  tabs: { display: 'flex', gap: 6, marginBottom: 20 },
  tab: { padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'transparent', color: '#9090a8', border: '1px solid #2a2a3a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: 'rgba(124,58,237,.15)', color: '#e8e8f0', borderColor: '#7c3aed' },
  badge: { background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: '1px 7px', fontSize: 11 },
  card: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  gameTitle: { fontSize: 16, fontWeight: 700 },
  seller: { color: '#9090a8', fontSize: 12, marginTop: 2 },
  askPrice: { fontSize: 22, fontWeight: 700, color: '#a855f7', fontFamily: 'Rajdhani, sans-serif' },
  statsRow: { display: 'flex', alignItems: 'center', gap: 10 },
  offerBadge: { background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#9090a8' },
  offerCount: { color: '#5a5a70', fontSize: 12 },
  cardDate: { color: '#5a5a70', fontSize: 11 },
  actions: { display: 'flex', gap: 8, marginTop: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#111118', border: '1px solid #2a2a3a', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 },
};
