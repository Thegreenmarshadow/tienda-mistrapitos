import { getSqlite } from './client'

function hasColumn(tableName: string, columnName: string) {
  const sqlite = getSqlite()
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === columnName)
}

export function migrateDatabase() {
  const sqlite = getSqlite()

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'vendor', 'stock')),
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS users_set_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS categories_set_updated_at
    AFTER UPDATE ON categories
    FOR EACH ROW
    BEGIN
      UPDATE categories
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS suppliers_set_updated_at
    AFTER UPDATE ON suppliers
    FOR EACH ROW
    BEGIN
      UPDATE suppliers
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      description TEXT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
      size TEXT,
      color TEXT,
      price INTEGER NOT NULL CHECK(price > 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE TRIGGER IF NOT EXISTS products_set_updated_at
    AFTER UPDATE ON products
    FOR EACH ROW
    BEGIN
      UPDATE products
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      discount_percent INTEGER NOT NULL CHECK(discount_percent BETWEEN 1 AND 99),
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_offers_product ON offers(product_id);
    CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_at, end_at);

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TRIGGER IF NOT EXISTS customers_set_updated_at
    AFTER UPDATE ON customers
    FOR EACH ROW
    BEGIN
      UPDATE customers
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      total INTEGER NOT NULL CHECK(total >= 0),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'transfer')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
      discount_percent INTEGER NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 99),
      subtotal INTEGER NOT NULL CHECK(subtotal >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      delta INTEGER NOT NULL CHECK(delta != 0),
      reason TEXT NOT NULL CHECK(reason IN ('sale', 'entry', 'adjustment')),
      reference_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reason ON stock_movements(reason);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      terminal_id TEXT NOT NULL DEFAULT 'unknown-terminal',
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
  `)

  if (!hasColumn('audit_log', 'terminal_id')) {
    sqlite.exec("ALTER TABLE audit_log ADD COLUMN terminal_id TEXT NOT NULL DEFAULT 'unknown-terminal';")
  }

  if (!hasColumn('products', 'sku')) {
    sqlite.exec('ALTER TABLE products ADD COLUMN sku TEXT;')
  }

  sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique ON products(sku);')
}
