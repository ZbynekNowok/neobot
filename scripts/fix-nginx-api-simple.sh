#!/usr/bin/env bash
# Simple script to replace location / block for api.neobot.cz

set -e

echo "===== FIX NGINX API PROXY ====="

# Backup
sudo cp /etc/nginx/sites-available/default /etc/nginx/backup-neobot/default.$(date +%F_%H%M%S) 2>/dev/null || sudo mkdir -p /etc/nginx/backup-neobot && sudo cp /etc/nginx/sites-available/default /etc/nginx/backup-neobot/default.$(date +%F_%H%M%S)

# Create temp file with replacement
TMP=$(mktemp)
sudo python3 << 'PY' > "$TMP"
import sys

with open('/etc/nginx/sites-available/default', 'r') as f:
    lines = f.readlines()

# Find the location / block inside api.neobot.cz server block
in_api_block = False
in_location = False
loc_start = None
loc_end = None

for i, line in enumerate(lines):
    if 'server_name api.neobot.cz' in line:
        in_api_block = True
    if in_api_block and line.strip() == 'location / {':
        in_location = True
        loc_start = i
    if in_location and line.strip() == '}' and i > loc_start:
        loc_end = i
        break
    if in_api_block and line.strip() == '}' and not in_location:
        in_api_block = False

if loc_start is None or loc_end is None:
    print("ERROR: Could not find location / block", file=sys.stderr)
    sys.exit(1)

# Replace lines loc_start+1 to loc_end-1 with proxy config
new_lines = lines[:loc_start+1]
new_lines.append('\t\tproxy_pass http://127.0.0.1:3000;\n')
new_lines.append('\t\tproxy_http_version 1.1;\n')
new_lines.append('\t\tproxy_set_header Host $host;\n')
new_lines.append('\t\tproxy_set_header X-Real-IP $remote_addr;\n')
new_lines.append('\t\tproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n')
new_lines.append('\t\tproxy_set_header X-Forwarded-Proto $scheme;\n')
new_lines.append('\t\tproxy_set_header Upgrade $http_upgrade;\n')
new_lines.append('\t\tproxy_set_header Connection "upgrade";\n')
new_lines.append('\t\tproxy_connect_timeout 10s;\n')
new_lines.append('\t\tproxy_send_timeout 60s;\n')
new_lines.append('\t\tproxy_read_timeout 60s;\n')
new_lines.extend(lines[loc_end:])

with open('/etc/nginx/sites-available/default', 'w') as f:
    f.writelines(new_lines)

print("OK")
PY

if [ "$(cat "$TMP")" = "OK" ]; then
    echo "Config updated"
    rm "$TMP"
    
    echo "Testing nginx config..."
    sudo nginx -t
    
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    
    echo "Waiting 2s..."
    sleep 2
    
    echo "Testing https://api.neobot.cz/health ..."
    curl -sS -i https://api.neobot.cz/health | head -n 15
    
    echo ""
    echo "===== DONE ====="
else
    echo "ERROR: Failed to update config"
    cat "$TMP"
    rm "$TMP"
    exit 1
fi
