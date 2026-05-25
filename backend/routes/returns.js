import db, { randomUUID } from '../db.js';

// GET /api/returns
export const getReturnEntries = (req, res) => {
  const { moNumber, startDate, endDate } = req.query;
  let entries = [...(db.data.returnEntries || [])];

  if (moNumber) {
    const q = moNumber.toLowerCase();
    entries = entries.filter(e => (e.moNumber || '').toLowerCase().includes(q));
  }
  if (startDate && endDate) {
    entries = entries.filter(e => {
      const d = (e.returnedAt || '').split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }

  // Attach MO details including per-component quantities
  entries = entries.map(e => {
    const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
    return {
      ...e,
      moDetails: mo ? {
        qty: mo.qty,
        components: mo.components || []
      } : null
    };
  });

  entries.sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));
  res.json(entries);
};

// POST /api/returns
// body: { moId, moNumber, sku, returnType, component, componentQty, isFullMO, submittedBy }
export const createReturnEntry = async (req, res) => {
  const { moId, moNumber, sku, returnType, component, componentQty, isFullMO, submittedBy } = req.body;
  if (!moId || !moNumber) return res.status(400).json({ message: 'moId and moNumber are required' });

  const now = new Date().toISOString();
  if (!db.data.returnEntries) db.data.returnEntries = [];

  const entry = {
    id: randomUUID(),
    moId,
    moNumber,
    sku: sku || '',
    returnType: returnType || 'Component', // 'FullMO' | 'Component'
    component: component || '',            // 'Battery' | 'PCBA' | 'Coil' | 'Shell'
    componentQty: parseInt(componentQty) || 0,
    isFullMO: !!isFullMO,
    returnedAt: now,
    submittedBy: submittedBy || 'Unknown',
    status: 'Returned',
  };

  db.data.returnEntries.push(entry);

  // Apply physical reduction to the MO collected quantities
  const mo = db.data.moEntries.find(e => e.id === moId);
  if (mo) {
    if (isFullMO) {
      mo.qty = Math.max(0, (mo.qty || 0) - entry.componentQty);
      if (mo.components) {
        mo.components.forEach(c => {
          c.collectedQty = Math.max(0, (c.collectedQty || 0) - entry.componentQty);
        });
      }
      
      if (mo.qty === 0) {
        mo.status = 'Returned';
        mo.returnedAt = now;
      }
    } else if (component) {
      // Partial component return — reduce collected quantity of that specific component
      if (mo.components) {
        const c = mo.components.find(comp => comp.category === component);
        if (c) {
          c.collectedQty = Math.max(0, (c.collectedQty || 0) - entry.componentQty);
        }
      }
      
      // Store which components were returned for historical visibility
      if (!mo.pendingReturns) mo.pendingReturns = [];
      mo.pendingReturns.push({ component, qty: entry.componentQty, returnedAt: now });
    }
  }

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Return: MO ${moNumber} — ${isFullMO ? `Full MO return (${entry.componentQty})` : `${component} component returned (${componentQty})`}`,
    user: submittedBy,
    time: now,
  });
  await db.write();
  res.json({ success: true, entry });
};

// DELETE /api/returns/:id
export const deleteReturnEntry = async (req, res) => {
  const { id } = req.params;
  if (!db.data.returnEntries) return res.status(404).json({ message: 'Not found' });
  const idx = db.data.returnEntries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Return entry not found' });
  db.data.returnEntries.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// PUT /api/returns/:id/replenish
export const replenishReturnEntry = async (req, res) => {
  const { id } = req.params;
  if (!db.data.returnEntries) return res.status(404).json({ message: 'Not found' });
  const entry = db.data.returnEntries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ message: 'Return entry not found' });

  entry.status = 'Replenished';
  entry.replenishedAt = new Date().toISOString();

  // If this was a component return, automatically refill the MO
  if (!entry.isFullMO && entry.component) {
    const mo = db.data.moEntries.find(m => m.id === entry.moId);
    if (mo && mo.components) {
      const c = mo.components.find(comp => comp.category === entry.component);
      // Restore the quantity to the required amount
      if (c) {
        c.collectedQty = (c.collectedQty || 0) + (entry.componentQty || 0); // Give back the returned quantity
      }
    }
  }

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Return Replenished: MO ${entry.moNumber} — ${entry.isFullMO ? 'Full MO' : entry.component}`,
    user: req.body.submittedBy || 'User',
    time: entry.replenishedAt,
  });

  await db.write();
  res.json({ success: true, entry });
};
