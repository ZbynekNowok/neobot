# NeoBot API Deployment Guide

## Quick Verification

### 1. Check API Status
```bash
curl -i https://api.neobot.cz/api/status
```
Expected: `HTTP/1.1 200 OK` with JSON `{"ok":true,"service":"neobot-api","version":"1.0.0"}`

### 2. Check API Health
```bash
curl -i https://api.neobot.cz/api/health
```
Expected: `HTTP/1.1 200 OK` with JSON `{"ok":true,"uptime_seconds":...}`

### 3. Test CORS Preflight
```bash
curl -i -X OPTIONS \
  -H "Origin: https://neobot.cz" \
  -H "Access-Control-Request-Method: POST" \
  https://api.neobot.cz/api/seo/generate
```
Expected: `HTTP/1.1 204 No Content` with headers:
- `Access-Control-Allow-Origin: https://neobot.cz`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE`

### 4. Run Smoke Test Script
```bash
./scripts/smoke-api.sh
```

## Deployment Steps

### 1. Backend Changes
- Update `server.js` if needed
- Restart PM2: `pm2 restart neobot` or `pm2 start ecosystem.config.js --update-env`
- Verify: `pm2 list` shows neobot as `online`

### 2. Nginx Configuration
- Config file: `/etc/nginx/sites-available/default`
- Server block: `server_name api.neobot.cz`
- **Produkt běží na PORT (env), nginx proxy musí mířit na ten samý port.** Např. `proxy_pass http://127.0.0.1:3000` když `PORT=3000`, nebo `http://127.0.0.1:$PORT` v konfiguraci.
- Proxy: `proxy_pass http://127.0.0.1:3000` (nebo hodnota PORT z .env / PM2)
- Test: `sudo nginx -t`
- Reload: `sudo systemctl reload nginx`

### 3. Frontend (Lovable)
- Frontend files in `public/` are served by Lovable
- API client uses `window.__NEOBOT_API__ || "https://api.neobot.cz"`
- All API calls use `/api/*` prefix

## API Endpoints

### Status & Health
- `GET /api/status` - Service status
- `GET /api/health` - Health check with uptime
- `GET /health` - Backward compatibility (same as /api/health)

### SEO
- `POST /api/seo/generate` - Generate SEO article
- `GET /api/seo/status/:jobId` - Get job status
- `GET /api/seo/result/:jobId` - Get article result
- `GET /api/seo/list?limit=20` - List articles
- `POST /api/seo/cancel/:jobId` - Cancel job

### SEO Audit
- `POST /api/seo/audit` - Start audit
- `GET /api/seo/audit/status/:jobId` - Get audit status
- `GET /api/seo/audit/result/:jobId` - Get audit result
- `GET /api/seo/audit/list?limit=20` - List audits

### Publish
- `POST /api/publish` - Create publish action
- `GET /api/publish/targets` - List targets
- `POST /api/publish/targets/wordpress` - Connect WordPress
- `DELETE /api/publish/targets/wordpress` - Disconnect WordPress
- `GET /api/publish/list?limit=20` - List actions

## Supabase Storage – bucket pro loga

Upload firemního loga vyžaduje bucket **`brand-logos`**. Pokud vidíš chybu „Bucket not found“:

1. Otevři **Supabase Dashboard** → tvůj projekt.
2. V levém menu jdi na **Storage**.
3. Klikni **New bucket**.
4. Nastav:
   - **Name:** `brand-logos` (přesně tak, malými písmeny, pomlčka).
   - **Public bucket:** zapnuto (ON), aby se loga dala zobrazit přes veřejnou URL.
5. Ulož (Create bucket).

Potom spusť RLS politiky (jednorázově) – v Supabase **SQL Editor** vlož a spusť obsah souboru:
`frontend/neo-mind-guide-main/supabase/migrations/20260226160000_storage_brand_logos_policies.sql`

Po vytvoření bucketu a spuštění migrace by měl upload loga na Firemním profilu / Strategii fungovat.

## CORS Configuration

- **Allowed Origins**: `https://neobot.cz`, `https://www.neobot.cz`
- **Methods**: `GET`, `POST`, `OPTIONS`, `DELETE`
- **Credentials**: `true`
- **Headers**: `Content-Type`, `Authorization`

## Troubleshooting

### API returns 404
- Check nginx config: `sudo nginx -t`
- Check PM2: `pm2 list` and `pm2 logs neobot`
- Check port 3000: `ss -ltnp | grep 3000`

### CORS errors
- Verify CORS middleware in `server.js`
- Check Origin header matches allowed origins
- Verify `credentials: "include"` in frontend API client

### Frontend can't connect
- Check browser console for CORS errors
- Verify `window.__NEOBOT_API__` is set correctly (if custom)
- Test API directly: `curl https://api.neobot.cz/api/status`
