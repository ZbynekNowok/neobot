#!/usr/bin/env bash
# Ověření lokálního health a proxy bez přepisování existujícího apiProxy.js

set -e
PORT="${PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

echo "---- LOCAL HEALTH ----"
curl -sS -i "${BASE}/health" | head -n 20

echo ""
echo "---- PROXY HEALTH ----"
curl -sS -i "${BASE}/api/proxy/health" | head -n 20

# Proxy už je v projektu (src/routes/apiProxy.js, apiProxyRouter v server.js).
# Pokud proxy vrátí 404, zkontroluj:
# - server.js obsahuje: require("./src/routes/apiProxy.js") a app.use(apiProxyRouter)
# - EXTERNAL_API_URL v .env (např. https://api.neobot.cz)

echo ""
echo "---- RESTART PM2 (neobot) ----"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart neobot || true
  sleep 3
  echo "---- AFTER RESTART ----"
  curl -sS -i "${BASE}/api/proxy/health" | head -n 20
else
  echo "pm2 not found, skip restart"
fi

echo ""
echo "---- DONE ----"
