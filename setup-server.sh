#!/bin/bash
# ============================================================
# December Delights — Server Setup Script
# Run this ON HOSTINGER SERVER after uploading the tar file
# ============================================================

set -e

DEPLOY_DIR="/var/www/decemberdelights"
TAR_FILE="/tmp/decemberdelights-deploy.tar.gz"

echo "========================================="
echo " December Delights — Server Setup"
echo "========================================="

# 1. Create directory
echo ""
echo "[1/7] Creating deployment directory..."
sudo mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# 2. Extract tar file
echo ""
echo "[2/7] Extracting files..."
sudo tar -xzf $TAR_FILE
sudo rm $TAR_FILE

# 3. Setup Python backend
echo ""
echo "[3/7] Setting up Python backend..."
cd $DEPLOY_DIR/backend

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Install it from Hostinger control panel."
    exit 1
fi

# Create virtual environment
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Create .env file
echo ""
echo "[4/7] Creating .env file..."

# Auto-generate secrets — the backend now REFUSES to start with a
# placeholder/short JWT_SECRET, and we must never ship default admin creds.
JWT_GEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")
if command -v openssl &> /dev/null; then
    ADMIN_GEN_PASSWORD=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)
else
    ADMIN_GEN_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16)[:16])")
fi

cat > $DEPLOY_DIR/backend/.env << ENVEOF
ENV=production
HOST=0.0.0.0
PORT=10000
JWT_SECRET=${JWT_GEN}
ADMIN_DEFAULT_PASSWORD=${ADMIN_GEN_PASSWORD}
ADMIN_USERNAME=DD@1212
CORS_ORIGINS=http://localhost:3000,https://decemberdelights.in,https://www.decemberdelights.in
FRONTEND_URL=https://www.decemberdelights.in
SUPABASE_URL=https://mdnqutroeustyflmmdge.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_KEY_HERE
RAZORPAY_KEY_ID=rzp_live_TRgm1vDqyxPZsT
RAZORPAY_KEY_SECRET=PASTE_YOUR_KEY_HERE
GMAIL_USER=info@decemberdelights.in
GMAIL_APP_PASSWORD=PASTE_YOUR_APP_PASSWORD_HERE
ADMIN_EMAIL=info@decemberdelights.in
BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_API_URL=http://localhost:10000
NEXT_PUBLIC_SUPABASE_URL=https://mdnqutroeustyflmmdge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_YOUR_KEY_HERE
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_TRgm1vDqyxPZsT
STORAGE_MODE=hybrid
UPLOAD_ROOT=/var/www/decemberdelights/uploads
ENVEOF
chmod 600 $DEPLOY_DIR/backend/.env

echo ""
echo "============================================================"
echo " Auto-generated (save these NOW; change admin password"
echo " after first login):"
echo ""
echo "   JWT_SECRET is set (random, 64 hex chars)"
echo "   ADMIN_DEFAULT_PASSWORD=${ADMIN_GEN_PASSWORD}"
echo ""
echo "  >>> Still paste your keys into .env:"
echo "  >>> nano $DEPLOY_DIR/backend/.env"
echo "  >>> (SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_SECRET,"
echo "  >>>  GMAIL_APP_PASSWORD, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
echo "============================================================"

# 5. Create .data + uploads directories for SQLite + hybrid storage (PRESERVED across redeploys)
echo ""
echo "[5/7] Creating data + uploads directories..."
mkdir -p $DEPLOY_DIR/.data
chmod 750 $DEPLOY_DIR/.data
mkdir -p $DEPLOY_DIR/uploads/public/products $DEPLOY_DIR/uploads/public/menu
mkdir -p $DEPLOY_DIR/uploads/private/franchise $DEPLOY_DIR/uploads/private/career
chmod 755 $DEPLOY_DIR/uploads/public
chmod 750 $DEPLOY_DIR/uploads/private

# 6. Create systemd services
echo ""
echo "[6/7] Creating systemd services..."

# Fix ownership first — files were extracted as root, services run as www-data.
# Without this the backend can't write .data/ and crashes in a restart loop (100% CPU).
sudo chown -R www-data:www-data $DEPLOY_DIR
sudo chmod 755 $DEPLOY_DIR

# Detect real node binary (Hostinger images: /usr/local/bin/node or nvm path, not always /usr/bin/node)
NODE_BIN=$(command -v node || echo "/usr/bin/node")
echo "Using node: $NODE_BIN"

# Backend service — single worker, env file, crash backoff so a bad .env can't hot-loop CPU
sudo tee /tmp/dd-backend.service > /dev/null << EOF
[Unit]
Description=December Delights Backend (FastAPI)
After=network.target
StartLimitIntervalSec=120
StartLimitBurst=5

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/decemberdelights/backend
EnvironmentFile=/var/www/decemberdelights/backend/.env
ExecStart=/var/www/decemberdelights/venv/bin/uvicorn main:app --host 0.0.0.0 --port 10000 --workers 1 --log-level info --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
RestartSec=10
Environment=PYTHONPATH=/var/www/decemberdelights/backend
# CPU/RAM guardrails for small VPS (prevents one service eating 100% CPU forever)
CPUQuota=80%
MemoryMax=512M
StandardOutput=journal
StandardError=journal
SystemMaxUse=100M

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/dd-backend.service /etc/systemd/system/dd-backend.service

# Frontend service
sudo tee /tmp/dd-frontend.service > /dev/null << EOF
[Unit]
Description=December Delights Frontend (Next.js)
After=network.target dd-backend.service
StartLimitIntervalSec=120
StartLimitBurst=5

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/decemberdelights/frontend
ExecStart=$NODE_BIN server.js
Restart=on-failure
RestartSec=10
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
Environment=NODE_ENV=production
CPUQuota=80%
MemoryMax=768M

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/dd-frontend.service /etc/systemd/system/dd-frontend.service

# 7. Enable and start services
echo ""
echo "[7/7] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable dd-backend dd-frontend
sudo systemctl restart dd-backend
sleep 3
sudo systemctl restart dd-frontend

echo ""
echo "========================================="
echo " DONE! Services started."
echo ""
echo " Backend:  http://localhost:10000"
echo " Frontend: http://localhost:3000"
echo ""
echo " Next: Setup Nginx reverse proxy"
echo " (see nginx config below)"
echo "========================================="
