# Image Generation (Replicate SDXL) - Test Plan

Tento dokument obsahuje testy pro generování pozadí pomocí Replicate SDXL přes unified job engine.

## Předpoklady

- Backend běží na `https://api.neobot.cz`
- Redis a SQLite jsou dostupné
- PM2 proces `neobot` je spuštěn
- `REPLICATE_API_TOKEN` je nastaven v `.env`
- `sharp` a `replicate` jsou nainstalovány (`npm install`)

## Test 1: Vytvoření image generation jobu

```bash
curl -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "1:1",
    "style": "minimal",
    "purpose": "brand",
    "palette": "neutral",
    "industry": "cukrárna",
    "description": "elegantní dezerty na dřevěném stole",
    "brand": {
      "name": "Sladká cukrárna",
      "primary": "#e91e63",
      "accent": "#ff9800"
    }
  }'

# Očekávaný výstup:
# {"ok":true,"jobId":"20"}
```

## Test 2: Sledování progressu

```bash
# Použij jobId z Testu 1
JOB_ID="20"

# Zkontroluj status (polling každé 2 sekundy)
for i in {1..30}; do
  sleep 2
  STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.status')
  PROGRESS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.progress')
  echo "[$i] Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Job completed!"
    break
  fi
  
  if [ "$STATUS" = "failed" ]; then
    echo "❌ Job failed!"
    curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq '.job.error'
    break
  fi
done
```

## Test 3: Ověření výsledku

```bash
# Po dokončení zkontroluj result
curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq '.job.result'

# Očekávaný výstup:
# {
#   "url": "/outputs/images/20.png",
#   "formatPx": { "w": 1080, "h": 1080 },
#   "prompt": {
#     "final": "...",
#     "negative": "text, letters, words, logo..."
#   },
#   "meta": {
#     "model": "stability-ai/sdxl:...",
#     "steps": 30,
#     "cfg": 7.5,
#     "seed": ...
#   }
# }
```

## Test 4: Otevření výsledného obrázku

```bash
# Získej URL z resultu
IMAGE_URL=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.result.url')

# Otevři v prohlížeči
echo "Otevři: https://api.neobot.cz$IMAGE_URL"
# Nebo:
curl -sS "https://api.neobot.cz$IMAGE_URL" -o test-image.png
```

## Test 5: Různé formáty

```bash
# Test 9:16 (Instagram Story)
curl -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "9:16",
    "style": "playful",
    "purpose": "engagement",
    "palette": "bold",
    "industry": "kadeřnictví",
    "description": "moderní salon s přirozeným světlem"
  }' | jq '.jobId'

# Test 16:9 (landscape)
curl -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "16:9",
    "style": "luxury",
    "purpose": "sale",
    "palette": "warm",
    "industry": "truhlář",
    "description": "ručně vyrobený nábytek v interiéru"
  }' | jq '.jobId'
```

## Test 6: Error handling

```bash
# Test s neplatným formátem
curl -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "invalid",
    "description": "test"
  }'

# Očekávaný výstup: {"error":"Format must be one of: 1:1, 9:16, 16:9"}

# Test bez description
curl -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "1:1"
  }'

# Očekávaný výstup: {"error":"Description is required"}
```

## Test 7: Prompt validation

```bash
# Vytvoř job a zkontroluj prompt v resultu
JOB_ID=$(curl -sS -X POST https://api.neobot.cz/api/images/background \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "1:1",
    "style": "minimal",
    "purpose": "brand",
    "palette": "neutral",
    "industry": "cukrárna",
    "description": "test description"
  }' | jq -r '.jobId')

# Počkej na dokončení
sleep 30

# Zkontroluj prompt
curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq '.job.result.prompt'

# Ověř, že prompt obsahuje:
# - "NO TEXT, NO LOGO, NO WATERMARK"
# - "leave negative space for typography"
# - industry, style, purpose, palette, description
```

## Kompletní Test Suite

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="https://api.neobot.cz"

echo "=== Image Generation Tests ==="
echo ""

# Test 1: Create job
echo "Test 1: Creating image generation job..."
RESPONSE=$(curl -sS -X POST "$BASE_URL/api/images/background" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "social",
    "platform": "instagram",
    "format": "1:1",
    "style": "minimal",
    "purpose": "brand",
    "palette": "neutral",
    "industry": "cukrárna",
    "description": "elegantní dezerty na dřevěném stole"
  }')

JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
echo "✅ Job created: $JOB_ID"
echo ""

# Test 2: Check status
echo "Test 2: Checking job status..."
sleep 5
STATUS=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq -r '.job.status')
PROGRESS=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq -r '.job.progress')
echo "✅ Status: $STATUS, Progress: $PROGRESS%"
echo ""

# Test 3: Wait for completion
echo "Test 3: Waiting for completion (max 2 minutes)..."
for i in {1..60}; do
  sleep 2
  STATUS=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq -r '.job.status')
  PROGRESS=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq -r '.job.progress')
  echo "[$i] Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Job completed!"
    break
  fi
  
  if [ "$STATUS" = "failed" ]; then
    echo "❌ Job failed!"
    curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq '.job.error'
    exit 1
  fi
done

# Test 4: Verify result
echo ""
echo "Test 4: Verifying result..."
RESULT=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID" | jq '.job.result')
echo "$RESULT" | jq '.'

# Check required fields
URL=$(echo "$RESULT" | jq -r '.url')
FORMAT=$(echo "$RESULT" | jq -r '.formatPx')
PROMPT=$(echo "$RESULT" | jq -r '.prompt.final')

if [ "$URL" != "null" ] && [ -n "$URL" ]; then
  echo "✅ URL present: $URL"
else
  echo "❌ URL missing"
  exit 1
fi

if echo "$PROMPT" | grep -q "NO TEXT"; then
  echo "✅ Prompt contains NO TEXT"
else
  echo "⚠️  Prompt missing NO TEXT"
fi

echo ""
echo "=== All tests passed ==="
```

## Poznámky

- Replicate generování může trvat 10-60 sekund
- Progress se aktualizuje: 5% → 60% → 85% → 95% → 100%
- Obrázky se ukládají do `/public/outputs/images/<jobId>.png`
- Formáty jsou automaticky resize/crop na přesné rozměry:
  - 1:1 → 1080x1080px
  - 9:16 → 1080x1920px
  - 16:9 → 1920x1080px
