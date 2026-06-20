import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

// Force Google DNS so corporate/ISP firewalls don't block SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function buildDirectURI(srvURI) {
  const match = srvURI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)/);
  if (!match) return srvURI;
  const [, user, pass, host, rest] = match;

  console.log(`🔍 Resolving SRV for: ${host}`);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${host}`);
  console.log(`✅ Found ${srvRecords.length} shard(s)`);

  // Get replicaSet name from TXT record
  let replicaSet = null;
  try {
    const txtRecords = await resolveTxt(host);
    for (const rec of txtRecords) {
      const txt = rec.join('');
      const m = txt.match(/replicaSet=([^&]+)/);
      if (m) { replicaSet = m[1]; break; }
      const m2 = txt.match(/authSource=([^&]+)/);
      if (m2) { /* got authSource */ }
    }
  } catch (e) { /* TXT optional */ }

  const hostList = srvRecords.map(r => `${r.name}:${r.port}`).join(',');
  let uri = `mongodb://${user}:${pass}@${hostList}/?ssl=true&authSource=admin`;
  if (replicaSet) uri += `&replicaSet=${replicaSet}`;
  return uri;
}

async function backupDB() {
  const srvURI = process.env.MONGODB_URI;
  if (!srvURI) {
    console.error("❌ MONGODB_URI is not set in .env file.");
    process.exit(1);
  }

  console.log("🔄 Starting MongoDB backup...\n");

  let connected = false;
  let DataModel;

  // Try 1: Original SRV URI
  // Try 2: Direct URI with Google-DNS-resolved hosts
  const attempts = [
    { label: 'SRV connection', uri: srvURI },
  ];

  try {
    const directURI = await buildDirectURI(srvURI);
    attempts.push({ label: 'Direct shard connection', uri: directURI });
  } catch (e) {
    console.log(`⚠️  Could not resolve SRV: ${e.message}`);
  }

  for (const { label, uri } of attempts) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log(`🔌 Trying [${label}]...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
      console.log(`✅ Connected! [${label}]\n`);
      connected = true;
      const DataSchema = new mongoose.Schema({ _id: String }, { strict: false });
      DataModel = mongoose.models.Data || mongoose.model('Data', DataSchema);
      break;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message.substring(0, 100)}`);
    }
  }

  if (!connected) {
    console.error("\n❌ All connection attempts failed. Check your network and try again.");
    process.exit(1);
  }

  // Fetch and save data
  console.log("📥 Fetching master database...");
  const doc = await DataModel.findOne({ _id: 'master_database' }).lean();

  if (!doc) {
    console.log("⚠️  No master_database document found in MongoDB.");
    await mongoose.disconnect();
    process.exit(0);
  }

  delete doc._id;
  delete doc.__v;

  // Ensure data directory
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(dataDir, `backup_${ts}.json`);
  const dbPath = path.join(dataDir, 'db.json');
  const json = JSON.stringify(doc, null, 2);

  fs.writeFileSync(backupPath, json);
  fs.writeFileSync(dbPath, json);

  console.log(`\n🎉 Backup Complete!`);
  console.log(`   📁 Timestamped: ${backupPath}`);
  console.log(`   📁 Local db.json: ${dbPath}`);
  console.log(`\n📊 Data Summary:`);

  const keys = Object.keys(doc);
  for (const key of keys) {
    const val = doc[key];
    if (Array.isArray(val)) {
      console.log(`   ✅ ${key.padEnd(20)} → ${val.length} records`);
    } else if (val && typeof val === 'object') {
      const subCount = Object.keys(val).length;
      console.log(`   ✅ ${key.padEnd(20)} → ${subCount} categories`);
    }
  }

  console.log(`\n💡 TIP: Comment out MONGODB_URI in .env to run fully offline using db.json`);
  await mongoose.disconnect();
}

backupDB();
