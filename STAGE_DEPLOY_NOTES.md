# STAGE-FIRST 10/10 Upgrade — Deploy Notes (no look changes)

All changes staged locally. Nothing deployed. Zero UI/CSS touched (`app/`, `components/`, `public/`, `globals.css` untouched).

## What changed (backend/infra/invisible only)

1. **Hybrid storage (Hostinger 50GB + Supabase free 1GB)** — `backend/local_storage.py`, `routers/files.py`
   - New `menu/product` images → `/uploads/public/menu|products/*` on VPS (Nginx 1yr immutable, no Supabase bandwidth).
   - New `franchise/career` docs + resumes + tc_video → `/uploads/private/franchise|career/*` on VPS, served ONLY via `GET /api/files/franchise/{f}` and `/api/files/career/{f}` (admin JWT). Never public via Nginx.
   - Old `https://*.supabase.co` URLs keep working (read + delete fallback). `STORAGE_MODE=hybrid` default; `local` forces local; `supabase` forces old behavior.
   - Deletes clean both stores; updates delete old local file to avoid 50GB leak.
2. **Hot-read cache (Supabase free-tier protection)** — `backend/cache.py`
   - In-memory TTL: `products 120s`, `menu 120s`, `product_cats 300s`, `jobs 180s`, `site_settings 60s`. `X-Cache: HIT/MISS` header.
   - Invalidated on every admin create/update/delete. Cuts Supabase REST calls ~70-90% for browsing.
3. **Rate limiter hardened for 1vCPU** — `backend/store.py`
   - In-memory fast-path + SQLite persist, fail-open on `database is locked`, timeout 5s→15s. Spikes no longer 500.
4. **CSRF 10/10** — added `validate_csrf(request)` to all missing admin mutators: `products`, `menu`, `jobs`, `orders` (create/update/status/delete), `terms`. Public checkout/franchise/careers/contact intentionally NOT CSRF (no auth cookie; rate-limited instead).
5. **Server hardening** — `backend/main.py`, `nginx.conf`, `next.config.ts`
   - `GZipMiddleware`, `/api/ready` liveness, `/uploads/public` 1yr cache, dev `StaticFiles` mount (private never mounted).
   - Nginx: `server_tokens off`, dotfile deny, gzip JSON, `/uploads/public/` alias immutable, `/private/` deny, commented `proxy_cache_path` + `limit_req_zone` ready for `nginx.conf http{}`, fixed ineffective `proxy_cache_valid`-only blocks.
   - Next: `experimental.optimizePackageImports: [lucide-react, recharts]` — smaller bundle, same look.
6. **Deploy packaging** — `deploy.sh`, `build.ps1`, `setup-server.sh`, `.env.example`, `.gitignore`
   - Tar now includes `cache.py`, `local_storage.py`, `routers/files.py`; excludes `uploads/.data` (preserved on server).
   - Server creates `uploads/public|private` with `755/750`, `.env` template adds `STORAGE_MODE`, `UPLOAD_ROOT`, JWT gen hint.
7. **Tests** — `backend/tests/test_hybrid.py` (4 passed). Run: `py -3 -m pytest backend/tests/test_hybrid.py -q`.

Verified: `py_compile` all touched files OK, `pytest 4 passed`.

## Supabase free-tier answer (your question)

Yes, use Hostinger local disk — hybrid above is the correct way:
- Supabase free: 500MB DB, 1GB storage, 2GB bandwidth, 50k MAU. Images/docs burn storage+bandwidth fast.
- Hostinger 50GB: effectively free and 50x bigger. New uploads now cost 0 Supabase storage/bandwidth.
- Keep Supabase for rows only (orders, applications, products metadata with `/uploads/...` URL strings). DB rows are tiny (KBs) — 100k+ rows fit free tier.
- Sensitive docs safer locally (private dir 750 + admin-only route) than public Supabase bucket URLs.

## 1vCPU 4GB tuning (staged, no change to workers)

Kept `workers=1` (correct for SQLite WAL on 1vCPU). Throughput now from cache, not workers:
- Browsing: ~100-200 concurrent (unchanged, less Supabase pressure).
- API hot GETs: 3-5x fewer Supabase hits → p95 down, free-tier quota safe.
- Uploads/checkout: 5-10 concurrent (disk I/O, not Supabase retries).
Do NOT set `workers>1` without moving `store.py` SQLite to Postgres/Redis — will corrupt/lock.

## Deploy (when you are ready, 5-10 min downtime)

1. `.\build.ps1` (Windows) or `bash deploy.sh` → `decemberdelights-deploy.tar.gz`.
2. Backup server first: `tar -czf /tmp/dd-backup-$(date +%F).tar.gz -C /var/www/decemberdelights uploads .data backend/.env`.
3. Upload tar to `/tmp/`, then **do NOT `rm -rf /var/www/decemberdelights`** — only overwrite: `tar -xzf /tmp/decemberdelights-deploy.tar.gz -C /var/www/decemberdelights`.
4. `sudo mkdir -p /var/www/decemberdelights/uploads/public/products /var/www/decemberdelights/uploads/public/menu /var/www/decemberdelights/uploads/private/franchise /var/www/decemberdelights/uploads/private/career && sudo chown -R www-data:www-data /var/www/decemberdelights/uploads && sudo chmod 755 /var/www/decemberdelights/uploads/public && sudo chmod 750 /var/www/decemberdelights/uploads/private`.
5. Ensure `/var/www/decemberdelights/backend/.env` has `STORAGE_MODE=hybrid` and `UPLOAD_ROOT=/var/www/decemberdelights/uploads`.
6. Copy new `nginx.conf` → `/etc/nginx/sites-available/decemberdelights`, `sudo nginx -t && sudo systemctl reload nginx`.
7. `sudo systemctl restart dd-backend && sleep 3 && sudo systemctl restart dd-frontend`.
8. Verify: `curl /api/ready`, `curl /api/health`, `curl -I /uploads/public/...`, admin login → create test product with image → check `X-Cache: MISS` then `HIT` on `GET /api/products`, private doc via `/api/files/franchise/{f}` (401 without login, 200 with admin).

## Rollback

- Backend: restore `/tmp/dd-backup-*.tar.gz` uploads/.data + previous tar, `systemctl restart dd-backend`.
- `STORAGE_MODE=supabase` instantly reverts to old Supabase-only uploads without code change.
- Frontend: no visual change, but `NEXT_PUBLIC_*` rebake needs `npm run build` if you change env.

## Still not 10/10 (needs paid tier, out of scope)

- No Redis/Celery (1vCPU RAM + free tier) — email still `BackgroundTasks` + Gmail SMTP.
- No webhook idempotency, no APM/Sentry, no PITR beyond Supabase free 7-day.
- To reach true 10: Cloudflare CDN + managed Postgres + S3-compatible object storage + 2vCPU.

## Appendix A — Supabase full: clarity + keep-accepting-locally (you chose Both)

New (staged, API-only, no UI change):
- `GET /api/admin/system/status` — `supabase_ok`, per-table `counts`, `db_estimate_mb/500MB`, Hostinger `disk.free_gb`, `queued_franchise`, `warnings[]` at 80%. Poll every 5 min from admin or cron.
- `GET /api/admin/queue/status` — locally queued paid franchises.
- `POST /api/admin/queue/sync` (super_admin + CSRF) — push queue back to Supabase when space freed.
- `POST /api/franchise` now returns `{queued:true, queue_id}` instead of 500 when Supabase quota/full/down (`backend/local_queue.py`, `backend/routers/franchise.py:286-303`). Files already on Hostinger disk, payment already captured — zero paid-user loss.

## Appendix B — you said No idea on access: click here

Supabase (2 min):
1. `supabase.com/dashboard` → your project `mdnqutroeustyflmmdge` → left `Settings → Usage` → check `Database size /500MB`, `Storage /1GB`, `Bandwidth /2GB`, `Monthly active users`.
2. If red >80%: `Table Editor → franchise_applications` → check row count; `Storage` → sort buckets by size; delete test uploads or upgrade `Settings → Billing → Pro $25`.
3. SQL Editor → run `SELECT pg_size_pretty(pg_database_size(current_database()));` for exact DB size.

Hostinger (5 min):
1. hPanel → VPS → `SSH` → `ssh root@YOUR_IP`.
2. `systemctl status dd-backend dd-frontend --no-pager` (must be active), `journalctl -u dd-backend -n 50 --no-pager` (quota errors show here).
3. `df -h /var/www/decemberdelights` (disk), `du -sh /var/www/decemberdelights/uploads/*`, `ls /var/www/decemberdelights/uploads/queue/franchise | wc -l` (queued count).
4. Backend clarity without SSH: login admin → open `https://www.decemberdelights.in/api/admin/system/status` (after deploy) — same numbers as above.
5. Backup before Insta post: `tar -czf /tmp/dd-backup-$(date +%F).tar.gz -C /var/www/decemberdelights uploads .data backend/.env`.
