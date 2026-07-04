#!/bin/bash
set -e

PORT=${PORT:-5000}
BACKEND_PORT=5000

echo "Starting services on PORT=$PORT"

# Run backend in background
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --workers 1 &
BACKEND_PID=$!
cd ..

# Wait for backend health
echo "Waiting for backend at http://127.0.0.1:$BACKEND_PORT/api/health"
for i in $(seq 1 30); do
    if curl -sS --fail "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
        echo "Backend healthy after $i attempts"
        break
    fi
    sleep 1
done

# Start Next.js frontend
export PORT
node .next/standalone/server.js &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

wait
