# SaaS MVP – testování

## Migrace DB

Tabulky (workspaces, workspace_members, workspace_plans, workspace_usage, outputs, api_keys) se vytvoří při startu serveru při načtení `src/db/database.js`. Samotný server tedy migraci spustí automaticky.

Pro pouze migraci bez startu serveru (volitelné):

```bash
npm run db:migrate
```

---

## Produkční autentizace (API Key)

### 1) Vytvoření API klíče (admin bootstrap)

**Poznámka:** `ADMIN_BOOTSTRAP_KEY` musí být nastaven v `.env` (v production je povinný, jinak server nezačne).

```bash
# Nastavit ADMIN_BOOTSTRAP_KEY v .env
export ADMIN_BOOTSTRAP_KEY="your-long-secret-bootstrap-key-here"

# Vytvořit workspace + API key
curl -s -X POST "https://api.neobot.cz/api/admin/api-keys" \
  -H "x-admin-key: $ADMIN_BOOTSTRAP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceName":"My Company","keyName":"Production Key"}' | jq .
```

**Očekávaná odpověď:**
```json
{
  "ok": true,
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Company"
  },
  "apiKey": "nb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**⚠️ DŮLEŽITÉ:** Raw API key (`apiKey`) se vrátí **pouze jednou** v této odpovědi. Uložte si ho bezpečně – už se nikdy nezobrazí.

---

### 2) Použití API klíče

Všechny chráněné endpointy vyžadují header `x-api-key` s hodnotou získaného klíče.

```bash
export API_KEY="nb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# GET /api/me
curl -s "https://api.neobot.cz/api/me" \
  -H "x-api-key: $API_KEY" | jq .
```

**Očekávaná odpověď:**
```json
{
  "ok": true,
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Company",
    "plan_key": "start",
    "usage": {
      "period": "2025-02",
      "used": 0,
      "limit": 30000,
      "remaining": 30000
    }
  },
  "auth": {
    "mode": "api_key",
    "key_prefix": "nb_xxxxx"
  }
}
```

---

### 3) Generování obsahu s API klíčem

```bash
curl -s -X POST "https://api.neobot.cz/api/content/generate" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Jarní kolekce",
    "settings": {
      "platform": "instagram",
      "purpose": "engagement",
      "tone": "neformalni",
      "length": "stredni"
    }
  }' | jq .
```

**Kontrola usage po generování:**
```bash
curl -s "https://api.neobot.cz/api/me" \
  -H "x-api-key: $API_KEY" | jq '.workspace.usage'
# Očekáváno: used > 0 (např. 1500 pro content_generate)
```

---

### 4) Marketing endpointy

```bash
# Background generation
curl -s -X POST "https://api.neobot.cz/api/marketing/background" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Modern office space",
    "format": "16:9",
    "style": "minimal"
  }' | jq .

# Flyer generation
curl -s -X POST "https://api.neobot.cz/api/marketing/flyer" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "fashion",
    "brand": {"name": "Brand Name", "primary": "#2563eb"},
    "offer": {"headline": "Special Offer"},
    "format": "ig_post"
  }' | jq .
```

---

### 5) Historie výstupů

```bash
curl -s "https://api.neobot.cz/api/outputs?limit=50" \
  -H "x-api-key: $API_KEY" | jq '.items | length, .[0]'
```

---

## Development / lokální testování

V **developmentu** (`NODE_ENV !== 'production'`) jsou podporovány **obě** metody:

### A) DEV header (pro rychlé testy)

```bash
curl -s "http://localhost:3000/api/me" \
  -H "x-dev-user-id: test-user-123" \
  -H "x-dev-user-email: dev@example.com"
```

### B) API key (pro testování produkčního flow)

```bash
# Nejdřív vytvořit klíč lokálně (s ADMIN_BOOTSTRAP_KEY v .env)
curl -s -X POST "http://localhost:3000/api/admin/api-keys" \
  -H "x-admin-key: $ADMIN_BOOTSTRAP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspaceName":"Test Workspace"}' | jq -r '.apiKey' > /tmp/api_key.txt

# Použít klíč
export API_KEY=$(cat /tmp/api_key.txt)
curl -s "http://localhost:3000/api/me" \
  -H "x-api-key: $API_KEY" | jq .
```

---

## Bezpečnost

### Produkce

- ✅ **Debug bypass vypnutý:** V `NODE_ENV=production` je `?debug=1` **ignorován**. `x-dev-user-id` header nefunguje.
- ✅ **ADMIN_BOOTSTRAP_KEY povinný:** Server v production nezačne bez `ADMIN_BOOTSTRAP_KEY` v `.env`.
- ✅ **Raw API key nelogován:** Logger automaticky redaktuje `x-api-key` header a všechny `*.apiKey`, `*.api_key` hodnoty.
- ✅ **CORS:** Header `x-api-key` je povolen v CORS konfiguraci.

### Testování bezpečnosti

```bash
# 1) Bez API key -> 401
curl -s -o /dev/null -w "%{http_code}" "https://api.neobot.cz/api/me"
# Očekáváno: 401

# 2) Neplatný API key -> 401
curl -s -o /dev/null -w "%{http_code}" "https://api.neobot.cz/api/me" \
  -H "x-api-key: nb_invalid"
# Očekáváno: 401

# 3) Debug bypass v production -> nefunguje (ignorováno)
curl -s -o /dev/null -w "%{http_code}" "https://api.neobot.cz/api/me?debug=1" \
  -H "x-dev-user-id: test"
# Očekáváno: 401 (ne 200)
```

---

## Limit reached (402)

Při překročení měsíčního limitu API vrací **402** s `error: "LIMIT_REACHED"`.

Plan `start` má 30 000 units/měsíc. Jeden content_generate = 1500. Po cca 20 úspěšných voláních další volání vrátí 402.

```bash
for i in $(seq 1 25); do
  r=$(curl -s -o /tmp/out -w "%{http_code}" -X POST "https://api.neobot.cz/api/content/generate" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Test","settings":{"platform":"instagram","purpose":"engagement","tone":"neformalni","length":"kratky"}}')
  echo "Request $i -> HTTP $r"
  if [ "$r" = "402" ]; then
    echo "Limit reached:"
    cat /tmp/out | jq .
    break
  fi
done
```

**Očekávaná odpověď při 402:**
```json
{
  "ok": false,
  "error": "LIMIT_REACHED",
  "limit": 30000,
  "used": 30000,
  "remaining": 0,
  "message": "Monthly usage limit reached"
}
```

---

## Shrnutí změn

### Nové soubory
- `src/routes/admin.js` – admin endpoint pro vytváření API klíčů
- `src/db/database.js` – přidána tabulka `api_keys`

### Upravené soubory
- `src/auth/getAuthUser.js` – produkční API key auth, DEV fallback
- `src/auth/ensureWorkspace.js` – použití `req.workspaceId` z API key
- `src/routes/me.js` – response obsahuje `auth: { mode, key_prefix }`
- `server.js` – CORS (`x-api-key`, `x-admin-key`), kontrola `ADMIN_BOOTSTRAP_KEY` v production
- `src/logger.js` – redakce `x-api-key` headeru

### Environment proměnné
- `ADMIN_BOOTSTRAP_KEY` – povinný v production (jinak server nezačne)
