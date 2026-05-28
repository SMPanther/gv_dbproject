import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Collection() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const { isLoggedIn }        = useAuth();
  const navigate              = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    api.get('/collection').then(r => { setItems(r.data); setLoading(false); });
  }, [isLoggedIn, navigate]);

  const updateStatus = async (ug_id, status) => {
    await api.patch(`/collection/${ug_id}`, { status });
    setItems(items.map(i => i.ug_id === ug_id ? { ...i, status } : i));
  };

  const removeItem = async ug_id => {
    await api.delete(`/collection/${ug_id}`);
    setItems(items.filter(i => i.ug_id !== ug_id));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const counts = {
    all:      items.length,
    active:   items.filter(i => i.status === 'active').length,
    wishlist: items.filter(i => i.status === 'wishlist').length,
    traded:   items.filter(i => i.status === 'traded').length,
  };

  if (loading) return <div className="loading">Loading collection...</div>;

  return (
    <div className="page">
      <h1 className="page-title">My Collection</h1>
      <p className="page-sub">{items.length} games in your library</p>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {['all','active','wishlist','traded'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={s.count}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No games here</h3>
          <p>Go to Games catalog to add some!</p>
        </div>
      ) : (
        <div style={s.tableWrap} className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Genre</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.ug_id}>
                    <td>
                      <span style={s.gameTitle}>{item.title}</span>
                      <br/>
                      <span style={s.dev}>{item.developer}</span>
                    </td>
                    <td><span className="tag">{item.genre}</span></td>
                    <td style={{ color: '#9090a8' }}>{item.platform}</td>
                    <td>
                      <span className={`badge badge-${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ color: '#9090a8' }}>
                      {new Date(item.acquired_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={s.actions}>
                        {item.status !== 'active' && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => updateStatus(item.ug_id, 'active')}>
                            Active
                          </button>
                        )}
                        {item.status !== 'wishlist' && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => updateStatus(item.ug_id, 'wishlist')}>
                            Wishlist
                          </button>
                        )}
                        {item.status !== 'traded' && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => updateStatus(item.ug_id, 'traded')}>
                            Traded
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm"
                          onClick={() => removeItem(item.ug_id)}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  tabs: { display: 'flex', gap: 4, marginBottom: 20 },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    background: 'transparent', color: '#9090a8', border: '1px solid #2a2a3a', cursor: 'pointer',
  },
  tabActive: { background: 'rgba(124,58,237,.15)', color: '#e8e8f0', borderColor: '#7c3aed' },
  count: {
    background: 'rgba(255,255,255,.08)', borderRadius: 10,
    padding: '1px 7px', fontSize: 11,
  },
  tableWrap: { padding: 0, overflow: 'hidden' },
  gameTitle: { fontWeight: 600, fontSize: 13 },
  dev: { color: '#9090a8', fontSize: 11 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
};
