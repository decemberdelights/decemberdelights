"""Secure private file serving for hybrid storage.
- Public /uploads/public/* is served by Nginx directly (immutable cache) in prod,
  and by FastAPI StaticFiles in dev (mounted in main.py).
- Private /uploads/private/* is NEVER exposed via Nginx. Use these authenticated routes:
  GET /api/files/franchise/{filename} -> require admin (franchise docs)
  GET /api/files/career/{filename}   -> require admin (resumes)
  Filenames are strict [A-Za-z0-9_.-], no subpaths, no traversal.
"""
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from auth import get_current_admin
from local_storage import local_path_for_url, guess_content_type

router = APIRouter()

_SAFE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_\-\.]{1,80}$")


def _serve_private(subdir: str, filename: str):
    if not _SAFE.match(filename or ""):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    url = f"/uploads/private/{subdir}/{filename}"
    path = local_path_for_url(url)
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path,
        media_type=guess_content_type(filename, "application/octet-stream"),
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=60",
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )


@router.get("/api/files/franchise/{filename}")
def get_franchise_file(filename: str, _=Depends(get_current_admin)):
    return _serve_private("franchise", filename)


@router.get("/api/files/career/{filename}")
def get_career_file(filename: str, _=Depends(get_current_admin)):
    return _serve_private("career", filename)
