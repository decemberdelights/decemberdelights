from order_pricing import calculate_order_totals, cart_fingerprint, normalize_cart_items, product_weight_grams
from security import validate_order_status


def test_one_250g_pack_has_five_percent_gst_and_delivery_charge():
    subtotal, gst, delivery, total = calculate_order_totals(1000, 250)
    assert (subtotal, gst, delivery, total) == (1000.0, 50.0, 40.0, 1090.0)


def test_three_packs_still_pay_delivery():
    assert calculate_order_totals(1000, 750)[2:] == (40.0, 1090.0)


def test_four_250g_packs_get_free_delivery():
    assert calculate_order_totals(1000, 1000) == (1000.0, 50.0, 0.0, 1050.0)


def test_delivery_is_free_above_one_kg():
    assert calculate_order_totals(1000, 1250) == (1000.0, 50.0, 0.0, 1050.0)

def test_five_kg_product_gets_free_delivery():
    weight = product_weight_grams(5000)
    assert weight == 5000
    assert calculate_order_totals(1000, weight)[2] == 0.0


def test_product_weight_uses_explicit_value_and_legacy_fallback():
    assert product_weight_grams(500) == 500
    assert product_weight_grams(None) == 250
    assert product_weight_grams(0) == 250
    assert product_weight_grams(500.5) == 250


def test_empty_cart_has_no_delivery_charge():
    assert calculate_order_totals(0, 0) == (0.0, 0.0, 0.0, 0.0)


def test_dispatched_is_a_valid_order_status():
    assert validate_order_status("dispatched")


def test_cancelled_is_not_a_valid_order_status():
    assert not validate_order_status("cancelled")


def test_cart_items_are_merged_and_sorted_for_payment_verification():
    assert normalize_cart_items([
        {"id": 9, "quantity": 1},
        {"id": 2, "quantity": 2},
        {"id": 9, "quantity": 3},
    ]) == [{"id": 2, "quantity": 2}, {"id": 9, "quantity": 4}]


def test_cart_fingerprint_is_order_independent():
    first = normalize_cart_items([{"id": 1, "quantity": 2}, {"id": 3, "quantity": 1}])
    second = normalize_cart_items([{"id": 3, "quantity": 1}, {"id": 1, "quantity": 2}])
    assert cart_fingerprint(first) == cart_fingerprint(second)


def test_cart_rejects_nonpositive_ids_and_excessive_merged_quantity():
    import pytest

    with pytest.raises(ValueError):
        normalize_cart_items([{"id": 0, "quantity": 1}])
    with pytest.raises(ValueError):
        normalize_cart_items([{"id": 1.5, "quantity": 1}])
    with pytest.raises(ValueError):
        normalize_cart_items([{"id": 1, "quantity": 60}, {"id": 1, "quantity": 41}])
