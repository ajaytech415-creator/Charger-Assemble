import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ImageScanModal from '../components/ImageScanModal';
import ModalPortal from '../components/ModalPortal';

const EMPTY_FORM = { refer: '', moNumber: '', type: 'C2', size: 'S06', qty: '', overrides: {} };

export default function PlanPage({ initialRows = [], onBack, onConfirm }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [derived, setDerived] = useState({ components: [] });
  const [config, setConfig] = useState({});
  const [rows, setRows] = useState(initialRows);
  const [editId, setEditId] = useState(null);

  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  // Plan date
  const todayStr = new Date().toISOString().split('T')[0];
  const [planDate, setPlanDate] = useState(todayStr);

  // Multi-select & Bulk Edit
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({}); // { [compName]: qty }

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length && rows.length > 0) setSelectedIds([]);
    else setSelectedIds(rows.map(r => r.id));
  };
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const handleBulkSave = () => {
    setRows(rows.map(r => {
      if (selectedIds.includes(r.id)) {
        const newComps = r.components.map(c => {
          if (bulkForm[c.name] !== undefined && bulkForm[c.name] !== '') {
            return { ...c, collectedQty: parseInt(bulkForm[c.name]) };
          }
          return c;
        });
        return { ...r, components: newComps };
      }
      return r;
    }));
    setShowBulkModal(false);
    setSelectedIds([]);
    setBulkForm({});
  };

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  // Live auto-fill based on Type and Size
  useEffect(() => {
    if (!form.type || !form.size) {
      const t = setTimeout(() => setDerived({ components: [] }), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(async () => {
      setParsing(true);
      try {
        const result = await api.parseSKU({ type: form.type, size: form.size, sku: form.size, refer: form.refer || 'o' });
        setDerived(result);
      } catch {
        setDerived({ components: [] });
      } finally {
        setParsing(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.type, form.size, form.refer, config]);

  const handleOverrideChange = (compName, val) => {
    setForm(prev => ({ ...prev, overrides: { ...prev.overrides, [compName]: val } }));
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (!form.refer || !form.moNumber || !form.type || !form.size || !form.qty) { 
      setError('Refer, MO Number, Type, Size, and QTY are required.'); 
      return; 
    }

    const isDuplicateInRows = rows.some(r => r.moNumber === form.moNumber && r.id !== editId);
    if (isDuplicateInRows) {
      setError(`MO Number '${form.moNumber}' is already in the pending plan list below.`);
      return;
    }

    try {
      const existingMOs = await api.getMOs({ moNumber: form.moNumber });
      const exactMatch = existingMOs.find(m => m.moNumber === form.moNumber);
      if (exactMatch) {
        setError(`MO Number '${form.moNumber}' is already taken in the database.`);
        return;
      }
    } catch (e) { console.error(e); }

    setError('');
    
    // Apply overrides to components
    const finalComponents = derived.components.map(c => {
      const val = form.overrides[c.name];
      return {
        ...c,
        targetQty: c.expectedQty * parseInt(form.qty),
        collectedQty: val !== undefined && val !== '' ? parseInt(val) : (c.expectedQty * parseInt(form.qty)),
        completedQty: 0
      };
    });

    const newRow = {
      id: editId || Date.now().toString(),
      planDate,
      refer: form.refer,
      moNumber: form.moNumber,
      type: form.type,
      size: form.size,
      sku: form.size, // for backward compatibility
      od: form.type,  // for backward compatibility
      qty: parseInt(form.qty),
      components: finalComponents
    };

    if (editId) {
      setRows(rows.map(r => r.id === editId ? newRow : r));
      setEditId(null);
    } else {
      setRows([...rows, newRow]);
    }
    setForm(EMPTY_FORM);
  };

  const handleEdit = (row) => {
    const overrides = {};
    row.components.forEach(c => {
      overrides[c.name] = c.collectedQty;
    });
    setForm({ 
      refer: row.refer || '', 
      moNumber: row.moNumber || '', 
      type: row.type || row.od || '', 
      size: row.size || row.sku || '', 
      qty: row.qty || '',
      overrides
    });
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => setRows(rows.filter(r => r.id !== id));

  const handleRowsExtracted = useCallback(async (scannedRows) => {
    if (!scannedRows.length) return;
    setScanLoading(true);
    try {
      const resolved = await Promise.all(
        scannedRows.map(async (r) => {
          let derivedComps = { components: [] };
          try {
            derivedComps = await api.parseSKU({ type: r.type, size: r.size, sku: r.size, refer: r.refer || 'o' });
          } catch {}
          
          return {
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            planDate,
            type: r.type,
            size: r.size,
            ...r,
            components: derivedComps.components.map(c => ({
              ...c,
              targetQty: c.expectedQty * parseInt(r.qty),
              collectedQty: c.expectedQty * parseInt(r.qty),
              completedQty: 0
            }))
          };
        })
      );
      setRows(prev => [...prev, ...resolved]);
    } finally {
      setScanLoading(false);
    }
  }, [planDate]);

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCsvLoading(true);
    try {
      let text = await file.text();
      text = text.replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { alert('CSV must have a header row + at least one data row.'); return; }
      
      const headerLine = lines[0];
      let delimiter = ',';
      if (headerLine.includes('\t')) delimiter = '\t';
      else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

      const parseLine = (line) => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      const colIdx = (names) => { for (const n of names) { const i = headers.indexOf(n); if (i !== -1) return i; } return -1; };
      const typeIdx  = colIdx(['type','od','outerdiameter']);
      const moIdx    = colIdx(['monumber','mo','order','id']);
      const sizeIdx  = colIdx(['size','sku','item','product']);
      const qtyIdx   = colIdx(['qty','quantity','target']);
      const referIdx = colIdx(['refer','ref']);

      if (sizeIdx === -1 || qtyIdx === -1 || moIdx === -1 || typeIdx === -1) {
        alert(`CSV must have columns for Type(OD), Size(SKU), MO Number, and QTY.\nDetected headers: ${parseLine(lines[0]).join(', ')}`);
        return;
      }

      const parsed = lines.slice(1).map(line => {
        const cols = parseLine(line);
        return {
          refer: referIdx !== -1 ? cols[referIdx] || 'o' : 'o',
          od:    cols[typeIdx] || '',
          type:  cols[typeIdx] || '',
          moNumber: cols[moIdx] || '',
          size:  cols[sizeIdx] || '',
          sku:   cols[sizeIdx] || '',
          qty:   cols[qtyIdx] || '0',
        };
      }).filter(r => r.size && r.moNumber && parseInt(r.qty) > 0);

      if (!parsed.length) { alert('No valid rows found in CSV.'); return; }
      await handleRowsExtracted(parsed);
    } catch (err) {
      alert('Failed to parse CSV: ' + err.message);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!rows.length) return;
    const bid = `BATCH-${Date.now()}`;
    onConfirm(rows.map(r => ({ ...r, submittedBy: user?.fullName, batchId: bid })), bid);
  };

  const totalQty = rows.reduce((s, r) => s + parseInt(r.qty || 0), 0);

  // Derive common components for Bulk Edit modal
  const allCompNames = Array.from(new Set(rows.flatMap(r => r.components.map(c => c.name))));

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>Plan Data Entry</span>
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
          {rows.length > 0 && (
            <button className="btn btn-primary" onClick={handleConfirm} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GlassIcon name="history" size={16} color="#ffffff" /> Confirm Plan ({rows.length})
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2>Plan Data Entry</h2>
          <p className="text-muted text-sm">Log new production items. Uses {config.bomMode ? 'dynamic BOM definitions' : 'Ring rules'} for component generation.</p>
        </div>

        {rows.length > 0 && (
          <div className="card" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <span className="text-sm font-semibold">{rows.length} row(s) pending</span>
            <span className="text-sm text-muted">Total QTY: <strong>{totalQty.toLocaleString()}</strong></span>
            <span className="text-sm text-muted">Unique Sizes: <strong>{new Set(rows.map(r => r.size)).size}</strong></span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GlassIcon name="plan" size={20} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>{editId ? 'Edit Row' : 'Add New Production Row'}</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowScanModal(true)} disabled={csvLoading || scanLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {scanLoading ? 'Processing...' : '🤖 AI Image Scan'}
                  </button>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: csvLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {csvLoading ? 'Processing...' : 'Upload CSV'}
                    <input type="file" accept=".csv" style={{ display: 'none' }} disabled={csvLoading || scanLoading} onChange={handleCsvUpload} />
                  </label>
                </div>
              </div>
              <div className="card-body">
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form onSubmit={handleAddRow}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 16 }}>
                    <div className="form-group">
                      <label>{config.bomMode ? 'Type (e.g. C2, Diesel)' : 'OD'}</label>
                      <input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Size / SKU</label>
                      <input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>MO Number</label>
                      <input value={form.moNumber} onChange={e => setForm({ ...form, moNumber: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>QTY</label>
                      <input type="number" min="1" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Refer</label>
                      <input value={form.refer} onChange={e => setForm({ ...form, refer: e.target.value })} placeholder="Reference" />
                    </div>
                  </div>

                  {editId && (
                    <div style={{ marginTop: 10, marginBottom: 20, padding: 12, background: '#eff6ff', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                      <div style={{ gridColumn: '1 / -1', fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>Collected Quantities Override</div>
                      {derived.components.map(c => (
                        <div key={c.name} className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ color: '#3b82f6', fontSize: 11 }}>{c.name}</label>
                          <input 
                            type="number" min="0" 
                            placeholder={c.expectedQty * parseInt(form.qty || 0)}
                            value={form.overrides[c.name] !== undefined ? form.overrides[c.name] : ''} 
                            onChange={e => handleOverrideChange(c.name, e.target.value)} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary">
                      {editId ? 'Save Changes' : 'Add Row'}
                    </button>
                    {editId && (
                      <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Pending Plan Items</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {selectedIds.length > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowBulkModal(true)} style={{ background: '#4f46e5', border: 'none' }}>
                      Bulk Edit ({selectedIds.length})
                    </button>
                  )}
                  <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px' }} />
                </div>
              </div>
              {rows.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: 40 }}>No rows added yet.</div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 1000 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.length === rows.length} onChange={toggleSelectAll} /></th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>MO Number</th>
                        <th>Size</th>
                        <th>QTY</th>
                        <th>Components Generated</th>
                        <th style={{ width: 80 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.id} style={{ background: editId === row.id ? '#eff6ff' : '' }}>
                          <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{row.planDate}</td>
                          <td>{row.type}</td>
                          <td style={{ fontWeight: 600, color: '#2563eb' }}>{row.moNumber}</td>
                          <td><span className="badge badge-primary">{row.size}</span></td>
                          <td style={{ fontWeight: 600 }}>{row.qty}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {row.components.map(c => (
                                <span key={c.name} style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                  {c.name}: <strong>{c.collectedQty}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="td-actions">
                              <button className="btn-icon" onClick={() => handleEdit(row)}><GlassIcon name="edit" size={16} color="#2563eb" /></button>
                              <button className="btn-icon danger" onClick={() => handleDelete(row.id)}><GlassIcon name="delete" size={16} color="#dc2626" /></button>
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

          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassIcon name="settings" size={20} color="#111827" /> BOM Requirements
              </h3>
              {parsing && <span className="spinner" />}
            </div>
            <div className="card-body">
              {!form.size ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>Enter Type and Size to see BOM details.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {derived.components.map(c => (
                    <div key={c.name} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 2 }}>{c.category.toUpperCase()}</div>
                      <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>Required: <strong>x{c.expectedQty}</strong></div>
                    </div>
                  ))}
                  {derived.components.length === 0 && (
                    <div className="alert alert-warning text-sm">No BOM matched for {form.type} {form.size}.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBulkModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <h3>Bulk Edit Collected Quantities</h3>
                <button className="btn-icon" onClick={() => setShowBulkModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {allCompNames.map(c => (
                  <div key={c} className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 11, color: '#4b5563' }}>{c}</label>
                    <input 
                      type="number" min="0" 
                      placeholder="Leave blank to skip" 
                      value={bulkForm[c] ?? ''} 
                      onChange={(e) => setBulkForm(p => ({ ...p, [c]: e.target.value }))} 
                    />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleBulkSave}>Apply to {selectedIds.length} Rows</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showScanModal && (
        <ImageScanModal 
          onClose={() => setShowScanModal(false)}
          onRowsExtracted={handleRowsExtracted}
        />
      )}
    </div>
  );
}
