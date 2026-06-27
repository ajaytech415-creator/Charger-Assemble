import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'db.json');

// Ensure data directory exists before lowdb tries to write (Locally only)
if (!process.env.VERCEL) {
  try { mkdirSync(DATA_DIR, { recursive: true }); } catch (err) {}
}

const defaultData = {
  users: [
    {
      id: '1',
      employeeId: process.env.ADMIN_ID || 'UltraCharger',
      password: process.env.ADMIN_PASSWORD || 'Password',
      role: 'admin',
      fullName: 'System Admin',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    {
      id: '2',
      employeeId: process.env.USER_ID || 'Rajesh',
      password: process.env.USER_PASSWORD || '1122',
      role: 'user',
      fullName: 'Rajesh',
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  ],
  config: {
    accessRules: []
  },
  moEntries: [],
  scrapEntries: [],
  returnEntries: [],
  trashEntries: [],
  auditLogs: [],
  rndProducts: [],
  rndEntries: [],
  boms: [
    {
        "id": "bom-c2",
        "name": "C2 Charger",
        "types": [
            "C2"
        ],
        "sizes": [
            "S05",
            "S06",
            "S07",
            "S08",
            "S09",
            "S10",
            "S11",
            "S12",
            "S13",
            "S14"
        ],
        "components": [
            {
                "category": "electronic",
                "name": "C2 FTX COIL",
                "qty": 1
            },
            {
                "category": "tapes",
                "name": "FERRITE TAPE 10x8",
                "qty": 2
            },
            {
                "category": "tapes",
                "name": "D.C TAPE 10x8",
                "qty": 1
            },
            {
                "category": "electronic",
                "name": "C2 CHARGER PCBA",
                "qty": 1
            },
            {
                "category": "c2Mech",
                "name": "C2 CHARGER TOP",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "c2Mech",
                "name": "C2 COIL HOLDER",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "c2Mech",
                "name": "C2 CHARGER BASE",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "screws",
                "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)",
                "qty": 4
            },
            {
                "category": "c2Mech",
                "name": "C2 BOTTOM PADS",
                "qty": 1
            }
        ]
    },
    {
        "id": "bom-c3",
        "name": "C3 Charger",
        "types": [
            "C3"
        ],
        "sizes": [
            "S05",
            "S06",
            "S07",
            "S08",
            "S09",
            "S10",
            "S11",
            "S12",
            "S13",
            "S14"
        ],
        "components": [
            {
                "category": "electronic",
                "name": "C3 FTX COIL",
                "qty": 1
            },
            {
                "category": "tapes",
                "name": "FERRITE TAPE 10x8",
                "qty": 2
            },
            {
                "category": "tapes",
                "name": "D.C TAPE 10x8",
                "qty": 2
            },
            {
                "category": "c3Parts",
                "name": "C3 CHARGER TOP",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "c3Parts",
                "name": "C3 CHARGER BASE",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "electronic",
                "name": "C2 CHARGER PCBA",
                "qty": 1
            },
            {
                "category": "screws",
                "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)",
                "qty": 4
            },
            {
                "category": "c3Parts",
                "name": "C3 BOTTOM PADS",
                "qty": 1
            }
        ]
    },
    {
        "id": "bom-c25",
        "name": "C2.5 Charger",
        "types": [
            "C2.5"
        ],
        "sizes": [
            "S05",
            "S06",
            "S07",
            "S08",
            "S09",
            "S10",
            "S11",
            "S12",
            "S13",
            "S14"
        ],
        "components": [
            {
                "category": "electronic",
                "name": "C3 FTX COIL",
                "qty": 1
            },
            {
                "category": "tapes",
                "name": "FERRITE TAPE 10x8",
                "qty": 2
            },
            {
                "category": "tapes",
                "name": "D.C TAPE 10x8",
                "qty": 2
            },
            {
                "category": "electronic",
                "name": "C2 CHARGER PCBA",
                "qty": 1
            },
            {
                "category": "c25Parts",
                "name": "C2.5 CHARGER TOP",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "c2Mech",
                "name": "C2 CHARGER BASE",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "screws",
                "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)",
                "qty": 4
            },
            {
                "category": "c2Mech",
                "name": "C2 BOTTOM PADS",
                "qty": 1
            }
        ]
    },
    {
        "id": "bom-diesel",
        "name": "Diesel",
        "types": [
            "Diesel"
        ],
        "sizes": [
            "S05",
            "S06",
            "S07",
            "S08",
            "S09",
            "S10",
            "S11",
            "S12",
            "S13",
            "S14"
        ],
        "components": [
            {
                "category": "electronic",
                "name": "C3 FTX COIL",
                "qty": 1
            },
            {
                "category": "tapes",
                "name": "FERRITE TAPE 10x8",
                "qty": 2
            },
            {
                "category": "tapes",
                "name": "D.C TAPE 10x8",
                "qty": 2
            },
            {
                "category": "c3Parts",
                "name": "C3 CHARGER TOP",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "dieselParts",
                "name": "DIESEL CHARGER BASE",
                "qty": 1,
                "useSize": true
            },
            {
                "category": "electronic",
                "name": "C2 CHARGER PCBA",
                "qty": 1
            },
            {
                "category": "screws",
                "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)",
                "qty": 4
            },
            {
                "category": "c3Parts",
                "name": "C3 BOTTOM PADS",
                "qty": 1
            }
        ]
    },
    {
        "id": "bom-lux-lp",
        "name": "LUX PLATINAM CHARGER",
        "types": [
            "LUX LP"
        ],
        "sizes": [
            "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14"
        ],
        "components": [
            { "category": "electronic", "name": "C2 CHARGER PCBA", "qty": 1 },
            { "category": "electronic", "name": "C3 FTX COIL", "qty": 1 },
            { "category": "tapes", "name": "FERRITE TAPE 10x8", "qty": 2 },
            { "category": "tapes", "name": "D.C TAPE 10x8", "qty": 2 },
            { "category": "luxColors", "name": "LUX SILVER BASE MATT", "qty": 1, "useSize": true },
            { "category": "luxParts", "name": "LUX CHARGER TOP", "qty": 1, "useSize": true },
            { "category": "stickers", "name": "LUX AS STICKER", "qty": 1, "useSize": true },
            { "category": "c3Parts", "name": "C3 BOTTOM PADS", "qty": 1 },
            { "category": "screws", "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)", "qty": 4 },
            { "category": "stickers", "name": "DIE CUT LEATHER", "qty": 1 }
        ]
    },
    {
        "id": "bom-lux-lg",
        "name": "LUX YELLOW GOLD CHARGER",
        "types": [
            "LUX LG"
        ],
        "sizes": [
            "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14"
        ],
        "components": [
            { "category": "electronic", "name": "C2 CHARGER PCBA", "qty": 1 },
            { "category": "electronic", "name": "C3 FTX COIL", "qty": 1 },
            { "category": "tapes", "name": "FERRITE TAPE 10x8", "qty": 2 },
            { "category": "tapes", "name": "D.C TAPE 10x8", "qty": 2 },
            { "category": "luxColors", "name": "LUX YELLOW GOLD BASE MATT", "qty": 1, "useSize": true },
            { "category": "luxParts", "name": "LUX CHARGER TOP", "qty": 1, "useSize": true },
            { "category": "stickers", "name": "LUX AS STICKER", "qty": 1, "useSize": true },
            { "category": "c3Parts", "name": "C3 BOTTOM PADS", "qty": 1 },
            { "category": "screws", "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)", "qty": 4 },
            { "category": "stickers", "name": "DIE CUT LEATHER", "qty": 1 }
        ]
    },
    {
        "id": "bom-lux-lr",
        "name": "LUX Rose Gold CHARGER",
        "types": [
            "LUX LR"
        ],
        "sizes": [
            "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14"
        ],
        "components": [
            { "category": "electronic", "name": "C2 CHARGER PCBA", "qty": 1 },
            { "category": "electronic", "name": "C3 FTX COIL", "qty": 1 },
            { "category": "tapes", "name": "FERRITE TAPE 10x8", "qty": 2 },
            { "category": "tapes", "name": "D.C TAPE 10x8", "qty": 2 },
            { "category": "luxColors", "name": "LUX ROSE GOLD BASE MATT", "qty": 1, "useSize": true },
            { "category": "luxParts", "name": "LUX CHARGER TOP", "qty": 1, "useSize": true },
            { "category": "stickers", "name": "LUX RG STICKER", "qty": 1, "useSize": true },
            { "category": "c3Parts", "name": "C3 BOTTOM PADS", "qty": 1 },
            { "category": "screws", "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)", "qty": 4 },
            { "category": "stickers", "name": "DIE CUT LEATHER", "qty": 1 }
        ]
    }
],
  components: {
    "electronic": [
        {
            "id": "EL-1",
            "name": "C2 CHARGER PCBA",
            "status": "Active"
        },
        {
            "id": "EL-2",
            "name": "PRO CHARGER PCBA",
            "status": "Active"
        },
        {
            "id": "EL-3",
            "name": "C2 FTX COIL",
            "status": "Active"
        },
        {
            "id": "EL-4",
            "name": "C3 FTX COIL",
            "status": "Active"
        },
        {
            "id": "EL-5",
            "name": "400 MAH BATTERY",
            "status": "Active"
        },
        {
            "id": "EL-6",
            "name": "300 MAH BATTERY",
            "status": "Active"
        },
        {
            "id": "EL-7",
            "name": "MAGNET TOP 30 mm (TOP ENCLOSURE)",
            "status": "Active"
        },
        {
            "id": "EL-8",
            "name": "MAGNET MID (28.55 mm) MID PLASTIC",
            "status": "Active"
        },
        {
            "id": "EL-9",
            "name": "MAGNET MID (10 mm) MID PLASTIC",
            "status": "Active"
        },
        {
            "id": "EL-10",
            "name": "MAGNET COVER",
            "status": "Active"
        },
        {
            "id": "EL-11",
            "name": "POGO STOPPER",
            "status": "Active"
        },
        {
            "id": "EL-12",
            "name": "POGO PIN",
            "status": "Active"
        },
        {
            "id": "EL-13",
            "name": "HAPTIC BRACKET",
            "status": "Active"
        },
        {
            "id": "EL-14",
            "name": "SPEAKER ENCLOSURE",
            "status": "Active"
        }
    ],
    "c2Mech": [
        {
            "id": "C2M-1",
            "name": "C2 CHARGER TOP SIZE-05",
            "status": "Active"
        },
        {
            "id": "C2M-2",
            "name": "C2 CHARGER BASE SIZE-05",
            "status": "Active"
        },
        {
            "id": "C2M-3",
            "name": "C2 COIL HOLDER SIZE-05",
            "status": "Active"
        },
        {
            "id": "C2M-19",
            "name": "C2 CHARGER TOP SIZE-06",
            "status": "Active"
        },
        {
            "id": "C2M-20",
            "name": "C2 CHARGER BASE SIZE-06",
            "status": "Active"
        },
        {
            "id": "C2M-21",
            "name": "C2 COIL HOLDER SIZE-06",
            "status": "Active"
        },
        {
            "id": "C2M-37",
            "name": "C2 CHARGER TOP SIZE-07",
            "status": "Active"
        },
        {
            "id": "C2M-38",
            "name": "C2 CHARGER BASE SIZE-07",
            "status": "Active"
        },
        {
            "id": "C2M-39",
            "name": "C2 COIL HOLDER SIZE-07",
            "status": "Active"
        },
        {
            "id": "C2M-55",
            "name": "C2 CHARGER TOP SIZE-08",
            "status": "Active"
        },
        {
            "id": "C2M-56",
            "name": "C2 CHARGER BASE SIZE-08",
            "status": "Active"
        },
        {
            "id": "C2M-57",
            "name": "C2 COIL HOLDER SIZE-08",
            "status": "Active"
        },
        {
            "id": "C2M-73",
            "name": "C2 CHARGER TOP SIZE-09",
            "status": "Active"
        },
        {
            "id": "C2M-74",
            "name": "C2 CHARGER BASE SIZE-09",
            "status": "Active"
        },
        {
            "id": "C2M-75",
            "name": "C2 COIL HOLDER SIZE-09",
            "status": "Active"
        },
        {
            "id": "C2M-91",
            "name": "C2 CHARGER TOP SIZE-10",
            "status": "Active"
        },
        {
            "id": "C2M-92",
            "name": "C2 CHARGER BASE SIZE-10",
            "status": "Active"
        },
        {
            "id": "C2M-93",
            "name": "C2 COIL HOLDER SIZE-10",
            "status": "Active"
        },
        {
            "id": "C2M-109",
            "name": "C2 CHARGER TOP SIZE-11",
            "status": "Active"
        },
        {
            "id": "C2M-110",
            "name": "C2 CHARGER BASE SIZE-11",
            "status": "Active"
        },
        {
            "id": "C2M-111",
            "name": "C2 COIL HOLDER SIZE-11",
            "status": "Active"
        },
        {
            "id": "C2M-127",
            "name": "C2 CHARGER TOP SIZE-12",
            "status": "Active"
        },
        {
            "id": "C2M-128",
            "name": "C2 CHARGER BASE SIZE-12",
            "status": "Active"
        },
        {
            "id": "C2M-129",
            "name": "C2 COIL HOLDER SIZE-12",
            "status": "Active"
        },
        {
            "id": "C2M-145",
            "name": "C2 CHARGER TOP SIZE-13",
            "status": "Active"
        },
        {
            "id": "C2M-146",
            "name": "C2 CHARGER BASE SIZE-13",
            "status": "Active"
        },
        {
            "id": "C2M-147",
            "name": "C2 COIL HOLDER SIZE-13",
            "status": "Active"
        },
        {
            "id": "C2M-163",
            "name": "C2 CHARGER TOP SIZE-14",
            "status": "Active"
        },
        {
            "id": "C2M-164",
            "name": "C2 CHARGER BASE SIZE-14",
            "status": "Active"
        },
        {
            "id": "C2M-165",
            "name": "C2 COIL HOLDER SIZE-14",
            "status": "Active"
        },
        {
            "id": "C2M-181",
            "name": "C2 BOTTOM PADS",
            "status": "Active"
        }
    ],
    "c25Parts": [
        {
            "id": "C25-4",
            "name": "C2.5 CHARGER TOP SIZE-05",
            "status": "Active"
        },
        {
            "id": "C25-22",
            "name": "C2.5 CHARGER TOP SIZE-06",
            "status": "Active"
        },
        {
            "id": "C25-40",
            "name": "C2.5 CHARGER TOP SIZE-07",
            "status": "Active"
        },
        {
            "id": "C25-58",
            "name": "C2.5 CHARGER TOP SIZE-08",
            "status": "Active"
        },
        {
            "id": "C25-76",
            "name": "C2.5 CHARGER TOP SIZE-09",
            "status": "Active"
        },
        {
            "id": "C25-94",
            "name": "C2.5 CHARGER TOP SIZE-10",
            "status": "Active"
        },
        {
            "id": "C25-112",
            "name": "C2.5 CHARGER TOP SIZE-11",
            "status": "Active"
        },
        {
            "id": "C25-130",
            "name": "C2.5 CHARGER TOP SIZE-12",
            "status": "Active"
        },
        {
            "id": "C25-148",
            "name": "C2.5 CHARGER TOP SIZE-13",
            "status": "Active"
        },
        {
            "id": "C25-166",
            "name": "C2.5 CHARGER TOP SIZE-14",
            "status": "Active"
        }
    ],
    "c3Parts": [
        {
            "id": "C3P-5",
            "name": "C3 CHARGER TOP SIZE-05",
            "status": "Active"
        },
        {
            "id": "C3P-6",
            "name": "C3 CHARGER BASE SIZE-05",
            "status": "Active"
        },
        {
            "id": "C3P-23",
            "name": "C3 CHARGER TOP SIZE-06",
            "status": "Active"
        },
        {
            "id": "C3P-24",
            "name": "C3 CHARGER BASE SIZE-06",
            "status": "Active"
        },
        {
            "id": "C3P-41",
            "name": "C3 CHARGER TOP SIZE-07",
            "status": "Active"
        },
        {
            "id": "C3P-42",
            "name": "C3 CHARGER BASE SIZE-07",
            "status": "Active"
        },
        {
            "id": "C3P-59",
            "name": "C3 CHARGER TOP SIZE-08",
            "status": "Active"
        },
        {
            "id": "C3P-60",
            "name": "C3 CHARGER BASE SIZE-08",
            "status": "Active"
        },
        {
            "id": "C3P-77",
            "name": "C3 CHARGER TOP SIZE-09",
            "status": "Active"
        },
        {
            "id": "C3P-78",
            "name": "C3 CHARGER BASE SIZE-09",
            "status": "Active"
        },
        {
            "id": "C3P-95",
            "name": "C3 CHARGER TOP SIZE-10",
            "status": "Active"
        },
        {
            "id": "C3P-96",
            "name": "C3 CHARGER BASE SIZE-10",
            "status": "Active"
        },
        {
            "id": "C3P-113",
            "name": "C3 CHARGER TOP SIZE-11",
            "status": "Active"
        },
        {
            "id": "C3P-114",
            "name": "C3 CHARGER BASE SIZE-11",
            "status": "Active"
        },
        {
            "id": "C3P-131",
            "name": "C3 CHARGER TOP SIZE-12",
            "status": "Active"
        },
        {
            "id": "C3P-132",
            "name": "C3 CHARGER BASE SIZE-12",
            "status": "Active"
        },
        {
            "id": "C3P-149",
            "name": "C3 CHARGER TOP SIZE-13",
            "status": "Active"
        },
        {
            "id": "C3P-150",
            "name": "C3 CHARGER BASE SIZE-13",
            "status": "Active"
        },
        {
            "id": "C3P-167",
            "name": "C3 CHARGER TOP SIZE-14",
            "status": "Active"
        },
        {
            "id": "C3P-168",
            "name": "C3 CHARGER BASE SIZE-14",
            "status": "Active"
        },
        {
            "id": "C3P-182",
            "name": "C3 BOTTOM PADS",
            "status": "Active"
        }
    ],
    "dieselParts": [
        {
            "id": "DP-7",
            "name": "DIESEL CHARGER BASE S05",
            "status": "Active"
        },
        {
            "id": "DP-25",
            "name": "DIESEL CHARGER BASE S06",
            "status": "Active"
        },
        {
            "id": "DP-43",
            "name": "DIESEL CHARGER BASE S07",
            "status": "Active"
        },
        {
            "id": "DP-61",
            "name": "DIESEL CHARGER BASE S08",
            "status": "Active"
        },
        {
            "id": "DP-79",
            "name": "DIESEL CHARGER BASE S09",
            "status": "Active"
        },
        {
            "id": "DP-97",
            "name": "DIESEL CHARGER BASE S10",
            "status": "Active"
        },
        {
            "id": "DP-115",
            "name": "DIESEL CHARGER BASE S11",
            "status": "Active"
        },
        {
            "id": "DP-133",
            "name": "DIESEL CHARGER BASE S12",
            "status": "Active"
        },
        {
            "id": "DP-151",
            "name": "DIESEL CHARGER BASE S13",
            "status": "Active"
        },
        {
            "id": "DP-169",
            "name": "DIESEL CHARGER BASE S14",
            "status": "Active"
        }
    ],
    "luxParts": [
        {
            "id": "LP-8",
            "name": "LUX CHARGER TOP S05",
            "status": "Active"
        },
        {
            "id": "LP-26",
            "name": "LUX CHARGER TOP S06",
            "status": "Active"
        },
        {
            "id": "LP-44",
            "name": "LUX CHARGER TOP S07",
            "status": "Active"
        },
        {
            "id": "LP-62",
            "name": "LUX CHARGER TOP S08",
            "status": "Active"
        },
        {
            "id": "LP-80",
            "name": "LUX CHARGER TOP S09",
            "status": "Active"
        },
        {
            "id": "LP-98",
            "name": "LUX CHARGER TOP S10",
            "status": "Active"
        },
        {
            "id": "LP-116",
            "name": "LUX CHARGER TOP S11",
            "status": "Active"
        },
        {
            "id": "LP-134",
            "name": "LUX CHARGER TOP S12",
            "status": "Active"
        },
        {
            "id": "LP-152",
            "name": "LUX CHARGER TOP S13",
            "status": "Active"
        },
        {
            "id": "LP-170",
            "name": "LUX CHARGER TOP S14",
            "status": "Active"
        }
    ],
    "luxColors": [
        {
            "id": "LC-9",
            "name": "LUX YELLOW GOLD BASE S05",
            "status": "Active"
        },
        {
            "id": "LC-10",
            "name": "LUX SILVER BASE S05",
            "status": "Active"
        },
        {
            "id": "LC-11",
            "name": "LUX ROSE GOLD BASE S05",
            "status": "Active"
        },
        {
            "id": "LC-27",
            "name": "LUX YELLOW GOLD BASE S06",
            "status": "Active"
        },
        {
            "id": "LC-28",
            "name": "LUX SILVER BASE S06",
            "status": "Active"
        },
        {
            "id": "LC-29",
            "name": "LUX ROSE GOLD BASE S06",
            "status": "Active"
        },
        {
            "id": "LC-45",
            "name": "LUX YELLOW GOLD BASE S07",
            "status": "Active"
        },
        {
            "id": "LC-46",
            "name": "LUX SILVER BASE S07",
            "status": "Active"
        },
        {
            "id": "LC-47",
            "name": "LUX ROSE GOLD BASE S07",
            "status": "Active"
        },
        {
            "id": "LC-63",
            "name": "LUX YELLOW GOLD BASE S08",
            "status": "Active"
        },
        {
            "id": "LC-64",
            "name": "LUX SILVER BASE S08",
            "status": "Active"
        },
        {
            "id": "LC-65",
            "name": "LUX ROSE GOLD BASE S08",
            "status": "Active"
        },
        {
            "id": "LC-81",
            "name": "LUX YELLOW GOLD BASE S09",
            "status": "Active"
        },
        {
            "id": "LC-82",
            "name": "LUX SILVER BASE S09",
            "status": "Active"
        },
        {
            "id": "LC-83",
            "name": "LUX ROSE GOLD BASE S09",
            "status": "Active"
        },
        {
            "id": "LC-99",
            "name": "LUX YELLOW GOLD BASE S10",
            "status": "Active"
        },
        {
            "id": "LC-100",
            "name": "LUX SILVER BASE S10",
            "status": "Active"
        },
        {
            "id": "LC-101",
            "name": "LUX ROSE GOLD BASE S10",
            "status": "Active"
        },
        {
            "id": "LC-117",
            "name": "LUX YELLOW GOLD BASE S11",
            "status": "Active"
        },
        {
            "id": "LC-118",
            "name": "LUX SILVER BASE S11",
            "status": "Active"
        },
        {
            "id": "LC-119",
            "name": "LUX ROSE GOLD BASE S11",
            "status": "Active"
        },
        {
            "id": "LC-135",
            "name": "LUX YELLOW GOLD BASE S12",
            "status": "Active"
        },
        {
            "id": "LC-136",
            "name": "LUX SILVER BASE S12",
            "status": "Active"
        },
        {
            "id": "LC-137",
            "name": "LUX ROSE GOLD BASE S12",
            "status": "Active"
        },
        {
            "id": "LC-153",
            "name": "LUX YELLOW GOLD BASE S13",
            "status": "Active"
        },
        {
            "id": "LC-154",
            "name": "LUX SILVER BASE S13",
            "status": "Active"
        },
        {
            "id": "LC-155",
            "name": "LUX ROSE GOLD BASE S13",
            "status": "Active"
        },
        {
            "id": "LC-171",
            "name": "LUX YELLOW GOLD BASE S14",
            "status": "Active"
        },
        {
            "id": "LC-172",
            "name": "LUX SILVER BASE S14",
            "status": "Active"
        },
        {
            "id": "LC-173",
            "name": "LUX ROSE GOLD BASE S14",
            "status": "Active"
        }
    ],
    "stickers": [
        {
            "id": "ST-1",
            "name": "LUX AS STICKER S05-S11",
            "status": "Active"
        },
        {
            "id": "ST-2",
            "name": "LUX AG STICKER S05-S11",
            "status": "Active"
        },
        {
            "id": "ST-3",
            "name": "LUX RG STICKER S05-S11",
            "status": "Active"
        },
        {
            "id": "ST-4",
            "name": "LUX AS STICKER S12-S14",
            "status": "Active"
        },
        {
            "id": "ST-5",
            "name": "LUX AG STICKER S12-S14",
            "status": "Active"
        },
        {
            "id": "ST-6",
            "name": "LUX RG STICKER S12-S14",
            "status": "Active"
        },
        {
            "id": "ST-7",
            "name": "DIE CUT LEATHER",
            "status": "Active"
        }
    ],
    "tapes": [
        {
            "id": "TA-1",
            "name": "FERRITE TAPE 10x8",
            "status": "Active"
        },
        {
            "id": "TA-2",
            "name": "D.C TAPE 10x8",
            "status": "Active"
        },
        {
            "id": "TA-3",
            "name": "BATTERY EVA TAPE",
            "status": "Active"
        },
        {
            "id": "TA-4",
            "name": "TESSA TAPE",
            "status": "Active"
        },
        {
            "id": "TA-5",
            "name": "HAPTIC SIDE TAPE",
            "status": "Active"
        },
        {
            "id": "TA-6",
            "name": "GORILLA GLUE",
            "status": "Active"
        }
    ],
    "screws": [
        {
            "id": "SC-1",
            "name": "CHARGER SCREWS (M1.8x6, Head 3.3 mm)",
            "status": "Active"
        },
        {
            "id": "SC-2",
            "name": "WAFER HEAD SCREW (M2x2)",
            "status": "Active"
        },
        {
            "id": "SC-3",
            "name": "GRUB SCREW (M2x2)",
            "status": "Active"
        },
        {
            "id": "SC-4",
            "name": "SELF TAPPING SCREWS (M1.7x10)",
            "status": "Active"
        },
        {
            "id": "SC-5",
            "name": "HINGE SCREWS (M1.8x6, Head 3.3 mm)",
            "status": "Active"
        }
    ],
    "fgs": [
        {
            "id": "FG-12",
            "name": "C2 CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-13",
            "name": "C2.5 CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-14",
            "name": "C3 CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-15",
            "name": "C3 DIESEL CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-16",
            "name": "LUX YELLOW GOLD CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-17",
            "name": "LUX SILVER CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-18",
            "name": "LUX ROSE GOLD CHARGER FG S05",
            "status": "Active"
        },
        {
            "id": "FG-30",
            "name": "C2 CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-31",
            "name": "C2.5 CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-32",
            "name": "C3 CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-33",
            "name": "C3 DIESEL CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-34",
            "name": "LUX YELLOW GOLD CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-35",
            "name": "LUX SILVER CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-36",
            "name": "LUX ROSE GOLD CHARGER FG S06",
            "status": "Active"
        },
        {
            "id": "FG-48",
            "name": "C2 CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-49",
            "name": "C2.5 CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-50",
            "name": "C3 CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-51",
            "name": "C3 DIESEL CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-52",
            "name": "LUX YELLOW GOLD CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-53",
            "name": "LUX SILVER CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-54",
            "name": "LUX ROSE GOLD CHARGER FG S07",
            "status": "Active"
        },
        {
            "id": "FG-66",
            "name": "C2 CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-67",
            "name": "C2.5 CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-68",
            "name": "C3 CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-69",
            "name": "C3 DIESEL CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-70",
            "name": "LUX YELLOW GOLD CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-71",
            "name": "LUX SILVER CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-72",
            "name": "LUX ROSE GOLD CHARGER FG S08",
            "status": "Active"
        },
        {
            "id": "FG-84",
            "name": "C2 CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-85",
            "name": "C2.5 CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-86",
            "name": "C3 CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-87",
            "name": "C3 DIESEL CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-88",
            "name": "LUX YELLOW GOLD CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-89",
            "name": "LUX SILVER CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-90",
            "name": "LUX ROSE GOLD CHARGER FG S09",
            "status": "Active"
        },
        {
            "id": "FG-102",
            "name": "C2 CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-103",
            "name": "C2.5 CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-104",
            "name": "C3 CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-105",
            "name": "C3 DIESEL CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-106",
            "name": "LUX YELLOW GOLD CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-107",
            "name": "LUX SILVER CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-108",
            "name": "LUX ROSE GOLD CHARGER FG S10",
            "status": "Active"
        },
        {
            "id": "FG-120",
            "name": "C2 CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-121",
            "name": "C2.5 CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-122",
            "name": "C3 CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-123",
            "name": "C3 DIESEL CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-124",
            "name": "LUX YELLOW GOLD CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-125",
            "name": "LUX SILVER CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-126",
            "name": "LUX ROSE GOLD CHARGER FG S11",
            "status": "Active"
        },
        {
            "id": "FG-138",
            "name": "C2 CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-139",
            "name": "C2.5 CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-140",
            "name": "C3 CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-141",
            "name": "C3 DIESEL CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-142",
            "name": "LUX YELLOW GOLD CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-143",
            "name": "LUX SILVER CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-144",
            "name": "LUX ROSE GOLD CHARGER FG S12",
            "status": "Active"
        },
        {
            "id": "FG-156",
            "name": "C2 CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-157",
            "name": "C2.5 CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-158",
            "name": "C3 CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-159",
            "name": "C3 DIESEL CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-160",
            "name": "LUX YELLOW GOLD CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-161",
            "name": "LUX SILVER CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-162",
            "name": "LUX ROSE GOLD CHARGER FG S13",
            "status": "Active"
        },
        {
            "id": "FG-174",
            "name": "C2 CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-175",
            "name": "C2.5 CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-176",
            "name": "C3 CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-177",
            "name": "C3 DIESEL CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-178",
            "name": "LUX YELLOW GOLD CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-179",
            "name": "LUX SILVER CHARGER FG S14",
            "status": "Active"
        },
        {
            "id": "FG-180",
            "name": "LUX ROSE GOLD CHARGER FG S14",
            "status": "Active"
        }
    ],
    "housing": [
        {
            "id": "HS-1",
            "name": "TOP ENCLOSURE",
            "status": "Active"
        },
        {
            "id": "HS-2",
            "name": "BOTTOM ENCLOSURE",
            "status": "Active"
        },
        {
            "id": "HS-3",
            "name": "MID PLASTIC",
            "status": "Active"
        },
        {
            "id": "HS-4",
            "name": "BOTTOM PLASTIC",
            "status": "Active"
        },
        {
            "id": "HS-5",
            "name": "BUTTON",
            "status": "Active"
        },
        {
            "id": "HS-6",
            "name": "BUTTON BACKING",
            "status": "Active"
        },
        {
            "id": "HS-7",
            "name": "LIGHT GUIDE",
            "status": "Active"
        },
        {
            "id": "HS-8",
            "name": "ANTI SKID BOTTOM PAD",
            "status": "Active"
        },
        {
            "id": "HS-9",
            "name": "HINGE",
            "status": "Active"
        }
    ]
}
};

let db;

// If MONGODB_URI is provided, use MongoDB as the backend for the entire JSON object
if (process.env.MONGODB_URI) {
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000 // 10 seconds timeout
    });
    console.log("MongoDB Connected!");
  } catch (error) {
    console.error("\n❌ MONGODB CONNECTION ERROR:");
    console.error("=========================");
    console.error(error.message);
    console.error("=========================\n");
    console.error("💡 DIAGNOSTIC & TROUBLESHOOTING CHECKLIST:");
    console.error("1. IP Whitelisting (Most Common): Did you allow network access from anywhere (0.0.0.0/0) in MongoDB Atlas -> Network Access? If not, Render will be blocked!");
    console.error("2. Password in Connection String: Did you replace `<password>` (with brackets) in your MONGODB_URI environment variable on Render with your actual password?");
    console.error("3. Special Characters: If your password has special characters like @, :, /, or #, MongoDB will fail to parse it. Please change your database user's password in Atlas to use ONLY letters and numbers.");
    console.error("4. Check Render Env Vars: Make sure the key on Render is exactly 'MONGODB_URI' in capital letters.\n");
    process.exit(1);
  }

  const DataSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const DataModel = mongoose.models.Data || mongoose.model('Data', DataSchema);

  db = {
    data: null,
    write: async function() {
      // Upsert the entire data object to MongoDB
      await DataModel.updateOne(
        { _id: 'master_database' },
        { $set: this.data },
        { upsert: true }
      );
    }
  };

  // Load existing data from MongoDB
  let doc = await DataModel.findOne({ _id: 'master_database' }).lean();
  
  if (!doc) {
    db.data = defaultData;
    await db.write();
  } else {
    delete doc._id;
    delete doc.__v;
    db.data = { ...defaultData, ...doc }; 
  }
} 
// Otherwise, fallback to the local lowdb JSON file (for local development)
else {
  console.log("Using Local JSON Database (lowdb)");
  db = await JSONFilePreset(DB_PATH, defaultData);
  
  // Implement global write serialization (mutex) to prevent ENOENT errors on Windows
  let writeQueue = Promise.resolve();
  const originalWrite = db.write.bind(db);
  db.write = () => {
    writeQueue = writeQueue.then(() => originalWrite()).catch(() => originalWrite());
    return writeQueue;
  };
}

let needsWrite = false;

if (!db.data.boms) { 
  db.data.boms = defaultData.boms;
  needsWrite = true;
} else if (db.data.boms.length < defaultData.boms.length) {
  const newBOMs = defaultData.boms.filter(dbom => !db.data.boms.some(b => b.id === dbom.id));
  if (newBOMs.length > 0) {
    db.data.boms.push(...newBOMs);
    needsWrite = true;
  }
}

if (!db.data.components || Object.keys(db.data.components).length === 0) {
  db.data.components = defaultData.components;
  needsWrite = true;
}

for (const key of Object.keys(defaultData)) {
  if (db.data[key] === undefined) {
    // For 'users', only seed if there are truly no users at all
    // Never overwrite existing users — this protects admin-panel password changes
    if (key === 'users' && Array.isArray(db.data.users) && db.data.users.length > 0) continue;
    db.data[key] = defaultData[key];
    needsWrite = true;
  }
}
if (needsWrite) {
  await db.write();
}

// --- HOTFIX MIGRATION: Fix unpadded single digit sizes (e.g. "S9" to "S09") ---
let hotfixWrite = false;
const fixSuffixes = (str) => {
  if (!str) return str;
  str = str.replace(/ S([1-9])$/i, ' S0$1');
  str = str.replace(/ SIZE-([1-9])$/i, ' SIZE-0$1');
  return str;
};

if (db.data.moEntries) {
  for (const mo of db.data.moEntries) {
    const origSize = mo.size;
    if (origSize && origSize.length === 1 && /^\d$/.test(origSize)) {
      mo.size = 'S0' + origSize;
      mo.sku = (mo.sku || '').replace(/\d+/, '0' + origSize);
      if (!mo.sku.startsWith('S')) mo.sku = 'S' + mo.sku;
      hotfixWrite = true;
    }
    if (mo.components) {
      for (const comp of mo.components) {
        if (!comp.name) continue;
        const newName = fixSuffixes(comp.name);
        if (newName !== comp.name) {
          comp.name = newName;
          hotfixWrite = true;
        }
      }
    }
  }
}

const collectionsToCheck = ['returnEntries', 'scrapEntries', 'reworkEntries', 'trashEntries'];
for (const coll of collectionsToCheck) {
  if (db.data[coll]) {
    for (const entry of db.data[coll]) {
      if (entry.component) {
         const newName = fixSuffixes(entry.component);
         if (newName !== entry.component) {
           entry.component = newName;
           hotfixWrite = true;
         }
      }
    }
  }
}

if (db.data.components) {
  for (const [category, arr] of Object.entries(db.data.components)) {
    if (!Array.isArray(arr)) continue;
    const newArr = [];
    const seen = new Set();
    
    for (const comp of arr) {
       const isObj = typeof comp === 'object';
       let name = isObj ? comp.name : comp;
       let fixedName = fixSuffixes(name);
       if (fixedName !== name) hotfixWrite = true;
       
       if (!seen.has(fixedName)) {
         seen.add(fixedName);
         newArr.push(isObj ? { ...comp, name: fixedName } : fixedName);
       } else {
         hotfixWrite = true;
       }
    }
    db.data.components[category] = newArr;
  }
}

if (hotfixWrite) {
  console.log("Applied hotfix migration to padded sizes (e.g. S9 -> S09)...");
  await db.write();
}
if (needsWrite) {
  await db.write();
}

export { randomUUID };
export default db;