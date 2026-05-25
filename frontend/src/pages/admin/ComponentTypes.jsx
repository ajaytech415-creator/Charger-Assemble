import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

const CATEGORY_LABELS = {
  electronic: '1. ELECTRONIC COMPONENTS',
  c2Mech: '2. C2 CHARGER MECHANICAL PARTS',
  c25Parts: '3. C2.5 CHARGER PARTS',
  c3Parts: '4. C3 CHARGER PARTS',
  dieselParts: '5. DIESEL CHARGER PARTS',
  luxParts: '6. LUX CHARGER PARTS',
  luxColors: '7. LUX BASE COLORS',
  stickers: '8. STICKERS & BRANDING',
  tapes: '9. TAPES & ADHESIVES',
  screws: '10. SCREWS & FASTENERS',
  fgs: '11. FG COMPONENTS',
  housing: '12. DEVICE HOUSING / ENCLOSURE PARTS'
};

const CATEGORY_ORDER = [
  'electronic', 'c2Mech', 'c25Parts', 'c3Parts', 'dieselParts',
  'luxParts', 'luxColors', 'stickers', 'tapes', 'screws', 'fgs', 'housing'
];

export default function ComponentTypes() {
  const [components, setComponents] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [action, setAction] = useState('add'); // 'add' | 'edit' | 'delete'
  const [activeItem, setActiveItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getComponents().then(data => {
      setComponents(data);
      const keys = Object.keys(data);
      keys.sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a);
        const idxB = CATEGORY_ORDER.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });
      setCategories(keys);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, []);

  const openModal = (act, item = null) => {
    setAction(act);
    setActiveItem(item);
    if (item) {
      setEditName(typeof item === 'string' ? item : item.name);
      setEditStatus(item.status || 'Active');
    } else {
      setEditName('');
      setEditStatus('Active');
    }
    setModal(true);
  };

  const handleManage = async () => {
    if ((action === 'add' || action === 'edit' || action === 'addCategory') && !editName) return alert('Name is required');
    setSaving(true);
    try {
      const category = action === 'addCategory' ? editName : categories[activeTab];
      await api.manageComponent({
        category,
        action,
        id: activeItem?.id,
        name: editName,
        status: editStatus
      });
      setModal(false);
      load();
    } catch (e) {
      alert(e.message || 'Failed to update component');
    } finally {
      setSaving(false);
    }
  };

  const activeCategoryKey = categories[activeTab];
  const activeLabel = CATEGORY_LABELS[activeCategoryKey] || activeCategoryKey || 'Components';
  
  const getList = () => {
    if (!components || !activeCategoryKey) return [];
    return components[activeCategoryKey] || [];
  };

  const list = getList().map((item, idx) => {
    if (typeof item === 'string') return { id: `STR-${idx}`, name: item, status: 'Active' };
    return item;
  }).filter(i => (i.name || '').toLowerCase().includes(search.toLowerCase()));

  const totalItems = Object.values(components).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 4 }}>Component Inventory Management</h2>
        <p className="text-muted text-sm">Define and configure all components used in BOMs and assembly processes.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Categories', value: categories.length, icon: 'layers', color: '#2563eb' },
          { label: 'Total Items', value: totalItems, icon: 'document', color: '#16a34a' }
        ].map(s => (
          <div key={s.label} className="card stat-card" style={{ padding: '24px 20px' }}>
            <div className="stat-label">
              <GlassIcon name={s.icon} size={22} color={s.color} style={{ marginRight: 8 }} />
              {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color, marginTop: 12, fontSize: '2.5rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Header */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Component Catalog</h3>
            <p className="text-sm text-muted">Select a category below to manage its specific component versions.</p>
          </div>
        </div>

        {/* Categories Sidebar Layout */}
        <div style={{ display: 'flex', minHeight: 400 }}>
          {/* Sidebar */}
          <div style={{ width: 220, borderRight: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 0' }}>
            {categories.map((c, i) => (
              <div 
                key={c} 
                onClick={() => { setActiveTab(i); setSearch(''); }}
                style={{ 
                  padding: '8px 16px', 
                  cursor: 'pointer',
                  fontWeight: activeTab === i ? 600 : 400,
                  color: activeTab === i ? '#2563eb' : '#475569',
                  background: activeTab === i ? '#eff6ff' : 'transparent',
                  borderLeft: activeTab === i ? '3px solid #2563eb' : '3px solid transparent',
                  fontSize: 14
                }}
              >
                {CATEGORY_LABELS[c] || c}
                <span className="text-muted" style={{ float: 'right', fontSize: 12 }}>{components[c]?.length || 0}</span>
              </div>
            ))}
            <div 
              onClick={() => openModal('addCategory')}
              style={{ padding: '12px 16px', cursor: 'pointer', color: '#2563eb', fontWeight: 500, fontSize: 13, borderTop: '1px solid #e2e8f0', marginTop: 8 }}
            >
              + Create Category
            </div>
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>{activeLabel}</h3>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => openModal('add')}>
                  + Add Item
                </button>
                <div className="search-input-wrap">
                  <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
                  <input
                    placeholder={`Search...`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 220 }}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 32 }}>No items found.</td></tr>
                    ) : list.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: '#2563eb', fontWeight: 600, fontSize: 12 }}>{item.id}</td>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td><span className={`badge ${item.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span></td>
                        <td>
                          <div className="td-actions">
                            <button className="btn-icon" title="Edit" onClick={() => openModal('edit', item)}>
                              <GlassIcon name="edit" size={18} color="#2563eb" />
                            </button>
                            <button className="btn-icon danger" title="Delete" onClick={() => openModal('delete', item)}>
                              <GlassIcon name="delete" size={18} color="#dc2626" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Modal */}
      {modal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h3>
                  {action === 'add' ? 'Add New Component' : 
                   action === 'edit' ? 'Edit Component' : 
                   action === 'addCategory' ? 'Create New Category' : 'Delete Component'}
                </h3>
                <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
              </div>
              
              <div className="modal-body">
                {action === 'delete' ? (
                  <p>Are you sure you want to delete this component? This action cannot be undone.</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{action === 'addCategory' ? 'Category Name (ID)' : 'Component Name'}</label>
                      <input 
                        type="text" 
                        className="input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                        placeholder={action === 'addCategory' ? "e.g. customParts" : ""}
                      />
                    </div>
                    {action !== 'addCategory' && (
                      <div className="form-group">
                        <label>Status</label>
                        <select className="input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button 
                  className={`btn ${action === 'delete' ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={handleManage}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : action === 'delete' ? 'Delete' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
