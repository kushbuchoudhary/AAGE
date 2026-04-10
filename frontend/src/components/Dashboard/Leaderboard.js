import React, { useState, useEffect } from 'react';
import { API } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

export default function Leaderboard() {
  const [board, setBoard] = useState([]);
  const { leaderboard: liveBoard, connected } = useSocket();

  useEffect(() => {
    API.get('/leaderboard').then(r => setBoard(r.data)).catch(() => {});
  }, []);

  const rankIcon = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const rankClass = (rank) => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

  const displayed = liveBoard?.length > 0 ? liveBoard : board;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🏆 Leaderboard</h1>
          <p>Top players ranked by total score across all game types.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: connected ? '#10b981' : 'var(--text-muted)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#9ca3af' }} />
          {connected ? 'Live updates' : 'Offline'}
        </div>
      </div>

      {/* Top 3 Podium */}
      {displayed.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28, alignItems: 'flex-end' }}>
          {[1, 0, 2].map(i => {
            const p = displayed[i];
            if (!p) return null;
            const heights = [100, 130, 80];
            const colors = ['#9ca3af', '#f59e0b', '#b45309'];
            return (
              <div key={i} style={{ textAlign: 'center', width: 100 }}>
                <div className="lb-avatar" style={{ width: 44, height: 44, margin: '0 auto 8px', background: colors[i] + '20', color: colors[i] }}>
                  {p.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{p.username}</div>
                <div style={{ fontWeight: 800, color: colors[i], marginBottom: 4 }}>{(p.totalScore || p.score || 0).toLocaleString()}</div>
                <div style={{ background: colors[i] + '30', border: `2px solid ${colors[i]}`, borderRadius: '8px 8px 0 0', height: heights[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {i === 0 ? '🥈' : i === 1 ? '🥇' : '🥉'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Board */}
      <div>
        {displayed.map((p, idx) => (
          <div key={p.userId || p.username} className="lb-row">
            <div className={`lb-rank ${rankClass(p.rank || idx + 1)}`}>{rankIcon(p.rank || idx + 1)}</div>
            <div className="lb-avatar">{p.username?.[0]?.toUpperCase()}</div>
            <div className="lb-name">
              {p.username}
              {p.username === 'AI Opponent' && <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: '0.7rem' }}>🤖 Bot</span>}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {p.gamesPlayed ?? 0} games · {p.avgAccuracy ?? 0}% avg
            </div>
            <div className="lb-score">{(p.totalScore || p.score || 0).toLocaleString()}</div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
            <p style={{ color: 'var(--text-secondary)' }}>No players yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
