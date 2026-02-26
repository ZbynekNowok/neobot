# Chat + Brand Memory – testy API

## Auth

Všechny endpointy vyžadují autentizaci.

- **Produkce:** header `x-api-key: nb_...`
- **Lokálně (DEV):** header `x-dev-user-id: <id>`

Příklady používají proměnnou pro klíč:

```bash
# Produkce
export API_KEY="nb_xxxxxxxx"
# nebo DEV
export DEV_HEADER="x-dev-user-id: test-user"
```

---

## 1) Workspace profile (Brand Memory)

### GET /api/workspace/profile

Vrátí aktuální profil workspace (prázdný objekt, pokud není nastaven).

```bash
curl -s "https://api.neobot.cz/api/workspace/profile" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" | jq .
```

Očekávaná odpověď: `{ "ok": true, "profile": { ... } }`

### POST /api/workspace/profile

Upsert profilu (industry, tone, město, USP, služby, zakázaná slova, CTA styl).

```bash
curl -s -X POST "https://api.neobot.cz/api/workspace/profile" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Květiny Praha",
    "industry": "květinářství",
    "target_audience": "firmy a soukromé oslavy",
    "city": "Praha",
    "tone": "přátelský, profesionální",
    "usp": "Čerstvé květiny a doručení v den objednávky.",
    "main_services": ["kytice", "svatební výzdoba", "doručení"],
    "cta_style": "Jednoduchá CTA: Objednat, Zavolat.",
    "forbidden_words": ["super", "mega", "nejlepší na trhu"]
  }' | jq .
```

Odpověď: `{ "ok": true, "profile": { ... } }`

---

## 2) Vytvoření vlákna (POST /api/chat)

První zpráva bez `threadId` vytvoří nové vlákno.

```bash
curl -s -X POST "https://api.neobot.cz/api/chat" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "marketing",
    "message": "Potřebuji vymyslet krátký text na Instagram pro jarní akci na kytice."
  }' | jq .
```

Očekávaná odpověď:

```json
{
  "ok": true,
  "threadId": "uuid",
  "reply": "...",
  "meta": { "units": 2, "model": "gpt-4o-mini" }
}
```

---

## 3) Pokračování ve vláknu

Pošli stejný request s `threadId` z předchozí odpovědi.

```bash
curl -s -X POST "https://api.neobot.cz/api/chat" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "<THREAD_ID_Z_PREDCHOZÍ_ODPOVĚDI>",
    "mode": "marketing",
    "message": "Dej mi ještě variantu s emoji."
  }' | jq .
```

---

## 4) Seznam vláken

```bash
curl -s "https://api.neobot.cz/api/chat/threads" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" | jq .
```

Odpověď: `{ "ok": true, "threads": [ { "id", "title", "mode", "last_message_at", "created_at" }, ... ] }`

---

## 5) Zprávy ve vlákně

```bash
curl -s "https://api.neobot.cz/api/chat/threads/<THREAD_ID>" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" | jq .
```

Odpověď: `{ "ok": true, "thread": { "id", "title", "mode", "thread_summary", "created_at", "last_message_at" }, "messages": [ { "id", "role", "content", "created_at" }, ... ] }`

---

## 6) Režim „general“

Bez Brand Memory, neutrální asistent.

```bash
curl -s -X POST "https://api.neobot.cz/api/chat" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "general",
    "message": "Co je to USP?"
  }' | jq .
```

---

## Lokální test (DEV)

```bash
# Profil
curl -s -X POST "http://localhost:3000/api/workspace/profile" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test s.r.o.","industry":"IT","city":"Brno","tone":"neformální"}' | jq .

# Nový chat
curl -s -X POST "http://localhost:3000/api/chat" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{"message":"Napiš mi krátký slogan pro naši firmu."}' | jq .

# Seznam vláken
curl -s "http://localhost:3000/api/chat/threads" -H "x-dev-user-id: test-user" | jq .
```

---

## Usage

Každé volání POST /api/chat spotřebuje **2 units** (typ `chat_message`). Limity jsou stejné jako u ostatních operací (workspace plan).

Při překročení limitu: **402** s `error: "LIMIT_REACHED"`.
