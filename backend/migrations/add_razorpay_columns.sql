-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Adds Razorpay payment tracking to franchise_applications

ALTER TABLE franchise_applications
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

-- Add unique constraints to prevent payment ID reuse
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_payment_id
  ON franchise_applications (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_razorpay_order_id
  ON franchise_applications (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id != '';
