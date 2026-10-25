#!/bin/bash
# ============================================================
# December Delights — Hostinger Deployment Script
# Run this ON YOUR LOCAL MACHINE (not on server)
# It creates a tar file you upload to Hostinger
# ============================================================

set -e

echo "========================================="
echo " December Delights — Building Deploy Tar"
echo "========================================="

# 1. Install dependencies & build frontend
echo ""
echo "[1/4] Installing frontend dependencies..."
npm ci

echo ""
echo "[2/4] Building Next.js frontend..."
# NEXT_PUBLIC_* vars are baked into the JS at build time — they MUST be set here.
# They are read from .env.local (local dev file, never committed) if present.
if [ -f .env.local ]; then
  echo "Loading NEXT_PUBLIC_* from .env.local for build..."
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi
# Failsafe defaults for production (override in .env.local if needed)
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://www.decemberdelights.in}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://mdnqutroeustyflmmdge.supabase.co}"
export BACKEND_URL="${BACKEND_URL:-http://localhost:10000}"
NEXT_TELEMETRY_DISABLED=1 npm run build

# 3. Create deploy directory
echo ""
echo "[3/4] Preparing deploy package..."
rm -rf deploy
mkdir -p deploy/backend
mkdir -p deploy/frontend

# 4. Copy backend files (hybrid storage + cache + queue + clarity must ship; routers/* covers files.py/system.py)
cp -r backend/main.py backend/auth.py backend/security.py backend/csrf.py \
      backend/store.py backend/supabase_client.py backend/schemas.py \
      backend/activity.py backend/email_service.py backend/seed.py \
      backend/order_pricing.py \
      backend/cache.py backend/local_storage.py backend/local_queue.py \
      backend/requirements.txt deploy/backend/
cp -r backend/routers deploy/backend/
mkdir -p deploy/backend/migrations
cp backend/migrations/*.sql deploy/backend/migrations/
mkdir -p deploy/backend/__pycache__

# 5. Copy frontend files (standalone build)
cp -r .next/standalone/* deploy/frontend/
cp -r .next/static deploy/frontend/.next/static
cp -r public deploy/frontend/public

# 6. Copy deployment helpers
cp start-backend.sh deploy/
cp setup-server.sh nginx.conf deploy/
chmod +x deploy/start-backend.sh

# 7. Create frontend start script
cat > deploy/start-frontend.sh << 'EOF'
#!/bin/bash
cd /var/www/decemberdelights/frontend
export HOSTNAME="0.0.0.0"
export PORT=3000
export NODE_ENV=production
exec node server.js
EOF
chmod +x deploy/start-frontend.sh

# 8. Create env template
# Generate a random admin bootstrap password ONCE per deploy (never ship a
# hardcoded default like DD1212 — it is public in the repo history).
if command -v openssl >/dev/null 2>&1; then
  ADMIN_GEN_PASSWORD="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)"
else
  ADMIN_GEN_PASSWORD="$(python3 -c "import secrets;print(secrets.token_urlsafe(16)[:16])")"
fi
cat > deploy/.env.example << EOF
# Backend Environment Variables
ENV=production
HOST=0.0.0.0
PORT=10000
# Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=CHANGE_ME_TO_RANDOM_STRING
# Bootstrap admin password (random per deploy). Change after first login.
ADMIN_DEFAULT_PASSWORD=${ADMIN_GEN_PASSWORD}
ADMIN_USERNAME=DD@1212
CORS_ORIGINS=http://localhost:3000,https://decemberdelights.in,https://www.decemberdelights.in
FRONTEND_URL=https://www.decemberdelights.in
SUPABASE_URL=https://mdnqutroeustyflmmdge.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=rzp_live_TRgm1vDqyxPZsT
RAZORPAY_KEY_SECRET=your-razorpay-secret
GMAIL_USER=info@decemberdelights.in
GMAIL_APP_PASSWORD=your-app-password
ADMIN_EMAIL=info@decemberdelights.in
BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_API_URL=http://localhost:10000
NEXT_PUBLIC_SUPABASE_URL=https://mdnqutroeustyflmmdge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_TRgm1vDqyxPZsT
PYTHON_VERSION=3.12
STORAGE_MODE=hybrid
UPLOAD_ROOT=/var/www/decemberdelights/uploads
EOF

echo ""
echo "========================================================"
echo " One-time admin bootstrap password (also written to"
echo " deploy/.env.example — copy it somewhere safe NOW):"
echo ""
echo "   ADMIN_DEFAULT_PASSWORD=${ADMIN_GEN_PASSWORD}"
echo ""
echo " Change it after the first admin login. JWT_SECRET must"
echo " be replaced with a random value on the server:"
echo "   python3 -c \"import secrets; print(secrets.token_hex(32))\""
echo "========================================================"

# 9. Create the tar file (never include secrets; never include local uploads/.data)
echo ""
echo "[4/4] Creating tar file..."
rm -f deploy/.env deploy/.env.local deploy/.env.production backend/.env 2>/dev/null || true
tar --exclude='./uploads' --exclude='./.data' -czf decemberdelights-deploy.tar.gz -C deploy .

echo ""
echo "========================================="
echo " DONE! File created:"
echo "   decemberdelights-deploy.tar.gz"
echo ""
echo " Upload this file to Hostinger and"
echo " follow the server setup steps."
echo "========================================="
