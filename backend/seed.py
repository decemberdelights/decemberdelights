import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base, SessionLocal
from models import AdminUser, MenuItem, Product, Job, Order
from auth import hash_password
from sqlalchemy import text
from datetime import datetime, timedelta
import random
import json

Base.metadata.create_all(bind=engine)

# Migration: ensure all required columns exist in admin_users
with engine.connect() as conn:
    result = conn.execute(text("PRAGMA table_info(admin_users)")).fetchall()
    col_names = {row[1] for row in result}
    if "role" not in col_names:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin'"))
        print("Migration: added role column to admin_users")
    if "is_active" not in col_names:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN is_active INTEGER DEFAULT 1"))
        print("Migration: added is_active column to admin_users")
    conn.commit()

# Migration: ensure orders table has all required columns
ALLOWED_ORDER_COLS = {
    "customer_email", "customer_phone", "items", "total",
    "status", "payment_method", "payment_status", "notes", "updated_at",
}
ORDER_COL_TYPES = {
    "customer_email": "TEXT DEFAULT ''",
    "customer_phone": "TEXT DEFAULT ''",
    "items": "TEXT DEFAULT ''",
    "total": "REAL DEFAULT 0",
    "status": "TEXT DEFAULT 'pending'",
    "payment_method": "TEXT DEFAULT 'cash'",
    "payment_status": "TEXT DEFAULT 'unpaid'",
    "notes": "TEXT DEFAULT ''",
    "updated_at": "DATETIME",
}

with engine.connect() as conn:
    result = conn.execute(text("PRAGMA table_info(orders)")).fetchall()
    col_names = {row[1] for row in result}
    for col_name in ALLOWED_ORDER_COLS:
        if col_name not in col_names:
            col_type = ORDER_COL_TYPES[col_name]
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
            print(f"Migration: added {col_name} column to orders")
    conn.commit()

db = SessionLocal()

# Seed super admin only using environment variables
default_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "changeme")
admins_to_seed = [
    {"username": os.environ.get("ADMIN_USERNAME", "admin"), "password": default_password, "role": "super_admin"},
]

for a in admins_to_seed:
    if not db.query(AdminUser).filter(AdminUser.username == a["username"]).first():
        db.add(AdminUser(username=a["username"], password_hash=hash_password(a["password"]), role=a["role"]))
        db.commit()
        print(f"Created {a['role']}: {a['username']}")
    else:
        # Ensure existing admin has correct role
        user = db.query(AdminUser).filter(AdminUser.username == a["username"]).first()
        if user.role != a["role"]:
            user.role = a["role"]
            db.commit()
            print(f"Updated {a['username']} role to {a['role']}")
        print(f"Already exists: {a['username']}")

# Seed sample orders if none exist
if db.query(Order).count() == 0:
    customer_names = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Rohan", "Meera", "Karan", "Pooja"]
    menu_items = ["Masala Chai", "Samosa", "Paneer Tikka", "Biryani", "Dosa", "Idli Sambar", "Vada Pav", "Pav Bhaji", "Gulab Jamun", "Rasmalai"]
    statuses = ["pending", "preparing", "delivered", "cancelled"]
    payment_methods = ["cash", "upi", "card"]
    
    now = datetime.now()
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
        order = Order(
            customer_name=random.choice(customer_names),
            customer_email=f"{random.choice(customer_names).lower()}@example.com",
            customer_phone=f"+91{random.randint(7000000000, 9999999999)}",
            items=json.dumps(order_items),
            total=round(total, 2),
            status=status,
            payment_method=random.choice(payment_methods),
            payment_status="paid" if status in ["delivered", "cancelled"] else "unpaid",
            created_at=order_date,
        )
        db.add(order)
    db.commit()
    print("Seeded 30 sample orders")
else:
    print("Orders already exist")

db.close()
print("Seed complete!")
