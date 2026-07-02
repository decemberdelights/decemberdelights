from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text
from dotenv import load_dotenv
import os
import sys
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base
from routers import menu, products, auth_router, admin, franchise, careers, admin_users, orders
import backup

Base.metadata.create_all(bind=engine)

# Create indexes for performance
with engine.connect() as conn:
    for idx_sql in [
        "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone)",
        "CREATE INDEX IF NOT EXISTS idx_franchise_status ON franchise_applications(status)",
        "CREATE INDEX IF NOT EXISTS idx_franchise_created ON franchise_applications(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_careers_status ON career_applications(status)",
        "CREATE INDEX IF NOT EXISTS idx_contacts_status ON contact_messages(status)",
        "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)",
    ]:
        conn.execute(text(idx_sql))
    conn.commit()

# Migration: ensure all required columns exist in admin_users
with engine.connect() as conn:
    result = conn.execute(text("PRAGMA table_info(admin_users)")).fetchall()
    col_names = {row[1] for row in result}
    if "role" not in col_names:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin'"))
    if "is_active" not in col_names:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN is_active INTEGER DEFAULT 1"))
    conn.commit()

app = FastAPI(title="December Delights API", version="1.0.0")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method in ("POST", "PUT"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 15 * 1024 * 1024:  # 15MB
            return JSONResponse(status_code=413, content={"detail": "Request too large"})
    return await call_next(request)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)


@app.get("/uploads/{path:path}")
async def serve_upload(path: str, request: Request):
    from auth import decode_token
    cookie = request.cookies.get("session", "")
    payload = decode_token(cookie)
    if not payload or payload.get("type") != "admin":
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    import os as _os
    full_path = _os.path.join(uploads_dir, path)
    if not _os.path.isfile(full_path):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    from fastapi.responses import FileResponse
    return FileResponse(full_path)

app.include_router(menu.router)
app.include_router(products.router)
app.include_router(auth_router.router)
app.include_router(admin.router)
app.include_router(franchise.router)
app.include_router(careers.router)
app.include_router(admin_users.router)
app.include_router(orders.router)
app.include_router(backup.router)


@app.on_event("startup")
async def startup_event():
    try:
        backup_name = backup.create_backup(reason="startup")
        logger.info(f"Auto-backup created: {backup_name}")
    except Exception as e:
        logger.error(f"Auto-backup failed: {str(e)}")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    if process_time > 5.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {request.method} {request.url.path} - {str(exc)}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root():
    return {"message": "December Delights API"}


@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "disconnected"})


if __name__ == "__main__":
    import uvicorn
    import multiprocessing

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    reload = os.environ.get("ENV", "development") == "development"
    workers = 1  # SQLite cannot handle concurrent writes from multiple workers

    uvicorn.run("main:app", host=host, port=port, reload=reload, workers=workers)
