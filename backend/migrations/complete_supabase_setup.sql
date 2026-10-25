-- December Delights: complete Supabase database setup.
-- Single SQL entry point for fresh and existing installations.
-- Safe to re-run: tables/columns/indexes are guarded with IF NOT EXISTS.
-- Includes the current paid-order, product-weight, and shop-terms changes.
-- Does not insert demo customers, orders, applications, products, or admin users.
--
-- Run in Supabase Dashboard -> SQL Editor as the project owner.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY; keep it server-side only.

-- Core application tables.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  original_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  weight_grams INTEGER,
  category TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  extra_images TEXT NOT NULL DEFAULT '[]',
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  offer TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_district TEXT NOT NULL DEFAULT '',
  customer_pincode TEXT NOT NULL DEFAULT '',
  customer_state TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  razorpay_order_id TEXT NOT NULL DEFAULT '',
  razorpay_payment_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id <> '';

CREATE TABLE IF NOT EXISTS public.franchise_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  dob TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  business_experience TEXT NOT NULL DEFAULT '',
  preferred_location TEXT NOT NULL DEFAULT '',
  franchise_type TEXT NOT NULL DEFAULT '',
  investment_capability TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  tier TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  login_id TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  tc_accepted BOOLEAN NOT NULL DEFAULT false,
  tc_language TEXT NOT NULL DEFAULT 'en',
  aadhaar TEXT NOT NULL DEFAULT '',
  pan TEXT NOT NULL DEFAULT '',
  bank_statement TEXT NOT NULL DEFAULT '',
  address_proof TEXT NOT NULL DEFAULT '',
  other_docs TEXT NOT NULL DEFAULT '',
  tc_video TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  resume_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  tracking_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  salary_range TEXT NOT NULL DEFAULT '',
  job_type TEXT NOT NULL DEFAULT 'full-time',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id BIGINT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT 'true',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_password_resets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  reset_token_hash TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bring older installations up to the current column set.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS extra_images TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER;

-- Backfill weights once from recognizable catalog text. Products without
-- package weight text retain the former 250 g estimate and can be corrected
-- in Admin -> Products after setup.
WITH parsed_weights AS (
  SELECT
    id,
    regexp_match(
      concat_ws(' ', name, description),
      '([0-9]+([.][0-9]+)?)\s*(kilograms?|kgs?|grams?|gms?|gm|g)',
      'i'
    ) AS weight_match
  FROM public.products
  WHERE weight_grams IS NULL
)
UPDATE public.products AS products
SET weight_grams = CASE
  WHEN parsed_weights.weight_match IS NULL THEN 250
  ELSE ROUND(
    parsed_weights.weight_match[1]::NUMERIC
    * CASE
        WHEN lower(parsed_weights.weight_match[3]) IN ('kg', 'kgs')
          OR lower(parsed_weights.weight_match[3]) LIKE 'kilogram%'
        THEN 1000
        ELSE 1
      END
  )::INTEGER
END
FROM parsed_weights
WHERE products.id = parsed_weights.id;

ALTER TABLE public.products
  ALTER COLUMN weight_grams SET DEFAULT 250,
  ALTER COLUMN weight_grams SET NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_district TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_pincode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.franchise_applications
  ADD COLUMN IF NOT EXISTS dob TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS franchise_type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Query and payment indexes.
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON public.orders (payment_method, payment_status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON public.menu_items (is_active);
CREATE INDEX IF NOT EXISTS idx_franchise_status ON public.franchise_applications (status);
CREATE INDEX IF NOT EXISTS idx_franchise_phone ON public.franchise_applications (phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_payment_id
  ON public.franchise_applications (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_order_id
  ON public.franchise_applications (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id != '';
CREATE INDEX IF NOT EXISTS idx_career_status ON public.career_applications (status);
CREATE INDEX IF NOT EXISTS idx_contact_status ON public.contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_user ON public.admin_password_resets (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_expires ON public.admin_password_resets (expires_at);

-- Runtime defaults; preserve any existing administrator settings.
INSERT INTO public.site_settings (key, value) VALUES
  ('shop_enabled', 'true'),
  ('franchise_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Atomic product stock reservation/release used by checkout and cancellation.
CREATE OR REPLACE FUNCTION public.reserve_order_stock(p_items JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  product_id BIGINT;
  quantity INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      product_id := (item->>'id')::BIGINT;
      quantity := (item->>'quantity')::INTEGER;
      IF product_id <= 0 OR quantity <= 0 OR quantity > 100 THEN
        RAISE EXCEPTION 'invalid order stock item';
      END IF;
      UPDATE public.products
        SET stock = stock - quantity
        WHERE id = product_id AND is_active = true AND stock >= quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient stock';
      END IF;
    END LOOP;
    RETURN true;
  EXCEPTION WHEN raise_exception THEN
    RETURN false;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_stock(p_items JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  product_id BIGINT;
  quantity INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      product_id := (item->>'id')::BIGINT;
      quantity := (item->>'quantity')::INTEGER;
      IF product_id <= 0 OR quantity <= 0 OR quantity > 100 THEN
        RAISE EXCEPTION 'invalid order stock item';
      END IF;
      UPDATE public.products SET stock = stock + quantity WHERE id = product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'product no longer exists';
      END IF;
    END LOOP;
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_order_stock(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_order_stock(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.create_paid_order(p_order JSONB, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_payment_id TEXT;
  v_order_id BIGINT;
  v_status TEXT;
BEGIN
  v_payment_id := p_order->>'razorpay_payment_id';
  IF v_payment_id IS NULL OR v_payment_id = '' THEN
    RAISE EXCEPTION 'payment ID is required';
  END IF;

  -- Serialize retries of one captured payment before checking or reserving stock.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_payment_id, 0));

  SELECT id, status INTO v_order_id, v_status
    FROM public.orders
    WHERE razorpay_payment_id = v_payment_id
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'created', false,
      'order', jsonb_build_object('id', v_order_id, 'status', v_status)
    );
  END IF;

  IF NOT public.reserve_order_stock(p_items) THEN
    RETURN jsonb_build_object('created', false, 'stock_reserved', false);
  END IF;

  INSERT INTO public.orders (
    customer_name, customer_email, customer_phone, customer_address,
    customer_district, customer_pincode, customer_state, items, total,
    subtotal, gst_amount, delivery_charge, terms_accepted,
    terms_accepted_at, terms_version, status, payment_method,
    payment_status, notes, razorpay_order_id, razorpay_payment_id
  ) VALUES (
    p_order->>'customer_name', COALESCE(p_order->>'customer_email', ''),
    p_order->>'customer_phone', p_order->>'customer_address',
    COALESCE(p_order->>'customer_district', ''), COALESCE(p_order->>'customer_pincode', ''),
    COALESCE(p_order->>'customer_state', ''), p_order->'items',
    (p_order->>'total')::DOUBLE PRECISION, (p_order->>'subtotal')::DOUBLE PRECISION,
    (p_order->>'gst_amount')::DOUBLE PRECISION, (p_order->>'delivery_charge')::DOUBLE PRECISION,
    COALESCE((p_order->>'terms_accepted')::BOOLEAN, false),
    CASE WHEN COALESCE((p_order->>'terms_accepted')::BOOLEAN, false) THEN now() ELSE NULL END,
    COALESCE(p_order->>'terms_version', ''),
    COALESCE(p_order->>'status', 'pending'), p_order->>'payment_method',
    p_order->>'payment_status', COALESCE(p_order->>'notes', ''),
    p_order->>'razorpay_order_id', v_payment_id
  )
  RETURNING id, status INTO v_order_id, v_status;

  RETURN jsonb_build_object(
    'created', true,
    'order', jsonb_build_object('id', v_order_id, 'status', v_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_paid_order(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_paid_order(JSONB, JSONB) TO service_role;

-- Protect customer/application/admin data from direct anon-key Data API access.
-- The backend service-role key bypasses RLS; never put it in browser code.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;
