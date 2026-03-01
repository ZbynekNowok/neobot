#!/usr/bin/env bash
# NeoBot – denní start: branch, commity, stav projektu, testy.
# Spusť ze kořene repozitáře.

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== Branch ==="
git branch --show-current 2>/dev/null || true

echo ""
echo "=== Poslední commity ==="
git log -3 --oneline 2>/dev/null || true

echo ""
echo "=== PROJECT_STATE.md ==="
if [ -f "docs/PROJECT_STATE.md" ]; then
  cat docs/PROJECT_STATE.md
else
  echo "(soubor neexistuje)"
fi

echo ""
echo "=== run-all.sh ==="
bash scripts/tests/run-all.sh 2>&1 | tee scripts/tests/last-run.txt
