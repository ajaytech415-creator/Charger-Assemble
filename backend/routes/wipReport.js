import db from '../db.js';
import XLSX from 'xlsx-js-style';

// GET /api/stats/wip-excel?startDate=&endDate=
export const generateWipExcelBuffer = (startDate, endDate) => {
  const allMOs     = db.data.moEntries    || [];
  const allScrap   = db.data.scrapEntries || [];
  const allReturns = db.data.returnEntries || [];
  const allReworks = db.data.reworkEntries || [];
  const comps      = db.data.components   || {};

  // ─── DateTime filter helpers ───────────────────────────────────────────────
  const parseStart = (s) => {
    if (!s) return null;
    return new Date(s.length === 10 ? s + 'T00:00:00' : s);
  };
  const parseEnd = (s) => {
    if (!s) return null;
    return new Date(s.length === 10 ? s + 'T23:59:59' : s);
  };

  const startDT = parseStart(startDate);
  const endDT   = parseEnd(endDate);

  const inPeriod = (dateStr) => {
    if (!startDT || !endDT) return true;
    const d = new Date(dateStr || '');
    if (isNaN(d)) return false;
    return d >= startDT && d <= endDT;
  };

  const isBeforeStart = (dateStr) => {
    if (!startDT || !dateStr) return false;
    return new Date(dateStr) < startDT;
  };

  const calcStats = (name, category) => {
    let openingIN = 0, openingRC = 0, openingRJ = 0, openingRT = 0, openingOUT = 0;
    let periodIN = 0, periodRC = 0, periodRJ = 0, periodRT = 0, periodOUT = 0;

    // MOs: IN = creation time, OUT = completion time
    allMOs.forEach(e => {
      if (e.components) {
        const c = e.components.find(comp => comp.category === category && comp.name === name);
        if (c) {
          const inDT = new Date(e.createdAt);
          if (!startDT || inDT < startDT) {
            openingIN += c.collectedQty || 0;
          } else if (inDT >= startDT && (!endDT || inDT <= endDT)) {
            periodIN += c.collectedQty || 0;
          }

          // If pending, fallback to createdAt so partials are historically credited
          const outDT = e.completedAt ? new Date(e.completedAt) : new Date(e.createdAt);
          if (!startDT || outDT < startDT) {
            openingOUT += c.completedQty || 0;
          } else if (outDT >= startDT && (!endDT || outDT <= endDT)) {
            periodOUT += c.completedQty || 0;
          }
        }
      }
    });

    // Scrap: RC and RJ
    allScrap.forEach(e => {
      if (e.component === category && e.componentName === name) {
        const scrapDT = new Date(e.submittedAt);
        if (!startDT || scrapDT < startDT) {
          openingRC += e.receive || 0;
          openingRJ += e.reject  || 0;
        } else if (scrapDT >= startDT && (!endDT || scrapDT <= endDT)) {
          periodRC += e.receive || 0;
          periodRJ += e.reject  || 0;
        }
      }
    });

    // Rework: RC and RJ
    allReworks.forEach(e => {
      if (e.component === category && e.componentName === name) {
        const reworkDT = new Date(e.submittedAt);
        if (!startDT || reworkDT < startDT) {
          openingRC += e.receive || 0;
          openingRJ += e.reject  || 0;
        } else if (reworkDT >= startDT && (!endDT || reworkDT <= endDT)) {
          periodRC += e.receive || 0;
          periodRJ += e.reject  || 0;
        }
      }
    });

    // Returns: RT
    allReturns.forEach(e => {
      const mo = allMOs.find(m => m.id === e.moId);
      if (mo && mo.components) {
        const c = mo.components.find(comp => comp.category === category && comp.name === name);
        if (c) {
          let rtAmt = 0;
          if (e.isFullMO) {
            rtAmt = c.collectedQty || 0;
          } else if (e.component === category || e.component === name) {
            rtAmt = e.componentQty || 0;
          }

          const retDT = new Date(e.returnedAt);
          if (!startDT || retDT < startDT) {
            openingRT += rtAmt;
          } else if (retDT >= startDT && (!endDT || retDT <= endDT)) {
            periodRT += rtAmt;
          }
        }
      }
    });

    const openingWIP = (openingIN + openingRC) - (openingRJ + openingOUT);
    const closingWIP = openingWIP + (periodIN + periodRC) - (periodRJ + periodOUT);

    return {
      openingWIP,
      periodIN, periodRC, periodRJ, periodRT, periodOUT,
      closingWIP
    };
  };

  const categories = Object.keys(comps).map(cat => ({ key: cat, label: cat }));

  const hasPeriod   = !!(startDate && endDate);
  const fmtDT = (s) => s ? s.replace('T', ' ') : '';
  const periodLabel = hasPeriod ? `${fmtDT(startDate)} to ${fmtDT(endDate)}` : 'All Time';

  const wsData = [];
  wsData.push(['UltraHuman Charger Assembly — WIP Material Report (Component-Wise)']);
  wsData.push([`Period: ${periodLabel}`]);
  wsData.push([`Formula: Closing WIP = Opening WIP + (IN + RC) − (RJ + OUT)  [IN is already net of RT]`]);
  wsData.push([]);

  wsData.push([
    'MATERIAL / PART DESCRIPTION',
    'Opening WIP',
    'IN (Period)',
    'RC (Period)',
    'RJ (Period)',
    'RT (Period)',
    'OUT (Period)',
    'Closing WIP',
  ]);

  let grandOpeningWIP = 0, grandIN = 0, grandRC = 0, grandRJ = 0, grandRT = 0, grandOUT = 0, grandClosingWIP = 0;

  categories.forEach(cat => {
    const materialList = comps[cat.key] || [];
    const names = materialList
      .map(m => (typeof m === 'string' ? m : m.name))
      .filter(Boolean);

    wsData.push([`— ${cat.label.toUpperCase()} —`]);

    names.forEach(name => {
      const stats = calcStats(name, cat.key);
      
      grandOpeningWIP += stats.openingWIP;
      grandIN  += stats.periodIN;
      grandRC  += stats.periodRC;
      grandRJ  += stats.periodRJ;
      grandRT  += stats.periodRT;
      grandOUT += stats.periodOUT;
      grandClosingWIP += stats.closingWIP;

      wsData.push([
        name,
        stats.openingWIP,
        stats.periodIN,
        stats.periodRC,
        stats.periodRJ,
        stats.periodRT,
        stats.periodOUT,
        stats.closingWIP,
      ]);
    });
  });

  wsData.push([]);
  wsData.push([
    '★ GRAND TOTAL (All Components)',
    grandOpeningWIP, grandIN, grandRC, grandRJ, grandRT, grandOUT, grandClosingWIP
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];

  ws['!freeze'] = { xSplit: 1, ySplit: 5 };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = ws[cellRef];
      if (!cell) continue;

      cell.s = {
        font: { name: 'Calibri', sz: 11 },
        alignment: { vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
          right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
      };

      const cellVal = String(cell.v || '');

      if (R === 0) {
        cell.s.font = { name: 'Calibri', sz: 18, bold: true, color: { rgb: '1E3A8A' } };
        cell.s.border = {};
      } else if (R === 1) {
        cell.s.font = { name: 'Calibri', sz: 12, color: { rgb: '6B7280' } };
        cell.s.border = {};
      } else if (R === 2) {
        cell.s.font = { name: 'Calibri', sz: 11, italic: true, color: { rgb: '059669' } };
        cell.s.border = {};
      } else if (R === 4) {
        cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '1D4ED8' } };
        cell.s.alignment = { vertical: 'center', horizontal: 'center' };
      } else if (cellVal.startsWith('— ')) {
        cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '991B1B' } };
        cell.s.fill = { fgColor: { rgb: 'FEE2E2' } };
        cell.s.alignment = { vertical: 'center', horizontal: 'left' };
      } else if (cellVal.startsWith('★')) {
        cell.s.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '064E3B' } };
        cell.s.alignment = { vertical: 'center', horizontal: C === 0 ? 'left' : 'center' };
      } else if (C > 0 && R > 4) {
        cell.s.alignment = { vertical: 'center', horizontal: 'center' };
        if ((C === 1 || C === 7) && typeof cell.v === 'number') {
          if (cell.v < 0) {
            cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'DC2626' } };
          } else if (cell.v === 0) {
            cell.s.font = { name: 'Calibri', sz: 11, color: { rgb: '6B7280' } };
          } else {
            cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '059669' } };
          }
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WIP Report');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const safeStart = startDate ? startDate.replace(/[T:]/g, '-') : '';
  const safeEnd = endDate ? endDate.replace(/[T:]/g, '-') : '';
  const filename = startDate && endDate
    ? `WIP_Report_${safeStart}_to_${safeEnd}.xlsx`
    : `WIP_Report_AllTime.xlsx`;

  return { buf, filename };
};

export const downloadWipExcel = (req, res) => {
  const { startDate, endDate } = req.query;
  const { buf, filename } = generateWipExcelBuffer(startDate, endDate);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};
