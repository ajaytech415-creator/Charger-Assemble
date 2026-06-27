import { useState, useRef, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import logo from '../assets/logo.jpg';

const ADMIN_CODE = 'mark02';

export default function AdminCodePage({ onSuccess }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (code === ADMIN_CODE) {
      setLoading(true);
      setTimeout(() => onSuccess(), 600);
    } else {
      setError('Invalid secure code. Access denied.');
      setShake(true);
      setCode('');
      setTimeout(() => setShake(false), 600);
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

      {/* Center card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 10 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
              border: '3px solid var(--primary)',
            }}>
              <img src={logo} alt="Brand Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ fontSize: '1.85rem', marginBottom: 6, color: 'var(--text-primary)' }}>Admin Access</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Enter your secure code to continue</p>
          </div>

          {/* Card */}
          <div
            className="card"
            style={{
              padding: 36,
              boxShadow: 'var(--shadow-lg)',
              animation: shake ? 'shake 0.4s ease' : 'none',
            }}
          >
            <style>{`
              @keyframes shake {
                0%,100%{transform:translateX(0)}
                20%{transform:translateX(-8px)}
                40%{transform:translateX(8px)}
                60%{transform:translateX(-6px)}
                80%{transform:translateX(6px)}
              }
            `}</style>

            <h3 style={{ marginBottom: 4 }}>Secure Code Required</h3>
            <p style={{ marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
              This area is restricted. Please enter your administrator code.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Secure Code</label>
                <input
                  ref={inputRef}
                  id="adminCode"
                  type="password"
                  placeholder="Enter code..."
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); }}
                  autoComplete="off"
                  required
                  style={{
                    letterSpacing: code ? '0.2em' : 'normal',
                    fontFamily: code ? 'monospace' : 'inherit',
                  }}
                />
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16, fontSize: 13 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ flex: 1 }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14.5 }}
                disabled={loading || !code}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Verifying...</>
                  : '🔓 Unlock Access'
                }
              </button>
            </form>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Restricted — Authorized Personnel Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--navbar-border)', display: 'flex', justifyContent: 'space-between', background: 'var(--navbar-bg)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <span className="text-sm text-muted">© 2026 UltraHuman Charger Assembly Inc. All rights reserved.</span>
        <span className="text-sm text-muted" style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--gray-100)', fontWeight: 600 }}>
          v1.0.0-LOCAL
        </span>
      </div>
    </div>
  );
}
