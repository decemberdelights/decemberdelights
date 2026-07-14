import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from supabase_client import supabase
from auth import hash_password

# Seed super admin only
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
    print(f"Created super_admin: {admin_username}")
else:
    supabase.table("admin_users").update({
        "password_hash": hash_password(default_password),
        "role": "super_admin",
    }).eq("username", admin_username).execute()
    print(f"Updated {admin_username} password and role from env")

print("Seed complete!")
