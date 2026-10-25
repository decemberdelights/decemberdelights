#!/bin/bash
cd /var/www/decemberdelights/backend
if [ ! -f "../venv/bin/activate" ]; then
  python3 -m venv ../venv
  source ../venv/bin/activate
  pip install -r requirements.txt
else
  source ../venv/bin/activate
fi
# Production mode: tight CORS, no localhost dev origins.
export ENV="${ENV:-production}"
# --proxy-headers: honor X-Forwarded-* from our local nginx only, so the
# client IP used for rate limiting is the real one, not nginx's 127.0.0.1.
exec ../venv/bin/uvicorn main:app --host 0.0.0.0 --port "${PORT:-10000}" --workers 1 --proxy-headers --forwarded-allow-ips=127.0.0.1
