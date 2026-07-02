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

# Start FastAPI backend on port 5000
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 5000 --workers 1 &
BACKEND_PID=$!
cd ..

# Start Next.js frontend on port 3000
npm start &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

wait
