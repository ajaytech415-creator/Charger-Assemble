import db from '../db.js';
import { getLocalDateStr, isSameLocalDay, inLocalPeriod } from '../utils/dates.js';

// GET /api/stats?startDate=&endDate=&date=
export const getStats = (req, res) => {
  const { date, startDate, endDate, isRework } = req.query;
  const today = date || getLocalDateStr();

  // Apply date filter to MO entries
  let entries = db.data.moEntries || [];
  if (isRework === 'true') {
    entries = entries.filter(e => e.isRework);
  } else if (isRework === 'false') {
    entries = entries.filter(e => !e.isRework);
  }
  
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

  const allMOs = db.data.moEntries || [];
  const regularMOs = allMOs.filter(e => !e.isRework);
  const incomeToday  = (isRework === 'true' ? allMOs.filter(e => e.isRework) : regularMOs).filter(e => isSameLocalDay(e.createdAt, today)).length;
  const outgoToday   = (isRework === 'true' ? allMOs.filter(e => e.isRework) : regularMOs).filter(e => isSameLocalDay(e.completedAt, today)).length;
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
    .reduce((s, e) => {
      let moOut = 0;
      if (e.components) e.components.forEach(c => moOut += (c.completedQty || 0));
      return s + moOut;
    }, 0);

  let openingWIP = 0;
  if (startDate) {
    const isBeforeStartStr = (isoString) => {
      if (!isoString) return false;
      const start = new Date(startDate.length === 10 ? startDate + 'T00:00:00' : startDate);
      return new Date(isoString) < start;
    };
    
    let opIN = 0, opRC = 0, opRJ = 0, opOUT = 0;
    allMOs.forEach(e => {
      // Respect rework filter if applied
      if (isRework === 'true' && !e.isRework) return;
      if (isRework === 'false' && e.isRework) return;

      if (e.components) {
        e.components.forEach(c => {
          // IN: bucket by createdAt
          if (isBeforeStartStr(e.createdAt)) {
            opIN += (c.collectedQty || 0);
          }
          // OUT: bucket by completedAt (if pending, falls back to createdAt)
          const outTs = e.completedAt || e.createdAt;
          if (isBeforeStartStr(outTs)) {
            opOUT += (c.completedQty || 0);
          }
        });
      }
    });

    scrap.forEach(e => {
      if (isBeforeStartStr(e.submittedAt)) {
        opRC += (e.receive || 0);
        opRJ += (e.reject || 0);
      }
    });

    rework.forEach(e => {
      if (isBeforeStartStr(e.submittedAt)) {
        opRC += (e.receive || 0);
        opRJ += (e.reject || 0);
      }
    });

    openingWIP = (opIN + opRC) - (opRJ + opOUT);
  }

  const WIP = openingWIP + (IN + RC) - (RJ + OUT);

  const breakdown = {};
  entries.forEach(e => {
    if (e.components) {
      const moQty = e.qty || 1;
      e.components.forEach(c => {
        const cat = c.category || 'other';
        if (!breakdown[cat]) breakdown[cat] = {};
        // Use physically collected/issued quantity, else fall back to planned qty
        const amount = c.collectedQty !== undefined
          ? c.collectedQty
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
    wip: { opening: openingWIP, IN, RC, RJ, RT, OUT, WIP },
    // Material breakdown
    breakdown: formattedBreakdown,
  });
};

// GET /api/stats/report?startDate=&endDate=
export const getReport = (req, res) => {
  const { startDate, endDate, isRework } = req.query;
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

  // Initialize ALL components
  const comps = db.data.components || {};
  const detailed = {};
  
  for (const cat in comps) {
    detailed[cat] = (comps[cat] || []).map(c => ({
      name: typeof c === 'string' ? c : c.name,
      opening: 0, in: 0, received: 0, reject: 0, return: 0, out: 0, closing: 0
    }));
  }

  const findAndAdd = (cat, name, field, val) => {
    if (!name || !cat) return;
    if (!detailed[cat]) detailed[cat] = [];
    let item = detailed[cat].find(c => c.name === name);
    if (!item) {
      item = { name, opening: 0, in: 0, received: 0, reject: 0, return: 0, out: 0, closing: 0 };
      detailed[cat].push(item);
    }
    item[field] += (val || 0);
  };

  const isBeforeStart = (dateStr) => {
    if (!startDT || !dateStr) return false;
    return new Date(dateStr) < startDT;
  };

  const inPeriodDT = (dStr) => {
    if (!startDT || !endDT) return true;
    const d = new Date(dStr || '');
    return d >= startDT && d <= endDT;
  };

  // 1. MO Entries (IN & OUT)
  (db.data.moEntries || []).forEach(e => {
    if (isRework === 'true' && !e.isRework) return;
    if (isRework === 'false' && e.isRework) return;

    if (e.components) {
      e.components.forEach(c => {
        const inDT = new Date(e.createdAt);
        const outDT = e.completedAt ? new Date(e.completedAt) : new Date(e.createdAt);

        // IN
        if (isBeforeStart(inDT)) {
          findAndAdd(c.category, c.name, 'opening', c.collectedQty || 0);
        } else if (inPeriodDT(inDT)) {
          findAndAdd(c.category, c.name, 'in', c.collectedQty || 0);
        }

        // OUT
        if (isBeforeStart(outDT)) {
          findAndAdd(c.category, c.name, 'opening', -(c.completedQty || 0));
        } else if (inPeriodDT(outDT)) {
          findAndAdd(c.category, c.name, 'out', c.completedQty || 0);
        }
      });
    }
  });

  // 2. Scrap & Rework Entries (Received & Reject)
  (db.data.scrapEntries || []).forEach(e => {
    if (e.component && e.componentName) {
      const dt = new Date(e.submittedAt);
      if (isBeforeStart(dt)) {
        findAndAdd(e.component, e.componentName, 'opening', (e.receive || 0) - (e.reject || 0));
      } else if (inPeriodDT(dt)) {
        findAndAdd(e.component, e.componentName, 'received', e.receive || 0);
        findAndAdd(e.component, e.componentName, 'reject',   e.reject  || 0);
      }
    }
  });

  (db.data.reworkEntries || []).forEach(e => {
    if (e.component && e.componentName) {
      const dt = new Date(e.submittedAt);
      if (isBeforeStart(dt)) {
        findAndAdd(e.component, e.componentName, 'opening', (e.receive || 0) - (e.reject || 0));
      } else if (inPeriodDT(dt)) {
        findAndAdd(e.component, e.componentName, 'received', e.receive || 0);
        findAndAdd(e.component, e.componentName, 'reject',   e.reject  || 0);
      }
    }
  });

  // 3. Return Entries (Return)
  (db.data.returnEntries || []).forEach(e => {
    const dt = new Date(e.returnedAt);
    if (inPeriodDT(dt)) {
      const mo = (db.data.moEntries || []).find(m => m.id === e.moId);
      if (!mo || !mo.components) return;
      
      if (e.isFullMO) {
        mo.components.forEach(c => {
          findAndAdd(c.category, c.name, 'return', c.collectedQty || 0);
        });
      } else if (e.component) {
        // e.component here may be category or name, check against category first based on frontend expectations
        const c = mo.components.find(c => c.category === e.component || c.name === e.component);
        if (c) {
           findAndAdd(c.category, c.name, 'return', e.componentQty || 0);
        }
      }
    } else if (isBeforeStart(dt)) {
       // Returns before start technically don't impact WIP calculation directly since math is IN - RC - RJ - OUT
       // But keeping it consistent.
    }
  });

  // 4. Calculate Closing WIP
  for (const cat in detailed) {
    detailed[cat].forEach(item => {
      item.closing = item.opening + item.in + item.received - item.reject - item.out;
    });
  }

  res.json({
    period: { start: startDate, end: endDate },
    detailed
  });
};
