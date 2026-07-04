#!/bin/bash
set -e

PORT=${PORT:-8080}
BACKEND_PORT=4000

echo "Starting services — frontend on port $PORT, backend on port $BACKEND_PORT"

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
    if [ "$i" -eq 30 ]; then
        echo "WARNING: Backend health check timed out after 30 seconds"
    fi
    sleep 1
done

# Start Next.js frontend on Railway's assigned port
export PORT
node .next/standalone/server.js &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

wait
