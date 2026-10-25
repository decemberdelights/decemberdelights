# December Delights — Hostinger Deployment Guide

## Before deployment

This guide targets a **Hostinger VPS** with sudo access. Shared Web Hosting
does not provide the systemd/Nginx/root access used by this deployment.
You need the SSH username, server IP, and password from hPanel, plus:

- Node.js 20+, Python 3 with `venv`, and sudo on the VPS.
- Your domain A records pointed to the VPS IP and access to manage DNS.
- Supabase access to apply the SQL migrations below.
- Supabase service-role and anon keys, Razorpay credentials, and (if you want
  transactional email) Gmail app-password credentials.

Never share your SSH password or application secrets in chat. Type the SSH
password only at the secure prompt.

## Step 1: Build the package on Windows

Open PowerShell in the repository folder:

```powershell
.\build.ps1
```

This runs a production build and creates `decemberdelights-deploy.tar.gz`.
Do not upload `.env.local` or other secret files.

## Step 2: Upload the package and setup script

Replace `SSH_USER` and `SERVER_IP` with the values from Hostinger hPanel.
Run from PowerShell in the repository folder; SCP will prompt for the SSH
password without placing it in the command:

```powershell
scp .\decemberdelights-deploy.tar.gz SSH_USER@SERVER_IP:/tmp/
scp .\setup-server.sh SSH_USER@SERVER_IP:/tmp/
```

If `scp` is not recognized, enable/install the Windows OpenSSH Client optional
feature.

## Step 3: Run first-time server setup

Connect from PowerShell:

```powershell
ssh SSH_USER@SERVER_IP
```

Then run on the VPS:

```bash
sudo bash /tmp/setup-server.sh
```

This extracts the package, sets up the Python virtual environment, creates
systemd services, and generates a random bootstrap admin password. Save the
password privately from the setup output and change it after your first admin
login. The generated `.env` has placeholders; the site is not ready for live
traffic until you configure them below.

---

## Step 4: Apply Supabase database migrations

Open `backend/migrations/complete_supabase_setup.sql` from this repository,
copy its entire contents into Supabase Dashboard -> SQL Editor -> New query,
then run it. This is the single current SQL script for both fresh and existing
installations. It creates/updates the schema, backfills package weights,
records Shop Terms acceptance on orders, sets up indexes and atomic stock/order
functions, and enables row-level security without exposing customer data to the
browser anon key. The backend's service-role key bypasses RLS. It is safe to
re-run and does not insert demo records or create a default admin account.

For an existing database, the script creates a unique index on Razorpay payment
IDs. If that statement reports duplicate payment IDs, resolve those records
before retrying the script. The numbered migration files are retained as
upgrade history; do not run migrations 006, 007, or 008 separately if you have
already run the complete setup script.

The complete SQL script stores product package weights in Supabase and
backfills recognizable catalog weights, using 250 g where no weight is found.
Confirm or correct product weights in Admin → Products. Shop-specific terms
text is stored by the backend in its existing SQLite terms database and is
seeded on backend startup; the accepted terms version and timestamp are stored
in Supabase with each order.

Do not run `002_seed_data.sql` on production: it contains fake customer records
and an insecure demo admin account. Do not accept live payments until the SQL
query completes successfully. The deployment uses `STORAGE_MODE=hybrid`, so
new uploads go to VPS disk and Supabase Storage buckets are not required.

---

## Step 5: Configure backend secrets before going live

```bash
nano /var/www/decemberdelights/backend/.env
```

Replace all `PASTE_...` placeholders and verify the generated values. Required
settings include:

| Variable | Where to find it |
|----------|-----------------|
| `JWT_SECRET` | Generate: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail account and its App Password (optional; required for email) |
| `ADMIN_EMAIL` | Inbox for franchise/admin notifications |

Keep `SUPABASE_URL` and `FRONTEND_URL` correct for your project/domain.
Save: Ctrl+O, Enter, then Ctrl+X. The file should remain mode 600. Restart:

```bash
sudo systemctl restart dd-backend dd-frontend
sudo systemctl status dd-backend dd-frontend --no-pager
```

## Step 6: Setup Nginx and HTTPS

```bash
sudo apt update
sudo apt install -y nginx certbot
sudo mkdir -p /var/www/certbot
sudo cp /var/www/decemberdelights/nginx.bootstrap.conf /etc/nginx/sites-available/decemberdelights
sudo ln -sfn /etc/nginx/sites-available/decemberdelights /etc/nginx/sites-enabled/decemberdelights
sudo nginx -t
sudo systemctl reload nginx
```

First ensure both `decemberdelights.in` and `www.decemberdelights.in` resolve
to the VPS IP and ports 80/443 are allowed through the firewall. Obtain the
certificate using the temporary HTTP challenge-only configuration:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d decemberdelights.in -d www.decemberdelights.in
```

Only after Certbot reports success, install the final configuration. It has an
active HTTPS virtual host and redirects all normal HTTP requests to HTTPS while
leaving the ACME challenge path available for automatic renewal:

```bash
sudo cp /var/www/decemberdelights/nginx.conf /etc/nginx/sites-available/decemberdelights
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Do not start live traffic if certificate issuance or `nginx -t` fails.

## Step 7: Smoke-test before launch

On the VPS:

```bash
curl -fsS http://127.0.0.1:10000/api/ready
curl -I https://www.decemberdelights.in
curl -fsS https://www.decemberdelights.in/api/health
```

Also test checkout using Razorpay test mode, a franchise application, admin
login, transactional email (if configured), and order tracking. Do not enable
live payments until all required Supabase migrations have succeeded.

## Updating an existing installation

Do **not** rerun `setup-server.sh` for updates; it regenerates the bootstrap
password and writes a new placeholder `.env`. Back up `uploads/`, `.data/`, and
`backend/.env`. Build a single fresh archive on Windows with `.\build.ps1`, then
upload it:

```powershell
scp .\decemberdelights-deploy.tar.gz SSH_USER@SERVER_IP:/tmp/
```

On the VPS, pause the frontend while replacing its build files so requests
cannot receive server-rendered HTML and JavaScript from different releases:

```bash
sudo systemctl stop dd-frontend
sudo tar -xzf /tmp/decemberdelights-deploy.tar.gz -C /var/www/decemberdelights
sudo chown -R www-data:www-data /var/www/decemberdelights/frontend
sudo systemctl start dd-frontend
sudo systemctl --no-pager --full status dd-frontend
curl -I http://127.0.0.1:3000/
```

If extraction fails after stopping the service, run
`sudo systemctl start dd-frontend` to bring the existing installation back up,
then inspect the error before retrying. The archive updates application files;
it does not contain or replace `backend/.env`, `.data/`, or `uploads/`. Apply
any new database migration separately. After the service is healthy, hard
refresh the site (`Ctrl+Shift+R`) to discard any page or JavaScript cached from
the previous release.

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
