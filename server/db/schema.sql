-- Vision Opticals Database Schema (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Users & Admin Accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 3. Brands
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_featured BOOLEAN DEFAULT 0
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  brand TEXT,
  price NUMERIC,
  compare_at_price NUMERIC,
  badge TEXT,
  description TEXT,
  primary_image TEXT,
  secondary_image TEXT,
  color_family TEXT,
  product_tags TEXT,
  lens_uv_cut TEXT,
  lens_blue_cut TEXT,
  lens_transmission TEXT,
  gender TEXT DEFAULT 'Unisex',
  frame_shape TEXT,
  frame_type TEXT,
  frame_material TEXT,
  lens_width TEXT,
  bridge TEXT,
  temple_length TEXT,
  available_colors TEXT,
  available_sizes TEXT,
  lens_coatings TEXT,
  lens_power_range TEXT,
  lens_water_content TEXT,
  lens_material TEXT,
  lens_duration TEXT,
  lens_features TEXT,
  wa_message TEXT,
  is_published BOOLEAN DEFAULT 1,
  is_featured BOOLEAN DEFAULT 0,
  is_bestseller BOOLEAN DEFAULT 0,
  is_new_arrival BOOLEAN DEFAULT 0,
  is_trending BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Product Images (Multiple Angles & Views)
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  angle_label TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 6. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER UNIQUE NOT NULL,
  quantity INTEGER DEFAULT 10,
  low_stock_threshold INTEGER DEFAULT 3,
  sku TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  final_quantity INTEGER NOT NULL,
  reason TEXT,
  user_name TEXT DEFAULT 'Admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 8. Offers & Promotions
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  code TEXT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  applicable_category TEXT DEFAULT 'all',
  banner_url TEXT,
  start_date DATETIME,
  end_date DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Homepage Sections & Customizer
CREATE TABLE IF NOT EXISTS homepage_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  subtitle TEXT,
  badge TEXT,
  is_enabled BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  config TEXT
);

-- 10. Store Settings (Key-Value Store)
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. In-Store Eye Clinic Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  appointment_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  service_type TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Orders & Optical Customization Pipeline
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'placed',
  items_json TEXT NOT NULL,
  prescription_file TEXT,
  prescription_data TEXT,
  tracking_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Modular Website Components (With Undo / Delete / Add Architecture)
CREATE TABLE IF NOT EXISTS modular_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  display_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT 1,
  config_json TEXT,
  is_deleted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_modular_components_order ON modular_components(display_order);
