import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { login } from './routes/auth.js';
import { getMOs, createMO, createMOBulk, updateMO, deleteMO, parseSKUPreview } from './routes/mos.js';
import { getConfig, updateConfig, getUsers, createUser, updateUser, deleteUser, getComponents, manageComponents, getAuditLogs, deleteAuditLogs, backupDatabase, handleDbAction, getTrash, handleTrashAction, wipeAllData } from './routes/admin.js';
import { getStats, getReport } from './routes/stats.js';
import { downloadWipExcel } from './routes/wipReport.js';
import { getScrapEntries, createScrapEntry, updateScrapEntry, deleteScrapEntry, exportScrapExcel } from './routes/scrap.js';
import { getReturnEntries, createReturnEntry, deleteReturnEntry, replenishReturnEntry } from './routes/returns.js';
import { getReworkEntries, createReworkEntry, updateReworkEntry, deleteReworkEntry, exportReworkExcel } from './routes/rework.js';
import { getRndProducts, createRndProduct, updateRndProduct, deleteRndProduct, getRndEntries, createRndEntry, updateRndEntry, deleteRndEntry, exportRndExcel } from './routes/rnd.js';
import { getBoms, createBom, updateBom, deleteBom } from './routes/boms.js';
import { visionUpload, extractFromImage } from './routes/vision.js';
import { initScheduler, runBackupJob } from './scheduler.js';
import { mkdirSync } from 'fs';

// Ensure data directory exists (Locally only, as Vercel is read-only)
if (!process.env.VERCEL) {
  try { mkdirSync('./data', { recursive: true }); } catch (err) {}
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true, // Always reflect the request origin to fix Vercel dynamic URLs permanently
  credentials: true
}));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// --- Auth ---
app.post('/api/auth/login', login);

// --- MOs ---
app.get('/api/mos', getMOs);
app.post('/api/mos', createMO);
app.post('/api/mos/bulk', createMOBulk);
app.put('/api/mos/:id', updateMO);
app.delete('/api/mos/:id', deleteMO);
app.post('/api/mos/parse-sku', parseSKUPreview);

// --- Scrap ---
app.get('/api/scrap', getScrapEntries);
app.post('/api/scrap', createScrapEntry);
app.put('/api/scrap/:id', updateScrapEntry);
app.delete('/api/scrap/:id', deleteScrapEntry);
app.get('/api/scrap/export', exportScrapExcel);

// --- Returns ---
app.get('/api/returns', getReturnEntries);
app.post('/api/returns', createReturnEntry);
app.put('/api/returns/:id/replenish', replenishReturnEntry);
app.delete('/api/returns/:id', deleteReturnEntry);

// --- Rework ---
app.get('/api/rework', getReworkEntries);
app.post('/api/rework', createReworkEntry);
app.put('/api/rework/:id', updateReworkEntry);
app.delete('/api/rework/:id', deleteReworkEntry);
app.get('/api/rework/export', exportReworkExcel);

// --- R&D ---
app.get('/api/rnd/products', getRndProducts);
app.post('/api/rnd/products', createRndProduct);
app.put('/api/rnd/products/:id', updateRndProduct);
app.delete('/api/rnd/products/:id', deleteRndProduct);
app.get('/api/rnd/entries', getRndEntries);
app.post('/api/rnd/entries', createRndEntry);
app.put('/api/rnd/entries/:id', updateRndEntry);
app.delete('/api/rnd/entries/:id', deleteRndEntry);
app.get('/api/rnd/export', exportRndExcel);

// --- BOMs ---
app.get('/api/boms', getBoms);
app.post('/api/boms', createBom);
app.put('/api/boms/:id', updateBom);
app.delete('/api/boms/:id', deleteBom);

// --- Admin: Config ---
app.get('/api/admin/config', getConfig);
app.post('/api/admin/config', updateConfig);

// --- Admin: Users ---
app.get('/api/admin/users', getUsers);
app.post('/api/admin/users', createUser);
app.put('/api/admin/users/:id', updateUser);
app.delete('/api/admin/users/:id', deleteUser);

// --- Admin: Components ---
app.get('/api/admin/components', getComponents);
app.post('/api/admin/components/manage', manageComponents);

// --- Admin: Audit ---
app.get('/api/admin/audit', getAuditLogs);
app.delete('/api/admin/audit', deleteAuditLogs);

// --- Admin: Backup ---
app.get('/api/admin/backup', backupDatabase);
app.get('/api/admin/test-backup', async (req, res) => {
  await runBackupJob();
  res.json({ message: 'Backup job triggered manually. Check server logs.' });
});

// --- Admin: DB Manager & Trash ---
app.post('/api/admin/db/action', handleDbAction);
app.get('/api/admin/trash', getTrash);
app.post('/api/admin/trash/action', handleTrashAction);
app.post('/api/admin/wipe-all', wipeAllData);

// --- Stats ---
app.get('/api/stats', getStats);
app.get('/api/stats/report', getReport);
app.get('/api/stats/wip-excel', downloadWipExcel);

// --- Vision (Image Scan → Cohere AI) ---
app.post('/api/vision/extract', visionUpload, extractFromImage);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({ 
    message: 'Internal Server Error',
    details: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\n✅ MfgPlan Server running at http://localhost:${PORT}\n`);
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });

  // Start scheduler only if not on Vercel
  // (Vercel requires serverless Cron config instead of node-cron)
  initScheduler();
}

export default app;
