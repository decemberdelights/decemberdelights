from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime
from sqlalchemy.sql import func
from database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    price = Column(String(20), default="")
    image_url = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    price = Column(Float, default=0)
    original_price = Column(Float, default=0)
    category = Column(String(100), default="")
    image_url = Column(String(500), default="")
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    offer = Column(String(50), default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    department = Column(String(100), default="")
    location = Column(String(200), default="")
    description = Column(Text, default="")
    requirements = Column(Text, default="")
    salary_range = Column(String(100), default="")
    job_type = Column(String(50), default="full-time")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class FranchiseApplication(Base):
    __tablename__ = "franchise_applications"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(200), nullable=False)
    business_experience = Column(Text, default="")
    preferred_location = Column(String(200), default="")
    investment_capability = Column(String(100), default="")
    message = Column(Text, default="")
    aadhaar = Column(String(500), default="")
    pan = Column(String(500), default="")
    bank_statement = Column(String(500), default="")
    id_proof = Column(String(500), default="")
    address_proof = Column(String(500), default="")
    other_docs = Column(String(500), default="")
    tc_accepted = Column(Boolean, default=False)
    tc_language = Column(String(10), default="en")
    status = Column(String(50), default="pending")
    tier = Column(String(50), default="")
    city = Column(String(100), default="")
    admin_notes = Column(Text, default="")
    login_id = Column(String(100), default="")
    payment_status = Column(String(50), default="unpaid")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CareerApplication(Base):
    __tablename__ = "career_applications"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    position = Column(String(200), default="")
    message = Column(Text, default="")
    resume_url = Column(String(500), default="")
    status = Column(String(50), default="pending")
    admin_notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), default="")
    email = Column(String(200), default="")
    phone = Column(String(20), default="")
    subject = Column(String(300), default="")
    message = Column(Text, default="")
    status = Column(String(50), default="pending")
    admin_notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(200), default="")
    customer_email = Column(String(200), default="")
    customer_phone = Column(String(20), default="")
    customer_address = Column(String(500), default="")
    items = Column(Text, default="")  # JSON array of {name, qty, price}
    total = Column(Float, default=0)
    status = Column(String(50), default="pending")  # pending, preparing, delivered, cancelled
    payment_method = Column(String(50), default="cash")
    payment_status = Column(String(50), default="unpaid")  # unpaid, paid
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="admin")  # "super_admin" or "admin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_username = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=False)
    details = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
