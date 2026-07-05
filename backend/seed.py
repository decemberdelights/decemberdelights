import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from supabase_client import supabase
from auth import hash_password
from datetime import datetime, timedelta
import random
import json

# Seed super admin
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

# Seed sample orders if none exist
order_count = supabase.table("orders").select("id", count="exact").execute().count or 0
if order_count == 0:
    customer_names = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Rohan", "Meera", "Karan", "Pooja"]
    menu_items = ["Masala Chai", "Samosa", "Paneer Tikka", "Biryani", "Dosa", "Idli Sambar", "Vada Pav", "Pav Bhaji", "Gulab Jamun", "Rasmalai"]
    statuses = ["pending", "preparing", "delivered", "cancelled"]
    payment_methods = ["cash", "upi", "card"]

    now = datetime.now()
    orders = []
    for i in range(30):
        days_ago = random.randint(0, 29)
        order_date = now - timedelta(days=days_ago, hours=random.randint(8, 20), minutes=random.randint(0, 59))
        num_items = random.randint(1, 4)
        order_items = []
        total = 0
        for _ in range(num_items):
            item_name = random.choice(menu_items)
            qty = random.randint(1, 3)
            price = round(random.uniform(50, 300), 2)
            order_items.append({"name": item_name, "qty": qty, "price": price})
            total += qty * price

        status = random.choice(statuses)
        orders.append({
            "customer_name": random.choice(customer_names),
            "customer_email": f"{random.choice(customer_names).lower()}@example.com",
            "customer_phone": f"+91{random.randint(7000000000, 9999999999)}",
            "items": json.dumps(order_items),
            "total": round(total, 2),
            "status": status,
            "payment_method": random.choice(payment_methods),
            "payment_status": "paid" if status in ["delivered", "cancelled"] else "unpaid",
            "created_at": order_date.isoformat(),
        })

    supabase.table("orders").insert(orders).execute()
    print("Seeded 30 sample orders")
else:
    print("Orders already exist")

print("Seed complete!")
