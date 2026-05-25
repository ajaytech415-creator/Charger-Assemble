import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

const BATTERIES = ['24mah battery', '32mah battery', '39mah battery', '24mah BATTERY (FOR RING PRO)', '32mah BATTERY (FOR RING PRO)'];
const PCBAS = ['Ring PCBA V1.60', 'Ring PCBA V1.61', 'Ring PCBA V1.62', 'Ring Pro PCBA'];

export default function AccessControls() {
  const [config, setConfig] = useState({ fixedBattery: '', fixedPCBA: '', autoMode: false, bomMode: false });
  const [form, setForm] = useState({ fixedBattery: '', fixedPCBA: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmBomToggle, setConfirmBomToggle] = useState(false);

  useEffect(() => {
    api.getConfig().then(data => {
      setConfig(data);
      setForm({ fixedBattery: data.fixedBattery, fixedPCBA: data.fixedPCBA });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess('');
    try {
      const updated = await api.updateConfig({ fixedBattery: form.fixedBattery, fixedPCBA: form.fixedPCBA });
      setConfig(updated.config);
      setSuccess('Access control settings applied successfully. All new data entries will now use these fixed values.');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleReset = () => { setForm({ fixedBattery: config.fixedBattery, fixedPCBA: config.fixedPCBA }); };

  const handleToggleMode = async () => {
    setToggling(true); setSuccess('');
    try {
      const newMode = !config.autoMode;
      const updated = await api.updateConfig({ autoMode: newMode });
      setConfig(updated.config);
      setSuccess(newMode
        ? '⚡ Auto-Battery Mode ENABLED. Fixed battery rule is now sleeping. Battery is derived from SKU size automatically.'
        : '🔒 Fixed Mode ENABLED. Auto-battery rule is now sleeping. Fixed battery/PCBA values are active.'
      );
    } catch (err) { console.error(err); }
    finally { setToggling(false); setConfirmToggle(false); }
  };

  const handleToggleBomMode = async () => {
    setToggling(true); setSuccess('');
    try {
      const newMode = !config.bomMode;
      const updated = await api.updateConfig({ bomMode: newMode });
      setConfig(updated.config);
      setSuccess(newMode
        ? '🛠️ BOM MODE ENABLED. All Derived Components logic is sleeping. Assembly flows use BOM data sets.'
        : '🛠️ BOM MODE DISABLED. System reverted to Derived Components logic.'
      );
    } catch (err) { console.error(err); }
    finally { setToggling(false); setConfirmBomToggle(false); }
  };

  const isAutoMode = config.autoMode;
  const isBomMode = config.bomMode;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Access Controls & Data Flow Modes</h2>
          <p className="text-muted text-sm">Define how the system derives components across data entry modules.</p>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 20 }} onClick={() => setSuccess('')}>
          <GlassIcon name="document" size={16} color="#16a34a" style={{ marginRight: 8 }} /> {success}
        </div>
      )}

      {/* BOM Mode Master Toggle Section */}
      <div className="card" style={{ marginBottom: 30, padding: 24, border: isBomMode ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: isBomMode ? '#1e3a8a' : '#111827' }}>
              <GlassIcon name="layers" size={24} color={isBomMode ? '#3b82f6' : '#6b7280'} /> BOM Data Flow Mode
            </h3>
            <p className="text-sm text-muted" style={{ marginTop: 8, maxWidth: 600, lineHeight: 1.5 }}>
              Enable this mode to switch data entry logic from hardcoded Ring rules to dynamic BOM (Bill of Materials) datasets. 
              When activated, the standard Derived Components logic (Fixed/Auto mode) is put to sleep.
            </p>
          </div>
          <button
            onClick={() => setConfirmBomToggle(true)}
            disabled={toggling || loading}
            className={`btn ${isBomMode ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 16 }}
          >
            {toggling ? <span className="spinner" /> : null}
            {isBomMode ? '🛠️ BOM MODE IS ACTIVE' : 'ACTIVATE BOM MODE'}
          </button>
        </div>
      </div>

      {/* Legacy Ring Derived Logic Section */}
      <div style={{ opacity: isBomMode ? 0.4 : 1, transition: 'opacity 0.3s', pointerEvents: isBomMode ? 'none' : 'auto' }}>
        <h3 style={{ marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>Legacy Derived Components Logic</h3>
        
        {isBomMode && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <strong>Sleeping:</strong> BOM Mode is active. The settings below are currently ignored by the data entry modules.
          </div>
        )}

        {/* Enable / Disable Toggle Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          {isAutoMode && !isBomMode && (
            <div style={{
              padding: '12px 20px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
              border: '1.5px solid #c4b5fd', borderRadius: 12, display: 'flex', gap: 14, flex: 1, marginRight: 20
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <div>
                <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14, marginBottom: 6 }}>Auto-Battery Mode is ACTIVE</div>
                <p className="text-sm" style={{ color: '#5b21b6', lineHeight: 1.6, margin: 0 }}>
                  Battery is derived from SKU automatically. Fixed Battery rule is sleeping.
                </p>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 'auto' }}>
            <button
              onClick={() => setConfirmToggle(true)}
              disabled={toggling || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 10, border: 'none',
                cursor: toggling ? 'not-allowed' : 'pointer',
                background: isAutoMode ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                color: 'white', fontWeight: 700, fontSize: 13.5,
              }}
            >
              <span style={{ fontSize: 18 }}>{isAutoMode ? '⚡' : '🔒'}</span>
              {toggling ? 'Switching...' : isAutoMode ? 'AUTO-BATTERY MODE ON' : 'FIXED MODE ON'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Main form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="shield" size={20} color={isAutoMode ? '#9ca3af' : '#2563eb'} /> Update Fixed Rules
                </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleApply}>
                  <div className="form-row" style={{ marginBottom: 20 }}>
                    <div className="form-group">
                      <label style={{ color: isAutoMode ? '#9ca3af' : '' }}>Fixed Battery Type</label>
                      <select value={form.fixedBattery} onChange={e => setForm({ ...form, fixedBattery: e.target.value })} disabled={isAutoMode}>
                        {BATTERIES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fixed PCBA Version</label>
                      <select value={form.fixedPCBA} onChange={e => setForm({ ...form, fixedPCBA: e.target.value })}>
                        {PCBAS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Applying...' : <><GlassIcon name="shield" size={16} color="#ffffff" style={{ marginRight: 8 }} /> Apply Fixed Rules</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Bom Toggle Modal */}
      {confirmBomToggle && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setConfirmBomToggle(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isBomMode ? 'Deactivate BOM Mode?' : 'Activate BOM Mode?'}
                </h3>
                <button className="btn-icon" onClick={() => setConfirmBomToggle(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {isBomMode ? (
                  <p className="text-sm text-muted">Are you sure you want to revert to the legacy Ring Derived Components logic? The BOM configurations will be ignored.</p>
                ) : (
                  <p className="text-sm text-muted">Activating BOM Mode will put the legacy Ring derived components logic (Auto/Fixed) to sleep. All assembly modules (Plan, Scrap, etc.) will dynamically render required components based on active BOM Data Sets (C2, C3, Diesel, etc.).</p>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmBomToggle(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleToggleBomMode} disabled={toggling}>
                  {toggling ? 'Applying...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirm Legacy Toggle Modal */}
      {confirmToggle && !isBomMode && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setConfirmToggle(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAutoMode ? '🔒 Switch to Fixed Mode?' : '⚡ Switch to Auto-Battery Mode?'}
                </h3>
                <button className="btn-icon" onClick={() => setConfirmToggle(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <p className="text-sm text-muted">Confirm toggle of legacy logic.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmToggle(false)}>Cancel</button>
                <button className={`btn ${isAutoMode ? 'btn-success' : 'btn-primary'}`} onClick={handleToggleMode} disabled={toggling}>
                  Confirm Toggle
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
