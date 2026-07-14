from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MenuItemBase(BaseModel):
    category: str = ""
    name: str = ""
    description: str = ""
    price: str = ""
    image_url: str = ""
    is_active: bool = True
    sort_order: int = 0


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemOut(MenuItemBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str = ""
    description: str = ""
    price: float = 0
    original_price: float = 0
    category: str = ""
    image_url: str = ""
    stock: int = 0
    is_active: bool = True
    offer: str = ""
    sort_order: int = 0


class ProductCreate(ProductBase):
    pass


class ProductOut(ProductBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobBase(BaseModel):
    title: str = ""
    department: str = ""
    location: str = ""
    description: str = ""
    requirements: str = ""
    salary_range: str = ""
    job_type: str = "full-time"
    is_active: bool = True


class JobCreate(JobBase):
    pass


class JobOut(JobBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FranchiseCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    business_experience: str = ""
    preferred_location: str = ""
    investment_capability: str = ""
    message: str = ""
    tc_accepted: bool = False
    tc_language: str = "en"


class FranchiseLogin(BaseModel):
    phone: str
    password: str


class FranchiseOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    preferred_location: str = ""
    status: str = "pending"
    tier: str = ""
    city: str = ""
    admin_notes: str = ""
    login_id: str = ""
    payment_status: str = "unpaid"
    tc_accepted: bool = False
    aadhaar: str = ""
    pan: str = ""
    bank_statement: str = ""
    id_proof: str = ""
    address_proof: str = ""
    other_docs: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CareerCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    position: str = ""
    message: str = ""


class CareerOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    position: str = ""
    message: str = ""
    resume_url: str = ""
    status: str = "pending"
    admin_notes: str = ""
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContactOut(BaseModel):
    id: int
    name: str = ""
    email: str = ""
    phone: str = ""
    subject: str = ""
    message: str = ""
    status: str = "pending"
    admin_notes: str = ""
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    username: str
    password: str


class ApplicationUpdate(BaseModel):
    status: str
    admin_notes: str = ""


class OrderCreate(BaseModel):
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    items: str = ""
    total: float = 0
    status: str = "pending"
    payment_method: str = "cash"
    payment_status: str = "unpaid"
    notes: str = ""


class OrderOut(BaseModel):
    id: int
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    customer_address: str = ""
    items: str = ""
    total: float = 0
    status: str = "pending"
    payment_method: str = "cash"
    payment_status: str = "unpaid"
    notes: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str
    admin_notes: str = ""


class StatsOut(BaseModel):
    franchise_count: int = 0
    career_count: int = 0
    contact_count: int = 0
    menu_count: int = 0
    product_count: int = 0
    job_opening_count: int = 0
    order_count: int = 0
    total_revenue: float = 0
    admin_count: int = 0
    pending_franchise: int = 0
    pending_careers: int = 0
    pending_contacts: int = 0
    submitted_franchise: int = 0
    under_process_franchise: int = 0
    approved_franchise: int = 0
    rejected_franchise: int = 0
    approved_careers: int = 0
    rejected_careers: int = 0
    pending_orders: int = 0
    preparing_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    today_orders: int = 0
    today_revenue: float = 0
    products_online: int = 0
    franchise_month_count: int = 0
