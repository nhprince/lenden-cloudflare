import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const reportRoutes = new Hono();
reportRoutes.use('*', authMiddleware);

// GET /api/reports/dashboard
reportRoutes.get('/dashboard', async (c) => {
  const shopId = c.get('shopId');
  const today = new Date().toISOString().split('T')[0];

  const [sales] = await c.env.DB.prepare(
    "SELECT SUM(amount) as total, COUNT(*) as count FROM transactions WHERE shop_id = ? AND type = 'sale' AND DATE(date) = ?"
  ).bind(shopId, today).all();

  const [expenses] = await c.env.DB.prepare(
    "SELECT SUM(amount) as total FROM transactions WHERE shop_id = ? AND type = 'expense' AND DATE(date) = ?"
  ).bind(shopId, today).all();

  const [purchases] = await c.env.DB.prepare(
    "SELECT SUM(amount) as total FROM transactions WHERE shop_id = ? AND type = 'purchase' AND DATE(date) = ?"
  ).bind(shopId, today).all();

  const [customers] = await c.env.DB.prepare('SELECT COUNT(*) as count FROM customers WHERE shop_id = ?').bind(shopId).all();
  const [products] = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE shop_id = ?').bind(shopId).all();
  const [lowStock] = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level').bind(shopId).all();
  const [totalDue] = await c.env.DB.prepare('SELECT SUM(total_due) as total FROM customers WHERE shop_id = ?').bind(shopId).all();
  const [totalPayable] = await c.env.DB.prepare('SELECT SUM(total_payable) as total FROM vendors WHERE shop_id = ?').bind(shopId).all();

  return c.json({
    today_sales: sales.results[0]?.total || 0,
    today_sales_count: sales.results[0]?.count || 0,
    today_expenses: expenses.results[0]?.total || 0,
    today_purchases: purchases.results[0]?.total || 0,
    today_profit: (sales.results[0]?.total || 0) - (expenses.results[0]?.total || 0) - (purchases.results[0]?.total || 0),
    total_customers: customers.results[0]?.count || 0,
    total_products: products.results[0]?.count || 0,
    low_stock_count: lowStock.results[0]?.count || 0,
    total_due: totalDue.results[0]?.total || 0,
    total_payable: totalPayable.results[0]?.total || 0,
  });
});

// GET /api/reports/sales
reportRoutes.get('/sales', async (c) => {
  const shopId = c.get('shopId');
  const { start_date, end_date, group = 'day' } = c.req.query();

  let dateFormat;
  if (group === 'month') dateFormat = "%Y-%m";
  else if (group === 'year') dateFormat = "%Y";
  else dateFormat = "%Y-%m-%d";

  let sql = `SELECT ${dateFormat} as period, SUM(amount) as total_sales, COUNT(*) as count, SUM(amount - (SELECT COALESCE(SUM(cost_price * quantity), 0) FROM transaction_items ti JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = t.id)) as profit FROM transactions t WHERE shop_id = ? AND type = 'sale'`;
  const params = [shopId];

  if (start_date) { sql += ' AND DATE(t.date) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(t.date) <= ?'; params.push(end_date); }

  sql += ` GROUP BY period ORDER BY period DESC LIMIT 30`;
  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.results);
});

// GET /api/reports/expenses
reportRoutes.get('/expenses', async (c) => {
  const shopId = c.get('shopId');
  const { start_date, end_date } = c.req.query();

  let sql = "SELECT DATE(date) as date, SUM(amount) as total, description FROM transactions WHERE shop_id = ? AND type = 'expense'";
  const params = [shopId];
  if (start_date) { sql += ' AND DATE(date) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(date) <= ?'; params.push(end_date); }
  sql += ' GROUP BY DATE(date) ORDER BY date DESC LIMIT 50';
  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.results);
});

// GET /api/reports/profit
reportRoutes.get('/profit', async (c) => {
  const shopId = c.get('shopId');
  const { start_date, end_date } = c.req.query();

  let sql = "SELECT DATE(date) as date, SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as total_sales, SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses, SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_purchases FROM transactions WHERE shop_id = ?";
  const params = [shopId];
  if (start_date) { sql += ' AND DATE(date) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(date) <= ?'; params.push(end_date); }
  sql += ' GROUP BY DATE(date) ORDER BY date DESC LIMIT 30';
  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.results.map(r => ({ ...r, profit: r.total_sales - r.total_expenses - r.total_purchases })));
});

// GET /api/reports/inventory
reportRoutes.get('/inventory', async (c) => {
  const shopId = c.get('shopId');
  const products = await c.env.DB.prepare(
    'SELECT id, name, category, stock_quantity, cost_price, selling_price, (stock_quantity * cost_price) as stock_value FROM products WHERE shop_id = ? ORDER BY stock_quantity ASC'
  ).bind(shopId).all();
  return c.json(products.results);
});

// GET /api/reports/export
reportRoutes.get('/export', async (c) => {
  const shopId = c.get('shopId');
  const { type = 'transactions', start_date, end_date } = c.req.query();

  let sql = 'SELECT * FROM transactions WHERE shop_id = ?';
  const params = [shopId];
  if (start_date) { sql += ' AND DATE(date) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(date) <= ?'; params.push(end_date); }
  if (type !== 'transactions') { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY date DESC';
  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.results);
});
