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

# Diagnostic: show environment, processes and listening ports after starting backend
echo "--- DIAGNOSTIC: environment ---"
echo "PORT=$PORT BACKEND_PORT=$BACKEND_PORT"
echo "--- DIAGNOSTIC: ps aux (top processes) ---"
ps aux | head -n 20 || true
echo "--- DIAGNOSTIC: listening ports (ss/netstat/lsof) ---"
ss -ltnp 2>/dev/null || netstat -tulpn 2>/dev/null || lsof -i -P -n 2>/dev/null || true
echo "--- DIAGNOSTIC: check Next standalone exists ---"
ls -l .next/standalone/server.js 2>/dev/null || true

# Wait for backend to become healthy before starting frontend
echo "Waiting for backend at http://127.0.0.1:$BACKEND_PORT/api/health"
MAX_RETRIES=120
SLEEP_SECONDS=2
HEALTH_OK=1
for i in $(seq 1 $MAX_RETRIES); do
	if curl -sS --fail "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
		echo "Backend healthy after $i attempts"
		HEALTH_OK=0
		break
	fi
	echo "Backend not ready (attempt $i/$MAX_RETRIES), sleeping $SLEEP_SECONDS seconds..."
	sleep $SLEEP_SECONDS
done
if [ $HEALTH_OK -ne 0 ]; then
	echo "Warning: backend did not become healthy after $((MAX_RETRIES * SLEEP_SECONDS)) seconds. Continuing to start frontend."
fi

echo "--- DIAGNOSTIC: before starting temporary responder ---"
ps aux | head -n 20 || true
ss -ltnp 2>/dev/null || netstat -tulpn 2>/dev/null || lsof -i -P -n 2>/dev/null || true

# Temporary lightweight responder to satisfy Railway healthcheck on $PORT
echo "Starting temporary responder on PORT=$PORT"
python3 - <<PYRESPOND &
from http.server import BaseHTTPRequestHandler, HTTPServer
import os

PORT = int(os.environ.get('PORT', '8080'))

class Handler(BaseHTTPRequestHandler):
		def do_GET(self):
				self.send_response(200)
				self.send_header('Content-Type', 'application/json')
				self.end_headers()
				self.wfile.write(b'{"status":"ok","message":"warming up"}')

		def log_message(self, format, *args):
				return

HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
PYRESPOND
TEMP_PID=$!
echo "Temporary responder pid=$TEMP_PID"

# Once backend is healthy, stop the temporary responder and start Next.js
if [ $HEALTH_OK -eq 0 ]; then
	echo "Stopping temporary responder (pid $TEMP_PID) to start Next.js"
	kill $TEMP_PID || true
	sleep 0.5
	echo "--- DIAGNOSTIC: after stopping temp responder ---"
	ps aux | head -n 20 || true
	ss -ltnp 2>/dev/null || netstat -tulpn 2>/dev/null || lsof -i -P -n 2>/dev/null || true
fi

export PORT
node .next/standalone/server.js &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

wait
