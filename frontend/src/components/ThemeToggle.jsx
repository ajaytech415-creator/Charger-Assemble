import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isMorning = theme === 'morning';

  return (
    <button
      onClick={toggleTheme}
      title={isMorning ? 'Switch to Night Mode' : 'Switch to Morning Mode'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 999,
        border: '1px solid var(--surface-border)',
        background: 'var(--surface)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--text-primary)',
        fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.25s ease',
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = ''; }}
    >
      <span style={{ fontSize: 17, lineHeight: 1 }}>{isMorning ? '🌙' : '☀️'}</span>
      <span>{isMorning ? 'Night' : 'Morning'}</span>
    </button>
  );
}
