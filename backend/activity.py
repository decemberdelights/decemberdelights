import logging
from supabase_client import supabase

logger = logging.getLogger(__name__)


def _insert_activity_log(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    try:
        supabase.table("activity_logs").insert({
            "admin_username": username,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


def log_activity(username: str, action: str, target_type: str, target_id: int, details: str = ""):
    _insert_activity_log(username, action, target_type, target_id, details)


def log_activity_background(background_tasks, username: str, action: str, target_type: str, target_id: int, details: str = ""):
    background_tasks.add_task(_insert_activity_log, username, action, target_type, target_id, details)
