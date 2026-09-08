# December Delights - Windows Build Script
# Run this in PowerShell

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " December Delights - Building Deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "`n[1/4] Installing frontend dependencies..." -ForegroundColor Yellow
npm ci

# 2. Build frontend
Write-Host "`n[2/4] Building Next.js frontend..." -ForegroundColor Yellow
$env:NEXT_TELEMETRY_DISABLED=1
npm run build

# 3. Clean old deploy folder
Write-Host "`n[3/4] Preparing files..." -ForegroundColor Yellow
if (Test-Path deploy) { Remove-Item -Recurse -Force deploy }
New-Item -ItemType Directory -Path deploy\backend -Force | Out-Null
New-Item -ItemType Directory -Path deploy\backend\routers -Force | Out-Null
New-Item -ItemType Directory -Path deploy\frontend -Force | Out-Null

# 4. Copy backend files
Copy-Item backend\main.py deploy\backend\
Copy-Item backend\auth.py deploy\backend\
Copy-Item backend\security.py deploy\backend\
Copy-Item backend\csrf.py deploy\backend\
Copy-Item backend\store.py deploy\backend\
Copy-Item backend\supabase_client.py deploy\backend\
Copy-Item backend\schemas.py deploy\backend\
Copy-Item backend\activity.py deploy\backend\
Copy-Item backend\email_service.py deploy\backend\
Copy-Item backend\seed.py deploy\backend\
Copy-Item backend\requirements.txt deploy\backend\
Copy-Item backend\routers\*.py deploy\backend\routers\

# 5. Copy frontend files
if (Test-Path .next\standalone) {
    # Copy standalone server
    Copy-Item .next\standalone\* deploy\frontend\ -Recurse
    # Copy static files
    New-Item -ItemType Directory -Path deploy\frontend\.next\static -Force | Out-Null
    Copy-Item .next\static\* deploy\frontend\.next\static\ -Recurse
    # Copy public files
    Copy-Item public\* deploy\frontend\public\ -Recurse -ErrorAction SilentlyContinue
}

# 6. Copy helper scripts
Copy-Item start-backend.sh deploy\
Copy-Item nginx.conf deploy\
Copy-Item DEPLOY.md deploy\

Write-Host "`n[4/4] Creating tar file..." -ForegroundColor Yellow

# 7. Create tar (Windows 10+ has tar built-in)
tar -czf decemberdelights-deploy.tar.gz -C deploy .

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " DONE!" -ForegroundColor Green
Write-Host " File: decemberdelights-deploy.tar.gz" -ForegroundColor Green
Write-Host " Location: $(Get-Location)" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
