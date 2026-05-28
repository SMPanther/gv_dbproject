import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.header}>
          <span style={s.icon}>⬡</span>
          <h2 style={s.title}>Welcome back</h2>
          <p style={s.sub}>Sign in to your GameVault account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={s.foot}>
          No account? <Link to="/register" style={{ color: '#a855f7' }}>Register</Link>
        </p>

        <div style={s.demo}>
          <p style={{ color: '#5a5a70', fontSize: 11, marginBottom: 6 }}>DEMO CREDENTIALS</p>
          <p style={{ color: '#9090a8', fontSize: 12 }}>umer@example.com / pass1234</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: 'calc(100vh - 58px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    background: '#111118',
    border: '1px solid #2a2a3a',
    borderRadius: 16,
    padding: 36,
  },
  header: { textAlign: 'center', marginBottom: 28 },
  icon: { fontSize: 32, color: '#7c3aed', display: 'block', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  sub: { color: '#9090a8', fontSize: 13 },
  foot: { textAlign: 'center', marginTop: 20, color: '#9090a8', fontSize: 13 },
  demo: {
    marginTop: 20,
    padding: 12,
    background: 'rgba(42,42,58,0.4)',
    borderRadius: 8,
    textAlign: 'center',
  },
};
