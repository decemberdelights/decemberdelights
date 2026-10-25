from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import sys
import logging
import time
import asyncio

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load env from multiple locations (first found wins for each var already set):
# 1. backend/.env (production on Hostinger, created by setup-server.sh)
# 2. ../.env.local (local dev)
# 3. system environment / systemd EnvironmentFile
_here = os.path.dirname(__file__)
for _env_path in (
    os.path.join(_here, ".env"),
    os.path.join(_here, "..", ".env.local"),
    os.path.join(_here, "..", ".env"),
):
    if os.path.exists(_env_path):
        load_dotenv(_env_path, override=False)
        logger.info(f"Loaded env from {_env_path}")
        break
else:
    logger.info("No .env file found, using system environment variables")

sys.path.insert(0, os.path.dirname(__file__))

from routers import menu, products, auth_router, admin, franchise, careers, admin_users, orders, terms, password_reset, files, system

_health_cache = {"last_check": 0, "result": None}
_HEALTH_CACHE_TTL = 30  # seconds

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("API started")
    yield

app = FastAPI(title="December Delights API", version="2.0.0", lifespan=lifespan)

# GZip JSON/API responses (invisible perf, no look change). Minimum 1KB to avoid tiny overhead.
try:
    from fastapi.middleware.gzip import GZipMiddleware
    app.add_middleware(GZipMiddleware, minimum_size=1024)
except Exception as e:
    logger.warning(f"GZip middleware unavailable, responses will be uncompressed: {e}")

# CORS: never allow '*' or empty entries (wildcard + credentials = browser
# rejects it anyway, and it would over-permit). In production, localhost
# origins are dev-only and must not be silently allowed.
ALLOWED_ORIGINS = []
for _origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","):
    _origin = _origin.strip().rstrip("/")
    if not _origin:
        continue
    if _origin == "*":
        logger.warning("CORS: ignoring wildcard origin '*' (not allowed with credentialed requests)")
        continue
    ALLOWED_ORIGINS.append(_origin)

if os.environ.get("ENV", "development") == "production":
    _prod_origins = [o for o in ALLOWED_ORIGINS if "localhost" not in o and "127.0.0.1" not in o]
    _dropped = [o for o in ALLOWED_ORIGINS if o not in _prod_origins]
    if _dropped:
        logger.warning(f"CORS: dropping localhost origins in production: {_dropped}")
    ALLOWED_ORIGINS = _prod_origins

if not ALLOWED_ORIGINS:
    logger.warning("CORS: no valid origins configured — cross-origin browser requests will be blocked")

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def security_and_logging_middleware(request: Request, call_next):
    start_time = time.time()

    # Upload size limit
    if request.method in ("POST", "PUT", "DELETE"):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                max_bytes = 50 * 1024 * 1024 if request.url.path == "/api/franchise" else 15 * 1024 * 1024
                if int(content_length) > max_bytes:
                    return JSONResponse(status_code=413, content={"detail": "Request too large"})
            except (ValueError, TypeError):
                return JSONResponse(status_code=400, content={"detail": "Invalid content-length header"})

    response = await call_next(request)
    process_time = time.time() - start_time

    if process_time > 5.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")

    if request.url.path.startswith("/uploads/public/"):
        # Public product/menu images: immutable 1yr (filenames contain uuid, safe).
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.url.path.startswith("/api/"):
        existing_cc = response.headers.get("cache-control", "")
        if "public" not in existing_cc:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

    # Security headers on all responses
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    # (X-XSS-Protection removed: obsolete and its '1; mode=block' value can
    # itself introduce XSS issues in old browsers; CSP-less modern fallback.)
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Behind nginx TLS termination, uvicorn sees plain http — honor the
    # X-Forwarded-Proto header our nginx sets (requires --proxy-headers).
    _is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower() == "https"
    )
    if _is_https:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


app.include_router(menu.router)
app.include_router(products.router)
app.include_router(auth_router.router)
app.include_router(password_reset.router)
app.include_router(admin.router)
app.include_router(franchise.router)
app.include_router(careers.router)
app.include_router(admin_users.router)
app.include_router(orders.router)
app.include_router(terms.router)
app.include_router(files.router)
app.include_router(system.router)

# Dev fallback: serve /uploads/public/* via FastAPI (prod uses Nginx, same URL).
# Private /uploads/private/* is NEVER mounted here — only via /api/files/* with admin auth.
try:
    from fastapi.staticfiles import StaticFiles
    from local_storage import PUBLIC_DIR
    if os.path.isdir(PUBLIC_DIR):
        app.mount("/uploads/public", StaticFiles(directory=PUBLIC_DIR), name="uploads-public")
except Exception as e:
    logger.warning(f"Could not mount uploads static: {e}")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    path = request.url.path.replace("\n", " ").replace("\r", " ")
    logger.error(f"Unhandled error: {request.method} {path}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root():
    return {"message": "December Delights API"}


@app.get("/api/ready")
def ready():
    """Liveness for systemd/Nginx (no DB hit, cheap)."""
    return {"status": "ready"}


@app.get("/api/health")
async def health_check():
    now = time.time()
    if _health_cache["result"] and (now - _health_cache["last_check"]) < _HEALTH_CACHE_TTL:
        return _health_cache["result"]
    try:
        from supabase_client import supabase
        await asyncio.to_thread(lambda: supabase.table("admin_users").select("id").limit(1).execute())
        result = {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        result = JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})
    _health_cache["last_check"] = now
    _health_cache["result"] = result
    return result


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "10000"))
    reload = os.environ.get("ENV", "development") == "development"
    workers = 1

    uvicorn.run("main:app", host=host, port=port, reload=reload, workers=workers)
