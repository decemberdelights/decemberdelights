"""Hybrid storage: local disk (Hostinger 50GB) + Supabase fallback.
Mode via STORAGE_MODE env: hybrid (default) | local | supabase
- Public images (menu/product): stored under UPLOAD_ROOT/public/<subdir>/, served via Nginx /uploads/ (immutable cache).
- Private docs (franchise/career): stored under UPLOAD_ROOT/private/<subdir>/, served ONLY via authenticated /api/files/* route, never via Nginx public.
- Old Supabase URLs (https://*.supabase.co) keep working (read fallback + delete fallback).
No look changes: returns URL strings only; frontend renders same <img src>.
"""
import os
import re
import uuid
import logging
import mimetypes

logger = logging.getLogger(__name__)

STORAGE_MODE = os.environ.get("STORAGE_MODE", "hybrid").strip().lower()  # hybrid|local|supabase
# Default: <repo>/.data/../uploads -> backend/../uploads ; on server: /var/www/decemberdelights/uploads
_HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.normpath(os.path.join(_HERE, "..", "uploads"))
UPLOAD_ROOT = os.environ.get("UPLOAD_ROOT", DEFAULT_ROOT)

PUBLIC_DIR = os.path.join(UPLOAD_ROOT, "public")
PRIVATE_DIR = os.path.join(UPLOAD_ROOT, "private")

_FILENAME_RE = re.compile(r"[^\w\-.]")


def _ensure_dirs():
    try:
        os.makedirs(PUBLIC_DIR, exist_ok=True)
        os.makedirs(PRIVATE_DIR, exist_ok=True)
        os.makedirs(os.path.join(PUBLIC_DIR, "products"), exist_ok=True)
        os.makedirs(os.path.join(PUBLIC_DIR, "menu"), exist_ok=True)
        os.makedirs(os.path.join(PRIVATE_DIR, "franchise"), exist_ok=True)
        os.makedirs(os.path.join(PRIVATE_DIR, "career"), exist_ok=True)
    except Exception as e:
        logger.warning(f"Could not create upload dirs at {UPLOAD_ROOT}: {e}")


_ensure_dirs()


def is_local_url(url: str) -> bool:
    return isinstance(url, str) and url.startswith("/uploads/")


def is_supabase_url(url: str) -> bool:
    return isinstance(url, str) and ("supabase.co" in url)


def _safe_filename(original: str, prefix: str) -> str:
    ext = os.path.splitext(original or "")[1].lower()
    # keep only safe chars in ext
    ext = "." + re.sub(r"[^a-z0-9]", "", ext.lstrip(".")) if ext else ""
    base = _FILENAME_RE.sub("_", (prefix or "file").strip().replace(" ", "_"))[:40] or "file"
    return f"{base}_{uuid.uuid4().hex[:8]}{ext}"


def save_public_image(content: bytes, original_filename: str, subdir: str = "products") -> str:
    """Save public image to local disk. Returns web path /uploads/public/<subdir>/<file>."""
    _ensure_dirs()
    if subdir not in ("products", "menu"):
        subdir = "products"
    target_dir = os.path.join(PUBLIC_DIR, subdir)
    os.makedirs(target_dir, exist_ok=True)
    filename = _safe_filename(original_filename, subdir)
    # force image ext
    if os.path.splitext(filename)[1].lower() not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        filename += ".jpg"
    path = os.path.join(target_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    try:
        os.chmod(path, 0o644)
    except Exception:
        pass
    return f"/uploads/public/{subdir}/{filename}"


def save_private_doc(content: bytes, original_filename: str, subdir: str = "franchise") -> str:
    """Save sensitive doc to private dir. Returns web path /uploads/private/<subdir>/<file> (served only via /api/files)."""
    _ensure_dirs()
    if subdir not in ("franchise", "career"):
        subdir = "franchise"
    target_dir = os.path.join(PRIVATE_DIR, subdir)
    os.makedirs(target_dir, exist_ok=True)
    filename = _safe_filename(original_filename, subdir)
    path = os.path.join(target_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    try:
        os.chmod(path, 0o640)
    except Exception:
        pass
    return f"/uploads/private/{subdir}/{filename}"


def delete_local_file(url_or_path: str) -> bool:
    """Delete a /uploads/... file. Returns True if deleted/missing, False on error. Never deletes outside UPLOAD_ROOT."""
    if not is_local_url(url_or_path):
        return True  # not local -> caller handles supabase fallback
    try:
        # url like /uploads/public/products/x.jpg or /uploads/private/franchise/x.pdf
        rel = url_or_path[len("/uploads/"):].lstrip("/")
        # block traversal
        if ".." in rel or rel.startswith("/"):
            return False
        full = os.path.normpath(os.path.join(UPLOAD_ROOT, rel))
        root = os.path.normpath(UPLOAD_ROOT)
        if not full.startswith(root):
            return False
        if os.path.isfile(full):
            os.remove(full)
        return True
    except Exception as e:
        logger.warning(f"delete_local_file failed for {url_or_path}: {e}")
        return False


def local_path_for_url(url_or_path: str):
    """Resolve /uploads/... URL to absolute disk path, or None if invalid/missing."""
    if not is_local_url(url_or_path):
        return None
    rel = url_or_path[len("/uploads/"):].lstrip("/")
    if ".." in rel:
        return None
    full = os.path.normpath(os.path.join(UPLOAD_ROOT, rel))
    if not full.startswith(os.path.normpath(UPLOAD_ROOT)):
        return None
    if not os.path.isfile(full):
        return None
    return full


def guess_content_type(filename: str, default: str = "application/octet-stream") -> str:
    ctype, _ = mimetypes.guess_type(filename)
    return ctype or default
