-- Shop delivery fee captured at checkout.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge DOUBLE PRECISION NOT NULL DEFAULT 0;
