#!/usr/bin/env bash
# NeoBot – pre-commit: spustí run-all.sh, exit 1 pokud existuje FAIL.
# Použití: bash scripts/dev/pre-commit-check.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

OUTPUT=$(bash scripts/tests/run-all.sh 2>&1)
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q '\[FAIL\]'; then
  echo ""
  echo "PRE-COMMIT: FAIL nalezen – commit zakázán."
  exit 1
fi

echo ""
echo "PRE-COMMIT: Všechny testy PASS."
exit 0
