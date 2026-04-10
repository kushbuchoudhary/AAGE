import React, { useState, useEffect } from 'react';
import { API } from '../../hooks/useAuth';

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [gameForm, setGameForm] = useState({ name: '', type: 'quiz', description: '', icon: '🎮', color: '#6366f1', rules: { timePerQuestion: 20, questionsPerLevel: 5 } });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (tab === 'overview') API.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    if (tab === 'users')    API.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
  }, [tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/games', gameForm);
      setMsg('✅ Game created successfully!');
      setGameForm({ name: '', type: 'quiz', description: '', icon: '🎮', color: '#6366f1', rules: { timePerQuestion: 20, questionsPerLevel: 5 } });
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error creating game'));
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'builder',  label: 'Game Builder' },
    { id: 'users',    label: 'Users' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Manage games, view system stats, and monitor users.</p>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => <button key={t.id} className={`admin-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div>
          <div className="card-grid card-grid-3" style={{ marginBottom: 24 }}>
            <div className="stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Students</div></div>
            <div className="stat-card"><div className="stat-value">{stats.totalSessions}</div><div className="stat-label">Sessions Completed</div></div>
            <div className="stat-card"><div className="stat-value">{(stats.totalScore || 0).toLocaleString()}</div><div className="stat-label">Total Score Points</div></div>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Game Type Performance</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Game Type', 'Sessions', 'Avg Accuracy'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {stats.byType?.map(row => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>{row._id}</td>
                    <td style={{ padding: '10px 12px' }}>{row.count}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${row.avgAccuracy >= 70 ? 'badge-success' : row.avgAccuracy >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                        {Math.round(row.avgAccuracy || 0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Game Builder */}
      {tab === 'builder' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Create New Game</h3>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Game Name</label>
              <input className="form-input" value={gameForm.name} onChange={e => setGameForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Speed Math Challenge" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Game Type</label>
                <select className="form-input form-select" value={gameForm.type} onChange={e => setGameForm(f => ({...f, type: e.target.value}))}>
                  {['quiz','puzzle','logic','pattern','memory'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Icon (emoji)</label>
                <input className="form-input" value={gameForm.icon} onChange={e => setGameForm(f => ({...f, icon: e.target.value}))} maxLength={2} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={gameForm.description} onChange={e => setGameForm(f => ({...f, description: e.target.value}))} placeholder="Describe the game..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Time Per Question (s)</label>
                <input type="number" className="form-input" value={gameForm.rules.timePerQuestion} onChange={e => setGameForm(f => ({...f, rules: {...f.rules, timePerQuestion: +e.target.value}}))} min={5} max={120} />
              </div>
              <div className="form-group">
                <label className="form-label">Questions Per Level</label>
                <input type="number" className="form-input" value={gameForm.rules.questionsPerLevel} onChange={e => setGameForm(f => ({...f, rules: {...f.rules, questionsPerLevel: +e.target.value}}))} min={3} max={20} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Theme Color</label>
              <input type="color" className="form-input" value={gameForm.color} onChange={e => setGameForm(f => ({...f, color: e.target.value}))} style={{ height: 44, cursor: 'pointer' }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Game</button>
          </form>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Registered Students ({users.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Username', 'Email', 'Games', 'Total Score', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="lb-avatar" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>{u.username?.[0]?.toUpperCase()}</div>
                        {u.username}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>{u.stats?.totalGamesPlayed || 0}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary)' }}>{(u.stats?.totalScore || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
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
