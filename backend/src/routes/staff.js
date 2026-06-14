import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

export const staffRoutes = new Hono();
staffRoutes.use('*', authMiddleware);

staffRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const staff = await c.env.DB.prepare('SELECT id, shop_id, name, username, email, phone, role, salary, joining_date, status, created_at FROM staff WHERE shop_id = ? ORDER BY name').bind(shopId).all();
  return c.json(staff.results);
});

staffRoutes.post('/', checkPermission('staff'), async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { name, username, email, password, phone, role, salary, joining_date } = body;
  if (!name) return c.json({ message: 'Name is required' }, 400);

  const bcrypt = await import('bcryptjs');
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const result = await c.env.DB.prepare(
    'INSERT INTO staff (shop_id, name, username, email, password, phone, role, salary, joining_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(shopId, name, username || null, email || null, hashedPassword, phone || null, role || 'Staff', salary || null, joining_date || null).run();

  const staff = await c.env.DB.prepare('SELECT id, shop_id, name, username, email, phone, role, salary, joining_date, status, created_at FROM staff WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(staff, 201);
});

staffRoutes.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const staff = await c.env.DB.prepare('SELECT id, shop_id, name, username, email, phone, role, salary, joining_date, status, created_at FROM staff WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!staff) return c.json({ message: 'Staff not found' }, 404);
  return c.json(staff);
});

staffRoutes.put('/:id', checkPermission('staff'), async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT * FROM staff WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Staff not found' }, 404);

  const { name, username, email, phone, role, salary, joining_date, status } = body;
  await c.env.DB.prepare(
    'UPDATE staff SET name = ?, username = ?, email = ?, phone = ?, role = ?, salary = ?, joining_date = ?, status = ? WHERE id = ?'
  ).bind(
    name || existing.name, username || existing.username, email || existing.email, phone || existing.phone,
    role || existing.role, salary !== undefined ? salary : existing.salary, joining_date || existing.joining_date,
    status || existing.status, id
  ).run();

  const staff = await c.env.DB.prepare('SELECT id, shop_id, name, username, email, phone, role, salary, joining_date, status, created_at FROM staff WHERE id = ?').bind(id).first();
  return c.json(staff);
});

staffRoutes.delete('/:id', checkPermission('staff'), async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM staff WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Staff not found' }, 404);
  await c.env.DB.prepare('DELETE FROM staff WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Staff deleted' });
});
