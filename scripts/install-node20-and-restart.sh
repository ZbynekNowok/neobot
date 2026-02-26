#!/bin/bash
set -euo pipefail

echo "== Current Node =="
node -v || true
which node || true

echo "== Install Node.js 20 (system-wide via NodeSource) =="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update -y
sudo apt-get install -y nodejs

echo "== New Node =="
node -v
node -p "typeof globalThis.File !== 'undefined' ? 'File OK' : 'File missing'"

echo "== PM2 restart with new Node =="
pm2 kill || true
cd /home/vpsuser/neobot
pm2 start ecosystem.config.js --update-env
pm2 save

echo "== Wait a moment =="
sleep 3

echo "== Local health =="
curl -sS -i http://127.0.0.1:3000/health | head -n 30 || true

echo
echo "== HTTPS health (api.neobot.cz) =="
curl -sS -i https://api.neobot.cz/health | head -n 30 || true

echo
echo "== PM2 logs (last 40 lines) =="
pm2 logs neobot --lines 40 --nostream || true
