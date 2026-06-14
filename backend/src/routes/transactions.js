import { Hono } from 'hono';

export const transactionRoutes = new Hono();

// All routes require auth via Shop-Id header
transactionRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ message: 'No token, authorization denied' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const jwt = await import('@tsndr/cloudflare-worker-jwt');
    const isValid = await jwt.verify(token, c.env.JWT_SECRET);
    if (!isValid) return c.json({ message: 'Token is not valid' }, 401);
    const decoded = jwt.decode(token);
    c.set('user', decoded);

    const shopId = c.req.header('Shop-Id');
    if (shopId) {
      if (String(decoded.role).toLowerCase() === 'staff') {
        if (String(decoded.shopId) !== String(shopId)) {
          return c.json({ message: 'Access denied: You are not assigned to this shop' }, 403);
        }
      } else {
        const shops = await c.env.DB.prepare('SELECT id FROM shops WHERE id = ? AND owner_id = ?').bind(shopId, decoded.id).all();
        if (shops.results.length === 0) {
          return c.json({ message: 'Access denied: You do not own this shop' }, 403);
        }
      }
      c.set('shopId', shopId);
    }
    await next();
  } catch (err) {
    return c.json({ message: 'Token is not valid' }, 401);
  }
});

// GET /api/transactions - List transactions
transactionRoutes.get('/', async (c) => {
  const shopId = c.get('shopId');
  const { type, customer_id, vendor_id, start_date, end_date, limit = 50, offset = 0 } = c.req.query();

  let sql = 'SELECT t.*, c.name as customer_name, v.name as vendor_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN vendors v ON t.vendor_id = v.id WHERE t.shop_id = ?';
  const params = [shopId];

  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (customer_id) { sql += ' AND t.customer_id = ?'; params.push(customer_id); }
  if (vendor_id) { sql += ' AND t.vendor_id = ?'; params.push(vendor_id); }
  if (start_date) { sql += " AND DATE(t.date) >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND DATE(t.date) <= ?"; params.push(end_date); }

  sql += ' ORDER BY t.date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const transactions = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(transactions.results);
});

// POST /api/transactions - Create transaction
transactionRoutes.post('/', async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { type, amount, paid_amount = 0, customer_id, vendor_id, description, payment_method = 'cash', reference_no, items = [] } = body;

  if (!type || !amount) return c.json({ message: 'Type and amount are required' }, 400);

  const dueAmount = amount - paid_amount;

  const txnResult = await c.env.DB.prepare(
    'INSERT INTO transactions (shop_id, customer_id, vendor_id, type, amount, paid_amount, description, payment_method, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(shopId, customer_id || null, vendor_id || null, type, amount, paid_amount, description || null, payment_method, reference_no || null).run();

  const txnId = txnResult.meta.last_row_id;

  for (const item of items) {
    await c.env.DB.prepare(
      'INSERT INTO transaction_items (transaction_id, product_id, service_id, quantity, unit_price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(txnId, item.product_id || null, item.service_id || null, item.quantity, item.unit_price, item.cost_price || null, item.subtotal);

    if (type === 'sale' && item.product_id) {
      await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND shop_id = ?')
        .bind(item.quantity, item.product_id, shopId).run();
    }
    if (type === 'purchase' && item.product_id) {
      await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND shop_id = ?')
        .bind(item.quantity, item.product_id, shopId).run();
    }
  }

  if (type === 'sale' && customer_id && dueAmount > 0) {
    await c.env.DB.prepare('UPDATE customers SET total_due = total_due + ? WHERE id = ?').bind(dueAmount, customer_id).run();
  }
  if (type === 'purchase' && vendor_id && dueAmount > 0) {
    await c.env.DB.prepare('UPDATE vendors SET total_payable = total_payable + ? WHERE id = ?').bind(dueAmount, vendor_id).run();
  }

  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(txnId).first();
  return c.json(txn, 201);
});

// GET /api/transactions/:id
transactionRoutes.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const txn = await c.env.DB.prepare(
    'SELECT t.*, c.name as customer_name, v.name as vendor_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN vendors v ON t.vendor_id = v.id WHERE t.id = ? AND t.shop_id = ?'
  ).bind(id, shopId).first();
  if (!txn) return c.json({ message: 'Transaction not found' }, 404);

  const items = await c.env.DB.prepare(
    'SELECT ti.*, p.name as product_name, s.name as service_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id LEFT JOIN services s ON ti.service_id = s.id WHERE ti.transaction_id = ?'
  ).bind(id).all();

  return c.json({ ...txn, items: items.results });
});

// PUT /api/transactions/:id
transactionRoutes.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Transaction not found' }, 404);

  const { description, payment_method, reference_no } = await c.req.json();
  await c.env.DB.prepare('UPDATE transactions SET description = ?, payment_method = ?, reference_no = ? WHERE id = ?')
    .bind(description || existing.description, payment_method || existing.payment_method, reference_no || existing.reference_no, id).run();

  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  return c.json(txn);
});

// DELETE /api/transactions/:id
transactionRoutes.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Transaction not found' }, 404);

  const items = await c.env.DB.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').bind(id).all();
  for (const item of items.results) {
    if (item.product_id) {
      if (existing.type === 'sale') {
        await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').bind(item.quantity, item.product_id).run();
      } else if (existing.type === 'purchase') {
        await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').bind(item.quantity, item.product_id).run();
      }
    }
  }

  if (existing.type === 'sale' && existing.customer_id) {
    const dueAmount = existing.amount - existing.paid_amount;
    await c.env.DB.prepare('UPDATE customers SET total_due = MAX(0, total_due - ?) WHERE id = ?').bind(dueAmount, existing.customer_id).run();
  }
  if (existing.type === 'purchase' && existing.vendor_id) {
    const dueAmount = existing.amount - existing.paid_amount;
    await c.env.DB.prepare('UPDATE vendors SET total_payable = MAX(0, total_payable - ?) WHERE id = ?').bind(dueAmount, existing.vendor_id).run();
  }

  await c.env.DB.prepare('DELETE FROM transaction_items WHERE transaction_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
  return c.json({ message: 'Transaction deleted' });
});

// POST /api/transactions/:id/refund
transactionRoutes.post('/:id/refund', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');
  const { amount, reason } = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
  if (!existing) return c.json({ message: 'Transaction not found' }, 404);

  const refundAmount = amount || existing.amount;

  const refundResult = await c.env.DB.prepare(
    'INSERT INTO transactions (shop_id, customer_id, vendor_id, type, amount, paid_amount, description, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(shopId, existing.customer_id, existing.vendor_id, 'expense', refundAmount, refundAmount, 'Refund for TXN-' + id + ': ' + (reason || 'No reason'), 'cash').run();

  if (existing.type === 'sale') {
    const items = await c.env.DB.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').bind(id).all();
    for (const item of items.results) {
      if (item.product_id) {
        await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').bind(item.quantity, item.product_id).run();
      }
    }
    if (existing.customer_id) {
      await c.env.DB.prepare('UPDATE customers SET total_due = MAX(0, total_due - ?) WHERE id = ?').bind(refundAmount, existing.customer_id).run();
    }
  }

  return c.json({ message: 'Refund processed', refund_id: refundResult.meta.last_row_id }, 201);
});

