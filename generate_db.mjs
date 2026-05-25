import fs from 'fs';

const SIZES = ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14'];

const electronic = [
  { id: 'EL-1', name: 'C2 CHARGER PCBA', status: 'Active' },
  { id: 'EL-2', name: 'PRO CHARGER PCBA', status: 'Active' },
  { id: 'EL-3', name: 'C2 FTX COIL', status: 'Active' },
  { id: 'EL-4', name: 'C3 FTX COIL', status: 'Active' },
  { id: 'EL-5', name: '400 MAH BATTERY', status: 'Active' },
  { id: 'EL-6', name: '300 MAH BATTERY', status: 'Active' },
  { id: 'EL-7', name: 'MAGNET TOP 30 mm (TOP ENCLOSURE)', status: 'Active' },
  { id: 'EL-8', name: 'MAGNET MID (28.55 mm) MID PLASTIC', status: 'Active' },
  { id: 'EL-9', name: 'MAGNET MID (10 mm) MID PLASTIC', status: 'Active' },
  { id: 'EL-10', name: 'MAGNET COVER', status: 'Active' },
  { id: 'EL-11', name: 'POGO STOPPER', status: 'Active' },
  { id: 'EL-12', name: 'POGO PIN', status: 'Active' },
  { id: 'EL-13', name: 'HAPTIC BRACKET', status: 'Active' },
  { id: 'EL-14', name: 'SPEAKER ENCLOSURE', status: 'Active' }
];

const tapes = [
  { id: 'TA-1', name: 'FERRITE TAPE 10x8', status: 'Active' },
  { id: 'TA-2', name: 'D.C TAPE 10x8', status: 'Active' },
  { id: 'TA-3', name: 'BATTERY EVA TAPE', status: 'Active' },
  { id: 'TA-4', name: 'TESSA TAPE', status: 'Active' },
  { id: 'TA-5', name: 'HAPTIC SIDE TAPE', status: 'Active' },
  { id: 'TA-6', name: 'GORILLA GLUE', status: 'Active' }
];

const screws = [
  { id: 'SC-1', name: 'CHARGER SCREWS (M1.8x6, Head 3.3 mm)', status: 'Active' },
  { id: 'SC-2', name: 'WAFER HEAD SCREW (M2x2)', status: 'Active' },
  { id: 'SC-3', name: 'GRUB SCREW (M2x2)', status: 'Active' },
  { id: 'SC-4', name: 'SELF TAPPING SCREWS (M1.7x10)', status: 'Active' },
  { id: 'SC-5', name: 'HINGE SCREWS (M1.8x6, Head 3.3 mm)', status: 'Active' }
];

const housing = [
  { id: 'HS-1', name: 'TOP ENCLOSURE', status: 'Active' },
  { id: 'HS-2', name: 'BOTTOM ENCLOSURE', status: 'Active' },
  { id: 'HS-3', name: 'MID PLASTIC', status: 'Active' },
  { id: 'HS-4', name: 'BOTTOM PLASTIC', status: 'Active' },
  { id: 'HS-5', name: 'BUTTON', status: 'Active' },
  { id: 'HS-6', name: 'BUTTON BACKING', status: 'Active' },
  { id: 'HS-7', name: 'LIGHT GUIDE', status: 'Active' },
  { id: 'HS-8', name: 'ANTI SKID BOTTOM PAD', status: 'Active' },
  { id: 'HS-9', name: 'HINGE', status: 'Active' }
];

const c2Mech = [];
const c25Parts = [];
const c3Parts = [];
const dieselParts = [];
const luxParts = [];
const luxColors = [];
const fgs = [];

let idCounter = 1;

SIZES.forEach(s => {
  const S_NUM = s.replace('S','');
  c2Mech.push({ id: 'C2M-' + idCounter++, name: 'C2 CHARGER TOP SIZE-' + S_NUM, status: 'Active' });
  c2Mech.push({ id: 'C2M-' + idCounter++, name: 'C2 CHARGER BASE SIZE-' + S_NUM, status: 'Active' });
  c2Mech.push({ id: 'C2M-' + idCounter++, name: 'C2 COIL HOLDER SIZE-' + S_NUM, status: 'Active' });
  c25Parts.push({ id: 'C25-' + idCounter++, name: 'C2.5 CHARGER TOP SIZE-' + S_NUM, status: 'Active' });
  c3Parts.push({ id: 'C3P-' + idCounter++, name: 'C3 CHARGER TOP SIZE-' + S_NUM, status: 'Active' });
  c3Parts.push({ id: 'C3P-' + idCounter++, name: 'C3 CHARGER BASE SIZE-' + S_NUM, status: 'Active' });
  dieselParts.push({ id: 'DP-' + idCounter++, name: 'DIESEL CHARGER BASE ' + s, status: 'Active' });
  luxParts.push({ id: 'LP-' + idCounter++, name: 'LUX CHARGER TOP ' + s, status: 'Active' });
  luxColors.push({ id: 'LC-' + idCounter++, name: 'LUX YELLOW GOLD BASE ' + s, status: 'Active' });
  luxColors.push({ id: 'LC-' + idCounter++, name: 'LUX SILVER BASE ' + s, status: 'Active' });
  luxColors.push({ id: 'LC-' + idCounter++, name: 'LUX ROSE GOLD BASE ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'C2 CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'C2.5 CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'C3 CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'C3 DIESEL CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'LUX YELLOW GOLD CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'LUX SILVER CHARGER FG ' + s, status: 'Active' });
  fgs.push({ id: 'FG-' + idCounter++, name: 'LUX ROSE GOLD CHARGER FG ' + s, status: 'Active' });
});

c2Mech.push({ id: 'C2M-' + idCounter++, name: 'C2 BOTTOM PADS', status: 'Active' });
c3Parts.push({ id: 'C3P-' + idCounter++, name: 'C3 BOTTOM PADS', status: 'Active' });

const stickers = [
  { id: 'ST-1', name: 'LUX AS STICKER S05-S11', status: 'Active' },
  { id: 'ST-2', name: 'LUX AG STICKER S05-S11', status: 'Active' },
  { id: 'ST-3', name: 'LUX RG STICKER S05-S11', status: 'Active' },
  { id: 'ST-4', name: 'LUX AS STICKER S12-S14', status: 'Active' },
  { id: 'ST-5', name: 'LUX AG STICKER S12-S14', status: 'Active' },
  { id: 'ST-6', name: 'LUX RG STICKER S12-S14', status: 'Active' },
  { id: 'ST-7', name: 'DIE CUT LEATHER', status: 'Active' }
];

const components = {
  electronic,
  c2Mech,
  c25Parts,
  c3Parts,
  dieselParts,
  luxParts,
  luxColors,
  stickers,
  tapes,
  screws,
  fgs,
  housing
};

const boms = [
  {
    id: 'bom-c2',
    name: 'C2 Charger',
    types: ['C2'],
    sizes: ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14'],
    components: [
      { category: 'electronic', name: 'C2 FTX COIL', qty: 1 },
      { category: 'tapes', name: 'FERRITE TAPE 10x8', qty: 2 },
      { category: 'tapes', name: 'D.C TAPE 10x8', qty: 1 },
      { category: 'electronic', name: 'C2 CHARGER PCBA', qty: 1 },
      { category: 'c2Mech', name: 'C2 CHARGER TOP', qty: 1, useSize: true },
      { category: 'c2Mech', name: 'C2 COIL HOLDER', qty: 1, useSize: true },
      { category: 'c2Mech', name: 'C2 CHARGER BASE', qty: 1, useSize: true },
      { category: 'screws', name: 'CHARGER SCREWS (M1.8x6, Head 3.3 mm)', qty: 4 },
      { category: 'c2Mech', name: 'C2 BOTTOM PADS', qty: 1 }
    ]
  },
  {
    id: 'bom-c3',
    name: 'C3 Charger',
    types: ['C3'],
    sizes: ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14'],
    components: [
      { category: 'electronic', name: 'C3 FTX COIL', qty: 1 },
      { category: 'tapes', name: 'FERRITE TAPE 10x8', qty: 2 },
      { category: 'tapes', name: 'D.C TAPE 10x8', qty: 2 },
      { category: 'c3Parts', name: 'C3 CHARGER TOP', qty: 1, useSize: true },
      { category: 'c3Parts', name: 'C3 CHARGER BASE', qty: 1, useSize: true },
      { category: 'electronic', name: 'C2 CHARGER PCBA', qty: 1 },
      { category: 'screws', name: 'CHARGER SCREWS (M1.8x6, Head 3.3 mm)', qty: 4 },
      { category: 'c3Parts', name: 'C3 BOTTOM PADS', qty: 1 }
    ]
  },
  {
    id: 'bom-c25',
    name: 'C2.5 Charger',
    types: ['C2.5'],
    sizes: ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14'],
    components: [
      { category: 'electronic', name: 'C3 FTX COIL', qty: 1 },
      { category: 'tapes', name: 'FERRITE TAPE 10x8', qty: 2 },
      { category: 'tapes', name: 'D.C TAPE 10x8', qty: 2 },
      { category: 'electronic', name: 'C2 CHARGER PCBA', qty: 1 },
      { category: 'c25Parts', name: 'C2.5 CHARGER TOP', qty: 1, useSize: true },
      { category: 'c2Mech', name: 'C2 CHARGER BASE', qty: 1, useSize: true },
      { category: 'screws', name: 'CHARGER SCREWS (M1.8x6, Head 3.3 mm)', qty: 4 },
      { category: 'c2Mech', name: 'C2 BOTTOM PADS', qty: 1 }
    ]
  },
  {
    id: 'bom-diesel',
    name: 'Diesel',
    types: ['Diesel'],
    sizes: ['S05','S06','S07','S08','S09','S10','S11','S12','S13','S14'],
    components: [
      { category: 'electronic', name: 'C3 FTX COIL', qty: 1 },
      { category: 'tapes', name: 'FERRITE TAPE 10x8', qty: 2 },
      { category: 'tapes', name: 'D.C TAPE 10x8', qty: 2 },
      { category: 'c3Parts', name: 'C3 CHARGER TOP', qty: 1, useSize: true },
      { category: 'dieselParts', name: 'DIESEL CHARGER BASE', qty: 1, useSize: true },
      { category: 'electronic', name: 'C2 CHARGER PCBA', qty: 1 },
      { category: 'screws', name: 'CHARGER SCREWS (M1.8x6, Head 3.3 mm)', qty: 4 },
      { category: 'c3Parts', name: 'C3 BOTTOM PADS', qty: 1 }
    ]
  }
];

const fileContent = [
  "import { JSONFilePreset } from 'lowdb/node';",
  "import { randomUUID } from 'crypto';",
  "",
  "const defaultData = {",
  "  users: [",
  "    {",
  "      id: '1',",
  "      employeeId: process.env.ADMIN_ID || 'UltraCharger',",
  "      password: process.env.ADMIN_PASSWORD || 'Human@2026',",
  "      role: 'admin',",
  "      fullName: 'System Admin',",
  "      status: 'Active',",
  "      createdAt: new Date().toISOString(),",
  "      lastLogin: null",
  "    },",
  "    {",
  "      id: '2',",
  "      employeeId: process.env.USER_ID || 'Rajesh',",
  "      password: process.env.USER_PASSWORD || '1122',",
  "      role: 'user',",
  "      fullName: 'Rajesh',",
  "      status: 'Active',",
  "      createdAt: new Date().toISOString(),",
  "      lastLogin: null",
  "    }",
  "  ],",
  "  config: {",
  "    accessRules: []",
  "  },",
  "  moEntries: [],",
  "  scrapEntries: [],",
  "  returnEntries: [],",
  "  trashEntries: [],",
  "  auditLogs: [],",
  "  rndProducts: [],",
  "  rndEntries: [],",
  "  boms: " + JSON.stringify(boms, null, 4).replace(/\\n/g, "\\n  ") + ",",
  "  components: " + JSON.stringify(components, null, 4).replace(/\\n/g, "\\n  "),
  "};",
  "",
  "const db = await JSONFilePreset('./data/db.json', defaultData);",
  "",
  "let needsWrite = false;",
  "",
  "if (!db.data.boms || db.data.boms.length === 4) { ",
  "  db.data.boms = defaultData.boms;",
  "  needsWrite = true;",
  "}",

  "",
  "if (db.data.components && (db.data.components.batteries || db.data.components.pcbas)) {",
  "  db.data.components = defaultData.components;",
  "  needsWrite = true;",
  "}",
  "",
  "for (const key of Object.keys(defaultData)) {",
  "  if (db.data[key] === undefined) {",
  "    db.data[key] = defaultData[key];",
  "    needsWrite = true;",
  "  }",
  "}",
  "if (needsWrite) {",
  "  await db.write();",
  "}",
  "",
  "export { randomUUID };",
  "export default db;"
].join("\n");

fs.writeFileSync('backend/db.js', fileContent);
console.log("Successfully rebuilt backend/db.js");
