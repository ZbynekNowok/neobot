# NeoBot – Project State

## 🧠 Project Overview
NeoBot je produkční AI marketingový konzultant.
Nejde o demo ani ChatGPT klon – cílem je řízený dialog, sběr kontextu a konkrétní doporučení.

Backend je „mozek“, frontend je hloupý klient.

---

## 🏗️ Aktuální architektura (HOTOVO)

### Server
- VPS: Ubuntu 24.04
- Node.js + Express
- PM2 (process name: `neobot`)
- Port: `3000`

### Backend soubory
- `server.js` – API, routing
- `decisionTree.js` – řízení dialogu (onboarding → strategie)
- `llm.js` – OpenAI API wrapper (stručné, strukturované odpovědi)
- `memory.js` – session paměť (in-memory)
- `profile.json` – placeholder pro budoucí profil uživatele
- `ecosystem.config.js` – PM2 config (BEZ tajných klíčů)

### Frontend
- `chat.html`
- jednoduchý web chat
- historie ukládána v `localStorage`
- odpovědi zobrazovány po řádcích
- frontend neobsahuje žádnou logiku rozhodování

---

## 🔐 Bezpečnost
- OpenAI API key **NENÍ v kódu**
- API key je dostupný pouze přes `process.env.OPENAI_API_KEY`
- `.env` je v `.gitignore`
- `node_modules` nejsou verzované
- GitHub Secret Scanning je aktivní a ověřený

---

## 🚦 Aktuální stav
- Server běží stabilně
- API endpoint: `POST /think/chat`
- NeoBot odpovídá
- Žádné 401 chyby
- Žádné pády
- GitHub repo je veřejné a čisté

Repo:
https://github.com/ZbynekNowok/neobot

---

## 🧭 Koncept řízení
- Rozhodovací logika je **výhradně na serveru**
- LLM „přemýšlí“, ale **nesmí řídit tok**
- DecisionTree určuje:
  - fázi dialogu
  - další otázky
  - směr konverzace

NeoBot:
- klade správné otázky
- sbírá kontext
- dává konkrétní doporučení
- nemluví obecně

---

## 🗺️ Roadmapa (DODRŽUJE SE POŘADÍ)

### EPIC 1 – Výkon & UX
- TASK 1.1 – Okamžitá odezva UI ⬅️ **AKTUÁLNÍ**
- TASK 1.2 – Streaming odpovědi
- *(Ořezání kontextu ne – viz EPIC 3)*

### EPIC 2 – Logika chatu
- TASK 2.1 – Oddělení módů (onboarding / volný chat)
- TASK 2.2 – Lock na otázky

### EPIC 3 – Paměť & data
- TASK 3.1 – Server-side persistence
- TASK 3.2 – Profil uživatele (profilové odpovědi při registraci)
- TASK 3.3 – NeoBot drží kontext u každého klienta podle těchto profilových odpovědí (ne ořezávání kontextu, ale stavění na registračním profilu)

### EPIC 4 – Role NeoBota
- TASK 4.1 – Přepínač role (konzultant / copywriter / stratég)

### EPIC 5 – Produkce
- TASK 5.1 – Rate limit
- TASK 5.2 – Bezpečnost

### Plán: AI Ads Studio
Inspirace: [marketingmonk.ai](https://marketingmonk.ai). Fáze (postupné):

- **F1: URL → Ads Draft** (brand summary + reklamní texty) [MVP] ✅ **HOTOVO**
  - **Technický kontrakt:**
  - Endpoint: `POST /api/ads/draft`
  - Input JSON: `{ "url": "https://..." }`
  - Output JSON: `{ "ok": true, "brand": {...}, "ads": {...} }`  
    Hlavní pole: `brand.name`, `brand.description`, `brand.services[]`, `brand.usp[]`, `brand.tone`, `brand.target_audience`, `ads.meta_primary_texts[]` (5), `ads.meta_headlines[]` (5), `ads.google_headlines[]` (10), `ads.google_descriptions[]` (6)
- **F2:** URL → Image Ads (generování 3–6 kreativ)
- **F3:** Produktová fotka → Marketing scénáře (4–8 variant)
- **F4:** Image → Video Ad (5–10s video)
- **F5:** Social publish (FB/IG/LinkedIn) – navázat na existující publish modul

**Další krok:** F2 (URL → Image Ads) nebo jiný task dle priorit.

---

### F1 – Co bylo implementováno
- **Backend:** Router `src/routes/adsStudio.js` – POST `/api/ads/draft`, validace URL (http/https), chyby 400 / 502 / 503 / 500. Logika v `src/marketing/adsStudio.js`: stahování HTML (undici, timeout 15 s), parsování cheerio (title, meta, h1/h2, odstavce, max ~12k znaků), LLM přes `src/llm/llmGateway.js` → strukturovaný JSON výstup dle kontraktu.
- **Frontend:** Stránka „AI Ads Studio“ na route `/app/ads`, URL input + „Generovat reklamu“, volání `neobotFetch("/api/ads/draft", …)` s x-api-key. Karty: Brand, Meta texty, Meta headlines, Google headlines, Google descriptions; kopírování do schránky.

### F1 – Jak to otestovat
1. Spusť backend (např. `node server.js` nebo PM2) a frontend (dev server z `frontend/neo-mind-guide-main`).
2. Přihlas se do app, v sidebaru zvol **Reklama → AI Ads Studio**.
3. Zadej URL (např. `https://example.com`) a klikni **Generovat reklamu**.
4. **Network (DevTools):** Očekávej `POST …/api/ads/draft` s body `{ "url": "https://..." }`, hlavička `x-api-key`. Při úspěchu status **200**, response JSON: `{ "ok": true, "brand": {...}, "ads": {...} }`. Při neplatné URL **400**, při nedostupném webu/timeout **502**, při chybě LLM **503**.

### F1 – Změněné / nové soubory
- `src/routes/adsStudio.js` (nový)
- `src/marketing/adsStudio.js` (nový)
- `server.js` (registrace routeru)
- `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx` (nový)
- `frontend/neo-mind-guide-main/src/App.tsx` (route `/app/ads`)
- `frontend/neo-mind-guide-main/src/components/app/AppSidebar.tsx` (skupina Reklama, AI Ads Studio)
- `PROJECT_STATE.md` (tento záznam)

### F1 – Oprava 404 (připojení routeru + restart)
- **Příčina 404:** Router musí být v `server.js` skutečně připojen: `const { adsStudioRouter } = require("./src/routes/adsStudio.js");` a `app.use("/api", adsStudioRouter);` (bez dalšího prefixu `/api` v routeru – route je už `/ads/draft`). Po změně kódu je nutný restart aplikace.
- **Restart na VPS:** `pm2 restart neobot --update-env`. V logu ověř: `adsStudioRouter mounted: /api/ads/draft` a `Server listening on port 3000`.
- **Test curl (VPS):**
  ```bash
  curl -i -X POST "https://api.neobot.cz/api/ads/draft" \
    -H "Content-Type: application/json" \
    -H "x-api-key: <PLATNY_KLIC>" \
    -d '{"url":"https://example.com"}'
  ```
- **Očekávaný výsledek:** Už **ne 404**. Při úspěchu **200** + JSON `{ "ok": true, "brand": {...}, "ads": {...} }`. Při neplatné URL **400** + `INVALID_URL`. Při nedostupném webu/timeout **502**, při chybě LLM **503**, při jiné chybě **500**.

---

## ⚠️ Pravidla pro další vývoj
- vždy navazovat na existující stav
- řešit vždy **jen jeden task**
- nezačínat další task bez potvrzení
- při návrhu změny vždy říct:
  - proč
  - který soubor
  - co přesně se změní
- kód psát vždy jako **CELÝ SOUBOR k nahrazení**
- žádné mazání dat
- žádné resetování serveru
- žádné změny ENV nebo API klíčů
