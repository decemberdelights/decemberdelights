-- ============================================
-- December Delights - Supabase Migration
-- Generated from backend/models.py
-- ============================================

-- Enable UUID extension (useful for storage, future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MENU ITEMS
-- ============================================
CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  price VARCHAR(20) DEFAULT '',
  image_url VARCHAR(500) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);

-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  price FLOAT DEFAULT 0,
  original_price FLOAT DEFAULT 0,
  category VARCHAR(100) DEFAULT '',
  image_url VARCHAR(500) DEFAULT '',
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  offer VARCHAR(50) DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);

-- ============================================
-- 3. JOBS
-- ============================================
CREATE TABLE jobs (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(100) DEFAULT '',
  location VARCHAR(200) DEFAULT '',
  description TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  salary_range VARCHAR(100) DEFAULT '',
  job_type VARCHAR(50) DEFAULT 'full-time',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_is_active ON jobs(is_active);

-- ============================================
-- 4. FRANCHISE APPLICATIONS
-- ============================================
CREATE TABLE franchise_applications (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  business_experience TEXT DEFAULT '',
  preferred_location VARCHAR(200) DEFAULT '',
  investment_capability VARCHAR(100) DEFAULT '',
  message TEXT DEFAULT '',
  aadhaar VARCHAR(500) DEFAULT '',
  pan VARCHAR(500) DEFAULT '',
  bank_statement VARCHAR(500) DEFAULT '',
  id_proof VARCHAR(500) DEFAULT '',
  address_proof VARCHAR(500) DEFAULT '',
  other_docs VARCHAR(500) DEFAULT '',
  tc_accepted BOOLEAN DEFAULT false,
  tc_language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'pending',
  tier VARCHAR(50) DEFAULT '',
  city VARCHAR(100) DEFAULT '',
  admin_notes TEXT DEFAULT '',
  login_id VARCHAR(100) DEFAULT '',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_franchise_phone ON franchise_applications(phone);
CREATE INDEX idx_franchise_status ON franchise_applications(status);

-- ============================================
-- 5. CAREER APPLICATIONS
-- ============================================
CREATE TABLE career_applications (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  position VARCHAR(200) DEFAULT '',
  message TEXT DEFAULT '',
  resume_url VARCHAR(500) DEFAULT '',
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_careers_status ON career_applications(status);

-- ============================================
-- 6. CONTACT MESSAGES
-- ============================================
CREATE TABLE contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) DEFAULT '',
  email VARCHAR(200) DEFAULT '',
  phone VARCHAR(30) DEFAULT '',
  subject VARCHAR(300) DEFAULT '',
  message TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_status ON contact_messages(status);

-- ============================================
-- 7. ORDERS
-- ============================================
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR(200) DEFAULT '',
  customer_email VARCHAR(200) DEFAULT '',
  customer_phone VARCHAR(30) DEFAULT '',
  customer_address VARCHAR(500) DEFAULT '',
  items TEXT DEFAULT '',
  total FLOAT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================
-- 8. ADMIN USERS
-- ============================================
CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. ACTIVITY LOGS
-- ============================================
CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_username VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_admin ON activity_logs(admin_username);
CREATE INDEX idx_logs_created_at ON activity_logs(created_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PUBLIC: Anyone can read active menu items
CREATE POLICY "Public can view active menu items"
  ON menu_items FOR SELECT
  USING (is_active = true);

-- PUBLIC: Anyone can read active products
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- PUBLIC: Anyone can read active jobs
CREATE POLICY "Public can view active jobs"
  ON jobs FOR SELECT
  USING (is_active = true);

-- PUBLIC: Anyone can insert franchise applications
CREATE POLICY "Public can submit franchise applications"
  ON franchise_applications FOR INSERT
  WITH CHECK (true);

-- PUBLIC: Anyone can insert career applications
CREATE POLICY "Public can submit career applications"
  ON career_applications FOR INSERT
  WITH CHECK (true);

-- PUBLIC: Anyone can insert contact messages
CREATE POLICY "Public can submit contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

-- PUBLIC: Anyone can insert orders
CREATE POLICY "Public can place orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- PUBLIC: Anyone can track orders by phone
CREATE POLICY "Public can track own orders"
  ON orders FOR SELECT
  USING (true);

-- PUBLIC: Anyone can read franchise cities (for forms)
CREATE POLICY "Public can view franchise cities"
  ON franchise_applications FOR SELECT
  USING (true);

-- PUBLIC: Franchise can read own application (by phone)
CREATE POLICY "Franchise can view own application"
  ON franchise_applications FOR SELECT
  USING (true);

-- SERVICE ROLE: Admin operations (handled by FastAPI with service_role key)
-- The service_role key bypasses RLS, so admin operations via FastAPI work without policies
