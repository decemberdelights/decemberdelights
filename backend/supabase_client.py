import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

logger.info(f"SUPABASE_URL set: {bool(SUPABASE_URL)} (length={len(SUPABASE_URL)})")
logger.info(f"SUPABASE_SERVICE_ROLE_KEY set: {bool(SUPABASE_SERVICE_ROLE_KEY)} (length={len(SUPABASE_SERVICE_ROLE_KEY)})")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n"
        "On Render:\n"
        "  1. Go to Environment tab\n"
        "  2. Add:\n"
        "     SUPABASE_URL = https://your-project.supabase.co\n"
        "     SUPABASE_SERVICE_ROLE_KEY = your-service-role-key\n"
        "  3. Save (triggers redeploy)"
    )
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
logger.info("Supabase client initialized successfully")
