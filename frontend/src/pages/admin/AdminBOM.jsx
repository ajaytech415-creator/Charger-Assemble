import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

export default function AdminBOM() {
  const [boms, setBoms] = useState([]);
  const [dbComponents, setDbComponents] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [types, setTypes] = useState('');
  const [sizes, setSizes] = useState('');
  const [components, setComponents] = useState([]);
  
  // Add Component Form State
  const [addCat, setAddCat] = useState('');
  const [addComp, setAddComp] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addUseSize, setAddUseSize] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBoms, resComps] = await Promise.all([
        api.getBoms(),
        api.getComponents()
      ]);
      setBoms(resBoms || []);
      setDbComponents(resComps || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName(''); setTypes(''); setSizes(''); setComponents([]);
    setShowModal(true);
  };

  const handleOpenEdit = (bom) => {
    setEditingId(bom.id);
    setName(bom.name);
    setTypes(bom.types.join(', '));
    setSizes(bom.sizes.join(', '));
    setComponents([...bom.components]);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this BOM configuration?')) return;
    try {
      await api.deleteBom(id);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      types: types.split(',').map(s => s.trim()).filter(Boolean),
      sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      components
    };

    try {
      if (editingId) {
        await api.updateBom(editingId, payload);
      } else {
        await api.createBom(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComponent = () => {
    if (!addCat || !addComp) return alert('Select category and component');
    setComponents([...components, { category: addCat, name: addComp, qty: parseInt(addQty), useSize: addUseSize }]);
    setAddComp(''); setAddQty(1); setAddUseSize(false);
  };

  const removeComponent = (idx) => {
    const arr = [...components];
    arr.splice(idx, 1);
    setComponents(arr);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 40, height: 40 }}/></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>BOM Configurations</h2>
          <p className="text-muted text-sm">Define dynamic bill of materials (BOM) logic for Chargers.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name="add" size={16} color="#fff" /> Create BOM
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {boms.map(bom => (
          <div key={bom.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{bom.name}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={() => handleOpenEdit(bom)}>✏️</button>
                <button className="btn-icon text-danger" onClick={() => handleDelete(bom.id)}>🗑️</button>
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm" style={{ marginBottom: 4 }}><strong>Types:</strong> {bom.types.join(', ')}</div>
              <div className="text-sm"><strong>Sizes:</strong> <span className="text-muted">{bom.sizes.join(', ')}</span></div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8, color: '#475569' }}>Components ({bom.components.length})</div>
              {bom.components.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #e2e8f0', padding: '6px 0' }}>
                  <span><span style={{ color: '#94a3b8', width: 60, display: 'inline-block' }}>{c.category}</span> {c.name} {c.useSize && <span style={{ color: '#3b82f6' }}>(auto-size)</span>}</span>
                  <strong style={{ color: '#0f172a' }}>x{c.qty}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 800, width: '90%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingId ? 'Edit BOM' : 'Create BOM'}</h3>
                <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>BOM Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. C2 Charger Set" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Target Types (Comma separated)</label>
                    <input type="text" className="input" value={types} onChange={e => setTypes(e.target.value)} placeholder="e.g. C2, C2.5" />
                  </div>
                  <div className="form-group">
                    <label>Target Sizes (Comma separated)</label>
                    <input type="text" className="input" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="e.g. S05, S06, S07" />
                  </div>
                </div>

                <div style={{ marginTop: 20, marginBottom: 12, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>BOM Components</h4>
                  
                  {/* Add Component Builder */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label style={{ fontSize: 12 }}>Category</label>
                      <select className="input" value={addCat} onChange={e => setAddCat(e.target.value)}>
                        <option value="">Select...</option>
                        {Object.keys(dbComponents).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 2, margin: 0 }}>
                      <label style={{ fontSize: 12 }}>Component</label>
                      <select className="input" value={addComp} onChange={e => setAddComp(e.target.value)} disabled={!addCat}>
                        <option value="">Select...</option>
                        {addCat && dbComponents[addCat]?.map(c => {
                          const n = typeof c === 'string' ? c : c.name;
                          return <option key={n} value={n}>{n}</option>
                        })}
                      </select>
                    </div>
                    <div className="form-group" style={{ width: 80, margin: 0 }}>
                      <label style={{ fontSize: 12 }}>Qty</label>
                      <input type="number" className="input" value={addQty} onChange={e => setAddQty(e.target.value)} min="1" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, margin: '0 10px 10px 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={addUseSize} onChange={e => setAddUseSize(e.target.checked)} /> Auto-Size
                    </label>
                    <button className="btn btn-secondary" onClick={handleAddComponent} style={{ marginBottom: 2 }}>Add</button>
                  </div>

                  {/* Components List */}
                  {components.length === 0 ? (
                    <div className="text-muted text-sm text-center" style={{ padding: 20 }}>No components added yet.</div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Name</th>
                          <th>Qty Per Unit</th>
                          <th>Auto Size</th>
                          <th style={{ width: 50 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((c, i) => (
                          <tr key={i}>
                            <td><span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{c.category}</span></td>
                            <td style={{ fontWeight: 500 }}>{c.name}</td>
                            <td>x{c.qty}</td>
                            <td>{c.useSize ? <span style={{ color: '#3b82f6' }}>Yes</span> : <span className="text-muted">No</span>}</td>
                            <td>
                              <button className="btn-icon text-danger" onClick={() => removeComponent(i)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save BOM</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
