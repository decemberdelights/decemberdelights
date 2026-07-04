from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text, inspect
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
        logger.warning(f"Auto-backup skipped: {str(e)}")


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

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "10000"))
    reload = os.environ.get("ENV", "development") == "development"
    workers = 1

    uvicorn.run("main:app", host=host, port=port, reload=reload, workers=workers)
