#!/usr/bin/env bash
# Smoke test script for NeoBot API
# Tests status, health, and CORS preflight

set -e

API_BASE="${API_BASE:-https://api.neobot.cz}"
ORIGIN="${ORIGIN:-https://neobot.cz}"

echo "===== NEOBOT API SMOKE TEST ====="
echo "API Base: $API_BASE"
echo "Origin: $ORIGIN"
echo ""

# Test 1: GET /api/status
echo "--- Test 1: GET /api/status ---"
STATUS_RESPONSE=$(curl -sS -w "\n%{http_code}" -H "Origin: $ORIGIN" "$API_BASE/api/status" 2>&1)
STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -n 1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')
echo "HTTP Code: $STATUS_CODE"
echo "Response: $STATUS_BODY"
if [ "$STATUS_CODE" != "200" ]; then
  echo "❌ FAIL: Expected 200, got $STATUS_CODE"
  exit 1
fi
echo "✅ PASS"
echo ""

# Test 2: GET /api/health
echo "--- Test 2: GET /api/health ---"
HEALTH_RESPONSE=$(curl -sS -w "\n%{http_code}" -H "Origin: $ORIGIN" "$API_BASE/api/health" 2>&1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
echo "HTTP Code: $HEALTH_CODE"
echo "Response: $HEALTH_BODY"
if [ "$HEALTH_CODE" != "200" ]; then
  echo "❌ FAIL: Expected 200, got $HEALTH_CODE"
  exit 1
fi
echo "✅ PASS"
echo ""

# Test 3: CORS Preflight OPTIONS
echo "--- Test 3: CORS Preflight OPTIONS /api/seo/generate ---"
PREFLIGHT_RESPONSE=$(curl -sS -i -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$API_BASE/api/seo/generate" 2>&1)
PREFLIGHT_CODE=$(echo "$PREFLIGHT_RESPONSE" | grep -i "^HTTP" | awk '{print $2}')
PREFLIGHT_ORIGIN=$(echo "$PREFLIGHT_RESPONSE" | grep -i "^Access-Control-Allow-Origin" | cut -d: -f2 | tr -d ' ')
PREFLIGHT_CREDENTIALS=$(echo "$PREFLIGHT_RESPONSE" | grep -i "^Access-Control-Allow-Credentials" | cut -d: -f2 | tr -d ' ')
PREFLIGHT_METHODS=$(echo "$PREFLIGHT_RESPONSE" | grep -i "^Access-Control-Allow-Methods" | cut -d: -f2 | tr -d ' ')

echo "HTTP Code: $PREFLIGHT_CODE"
echo "Access-Control-Allow-Origin: $PREFLIGHT_ORIGIN"
echo "Access-Control-Allow-Credentials: $PREFLIGHT_CREDENTIALS"
echo "Access-Control-Allow-Methods: $PREFLIGHT_METHODS"

if [ "$PREFLIGHT_CODE" != "204" ] && [ "$PREFLIGHT_CODE" != "200" ]; then
  echo "❌ FAIL: Expected 204 or 200, got $PREFLIGHT_CODE"
  exit 1
fi
if [ -z "$PREFLIGHT_ORIGIN" ]; then
  echo "❌ FAIL: Missing Access-Control-Allow-Origin header"
  exit 1
fi
if [ "$PREFLIGHT_CREDENTIALS" != "true" ]; then
  echo "⚠️  WARN: Access-Control-Allow-Credentials is not 'true'"
fi
echo "✅ PASS"
echo ""

# Test 4: CORS headers in actual request
echo "--- Test 4: CORS headers in GET /api/status ---"
CORS_RESPONSE=$(curl -sS -i -H "Origin: $ORIGIN" "$API_BASE/api/status" 2>&1)
CORS_ORIGIN=$(echo "$CORS_RESPONSE" | grep -i "^Access-Control-Allow-Origin" | cut -d: -f2 | tr -d ' ')
CORS_CREDENTIALS=$(echo "$CORS_RESPONSE" | grep -i "^Access-Control-Allow-Credentials" | cut -d: -f2 | tr -d ' ')

echo "Access-Control-Allow-Origin: $CORS_ORIGIN"
echo "Access-Control-Allow-Credentials: $CORS_CREDENTIALS"

if [ -z "$CORS_ORIGIN" ]; then
  echo "❌ FAIL: Missing Access-Control-Allow-Origin header in actual request"
  exit 1
fi
if [ "$CORS_CREDENTIALS" != "true" ]; then
  echo "⚠️  WARN: Access-Control-Allow-Credentials is not 'true' in actual request"
fi
echo "✅ PASS"
echo ""

echo "===== ALL TESTS PASSED ====="
