# Marketing Flyer with Replicate SDXL Background - Test Plan

Tento dokument obsahuje testy pro generování marketingových letáků s Replicate SDXL pozadím.

## Předpoklady

- Backend běží na `https://api.neobot.cz`
- Redis a SQLite jsou dostupné
- PM2 proces `neobot` je spuštěn
- `REPLICATE_API_TOKEN` je nastaven v `.env`
- `IMAGE_PROVIDER=replicate` je nastaven v `.env` (volitelné, default je replicate)
- `replicate` a `node-fetch` jsou nainstalovány (`npm install`)

## Test 1: Vytvoření marketing flyer jobu s Replicate backgroundem

```bash
curl -X POST https://api.neobot.cz/api/marketing/flyer \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "cukrárna",
    "brand": {
      "name": "Sladká cukrárna",
      "primary": "#e91e63",
      "accent": "#ff9800"
    },
    "offer": {
      "headline": "Čerstvé dezerty každý den",
      "subheadline": "Ručně vyráběné s láskou",
      "bullets": [
        "Výběr z 20+ druhů",
        "Bez konzervantů",
        "Doprava zdarma nad 500 Kč"
      ],
      "cta": "Objednat nyní"
    },
    "format": "ig_post"
  }'

# Očekávaný výstup:
# {"ok":true,"jobId":"25"}
```

## Test 2: Sledování progressu

```bash
# Použij jobId z Testu 1
JOB_ID="25"

# Zkontroluj status (polling každé 2 sekundy)
for i in {1..90}; do
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
#   "pngUrl": "/outputs/flyers/25.png",
#   "format": "ig_post",
#   "artDirection": {
#     "backgroundPrompt": "...",
#     "mood": "...",
#     "layoutVariant": "...",
#     "overlay": {...},
#     "palette": {...}
#   },
#   "textsUsed": {...}
# }
```

## Test 4: Ověření background obrázku

```bash
# Zkontroluj, že background byl vygenerován
# Background by měl být v /public/outputs/backgrounds/<jobId>.png
# a měl by být referencován v artDirection.backgroundImageUrl

curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq '.job.result.artDirection.backgroundImageUrl'

# Mělo by vrátit: "/outputs/backgrounds/25.png"

# Otevři background v prohlížeči
BACKGROUND_URL=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.result.artDirection.backgroundImageUrl')
echo "Otevři: https://api.neobot.cz$BACKGROUND_URL"
```

## Test 5: Otevření výsledného flyeru

```bash
# Získej URL z resultu
FLYER_URL=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.result.pngUrl')

# Otevři v prohlížeči
echo "Otevři: https://api.neobot.cz$FLYER_URL"
# Nebo:
curl -sS "https://api.neobot.cz$FLYER_URL" -o test-flyer.png
```

## Test 6: Instagram Story formát

```bash
curl -X POST https://api.neobot.cz/api/marketing/flyer \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "kadeřnictví",
    "brand": {
      "name": "Moderní střihy",
      "primary": "#2196f3",
      "accent": "#ff5722"
    },
    "offer": {
      "headline": "Nový střih za 500 Kč",
      "subheadline": "Pouze tento týden",
      "bullets": [
        "Konzultace zdarma",
        "Profesionální produkty",
        "Rychlá obsluha"
      ],
      "cta": "Rezervovat"
    },
    "format": "ig_story"
  }' | jq '.jobId'
```

## Test 7: Progress tracking ověření

```bash
# Vytvoř job a sleduj progress v reálném čase
JOB_ID=$(curl -sS -X POST https://api.neobot.cz/api/marketing/flyer \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "truhlář",
    "brand": {"name": "Dřevo", "primary": "#8b4513", "accent": "#daa520"},
    "offer": {
      "headline": "Ruční práce",
      "subheadline": "Kvalitní nábytek",
      "bullets": ["Dřevo z ČR", "Záruka 5 let"],
      "cta": "Kontaktovat"
    },
    "format": "ig_post"
  }' | jq -r '.jobId')

echo "Job ID: $JOB_ID"
echo "Sledování progressu..."

# Očekávané progress hodnoty:
# - 5%: Job started
# - 10%: Art direction completed
# - 60%: SDXL generation completed
# - 90%: Render started
# - 95%: Render completed
# - 100%: Job completed

for i in {1..90}; do
  sleep 2
  PROGRESS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.progress')
  STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.status')
  echo "[$i] Progress: $PROGRESS%, Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
done
```

## Test 8: Error handling - timeout simulace

```bash
# Pokud Replicate API neodpovídá déle než 120s, job by měl failnout
# Tento test vyžaduje simulaci timeoutu (např. mockování Replicate API)

# V produkci: pokud Replicate skutečně timeoutne, job.status = failed
# Error message by měl obsahovat "timeout" nebo "Generation timeout"
```

## Test 9: Fallback na placeholder

```bash
# Pokud background generation failne (ale ne timeout), job by měl pokračovat s placeholder
# Ověř, že flyer je stále vygenerován, ale s CSS gradient placeholder místo obrázku

# Simulace: nastav neplatný REPLICATE_API_TOKEN
# Job by měl pokračovat a vygenerovat flyer s placeholder backgroundem
```

## Kompletní Test Suite

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="https://api.neobot.cz"

echo "=== Marketing Flyer with Replicate Background Tests ==="
echo ""

# Test 1: Create job
echo "Test 1: Creating marketing flyer job..."
RESPONSE=$(curl -sS -X POST "$BASE_URL/api/marketing/flyer" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "cukrárna",
    "brand": {
      "name": "Sladká cukrárna",
      "primary": "#e91e63",
      "accent": "#ff9800"
    },
    "offer": {
      "headline": "Čerstvé dezerty každý den",
      "subheadline": "Ručně vyráběné s láskou",
      "bullets": [
        "Výběr z 20+ druhů",
        "Bez konzervantů",
        "Doprava zdarma nad 500 Kč"
      ],
      "cta": "Objednat nyní"
    },
    "format": "ig_post"
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
echo "Test 3: Waiting for completion (max 3 minutes)..."
for i in {1..90}; do
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
PNG_URL=$(echo "$RESULT" | jq -r '.pngUrl')
BACKGROUND_URL=$(echo "$RESULT" | jq -r '.artDirection.backgroundImageUrl')

if [ "$PNG_URL" != "null" ] && [ -n "$PNG_URL" ]; then
  echo "✅ Flyer PNG URL present: $PNG_URL"
else
  echo "❌ Flyer PNG URL missing"
  exit 1
fi

if [ "$BACKGROUND_URL" != "null" ] && [ -n "$BACKGROUND_URL" ]; then
  echo "✅ Background URL present: $BACKGROUND_URL"
else
  echo "⚠️  Background URL missing (using placeholder)"
fi

# Test 5: Verify files exist
echo ""
echo "Test 5: Verifying files..."
FLYER_PATH=$(echo "$PNG_URL" | sed 's|^/outputs|public/outputs|')
if [ -f "$FLYER_PATH" ]; then
  echo "✅ Flyer file exists: $FLYER_PATH"
else
  echo "❌ Flyer file missing: $FLYER_PATH"
  exit 1
fi

if [ "$BACKGROUND_URL" != "null" ] && [ -n "$BACKGROUND_URL" ]; then
  BACKGROUND_PATH=$(echo "$BACKGROUND_URL" | sed 's|^/outputs|public/outputs|')
  if [ -f "$BACKGROUND_PATH" ]; then
    echo "✅ Background file exists: $BACKGROUND_PATH"
  else
    echo "❌ Background file missing: $BACKGROUND_PATH"
    exit 1
  fi
fi

echo ""
echo "=== All tests passed ==="
```

## Poznámky

- Replicate generování může trvat 30-120 sekund
- Progress se aktualizuje: 5% → 10% (art direction) → 60% (SDXL) → 90% (render) → 95% (saved) → 100% (done)
- Background obrázky se ukládají do `/public/outputs/backgrounds/<jobId>.png`
- Flyery se ukládají do `/public/outputs/flyers/<jobId>.png`
- Pokud background generation failne (ne timeout), job pokračuje s CSS gradient placeholder
- Pokud background generation timeoutne (>120s), job.status = failed
- Error messages jsou normalizovány přes unified job systém

## Environment Variables

```bash
# .env
REPLICATE_API_TOKEN=r8_...
IMAGE_PROVIDER=replicate  # (volitelné, default je replicate)
```
