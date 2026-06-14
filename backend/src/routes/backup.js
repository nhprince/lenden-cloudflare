import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const backupRoutes = new Hono();
backupRoutes.use('*', authMiddleware);

// GET /api/backup/export - Export all shop data as JSON
backupRoutes.get('/export', async (c) => {
  const shopId = c.get('shopId');

  const shops = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(shopId).all();
  const customers = await c.env.DB.prepare('SELECT * FROM customers WHERE shop_id = ?').bind(shopId).all();
  const vendors = await c.env.DB.prepare('SELECT * FROM vendors WHERE shop_id = ?').bind(shopId).all();
  const products = await c.env.DB.prepare('SELECT * FROM products WHERE shop_id = ?').bind(shopId).all();
  const services = await c.env.DB.prepare('SELECT * FROM services WHERE shop_id = ?').bind(shopId).all();
  const transactions = await c.env.DB.prepare('SELECT * FROM transactions WHERE shop_id = ?').bind(shopId).all();
  const transactionItems = await c.env.DB.prepare('SELECT ti.* FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id WHERE t.shop_id = ?').bind(shopId).all();
  const trips = await c.env.DB.prepare('SELECT * FROM trips WHERE shop_id = ?').bind(shopId).all();
  const staff = await c.env.DB.prepare('SELECT id, shop_id, name, username, email, phone, role, salary, joining_date, status, created_at FROM staff WHERE shop_id = ?').bind(shopId).all();
  const notifications = await c.env.DB.prepare('SELECT * FROM notifications WHERE shop_id = ?').bind(shopId).all();

  const backup = {
    export_date: new Date().toISOString(),
    version: '2.0.0',
    data: {
      shops: shops.results,
      customers: customers.results,
      vendors: vendors.results,
      products: products.results,
      services: services.results,
      transactions: transactions.results,
      transaction_items: transactionItems.results,
      trips: trips.results,
      staff: staff.results,
      notifications: notifications.results,
    }
  };

  return c.json(backup);
});

// POST /api/backup/import - Import shop data from JSON
backupRoutes.post('/import', async (c) => {
  const shopId = c.get('shopId');
  const body = await c.req.json();
  const { data } = body;

  if (!data) return c.json({ message: 'No data provided' }, 400);

  // Import products
  if (data.products) {
    for (const p of data.products) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO products (id, shop_id, name, category, sku, cost_price, selling_price, stock_quantity, unit, min_stock_level, engine_no, chassis_no, model_year, material_cost, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(p.id, shopId, p.name, p.category, p.sku, p.cost_price, p.selling_price, p.stock_quantity, p.unit, p.min_stock_level, p.engine_no, p.chassis_no, p.model_year, p.material_cost, p.image_url).run();
    }
  }

  // Import customers
  if (data.customers) {
    for (const cu of data.customers) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO customers (id, shop_id, name, phone, address, total_due) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(cu.id, shopId, cu.name, cu.phone, cu.address, cu.total_due).run();
    }
  }

  // Import vendors
  if (data.vendors) {
    for (const v of data.vendors) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO vendors (id, shop_id, name, phone, company_name, total_payable) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(v.id, shopId, v.name, v.phone, v.company_name, v.total_payable).run();
    }
  }

  // Import services
  if (data.services) {
    for (const s of data.services) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO services (id, shop_id, name, description, service_charge) VALUES (?, ?, ?, ?, ?)'
      ).bind(s.id, shopId, s.name, s.description, s.service_charge).run();
    }
  }

  // Import transactions
  if (data.transactions) {
    for (const t of data.transactions) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO transactions (id, shop_id, customer_id, vendor_id, type, amount, paid_amount, description, payment_method, reference_no, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(t.id, shopId, t.customer_id, t.vendor_id, t.type, t.amount, t.paid_amount, t.description, t.payment_method, t.reference_no, t.date).run();
    }
  }

  // Import trips
  if (data.trips) {
    for (const tr of data.trips) {
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO trips (id, shop_id, vehicle_no, driver_name, destination, start_date, end_date, trip_fare, expenses, customer_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(tr.id, shopId, tr.vehicle_no, tr.driver_name, tr.destination, tr.start_date, tr.end_date, tr.trip_fare, tr.expenses, tr.customer_id, tr.status).run();
    }
  }

  return c.json({ message: 'Import completed successfully' });
});
