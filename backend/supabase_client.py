import os
import time
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")

_client = None
_last_error = None


def get_client():
    global _client, _last_error
    if _client is not None:
        return _client

    from supabase import create_client
    logger.info(f"Initializing Supabase client (URL length={len(SUPABASE_URL)})")

    for attempt in range(5):
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Supabase client initialized")
            _last_error = None
            return _client
        except Exception as e:
            _last_error = str(e)
            logger.warning(f"Supabase init attempt {attempt + 1}/5 failed: {e}")
            if attempt < 4:
                time.sleep(2 ** attempt)

    logger.error("Failed to initialize Supabase after 5 attempts")
    return None


class _Proxy:
    def __getattr__(self, name):
        client = get_client()
        if client is None:
            raise ConnectionError(f"Supabase client not available: {_last_error}")
        return getattr(client, name)

supabase = _Proxy()
