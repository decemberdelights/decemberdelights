-- Add explicit product package weights for weight-based delivery pricing.
-- Existing catalog records are backfilled from recognizable weight text once;
-- products without it retain the former 250 g estimate.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER;

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
