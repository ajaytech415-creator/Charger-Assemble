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

  const openingMOs     = startDT ? allMOs.filter(e     => isBeforeStart(e.createdAt))   : [];
  const openingScrap   = startDT ? allScrap.filter(e   => isBeforeStart(e.submittedAt)) : [];
  const openingReturns = startDT ? allReturns.filter(e => isBeforeStart(e.returnedAt))  : [];
  const openingReworks = startDT ? allReworks.filter(e => isBeforeStart(e.submittedAt)) : [];

  const periodMOs     = startDT ? allMOs.filter(e     => inPeriod(e.createdAt))   : allMOs;
  const periodScrap   = startDT ? allScrap.filter(e   => inPeriod(e.submittedAt)) : allScrap;
  const periodReturns = startDT ? allReturns.filter(e => inPeriod(e.returnedAt))  : allReturns;
  const periodReworks = startDT ? allReworks.filter(e => inPeriod(e.submittedAt)) : allReworks;

  const calcStats = (name, category, mos, scrap, returns, reworks) => {
    let IN = 0, RC = 0, RJ = 0, RT = 0, OUT = 0;

    mos.forEach(e => {
      if (e.components) {
        const c = e.components.find(comp => comp.category === category && comp.name === name);
        if (c) {
          IN += c.collectedQty || 0;
          OUT += c.completedQty || 0;
        }
      }
    });

    scrap.forEach(e => {
      if (e.component === category && e.componentName === name) {
        RC += e.receive || 0;
        RJ += e.reject  || 0;
      }
    });

    (reworks || []).forEach(e => {
      if (e.component === category && e.componentName === name) {
        RC += e.receive || 0;
        RJ += e.reject  || 0;
      }
    });

    returns.forEach(e => {
      const mo = allMOs.find(m => m.id === e.moId);
      if (mo && mo.components) {
        const c = mo.components.find(comp => comp.category === category && comp.name === name);
        if (c) {
          if (e.isFullMO) {
            RT += c.collectedQty || 0;
          } else if (e.component === category) {
            RT += e.componentQty || 0;
          }
        }
      }
    });

    const WIP = (IN + RC) - (RJ + OUT);
    return { IN, RC, RJ, RT, OUT, WIP };
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
      const opening = calcStats(name, cat.key, openingMOs, openingScrap, openingReturns, openingReworks);
      const period = calcStats(name, cat.key, periodMOs, periodScrap, periodReturns, periodReworks);
      
      const openingWIP = opening.WIP;
      const closingWIP = openingWIP + period.WIP;

      grandOpeningWIP += openingWIP;
      grandIN  += period.IN;
      grandRC  += period.RC;
      grandRJ  += period.RJ;
      grandRT  += period.RT;
      grandOUT += period.OUT;
      grandClosingWIP += closingWIP;

      wsData.push([
        name,
        openingWIP,
        period.IN,
        period.RC,
        period.RJ,
        period.RT,
        period.OUT,
        closingWIP,
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
