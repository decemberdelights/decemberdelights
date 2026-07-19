from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import sys
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

_env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    logger.info("No .env.local found, using system environment variables")

sys.path.insert(0, os.path.dirname(__file__))

from routers import menu, products, auth_router, admin, franchise, careers, admin_users, orders
from csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME, validate_csrf

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        import seed
        logger.info("Seed completed")
    except Exception as e:
        logger.warning(f"Seed failed: {str(e)}")
    yield

app = FastAPI(title="December Delights API", version="2.0.0", lifespan=lifespan)

ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE"):
        content_length = request.headers.get("content-length")
        try:
            path = request.url.path
            max_bytes = 65 * 1024 * 1024 if path == "/api/franchise" else 15 * 1024 * 1024
            if content_length and int(content_length) > max_bytes:
                return JSONResponse(status_code=413, content={"detail": "Request too large"})
        except (ValueError, TypeError):
            return JSONResponse(status_code=400, content={"detail": "Invalid content-length header"})

        path = request.url.path
        csrf_exempt = {
            "/api/auth/login", "/api/auth/logout", "/api/auth/check",
            "/api/orders", "/api/contact",
            "/api/franchise", "/api/franchise/login", "/api/franchise/logout",
            "/api/careers/track", "/api/health",
        }
        is_admin_action = path.startswith("/api/admin/") or path.startswith("/api/menu/") or path.startswith("/api/products/") or path.startswith("/api/jobs/")
        if is_admin_action and path not in csrf_exempt:
            try:
                validate_csrf(request)
            except HTTPException:
                return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

    return await call_next(request)


app.include_router(menu.router)
app.include_router(products.router)
app.include_router(auth_router.router)
app.include_router(admin.router)
app.include_router(franchise.router)
app.include_router(careers.router)
app.include_router(admin_users.router)
app.include_router(orders.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    if process_time > 5.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
    if request.url.path.startswith("/api/"):
        existing_cc = response.headers.get("cache-control", "")
        if "public" not in existing_cc:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    path = request.url.path.replace("\n", " ").replace("\r", " ")
    logger.error(f"Unhandled error: {request.method} {path}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root():
    return {"message": "December Delights API"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "10000"))
    reload = os.environ.get("ENV", "development") == "development"
    workers = 1

    uvicorn.run("main:app", host=host, port=port, reload=reload, workers=workers)
