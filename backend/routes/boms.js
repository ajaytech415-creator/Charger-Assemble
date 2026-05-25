import db, { randomUUID } from '../db.js';

// GET /api/boms
export const getBoms = (req, res) => {
  res.json(db.data.boms || []);
};

// POST /api/boms
export const createBom = async (req, res) => {
  const { name, types, sizes, components } = req.body;
  if (!name || !types || !sizes || !components) return res.status(400).json({ message: 'Missing fields' });

  const bom = {
    id: `bom-${randomUUID()}`,
    name,
    types,
    sizes,
    components
  };

  if (!db.data.boms) db.data.boms = [];
  db.data.boms.push(bom);
  await db.write();

  res.json({ success: true, bom });
};

// PUT /api/boms/:id
export const updateBom = async (req, res) => {
  const { id } = req.params;
  const { name, types, sizes, components } = req.body;
  
  if (!db.data.boms) db.data.boms = [];
  const idx = db.data.boms.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ message: 'BOM not found' });

  db.data.boms[idx] = {
    ...db.data.boms[idx],
    name: name !== undefined ? name : db.data.boms[idx].name,
    types: types !== undefined ? types : db.data.boms[idx].types,
    sizes: sizes !== undefined ? sizes : db.data.boms[idx].sizes,
    components: components !== undefined ? components : db.data.boms[idx].components
  };

  await db.write();
  res.json({ success: true, bom: db.data.boms[idx] });
};

// DELETE /api/boms/:id
export const deleteBom = async (req, res) => {
  const { id } = req.params;
  if (!db.data.boms) db.data.boms = [];
  
  const idx = db.data.boms.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ message: 'BOM not found' });

  db.data.boms.splice(idx, 1);
  await db.write();
  res.json({ success: true });
};
