import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ModalPortal from '../components/ModalPortal';
import MaterialBreakdown from '../components/MaterialBreakdown';

export default function UserDashboard({ onBack, onNavigateScrap, onNavigateReworkList }) {
  const { user, logout } = useAuth();
  const [mos, setMos] = useState([]);
  const [reworkMos, setReworkMos] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  const [closingMO, setClosingMO] = useState(null);
  const [closeQty, setCloseQty] = useState('');
  const [moComponents, setMoComponents] = useState([]);
  const [editPlanDate, setEditPlanDate] = useState('');

  // Return feature
  const [returnModal, setReturnModal] = useState(false);
  const [returnMOs, setReturnMOs] = useState([]);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnSelMO, setReturnSelMO] = useState(null);
  const [returnType, setReturnType] = useState(''); // 'Battery'|'PCBA'|'Coil'|'Shell'|'Lens'|'FullMO'
  const [returnQty, setReturnQty] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnRemark, setReturnRemark] = useState('');
  const [returnError, setReturnError] = useState('');

  const [returnHistory, setReturnHistory] = useState([]);
  const [scrapEntries, setScrapEntries] = useState([]);

  // Low Component Alert
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Income / Outgo Today popup
  const [todayModal, setTodayModal] = useState(null); // null | 'income' | 'outgo'

  const [subView, setSubView] = useState('main'); // 'main' | 'mos' | 'returns'
  const [moSearch, setMoSearch] = useState('');
  const [filterPlanDate, setFilterPlanDate] = useState('');

  // Multi-select for MOs
  const [selectedMOs, setSelectedMOs] = useState([]);

  const toggleSelectMO = (id) => {
    setSelectedMOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkClose = async () => {
    if (selectedMOs.length === 0) return;

    const invalidMOs = mos.filter(m => selectedMOs.includes(m.id)).filter(mo => {
      return !mo.components?.every(c => parseInt(c.collectedQty || 0) === parseInt(c.completedQty || 0));
    });

    if (invalidMOs.length > 0) {
      alert(`Cannot bulk close. There are ${invalidMOs.length} selected MO(s) where Collected Qty does not match Completed Qty.`);
      return;
    }

    if (!window.confirm(`Close ${selectedMOs.length} selected MO(s)? This action cannot be undone.`)) return;
    setUpdatingId('bulk');
    try {
      await Promise.all(selectedMOs.map(id => api.updateMO(id, { status: 'Completed' })));
      setSelectedMOs([]);
      load(false);
    } catch (e) { console.error(e); alert('Failed to close some MOs.'); }
    finally { setUpdatingId(null); }
  };

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = {};
      if (filterStart && filterEnd) {
        params.startDate = filterStart;
        params.endDate = filterEnd;
      }
      if (filterStatus) params.status = filterStatus;
      if (filterPlanDate) params.planDate = filterPlanDate;
      
      const [mosData, statsData, returnsData] = await Promise.all([
        api.getMOs(params), 
        api.getStats({ startDate: filterStart, endDate: filterEnd, isRework: false }),
        api.getReturns({ ...params, isRework: false }) // Fetch all non-rework returns
      ]);
      setMos(mosData.filter(m => !m.isRework));
      setReworkMos(mosData.filter(m => !!m.isRework));
      setStats(statsData);
      setReturnHistory(returnsData);
    } catch (e) { console.error(e); }
    finally { if (showLoading) setLoading(false); }
  }, [filterStart, filterEnd, filterStatus, filterPlanDate]);

  useEffect(() => {
    // Initial load
    const t = setTimeout(() => load(), 0);
    // Poll every 30s silently so admin status changes appear without a page refresh
    const poll = setInterval(() => load(false), 30000);
    // Also refresh immediately when user switches back to this tab
    const onVisible = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Load pending MOs for return modal
  const openReturnModal = async () => {
    setReturnModal(true);
    setReturnSelMO(null);
    setReturnType('');
    setReturnQty('');
    setReturnError('');
    setReturnRemark('');
    setReturnSearch('');
    try {
      const [mosData, scrapData] = await Promise.all([
        api.getMOs({ status: 'Pending', isRework: false }),
        api.getScrap()
      ]);
      setReturnMOs(mosData);
      setScrapEntries(scrapData);
    } catch (e) { console.error(e); }
  };

  const getReturnableQty = (mo, type) => {
    if (!mo || !mo.components) return 0;
    
    let comps = type === 'FullMO' ? mo.components : mo.components.filter(c => c.name === type);
    
    let minReturnable = Infinity;
    
    comps.forEach(comp => {
      let scrapReject = 0;
      let scrapReceive = 0;
      scrapEntries.forEach(s => {
        if (s.moId === mo.id && s.component === comp.category) {
          scrapReject += (s.reject || 0);
          scrapReceive += (s.receive || 0);
        }
      });

      let returnable = comp.collectedQty - comp.completedQty - scrapReject + scrapReceive;
      if (returnable < 0) returnable = 0;
      if (returnable < minReturnable) minReturnable = returnable;
    });

    return minReturnable === Infinity ? 0 : minReturnable;
  };



  const submitReturn = async () => {
    if (!returnSelMO) { setReturnError('Select an MO first.'); return; }
    if (!returnType)  { setReturnError('Select what to return.'); return; }
    if (!returnQty) { setReturnError('Enter quantity to return.'); return; }
    
    const availQty = getReturnableQty(returnSelMO, returnType);
    const qtyToReturn = parseInt(returnQty) || 0;
    
    if (qtyToReturn > availQty) {
      setReturnError(`Cannot return ${qtyToReturn}. Only ${availQty} available for ${returnType}.`);
      return;
    }
    if (qtyToReturn <= 0) {
      setReturnError(`Return quantity must be greater than 0.`);
      return;
    }

    setReturnSubmitting(true);
    setReturnError('');
    try {
      await api.createReturn({
        moId: returnSelMO.id,
        moNumber: returnSelMO.moNumber,
        sku: returnSelMO.sku,
        returnType: returnType === 'FullMO' ? 'FullMO' : 'Component',
        component: returnType !== 'FullMO' ? returnType : '',
        componentQty: qtyToReturn,
        isFullMO: returnType === 'FullMO',
        remark: returnRemark,
        submittedBy: user?.fullName,
      });
      setReturnModal(false);
      load();
    } catch (e) { setReturnError(e.message || 'Submit failed'); }
    finally { setReturnSubmitting(false); }
  };

  const filteredReturnMOs = returnMOs.filter(mo => {
    if (!returnSearch) return true;
    const q = returnSearch.toLowerCase();
    const m = (mo.moNumber || '').toLowerCase();
    return m.includes(q) || m.slice(-4).includes(q) || m.slice(-3).includes(q);
  });

  const handleUpdateQty = async (mo) => {
    setClosingMO(mo);
    setCloseQty(String(mo.completedQty || 0));
    setMoComponents(mo.components ? JSON.parse(JSON.stringify(mo.components)) : []);
    setEditPlanDate(mo.planDate || '');
  };

  const confirmQtyUpdate = async () => {
    if (!closingMO) return;
    setUpdatingId(closingMO.id);
    try {
      const newCompleted = parseInt(closeQty || 0);
      await api.updateMO(closingMO.id, {
        completedQty: newCompleted,
        components: moComponents,
        planDate: editPlanDate,
      });
      setClosingMO(null); 
      setCloseQty('');
      setMoComponents([]);
      setEditPlanDate('');
      load(false);
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  const handleMOClose = async (mo) => {
    const isMatching = mo.components?.every(c => parseInt(c.collectedQty || 0) === parseInt(c.completedQty || 0));
    if (!isMatching) {
      alert('Cannot close this MO. The Collected Quantity and Completed Quantity must be exactly the same for all components.');
      return;
    }

    if (window.confirm(`Are you sure you want to completely close MO ${mo.moNumber || mo.sku}?`)) {
      setUpdatingId(mo.id);
      try {
        await api.updateMO(mo.id, { status: 'Completed' });
        load(false);
      } catch (e) { console.error(e); }
      finally { setUpdatingId(null); }
    }
  };

  const handleReplenish = async (id) => {
    try {
      await api.replenishReturn(id, { submittedBy: user?.fullName || 'User' });
      load();
    } catch (e) { console.error(e); alert('Failed to replenish.'); }
  };

  // Top stat tiles: use MO-level qty (planned units) and completedQty (assembled units)
  // These are MO assembly counts. Component material counts are in the breakdown bar below.
  const totalPlanned   = mos.reduce((s, m) => s + (m.qty || 0), 0);
  const totalCompleted = mos.reduce((s, m) => s + (m.completedQty || 0), 0);
  const totalPending   = totalPlanned - totalCompleted;

  const renderComponentProgress = (name, qty, comp) => {
    const isDone = comp >= qty;
    return (
      <div style={{ minWidth: 120 }}>
        <div className="text-sm" style={{ lineHeight: 1.3 }}>{name}</div>
        <div className="text-xs font-semibold" style={{ color: isDone ? '#16a34a' : '#2563eb', marginTop: 4 }}>
          {comp || 0} / {qty}
        </div>
      </div>
    );
  };

  // Find MOs with low component collection
  const pendingMOsList = mos.filter(m => m.status !== 'Completed');
  const lowComponentMOs = pendingMOsList.filter(mo => {
    if (!mo.components) return false;
    return mo.components.some(c => parseInt(c.collectedQty || 0) < parseInt(c.targetQty || 0));
  });

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo"><img src={logo} alt="Logo" /></div>UltraHuman Charger Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>My Dashboard</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar">{user?.fullName?.[0]}</div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">Data Entry</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => logout()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="arrow-left" size={14} color="#6b7280" /> Logout
          </button>
          <button className="btn btn-primary btn-sm" onClick={onBack}>+ New Plan</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px' }}>
        {subView === 'main' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2>Production Dashboard</h2>
                <p className="text-muted text-sm">Track your MO progress and manage plan closures.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 8 }}>
                {/* Alert Icon */}
                <div 
                  onClick={() => setShowAlertModal(true)}
                  style={{ 
                    position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, background: lowComponentMOs.length > 0 ? '#fee2e2' : '#f3f4f6', borderRadius: '50%', marginRight: 8, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Collected Quantity Analysis"
                >
                  <GlassIcon name="alert" size={16} color={lowComponentMOs.length > 0 ? '#ef4444' : '#9ca3af'} />
                  {lowComponentMOs.length > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', 
                      fontSize: 10, fontWeight: 'bold', width: 16, height: 16, borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {lowComponentMOs.length}
                    </span>
                  )}
                </div>
                
                <input 
                  type="date" 
                  value={filterStart} 
                  onChange={e => setFilterStart(e.target.value)} 
                  style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#4b5563', outline: 'none' }} 
                />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                <input 
                  type="date" 
                  value={filterEnd} 
                  onChange={e => setFilterEnd(e.target.value)} 
                  style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#4b5563', outline: 'none' }} 
                />
                {(filterStart || filterEnd) && (
                  <button 
                    className="btn btn-sm" 
                    onClick={() => { setFilterStart(''); setFilterEnd(''); }}
                    style={{ background: '#fca5a5', color: '#7f1d1d', border: 'none', padding: '4px 8px', marginLeft: 8 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

        {/* Stats + Return Box */}
        <div className="stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { label: 'Total QTY Planned', value: totalPlanned.toLocaleString(), icon: 'document', color: '#2563eb', onClick: null },
            { label: 'Completed QTY',     value: totalCompleted.toLocaleString(), icon: 'database', color: '#16a34a', onClick: null },
            { label: 'Pending Balance',   value: totalPending.toLocaleString(), icon: 'audit', color: '#d97706', onClick: null },
            { label: 'Income Today',      value: stats?.incomeToday || 0, icon: 'export', color: '#7c3aed', onClick: () => setTodayModal('income') },
          ].map(s => (
            <div
              key={s.label}
              className="card stat-card"
              style={{
                padding: '24px 20px',
                cursor: s.onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onClick={s.onClick}
              onMouseEnter={e => { if (s.onClick) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; } }}
              onMouseLeave={e => { if (s.onClick) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; } }}
              title={s.onClick ? `Click to see ${s.label} details` : undefined}
            >
              <div className="stat-label">
                <GlassIcon name={s.icon} size={24} color={s.color} style={{ marginRight: 8 }} />
                {s.label}
              </div>
              <div className="stat-value" style={{ color: s.color, marginTop: 12, fontSize: '2.5rem' }}>{s.value}</div>
              {s.onClick && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Click to view list</div>}
            </div>
          ))}
          {/* Return Box */}
          <div
            className="card stat-card"
            style={{ padding: '24px 20px', cursor: 'pointer', border: '2px solid #fca5a5', background: 'linear-gradient(135deg,#fff1f2,#fff)', transition: 'all 0.2s' }}
            onClick={openReturnModal}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(220,38,38,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="stat-label">
              <GlassIcon name="scrap" size={24} color="#dc2626" style={{ marginRight: 8 }} />
              Return MO
            </div>
            <div className="stat-value" style={{ color: '#dc2626', marginTop: 12, fontSize: '1.5rem', fontWeight: 700 }}>↩ Return</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Click to return MO or component</div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <div className="card stat-card" style={{ padding: '24px 20px', gridColumn: 'span 2' }}>
            <div className="stat-label">
              <GlassIcon name="plan" size={24} color="#4f46e5" style={{ marginRight: 8 }} />
              Total MOs
            </div>
            <div className="stat-value" style={{ color: '#4f46e5', marginTop: 12, fontSize: '2.5rem' }}>{stats?.totalMOs || mos.length}</div>
          </div>
          
          <div
            className="card stat-card"
            style={{ padding: '24px 20px', gridColumn: 'span 2', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setTodayModal('outgo')}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            title="Click to see today's closed MOs"
          >
            <div className="stat-label">
              <GlassIcon name="check" size={24} color="#10b981" style={{ marginRight: 8 }} />
              Outgo Today (MO Closed)
            </div>
            <div className="stat-value" style={{ color: '#10b981', marginTop: 12, fontSize: '2.5rem' }}>{stats?.outgoToday || 0}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Click to view list</div>
          </div>

          <div
            className="card stat-card"
            style={{ padding: '24px 20px', cursor: 'pointer', border: '2px solid #cbd5e1', background: 'linear-gradient(135deg,#f8fafc,#fff)', transition: 'all 0.2s', gridColumn: 'span 1' }}
            onClick={onNavigateScrap}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(100,116,139,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="stat-label">
              <GlassIcon name="delete" size={24} color="#64748b" style={{ marginRight: 8 }} />
              Today Scrap
            </div>
            <div className="stat-value" style={{ color: '#475569', marginTop: 12, fontSize: '1.5rem', fontWeight: 700 }}>
              {stats?.scrapToday || 0}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Click to log scrap</div>
          </div>

          <div
            className="card stat-card"
            style={{ padding: '24px 20px', cursor: 'pointer', border: '2px solid #cbd5e1', background: 'linear-gradient(135deg,#f8fafc,#fff)', transition: 'all 0.2s', gridColumn: 'span 1' }}
            onClick={onNavigateReworkList}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(100,116,139,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="stat-label">
              <GlassIcon name="refresh" size={24} color="#64748b" style={{ marginRight: 8 }} />
              Rework
            </div>
            <div className="stat-value" style={{ color: '#475569', marginTop: 12, fontSize: '1.5rem', fontWeight: 700 }}>
              {reworkMos.filter(m => (m.date || m.createdAt || '').startsWith(new Date().toISOString().split('T')[0])).length}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Today's Status</div>
          </div>
        </div>

        {/* Progress overview */}
        {totalPlanned > 0 && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h4>Overall Progress</h4>
              <span className="text-sm text-muted">{Math.round((totalCompleted / totalPlanned) * 100)}% Complete</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${Math.min((totalCompleted / totalPlanned) * 100, 100)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="text-sm text-muted">Completed: <strong style={{ color: '#16a34a' }}>{totalCompleted.toLocaleString()}</strong></span>
              <span className="text-sm text-muted">Balance: <strong style={{ color: '#d97706' }}>{totalPending.toLocaleString()}</strong></span>
              <span className="text-sm text-muted">Total: <strong>{totalPlanned.toLocaleString()}</strong></span>
            </div>
          </div>
        )}

        {/* Material Breakdown by Type */}
        {stats?.breakdown && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GlassIcon name="database" size={18} color="#7c3aed" />
              <h3 style={{ margin: 0 }}>Material Breakdown by Type</h3>
              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>Electronic · Housing · Screws · Tapes · Mechanical</span>
            </div>
            <div className="card-body">
              <MaterialBreakdown breakdown={stats.breakdown} />
            </div>
          </div>
        )}

        {/* Navigation Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 10 }}>
          <div 
            className="card animate-fade" 
            style={{ 
              padding: '40px 32px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              border: '2px solid #e5e7eb',
              background: '#ffffff',
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20
            }}
            onClick={() => setSubView('mos')}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'translateY(-8px)'; 
              e.currentTarget.style.borderColor = '#2563eb'; 
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(37,99,235,0.12)'; 
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = ''; 
              e.currentTarget.style.borderColor = '#e5e7eb'; 
              e.currentTarget.style.boxShadow = ''; 
            }}
          >
            <div style={{ 
              width: 80, height: 80, 
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', 
              borderRadius: 22, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(37,99,235,0.1)'
            }}>
              <GlassIcon name="plan" size={40} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ marginBottom: 10, fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>Manufacturing Orders</h3>
              <p className="text-muted" style={{ fontSize: 14, maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
                Access the full production registry. Update quantities, close orders, and track manufacturing throughput.
              </p>
            </div>
            <div style={{ marginTop: 10, color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Open Registry <span style={{ fontSize: 18 }}>→</span>
            </div>
          </div>

          <div 
            className="card animate-fade" 
            style={{ 
              padding: '40px 32px', 
              cursor: 'pointer', 
              textAlign: 'center', 
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              border: '2px solid #e5e7eb',
              background: '#ffffff',
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20
            }}
            onClick={() => setSubView('returns')}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'translateY(-8px)'; 
              e.currentTarget.style.borderColor = '#dc2626'; 
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(220,38,38,0.12)'; 
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = ''; 
              e.currentTarget.style.borderColor = '#e5e7eb'; 
              e.currentTarget.style.boxShadow = ''; 
            }}
          >
            <div style={{ 
              width: 80, height: 80, 
              background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)', 
              borderRadius: 22, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(220,38,38,0.1)'
            }}>
              <GlassIcon name="history" size={40} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ marginBottom: 10, fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>Return History</h3>
              <p className="text-muted" style={{ fontSize: 14, maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
                Track component returns and manage replenishments. View history of returned items and their status.
              </p>
            </div>
            <div style={{ marginTop: 10, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Open History <span style={{ fontSize: 18 }}>→</span>
            </div>
          </div>
        </div>
      </>
      )}

      {/* MO View */}
      {subView === 'mos' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSubView('main'); setSelectedMOs([]); }}>← Back</button>
              <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>Manufacturing Orders</h3>
              <span className="badge badge-primary" style={{ whiteSpace: 'nowrap' }}>{mos.length} total</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 200 }}>
                <GlassIcon name="search" size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  placeholder="Search MO or SKU..."
                  value={moSearch}
                  onChange={e => setMoSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 30 }}
                />
              </div>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ width: 140 }} />
              <span className="text-muted">to</span>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{ width: 140 }} />
              {/* Plan Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}><GlassIcon name="history" size={14} /> Plan:</span>
                <input
                  type="date"
                  value={filterPlanDate}
                  onChange={e => setFilterPlanDate(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#1e40af', outline: 'none', cursor: 'pointer', width: 130 }}
                  title="Filter by Plan Date"
                />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 140 }}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
              {(filterStart || filterEnd || filterStatus || moSearch || filterPlanDate) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterStatus(''); setMoSearch(''); setFilterPlanDate(''); }}>Clear</button>
              )}
              
              {/* Alert Icon in MO List View */}
              <div 
                onClick={() => setShowAlertModal(true)}
                style={{ 
                  position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, background: lowComponentMOs.length > 0 ? '#fee2e2' : '#f3f4f6', borderRadius: '50%', marginLeft: 8, transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Collected Quantity Analysis"
              >
                <GlassIcon name="alert" size={16} color={lowComponentMOs.length > 0 ? '#ef4444' : '#9ca3af'} />
                {lowComponentMOs.length > 0 && (
                  <span style={{ 
                    position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', 
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 
                  }}>{lowComponentMOs.length}</span>
                )}
              </div>
            </div>
          </div>
          {/* Bulk Actions Bar */}
          {selectedMOs.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderBottom: '1px solid #bfdbfe',
              animation: 'fadeIn 0.2s ease'
            }}>
              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>✓ {selectedMOs.length} selected</span>
              <button
                className="btn btn-sm btn-success"
                onClick={handleBulkClose}
                disabled={updatingId === 'bulk'}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {updatingId === 'bulk' ? 'Closing...' : `✓ Bulk Close (${selectedMOs.length})`}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedMOs([])}
                style={{ marginLeft: 'auto' }}
              >
                Deselect All
              </button>
            </div>
          )}
              {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
          ) : mos.length === 0 ? (
            <div className="empty-state">
              <div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="document" size={48} color="#9ca3af" /></div>
              <p>No production orders found. Submit a plan to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              {(() => {
                const filteredMOs = mos.filter(mo => {
                  if (moSearch) {
                    const q = moSearch.toLowerCase();
                    if (!(mo.moNumber || '').toLowerCase().includes(q) && !(mo.sku || '').toLowerCase().includes(q)) return false;
                  }
                  if (filterPlanDate && (mo.planDate || '') !== filterPlanDate) return false;
                  return true;
                });
                return (
                  <table style={{ minWidth: 1250 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredMOs.filter(m => m.status !== 'Completed').length > 0 && selectedMOs.length === filteredMOs.filter(m => m.status !== 'Completed').length}
                        onChange={() => {
                          const pending = filteredMOs.filter(m => m.status !== 'Completed');
                          if (selectedMOs.length === pending.length && pending.length > 0) setSelectedMOs([]);
                          else setSelectedMOs(pending.map(m => m.id));
                        }}
                        title="Select all pending MOs"
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                      />
                    </th>
                    <th>MO Number</th>
                    <th>SKU / Type</th>
                    <th>Plan Date</th>
                    <th>Components (Collected / Plan)</th>
                    <th>Total QTY</th>
                    <th>Completed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMOs.map(mo => {
                    const isDone = mo.status === 'Completed';
                    const isSelected = selectedMOs.includes(mo.id);
                    return (
                      <tr key={mo.id} style={{ background: isSelected ? '#eff6ff' : '' }}>
                        <td style={{ textAlign: 'center' }}>
                          {!isDone ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectMO(mo.id)}
                              style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                            />
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>
                        <td style={{ color: '#2563eb', fontWeight: 600 }}>{mo.moNumber || '—'}</td>
                        <td><span className="badge badge-primary">{mo.size || mo.sku}</span> {mo.type && <span className="badge" style={{background:'#f3f4f6'}}>{mo.type}</span>}</td>
                        <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                              <GlassIcon name="history" size={12} color="#2563eb" /> {mo.planDate || '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 300 }}>
                            {mo.components?.map(c => {
                              const isDone = c.completedQty >= c.targetQty;
                              return (
                                <div key={c.name} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 6, fontSize: 11, color: '#334155' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                                  <div style={{ color: isDone ? '#16a34a' : '#2563eb', fontWeight: 700 }}>
                                    {c.collectedQty} / {c.targetQty}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{mo.qty?.toLocaleString()}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{(mo.completedQty || 0).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${isDone ? 'badge-success' : 'badge-warning'}`}>
                            {mo.status}
                          </span>
                        </td>
                        <td>
                          {!isDone && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleUpdateQty(mo)}
                                disabled={updatingId === mo.id}
                              >
                                Qty Update
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleMOClose(mo)}
                                disabled={updatingId === mo.id || !mo.components?.every(c => parseInt(c.collectedQty || 0) === parseInt(c.completedQty || 0))}
                                title={!mo.components?.every(c => parseInt(c.collectedQty || 0) === parseInt(c.completedQty || 0)) ? "Collected Qty must equal Completed Qty to close" : ""}
                              >
                                MO Close
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              );
            })()}
            </div>
          )}
        </div>
      )}

      {/* Returns View */}
      {subView === 'returns' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSubView('main')}>← Back</button>
              <GlassIcon name="history" size={18} color="#dc2626" />
              <h3 style={{ margin: 0 }}>Return History</h3>
              <span className="badge badge-danger">{returnHistory.length} total</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ width: 140 }} />
              <span className="text-muted">to</span>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{ width: 140 }} />
              {(filterStart || filterEnd) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStart(''); setFilterEnd(''); }}>Clear</button>
              )}
            </div>
          </div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
              ) : returnHistory.length === 0 ? (
                <div className="empty-state"><div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="arrow-left" size={48} color="#9ca3af" /></div><p>No return history.</p></div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>MO Number</th>
                        <th>Type</th>
                        <th>Component</th>
                        <th>Qty</th>
                        <th>Returned At</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnHistory.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>{r.moNumber}</td>
                          <td>
                            {r.isFullMO ? <span className="badge badge-danger">Full MO</span> : <span className="badge badge-primary">Component</span>}
                          </td>
                          <td>{r.isFullMO ? 'All Components' : (r.component || '—')}</td>
                          <td style={{ fontWeight: 700 }}>{r.componentQty}</td>
                          <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(r.returnedAt).toLocaleString()}</td>
                          <td>
                            {r.status === 'Replenished' ? (
                              <div style={{ fontSize: 11 }}>
                                <span className="badge badge-success">Replenished</span><br/>
                                <span style={{ color: '#6b7280' }}>{new Date(r.replenishedAt).toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="badge badge-warning">{r.status}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {r.status !== 'Replenished' && !r.isFullMO && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleReplenish(r.id)}>
                                Replenish
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      )}
      </div>

      {/* Close MO Modal */}
      {closingMO && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setClosingMO(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
              <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
                <h3>Update Quantities: {closingMO.moNumber || closingMO.sku}</h3>
                <button className="btn-icon" onClick={() => setClosingMO(null)}>✕</button>
              </div>
              <div style={{ padding: '0 24px 24px 24px', maxHeight: '75vh', overflowY: 'auto' }}>

              {/* Warning if any component has 0 collected */}
              {moComponents.some(c => parseInt(c.collectedQty || 0) === 0) && (
                <div style={{ margin: '0 0 12px 0', padding: '10px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="alert" size={16} color="#92400e" /> <strong>One or more components have 0 collected qty.</strong> Update the Collected Qty below to reflect what was physically received.
                </div>
              )}

              {/* Plan Date */}
              <div style={{ marginBottom: 14, padding: '10px 16px', background: '#f0f9ff', border: '1.5px solid #bfdbfe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}><GlassIcon name="history" size={14} /> Plan Date:</span>
                <input
                  type="date"
                  value={editPlanDate}
                  onChange={e => setEditPlanDate(e.target.value)}
                  style={{ border: '1px solid #bfdbfe', background: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#1e40af', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                />
                <span style={{ fontSize: 11, color: '#6b7280' }}>Edit to update plan date for this MO</span>
              </div>

              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GlassIcon name="inbox" size={14} /> Collected Quantity <span style={{ fontWeight: 400, color: '#3b82f6', fontSize: 11 }}>(WIP IN — physically received for this MO)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                  {moComponents.map((c, i) => (
                    <div className="form-group" style={{ marginBottom: 0 }} key={i}>
                      <label style={{ color: '#2563eb', fontWeight: 700, fontSize: 11 }}>{c.name}</label>
                      <input
                        type="number" min="0"
                        value={c.collectedQty}
                        onChange={e => {
                          const newComps = [...moComponents];
                          newComps[i].collectedQty = e.target.value;
                          setMoComponents(newComps);
                        }}
                        style={{ borderColor: parseInt(c.collectedQty||0) === 0 ? '#fca5a5' : '' }}
                      />
                      <p className="text-xs text-muted" style={{ marginTop: 3 }}>Target: {c.targetQty}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Completed (WIP OUT) */}
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#15803d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GlassIcon name="success" size={14} color="#15803d" /> Completed Quantity <span style={{ fontWeight: 400, color: '#16a34a', fontSize: 11 }}>(WIP OUT — assembled/finished)</span>
                  </div>
                  <button 
                    className="btn btn-sm" 
                    onClick={() => {
                      const newComps = [...moComponents];
                      newComps.forEach(c => c.completedQty = c.collectedQty);
                      setMoComponents(newComps);
                      
                      const minVal = newComps.length === 0 ? 0 : Math.min(...newComps.map(c => {
                        const expected = c.expectedQty || Math.max(1, Math.floor(parseInt(c.targetQty || 0) / parseInt(closingMO.qty || 1)));
                        return Math.floor(parseInt(c.collectedQty || 0) / expected);
                      }));
                      setCloseQty(String(minVal));
                    }}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ⚡ Auto Fill Qty
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 700, color: '#374151', fontSize: 11 }}>OVERALL MO</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={closeQty} 
                      onChange={e => {
                        let val = e.target.value;
                        const minCollected = moComponents.length === 0 ? 0 : Math.min(...moComponents.map(c => {
                          const expected = c.expectedQty || Math.max(1, Math.floor(parseInt(c.targetQty || 0) / parseInt(closingMO.qty || 1)));
                          return Math.floor(parseInt(c.collectedQty || 0) / expected);
                        }));
                        if (val !== '' && parseInt(val) > minCollected) val = String(minCollected);
                        setCloseQty(val);
                        if (val !== '') {
                          const newComps = [...moComponents];
                          newComps.forEach(c => {
                            const expected = c.expectedQty || Math.max(1, Math.floor(parseInt(c.targetQty || 0) / parseInt(closingMO.qty || 1)));
                            c.completedQty = String(parseInt(val) * expected);
                          });
                          setMoComponents(newComps);
                        }
                      }} 
                    />
                    <p className="text-xs text-muted" style={{ marginTop: 3 }}>Plan: {closingMO.qty}</p>
                  </div>
                  {moComponents.map((c, i) => (
                    <div className="form-group" style={{ marginBottom: 0 }} key={i}>
                      <label style={{ color: '#16a34a', fontWeight: 700, fontSize: 11 }}>{c.name}</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={c.collectedQty}
                        value={c.completedQty} 
                        onChange={e => {
                          let val = e.target.value;
                          const maxVal = parseInt(c.collectedQty || 0);
                          if (val !== '' && parseInt(val) > maxVal) val = String(maxVal);
                          const newComps = [...moComponents];
                          newComps[i].completedQty = val;
                          setMoComponents(newComps);
                        }} 
                      />
                      <p className="text-xs text-muted" style={{ marginTop: 3 }}>Collected: {c.collectedQty}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 6 }}><GlassIcon name="alert" size={16} color="#2563eb" /> <span><strong>Collected</strong> = how many components you physically have for this MO (updates WIP IN). <strong>Completed</strong> = how many are assembled (updates WIP OUT on MO Close).</span></div>
              </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '16px 24px', background: '#f9fafb' }}>
                <button className="btn btn-secondary" onClick={() => setClosingMO(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmQtyUpdate} disabled={updatingId}>
                  {updatingId ? 'Saving...' : 'Save Quantities'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Return MO Modal */}
      {returnModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setReturnModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, width: '95vw', overflow: 'hidden', padding: 0 }}>
              <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="scrap" size={20} color="#dc2626" />
                  <h3 style={{ margin: 0 }}>Return MO / Component</h3>
                </div>
                <button className="btn-icon" onClick={() => setReturnModal(false)}>✕</button>
              </div>
              
              <div style={{ display: 'flex', minHeight: 450, maxHeight: '80vh' }}>
                {/* Left Side: Search & Select MO */}
                <div style={{ flex: 1, padding: '20px 24px', borderRight: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
                  <div className="form-group">
                    <label>Search & Select MO</label>
                    <input
                      placeholder="Search by MO number (or last 3-4 digits)…"
                      value={returnSearch}
                      onChange={e => setReturnSearch(e.target.value)}
                      style={{ background: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                    {filteredReturnMOs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>No pending MOs found</div>
                    ) : filteredReturnMOs.map(mo => (
                      <div
                        key={mo.id}
                        onClick={() => setReturnSelMO(mo)}
                        style={{
                          padding: '12px 14px', cursor: 'pointer',
                          background: returnSelMO?.id === mo.id ? '#fff1f2' : 'transparent',
                          borderLeft: returnSelMO?.id === mo.id ? '4px solid #dc2626' : '4px solid transparent',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13, display: 'block' }}>{mo.moNumber || '—'}</span>
                          <span className="badge badge-primary" style={{ marginTop: 4, fontSize: 11 }}>{mo.sku}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>QTY: {(mo.qty || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Return Options */}
                <div style={{ flex: 1.2, padding: '20px 24px', display: 'flex', flexDirection: 'column', background: '#fff', overflowY: 'auto' }}>
                  {returnError && <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {returnError}</div>}
                  
                  {!returnSelMO ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="arrow-left" size={40} color="#9ca3af" /></div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>Select an MO to Return</h4>
                      <p style={{ margin: 0, fontSize: 13, maxWidth: 250 }}>Search and select a manufacturing order from the left panel to begin the return process.</p>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700, marginBottom: 4 }}>Selected MO: {returnSelMO.moNumber}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>SKU: <strong>{returnSelMO.sku}</strong> &nbsp;|&nbsp; Total QTY: <strong>{returnSelMO.qty}</strong></div>
                      </div>
                      
                      <div className="form-group">
                        <label>Return Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          {[
                            ...(returnSelMO.components?.map(c => c.name) || []),
                            'FullMO'
                          ].map(t => {
                            const col = t === 'FullMO' ? '#dc2626' : '#2563eb';
                            const availQty = getReturnableQty(returnSelMO, t);
                            const isZero = availQty === 0;

                            return (
                              <button
                                key={t}
                                onClick={() => { 
                                  if (isZero) {
                                    setReturnError(`${t} has 0 returnable quantity.`);
                                    return;
                                  }
                                  setReturnType(t); 
                                  setReturnQty(''); 
                                  setReturnError('');
                                }}
                                style={{
                                  padding: '12px 8px', borderRadius: 8, border: `2px solid ${returnType === t ? col : '#e5e7eb'}`,
                                  background: returnType === t ? `${col}15` : '#f9fafb',
                                  color: returnType === t ? col : '#4b5563',
                                  fontWeight: 600, fontSize: 13, cursor: isZero ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                                  opacity: isZero ? 0.5 : 1,
                                  gridColumn: t === 'FullMO' ? '1 / -1' : 'auto'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{t === 'FullMO' ? <><GlassIcon name="inbox" size={14} color={col} /> Full MO Return</> : t}</div>
                                <div style={{ fontSize: 10, marginTop: 4, color: isZero ? '#dc2626' : '#6b7280' }}>({availQty} avail)</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {returnType && (
                        <div className="form-group" style={{ marginBottom: 0, marginTop: 8 }}>
                          <label>Return Quantity ({returnType})</label>
                          <input 
                            type="number" 
                            min="1" 
                            max={getReturnableQty(returnSelMO, returnType)}
                            placeholder={`Enter quantity (max ${getReturnableQty(returnSelMO, returnType)})`} 
                            value={returnQty} 
                            onChange={e => setReturnQty(e.target.value)} 
                            style={{ padding: '10px 12px', fontSize: 14 }} 
                          />
                        </div>
                      )}

                      <div className="form-group" style={{ marginTop: 12 }}>
                        <label>Remark / Reason (Optional)</label>
                        <input
                          type="text"
                          placeholder="Why is this being returned?"
                          value={returnRemark}
                          onChange={e => setReturnRemark(e.target.value)}
                          style={{ padding: '10px 12px', fontSize: 14 }}
                        />
                      </div>
                      
                      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                        {returnType === 'FullMO' && (
                          <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', gap: 6 }}><GlassIcon name="warning" size={14} color="#b45309" /> <span>Selecting <strong>Full MO</strong> will physically reduce the quantities of ALL components on this MO. If MO quantity reaches 0, it will be marked as Returned.</span></div>
                          </div>
                        )}
                        {returnType && returnType !== 'FullMO' && (
                          <div className="alert alert-info" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', gap: 6 }}><GlassIcon name="alert" size={14} color="#2563eb" /> <span>The <strong>{returnType}</strong> component's collected quantity will be reduced. The WIP report will accurately reflect this return.</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Footer / Buttons */}
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setReturnModal(false)} style={{ padding: '8px 20px' }}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      onClick={submitReturn}
                      disabled={returnSubmitting || !returnSelMO || !returnType}
                      style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none', padding: '8px 24px', fontWeight: 700 }}
                    >
                      {returnSubmitting ? 'Processing…' : '↩ Submit Return'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Low Component Alert Modal */}
      {showAlertModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GlassIcon name="alert" size={24} />
                  <h3 style={{ margin: 0, color: '#b91c1c' }}>Low Component Collection Alerts</h3>
                </div>
                <button className="btn-icon" onClick={() => setShowAlertModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <p className="text-muted" style={{ marginBottom: 16 }}>
                  The following pending MOs have incomplete component collection. Please update their collected quantities.
                </p>
                {lowComponentMOs.length === 0 ? (
                  <p>No low components detected.</p>
                ) : (
                  <div className="table-wrapper">
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>MO Number</th>
                          <th>Target Qty</th>
                          <th>Components Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowComponentMOs.map(mo => {
                          const targetQ = parseInt(mo.qty || 0);
                          
                          return (
                            <tr key={mo.id}>
                              <td style={{ fontWeight: 600, color: '#1e40af' }}>{mo.moNumber}</td>
                              <td>{targetQ}</td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {mo.components?.map(c => {
                                    const isLow = parseInt(c.collectedQty || 0) < parseInt(c.targetQty || 0);
                                    return (
                                      <span key={c.name} style={{ fontSize: 11, background: isLow ? '#fef2f2' : '#f0fdf4', color: isLow ? '#dc2626' : '#16a34a', padding: '2px 6px', borderRadius: 4, border: `1px solid ${isLow ? '#fecaca' : '#bbf7d0'}`, fontWeight: isLow ? 700 : 400 }}>
                                        {c.name}: {c.collectedQty || 0} / {c.targetQty}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAlertModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Income / Outgo Today Modal */}
      {todayModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setTodayModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GlassIcon name={todayModal === 'income' ? 'export' : 'check'} size={20} color={todayModal === 'income' ? '#7c3aed' : '#10b981'} />
                  <h3>{todayModal === 'income' ? 'Income Today (New MOs)' : 'Outgo Today (Closed MOs)'}</h3>
                </div>
                <button className="btn-icon" onClick={() => setTodayModal(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {(() => {
                  const getLocalDateStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                  const todayStr = getLocalDateStr(new Date());
                  
                  const list = mos.filter(mo => {
                    if (todayModal === 'income') return mo.createdAt && getLocalDateStr(new Date(mo.createdAt)) === todayStr;
                    if (todayModal === 'outgo') return mo.completedAt && getLocalDateStr(new Date(mo.completedAt)) === todayStr;
                    return false;
                  });

                  if (list.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                        <GlassIcon name="document" size={48} color="#e5e7eb" style={{ marginBottom: 16 }} />
                        <p>No MOs found for {todayModal} today.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                      <table style={{ width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f9fafb' }}>
                          <tr>
                            <th>MO Number</th>
                            <th>Type / SKU</th>
                            <th>Target Qty</th>
                            {todayModal === 'outgo' && <th>Completed Qty</th>}
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(mo => (
                            <tr key={mo.id}>
                              <td style={{ fontWeight: 600, color: '#1e40af' }}>{mo.moNumber}</td>
                              <td style={{ color: '#4b5563' }}><span className="badge badge-primary">{mo.type || mo.sku}</span></td>
                              <td style={{ fontWeight: 600 }}>{mo.qty}</td>
                              {todayModal === 'outgo' && <td style={{ fontWeight: 700, color: '#16a34a' }}>{mo.completedQty || 0}</td>}
                              <td>
                                <span className={`badge badge-${mo.status === 'Completed' ? 'success' : 'warning'}`}>
                                  {mo.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
