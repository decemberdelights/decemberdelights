# December Delights — Hostinger Deployment Guide

## Step 1: Build the tar file (on YOUR computer)

Open terminal in your project folder and run:

```bash
bash deploy.sh
```

This creates `decemberdelights-deploy.tar.gz` in your project folder.

---

## Step 2: Upload to Hostinger

1. Login to Hostinger → **hPanel**
2. Go to **Files** → **File Manager**
3. Navigate to `/tmp/` (or upload to home directory)
4. Upload `decemberdelights-deploy.tar.gz`

---

## Step 3: SSH into your server

1. In hPanel → **Advanced** → **SSH Terminal**
2. Enable SSH if not already enabled
3. Connect using the terminal

---

## Step 4: Run the setup script

```bash
cd /tmp
bash setup-server.sh
```

This will:
- Create `/var/www/decemberdelights/`
- Extract all files
- Setup Python virtual environment
- Install all dependencies
- Create `.env` file (you need to edit this!)
- Create systemd services
- Start backend and frontend

---

## Step 5: Edit the .env file

```bash
nano /var/www/decemberdelights/backend/.env
```

**Fill in these values:**

| Variable | Where to find it |
|----------|-----------------|
| `JWT_SECRET` | Generate random: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `SUPABASE_SERVICE_ROLE_KEY` | From your Supabase dashboard → Settings → API |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard → Settings → API Keys |
| `GMAIL_APP_PASSWORD` | Your 16-char app password (no spaces) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase dashboard → Settings → API |

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Setup Nginx

```bash
# Install nginx (if not installed)
sudo apt update && sudo apt install nginx -y

# Copy nginx config
sudo cp /var/www/decemberdelights/nginx.conf /etc/nginx/sites-available/decemberdelights

# Enable the site
sudo ln -s /etc/nginx/sites-available/decemberdelights /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: Setup SSL (HTTPS)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d decemberdelights.in -d www.decemberdelights.in

# Auto-renewal is set up automatically
```

---

## Step 8: Test everything

1. Visit `https://decemberdelights.in` — should show your site
2. Visit `https://decemberdelights.in/api/health` — should return JSON
3. Test the contact form — check your email
4. Test franchise application — check confirmation email

---

## Troubleshooting

### Backend not starting?
```bash
sudo journalctl -u dd-backend -f
```

### Frontend not starting?
```bash
sudo journalctl -u dd-frontend -f
```

### Restart services after code changes:
```bash
sudo systemctl restart dd-backend
sudo systemctl restart dd-frontend
```

### Check if ports are in use:
```bash
sudo netstat -tlnp | grep -E '3000|10000'
```

---

## File structure on server

```
/var/www/decemberdelights/
├── backend/          ← Python FastAPI code
│   ├── main.py
│   ├── .env          ← YOUR SECRETS (never commit this!)
│   ├── routers/
│   ├── email_service.py
│   └── requirements.txt
├── frontend/         ← Next.js built output
│   ├── server.js
│   ├── .next/
│   └── public/
├── venv/             ← Python virtual environment
├── .data/            ← SQLite cache
├── start-backend.sh
└── start-frontend.sh
```
