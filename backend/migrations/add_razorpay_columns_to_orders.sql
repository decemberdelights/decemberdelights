-- Run this SQL in your Supabase SQL Editor to add razorpay columns to orders table
-- This allows storing online payment IDs for Razorpay transactions

ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT DEFAULT '';
