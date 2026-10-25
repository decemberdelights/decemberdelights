"""Shared shop-order GST and delivery calculations."""
import hashlib
import json
import math
from decimal import Decimal, ROUND_HALF_UP

GST_RATE = Decimal("0.05")
DELIVERY_CHARGE = Decimal("40.00")
FREE_DELIVERY_MIN_WEIGHT_GRAMS = 1000


def product_weight_grams(weight_grams: int | float | None) -> int:
    if isinstance(weight_grams, bool) or not isinstance(weight_grams, (int, float)):
        return 250
    if weight_grams <= 0:
        return 250
    if isinstance(weight_grams, float) and (
        not math.isfinite(weight_grams) or not weight_grams.is_integer()
    ):
        return 250
    return int(weight_grams)


def normalize_cart_items(items: list[dict]) -> list[dict[str, int]]:
    """Validate a client cart and return a stable, merged product/quantity list."""
    if not isinstance(items, list) or not items:
        raise ValueError("Order must contain at least one item")

    quantities: dict[int, int] = {}
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Each item must have an id and quantity")
        raw_product_id = item.get("id")
        raw_quantity = item.get("quantity")
        if (
            isinstance(raw_product_id, bool)
            or not isinstance(raw_product_id, (int, str))
            or isinstance(raw_quantity, bool)
            or not isinstance(raw_quantity, (int, str))
        ):
            raise ValueError("Invalid product ID or quantity")
        try:
            product_id = int(raw_product_id)
            quantity = int(raw_quantity)
        except (TypeError, ValueError):
            raise ValueError("Invalid product ID or quantity") from None
        if product_id <= 0:
            raise ValueError("Invalid product ID")
        if quantity <= 0:
            raise ValueError("Item quantity must be at least 1")
        quantities[product_id] = quantities.get(product_id, 0) + quantity
        if quantities[product_id] > 100:
            raise ValueError("Maximum 100 per item")

    return [{"id": product_id, "quantity": quantities[product_id]} for product_id in sorted(quantities)]


def cart_fingerprint(items: list[dict[str, int]]) -> str:
    canonical = json.dumps(items, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def calculate_order_totals(subtotal: float, total_weight_grams: int) -> tuple[float, float, float, float]:
    rounded_subtotal = Decimal(str(subtotal)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gst = (rounded_subtotal * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    delivery = (
        DELIVERY_CHARGE
        if 0 < total_weight_grams < FREE_DELIVERY_MIN_WEIGHT_GRAMS
        else Decimal("0.00")
    )
    total = (rounded_subtotal + gst + delivery).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return float(rounded_subtotal), float(gst), float(delivery), float(total)
