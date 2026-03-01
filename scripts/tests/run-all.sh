#!/usr/bin/env bash
# NeoBot – run all tests (server, nginx, backend, frontend static).
# Run from repo root. No secrets printed.
# Exit 0 if all PASS, 1 otherwise.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0
SKIP=0
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
PUBLIC_URL="${PUBLIC_URL:-https://api.neobot.cz}"

report() {
  local status=$1
  local msg=$2
  case "$status" in
    PASS) ((PASS++)); echo "[PASS] $msg" ;;
    FAIL) ((FAIL++)); echo "[FAIL] $msg" ;;
    SKIP) ((SKIP++)); echo "[SKIP] $msg" ;;
    INFO) echo "[INFO] $msg" ;;
    *) echo "[----] $msg" ;;
  esac
}

# --- PART A: Server / Nginx / Port ---
echo "=== Part A: Server / Nginx / Port ==="

if ss -ltnp 2>/dev/null | grep -q ':8080'; then
  report PASS "Backend listening on 8080"
else
  report FAIL "Backend listening on 8080"
fi

STATUS_JSON=$(curl -s "${BASE_URL}/api/status" 2>/dev/null || true)
if echo "$STATUS_JSON" | grep -q '"status"'; then
  report PASS "/api/status local"
else
  report FAIL "/api/status local"
fi

PUBLIC_RESP=$(curl -sk "${PUBLIC_URL}/api/status" 2>/dev/null || true)
if echo "$PUBLIC_RESP" | grep -q "502 Bad Gateway"; then
  report FAIL "/api/status public (502)"
else
  if echo "$PUBLIC_RESP" | grep -q '"status"'; then
    report PASS "/api/status public"
  else
    report FAIL "/api/status public (no status)"
  fi
fi

echo "--- Nginx server block api.neobot.cz ---"
if command -v nginx &>/dev/null && sudo true 2>/dev/null; then
  sudo nginx -T 2>/dev/null | sed -n '/server_name api.neobot.cz/,/}/p' | head -n 120 || true
else
  echo "(nginx -T or sudo not available)"
fi
echo "---"

# --- PART B: Render endpoint debug ---
echo "=== Part B: Render debug ==="

BACKGROUND_URL="${BACKGROUND_URL:-}"
if [ -z "$BACKGROUND_URL" ]; then
  FIRST_BG=$(ls public/outputs/backgrounds/*.png 2>/dev/null | head -1)
  if [ -n "$FIRST_BG" ]; then
    BACKGROUND_URL="/outputs/backgrounds/$(basename "$FIRST_BG")"
  fi
fi

if [ -z "$BACKGROUND_URL" ]; then
  report SKIP "render debug (no BACKGROUND_URL or no backgrounds)"
else
  PAYLOAD_RENDER=$(mktemp)
  sed "s|BACKGROUND_URL_PLACEHOLDER|${BACKGROUND_URL}|g" scripts/tests/payload-render-extremes.json > "$PAYLOAD_RENDER"
  RENDER_RESP=$(curl -s "${BASE_URL}/api/images/compose/render?debug=1" \
    -H "Content-Type: application/json" \
    -d @"$PAYLOAD_RENDER" 2>/dev/null || true)
  rm -f "$PAYLOAD_RENDER"

  if [ -z "$RENDER_RESP" ]; then
    report FAIL "render debug (empty response)"
  else
    HAS_CANVAS=false
    HAS_LAYERS_NORM=false
    HAS_KEYS_SUM=false
    command -v jq &>/dev/null && {
      HAS_CANVAS=$(echo "$RENDER_RESP" | jq -r '._debug.canvas.width // empty' | grep -q . && echo true || echo false)
      HAS_LAYERS_NORM=$(echo "$RENDER_RESP" | jq -r '._debug.layersNormalized // empty' | grep -q . && echo true || echo false)
      HAS_KEYS_SUM=$(echo "$RENDER_RESP" | jq -r '._debug.layerKeysSummary // empty' | grep -q . && echo true || echo false)
    }
    [ "$HAS_CANVAS" = true ] 2>/dev/null || echo "$RENDER_RESP" | grep -q '"canvas"' && HAS_CANVAS=true
    [ "$HAS_LAYERS_NORM" = true ] 2>/dev/null || echo "$RENDER_RESP" | grep -q '"layersNormalized"' && HAS_LAYERS_NORM=true
    [ "$HAS_KEYS_SUM" = true ] 2>/dev/null || echo "$RENDER_RESP" | grep -q '"layerKeysSummary"' && HAS_KEYS_SUM=true

    if [ "$HAS_CANVAS" = true ] && [ "$HAS_LAYERS_NORM" = true ] && [ "$HAS_KEYS_SUM" = true ]; then
      report PASS "render debug fields"
    else
      report FAIL "render debug fields (canvas=$HAS_CANVAS layersNormalized=$HAS_LAYERS_NORM layerKeysSummary=$HAS_KEYS_SUM)"
      echo "$RENDER_RESP" | jq '._debug' 2>/dev/null || echo "$RENDER_RESP" | grep -o '_debug[^}]*' | head -5
    fi

    # CTA normalized keys
    CTA_HAS_KEYS=true
    for key in width height fontSize backgroundColor textColor borderRadius; do
      if ! echo "$RENDER_RESP" | grep -q "\"$key\""; then
        CTA_HAS_KEYS=false
        break
      fi
    done
    if [ "$CTA_HAS_KEYS" = true ]; then
      report PASS "CTA normalized keys"
    else
      report FAIL "CTA normalized keys"
      echo "$RENDER_RESP" | jq '._debug.layersNormalized[] | select(.type=="button")' 2>/dev/null || true
    fi
  fi
fi

# --- PART C: Context engine (compose debug) ---
echo "=== Part C: Context engine ==="

COMPOSE_RESP=$(curl -s "${BASE_URL}/api/images/compose?debug=1" \
  -H "Content-Type: application/json" \
  -d @scripts/tests/payload-compose-debug.json 2>/dev/null || true)

if ! echo "$COMPOSE_RESP" | grep -q '"ok":true'; then
  report FAIL "Context automotive (compose request failed or !ok)"
  echo "$COMPOSE_RESP" | jq '.' 2>/dev/null | head -30 || echo "$COMPOSE_RESP" | head -20
else
  INDUSTRY=$(echo "$COMPOSE_RESP" | jq -r '._debug.contextUsed.resolvedIndustry // empty' 2>/dev/null)
  [ -z "$INDUSTRY" ] && INDUSTRY=$(echo "$COMPOSE_RESP" | grep -o '"resolvedIndustry":"[^"]*"' | cut -d'"' -f4)
  if [ "$INDUSTRY" = "automotive" ]; then
    report PASS "Context automotive"
  else
    report FAIL "Context automotive (resolvedIndustry=$INDUSTRY)"
  fi

  if echo "$COMPOSE_RESP" | grep -qiE 'car|dealer|showroom|automotive'; then
    report PASS "Prompt contains automotive keywords"
  else
    report FAIL "Prompt contains automotive keywords"
  fi

  if echo "$COMPOSE_RESP" | grep -qiE 'diptych|split screen|collage|montage|two panels|multiple frames'; then
    report PASS "Anti-collage in negative prompt"
  else
    report FAIL "Anti-collage in negative prompt"
  fi

  STYLE_PRESET=$(echo "$COMPOSE_RESP" | jq -r '._debug.contextUsed.style.preset // empty' 2>/dev/null)
  [ -z "$STYLE_PRESET" ] && echo "$COMPOSE_RESP" | grep -q '"preset"' && STYLE_PRESET=present
  if [ -n "$STYLE_PRESET" ]; then
    report PASS "contextUsed.style.preset present"
  else
    report FAIL "contextUsed.style.preset present"
  fi
fi

# --- PART D: Replicate debug (INFO) ---
echo "=== Part D: Replicate policy debug ==="

MULTI=$(echo "$COMPOSE_RESP" | jq -r '._debug.multipleOutputsReturned // empty' 2>/dev/null)
SUSPECTED=$(echo "$COMPOSE_RESP" | jq -r '._debug.suspectedCollage // empty' 2>/dev/null)
[ -z "$SUSPECTED" ] && echo "$COMPOSE_RESP" | grep -q '"suspectedCollage":true' && SUSPECTED=true
[ -n "$MULTI" ] && report INFO "multipleOutputsReturned=$MULTI"
[ -n "$SUSPECTED" ] && report INFO "suspectedCollage=$SUSPECTED"
[ -z "$SUSPECTED" ] && report INFO "suspectedCollage false"
if [ "$SUSPECTED" = "true" ]; then
  report INFO "suspectedCollage true (investigate)"
fi

# --- PART E: Frontend static ---
echo "=== Part E: Frontend static ==="

if command -v node &>/dev/null && [ -f "scripts/tests/check-frontend.js" ]; then
  if node scripts/tests/check-frontend.js; then
    report PASS "FE hooks present"
  else
    report FAIL "FE hooks present"
  fi
else
  report SKIP "FE hooks (node or script missing)"
fi

# --- Summary ---
echo ""
echo "=== Summary ==="
echo "PASS: $PASS  FAIL: $FAIL  SKIP: $SKIP"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
