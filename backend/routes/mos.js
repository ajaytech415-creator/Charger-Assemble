import db, { randomUUID } from '../db.js';
import { isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

const resolveBomComponentName = (comp, size, type) => {
  if (!comp.useSize) return comp.name;
  
  let num = size.replace(/[^0-9]/g, '');
  if (num.length === 1) num = '0' + num;
  const t = (type || '').toUpperCase();
  let baseName = comp.name;
  
  // Clean off trailing size indicators from the base component name to prevent duplicates
  // e.g., if they added "CHARGER TOP SIZE-05" but checked useSize, strip it
  baseName = baseName.replace(/\s+SIZE-\d+$/i, '').replace(/\s+S\d+$/i, '');
  
  // Dynamically prepend the type (e.g. C2, LUX) if the component is generic (e.g. just "CHARGER TOP")
  // and doesn't already contain the type prefix.
  if (!baseName.toUpperCase().includes(t) && t !== '') {
    baseName = `${t} ${baseName}`;
  }

  // LUX and DIESEL product lines use the 'S05' format uniformly
  if (baseName.includes('DIESEL') || baseName.includes('LUX')) {
    return `${baseName} S${num}`;
  }
  
  // Standard product lines (C2, C3, CX) use 'SIZE-05'
  return `${baseName} SIZE-${num}`;
};

// SKU/Type Parser Engine (Strict BOM Mode)
const parseSKU = (sku, refer, config, type, size) => {
  const bomType = type || 'C2';
  const bomSize = size || 'S05';
  
  // Find matching BOM
  const boms = db.data.boms || [];
  const bom = boms.find(b => b.types.includes(bomType));
  
  const components = [];
  
  if (bom) {
    for (const comp of bom.components) {
      // Special logic for DC Tape
      if (comp.name === 'D.C TAPE 10x8' && bomType === 'C2') {
        const num = parseInt(bomSize.replace(/[^0-9]/g, ''), 10);
        if (num < 6) continue; // Only sizes 06-14 get it
      }
      components.push({
        category: comp.category,
        name: resolveBomComponentName(comp, bomSize, bomType),
        expectedQty: comp.qty,
        collectedQty: 0
      });
    }
  }
  
  return { components, isBomMode: true, isProRing: false };
};

// GET /api/mos
export const getMOs = (req, res) => {
  const { date, status, startDate, endDate, moNumber, planDate, planDateStart, planDateEnd, isRework } = req.query;
  let entries = [...db.data.moEntries];

  if (isRework === 'true') {
    entries = entries.filter(e => e.isRework);
  } else if (isRework === 'false') {
    entries = entries.filter(e => !e.isRework);
  }

  if (status && status !== 'all') {
    entries = entries.filter(e => e.status === status);
  } else if (!status && !moNumber) {
    entries = entries.filter(e => e.status !== 'Returned');
  }

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => {
      const m = (e.moNumber || '').toLowerCase();
      return m.includes(q) || m.slice(-4).includes(q) || m.slice(-3).includes(q);
    });
  }
  if (date) entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
  
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
  }

  if (planDate) entries = entries.filter(e => (e.planDate || '') === planDate);
  if (planDateStart && planDateEnd) entries = entries.filter(e => (e.planDate || '') >= planDateStart && (e.planDate || '') <= planDateEnd);
  else if (planDateStart) entries = entries.filter(e => (e.planDate || '') >= planDateStart);
  else if (planDateEnd) entries = entries.filter(e => (e.planDate || '') <= planDateEnd);

  entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(entries);
};

// POST /api/mos
export const createMO = async (req, res) => {
  const { type, size, sku, refer, moNumber, qty, od, submittedBy, batchId, planDate, componentsOverrides, isRework } = req.body;
  if (!qty) return res.status(400).json({ message: 'QTY is required' });

  if (!isRework && moNumber && db.data.moEntries.some(e => e.moNumber === moNumber)) {
    return res.status(409).json({ message: `MO Number '${moNumber}' is already taken.` });
  }

  const derived = parseSKU(sku || '', refer || '', db.data.config, type, size);
  
  const entry = {
    id: randomUUID(),
    type: type || '',
    size: size || '',
    sku: (sku || '').toUpperCase(),
    refer: refer || '',
    od: od || '',
    moNumber: moNumber || '',
    qty: parseInt(qty),
    planDate: planDate || '',
    components: derived.components.map(c => {
      // Allow overrides during creation
      const override = componentsOverrides?.find(o => o.name === c.name);
      return {
        ...c,
        targetQty: c.expectedQty * parseInt(qty),
        collectedQty: override && override.collectedQty !== undefined ? parseInt(override.collectedQty) : (c.expectedQty * parseInt(qty)),
        completedQty: 0
      };
    }),
    isProRing: derived.isProRing || false,
    isRework: !!isRework,
    status: 'Pending',
    batchId: batchId || `BATCH-${Date.now()}`,
    submittedBy: submittedBy || 'Unknown',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  db.data.moEntries.push(entry);

  // Auto-register components
  const ensureComponent = (category, value) => {
    if (!value || value === 'Unknown' || value === 'N/A') return;
    if (!db.data.components) db.data.components = {};
    if (!db.data.components[category]) db.data.components[category] = [];
    const exists = db.data.components[category].some(c => (typeof c === 'string' ? c === value : c.name === value));
    if (!exists) db.data.components[category].push({ id: randomUUID().split('-')[0], name: value, status: 'Active' });
  };

  for (const c of entry.components) {
    ensureComponent(c.category, c.name);
  }

  db.data.auditLogs.unshift({ id: randomUUID(), action: `New MO created: ${moNumber}`, user: submittedBy, time: new Date().toISOString() });
  await db.write();
  res.json({ success: true, entry });
};

// POST /api/mos/bulk
export const createMOBulk = async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'Array of rows required' });
  }

  const batchId = rows[0].batchId || `BATCH-${Date.now()}`;
  const submittedBy = rows[0].submittedBy || 'Unknown';
  const entries = [];

  const ensureComponent = (category, value) => {
    if (!value || value === 'Unknown' || value === 'N/A') return;
    if (!db.data.components) db.data.components = {};
    if (!db.data.components[category]) db.data.components[category] = [];
    const exists = db.data.components[category].some(c => (typeof c === 'string' ? c === value : c.name === value));
    if (!exists) db.data.components[category].push({ id: randomUUID().split('-')[0], name: value, status: 'Active' });
  };

  for (const row of rows) {
    const { moNumber, planDate, type, size, refer, od, qty, components, overrides, isRework } = row;
    if (!moNumber || !planDate || !type || !size || !qty) continue;

    const entry = {
      id: randomUUID(),
      moNumber,
      planDate,
      type,
      size,
      refer: refer || 'o',
      od: od || type,
      qty: parseInt(qty),
      components: components || [],
      overrides: overrides || {},
      isRework: !!isRework,
      status: 'Pending',
      batchId,
      submittedBy,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    db.data.moEntries.push(entry);
    entries.push(entry);

    for (const c of entry.components) {
      ensureComponent(c.category, c.name);
    }
  }

  db.data.auditLogs.unshift({ 
    id: randomUUID(), 
    action: `Bulk created ${entries.length} MOs`, 
    user: submittedBy, 
    time: new Date().toISOString() 
  });

  await db.write();
  res.json({ success: true, count: entries.length, batchId });
};


// PUT /api/mos/:id
export const updateMO = async (req, res) => {
  const { id } = req.params;
  const { status, components, planDate, type, size, refer, od, qty, completedQty } = req.body;
  const entry = db.data.moEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'MO not found' });

  // Update primitive fields
  if (type !== undefined) entry.type = type;
  if (size !== undefined) entry.size = size;
  if (refer !== undefined) entry.refer = refer;
  if (od !== undefined) entry.od = od;
  if (planDate !== undefined) entry.planDate = planDate;
  if (qty !== undefined) entry.qty = parseInt(qty);
  if (completedQty !== undefined) entry.completedQty = parseInt(completedQty) || 0;

  if (status) {
    entry.status = status;
    if (status === 'Completed' && !entry.completedAt) entry.completedAt = new Date().toISOString();
    else if (status === 'Pending') entry.completedAt = null;
  }

  // Update dynamic components array
  if (components && Array.isArray(components)) {
    entry.components = components.map(c => {
      // Find old to check for replenish logic
      const oldComp = entry.components.find(oc => oc.name === c.name);
      const oldQty = oldComp ? oldComp.completedQty : 0; // Completed qty handles return checking
      
      // We also check for 'Return Replenished'
      if (c.completedQty > 0 && oldQty === 0 && c.completedQty === c.targetQty) {
        const ret = (db.data.returnEntries || []).find(r => r.moId === id && r.component === c.name && r.status === 'Pending Re-entry');
        if (ret) {
          ret.status = 'Replenished';
          ret.replenishedAt = new Date().toISOString();
          db.data.auditLogs.unshift({ id: randomUUID(), action: `Return Replenished: MO ${entry.moNumber} — ${c.name}`, user: req.body.submittedBy || 'Admin', time: new Date().toISOString() });
        }
      }

      return {
        category: c.category,
        name: c.name,
        expectedQty: c.expectedQty,
        targetQty: c.expectedQty * entry.qty,
        collectedQty: parseInt(c.collectedQty || 0),
        completedQty: parseInt(c.completedQty || 0)
      };
    });
  }

  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/mos/:id
export const deleteMO = async (req, res) => {
  const { id } = req.params;
  const idx = db.data.moEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'MO not found' });
  db.data.moEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// POST /api/mos/parse-sku (live preview)
export const parseSKUPreview = (req, res) => {
  const { sku, refer, type, size } = req.body;
  const result = parseSKU(sku, refer, db.data.config, type, size);
  res.json(result);
};
