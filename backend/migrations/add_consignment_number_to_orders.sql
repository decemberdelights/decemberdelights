-- Adds the India Post consignment number that admins must enter before an
-- order can be marked as dispatched. Shown to customers on /track.
--
-- Safe to run more than once.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS consignment_number TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN orders.consignment_number IS
    'India Post consignment / tracking number entered by admin at dispatch';
