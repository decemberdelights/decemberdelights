"""Local spillover queue for captured franchise applications Supabase cannot save.
- Queue dir: UPLOAD_ROOT/queue/franchise/*.json + files already under uploads/private/franchise/*
- submit_application() queues failed database writes and returns {ok, queued:true}
- Admin: GET /api/admin/queue/status, POST /api/admin/queue/sync (pushes back to Supabase when space freed)
Stdlib only, works on 1vCPU, no Redis needed.
NOTE: named local_queue.py (not queue.py) to avoid shadowing Python's stdlib `queue` module.
"""
import os
import json
import uuid
import time
import logging

logger = logging.getLogger(__name__)

try:
    from local_storage import UPLOAD_ROOT
except Exception:
    UPLOAD_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads"))

QUEUE_DIR = os.path.join(UPLOAD_ROOT, "queue", "franchise")


def _ensure():
    try:
        os.makedirs(QUEUE_DIR, exist_ok=True)
    except Exception as e:
        logger.warning(f"queue mkdir failed: {e}")


_ensure()


def _is_quota_error(e: Exception) -> bool:
    msg = str(e).lower()
    keys = ["quota", "exceed", "full", "507", "no space", "disk", "size exceeds", "limit", "paused", "connection", "timeout", "503", "500"]
    return any(k in msg for k in keys)


def queue_push(data: dict) -> str:
    """Persist one franchise payload locally. Returns queue id."""
    _ensure()
    qid = f"{int(time.time())}_{uuid.uuid4().hex[:8]}"
    path = os.path.join(QUEUE_DIR, f"{qid}.json")
    payload = {"qid": qid, "queued_at": time.time(), "data": data}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    try:
        os.chmod(path, 0o640)
    except Exception:
        pass
    return qid


def queue_list():
    _ensure()
    out = []
    try:
        for name in sorted(os.listdir(QUEUE_DIR)):
            if not name.endswith(".json"):
                continue
            try:
                with open(os.path.join(QUEUE_DIR, name), encoding="utf-8") as f:
                    out.append(json.load(f))
            except Exception:
                continue
    except FileNotFoundError:
        pass
    return out


def queue_count() -> int:
    try:
        return len([n for n in os.listdir(QUEUE_DIR) if n.endswith(".json")])
    except Exception:
        return 0


def queue_pop(qid: str):
    _ensure()
    # block traversal
    if not qid or "/" in qid or ".." in qid:
        return None
    path = os.path.join(QUEUE_DIR, f"{qid}.json")
    if not os.path.isfile(path):
        # allow full filename too
        path2 = os.path.join(QUEUE_DIR, qid)
        if not os.path.isfile(path2):
            return None
        path = path2
    try:
        with open(path, encoding="utf-8") as f:
            payload = json.load(f)
        os.remove(path)
        return payload
    except Exception as e:
        logger.warning(f"queue_pop {qid} failed: {e}")
        return None
