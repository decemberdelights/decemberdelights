"""Tiny in-memory TTL cache to protect Supabase free tier (requests/bandwidth) on 1vCPU VPS.
Thread-safe, stdlib only, no Redis needed. For public hot reads: menu/products/categories/jobs/settings/terms.
Writes must call invalidate(prefix) — wired in routers.
"""
import time
import threading
import logging

logger = logging.getLogger(__name__)

_lock = threading.RLock()
_store: dict = {}  # key -> (value, expires_at)


def cache_get(key: str):
    now = time.time()
    with _lock:
        item = _store.get(key)
        if not item:
            return None
        val, exp = item
        if now >= exp:
            _store.pop(key, None)
            return None
        return val


def cache_set(key: str, value, ttl: int = 120):
    with _lock:
        _store[key] = (value, time.time() + max(1, int(ttl)))
        # cheap eviction: cap 500 keys
        if len(_store) > 500:
            try:
                oldest = min(_store.items(), key=lambda kv: kv[1][1])[0]
                _store.pop(oldest, None)
            except Exception:
                pass


def cache_invalidate(prefix: str = ""):
    with _lock:
        if not prefix:
            _store.clear()
            return
        for k in [k for k in _store.keys() if k.startswith(prefix)]:
            _store.pop(k, None)
