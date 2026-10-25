# December Delights - Windows Build Script
# Run this in PowerShell

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " December Delights - Building Deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "`n[1/4] Installing frontend dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) { Write-Host "DEPENDENCY INSTALL FAILED" -ForegroundColor Red; exit 1 }

# 2. Build frontend (NEXT_PUBLIC_* are baked in at build time - must load from .env.local)
Write-Host "`n[2/4] Building Next.js frontend..." -ForegroundColor Yellow
$env:NEXT_TELEMETRY_DISABLED=1
if (Test-Path .env.local) {
  Write-Host "Loading env from .env.local for build..." -ForegroundColor Gray
  Get-Content .env.local | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)\s*$') {
      $k = $matches[1].Trim(); $v = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($k, $v, "Process")
      # also set for current session so Next.js sees it
      Set-Item -Path "Env:$k" -Value $v
    }
  }
}
if (-not $env:NEXT_PUBLIC_SITE_URL) { $env:NEXT_PUBLIC_SITE_URL="https://www.decemberdelights.in" }
if (-not $env:NEXT_PUBLIC_SUPABASE_URL) { $env:NEXT_PUBLIC_SUPABASE_URL="https://mdnqutroeustyflmmdge.supabase.co" }
if (-not $env:BACKEND_URL) { $env:BACKEND_URL="http://localhost:10000" }
if (-not $env:NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    Write-Host "NEXT_PUBLIC_RAZORPAY_KEY_ID is missing. Set it in .env.local before building the payment-enabled frontend." -ForegroundColor Red
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED - fix errors above" -ForegroundColor Red; exit 1 }

# 3. Clean old deploy folder
Write-Host "`n[3/4] Preparing files..." -ForegroundColor Yellow
if (Test-Path deploy) { Remove-Item -Recurse -Force deploy }
New-Item -ItemType Directory -Path deploy\backend -Force | Out-Null
New-Item -ItemType Directory -Path deploy\backend\routers -Force | Out-Null
New-Item -ItemType Directory -Path deploy\backend\migrations -Force | Out-Null
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
Copy-Item backend\order_pricing.py deploy\backend\
Copy-Item backend\cache.py deploy\backend\
Copy-Item backend\local_storage.py deploy\backend\
Copy-Item backend\local_queue.py deploy\backend\
Copy-Item backend\requirements.txt deploy\backend\
Copy-Item backend\routers\*.py deploy\backend\routers\
Copy-Item backend\migrations\*.sql deploy\backend\migrations\

# 5. Copy frontend files
if (Test-Path .next\standalone) {
    # Copy standalone server
    Copy-Item .next\standalone\* deploy\frontend\ -Recurse
    # Copy static files
    New-Item -ItemType Directory -Path deploy\frontend\.next\static -Force | Out-Null
    Copy-Item .next\static\* deploy\frontend\.next\static\ -Recurse
    # Copy public files
    New-Item -ItemType Directory -Path deploy\frontend\public -Force | Out-Null
    Copy-Item public\* deploy\frontend\public\ -Recurse -ErrorAction SilentlyContinue
} else {
    Write-Host "Standalone Next.js output is missing; build did not produce a deployable frontend." -ForegroundColor Red
    exit 1
}

# 6. Copy helper scripts + create frontend starter
Copy-Item start-backend.sh deploy\
Copy-Item setup-server.sh deploy\
Copy-Item nginx.conf deploy\
Copy-Item nginx.bootstrap.conf deploy\
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
foreach ($scriptPath in @("deploy\setup-server.sh", "deploy\start-backend.sh")) {
    $scriptContents = [System.IO.File]::ReadAllText((Resolve-Path $scriptPath))
    $scriptContents = $scriptContents -replace "`r`n?", "`n"
    [System.IO.File]::WriteAllText((Resolve-Path $scriptPath), $scriptContents, $utf8NoBom)
}
$frontendStart = @'
#!/bin/bash
cd /var/www/decemberdelights/frontend
export HOSTNAME="0.0.0.0"
export PORT=3000
export NODE_ENV=production
exec node server.js
'@
$frontendStart | Out-File -FilePath deploy\start-frontend.sh -Encoding ascii -NoNewline

# 7. Safety: never pack secrets
Remove-Item -Force deploy\.env, deploy\.env.local, deploy\.env.production -ErrorAction SilentlyContinue

Write-Host "`n[4/4] Creating tar file..." -ForegroundColor Yellow

# 8. Create tar (Windows 10+ has tar built-in)
tar -czf decemberdelights-deploy.tar.gz -C deploy .

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " DONE!" -ForegroundColor Green
Write-Host " File: decemberdelights-deploy.tar.gz" -ForegroundColor Green
Write-Host " Location: $(Get-Location)" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
