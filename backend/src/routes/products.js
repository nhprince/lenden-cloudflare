import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';
import { createLowStockNotification } from '../services/notificationService.js';
import { sendEmail } from '../utils/emailService.js';

export const productRoutes = new Hono();
productRoutes.use('*', authMiddleware);

// GET /api/products
productRoutes.get('/', async (c) => {
  const shop_id = c.get('shopId');
  if (!shop_id) return c.json({ message: 'Shop ID required' }, 400);

  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
  const offset = parseInt(c.req.query('offset') || '0');
  const low_stock = c.req.query('low_stock') === 'true';
  const search = c.req.query('search');

  let query = 'SELECT * FROM products WHERE shop_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE shop_id = ?';
  const params = [shop_id];

  if (low_stock) {
    query += ' AND stock_quantity <= min_stock_level';
    countQuery += ' AND stock_quantity <= min_stock_level';
  }
  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ?)';
    countQuery += ' AND (name LIKE ? OR sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const countResult = await c.env.DB.prepare(countQuery).bind(...params).all();
  const total = countResult.results[0]?.total || 0;
  params.push(limit, offset);
  const products = await c.env.DB.prepare(query).bind(...params).all();

  const userRole = String(c.get('user').role).toLowerCase();
  const processed = (userRole === 'owner' || userRole === 'admin')
    ? products.results
    : products.results.map(({ cost_price, material_cost, ...rest }) => rest);

  return c.json({ products: processed, pagination: { total, limit, offset, hasMore: (offset + limit) < total } });
});

// POST /api/products
productRoutes.post('/', async (c) => {
  const shop_id = c.get('shopId');
  if (!shop_id) return c.json({ message: 'Shop ID required' }, 400);

  const body = await c.req.json();
  const { name, category, sku, cost_price, selling_price, stock_quantity, unit, engine_no, chassis_no, model_year, min_stock_level, material_cost, image_url } = body;

  if (!name || !sku) return c.json({ message: 'Name and SKU are required' }, 400);
  if (!selling_price || selling_price < 0) return c.json({ message: 'Valid selling price is required' }, 400);

  const userRole = c.get('user').role;
  const finalCostPrice = (userRole === 'Staff') ? 0 : (parseFloat(cost_price) || 0);
  const finalMaterialCost = (userRole === 'Staff') ? 0 : (material_cost ? parseFloat(material_cost) : null);

  const result = await c.env.DB.prepare(
    'INSERT INTO products (shop_id, name, category, sku, cost_price, selling_price, stock_quantity, unit, engine_no, chassis_no, model_year, min_stock_level, material_cost, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(shop_id, name, category || 'General', sku, finalCostPrice, selling_price, parseInt(stock_quantity) || 0, unit || 'pcs', engine_no || null, chassis_no || null, model_year || null, parseInt(min_stock_level) || 5, finalMaterialCost, image_url || null).run();

  return c.json({ message: 'Product added successfully', productId: result.meta.last_row_id }, 201);
});

// GET /api/products/:id
productRoutes.get('/:id', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!product) return c.json({ message: 'Product not found' }, 404);
  return c.json(product);
});

// PUT /api/products/:id
productRoutes.put('/:id', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, category, sku, cost_price, selling_price, stock_quantity, unit, engine_no, chassis_no, model_year, min_stock_level, image_url } = body;

  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').bind(id, shop_id).first();
  if (!existing) return c.json({ message: 'Product not found' }, 404);

  const userRole = c.get('user').role;
  const finalCostPrice = (userRole === 'Staff') ? existing.cost_price : (cost_price || existing.cost_price);

  await c.env.DB.prepare(
    'UPDATE products SET name=?, category=?, sku=?, cost_price=?, selling_price=?, stock_quantity=?, unit=?, engine_no=?, chassis_no=?, model_year=?, min_stock_level=?, image_url=? WHERE id=? AND shop_id=?'
  ).bind(
    name || existing.name, category || existing.category, sku || existing.sku,
    finalCostPrice, selling_price || existing.selling_price, stock_quantity !== undefined ? stock_quantity : existing.stock_quantity,
    unit || existing.unit, engine_no || existing.engine_no, chassis_no || existing.chassis_no,
    model_year || existing.model_year, min_stock_level || existing.min_stock_level, image_url || existing.image_url,
    id, shop_id
  ).run();

  // Low stock alert
  if (stock_quantity <= (min_stock_level || existing.min_stock_level)) {
    try {
      await createLowStockNotification({ shop_id, product_name: name || existing.name, current_stock: stock_quantity, min_stock: min_stock_level || existing.min_stock_level, product_id: parseInt(id) }, c.env);
    } catch (e) { console.error('Low stock alert error:', e); }
  }

  return c.json({ message: 'Product updated successfully' });
});

// DELETE /api/products/:id
productRoutes.delete('/:id', checkPermission('delete_product'), async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').bind(id, shop_id).run();
  return c.json({ message: 'Product deleted' });
});

// POST /api/products/:id/image
productRoutes.post('/:id/image', async (c) => {
  const shop_id = c.get('shopId');
  const id = c.req.param('id');
  const formData = await c.req.formData();
  const file = formData.get('image');
  if (!file || !(file instanceof File)) return c.json({ message: 'No file uploaded' }, 400);

  const ext = file.name?.split('.').pop() || 'png';
  const filename = `products/product-${id}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
  // Note: R2 not configured yet, store as base64 data URL
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const imageUrl = `data:${file.type};base64,${base64.substring(0, 100)}...`;

  await c.env.DB.prepare('UPDATE products SET image_url = ? WHERE id = ? AND shop_id = ?').bind(imageUrl, id, shop_id).run();
  return c.json({ message: 'Product image uploaded', imageUrl });
});

// GET /api/products/low-stock
productRoutes.get('/low-stock', async (c) => {
  const shop_id = c.get('shopId');
  const products = await c.env.DB.prepare('SELECT * FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level ORDER BY stock_quantity ASC').bind(shop_id).all();
  return c.json(products.results);
});
