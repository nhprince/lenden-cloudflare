import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const reportRoutes = new Hono();
reportRoutes.use('*', authMiddleware);

// GET /api/reports/dashboard
reportRoutes.get('/dashboard', async (c) => {
  try {
    const shopId = c.get('shopId');
    const today = new Date().toISOString().split('T')[0];

    const sales = await c.env.DB.prepare(
      "SELECT SUM(amount) as total, COUNT(*) as count FROM transactions WHERE shop_id = ? AND type = 'sale' AND date >= ? AND date < ?"
    ).bind(shopId, today, today + 'T23:59:59').first();

    const expenses = await c.env.DB.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE shop_id = ? AND type = 'expense' AND date >= ? AND date < ?"
    ).bind(shopId, today, today + 'T23:59:59').first();

    const purchases = await c.env.DB.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE shop_id = ? AND type = 'purchase' AND date >= ? AND date < ?"
    ).bind(shopId, today, today + 'T23:59:59').first();

    const customers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM customers WHERE shop_id = ?').bind(shopId).first();
    const products = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE shop_id = ?').bind(shopId).first();
    const lowStock = await c.env.DB.prepare('SELECT COUNT(*) as count FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level').bind(shopId).first();
    const totalDue = await c.env.DB.prepare('SELECT SUM(total_due) as total FROM customers WHERE shop_id = ?').bind(shopId).first();
    const totalPayable = await c.env.DB.prepare('SELECT SUM(total_payable) as total FROM vendors WHERE shop_id = ?').bind(shopId).first();

    return c.json({
      today_sales: sales?.total || 0,
      today_sales_count: sales?.count || 0,
      today_expenses: expenses?.total || 0,
      today_purchases: purchases?.total || 0,
      today_profit: (sales?.total || 0) - (expenses?.total || 0) - (purchases?.total || 0),
      total_customers: customers?.count || 0,
      total_products: products?.count || 0,
      low_stock_count: lowStock?.count || 0,
      total_due: totalDue?.total || 0,
      total_payable: totalPayable?.total || 0,
    });
  } catch (err) {
    console.error('Dashboard error:', String(err).substring(0, 300));
    return c.json({ message: 'Server error', error: String(err).substring(0, 200) }, 500);
  }
});

// GET /api/reports/sales
reportRoutes.get('/sales', async (c) => {
  try {
    const shopId = c.get('shopId');
    const { start_date, end_date, group = 'day' } = c.req.query();

    let dateExpr;
    if (group === 'month') dateExpr = "strftime('%Y-%m', date)";
    else if (group === 'year') dateExpr = "strftime('%Y', date)";
    else dateExpr = "date(date)";

    let sql = `SELECT ${dateExpr} as period, SUM(amount) as total_sales, COUNT(*) as count FROM transactions WHERE shop_id = ? AND type = 'sale'`;
    const params = [shopId];

    if (start_date) { sql += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND date <= ?'; params.push(end_date); }

    sql += ' GROUP BY period ORDER BY period DESC LIMIT 30';
    const results = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json(results.results);
  } catch (err) {
    console.error('Sales report error:', String(err).substring(0, 300));
    return c.json({ message: 'Server error', error: String(err).substring(0, 200) }, 500);
  }
});

// GET /api/reports/expenses
reportRoutes.get('/expenses', async (c) => {
  try {
    const shopId = c.get('shopId');
    const { start_date, end_date } = c.req.query();

    let sql = "SELECT date(date) as date, SUM(amount) as total, description FROM transactions WHERE shop_id = ? AND type = 'expense'";
    const params = [shopId];
    if (start_date) { sql += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND date <= ?'; params.push(end_date); }
    sql += ' GROUP BY date(date) ORDER BY date DESC LIMIT 50';
    const results = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json(results.results);
  } catch (err) {
    console.error('Expenses report error:', String(err).substring(0, 300));
    return c.json({ message: 'Server error', error: String(err).substring(0, 200) }, 500);
  }
});

// GET /api/reports/profit
reportRoutes.get('/profit', async (c) => {
  try {
    const shopId = c.get('shopId');
    const { start_date, end_date } = c.req.query();

    let sql = "SELECT date(date) as date, SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as total_sales, SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses, SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_purchases FROM transactions WHERE shop_id = ?";
    const params = [shopId];
    if (start_date) { sql += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND date <= ?'; params.push(end_date); }
    sql += ' GROUP BY date(date) ORDER BY date DESC LIMIT 30';
    const results = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json(results.results.map(r => ({ ...r, profit: r.total_sales - r.total_expenses - r.total_purchases })));
  } catch (err) {
    console.error('Profit report error:', String(err).substring(0, 300));
    return c.json({ message: 'Server error', error: String(err).substring(0, 200) }, 500);
  }
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
  if (start_date) { sql += ' AND date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND date <= ?'; params.push(end_date); }
  if (type !== 'transactions') { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY date DESC';
  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.results);
});
