const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000') + '/api';

// Helper to read stored session (works for both remember-me and session-only logins)
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('mfg_auth_session')) || JSON.parse(sessionStorage.getItem('mfg_auth_session')) || null;
  } catch { return null; }
};

const req = async (url, opts = {}) => {
  try {
    const storedUser = getStoredUser();
    const authHeaders = storedUser
      ? { 'x-user-role': storedUser.role || 'user', 'x-user-id': storedUser.id || '' }
      : {};
    const res = await fetch(`${API}${url}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...opts.headers },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      // If not JSON, it might be an error page or raw text
      const text = await res.text();
      let errorMsg = text;
      if (text && text.trim().startsWith('<')) {
        errorMsg = 'A server error occurred, but the server returned HTML instead of a valid response. Please contact support.';
      }
      if (!res.ok) throw new Error(errorMsg || `Server error: ${res.status}`);
      return text;
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // Specifically handle 'Failed to fetch' which usually means the server is down
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      console.error('Network Error: Could not connect to API at', API);
      throw new Error(`Network Error: Could not connect to API. Please check your internet connection or API server status. (Trying to reach: ${API})`);
    }
    throw err;
  }
};

export const api = {
  login: (body) => req('/auth/login', { method: 'POST', body }),
  getConfig: () => req('/admin/config'),
  updateConfig: (body) => req('/admin/config', { method: 'POST', body }),
  getMOs: (params = {}) => req('/mos?' + new URLSearchParams(params).toString()),
  createMO: (body) => req('/mos', { method: 'POST', body }),
  createMOBulk: (body) => req('/mos/bulk', { method: 'POST', body }),
  updateMO: (id, body) => req(`/mos/${id}`, { method: 'PUT', body }),
  deleteMO: (id) => req(`/mos/${id}`, { method: 'DELETE' }),
  parseSKU: (body) => req('/mos/parse-sku', { method: 'POST', body }),
  getBoms: () => req('/boms'),
  createBom: (body) => req('/boms', { method: 'POST', body }),
  updateBom: (id, body) => req(`/boms/${id}`, { method: 'PUT', body }),
  deleteBom: (id) => req(`/boms/${id}`, { method: 'DELETE' }),
  getStats: (params = {}) => req('/stats?' + new URLSearchParams(params).toString()),
  getReport: (params = {}) => req('/stats/report?' + new URLSearchParams(params).toString()),
  getUsers: () => req('/admin/users'),
  createUser: (body) => req('/admin/users', { method: 'POST', body }),
  updateUser: (id, body) => req(`/admin/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => req(`/admin/users/${id}`, { method: 'DELETE' }),
  getComponents: () => req('/admin/components'),
  manageComponent: (body) => req('/admin/components/manage', { method: 'POST', body }),
  getAudit: (params = {}) => req('/admin/audit?' + new URLSearchParams(params).toString()),
  deleteAuditLogs: (params) => req('/admin/audit?' + new URLSearchParams(params).toString(), { method: 'DELETE' }),
  getScrap: (params = {}) => req('/scrap?' + new URLSearchParams(params).toString()),
  createScrap: (body) => req('/scrap', { method: 'POST', body }),
  updateScrap: (id, body) => req(`/scrap/${id}`, { method: 'PUT', body }),
  deleteScrap: (id) => req(`/scrap/${id}`, { method: 'DELETE' }),
  exportScrapUrl: (params = {}) => `${API}/scrap/export?${new URLSearchParams(params).toString()}`,
  getReturns: (params = {}) => req('/returns?' + new URLSearchParams(params).toString()),
  createReturn: (body) => req('/returns', { method: 'POST', body }),
  deleteReturn: (id) => req(`/returns/${id}`, { method: 'DELETE' }),
  replenishReturn: (id, body) => req(`/returns/${id}/replenish`, { method: 'PUT', body }),
  bulkDbAction: (body) => req('/admin/db/action', { method: 'POST', body }),
  getTrash: () => req('/admin/trash'),
  bulkTrashAction: (body) => req('/admin/trash/action', { method: 'POST', body }),
  wipeAll: (body) => req('/admin/wipe-all', { method: 'POST', body }),
  getRework: (params = {}) => req('/rework?' + new URLSearchParams(params).toString()),
  createRework: (body) => req('/rework', { method: 'POST', body }),
  updateRework: (id, body) => req(`/rework/${id}`, { method: 'PUT', body }),
  deleteRework: (id) => req(`/rework/${id}`, { method: 'DELETE' }),
  exportReworkUrl: (params = {}) => `${API}/rework/export?${new URLSearchParams(params).toString()}`,
  getRnd: (params = {}) => req('/rnd/entries?' + new URLSearchParams(params).toString()),
  createRndEntry: (body) => req('/rnd/entries', { method: 'POST', body }),
  updateRndEntry: (id, body) => req(`/rnd/entries/${id}`, { method: 'PUT', body }),
  deleteRndEntry: (id, body) => req(`/rnd/entries/${id}`, { method: 'DELETE', body }),
  getRndProducts: () => req('/rnd/products'),
  createRndProduct: (body) => req('/rnd/products', { method: 'POST', body }),
  updateRndProduct: (id, body) => req(`/rnd/products/${id}`, { method: 'PUT', body }),
  deleteRndProduct: (id) => req(`/rnd/products/${id}`, { method: 'DELETE' }),
  exportRndUrl: (params = {}) => `${API}/rnd/export?${new URLSearchParams(params).toString()}`,
  exportWipUrl: (params = {}) => `${API}/stats/wip-excel?${new URLSearchParams(params).toString()}`,
  exportBackupUrl: () => `${API}/admin/backup`,
  syncMay: () => req('/admin/sync-may'),
};
