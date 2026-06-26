import db, { randomUUID } from '../db.js';

// GET /api/admin/config
export const getConfig = (req, res) => {
  res.json(db.data.config);
};

// POST /api/admin/config
export const updateConfig = async (req, res) => {
  const { fixedBattery, fixedPCBA, autoMode, bomMode } = req.body;
  if (fixedBattery !== undefined) db.data.config.fixedBattery = fixedBattery;
  if (fixedPCBA !== undefined) db.data.config.fixedPCBA = fixedPCBA;
  if (autoMode !== undefined) db.data.config.autoMode = autoMode;
  if (bomMode !== undefined) db.data.config.bomMode = bomMode;
  
  const modeLabel = db.data.config.bomMode ? 'BOM MODE' : (db.data.config.autoMode ? 'AUTO-BATTERY MODE' : 'FIXED MODE');
  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Config updated: Battery=${db.data.config.fixedBattery}, PCBA=${db.data.config.fixedPCBA}, Mode=${modeLabel}`,
    user: 'Admin',
    time: new Date().toISOString()
  });
  await db.write();
  res.json({ success: true, config: db.data.config });
};

// GET /api/admin/users
export const getUsers = (req, res) => {
  const users = db.data.users.map(u => ({ ...u, password: undefined }));
  res.json(users);
};

// POST /api/admin/users
export const createUser = async (req, res) => {
  const { employeeId, password, role, fullName } = req.body;
  if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required' });
  const exists = db.data.users.find(u => u.employeeId === employeeId);
  if (exists) return res.status(409).json({ message: 'Employee ID already exists' });

  const newUser = { id: randomUUID(), employeeId, password, role: role || 'user', fullName: fullName || employeeId, status: 'Active', createdAt: new Date().toISOString(), lastLogin: null };
  db.data.users.push(newUser);
  db.data.auditLogs.unshift({ id: randomUUID(), action: `New user created: ${employeeId} (${role || 'user'})`, user: 'Admin', time: new Date().toISOString() });
  await db.write();
  res.json({ success: true, user: { ...newUser, password: undefined } });
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, role, status, password } = req.body;
  const user = db.data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (fullName) user.fullName = fullName;
  if (role) user.role = role;
  if (status) user.status = status;
  if (password) user.password = password;
  await db.write();
  res.json({ success: true, user: { ...user, password: undefined } });
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const idx = db.data.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });
  db.data.users.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};

// GET /api/admin/components
export const getComponents = (req, res) => {
  res.json(db.data.components);
};

// POST /api/admin/components/manage
export const manageComponents = async (req, res) => {
  const { category, action, id, name, status } = req.body;
  
  const now = new Date().toISOString().split('T')[0];

  if (action === 'addCategory') {
    if (!db.data.components[category]) {
      db.data.components[category] = [];
    }
    db.data.auditLogs.unshift({
      id: randomUUID(),
      action: `Category created: [${category}]`,
      user: 'Admin',
      time: new Date().toISOString()
    });
    await db.write();
    return res.json({ success: true, components: db.data.components });
  }

  if (!db.data.components[category]) return res.status(400).json({ message: 'Invalid category' });

  const arr = db.data.components[category];
  if (action === 'add') {
    arr.push({ id: randomUUID().split('-')[0], name, status: status || 'Active', updatedAt: now });
    } else if (action === 'edit') {
      const item = arr.find(x => x.id === id);
      if (item) {
        if (name) item.name = name;
        if (status) item.status = status;
        item.updatedAt = now;
      }
    } else if (action === 'delete') {
      const idx = arr.findIndex(x => x.id === id);
      if (idx !== -1) arr.splice(idx, 1);
    }

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Component ${action}: [${category}] ${name || id}`,
    user: 'Admin',
    time: new Date().toISOString()
  });

  await db.write();
  res.json({ success: true, components: db.data.components });
};


// GET /api/admin/audit
export const getAuditLogs = (req, res) => {
  let logs = db.data.auditLogs;
  const { startDate, endDate } = req.query;
  if (startDate && endDate) {
    logs = logs.filter(l => {
      const d = l.time.split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }
  res.json(logs.slice(0, 500));
};

// DELETE /api/admin/audit
export const deleteAuditLogs = async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });
  
  const initialLength = db.data.auditLogs.length;
  db.data.auditLogs = db.data.auditLogs.filter(l => {
    const d = l.time.split('T')[0];
    return !(d >= startDate && d <= endDate);
  });
  
  const deletedCount = initialLength - db.data.auditLogs.length;
  await db.write();
  res.json({ success: true, deletedCount });
};

// GET /api/admin/backup
export const backupDatabase = (req, res) => {
  res.download('./data/db.json', `MfgPlan_Backup_${new Date().toISOString().split('T')[0]}.json`);
};

// POST /api/admin/db/action
export const handleDbAction = async (req, res) => {
  const { action, type, ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

  const getSourceArray = (t) => {
    switch (t) {
      case 'mo': return db.data.moEntries;
      case 'scrap': return db.data.scrapEntries;
      case 'rework': return db.data.reworkEntries;
      case 'return': return db.data.returnEntries;
      default: return null;
    }
  };

  const sourceArray = getSourceArray(type);
  if (!sourceArray) return res.status(400).json({ message: 'Invalid data type' });

  if (!db.data.trashEntries) db.data.trashEntries = [];

  if (action === 'trash') {
    const toTrash = sourceArray.filter(item => ids.includes(item.id));
    toTrash.forEach(item => {
      db.data.trashEntries.push({ ...item, originalSource: type, trashedAt: new Date().toISOString() });
    });
  }

  // Remove from original array (applies to both 'trash' and 'delete')
  const newArray = sourceArray.filter(item => !ids.includes(item.id));
  if (type === 'mo') db.data.moEntries = newArray;
  else if (type === 'scrap') db.data.scrapEntries = newArray;
  else if (type === 'rework') db.data.reworkEntries = newArray;
  else if (type === 'return') db.data.returnEntries = newArray;

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Bulk ${action} applied to ${ids.length} ${type} entries`,
    user: req.body.submittedBy || 'Admin',
    time: new Date().toISOString()
  });

  await db.write();
  res.json({ success: true });
};

// GET /api/admin/trash
export const getTrash = (req, res) => {
  res.json(db.data.trashEntries || []);
};

// POST /api/admin/trash/action
export const handleTrashAction = async (req, res) => {
  const { action, ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

  if (!db.data.trashEntries) db.data.trashEntries = [];

  if (action === 'restore') {
    const toRestore = db.data.trashEntries.filter(item => ids.includes(item.id));
    toRestore.forEach(item => {
      const type = item.originalSource;
      const { originalSource, trashedAt, ...originalItem } = item;
      
      if (type === 'mo') db.data.moEntries.push(originalItem);
      else if (type === 'scrap') db.data.scrapEntries.push(originalItem);
      else if (type === 'rework') db.data.reworkEntries.push(originalItem);
      else if (type === 'return') db.data.returnEntries.push(originalItem);
    });
  }

  // Remove from trash (applies to both 'delete' and 'restore')
  db.data.trashEntries = db.data.trashEntries.filter(item => !ids.includes(item.id));

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `Bulk ${action} applied to ${ids.length} trashed items`,
    user: req.body.submittedBy || 'Admin',
    time: new Date().toISOString()
  });

  await db.write();
  res.json({ success: true });
};

// POST /api/admin/wipe-all
// Nuclear reset: wipes ALL moEntries, scrapEntries, returnEntries, trashEntries
export const wipeAllData = async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'WIPE_ALL_CONFIRMED') {
    return res.status(400).json({ message: 'Missing confirmation token' });
  }

  const moCnt     = (db.data.moEntries     || []).length;
  const scrapCnt  = (db.data.scrapEntries  || []).length;
  const reworkCnt = (db.data.reworkEntries || []).length;
  const returnCnt = (db.data.returnEntries || []).length;
  const trashCnt  = (db.data.trashEntries  || []).length;

  db.data.moEntries     = [];
  db.data.scrapEntries  = [];
  db.data.reworkEntries = [];
  db.data.returnEntries = [];
  db.data.trashEntries  = [];

  db.data.auditLogs.unshift({
    id: randomUUID(),
    action: `⚠️ FULL DATABASE WIPE: Deleted ${moCnt} MOs, ${scrapCnt} Scrap, ${reworkCnt} Rework, ${returnCnt} Returns, ${trashCnt} Trash`,
    user: req.body.submittedBy || 'Admin',
    time: new Date().toISOString(),
  });

  await db.write();
  res.json({ success: true, deleted: { mo: moCnt, scrap: scrapCnt, rework: reworkCnt, returns: returnCnt, trash: trashCnt } });
};

// GET /api/admin/sync-may-data
// One-time utility to inject May historical MOs into the live database 
export const syncMayData = async (req, res) => {
  try {
    // Statically import the data so Vercel bundler always includes it in the lambda
    const { mayData } = await import('./may_backup.js');
    
    if (!mayData || !mayData.mayMOs) {
      return res.status(404).json({ message: 'May backup data is empty or invalid.' });
    }
    const mayMOs = mayData.mayMOs || [];
    
    let addedCount = 0;
    mayMOs.forEach(mayMo => {
      // Prevent duplicates
      if (!db.data.moEntries.find(m => m.id === mayMo.id || m.moNumber === mayMo.moNumber)) {
        db.data.moEntries.push(mayMo);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      db.data.auditLogs.unshift({
        id: randomUUID(),
        action: `Sync: Injected ${addedCount} historical May MOs into live database`,
        user: 'System Admin',
        time: new Date().toISOString(),
      });
      await db.write();
    }
    
    res.json({ success: true, message: `Successfully synced ${addedCount} May MOs to the live server!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to sync May data.' });
  }
};
