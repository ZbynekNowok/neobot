#!/usr/bin/env bash
# Build frontend a zkopíruj na /var/www/neobot (aby se změny zobrazily na neobot.cz)
set -e
cd "$(dirname "$0")/../frontend/neo-mind-guide-main"
echo "Building frontend..."
npm run build
echo "Copying dist/* to /var/www/neobot (sudo)..."
sudo cp -r dist/* /var/www/neobot/
echo "Done. Obnov stránku neobot.cz (Ctrl+F5 pro tvrdé obnovení cache)."
