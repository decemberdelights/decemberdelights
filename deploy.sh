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
NEXT_TELEMETRY_DISABLED=1 npm run build

# 3. Create deploy directory
echo ""
echo "[3/4] Preparing deploy package..."
rm -rf deploy
mkdir -p deploy/backend
mkdir -p deploy/frontend

# 4. Copy backend files
cp -r backend/main.py backend/auth.py backend/security.py backend/csrf.py \
      backend/store.py backend/supabase_client.py backend/schemas.py \
      backend/activity.py backend/email_service.py backend/seed.py \
      backend/requirements.txt deploy/backend/
cp -r backend/routers deploy/backend/
mkdir -p deploy/backend/__pycache__

# 5. Copy frontend files (standalone build)
cp -r .next/standalone/* deploy/frontend/
cp -r .next/static deploy/frontend/.next/static
cp -r public deploy/frontend/public

# 6. Copy deployment helpers
cp start-backend.sh deploy/
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
cat > deploy/.env.example << 'EOF'
# Backend Environment Variables
ENV=production
HOST=0.0.0.0
PORT=10000
JWT_SECRET=your-jwt-secret
ADMIN_DEFAULT_PASSWORD=DD1212
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
EOF

# 9. Create the tar file
echo ""
echo "[4/4] Creating tar file..."
tar -czf decemberdelights-deploy.tar.gz -C deploy .

echo ""
echo "========================================="
echo " DONE! File created:"
echo "   decemberdelights-deploy.tar.gz"
echo ""
echo " Upload this file to Hostinger and"
echo " follow the server setup steps."
echo "========================================="
