import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API } from '../../hooks/useAuth';

const SKILL_LABELS = {
  logical_reasoning: 'Logical Reasoning', pattern_recognition: 'Pattern Recognition',
  numerical_ability: 'Numerical Ability', verbal_ability: 'Verbal Ability',
  working_memory: 'Working Memory', analytical_thinking: 'Analytical Thinking'
};

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [skills, setSkills] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/analytics/overview').then(r => setOverview(r.data)),
      API.get('/analytics/skills').then(r => setSkills(r.data))
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  const trendData = overview?.trend?.map((t, i) => ({
    name: `Q${i + 1}`, score: t.score, accuracy: t.accuracy, difficulty: t.difficulty * 10
  })) || [];

  const typeData = overview?.byType
    ? Object.entries(overview.byType).map(([type, v]) => ({ name: type, accuracy: v.avgAccuracy, count: v.count }))
    : [];

  const radarData = skills
    ? Object.entries(skills).map(([k, v]) => ({ subject: SKILL_LABELS[k] || k, value: v, fullMark: 100 }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>📊 Performance Analytics</h1>
        <p>Track your progress, identify weak areas, and monitor skill development.</p>
      </div>

      {/* Summary Stats */}
      <div className="card-grid card-grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Games Played',   value: overview?.totalGames ?? 0,           color: '#6366f1' },
          { label: 'Total Score',    value: (overview?.totalScore ?? 0).toLocaleString(), color: '#f59e0b' },
          { label: 'Avg Accuracy',   value: `${overview?.avgAccuracy ?? 0}%`,      color: '#10b981' },
          { label: 'Avg Difficulty', value: overview?.avgDifficulty ?? 0,          color: '#ec4899' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {trendData.length > 0 ? (
        <>
          {/* Score Trend */}
          <div className="chart-container" style={{ marginBottom: 20 }}>
            <div className="chart-title">Score & Accuracy Trend</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Score" />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Accuracy %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* By Game Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="chart-container">
              <div className="chart-title">Accuracy by Game Type</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Radar */}
            <div className="chart-container">
              <div className="chart-title">Skill Profile</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar name="Skill" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weak Areas */}
          {overview?.weakAreas?.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#991b1b' }}>🔍 Areas Needing Improvement</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {overview.weakAreas.map(w => (
                  <div key={w.type} style={{ background: '#fee2e2', padding: '8px 16px', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: '#991b1b', textTransform: 'capitalize' }}>{w.type}</div>
                    <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Accuracy: {w.avgAccuracy}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill breakdown */}
          {skills && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Skill Breakdown</h3>
              <div className="skill-grid">
                {Object.entries(skills).map(([key, val]) => {
                  const pct = val;
                  const status = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger';
                  return (
                    <div key={key} className="skill-item">
                      <div className="skill-name">{SKILL_LABELS[key] || key}</div>
                      <div className="skill-score">{pct}%</div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${status}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎮</div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No data yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Play some games to see your analytics here!</p>
        </div>
      )}
    </div>
  );
}
