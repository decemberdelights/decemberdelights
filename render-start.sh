#!/bin/bash
# Render start script - runs only the backend

set -e

cd backend

PORT=${PORT:-10000}
HOST=${HOST:-0.0.0.0}

echo "Starting backend on $HOST:$PORT"

exec uvicorn main:app --host "$HOST" --port "$PORT" --workers 1
