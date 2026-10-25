-- December Delights — GST columns on shop orders (5% added at checkout)
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
