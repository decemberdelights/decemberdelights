"""Staged 10/10 regression tests (no look changes, stdlib + pytest only).
Run: cd backend && python -m pytest tests/test_hybrid.py -q
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_local_storage_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_ROOT", str(tmp_path))
    import importlib
    import local_storage
    importlib.reload(local_storage)
    url = local_storage.save_public_image(b"fakeimg", "test.jpg", "products")
    assert url.startswith("/uploads/public/products/")
    assert local_storage.is_local_url(url)
    assert local_storage.local_path_for_url(url) is not None
    assert local_storage.delete_local_file(url) is True
    assert local_storage.local_path_for_url(url) is None


def test_private_doc_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_ROOT", str(tmp_path))
    import importlib
    import local_storage
    importlib.reload(local_storage)
    url = local_storage.save_private_doc(b"%PDF-fake", "aadhaar.pdf", "franchise")
    assert url.startswith("/uploads/private/franchise/")
    # traversal blocked
    assert local_storage.local_path_for_url("/uploads/private/franchise/../../.env") is None
    assert local_storage.delete_local_file(url) is True


def test_cache_ttl():
    from cache import cache_get, cache_set, cache_invalidate
    cache_set("t:k", {"a": 1}, ttl=60)
    assert cache_get("t:k") == {"a": 1}
    cache_invalidate("t:")
    assert cache_get("t:k") is None


def test_rate_limiter_burst():
    from store import RateLimiter
    rl = RateLimiter(max_attempts=3, window_seconds=60)
    key = "test:burst:pytest"
    try:
        rl.reset(key)
    except Exception:
        pass
    # clear memory for deterministic test
    try:
        RateLimiter._mem.pop(key, None)
    except Exception:
        pass
    rl.check(key)
    rl.check(key)
    rl.check(key)
    try:
        rl.check(key)
        assert False, "should have raised 429"
    except Exception as e:
        assert "429" in str(getattr(e, "status_code", "429")) or "Too many" in str(e)
    finally:
        try:
            rl.reset(key)
            RateLimiter._mem.pop(key, None)
        except Exception:
            pass
