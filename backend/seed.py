import sys
import os
import logging
sys.path.insert(0, os.path.dirname(__file__))

logger = logging.getLogger(__name__)

try:
    from supabase_client import supabase
    from auth import hash_password

    default_password = os.environ.get("ADMIN_DEFAULT_PASSWORD")
    admin_username = os.environ.get("ADMIN_USERNAME", "admin")

    if not default_password:
        logger.warning("ADMIN_DEFAULT_PASSWORD not set. Skipping admin seed.")
    else:
        existing = supabase.table("admin_users").select("id").eq("username", admin_username).execute()
        if not existing.data:
            supabase.table("admin_users").insert({
                "username": admin_username,
                "password_hash": hash_password(default_password),
                "role": "super_admin",
                "is_active": True,
            }).execute()
            logger.info(f"Created super_admin: {admin_username}")
        else:
            logger.info(f"Super admin '{admin_username}' already exists, skipping seed")
except Exception as e:
    logger.warning(f"Seed failed: {e}")
