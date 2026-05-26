import db from '../db.js';
import { getLocalDateStr, isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/stats?startDate=&endDate=&date=
export const getStats = (req, res) => {
  const { date, startDate, endDate } = req.query;
  const today = date || getLocalDateStr();

  // Apply date filter to MO entries
  let entries = db.data.moEntries || [];
  if (startDate && endDate) {
    entries = entries.filter(e => inLocalPeriod(e.createdAt, startDate, endDate));
  } else if (date) {
    entries = entries.filter(e => isSameLocalDay(e.createdAt, date));
  }

  // Scrap entries
  const scrap = db.data.scrapEntries || [];
  const filteredScrap = (startDate && endDate)
    ? scrap.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate))
    : date
      ? scrap.filter(e => isSameLocalDay(e.submittedAt, date))
      : scrap;

  // Return entries
  const returns = db.data.returnEntries || [];
  const filteredReturns = (startDate && endDate)
    ? returns.filter(e => inLocalPeriod(e.returnedAt, startDate, endDate))
    : date
      ? returns.filter(e => isSameLocalDay(e.returnedAt, date))
      : returns;

  // Rework entries
  const rework = db.data.reworkEntries || [];
  const filteredRework = (startDate && endDate)
    ? rework.filter(e => inLocalPeriod(e.submittedAt, startDate, endDate))
    : date
      ? rework.filter(e => isSameLocalDay(e.submittedAt, date))
      : rework;

  const incomeToday  = (db.data.moEntries || []).filter(e => isSameLocalDay(e.createdAt, today)).length;
  const outgoToday   = (db.data.moEntries || []).filter(e => isSameLocalDay(e.completedAt, today)).length;
  const totalMOs     = entries.length;
  const pendingMOs   = entries.filter(e => e.status === 'Pending').length;
  const completedMOs = entries.filter(e => e.status === 'Completed').length;
  const totalQtyPlanned   = entries.reduce((sum, e) => sum + (e.qty || 0), 0);
  const totalQtyCompleted = entries.reduce((sum, e) => sum + (e.completedQty || 0), 0);
  const totalUsers = db.data.users.length;

  const IN = entries.reduce((s, e) => {
    let moIn = 0;
    if (e.components) e.components.forEach(c => moIn += (c.collectedQty || 0));
    return s + moIn;
  }, 0);

  const RC = filteredScrap.reduce((s, e) => s + (e.receive || 0), 0) + filteredRework.reduce((s, e) => s + (e.receive || 0), 0);
  const RJ = filteredScrap.reduce((s, e) => s + (e.reject  || 0), 0) + filteredRework.reduce((s, e) => s + (e.reject  || 0), 0);

  const RT = filteredReturns.reduce((s, e) => {
    if (e.isFullMO) {
      const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
      if (!mo || !mo.components) return s;
      let moRt = 0;
      mo.components.forEach(c => moRt += (c.collectedQty || 0));
      return s + moRt;
    }
    return s + (e.componentQty || 0);
  }, 0);

  const OUT = entries
    .filter(e => e.status === 'Completed')
    .reduce((s, e) => {
      let moOut = 0;
      if (e.components) e.components.forEach(c => moOut += (c.completedQty || 0));
      return s + moOut;
    }, 0);

  const WIP = (IN + RC) - (RJ + OUT);

  const breakdown = {};
  entries.forEach(e => {
    if (e.components) {
      const moQty = e.qty || 1;
      e.components.forEach(c => {
        const cat = c.category || 'other';
        if (!breakdown[cat]) breakdown[cat] = {};
        // Count component qty × MO qty; fall back to planned if completedQty not yet set
        const amount = (c.completedQty || 0) > 0
          ? c.completedQty
          : (c.qty || 1) * moQty;
        breakdown[cat][c.name] = (breakdown[cat][c.name] || 0) + amount;
      });
    }
  });

  const toArray = obj => Object.entries(obj).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
  const formattedBreakdown = {};
  for (const cat in breakdown) {
    formattedBreakdown[cat] = toArray(breakdown[cat]);
  }

  // Weekly chart (last 7 days — always uses full dataset)
  const allEntries = db.data.moEntries || [];
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr   = getLocalDateStr(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyData.push({
      day:       dayLabel,
      income:    allEntries.filter(e => isSameLocalDay(e.createdAt, dayStr)).length,
      completed: allEntries.filter(e => isSameLocalDay(e.completedAt, dayStr)).length,
    });
  }

  const scrapTodayCount = (db.data.scrapEntries || []).filter(e => isSameLocalDay(e.submittedAt, today)).length;
  const scrapTodayQty = (db.data.scrapEntries || []).filter(e => isSameLocalDay(e.submittedAt, today)).reduce((sum, e) => sum + (e.receive || 0) + (e.reject || 0), 0);

  res.json({
    incomeToday, outgoToday, totalMOs, pendingMOs, completedMOs,
    totalQtyPlanned, totalQtyCompleted,
    balanceQty: totalQtyPlanned - totalQtyCompleted,
    scrapToday: scrapTodayCount,
    totalUsers, weeklyData,
    recentLogs: db.data.auditLogs.slice(0, 5),
    users: db.data.users.map(u => ({ id: u.id, fullName: u.fullName, role: u.role })),
    // WIP
    wip: { IN, RC, RJ, RT, OUT, WIP },
    // Material breakdown
    breakdown: formattedBreakdown,
  });
};

// GET /api/stats/report?startDate=&endDate=
export const getReport = (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });

  // Helper for proper Date comparisons
  const parseStart = (s) => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s) : null;
  const parseEnd = (s) => s ? new Date(s.length === 10 ? s + 'T23:59:59' : s) : null;
  const startDT = parseStart(startDate);
  const endDT = parseEnd(endDate);

  const inPeriod = (dateStr) => {
    if (!startDT || !endDT) return true;
    const d = new Date(dateStr || '');
    return d >= startDT && d <= endDT;
  };

  // Filter entries exactly by the datetime range
  const moEntries = (db.data.moEntries || []).filter(e => inPeriod(e.createdAt));
  const scrapEntries = (db.data.scrapEntries || []).filter(e => inPeriod(e.submittedAt));
  const returnEntries = (db.data.returnEntries || []).filter(e => inPeriod(e.returnedAt));
  const reworkEntries = (db.data.reworkEntries || []).filter(e => inPeriod(e.submittedAt));

  const totalMOs = moEntries.length;
  const pendingMOs = moEntries.filter(e => e.status === 'Pending').length;
  const completedMOs = moEntries.filter(e => e.status === 'Completed').length;
  const totalQtyPlanned = moEntries.reduce((sum, e) => sum + (e.qty || 0), 0);
  const totalQtyCompleted = moEntries.reduce((sum, e) => sum + (e.completedQty || 0), 0);

  // Initialize ALL components
  const comps = db.data.components || {};
  const detailed = {};
  
  for (const cat in comps) {
    detailed[cat] = (comps[cat] || []).map(c => ({
      name: typeof c === 'string' ? c : c.name,
      in: 0, received: 0, reject: 0, return: 0, out: 0
    }));
  }

  const findAndAdd = (cat, name, field, val) => {
    if (!name || !cat) return;
    if (!detailed[cat]) detailed[cat] = [];
    let item = detailed[cat].find(c => c.name === name);
    if (!item) {
      item = { name, in: 0, received: 0, reject: 0, return: 0, out: 0 };
      detailed[cat].push(item);
    }
    item[field] += (val || 0);
  };

  // 1. MO Entries (IN & OUT)
  moEntries.forEach(e => {
    if (e.components) {
      e.components.forEach(c => {
        findAndAdd(c.category, c.name, 'in', c.collectedQty || 0);
        if (e.status === 'Completed') {
          findAndAdd(c.category, c.name, 'out', c.completedQty || 0);
        }
      });
    }
  });

  // 2. Scrap & Rework Entries (Received & Reject)
  scrapEntries.forEach(e => {
    if (e.component && e.componentName) {
      findAndAdd(e.component, e.componentName, 'received', e.receive || 0);
      findAndAdd(e.component, e.componentName, 'reject',   e.reject  || 0);
    }
  });

  reworkEntries.forEach(e => {
    if (e.component && e.componentName) {
      findAndAdd(e.component, e.componentName, 'received', e.receive || 0);
      findAndAdd(e.component, e.componentName, 'reject',   e.reject  || 0);
    }
  });

  // 3. Return Entries (Return)
  returnEntries.forEach(e => {
    const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
    if (!mo || !mo.components) return;
    
    if (e.isFullMO) {
      mo.components.forEach(c => {
        findAndAdd(c.category, c.name, 'return', c.collectedQty || 0);
      });
    } else if (e.component) {
      // Find the specific component
      const c = mo.components.find(c => c.category === e.component);
      if (c) {
         findAndAdd(e.component, c.name, 'return', e.componentQty || 0);
      }
    }
  });

  res.json({
    period: { start: startDate, end: endDate },
    summary: { totalMOs, pendingMOs, completedMOs, totalQtyPlanned, totalQtyCompleted },
    detailed
  });
};
