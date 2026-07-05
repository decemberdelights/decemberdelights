import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")

_client = None


def get_client():
    global _client
    if _client is None:
        from supabase import create_client
        logger.info(f"Initializing Supabase client (URL length={len(SUPABASE_URL)})")
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialized")
    return _client


class _Proxy:
    def __getattr__(self, name):
        return getattr(get_client(), name)

supabase = _Proxy()
