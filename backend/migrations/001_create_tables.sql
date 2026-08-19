-- =============================================================================
-- December Delights — Full Schema Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- =============================================================================

-- 1. admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. products
CREATE TABLE IF NOT EXISTS products (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  price           DOUBLE PRECISION NOT NULL DEFAULT 0,
  original_price  DOUBLE PRECISION NOT NULL DEFAULT 0,
  category        TEXT NOT NULL DEFAULT '',
  image_url       TEXT NOT NULL DEFAULT '',
  stock           INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  offer           TEXT NOT NULL DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- 3. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price       TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- 4. orders
CREATE TABLE IF NOT EXISTS orders (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name        TEXT NOT NULL,
  customer_email       TEXT NOT NULL DEFAULT '',
  customer_phone       TEXT NOT NULL,
  customer_address     TEXT NOT NULL,
  items                JSONB NOT NULL,
  total                DOUBLE PRECISION NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  payment_method       TEXT NOT NULL DEFAULT 'cash',
  payment_status       TEXT NOT NULL DEFAULT 'unpaid',
  notes                TEXT NOT NULL DEFAULT '',
  admin_notes          TEXT NOT NULL DEFAULT '',
  razorpay_order_id    TEXT NOT NULL DEFAULT '',
  razorpay_payment_id  TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. franchise_applications
CREATE TABLE IF NOT EXISTS franchise_applications (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name              TEXT NOT NULL DEFAULT '',
  email                  TEXT NOT NULL DEFAULT '',
  phone                  TEXT NOT NULL DEFAULT '',
  password_hash          TEXT NOT NULL DEFAULT '',
  business_experience    TEXT NOT NULL DEFAULT '',
  preferred_location     TEXT NOT NULL DEFAULT '',
  investment_capability  TEXT NOT NULL DEFAULT '',
  message                TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'pending',
  tier                   TEXT NOT NULL DEFAULT '',
  city                   TEXT NOT NULL DEFAULT '',
  admin_notes            TEXT NOT NULL DEFAULT '',
  login_id               TEXT NOT NULL DEFAULT '',
  payment_status         TEXT NOT NULL DEFAULT 'unpaid',
  razorpay_order_id      TEXT,
  razorpay_payment_id    TEXT,
  tc_accepted            BOOLEAN NOT NULL DEFAULT false,
  tc_language            TEXT NOT NULL DEFAULT 'en',
  aadhaar                TEXT NOT NULL DEFAULT '',
  pan                    TEXT NOT NULL DEFAULT '',
  bank_statement         TEXT NOT NULL DEFAULT '',
  address_proof          TEXT NOT NULL DEFAULT '',
  other_docs             TEXT NOT NULL DEFAULT '',
  tc_video               TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique partial indexes for franchise Razorpay IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_payment_id
  ON franchise_applications (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_order_id
  ON franchise_applications (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id != '';

-- 6. career_applications
CREATE TABLE IF NOT EXISTS career_applications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  position    TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  resume_url  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  subject     TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. jobs
CREATE TABLE IF NOT EXISTS jobs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  department    TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  requirements  TEXT NOT NULL DEFAULT '',
  salary_range  TEXT NOT NULL DEFAULT '',
  job_type      TEXT NOT NULL DEFAULT 'full-time',
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- 9. activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_username  TEXT NOT NULL,
  action          TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       BIGINT NOT NULL,
  details         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders (payment_method, payment_status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items (is_active);
CREATE INDEX IF NOT EXISTS idx_franchise_status ON franchise_applications (status);
CREATE INDEX IF NOT EXISTS idx_franchise_phone ON franchise_applications (phone);
CREATE INDEX IF NOT EXISTS idx_career_status ON career_applications (status);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs (created_at DESC);
