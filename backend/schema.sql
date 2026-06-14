-- =====================================================
-- LENDEN APP - Cloudflare D1 (SQLite) Schema
-- Converted from MySQL schema.sql
-- =====================================================

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS transaction_items;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS users;

-- 1. Users (Owners)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'owner' CHECK(role IN ('owner', 'admin')),
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires TEXT,
    recovery_code TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);

-- 2. Shops
CREATE TABLE shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK(business_type IN ('general', 'bike_sales', 'garage', 'furniture', 'showroom', 'pickup_rental')),
    address TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_shops_owner ON shops(owner_id);

-- 3. Customers
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_due REAL DEFAULT 0.00,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_customers_shop ON customers(shop_id);
CREATE INDEX idx_customers_name ON customers(name);

-- 4. Vendors
CREATE TABLE vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    total_payable REAL DEFAULT 0.00,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_vendors_shop ON vendors(shop_id);
CREATE INDEX idx_vendors_name ON vendors(name);

-- 5. Products
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    sku TEXT,
    cost_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock_level INTEGER DEFAULT 5,
    engine_no TEXT,
    chassis_no TEXT,
    model_year TEXT,
    material_cost REAL,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);

-- 6. Services
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    service_charge REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_services_shop ON services(shop_id);

-- 7. Transactions
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    customer_id INTEGER,
    vendor_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('sale', 'purchase', 'expense', 'payment_received', 'payment_made')),
    amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0.00,
    due_amount REAL GENERATED ALWAYS AS (amount - paid_amount) STORED,
    payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bkash', 'bank', 'due', 'card', 'mobile')),
    reference_no TEXT,
    description TEXT,
    date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);
CREATE INDEX idx_transactions_shop ON transactions(shop_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_vendor ON transactions(vendor_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- 8. Transaction Items
CREATE TABLE transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER,
    service_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);
CREATE INDEX idx_ti_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_ti_product ON transaction_items(product_id);
CREATE INDEX idx_ti_service ON transaction_items(service_id);

-- 9. Trips
CREATE TABLE trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    vehicle_no TEXT NOT NULL,
    driver_name TEXT,
    destination TEXT,
    start_date TEXT,
    end_date TEXT,
    trip_fare REAL NOT NULL,
    expenses REAL DEFAULT 0.00,
    customer_id INTEGER,
    status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed', 'cancelled')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
CREATE INDEX idx_trips_shop ON trips(shop_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_customer ON trips(customer_id);

-- 10. Staff
CREATE TABLE staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    phone TEXT,
    role TEXT DEFAULT 'Staff',
    salary REAL,
    joining_date TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_staff_shop ON staff(shop_id);

-- 11. Notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT NULL,
    type TEXT NOT NULL CHECK(type IN ('low_stock', 'payment_due', 'new_sale', 'system', 'staff_action', 'onboarding')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT DEFAULT NULL,
    is_read INTEGER DEFAULT 0,
    data TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    scheduled_for TEXT NULL DEFAULT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_shop_unread ON notifications(shop_id, is_read, created_at);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
