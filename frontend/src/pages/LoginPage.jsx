import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ThemeToggle from '../components/ThemeToggle';
import logo from '../assets/logo.jpg';

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('user');
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form);
      if (tab === 'admin' && data.user.role !== 'admin') {
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }
      login(data.user, remember);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="navbar-logo">
            <img src={logo} alt="Logo" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            UltraHuman Charger Assembly
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--text-primary)' }}>Welcome back</h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>Please enter your details to access your dashboard</p>
          </div>

          {/* Card */}
          <div className="card" style={{ padding: 36, boxShadow: 'var(--shadow-lg)' }}>
            {/* Tab toggle */}
            <div style={{ display: 'flex', background: 'var(--navbar-bg)', borderRadius: 8, padding: 4, marginBottom: 28, border: '1px solid var(--surface-border)' }}>
              {['user', 'admin'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', borderRadius: 6,
                    background: tab === t ? 'var(--primary)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--text-muted)',
                    fontWeight: tab === t ? 600 : 500,
                    fontSize: 13.5,
                    boxShadow: tab === t ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <GlassIcon name={t === 'user' ? 'users' : 'security'} size={16} color={tab === t ? '#fff' : 'var(--text-muted)'} />
                  {t === 'user' ? 'User Login' : 'Admin Login'}
                </button>
              ))}
            </div>

            <h3 style={{ marginBottom: 4 }}>{tab === 'admin' ? 'Administrator Authentication' : 'Staff Authentication'}</h3>
            <p style={{ marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
              {tab === 'admin' ? 'Sign in with admin credentials to manage the system.' : 'Sign in to manage production plans and technical SKUs.'}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Employee ID</label>
                <input
                  id="employeeId"
                  type="text"
                  placeholder="EMP-00000"
                  value={form.employeeId}
                  onChange={e => setForm({ ...form, employeeId: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <span style={{ color: 'var(--primary)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox" id="remember" checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="remember" style={{ margin: 0, fontSize: 13.5, cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Remember me for 30 days
                </label>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  <GlassIcon name="alert" size={16} /> <span style={{ flex: 1 }}>{error}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14.5 }} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign In →'}
              </button>
            </form>

            {/* Footer info inside card */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <GlassIcon name="alert" size={14} color="var(--text-muted)" /> Need assistance? <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Contact IT</span>
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--gray-100)', color: 'var(--text-secondary)' }}>
                v1.0.0-LOCAL
              </span>
            </div>
          </div>

          {/* Bottom badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}><GlassIcon name="shield" size={14} color="var(--text-muted)" /> 256-BIT ENCRYPTION</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}><GlassIcon name="success" size={14} color="var(--success)" /> ISO 27001 CERTIFIED</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--navbar-border)', display: 'flex', justifyContent: 'space-between', background: 'var(--navbar-bg)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <span className="text-sm text-muted">© 2026 UltraHuman Charger Assembly Inc. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy Policy', 'Terms of Service', 'Support'].map(l => (
            <span key={l} className="text-sm text-muted" style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
