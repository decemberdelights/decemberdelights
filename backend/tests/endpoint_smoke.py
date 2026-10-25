"""Read-only + validation endpoint smoke test (no live payments, no writes of real data).
Assumes backend running locally. Base URL configurable via API_BASE env var
(default: http://127.0.0.1:10000). Waits up to 60s for /api/ready.
Run: python backend/tests/endpoint_smoke.py
Exit 0 = all pass, nonzero = failures printed.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = os.environ.get("API_BASE", "http://127.0.0.1:10000")

PASS = []
FAIL = []


def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=25) as resp:
            return resp.status, resp.read()[:2000]
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:2000]
    except Exception as e:
        return f"ERR:{e}", b""


def check(name, method, path, expect, body=None):
    status, raw = req(method, path, body)
    ok = status in expect if isinstance(expect, (list, tuple, set)) else status == expect
    (PASS if ok else FAIL).append(name)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {method} {path} -> {status}" + ("" if ok else f" (expected {expect}) body={raw[:200]!r}"))
    return status, raw


def wait_ready(timeout=60):
    for _ in range(timeout):
        s, _ = req("GET", "/api/ready")
        if s == 200:
            return True
        time.sleep(1)
    return False


print("Waiting for backend /api/ready ...")
if not wait_ready():
    print("Backend did not start in 60s")
    sys.exit(2)
print("Backend up. Running smoke tests...\n")

# --- root / liveness ---
check("root", "GET", "/", 200)
check("ready", "GET", "/api/ready", 200)
check("health", "GET", "/api/health", (200, 503))  # 503 ok if Supabase unreachable locally

# --- public reads (core small features) ---
check("menu", "GET", "/api/menu", 200)
check("menu pagination", "GET", "/api/menu?page=1&limit=5", 200)
check("products", "GET", "/api/products", 200)
check("product categories", "GET", "/api/products/categories", 200)
check("jobs", "GET", "/api/jobs", 200)
check("settings", "GET", "/api/settings", 200)
check("terms", "GET", "/api/terms", (200, 500))

# --- new clarity/hybrid endpoints exist (must be auth-gated, not open) ---
check("system status gated", "GET", "/api/admin/system/status", (401, 403))
check("queue status gated", "GET", "/api/admin/queue/status", (401, 403))
check("queue sync gated", "POST", "/api/admin/queue/sync", (401, 403), body={})
check("private franchise file gated", "GET", "/api/files/franchise/x.pdf", (401, 403, 404))
check("private career file gated", "GET", "/api/files/career/x.pdf", (401, 403, 404))

# --- admin reads gated ---
check("admin products gated", "GET", "/api/admin/products", (401, 403))
check("admin menu gated", "GET", "/api/menu/all", (401, 403))
check("admin orders gated", "GET", "/api/admin/orders", (401, 403))
check("admin order stats gated", "GET", "/api/admin/orders/stats", (401, 403))
check("admin jobs gated", "GET", "/api/admin/jobs", (401, 403))
check("admin terms gated", "GET", "/api/admin/terms", (401, 403))
check("admin users gated", "GET", "/api/admin/users", (401, 403))
check("admin logs gated", "GET", "/api/admin/logs", (401, 403))
check("auth check unauth", "GET", "/api/auth/check", (401, 200))

# --- admin writes gated (CSRF + auth, must NOT succeed anonymously) ---
check("admin product create gated", "POST", "/api/admin/products", (401, 403))
check("admin menu create gated", "POST", "/api/admin/menu", (401, 403))
check("admin order create gated", "POST", "/api/admin/orders", (401, 403), body={"customer_name": "t"})
check("admin settings update gated", "PUT", "/api/admin/settings", (401, 403), body={"shop_enabled": True})

# --- public validation (bad input must 400/422, never 500 or fake success) ---
check("order track bad phone", "GET", "/api/orders/track/abc", (400, 422))
check("career track missing params", "GET", "/api/careers/track", (400, 422))
check("contact empty", "POST", "/api/contact", (400, 422), body={"name": "", "email": "", "message": ""})
check("order empty items", "POST", "/api/orders", (400, 422), body={
    "customer_name": "Test", "customer_email": "t@t.com", "customer_phone": "9999999999",
    "customer_address": "addr", "customer_district": "d", "customer_pincode": "500001",
    "customer_state": "TS", "items": "[]", "payment_method": "cash"})
check("franchise order bad email", "POST", "/api/franchise/create-order", (400, 422), body={"email": "bad", "phone": "9999999999"})
check("franchise login bad creds", "POST", "/api/franchise/login", (401, 400, 422), body={"phone": "0000000000", "dob": "2000-01-01"})
check("auth login bad creds", "POST", "/api/auth/login", (401, 400, 422, 429), body={"username": "nope", "password": "wrongpass1"})
check("404 unknown", "GET", "/api/nope-not-real", 404)

print(f"\n==== {len(PASS)} passed, {len(FAIL)} failed ====")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("ALL SMOKE TESTS PASSED")
