#!/bin/bash
cd /var/www/decemberdelights/backend
if [ ! -f "../venv/bin/activate" ]; then
  python3 -m venv ../venv
  source ../venv/bin/activate
  pip install -r requirements.txt
else
  source ../venv/bin/activate
fi
exec uvicorn main:app --host 0.0.0.0 --port 10000
