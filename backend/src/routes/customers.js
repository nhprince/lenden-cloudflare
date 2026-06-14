import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const customerRoutes = new Hono();
customerRoutes.use('*', authMiddleware);

// GET /api/customers
customerRoutes.get('/', async (c) => {
  const shop_id = c.get('shopId');
  const { search, limit = 50, offset = 0 } = c.req.query();

  let sql = 'SELECT * FROM customers WHERE shop_id = ?';
  const params = [shop_id];

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const customers = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(customers.results);
});

// POST /api/customers
customerRoutes.post('/', async (c) => {
  const shop_id = c.get('shopId');
  const { name, phone, address } = await c.req.json();
  if (!name) return c.json({ message: 'Name is required' }, 400);

  const result = await c.env.DB.prepare(
    'INSERT INTO customers (shop_id, name, phone, address) VALUES (?, ?, ?, ?)'
  ).bind(shop_id, name, phone || null, address || null).run();

  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(customer, 201);
});

// GET /api/customers/:id
customerRoutes.get('/:id', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!customer) return c.json({ message: 'Customer not found' }, 404);
  return c.json(customer);
});

// PUT /api/customers/:id
customerRoutes.put('/:id', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const { name, phone, address } = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!existing) return c.json({ message: 'Customer not found' }, 404);

  await c.env.DB.prepare('UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ? AND shop_id = ?')
    .bind(name || existing.name, phone || existing.phone, address || existing.address, id, shop_id).run();

  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
  return c.json(customer);
});

// DELETE /api/customers/:id
customerRoutes.delete('/:id', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!existing) return c.json({ message: 'Customer not found' }, 404);

  await c.env.DB.prepare('DELETE FROM customers WHERE id = ? AND shop_id = ?').bind(id, shop_id).run();
  return c.json({ message: 'Customer deleted' });
});

// POST /api/customers/:id/payment - Record payment from customer
customerRoutes.post('/:id/payment', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const { amount, description, payment_method = 'cash' } = await c.req.json();

  if (!amount || amount <= 0) return c.json({ message: 'Valid amount is required' }, 400);

  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!customer) return c.json({ message: 'Customer not found' }, 404);

  // Record transaction
  await c.env.DB.prepare(
    'INSERT INTO transactions (shop_id, customer_id, type, amount, paid_amount, description, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(shop_id, id, 'payment_received', amount, amount, description || `Payment from ${customer.name}`, payment_method).run();

  // Update customer due
  await c.env.DB.prepare('UPDATE customers SET total_due = MAX(0, total_due - ?) WHERE id = ?').bind(amount, id).run();

  return c.json({ message: 'Payment recorded' });
});
