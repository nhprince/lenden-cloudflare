import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

export const shopRoutes = new Hono();
shopRoutes.use('*', authMiddleware);

// GET /api/shops
shopRoutes.get('/', async (c) => {
  const owner_id = c.get('user').id;
  const shops = await c.env.DB.prepare('SELECT * FROM shops WHERE owner_id = ?').bind(owner_id).all();
  return c.json(shops.results);
});

// POST /api/shops
shopRoutes.post('/', checkPermission('manage_shop_settings'), async (c) => {
  const owner_id = c.get('user').id;
  const { name, business_type, address, phone } = await c.req.json();
  if (!name) return c.json({ message: 'Shop name is required' }, 400);

  const result = await c.env.DB.prepare(
    'INSERT INTO shops (owner_id, name, business_type, address, phone) VALUES (?, ?, ?, ?, ?)'
  ).bind(owner_id, name, business_type || 'general', address || null, phone || null).run();

  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(shop, 201);
});

// GET /api/shops/:id
shopRoutes.get('/:id', async (c) => {
  const owner_id = c.get('user').id;
  const id = c.req.param('id');
  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).first();
  if (!shop) return c.json({ message: 'Shop not found' }, 404);
  return c.json(shop);
});

// PUT /api/shops/:id
shopRoutes.put('/:id', checkPermission('manage_shop_settings'), async (c) => {
  const owner_id = c.get('user').id;
  const id = c.req.param('id');
  const { name, business_type, address, phone } = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).first();
  if (!existing) return c.json({ message: 'Shop not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE shops SET name = ?, business_type = ?, address = ?, phone = ? WHERE id = ?'
  ).bind(name || existing.name, business_type || existing.business_type, address || existing.address, phone || existing.phone, id).run();

  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first();
  return c.json(shop);
});

// DELETE /api/shops/:id
shopRoutes.delete('/:id', checkPermission('manage_shop_settings'), async (c) => {
  const owner_id = c.get('user').id;
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).first();
  if (!existing) return c.json({ message: 'Shop not found' }, 404);

  await c.env.DB.prepare('DELETE FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).run();
  return c.json({ message: 'Shop deleted' });
});

// POST /api/shops/:id/switch
shopRoutes.post('/:id/switch', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  if (user.role === 'Staff' || user.role === 'staff') {
    if (String(user.shopId) !== String(id)) {
      return c.json({ message: 'Access denied: You are not assigned to this shop' }, 403);
    }
  } else {
    const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, user.id).first();
    if (!shop) return c.json({ message: 'Shop not found' }, 404);
  }

  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first();
  return c.json({ message: 'Shop switched', shop });
});

// GET /api/shops/:id/settings
shopRoutes.get('/:id/settings', async (c) => {
  const owner_id = c.get('user').id;
  const id = c.req.param('id');
  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).first();
  if (!shop) return c.json({ message: 'Shop not found' }, 404);
  return c.json(shop);
});

// PUT /api/shops/:id/settings
shopRoutes.put('/:id/settings', checkPermission('manage_shop_settings'), async (c) => {
  const owner_id = c.get('user').id;
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ? AND owner_id = ?').bind(id, owner_id).first();
  if (!existing) return c.json({ message: 'Shop not found' }, 404);

  const { name, business_type, address, phone } = body;
  await c.env.DB.prepare(
    'UPDATE shops SET name = ?, business_type = ?, address = ?, phone = ? WHERE id = ?'
  ).bind(name || existing.name, business_type || existing.business_type, address || existing.address, phone || existing.phone, id).run();

  const shop = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first();
  return c.json(shop);
});
