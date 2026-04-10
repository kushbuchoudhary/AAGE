import React from 'react';
import { useNavigate } from 'react-router-dom';

const GAMES = [
  { id: 'quiz-001',    name: 'Aptitude Quiz',       icon: '🧠', color: '#6366f1', type: 'quiz',    desc: 'Verbal ability, analytical reasoning and general aptitude', skills: ['Verbal Ability', 'Analytical Thinking'], difficulty: 'Easy–Hard' },
  { id: 'puzzle-001',  name: 'Math Puzzle',          icon: '🔢', color: '#f59e0b', type: 'puzzle',  desc: 'Arithmetic, algebra, and quantitative aptitude challenges', skills: ['Numerical Ability', 'Arithmetic'], difficulty: 'Easy–Master' },
  { id: 'logic-001',   name: 'Logic Sequences',      icon: '🔗', color: '#10b981', type: 'logic',   desc: 'Number series, letter sequences, and pattern completion', skills: ['Logical Reasoning', 'Pattern Recognition'], difficulty: 'Medium–Expert' },
  { id: 'pattern-001', name: 'Pattern Recognition',  icon: '🔷', color: '#ec4899', type: 'pattern', desc: 'Identify and extend visual, alphabetic, and mixed patterns', skills: ['Visual Reasoning', 'Sequence Analysis'], difficulty: 'Easy–Hard' },
  { id: 'memory-001',  name: 'Memory Challenge',     icon: '💡', color: '#8b5cf6', type: 'memory',  desc: 'Memorize and recall number sequences under time pressure', skills: ['Working Memory', 'Recall Speed'], difficulty: 'Medium–Master' },
];

export default function GameLobby() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>🎮 Game Library</h1>
        <p>Choose a game to start an adaptive training session. Difficulty adjusts automatically.</p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {GAMES.map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', borderLeft: `4px solid ${g.color}`, cursor: 'pointer' }}
            onClick={() => navigate(`/game/${g.id}`)}>
            <div style={{ fontSize: '2.8rem', minWidth: 56, textAlign: 'center' }}>{g.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{g.name}</h3>
                <span className="badge" style={{ background: g.color + '20', color: g.color }}>{g.type}</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{g.desc}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {g.skills.map(s => <span key={s} className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{s}</span>)}
                <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>⚡ {g.difficulty}</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={e => { e.stopPropagation(); navigate(`/game/${g.id}`); }}>
              Play →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
