import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import PlatformPage from './pages/PlatformPage';
import PlanPage from './pages/PlanPage';
import ConfirmPage from './pages/ConfirmPage';
import UserDashboard from './pages/UserDashboard';
import ScrapPage from './pages/ScrapPage';
import ReworkPage from './pages/ReworkPage';
import ReworkPlanPage from './pages/ReworkPlanPage';
import ReworkListPage from './pages/ReworkListPage';
import RndPage from './pages/RndPage';
import RndDashboard from './pages/RndDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import './App.css';

const AppContent = () => {
  const { user } = useAuth();

  // adminSession = true when site was entered via /admin URL.
  // Allows full platform access without a user login.
  const [adminSession, setAdminSession] = useState(
    () => window.location.pathname === '/admin'
  );
  const [view, setView] = useState(() => {
    if (window.location.pathname === '/admin') return 'admin';
    return user ? 'platform' : 'login';
  });

  // Persist working rows so data is never "automatically removed" if users tab away
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingReworkRows, setPendingReworkRows] = useState([]);
  const [batchId, setBatchId] = useState('');

  // Secret /admin URL — open admin panel directly, no login needed
  if (view === 'admin') {
    window.history.replaceState({}, '', '/admin');
    return (
      <AdminLayout onBack={() => {
        window.history.pushState({}, '', '/');
        setAdminSession(true);
        setView('platform');
      }} />
    );
  }

  // Allow platform access if logged in OR coming from /admin
  if (!user && !adminSession) return <LoginPage onLogin={() => setView('platform')} />;
  if (view === 'platform') return (
    <PlatformPage
      onSelectPlan={() => setView('plan')}
      onSelectScrap={() => setView('scrap')}
      onSelectRework={() => setView('rework')}
      onSelectRnd={() => setView('rnd')}
      onAdmin={() => setView('admin')}
      onDashboard={() => setView('dashboard')}
    />
  );
  if (view === 'plan') return (
    <PlanPage
      initialRows={pendingRows}
      onUpdateRows={setPendingRows}
      onBack={() => setView('platform')}
      onConfirm={(rows, bid) => { setPendingRows(rows); setBatchId(bid); setView('confirm'); }}
    />
  );
  if (view === 'confirm') return (
    <ConfirmPage
      rows={pendingRows}
      batchId={batchId}
      onBack={() => setView('plan')}
      onSubmit={() => {
        setPendingRows([]);
        setBatchId('');
        setView('dashboard');
      }}
    />
  );
  if (view === 'dashboard') return (
    <UserDashboard onBack={() => setView('platform')} onNavigateScrap={() => setView('scrap')} onNavigateReworkList={() => setView('rework-list')} />
  );
  if (view === 'scrap') return (
    <ScrapPage onBack={() => setView('platform')} />
  );
  if (view === 'rework') return (
    <ReworkPlanPage
      initialRows={pendingReworkRows}
      onUpdateRows={setPendingReworkRows}
      onBack={() => setView('platform')}
      onConfirm={(rows, bid) => { setPendingReworkRows(rows); setBatchId(bid); setView('rework-confirm'); }}
      onDashboard={() => setView('rework-list')}
    />
  );
  if (view === 'rework-confirm') return (
    <ConfirmPage
      rows={pendingReworkRows}
      batchId={batchId}
      isRework={true}
      onBack={() => setView('rework')}
      onSubmit={() => {
        setPendingReworkRows([]);
        setBatchId('');
        setView('rework-list');
      }}
    />
  );
  if (view === 'rework-list') return (
    <ReworkListPage onBack={() => setView('platform')} onNewPlan={() => setView('rework')} onDashboard={() => setView('dashboard')} />
  );
  if (view === 'rework-legacy') return (
    <ReworkPage onBack={() => setView('platform')} />
  );
  if (view === 'rnd') return (
    <RndPage
      onBack={() => setView('platform')}
      onDashboard={() => setView('rnd-dashboard')}
    />
  );
  if (view === 'rnd-dashboard') return (
    <RndDashboard
      onBack={() => setView('platform')}
      onNewEntry={() => setView('rnd')}
    />
  );
  return null;
};

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-bg-canvas" />
      <div className="app-bg-overlay" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
