import db, { randomUUID } from '../db.js';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password required' });

    if (!db.data || !Array.isArray(db.data.users)) {
      return res.status(503).json({ message: 'Database is not ready. Please try again in a moment.' });
    }

    const user = db.data.users.find(u => 
      u.employeeId.toLowerCase() === employeeId.toLowerCase() && 
      u.password === password
    );
    
    if (!user) {
      console.warn(`[Auth] Failed login attempt for ID: ${employeeId}`);
      return res.status(401).json({ message: 'Invalid credentials. Please check your ID and password.' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await db.write();

    // Add audit log (guard against missing auditLogs array)
    if (!Array.isArray(db.data.auditLogs)) db.data.auditLogs = [];
    db.data.auditLogs.unshift({ id: randomUUID(), action: `${user.fullName} logged in`, user: user.fullName, time: new Date().toISOString() });
    await db.write();

    res.json({ success: true, user: { id: user.id, employeeId: user.employeeId, role: user.role, fullName: user.fullName } });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ message: 'An internal server error occurred. Please try again.' });
  }
};
