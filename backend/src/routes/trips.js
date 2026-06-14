import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const tripRoutes = new Hono();
tripRoutes.use('*', authMiddleware);

tripRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const { status } = c.req.query();
  let sql = 'SELECT t.*, c.name as customer_name FROM trips t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.shop_id = ?';
  const params = [shopId];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  sql += ' ORDER BY t.created_at DESC';
  const trips = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(trips.results);
});

tripRoutes.post('/', async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { vehicle_no, driver_name, destination, start_date, end_date, trip_fare, customer_id } = body;
  if (!vehicle_no || !trip_fare) return c.json({ message: 'Vehicle number and trip fare are required' }, 400);

  const result = await c.env.DB.prepare(
    'INSERT INTO trips (shop_id, vehicle_no, driver_name, destination, start_date, end_date, trip_fare, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(shopId, vehicle_no, driver_name || null, destination || null, start_date || null, end_date || null, trip_fare, customer_id || null).run();

  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(trip, 201);
});

tripRoutes.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const trip = await c.env.DB.prepare('SELECT t.*, c.name as customer_name FROM trips t LEFT JOIN customers c ON t.customer_id = c.id WHERE t.id = ? AND t.shop_id = ?').bind(id, shopId).first();
  if (!trip) return c.json({ message: 'Trip not found' }, 404);
  return c.json(trip);
});

tripRoutes.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Trip not found' }, 404);

  const { vehicle_no, driver_name, destination, start_date, end_date, trip_fare, expenses, customer_id, status } = body;
  await c.env.DB.prepare(
    'UPDATE trips SET vehicle_no = ?, driver_name = ?, destination = ?, start_date = ?, end_date = ?, trip_fare = ?, expenses = ?, customer_id = ?, status = ? WHERE id = ?'
  ).bind(
    vehicle_no || existing.vehicle_no, driver_name || existing.driver_name, destination || existing.destination,
    start_date || existing.start_date, end_date || existing.end_date, trip_fare || existing.trip_fare,
    expenses !== undefined ? expenses : existing.expenses, customer_id || existing.customer_id, status || existing.status, id
  ).run();

  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first();
  return c.json(trip);
});

tripRoutes.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Trip not found' }, 404);
  await c.env.DB.prepare('DELETE FROM trips WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Trip deleted' });
});

tripRoutes.post('/:id/complete', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Trip not found' }, 404);

  await c.env.DB.prepare("UPDATE trips SET status = 'completed', end_date = ? WHERE id = ?")
    .bind(new Date().toISOString().split('T')[0], id).run();

  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first();
  return c.json(trip);
});
