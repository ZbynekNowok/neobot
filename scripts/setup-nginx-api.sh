#!/usr/bin/env bash
set -euo pipefail

echo "===== NGINX API PROXY SETUP ====="
echo ""
echo "Current: api.neobot.cz has SSL but serves static files"
echo "Goal: Proxy all requests to http://127.0.0.1:3000"
echo ""

# Backup
echo "===== 1) BACKUP ====="
sudo mkdir -p /etc/nginx/backup-neobot
sudo cp /etc/nginx/sites-available/default /etc/nginx/backup-neobot/default.$(date +%F_%H%M%S)
echo "Backup saved"

# Replace location / block in api.neobot.cz server block (lines 118-122)
echo ""
echo "===== 2) MODIFY CONFIG ====="
sudo sed -i '/server_name api\.neobot\.cz/,/^}/ {
  /^[[:space:]]*location \/ {$/,/^[[:space:]]*}$/ {
    /^[[:space:]]*location \/ {$/ {
      r /dev/stdin
      d
    }
    /^[[:space:]]*try_files/d
    /^[[:space:]]*# First attempt/d
    /^[[:space:]]*# as directory/d
    /^[[:space:]]*# as file/d
    /^[[:space:]]*try_files $uri $uri\/ =404;$/d
  }
}' /etc/nginx/sites-available/default << 'PROXY_CONFIG'
	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_connect_timeout 10s;
		proxy_send_timeout 60s;
		proxy_read_timeout 60s;
	}
PROXY_CONFIG

echo "Config modified"

# Simpler approach: use sed to replace the try_files line and add proxy_pass
echo ""
echo "===== 2b) SIMPLER REPLACEMENT ====="
sudo sed -i '/server_name api\.neobot\.cz/,/^}/ {
  /^[[:space:]]*location \/ {$/ {
    n
    :loop
    /^[[:space:]]*}$/! {
      d
      b loop
    }
    i\
		proxy_pass http://127.0.0.1:3000;\
		proxy_http_version 1.1;\
		proxy_set_header Host $host;\
		proxy_set_header X-Real-IP $remote_addr;\
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
		proxy_set_header X-Forwarded-Proto $scheme;\
		proxy_set_header Upgrade $http_upgrade;\
		proxy_set_header Connection "upgrade";\
		proxy_connect_timeout 10s;\
		proxy_send_timeout 60s;\
		proxy_read_timeout 60s;
  }
}' /etc/nginx/sites-available/default

echo ""
echo "===== 3) TEST NGINX ====="
sudo nginx -t

echo ""
echo "===== 4) RELOAD NGINX ====="
sudo systemctl reload nginx

echo ""
echo "===== 5) VERIFY ====="
sleep 2
echo "Testing https://api.neobot.cz/health ..."
curl -sS -i https://api.neobot.cz/health | head -n 15

echo ""
echo "===== DONE ====="
