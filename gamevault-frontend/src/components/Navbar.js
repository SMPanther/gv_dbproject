import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const NAV = [
    { path: '/',            label: 'Games'       },
    { path: '/collection',  label: 'Collection'  },
    { path: '/marketplace', label: 'Marketplace' },
    { path: '/reviews',     label: 'Reviews'     },
    ...(user?.role === 'admin' ? [{ path: '/dashboard', label: '⚡ Dashboard' }] : []),
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link to="/" style={s.logo}>
          <span style={s.logoIcon}>⬡</span>
          <span style={s.logoText}>GAME<span style={s.logoAccent}>VAULT</span></span>
        </Link>
        <div style={s.links}>
          {NAV.map(n => (
            <Link key={n.path} to={n.path}
              style={{ ...s.link, ...(location.pathname === n.path ? s.linkActive : {}) }}>
              {n.label}
            </Link>
          ))}
        </div>
        <div style={s.right}>
          {isLoggedIn ? (
            <>
              <span style={s.userInfo}>
                <span style={s.userDot} />{user.username}
                {user.role === 'admin' && <span style={s.adminTag}>ADMIN</span>}
              </span>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: { background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid #1e1e2e', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 },
  inner: { maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', gap: 32 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  logoIcon: { fontSize: 22, color: '#7c3aed' },
  logoText: { fontFamily: 'Rajdhani, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8e8f0', letterSpacing: '0.08em' },
  logoAccent: { color: '#7c3aed' },
  links: { display: 'flex', gap: 4, flex: 1 },
  link: { padding: '6px 14px', borderRadius: 6, color: '#9090a8', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', textDecoration: 'none' },
  linkActive: { color: '#e8e8f0', background: 'rgba(124,58,237,0.15)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9090a8' },
  userDot: { width: 7, height: 7, borderRadius: '50%', background: '#22c55e' },
  adminTag: { background: 'rgba(124,58,237,.3)', color: '#a855f7', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '.05em' },
};
