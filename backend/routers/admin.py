from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import FranchiseApplication, CareerApplication, ContactMessage, MenuItem, Product, Job, Order, AdminUser, ActivityLog
from schemas import StatsOut, FranchiseOut, CareerOut, ContactOut, ApplicationUpdate
from auth import get_current_admin, require_super_admin
from security import validate_application_status, sanitize_input
from routers.franchise import delete_app_files
from routers.careers import delete_career_files
from typing import List, Optional

router = APIRouter()


class DeleteRequest(BaseModel):
    reason: str = ""


def log_activity(db: Session, username: str, action: str, target_type: str, target_id: int, details: str = ""):
    log = ActivityLog(admin_username=username, action=action, target_type=target_type, target_id=target_id, details=details)
    db.add(log)
    db.commit()


@router.get("/api/admin/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)
    today_orders = db.query(Order).filter(func.date(Order.created_at) == today).all()
    franchise_month = db.query(FranchiseApplication).filter(func.date(FranchiseApplication.created_at) >= month_start).count()
    return StatsOut(
        franchise_count=db.query(FranchiseApplication).count(),
        career_count=db.query(CareerApplication).count(),
        contact_count=db.query(ContactMessage).count(),
        menu_count=db.query(MenuItem).count(),
        product_count=db.query(Product).count(),
        job_opening_count=db.query(Job).filter(Job.is_active == True).count(),
        order_count=db.query(Order).count(),
        total_revenue=db.query(func.coalesce(func.sum(Order.total), 0)).scalar(),
        admin_count=db.query(AdminUser).count(),
        pending_franchise=db.query(FranchiseApplication).filter(FranchiseApplication.status == "pending").count(),
        pending_careers=db.query(CareerApplication).filter(CareerApplication.status == "pending").count(),
        pending_contacts=db.query(ContactMessage).filter(ContactMessage.status == "pending").count(),
        submitted_franchise=db.query(FranchiseApplication).filter(FranchiseApplication.status == "submitted").count(),
        under_process_franchise=db.query(FranchiseApplication).filter(FranchiseApplication.status == "under_process").count(),
        approved_franchise=db.query(FranchiseApplication).filter(FranchiseApplication.status == "approved").count(),
        rejected_franchise=db.query(FranchiseApplication).filter(FranchiseApplication.status == "rejected").count(),
        approved_careers=db.query(CareerApplication).filter(CareerApplication.status == "approved").count(),
        rejected_careers=db.query(CareerApplication).filter(CareerApplication.status == "rejected").count(),
        pending_orders=db.query(Order).filter(Order.status == "pending").count(),
        preparing_orders=db.query(Order).filter(Order.status == "preparing").count(),
        delivered_orders=db.query(Order).filter(Order.status == "delivered").count(),
        cancelled_orders=db.query(Order).filter(Order.status == "cancelled").count(),
        today_orders=len(today_orders),
        today_revenue=sum(o.total for o in today_orders),
        products_online=db.query(Product).filter(Product.is_active == True).count(),
        franchise_month_count=franchise_month,
    ).model_dump()


@router.get("/api/admin/applications")
def get_applications(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return {
        "franchise": [FranchiseOut.model_validate(a).model_dump() for a in db.query(FranchiseApplication).order_by(FranchiseApplication.created_at.desc()).all()],
        "careers": [CareerOut.model_validate(a).model_dump() for a in db.query(CareerApplication).order_by(CareerApplication.created_at.desc()).all()],
        "contacts": [ContactOut.model_validate(a).model_dump() for a in db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()],
    }


@router.put("/api/admin/franchise/{app_id}")
def update_franchise(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    app = db.query(FranchiseApplication).filter(FranchiseApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = data.status
    app.admin_notes = sanitize_input(data.admin_notes, 2000)
    db.commit()
    return {"ok": True}


@router.put("/api/admin/careers/{app_id}")
def update_career(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    app = db.query(CareerApplication).filter(CareerApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = data.status
    app.admin_notes = sanitize_input(data.admin_notes, 2000)
    db.commit()
    return {"ok": True}


@router.put("/api/admin/contacts/{app_id}")
def update_contact(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if not validate_application_status(data.status):
        raise HTTPException(status_code=400, detail="Invalid status")
    app = db.query(ContactMessage).filter(ContactMessage.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Message not found")
    app.status = data.status
    app.admin_notes = sanitize_input(data.admin_notes, 2000)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/franchise/{app_id}")
def delete_franchise(app_id: int, data: Optional[DeleteRequest] = None, db: Session = Depends(get_db), admin=Depends(require_super_admin)):
    app = db.query(FranchiseApplication).filter(FranchiseApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    reason = data.reason if data else ""
    log_activity(db, admin.username, "delete", "franchise", app_id, f"Deleted franchise application of {app.full_name}. Reason: {reason}")
    delete_app_files(app)
    db.delete(app)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/careers/{app_id}")
def delete_career(app_id: int, data: Optional[DeleteRequest] = None, db: Session = Depends(get_db), admin=Depends(require_super_admin)):
    app = db.query(CareerApplication).filter(CareerApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    reason = data.reason if data else ""
    log_activity(db, admin.username, "delete", "career", app_id, f"Deleted career application of {app.full_name}. Reason: {reason}")
    delete_career_files(app)
    db.delete(app)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/contacts/{app_id}")
def delete_contact(app_id: int, data: Optional[DeleteRequest] = None, db: Session = Depends(get_db), admin=Depends(require_super_admin)):
    app = db.query(ContactMessage).filter(ContactMessage.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Message not found")
    reason = data.reason if data else ""
    log_activity(db, admin.username, "delete", "contact", app_id, f"Deleted contact message from {app.name}. Reason: {reason}")
    db.delete(app)
    db.commit()
    return {"ok": True}


@router.get("/api/admin/logs")
def get_logs(limit: int = 100, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return {"logs": [
        {"id": l.id, "admin_username": l.admin_username, "action": l.action, "target_type": l.target_type, "target_id": l.target_id, "details": l.details, "created_at": l.created_at.isoformat() if l.created_at else None}
        for l in logs
    ]}


@router.get("/api/admin/franchise/cities")
def get_franchise_cities(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    cities = db.query(FranchiseApplication.city).filter(FranchiseApplication.city != "").distinct().all()
    return [c[0] for c in cities]
