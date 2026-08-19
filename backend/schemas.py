from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class FranchiseLogin(BaseModel):
    phone: str
    dob: str


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
    razorpay_payment_id: str = ""
    razorpay_order_id: str = ""
    tc_accepted: bool = False
    aadhaar: str = ""
    pan: str = ""
    bank_statement: str = ""
    address_proof: str = ""
    other_docs: str = ""
    tc_video: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    username: str
    password: str
