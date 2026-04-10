import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../../hooks/useAuth';

const GAME_TYPES = [
  { id: 'quiz-001',    name: 'Aptitude Quiz',      icon: '🧠', color: '#6366f1' },
  { id: 'puzzle-001',  name: 'Math Puzzle',         icon: '🔢', color: '#f59e0b' },
  { id: 'logic-001',   name: 'Logic Sequences',     icon: '🔗', color: '#10b981' },
  { id: 'pattern-001', name: 'Pattern Recognition', icon: '🔷', color: '#ec4899' },
  { id: 'memory-001',  name: 'Memory Challenge',    icon: '💡', color: '#8b5cf6' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/analytics/overview').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <h1>{greeting}, {user?.username}! 👋</h1>
        <p>Ready to sharpen your aptitude skills? Pick a game and start training.</p>
      </div>

      {/* Stats Row */}
      <div className="card-grid card-grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Games Played',  value: stats?.totalGames ?? user?.stats?.totalGamesPlayed ?? 0,   icon: '🎮' },
          { label: 'Total Score',   value: (stats?.totalScore ?? user?.stats?.totalScore ?? 0).toLocaleString(), icon: '⭐' },
          { label: 'Avg Accuracy',  value: `${stats?.avgAccuracy ?? 0}%`, icon: '🎯' },
          { label: 'Avg Difficulty',value: stats?.avgDifficulty ?? '-',  icon: '📈' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{icon}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Play */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Quick Play</h2>
        <div className="card-grid card-grid-3">
          {GAME_TYPES.slice(0, 3).map(g => (
            <button key={g.id} onClick={() => navigate(`/game/${g.id}`)}
              style={{ background: g.color + '15', border: `1.5px solid ${g.color}30`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{g.icon}</div>
              <div style={{ fontWeight: 700, color: g.color }}>{g.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Weak Areas Alert */}
      {stats?.weakAreas?.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <strong>🔍 Focus Area:</strong> Your accuracy in{' '}
          {stats.weakAreas.map(w => w.type).join(', ')} needs improvement.{' '}
          <button onClick={() => navigate('/analytics')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>View Analytics →</button>
        </div>
      )}

      {/* All Games */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>All Games</h2>
      <div className="card-grid card-grid-3">
        {GAME_TYPES.map(g => (
          <div key={g.id} className="game-card" onClick={() => navigate(`/game/${g.id}`)}>
            <div className="game-stripe" style={{ background: g.color }} />
            <div className="game-icon">{g.icon}</div>
            <h3>{g.name}</h3>
            <p style={{ marginTop: 6 }}>
              {g.id === 'quiz-001'    && 'Verbal and analytical aptitude questions'}
              {g.id === 'puzzle-001'  && 'Arithmetic and math problem solving'}
              {g.id === 'logic-001'   && 'Number and letter sequence challenges'}
              {g.id === 'pattern-001' && 'Visual and alphabetic pattern completion'}
              {g.id === 'memory-001'  && 'Sequence memorization and recall speed'}
            </p>
            <div style={{ marginTop: 12 }}>
              <span className="badge badge-primary">{g.id.split('-')[0]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
