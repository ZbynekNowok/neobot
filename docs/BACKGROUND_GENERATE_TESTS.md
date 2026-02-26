# Background Generate (Replicate SDXL) - Test Plan

Tento dokument obsahuje testy pro samostatné generování background obrázků přes Replicate SDXL.

## Předpoklady

- Backend běží na `https://api.neobot.cz`
- Redis a SQLite jsou dostupné
- PM2 proces `neobot` je spuštěn
- `REPLICATE_API_TOKEN` je nastaven v `.env`
- `IMAGE_PROVIDER=replicate` je nastaven v `.env` (volitelné, default je replicate)
- `replicate` je nainstalován (`npm install`)

## Test 1: Vytvoření background generation jobu (1:1, structured payload)

```bash
curl -X POST https://api.neobot.cz/api/marketing/background \
  -H "Content-Type: application/json" \
  -d '{
    "description": "moderní kavárna s přirozeným světlem, minimalistický interiér",
    "industry": "kavarna",
    "style": "minimal",
    "format": "1:1",
    "purpose": "brand",
    "palette": "neutral"
  }'

# Očekávaný výstup:
# {"ok":true,"jobId":"30"}
```

## Test 2: Sledování progressu

```bash
# Použij jobId z Testu 1
JOB_ID="30"

# Zkontroluj status (polling každé 2 sekundy)
for i in {1..60}; do
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
#   "publicUrl": "/outputs/backgrounds/30.png",
#   "width": 1080,
#   "height": 1350,
#   "model": "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
#   "steps": 30
# }
```

## Test 4: Otevření výsledného obrázku

```bash
# Získej URL z resultu
IMAGE_URL=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.result.publicUrl')

# Otevři v prohlížeči
echo "Otevři: https://api.neobot.cz$IMAGE_URL"
# Nebo:
curl -sS "https://api.neobot.cz$IMAGE_URL" -o test-background.png
```

## Test 5: Formát 16:9 (landscape)

```bash
curl -X POST https://api.neobot.cz/api/marketing/background \
  -H "Content-Type: application/json" \
  -d '{
    "description": "moderní kancelář s výhledem na město",
    "industry": "sluzby",
    "style": "luxury",
    "format": "16:9",
    "purpose": "sale",
    "palette": "cool"
  }' | jq '.jobId'

# Očekávaný výstup: {"ok":true,"jobId":"31"}
# Rozměry: 1920x1080px
```

## Test 6: Progress tracking ověření (structured payload)

```bash
# Vytvoř job a sleduj progress v reálném čase
JOB_ID=$(curl -sS -X POST https://api.neobot.cz/api/marketing/background \
  -H "Content-Type: application/json" \
  -d '{
    "description": "přírodní krajina, hory v pozadí, zelená tráva",
    "industry": "cestovni kancelar",
    "style": "natural",
    "format": "4:5",
    "purpose": "engagement",
    "palette": "warm"
  }' | jq -r '.jobId')

echo "Job ID: $JOB_ID"
echo "Sledování progressu..."

# Očekávané progress hodnoty:
# - 10%: Start
# - 70%: Replicate generation + download completed
# - 100%: Saved

for i in {1..60}; do
  sleep 2
  PROGRESS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.progress')
  STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.status')
  echo "[$i] Progress: $PROGRESS%, Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
done
```

## Test 7: Error handling - neplatný prompt / description

```bash
# Test bez description / promptu
curl -X POST https://api.neobot.cz/api/marketing/background \
  -H "Content-Type: application/json" \
  -d '{
    "format": "1:1"
  }'

# Očekávaný výstup: {"error":"Description is required"}
```

## Test 8: Error handling - timeout simulace

```bash
# Pokud Replicate API neodpovídá déle než 120s, job by měl failnout
# V produkci: pokud Replicate skutečně timeoutne, job.status = failed
# Error message by měl obsahovat "timeout" nebo "Generation timeout"
```

## Kompletní Test Suite

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="https://api.neobot.cz"

echo "=== Background Generate Tests ==="
echo ""

# Test 1: Create job
echo "Test 1: Creating background generation job..."
RESPONSE=$(curl -sS -X POST "$BASE_URL/api/marketing/background" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "moderní kavárna s přirozeným světlem, minimalistický interiér",
    "industry": "kavarna",
    "style": "minimal",
    "format": "1:1",
    "purpose": "brand",
    "palette": "neutral"
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
PUBLIC_URL=$(echo "$RESULT" | jq -r '.publicUrl')
WIDTH=$(echo "$RESULT" | jq -r '.width')
HEIGHT=$(echo "$RESULT" | jq -r '.height')
MODEL=$(echo "$RESULT" | jq -r '.model')
STEPS=$(echo "$RESULT" | jq -r '.steps')

if [ "$PUBLIC_URL" != "null" ] && [ -n "$PUBLIC_URL" ]; then
  echo "✅ publicUrl present: $PUBLIC_URL"
else
  echo "❌ publicUrl missing"
  exit 1
fi

if [ "$WIDTH" != "null" ] && [ "$WIDTH" != "0" ]; then
  echo "✅ width present: $WIDTH"
else
  echo "❌ width missing"
  exit 1
fi

if [ "$HEIGHT" != "null" ] && [ "$HEIGHT" != "0" ]; then
  echo "✅ height present: $HEIGHT"
else
  echo "❌ height missing"
  exit 1
fi

if [ "$MODEL" != "null" ] && [ -n "$MODEL" ]; then
  echo "✅ model present: $MODEL"
else
  echo "❌ model missing"
  exit 1
fi

if [ "$STEPS" != "null" ] && [ "$STEPS" != "0" ]; then
  echo "✅ steps present: $STEPS"
else
  echo "❌ steps missing"
  exit 1
fi

# Test 5: Verify file exists
echo ""
echo "Test 5: Verifying file..."
FILE_PATH=$(echo "$PUBLIC_URL" | sed 's|^/outputs|public/outputs|')
if [ -f "$FILE_PATH" ]; then
  echo "✅ File exists: $FILE_PATH"
else
  echo "❌ File missing: $FILE_PATH"
  exit 1
fi

echo ""
echo "=== All tests passed ==="
```

## Poznámky

- Replicate generování může trvat 30-120 sekund
- Progress se aktualizuje: 10% (start) → 70% (Replicate + download) → 100% (saved)
- Obrázky se ukládají do `/public/outputs/backgrounds/<jobId>.png`
- Formáty:
  - `ig_post`: 1080x1350px
  - `ig_story`: 1080x1920px
- Prompt je automaticky doplněn o: "no text, no letters, no logo, no watermark, leave clean negative space for typography"
- Negative prompt obsahuje: "text, letters, watermark, logo, typography"
- Timeout: 120 sekund pro Replicate generování
- Error handling: při chybě job.status = failed + error.message v unified job systému

## Environment Variables

```bash
# .env
REPLICATE_API_TOKEN=r8_...
IMAGE_PROVIDER=replicate  # (volitelné, default je replicate)
```
