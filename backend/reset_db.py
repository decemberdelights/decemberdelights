import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from supabase_client import supabase
from auth import hash_password

TABLES_TO_CLEAR = [
    "activity_logs",
    "orders",
    "franchise_applications",
    "career_applications",
    "contact_messages",
    "menu_items",
    "products",
    "jobs",
]

def reset_all():
    print("=== Database Reset ===\n")

    for table in TABLES_TO_CLEAR:
        try:
            result = supabase.table(table).select("id").execute()
            count = len(result.data) if result.data else 0
            if count > 0:
                ids = [r["id"] for r in result.data]
                supabase.table(table).delete().in_("id", ids).execute()
                print(f"  Cleared {count} rows from '{table}'")
            else:
                print(f"  '{table}' was already empty")
        except Exception as e:
            print(f"  Error clearing '{table}': {e}")

    print("\n=== Re-seeding admin user ===")
    default_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "changeme")
    admin_username = os.environ.get("ADMIN_USERNAME", "admin")

    existing = supabase.table("admin_users").select("*").eq("username", admin_username).execute()
    if not existing.data:
        supabase.table("admin_users").insert({
            "username": admin_username,
            "password_hash": hash_password(default_password),
            "role": "super_admin",
            "is_active": True,
        }).execute()
        print(f"  Created super_admin: {admin_username}")
    else:
        supabase.table("admin_users").update({
            "password_hash": hash_password(default_password),
            "role": "super_admin",
            "is_active": True,
        }).eq("username", admin_username).execute()
        print(f"  Reset '{admin_username}' password and role from env")

    print("\nDone! Database is clean.")


if __name__ == "__main__":
    confirm = input("This will DELETE ALL data from every table. Type 'yes' to confirm: ")
    if confirm.strip().lower() == "yes":
        reset_all()
    else:
        print("Cancelled.")
