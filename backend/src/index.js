import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { shopRoutes } from './routes/shops.js';
import { productRoutes } from './routes/products.js';
import { customerRoutes } from './routes/customers.js';
import { vendorRoutes } from './routes/vendors.js';
import { transactionRoutes } from './routes/transactions.js';
import { serviceRoutes } from './routes/services.js';
import { tripRoutes } from './routes/trips.js';
import { staffRoutes } from './routes/staff.js';
import { reportRoutes } from './routes/reports.js';
import { notificationRoutes } from './routes/notifications.js';
import { backupRoutes } from './routes/backup.js';
import { createDailyReportNotification, createLowStockNotification } from './services/notificationService.js';
import { getEmailTemplate } from './utils/emailService.js';

const app = new Hono();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Shop-Id'],
  credentials: true,
}));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Lenden App API',
    status: 'running',
    version: '2.0.0',
    environment: 'production'
  });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/shops', shopRoutes);
app.route('/api/products', productRoutes);
app.route('/api/customers', customerRoutes);
app.route('/api/vendors', vendorRoutes);
app.route('/api/transactions', transactionRoutes);
app.route('/api/services', serviceRoutes);
app.route('/api/trips', tripRoutes);
app.route('/api/staff', staffRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/backup', backupRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ message: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker Error:', err);
  return c.json({ message: 'Internal server error' }, 500);
});

// Cron trigger handler
async function handleScheduled(event, env) {
  const cronType = event.cron;

  if (cronType === '0 22 * * *') {
    // Daily report at 10 PM UTC
    await runDailyReports(env);
  } else if (cronType === '0 9 1 * *') {
    // Monthly report on 1st at 9 AM UTC
    await runMonthlyReports(env);
  }
}

async function runDailyReports(env) {
  console.log('Running Daily Sales Summary Cron Job...');
  try {
    const shops = await env.DB.prepare('SELECT id, name, owner_id FROM shops').all();

    for (const shop of shops.results) {
      const users = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(shop.owner_id).all();
      if (users.results.length === 0) continue;
      const ownerEmail = users.results[0].email;

      const today = new Date().toISOString().split('T')[0];

      const sales = await env.DB.prepare(
        "SELECT SUM(amount) as total_sales, COUNT(*) as count FROM transactions WHERE shop_id = ? AND type = 'sale' AND DATE(date) = ?"
      ).bind(shop.id, today).all();

      const expenses = await env.DB.prepare(
        "SELECT SUM(amount) as total_expenses FROM transactions WHERE shop_id = ? AND type = 'expense' AND DATE(date) = ?"
      ).bind(shop.id, today).all();

      const purchases = await env.DB.prepare(
        "SELECT SUM(amount) as total_purchases FROM transactions WHERE shop_id = ? AND type = 'purchase' AND DATE(date) = ?"
      ).bind(shop.id, today).all();

      const totalSales = parseFloat(sales.results[0]?.total_sales) || 0;
      const totalTxns = parseInt(sales.results[0]?.count) || 0;
      const totalExpenses = parseFloat(expenses.results[0]?.total_expenses) || 0;
      const totalPurchases = parseFloat(purchases.results[0]?.total_purchases) || 0;
      const profit = totalSales - totalExpenses - totalPurchases;

      if (totalTxns > 0 || totalExpenses > 0 || totalPurchases > 0) {
        await createDailyReportNotification({
          shop_id: shop.id,
          reportData: { total_sales: totalSales, sales_count: totalTxns, total_expenses: totalExpenses, total_purchases: totalPurchases, net_profit: profit }
        }, env);
      }

      const emailContent = `
        <p>Here is your daily business summary for <strong>${today}</strong>.</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Total Sales:</strong> ৳${totalSales.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Transactions:</strong> ${totalTxns}</p>
          <p style="margin: 5px 0;"><strong>Expenses:</strong> ৳${totalExpenses.toLocaleString()}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;"/>
          <p style="margin: 5px 0; font-size: 16px;"><strong>Net Profit:</strong> ৳${profit.toLocaleString()}</p>
        </div>
        <p>Keep up the great work!</p>
      `;

      const html = getEmailTemplate(`Daily Summary - ${shop.name}`, emailContent, 'View Dashboard', `${env.FRONTEND_ORIGIN || 'https://lenden.pages.dev'}/#/dashboard`);

      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Lenden <noreply@lenden.pages.dev>', to: ownerEmail, subject: `Daily Summary - ${shop.name}`, html })
        });
      }
    }
  } catch (error) {
    console.error('Daily Cron Job Failed:', error);
  }

  // Run overdue check
  try {
    const overdue = await env.DB.prepare("SELECT t.*, c.name as customer_name, c.phone as customer_phone FROM transactions t JOIN customers c ON t.customer_id = c.id WHERE t.due_amount > 0 AND t.type = 'sale' AND DATE(t.date) < DATE('now', '-7 days')").all();
    for (const txn of overdue.results) {
      await createLowStockNotification({ shop_id: txn.shop_id, type: 'payment_due', title: 'Payment Overdue', message: `Customer ${txn.customer_name} has overdue payment of ৳${txn.due_amount}`, action_url: `#/customers/${txn.customer_id}` }, env);
    }
  } catch (error) {
    console.error('Overdue Check Failed:', error);
  }

  // Run low stock check
  try {
    const lowStock = await env.DB.prepare('SELECT p.*, s.id as shop_id FROM products p JOIN shops s ON p.shop_id = s.id WHERE p.stock_quantity <= p.min_stock_level').all();
    for (const product of lowStock.results) {
      await createLowStockNotification({ shop_id: product.shop_id, type: 'low_stock', title: 'Low Stock Alert', message: `${product.name} stock is low (${product.stock_quantity} ${product.unit} remaining)`, action_url: `#/products` }, env);
    }
  } catch (error) {
    console.error('Low Stock Check Failed:', error);
  }
}

async function runMonthlyReports(env) {
  console.log('Running Monthly Report Cron Job...');
  try {
    const shops = await env.DB.prepare('SELECT id, name, owner_id FROM shops').all();

    for (const shop of shops.results) {
      const users = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(shop.owner_id).all();
      if (users.results.length === 0) continue;
      const ownerEmail = users.results[0].email;

      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const startParams = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const endParams = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const sales = await env.DB.prepare(
        "SELECT SUM(amount) as total_sales, COUNT(*) as count FROM transactions WHERE shop_id = ? AND type = 'sale' AND DATE(date) BETWEEN ? AND ?"
      ).bind(shop.id, startParams, endParams).all();

      const expenses = await env.DB.prepare(
        "SELECT SUM(amount) as total_expenses FROM transactions WHERE shop_id = ? AND type = 'expense' AND DATE(date) BETWEEN ? AND ?"
      ).bind(shop.id, startParams, endParams).all();

      const totalSales = sales.results[0]?.total_sales || 0;
      const totalTxns = sales.results[0]?.count || 0;
      const totalExpenses = expenses.results[0]?.total_expenses || 0;
      const profit = totalSales - totalExpenses;

      const emailContent = `
        <p>Here is your monthly business report for <strong>${monthName}</strong>.</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Total Sales:</strong> ৳${totalSales.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Transactions:</strong> ${totalTxns}</p>
          <p style="margin: 5px 0;"><strong>Expenses:</strong> ৳${totalExpenses.toLocaleString()}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;"/>
          <p style="margin: 5px 0; font-size: 16px;"><strong>Net Profit:</strong> ৳${profit.toLocaleString()}</p>
        </div>
        <p>Login to view detailed analytics and download PDF reports.</p>
      `;

      const html = getEmailTemplate(`Monthly Report - ${monthName}`, emailContent, 'View Reports', `${env.FRONTEND_ORIGIN || 'https://lenden.pages.dev'}/#/reports`);

      if (env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Lenden <noreply@lenden.pages.dev>', to: ownerEmail, subject: `Monthly Report - ${monthName}`, html })
        });
      }
    }
  } catch (error) {
    console.error('Monthly Cron Job Failed:', error);
  }
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
