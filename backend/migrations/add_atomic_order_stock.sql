-- Reserve or release every item in an order as one database transaction.
CREATE OR REPLACE FUNCTION reserve_order_stock(p_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id bigint;
  quantity integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      product_id := (item->>'id')::bigint;
      quantity := (item->>'quantity')::integer;
      IF product_id <= 0 OR quantity <= 0 OR quantity > 100 THEN
        RAISE EXCEPTION 'invalid order stock item';
      END IF;
      UPDATE products
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

CREATE OR REPLACE FUNCTION release_order_stock(p_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id bigint;
  quantity integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
      product_id := (item->>'id')::bigint;
      quantity := (item->>'quantity')::integer;
      IF product_id <= 0 OR quantity <= 0 OR quantity > 100 THEN
        RAISE EXCEPTION 'invalid order stock item';
      END IF;
      UPDATE products SET stock = stock + quantity WHERE id = product_id;
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

REVOKE ALL ON FUNCTION reserve_order_stock(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION release_order_stock(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_order_stock(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION release_order_stock(jsonb) TO service_role;
