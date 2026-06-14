import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const vendorRoutes = new Hono();

// All routes require auth
vendorRoutes.use('*', authMiddleware);

// GET /api/vendors - List all vendors for current shop
vendorRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const vendors = await c.env.DB.prepare(
    'SELECT * FROM vendors WHERE shop_id = ? ORDER BY name'
  ).bind(shopId).all();
  return c.json(vendors.results);
});

// POST /api/vendors - Create vendor
vendorRoutes.post('/', async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { name, phone, company_name } = body;

  if (!name) return c.json({ message: 'Name is required' }, 400);

  const result = await c.env.DB.prepare(
    'INSERT INTO vendors (shop_id, name, phone, company_name) VALUES (?, ?, ?, ?)'
  ).bind(shopId, name, phone || null, company_name || null).run();

  const vendor = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json(vendor, 201);
});

// GET /api/vendors/:id - Get vendor details
vendorRoutes.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const vendor = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!vendor) return c.json({ message: 'Vendor not found' }, 404);
  return c.json(vendor);
});

// PUT /api/vendors/:id - Update vendor
vendorRoutes.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, phone, company_name } = body;

  const existing = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Vendor not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE vendors SET name = ?, phone = ?, company_name = ? WHERE id = ? AND shop_id = ?'
  ).bind(name || existing.name, phone || existing.phone, company_name || existing.company_name, id, shopId).run();

  const vendor = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ?').bind(id).first();
  return c.json(vendor);
});

// DELETE /api/vendors/:id
vendorRoutes.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Vendor not found' }, 404);

  await c.env.DB.prepare('DELETE FROM vendors WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
  return c.json({ message: 'Vendor deleted' });
});

// POST /api/vendors/:id/payment - Record payment to vendor
vendorRoutes.post('/:id/payment', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { amount, description } = body;

  if (!amount || amount <= 0) return c.json({ message: 'Valid amount is required' }, 400);

  const vendor = await c.env.DB.prepare('SELECT * FROM vendors WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!vendor) return c.json({ message: 'Vendor not found' }, 404);

  // Record transaction
  const txnResult = await c.env.DB.prepare(
    'INSERT INTO transactions (shop_id, vendor_id, type, amount, paid_amount, description, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(shop_id, id, 'payment_made', amount, amount, description || `Payment to ${vendor.name}`, 'cash').run();

  // Update vendor payable
  await c.env.DB.prepare(
    'UPDATE vendors SET total_payable = MAX(0, total_payable - ?) WHERE id = ?'
  ).bind(amount, id).run();

  return c.json({ message: 'Payment recorded', transaction_id: txnResult.meta.last_row_id }, 201);
});
