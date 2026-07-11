-- Run this in Supabase SQL Editor to recreate all tables

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  items TEXT DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'unpaid',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franchise_applications (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  password_hash TEXT DEFAULT '',
  business_experience TEXT DEFAULT '',
  preferred_location TEXT DEFAULT '',
  investment_capability TEXT DEFAULT '',
  message TEXT DEFAULT '',
  tc_accepted BOOLEAN DEFAULT false,
  tc_language TEXT DEFAULT 'en',
  aadhaar TEXT DEFAULT '',
  pan TEXT DEFAULT '',
  bank_statement TEXT DEFAULT '',
  id_proof TEXT DEFAULT '',
  address_proof TEXT DEFAULT '',
  other_docs TEXT DEFAULT '',
  login_id TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  tier TEXT DEFAULT '',
  city TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_applications (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  position TEXT DEFAULT '',
  message TEXT DEFAULT '',
  resume_url TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  category TEXT DEFAULT '',
  name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  category TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  offer TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT DEFAULT '',
  department TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  salary_range TEXT DEFAULT '',
  job_type TEXT DEFAULT 'full-time',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_username TEXT DEFAULT '',
  action TEXT DEFAULT '',
  target_type TEXT DEFAULT '',
  target_id INTEGER DEFAULT 0,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
