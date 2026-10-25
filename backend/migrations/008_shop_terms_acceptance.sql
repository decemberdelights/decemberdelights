-- Record the shop terms version and acceptance time with paid shop orders.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT NOT NULL DEFAULT '';

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
