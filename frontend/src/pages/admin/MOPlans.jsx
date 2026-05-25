import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

export default function DatabaseManager() {
  const [mos, setMos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlanDate, setFilterPlanDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

  const [editModal, setEditModal] = useState(false);
  const [editingMO, setEditingMO] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filterPlanDate) params.planDate = filterPlanDate;
      const data = await api.getMOs(params);
      setMos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterPlanDate]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = mos.filter(m => {
    if (search) {
      const s = search.toLowerCase();
      if (!(m.moNumber || '').toLowerCase().includes(s) && !(m.sku || '').toLowerCase().includes(s)) return false;
    }
    if (filterPlanDate && (m.planDate || '') !== filterPlanDate) return false;
    return true;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'date') {
       aVal = new Date(a.date || a.createdAt || 0).getTime();
       bVal = new Date(b.date || b.createdAt || 0).getTime();
    } else if (sortConfig.key === 'planDate') {
       aVal = new Date(a.planDate || 0).getTime();
       bVal = new Date(b.planDate || 0).getTime();
    } else if (sortConfig.key === 'qty') {
       aVal = a.qty || 0;
       bVal = b.qty || 0;
    } else {
       if (typeof aVal === 'string') aVal = aVal.toLowerCase();
       if (typeof bVal === 'string') bVal = bVal.toLowerCase();
       if (aVal === undefined) aVal = '';
       if (bVal === undefined) bVal = '';
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) return alert('No data to export.');
    const headers = ['ID', 'MO Number', 'SKU / Type', 'Status', 'Date', 'Total QTY', 'Completed', 'Components (Comp/Total)'];
    const rows = filtered.map(m => [
      m.id, m.moNumber || '', (m.size || m.sku || '') + (m.type ? ' ' + m.type : ''), m.status || '', m.date || m.createdAt?.split('T')[0] || '',
      m.qty || 0, m.completedQty || 0,
      (m.components || []).map(c => `${c.category}:${c.completedQty}/${c.collectedQty}`).join(' | ')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UltraHuman Assembly_DB_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupDB = () => {
    window.open(api.exportBackupUrl(), '_blank');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this MO? This action cannot be undone.')) {
      try {
        await api.deleteMO(id);
        load();
      } catch (e) {
        console.error(e);
        alert('Failed to delete MO');
      }
    }
  };

  const handleEditClick = (mo) => {
    setEditingMO(JSON.parse(JSON.stringify(mo)));
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateMO(editingMO.id, {
        status: editingMO.status,
        completedQty: parseInt(editingMO.completedQty || 0),
        components: editingMO.components,
        planDate: editingMO.planDate || '',
        submittedBy: 'Admin'
      });
      setEditModal(false);
      setEditingMO(null);
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to update MO data');
    }
  };

  // Live shell preview when admin changes OD in the modal
  const getShellPreview = (sku, refer) => {
    const skuUpper = (sku || '').toUpperCase().trim();
    const numMatch = skuUpper.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '';
    const is02mm = ['o', '0'].includes((refer || '').toLowerCase().trim());
    const prefixMatch = skuUpper.match(/^[A-Z]+/);
    const lp = prefixMatch ? prefixMatch[0] : '';
    if (lp === 'LR') return `RARE ROSE GOLD SHELL RS${num}`;
    if (lp === 'LP') return `RARE PLATINUM SHELL S${num}`;
    if (lp === 'LG') return `RARE YELLOW GOLD SHELL LG${num}`;
    if (lp === 'DS') return `DIESEL SILVER SHELL DS${num}`;
    if (lp === 'DB') return `DIESEL BLACK SHELL DB${num}`;
    if (lp === 'BRG') return `Brushed Rose gold 0.2MM - SIZE ${num}`;
    return is02mm ? (num ? `0.2mm ${skuUpper}` : skuUpper) : skuUpper;
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Database Manager</h2>
          <p className="text-muted text-sm">Full administrative control over MO database records.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleBackupDB}><GlassIcon name="database" size={16} color="#64748b" /> Backup Full DB</button>
          <button className="btn btn-success btn-sm" onClick={handleExportCSV}><GlassIcon name="export" size={16} color="#ffffff" /> Export Excel</button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', background: '#f9fafb' }}>
        <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 200 }} max={today + 'T23:59'} />
        <span className="text-muted">to</span>
        <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 200 }} max={today + 'T23:59'} />
        {(startDate || endDate) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
        )}
        {/* Plan Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '5px 12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}><GlassIcon name="history" size={14} /> Plan Date:</span>
          <input
            type="date"
            value={filterPlanDate}
            onChange={e => setFilterPlanDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#1e40af', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            title="Filter by Plan Date"
          />
          {filterPlanDate && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0, lineHeight: 1 }}
              onClick={() => setFilterPlanDate('')}
              title="Clear plan date filter"
            >×</button>
          )}
        </div>
        <div className="search-input-wrap" style={{ marginLeft: 'auto', flex: 1, maxWidth: 300 }}>
          <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
          <input placeholder="Search MO Number or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('moNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  MO Number {sortConfig.key === 'moNumber' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  SKU / Type {sortConfig.key === 'sku' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Created Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('planDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Plan Date {sortConfig.key === 'planDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('qty')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Quantities (Completed / Total) {sortConfig.key === 'qty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
              ) : sortedFiltered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="icon">🗄️</div>
                    <p>No records found in database.</p>
                  </div>
                </td></tr>
              ) : (
                sortedFiltered.map(mo => (
                  <tr key={mo.id}>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{mo.moNumber || '—'}</td>
                    <td><span className="badge badge-primary">{mo.size || mo.sku}</span> {mo.type && <span className="badge" style={{background:'#f3f4f6'}}>{mo.type}</span>}</td>
                    <td className="text-sm">{mo.date || mo.createdAt?.split('T')[0]}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                          <GlassIcon name="history" size={12} color="#2563eb" /> {mo.planDate || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${mo.status === 'Completed' ? 'success' : 'warning'}`}>
                        {mo.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f3f4f6', borderRadius: 4 }}>
                          <span style={{ fontWeight: 600 }}>Overall MO:</span>
                          <span style={{ color: mo.completedQty >= mo.qty ? '#16a34a' : '#2563eb', fontWeight: 600 }}>
                            {mo.completedQty || 0} / {mo.qty}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {mo.components?.map(c => (
                            <div key={c.name} style={{ flex: '1 1 45%', padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                              <span className="text-muted">{c.category}:</span> <span style={{ color: c.completedQty >= c.targetQty ? '#16a34a' : '#2563eb', fontWeight: 600 }}>{c.completedQty} / {c.collectedQty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon" title="Edit Record" onClick={() => handleEditClick(mo)}>
                          <GlassIcon name="edit" size={18} color="#2563eb" />
                        </button>
                        <button className="btn-icon danger" title="Delete Record" onClick={() => handleDelete(mo.id)}>
                          <GlassIcon name="delete" size={18} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
          <span className="text-sm text-muted">Showing {sortedFiltered.length} DB Records</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && editingMO && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <div className="modal-header">
                <h3>Database Edit: {editingMO.moNumber || editingMO.sku}</h3>
                <button className="btn-icon" onClick={() => setEditModal(false)}>✕</button>
              </div>



              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editingMO.status} onChange={e => setEditingMO({...editingMO, status: e.target.value})}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Overall Completed Qty</label>
                  <input type="number" min="0" value={editingMO.completedQty} onChange={e => setEditingMO({...editingMO, completedQty: e.target.value})} />
                </div>
              </div>

              {/* Plan Date edit */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="history" size={14} color="#2563eb" /> Plan Date</label>
                <input
                  type="date"
                  value={editingMO.planDate || ''}
                  onChange={e => setEditingMO({...editingMO, planDate: e.target.value})}
                  style={{ maxWidth: 220 }}
                />
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>The manufacturing plan date for this order.</p>
              </div>

              <div style={{ padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12, color: '#374151' }}>Component Completed Quantities</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {editingMO.components?.map((c, i) => (
                    <div className="form-group" style={{ marginBottom: 0 }} key={i}>
                      <label>{c.category}</label>
                      <input type="number" min="0" value={c.completedQty} onChange={e => {
                        const newComps = [...editingMO.components];
                        newComps[i].completedQty = e.target.value;
                        setEditingMO({...editingMO, components: newComps});
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="alert alert-warning">
                <div style={{ display: 'flex', gap: 6 }}><GlassIcon name="alert" size={14} color="#b45309" /> <span>Admin override: Changes made here bypass standard validation and directly update the database record.</span></div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="save" size={14} color="#fff" /> Save to Database</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
