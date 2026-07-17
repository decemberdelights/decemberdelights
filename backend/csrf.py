import secrets
import hmac
from fastapi import Request, Response, HTTPException

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"


def generate_csrf_token() -> str:
    return secrets.token_hex(32)


def set_csrf_cookie(response, token: str):
    response.set_cookie(
        CSRF_COOKIE_NAME, token,
        httponly=False,
        samesite="none",
        secure=True,
        max_age=86400,
        path="/",
    )


def rotate_csrf_token(response: Response) -> str:
    new_token = generate_csrf_token()
    set_csrf_cookie(response, new_token)
    return new_token


def validate_csrf(request: Request):
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get(CSRF_HEADER_NAME, "")
    if not cookie_token or not header_token:
        raise HTTPException(status_code=403, detail="CSRF token missing")
    if not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(status_code=403, detail="CSRF token mismatch")
