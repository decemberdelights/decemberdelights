from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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


class AdminLogin(BaseModel):
    username: str
    password: str
