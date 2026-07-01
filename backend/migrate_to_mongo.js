import 'dotenv/config';
import mongoose from 'mongoose';
import { JSONFilePreset } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'db.json');

async function migrate() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in your .env file!");
    process.exit(1);
  }

  // 1. Read existing local LowDB data
  console.log("📖 Reading local db.json...");
  const localDb = await JSONFilePreset(DB_PATH, {});
  if (!localDb.data || Object.keys(localDb.data).length === 0) {
     console.error("❌ No local data found in data/db.json to migrate!");
     process.exit(1);
  }

  // 2. Connect to MongoDB
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);

  // 3. Upsert data
  const DataSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const DataModel = mongoose.models.Data || mongoose.model('Data', DataSchema);

  console.log("🚀 Uploading your local data to MongoDB...");
  await DataModel.updateOne(
    { _id: 'master_database' },
    { $set: localDb.data },
    { upsert: true }
  );

  console.log("✅ Data successfully migrated to MongoDB! Zero data loss.");
  process.exit(0);
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
