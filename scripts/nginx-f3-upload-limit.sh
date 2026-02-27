#!/bin/bash
# F3 – nginx upload limit fix pro api.neobot.cz
# Přidá client_max_body_size 20M do server bloku api.neobot.cz, otestuje a reloadne nginx.
# Spustit na VPS: sudo bash scripts/nginx-f3-upload-limit.sh

set -e
CONFIG="/etc/nginx/sites-available/default"
MARKER="client_max_body_size 20M"

if grep -q "$MARKER" "$CONFIG" 2>/dev/null; then
  echo "OK: $MARKER already present in $CONFIG"
else
  # Přidat řádek za "server_name api.neobot.cz; # managed by Certbot"
  sed -i "/server_name api.neobot.cz; # managed by Certbot/a\\
	$MARKER;" "$CONFIG"
  echo "Added: $MARKER to $CONFIG"
fi

echo "Testing nginx config..."
nginx -t
echo "Reloading nginx..."
systemctl reload nginx
echo "Done. F3 uploads (do 20 MB) should no longer return 413."
