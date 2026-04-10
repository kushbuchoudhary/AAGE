import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Demo quick-login
  const demoLogin = async () => {
    setLoading(true);
    try {
      await register('demo_player', 'demo@aage.com', 'demo1234').catch(() =>
        login('demo@aage.com', 'demo1234')
      );
      navigate('/dashboard');
    } catch { setError('Demo login failed. Start the backend first.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🎯</div>
          <h1>AAGE Platform</h1>
          <p>Adaptive AI Game Engine for Aptitude Training</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input name="username" className="form-input" placeholder="Enter username" value={form.username} onChange={handle} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="Enter email" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="Enter password" value={form.password} onChange={handle} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <button onClick={demoLogin} className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }} disabled={loading}>
          🚀 Try Demo
        </button>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <span>No account? <button onClick={() => setMode('register')}>Register</button></span>
          ) : (
            <span>Have an account? <button onClick={() => setMode('login')}>Login</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
