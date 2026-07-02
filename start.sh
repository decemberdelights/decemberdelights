#!/bin/bash

# Ensure database exists
touch backend/database.db

# Run database migrations and seed if needed
python3 -c "
import sys
sys.path.insert(0, 'backend')
from database import engine, Base
from models import *
Base.metadata.create_all(bind=engine)
print('Database initialized')
"

PORT=${PORT:-5000}
echo "Railway assigned PORT=$PORT"

# Run backend on an internal port and frontend on Railway's assigned port
BACKEND_PORT=5000
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" --workers 1 &
BACKEND_PID=$!
cd ..

# Start Next.js standalone frontend on Railway's assigned port
export PORT
node .next/standalone/server.js &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

wait
