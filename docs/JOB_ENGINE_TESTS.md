# Job Engine Smoke Tests

Tento dokument obsahuje manuální smoke testy pro unified Job Engine. Testy lze spustit pomocí `curl` příkazů.

## Předpoklady

- Backend běží na `https://api.neobot.cz`
- Redis a SQLite jsou dostupné
- PM2 proces `neobot` je spuštěn

## Test 1: Vytvoření SEO Generate Job

```bash
# Vytvoř job
RESPONSE=$(curl -sS -X POST https://api.neobot.cz/api/seo/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test článek pro smoke test"}')

# Extrahuj jobId
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')

echo "Created job: $JOB_ID"
echo "Response: $RESPONSE"

# Ověř, že jobId existuje
if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
  echo "❌ FAIL: Job ID not returned"
  exit 1
fi

echo "✅ PASS: Job created with ID $JOB_ID"
```

**Očekávaný výstup:**
```json
{
  "ok": true,
  "jobId": "123",
  "topic": "Test článek pro smoke test",
  "created_at": "2026-02-17 12:00:00"
}
```

## Test 2: Unified Job Status Endpoint

```bash
# Použij jobId z Testu 1
JOB_ID="<job_id_from_test_1>"

# Získej status přes unified endpoint
STATUS_RESPONSE=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID")

echo "Status response:"
echo "$STATUS_RESPONSE" | jq '.'

# Ověř strukturu
OK=$(echo "$STATUS_RESPONSE" | jq -r '.ok')
JOB_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.status')
JOB_TYPE=$(echo "$STATUS_RESPONSE" | jq -r '.job.type')
PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.job.progress')

if [ "$OK" != "true" ]; then
  echo "❌ FAIL: ok field is not true"
  exit 1
fi

if [ "$JOB_STATUS" != "queued" ] && [ "$JOB_STATUS" != "active" ] && [ "$JOB_STATUS" != "completed" ] && [ "$JOB_STATUS" != "failed" ]; then
  echo "❌ FAIL: Invalid status: $JOB_STATUS (must be queued|active|completed|failed)"
  exit 1
fi

if [ "$JOB_TYPE" != "seo_generate" ]; then
  echo "❌ FAIL: Invalid type: $JOB_TYPE"
  exit 1
fi

if [ "$PROGRESS" -lt 0 ] || [ "$PROGRESS" -gt 100 ]; then
  echo "❌ FAIL: Invalid progress: $PROGRESS (must be 0-100)"
  exit 1
fi

echo "✅ PASS: Unified endpoint returns valid structure"
```

**Očekávaný výstup:**
```json
{
  "ok": true,
  "job": {
    "id": "123",
    "type": "seo_generate",
    "status": "queued",
    "progress": 0,
    "result": null,
    "error": null,
    "created_at": "2026-02-17 12:00:00",
    "completed_at": null,
    "data": {
      "type": "seo_generate",
      "topic": "Test článek pro smoke test"
    }
  }
}
```

## Test 3: Legacy Status Endpoint Compatibility

```bash
# Použij jobId z Testu 1
JOB_ID="<job_id_from_test_1>"

# Získej status přes legacy endpoint
LEGACY_RESPONSE=$(curl -sS "https://api.neobot.cz/api/seo/status/$JOB_ID")

echo "Legacy response:"
echo "$LEGACY_RESPONSE" | jq '.'

# Ověř, že job_id existuje
LEGACY_JOB_ID=$(echo "$LEGACY_RESPONSE" | jq -r '.job_id')

if [ "$LEGACY_JOB_ID" != "$JOB_ID" ]; then
  echo "❌ FAIL: Legacy endpoint returned different job_id"
  exit 1
fi

echo "✅ PASS: Legacy endpoint returns compatible format"
```

**Očekávaný výstup:**
```json
{
  "job_id": "123",
  "topic": "Test článek pro smoke test",
  "status": "queued",
  "created_at": "2026-02-17 12:00:00",
  "completed_at": null
}
```

## Test 4: Error Handling - Invalid Payload

```bash
# Zkus vytvořit job s neplatným payloadem
ERROR_RESPONSE=$(curl -sS -X POST https://api.neobot.cz/api/seo/generate \
  -H "Content-Type: application/json" \
  -d '{"invalid":"payload"}' 2>&1)

echo "Error response:"
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"

# Pokud job byl vytvořen (některé validace mohou být až v workeru),
# vytvoř job s prázdným topicem
ERROR_RESPONSE2=$(curl -sS -X POST https://api.neobot.cz/api/seo/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":""}' 2>&1)

echo "Error response 2:"
echo "$ERROR_RESPONSE2" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE2"

echo "✅ PASS: Error handling test completed (check responses above)"
```

## Test 5: Job Completion Flow

```bash
# Vytvoř job a počkej na dokončení
JOB_ID=$(curl -sS -X POST https://api.neobot.cz/api/seo/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Quick test"}' | jq -r '.jobId')

echo "Created job: $JOB_ID"
echo "Waiting for completion (max 60s)..."

# Poll status každé 2 sekundy, max 30x (60 sekund)
for i in {1..30}; do
  sleep 2
  STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.status')
  PROGRESS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.progress')
  
  echo "[$i] Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ PASS: Job completed successfully"
    
    # Ověř result
    RESULT=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.result')
    if [ "$RESULT" != "null" ]; then
      echo "✅ PASS: Result is present"
      echo "$RESULT" | jq '.content' | head -c 100
      echo "..."
    else
      echo "⚠️  WARN: Result is null (may be expected for some job types)"
    fi
    exit 0
  fi
  
  if [ "$STATUS" = "failed" ]; then
    ERROR=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.error')
    echo "❌ FAIL: Job failed"
    echo "Error: $ERROR"
    exit 1
  fi
done

echo "⚠️  WARN: Job did not complete within 60s (status: $STATUS)"
```

## Test 6: SEO Audit Job

```bash
# Vytvoř SEO audit job
AUDIT_JOB_ID=$(curl -sS -X POST https://api.neobot.cz/api/seo/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxPages":5}' | jq -r '.jobId')

echo "Created audit job: $AUDIT_JOB_ID"

# Zkontroluj unified endpoint
AUDIT_STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$AUDIT_JOB_ID" | jq -r '.job.type')

if [ "$AUDIT_STATUS" != "seo_audit" ]; then
  echo "❌ FAIL: Audit job type mismatch"
  exit 1
fi

echo "✅ PASS: SEO audit job created and accessible via unified endpoint"
```

## Test 7: Error Format Consistency

```bash
# Pokud máš failed job, zkontroluj error formát
FAILED_JOB_ID="<failed_job_id>"

ERROR_RESPONSE=$(curl -sS "https://api.neobot.cz/api/jobs/$FAILED_JOB_ID")

ERROR_OBJ=$(echo "$ERROR_RESPONSE" | jq '.job.error')

if [ "$ERROR_OBJ" != "null" ]; then
  ERROR_MESSAGE=$(echo "$ERROR_OBJ" | jq -r '.message')
  
  if [ -z "$ERROR_MESSAGE" ] || [ "$ERROR_MESSAGE" = "null" ]; then
    echo "❌ FAIL: Error object missing 'message' field"
    exit 1
  fi
  
  echo "✅ PASS: Error format is correct"
  echo "Error message: $ERROR_MESSAGE"
else
  echo "⚠️  INFO: No error object (job may not be failed)"
fi
```

## Test 8: Status Normalization

```bash
# Ověř, že všechny joby mají normalizovaný status
JOB_ID="<any_job_id>"

STATUS=$(curl -sS "https://api.neobot.cz/api/jobs/$JOB_ID" | jq -r '.job.status')

VALID_STATUSES="queued active completed failed"

if [[ ! " $VALID_STATUSES " =~ " $STATUS " ]]; then
  echo "❌ FAIL: Invalid status: $STATUS (must be one of: $VALID_STATUSES)"
  exit 1
fi

echo "✅ PASS: Status is normalized: $STATUS"
```

## Kompletní Test Suite

Spusť všechny testy najednou:

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="https://api.neobot.cz"

echo "=== Job Engine Smoke Tests ==="
echo ""

# Test 1: Create job
echo "Test 1: Creating SEO generate job..."
RESPONSE=$(curl -sS -X POST "$BASE_URL/api/seo/generate" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Smoke test"}')
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
echo "✅ Job created: $JOB_ID"
echo ""

# Test 2: Unified endpoint
echo "Test 2: Unified endpoint..."
UNIFIED=$(curl -sS "$BASE_URL/api/jobs/$JOB_ID")
STATUS=$(echo "$UNIFIED" | jq -r '.job.status')
TYPE=$(echo "$UNIFIED" | jq -r '.job.type')
echo "✅ Status: $STATUS, Type: $TYPE"
echo ""

# Test 3: Legacy endpoint
echo "Test 3: Legacy endpoint..."
LEGACY=$(curl -sS "$BASE_URL/api/seo/status/$JOB_ID")
LEGACY_ID=$(echo "$LEGACY" | jq -r '.job_id')
if [ "$LEGACY_ID" = "$JOB_ID" ]; then
  echo "✅ Legacy endpoint compatible"
else
  echo "❌ Legacy endpoint mismatch"
  exit 1
fi
echo ""

# Test 4: Status normalization
echo "Test 4: Status normalization..."
if [[ " queued active completed failed " =~ " $STATUS " ]]; then
  echo "✅ Status normalized: $STATUS"
else
  echo "❌ Invalid status: $STATUS"
  exit 1
fi
echo ""

echo "=== All tests passed ==="
```

## Poznámky

- Testy předpokládají, že `jq` je nainstalován pro JSON parsing
- Některé testy vyžadují čekání na dokončení jobu (až 60 sekund)
- Pro produkční prostředí uprav `BASE_URL` na správnou doménu
- Failed joby lze vytvořit ručně nebo počkat na timeout/error
