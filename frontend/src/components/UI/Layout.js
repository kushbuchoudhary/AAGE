import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

const NAV = [
  { to: '/dashboard',   icon: '🏠', label: 'Dashboard' },
  { to: '/games',       icon: '🎮', label: 'Games' },
  { to: '/analytics',   icon: '📊', label: 'Analytics' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.6rem' }}>🎯</span>
          <span>AAGE</span>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">⚙️</span>Admin
            </NavLink>
          )}
        </nav>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: connected ? '#10b981' : '#9ca3af', marginBottom: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#9ca3af' }} />
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* User info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="lb-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user?.username}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
