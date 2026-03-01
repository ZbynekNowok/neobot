#!/bin/bash
set -e

# Find nginx config containing server_name api.neobot.cz
FILE=$(grep -rl "server_name api.neobot.cz" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null | head -n 1)

if [ -z "$FILE" ]; then
  echo "ERROR: nginx config not found"
  exit 1
fi

echo "Found: $FILE"
sudo sed -i 's|127.0.0.1:3000|127.0.0.1:8080|g' "$FILE"

sudo nginx -t
sudo systemctl reload nginx

echo "nginx proxy_pass fixed to 8080"
