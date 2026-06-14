import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const serviceRoutes = new Hono();
serviceRoutes.use('*', authMiddleware);

serviceRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const services = await c.env.DB.prepare('SELECT * FROM services WHERE shop_id = ? ORDER BY name').bind(shopId).all();
  return c.json(services.results);
});

serviceRoutes.post('/', async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { name, description, service_charge } = body;
  if (!name || !service_charge) return c.json({ message: 'Name and service charge are required' }, 400);

  const result = await c.env.DB.prepare(
    'INSERT INTO services (shop_id, name, description, service_charge) VALUES (?, ?, ?, ?)'
  ).bind(shopId, name, description || null, service_charge).run();

  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(service, 201);
});

serviceRoutes.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!service) return c.json({ message: 'Service not found' }, 404);
  return c.json(service);
});

serviceRoutes.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Service not found' }, 404);

  const { name, description, service_charge } = body;
  await c.env.DB.prepare('UPDATE services SET name = ?, description = ?, service_charge = ? WHERE id = ?')
    .bind(name || existing.name, description || existing.description, service_charge || existing.service_charge, id).run();

  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
  return c.json(service);
});

serviceRoutes.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Service not found' }, 404);
  await c.env.DB.prepare('DELETE FROM services WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Service deleted' });
});
