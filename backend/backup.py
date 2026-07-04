import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, DATABASE_URL
from auth import require_super_admin

router = APIRouter()

BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
MAX_BACKUPS = 10


def get_backup_dir() -> str:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    return BACKUP_DIR


def create_backup(reason: str = "auto") -> str:
    """Create a SQL dump backup of the PostgreSQL database."""
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_{reason}_{timestamp}.sql"
    backup_path = os.path.join(backup_dir, backup_name)

    result = subprocess.run(
        ["pg_dump", "--no-owner", "--no-privileges", "-f", backup_path, DATABASE_URL],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")

    cleanup_old_backups()
    return backup_name


def cleanup_old_backups():
    """Keep only the most recent MAX_BACKUPS backups."""
    backup_dir = get_backup_dir()
    backups = sorted(Path(backup_dir).glob("backup_*.sql"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old_backup in backups[MAX_BACKUPS:]:
        old_backup.unlink(missing_ok=True)


def restore_backup(backup_name: str) -> bool:
    """Restore database from a SQL dump backup."""
    backup_dir = get_backup_dir()
    backup_path = os.path.join(backup_dir, backup_name)

    if not os.path.exists(backup_path):
        return False

    create_backup(reason="pre_restore")

    result = subprocess.run(
        ["psql", "-d", DATABASE_URL, "-f", backup_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql restore failed: {result.stderr}")

    return True


@router.get("/api/admin/backups")
def list_backups(_=Depends(require_super_admin)):
    """List all available backups."""
    backup_dir = get_backup_dir()
    backups = []
    for f in sorted(Path(backup_dir).glob("backup_*.sql"), key=lambda p: p.stat().st_mtime, reverse=True):
        stat = f.stat()
        backups.append({
            "name": f.name,
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return {"backups": backups}


@router.post("/api/admin/backups")
def create_backup_endpoint(reason: str = "manual", _=Depends(require_super_admin)):
    """Create a manual backup."""
    backup_name = create_backup(reason=reason)
    return {"ok": True, "backup": backup_name}


@router.post("/api/admin/backups/{backup_name}/restore")
def restore_backup_endpoint(backup_name: str, _=Depends(require_super_admin)):
    """Restore from a backup."""
    if not backup_name.endswith(".sql") or ".." in backup_name:
        raise HTTPException(status_code=400, detail="Invalid backup name")
    success = restore_backup(backup_name)
    if not success:
        raise HTTPException(status_code=404, detail="Backup not found or invalid")
    return {"ok": True, "message": "Database restored. Please restart the server."}


@router.delete("/api/admin/backups/{backup_name}")
def delete_backup(backup_name: str, _=Depends(require_super_admin)):
    """Delete a backup."""
    if not backup_name.endswith(".sql") or ".." in backup_name:
        raise HTTPException(status_code=400, detail="Invalid backup name")
    backup_path = os.path.join(get_backup_dir(), backup_name)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup not found")
    os.remove(backup_path)
    return {"ok": True}
