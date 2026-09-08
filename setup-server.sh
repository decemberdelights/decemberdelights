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
cat > $DEPLOY_DIR/backend/.env << 'ENVEOF'
ENV=production
HOST=0.0.0.0
PORT=10000
JWT_SECRET=CHANGE_ME_TO_RANDOM_STRING
ADMIN_DEFAULT_PASSWORD=DD1212
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
ENVEOF

echo ""
echo "  >>> IMPORTANT: Edit the .env file with your actual keys!"
echo "  >>> nano $DEPLOY_DIR/backend/.env"

# 5. Create .data directory for SQLite
echo ""
echo "[5/7] Creating data directory..."
mkdir -p $DEPLOY_DIR/.data
chmod 777 $DEPLOY_DIR/.data

# 6. Create systemd services
echo ""
echo "[6/7] Creating systemd services..."

# Backend service
sudo cat > /tmp/dd-backend.service << 'EOF'
[Unit]
Description=December Delights Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/decemberdelights/backend
ExecStart=/var/www/decemberdelights/venv/bin/uvicorn main:app --host 0.0.0.0 --port 10000
Restart=always
RestartSec=5
Environment=PYTHONPATH=/var/www/decemberdelights/backend

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/dd-backend.service /etc/systemd/system/dd-backend.service

# Frontend service
sudo cat > /tmp/dd-frontend.service << 'EOF'
[Unit]
Description=December Delights Frontend (Next.js)
After=network.target dd-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/decemberdelights/frontend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
Environment=NODE_ENV=production

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
