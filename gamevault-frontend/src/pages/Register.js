import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
  const [form, setForm]   = useState({ username: '', email: '', password: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.header}>
          <span style={s.icon}>⬡</span>
          <h2 style={s.title}>Create account</h2>
          <p style={s.sub}>Join GameVault today</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input className="form-input" placeholder="coolGamer99"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="form-input" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={s.foot}>
          Already have an account? <Link to="/login" style={{ color: '#a855f7' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: 'calc(100vh - 58px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400, background: '#111118', border: '1px solid #2a2a3a', borderRadius: 16, padding: 36 },
  header: { textAlign: 'center', marginBottom: 28 },
  icon: { fontSize: 32, color: '#7c3aed', display: 'block', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  sub: { color: '#9090a8', fontSize: 13 },
  foot: { textAlign: 'center', marginTop: 20, color: '#9090a8', fontSize: 13 },
};
