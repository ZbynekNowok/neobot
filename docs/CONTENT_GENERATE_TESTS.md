# Content Generate API - Test Plan

Tento dokument obsahuje testy pro endpoint `POST /api/content/generate` pro generování obsahu pro sociální sítě.

## Předpoklady

- Backend běží na `https://api.neobot.cz`
- PM2 proces `neobot` je spuštěn
- `OPENAI_API_KEY` je nastaven v `.env`
- CORS je povolen pro `neobot.cz` a `www.neobot.cz`

## Test 1: Facebook - základní generování

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "Představujeme novou kolekci letních šatů",
    "settings": {
      "platform": "facebook",
      "purpose": "prodej",
      "tone": "neformalni",
      "length": "stredni"
    }
  }'

# Očekávaný výstup:
# {
#   "ok": true,
#   "text": "...",
#   "hashtags": ["#...", "#..."],
#   "notes": ["...", "..."]
# }
```

## Test 2: Instagram - základní generování

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "Tipy pro zdravý životní styl",
    "settings": {
      "platform": "instagram",
      "purpose": "education",
      "tone": "priatelsky",
      "length": "kratky"
    }
  }'

# Očekávaný výstup:
# {
#   "ok": true,
#   "text": "...",
#   "hashtags": ["#...", "#..."],
#   "notes": ["...", "..."]
# }
```

## Test 3: Test odstranění letopočtů - "jarní kolekce"

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "jarní kolekce",
    "settings": {
      "platform": "instagram",
      "purpose": "brand",
      "tone": "neformalni",
      "length": "stredni"
    }
  }' | jq '.'

# Ověření:
# - text NESMÍ obsahovat "2024", "2025", "jaro2024", atd.
# - hashtagy NESMÍ obsahovat "#jaro2024", "#leto2024", atd.
# - hashtagy mohou být "#jaro", "#leto", atd. (bez roku)
```

## Test 4: Test s explicitním rokem (rok se zachová)

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "nová kolekce pro rok 2025",
    "settings": {
      "platform": "facebook",
      "purpose": "prodej",
      "tone": "formalni",
      "length": "stredni"
    }
  }' | jq '.'

# Ověření:
# - text MŮŽE obsahovat "2025" (uživatel ho explicitně zadal)
# - hashtagy mohou obsahovat rok, pokud je relevantní
```

## Test 5: Validace - chybějící prompt

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "settings": {
      "platform": "facebook",
      "purpose": "prodej",
      "tone": "neformalni",
      "length": "stredni"
    }
  }'

# Očekávaný výstup: {"error":"Prompt is required"}
```

## Test 6: Validace - neplatná platforma

```bash
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "test",
    "settings": {
      "platform": "twitter",
      "purpose": "prodej",
      "tone": "neformalni",
      "length": "stredni"
    }
  }'

# Očekávaný výstup: {"error":"Platform must be 'facebook' or 'instagram'"}
```

## Test 7: Robust parsing - fallback na regex

```bash
# Test s promptem, který může způsobit nevalidní JSON z LLM
curl -X POST https://api.neobot.cz/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "komplexní popis produktu s mnoha detaily",
    "settings": {
      "platform": "instagram",
      "purpose": "prodej",
      "tone": "neformalni",
      "length": "dlouhy"
    }
  }' | jq '.'

# Ověření:
# - response musí mít strukturu {ok:true, text, hashtags, notes}
# - hashtags musí být pole (i když prázdné)
# - notes musí být pole (i když prázdné)
```

## Kompletní Test Suite

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="https://api.neobot.cz"

echo "=== Content Generate Tests ==="
echo ""

# Test 1: Facebook
echo "Test 1: Facebook content generation..."
RESPONSE1=$(curl -sS -X POST "$BASE_URL/api/content/generate" \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "Představujeme novou kolekci letních šatů",
    "settings": {
      "platform": "facebook",
      "purpose": "prodej",
      "tone": "neformalni",
      "length": "stredni"
    }
  }')

echo "$RESPONSE1" | jq '.'

OK1=$(echo "$RESPONSE1" | jq -r '.ok')
PLATFORM_CHECK=$(echo "$RESPONSE1" | jq -r '.text' | grep -i "facebook\|fb" || echo "")

if [ "$OK1" = "true" ]; then
  echo "✅ Facebook test passed"
else
  echo "❌ Facebook test failed"
  exit 1
fi

# Test 2: Instagram
echo ""
echo "Test 2: Instagram content generation..."
RESPONSE2=$(curl -sS -X POST "$BASE_URL/api/content/generate" \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "Tipy pro zdravý životní styl",
    "settings": {
      "platform": "instagram",
      "purpose": "education",
      "tone": "priatelsky",
      "length": "kratky"
    }
  }')

echo "$RESPONSE2" | jq '.'

OK2=$(echo "$RESPONSE2" | jq -r '.ok')
HASHTAGS2=$(echo "$RESPONSE2" | jq -r '.hashtags | length')

if [ "$OK2" = "true" ] && [ "$HASHTAGS2" -ge 0 ]; then
  echo "✅ Instagram test passed"
else
  echo "❌ Instagram test failed"
  exit 1
fi

# Test 3: Year removal
echo ""
echo "Test 3: Year removal test (jarní kolekce)..."
RESPONSE3=$(curl -sS -X POST "$BASE_URL/api/content/generate" \
  -H "Content-Type: application/json" \
  -H "Origin: https://neobot.cz" \
  -d '{
    "profile": {},
    "type": "create_post",
    "prompt": "jarní kolekce",
    "settings": {
      "platform": "instagram",
      "purpose": "brand",
      "tone": "neformalni",
      "length": "stredni"
    }
  }')

TEXT3=$(echo "$RESPONSE3" | jq -r '.text')
HASHTAGS3=$(echo "$RESPONSE3" | jq -r '.hashtags | join(" ")')

HAS_YEAR=$(echo "$TEXT3 $HASHTAGS3" | grep -E "2024|2025|jaro2024|leto2024" || echo "")

if [ -z "$HAS_YEAR" ]; then
  echo "✅ Year removal test passed (no years found)"
else
  echo "❌ Year removal test failed (found: $HAS_YEAR)"
  exit 1
fi

echo ""
echo "=== All tests passed ==="
```

## Poznámky

- Endpoint: `POST /api/content/generate`
- Platform: `facebook` nebo `instagram` (povinné)
- Purpose: `prodej`, `brand`, `engagement`, `education` (volitelné)
- Tone: `neformalni`, `formalni`, `priatelsky`, `profesionalni` (volitelné)
- Length: `kratky`, `stredni`, `dlouhy` (volitelné)
- Response formát: `{ ok: true, text: string, hashtags: string[], notes: string[] }`
- Post-processing: automatické odstranění letopočtů (2024, 2025) z textu a hashtagů, pokud uživatel rok nezadal v promptu
- Robust parsing: pokud LLM nevrátí validní JSON, použije se fallback parser s regex extrakcí hashtagů

## Ověření v DevTools

1. Otevřete DevTools (F12) → Network tab
2. Filtrujte na "content/generate"
3. Ověřte:
   - Request jde na `https://api.neobot.cz/api/content/generate`
   - Payload obsahuje správné `settings.platform`
   - Response má strukturu `{ ok: true, text, hashtags, notes }`
   - Při promptu "jarní kolekce" response neobsahuje "2024" nebo "2025"
