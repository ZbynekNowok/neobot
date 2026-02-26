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

- **F1: URL → Ads Draft** (brand summary + reklamní texty) [MVP] ✅ **HOTOVO (prod test OK)**
  - **Technický kontrakt:**
  - Endpoint: `POST /api/ads/draft`
  - Input JSON: `{ "url": "https://..." }`
  - Output JSON: `{ "ok": true, "brand": {...}, "ads": {...} }`  
    Hlavní pole: `brand.name`, `brand.description`, `brand.services[]`, `brand.usp[]`, `brand.tone`, `brand.target_audience`, `ads.meta_primary_texts[]` (5), `ads.meta_headlines[]` (5), `ads.google_headlines[]` (10), `ads.google_descriptions[]` (6)
- **F2: URL → Image Ads** (generování 3–6 kreativ) ✅ **HOTOVO**
  - Endpoint: `POST /api/ads/images`
  - Input: `{ "url": "https://...", "count": 3..6 (default 4), "format": "square"|"story"|"both" (default "square") }`
  - Output: `{ "ok": true, "images": [ { "url": "/outputs/backgrounds/...", "format": "square"|"story", "prompt": "...", "caption": "..." }, ... ] }`
- **F3:** Produktová fotka → Marketing scénáře (4–8 variant)
- **F4:** Image → Video Ad (5–10s video)
- **F5:** Social publish (FB/IG/LinkedIn) – navázat na existující publish modul

**Další krok:** F3 nebo jiný task dle priorit.

---

### F1 – Co bylo implementováno
- **Backend:** Router `src/routes/adsStudio.js` – POST `/api/ads/draft`, validace URL (http/https), chyby 400 / 502 / 503 / 500. Logika v `src/marketing/adsStudio.js`: stahování HTML (undici, timeout 15 s), parsování cheerio (title, meta, h1/h2, odstavce, max ~12k znaků), LLM přes `src/llm/llmGateway.js` → strukturovaný JSON výstup dle kontraktu.
- **Frontend:** Stránka „AI Ads Studio“ na route `/app/ads`, URL input + „Generovat reklamu“, volání `neobotFetch("/api/ads/draft", …)` s x-api-key. Karty: Brand, Meta texty, Meta headlines, Google headlines, Google descriptions; kopírování do schránky.
- **V menu:** Reklama → **AI Ads Studio** (jedna položka pro F1+F2). Route: `/app/ads`. Endpoint: `POST /api/ads/draft`.

### F1 – Kroky testu v UI (po přihlášení)
1. Přihlásit se na web (firemní profil).
2. V levém sidebaru kliknout **Reklama** → **AI Ads Studio** (měla by se otevřít stránka `/app/ads`).
3. Do pole „URL webu“ zadat např. `https://example.com` a kliknout **Generovat reklamu**.
4. Otevřít DevTools → záložka Network; ověřit request `POST …/api/ads/draft` s body `{ "url": "https://example.com" }` a hlavičkou `x-api-key`; při úspěchu status **200** a v odpovědi `brand` a `ads`. Na stránce se zobrazí karty Brand, Meta texty, Meta headlines, Google headlines, Google descriptions.

### F1 – Jak to otestovat (curl / obecně)
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

### F1 – Oprava 500 „fetch failed“ (síťový fetch → 502)
- **Příčina:** Na VPS fetch k externí URL selhával a vracel **500** s `"message":"fetch failed"`. V logu se objevil **error code: `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`** (TLS – Node na VPS nemá dostupný CA store pro ověření SSL certifikátu, např. chybí `ca-certificates` nebo není nastavený).
- **Aplikované změny:**
  - **Diagnostika:** V `src/marketing/adsStudio.js` doplněno detailní logování chyby fetchu: `name`, `code`, `causeCode`, `message`, `causeMessage`, `status` (+ krátký stack). Neloguje se HTML ani citlivá data.
  - **Robustní fetch:** undici s timeoutem 15 s (AbortController), hlavičky `User-Agent: NeoBotAdsStudio/1.0 (+https://neobot.cz)` a `Accept: text/html,application/xhtml+xml`, GET. Omezení velikosti staženého HTML na 2 MB (větší se uřízne).
  - **Ošetření chyb:** Selhání fetchu (síť, DNS, timeout, TLS) → **502** s `error: "FETCH_FAILED"`, `message: "Nepodařilo se stáhnout web (DNS/timeout/SSL)."`. **500** jen u skutečných interních chyb (parsování, LLM, neočekávané).
  - **IPv4:** V `server.js` na začátek přidáno `dns.setDefaultResultOrder("ipv4first")` (prevence IPv6 problémů na VPS).
- **Jak testovat:**
  - Neplatná URL: `curl -i -X POST "http://localhost:3000/api/ads/draft" -H "Content-Type: application/json" -d '{"url":"not-a-url"}'` → **400** + `INVALID_URL`.
  - Platná URL: `curl -i -X POST "http://localhost:3000/api/ads/draft" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` → už **ne 500**; očekávané **502** + `FETCH_FAILED` (pokud VPS nemá CA bundle), nebo **200** + JSON s `brand` a `ads` (pokud je TLS v pořádku).
- **Trvalý fix TLS na VPS (volitelně):** Nainstalovat CA certifikáty např. `sudo apt install ca-certificates` a restartovat proces, nebo nastavit `NODE_EXTRA_CA_CERTS` podle dokumentace Node.

### F1 – Fix TLS (UNABLE_TO_GET_ISSUER_CERT_LOCALLY) – 502 → 200
- **Diagnostika TLS v Node (VPS):**
  ```bash
  node -e "fetch('https://example.com').then(r=>console.log('OK',r.status)).catch(e=>{console.error('ERR', e.cause?.code || e.code, e.cause?.message || e.message)})"
  ```
  **Výsledek před opravou:** `ERR UNABLE_TO_GET_ISSUER_CERT_LOCALLY unable to get local issuer certificate`
- **Příčina:** Node proces na VPS neměl přístup k platnému CA store a nemohl ověřit SSL certifikáty. Soubor `/etc/ssl/certs/ca-certificates.crt` na VPS existoval, ale Node jej ve výchozím nastavení nepoužíval.
- **Provedený fix (bez vypínání TLS):**
  - V **ecosystem.config.js** přidána env proměnná pro PM2 proces: `NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/ca-certificates.crt"`. Tím Node načte systémový CA bundle a ověření HTTPS funguje.
  - **NIKDY** se nepoužívá `NODE_TLS_REJECT_UNAUTHORIZED=0` – TLS ověřování zůstává zapnuté.
- **Systémový fix (volitelně):** Na VPS lze navíc spustit `sudo apt-get update`, `sudo apt-get install -y ca-certificates`, `sudo update-ca-certificates`. V tomto prostředí nebylo možné spustit sudo bez hesla; samotné `NODE_EXTRA_CA_CERTS` stačilo.
- **Restart po změně konfigurace:** `pm2 delete neobot; pm2 start ecosystem.config.js` (nebo `pm2 reload ecosystem.config.js`), aby PM2 načetl nový env.
- **Výsledek testů po opravě:**
  - Node fetch s CA bundle: `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt node -e "fetch('https://example.com')..."` → **OK 200**
  - API endpoint: `curl -i -X POST "http://127.0.0.1:3000/api/ads/draft" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'` → **200** + JSON `{ "ok": true, "brand": {...}, "ads": {...} }`
- **Změněné soubory/konfigurace:** `ecosystem.config.js` (přidán `NODE_EXTRA_CA_CERTS` do `env`).

### F1 – Produkční test (api.neobot.cz)
- **Test:** `curl -i -X POST "https://api.neobot.cz/api/ads/draft" -H "Content-Type: application/json" -H "x-api-key: <PLATNY_KLIC>" -d '{"url":"https://example.com"}'`
- **Výsledek:** **200 OK** – endpoint vrací `{ "ok": true, "brand": {...}, "ads": {...} }`. F1 je na produkci funkční.
- **Redirecty při fetchi:** V `src/marketing/adsStudio.js` je u undici fetch nastaveno `redirect: "follow"` – standardně se následují redirecty (včetně http→https). Undici tím pádem redirecty už řeší, není potřeba doplňovat další limit.

### F2 – Co bylo implementováno
- **Backend:** V `src/routes/adsStudio.js` přidán **POST /api/ads/images**. Validace: `url` (povinná, http/https), `count` 3–6 (default 4), `format` square|story|both (default square). Logika v `src/marketing/adsStudio.js`: `getBrandContextFromUrl(url)` (fetch HTML + LLM brand-only), `generateImagesFromUrl(url, { count, format })` – LLM generuje N image promptů + captionů, pro každý obrázek volá `imageProviders/replicate.js` → `generateBackground()` (1 retry), ukládá do `public/outputs/backgrounds/`. Sync MVP (bez job queue), timeout cca 125 s na obrázek, celkový limit 6 min. Chyby: 400 INVALID_URL, 502 FETCH_FAILED, 503 IMAGE_PROVIDER_FAILED / LLM_UNAVAILABLE, 500 INTERNAL_ERROR.
- **Frontend:** V `AdsStudioPage.tsx` přidána sekce „Obrázkové reklamy“: výběr počet (3–6), formát (Čtverec / Story / Obojí), tlačítko „Vygenerovat obrázky“, volání `neobotFetch("/api/ads/images", { method: "POST", body: JSON.stringify({ url, count, format }) })`. Grid výsledků: náhled obrázku (URL = NEOBOT_API_BASE + url), „Kopírovat caption“, „Stáhnout“. Stavy: idle / loading / error / success.

- **V menu:** Stejná stránka jako F1 – **Reklama → AI Ads Studio** (`/app/ads`). Endpoint: `POST /api/ads/images`.

### F2 – Kroky testu v UI (po přihlášení)
1. Přihlásit se na web (firemní profil).
2. V levém sidebaru kliknout **Reklama** → **AI Ads Studio** (stránka `/app/ads`).
3. Do pole „URL webu“ zadat platnou URL (např. `https://example.com`).
4. V sekci „Obrázkové reklamy (3–6)“ zvolit **Počet** (3–6) a **Formát**, kliknout **Vygenerovat obrázky**.
5. V DevTools → Network ověřit `POST …/api/ads/images`; po dokončení status **200** a pole `images[]`. Na stránce mřížka s náhledy, „Kopírovat caption“, „Stáhnout“.

### F2 – Jak otestovat (curl)
- **curl (produkce):**
  ```bash
  curl -i -X POST "https://api.neobot.cz/api/ads/images" \
    -H "Content-Type: application/json" \
    -H "x-api-key: <PLATNY_KLIC>" \
    -d '{"url":"https://example.com","count":4,"format":"square"}'
  ```
- **Očekávaný výstup:** Status **200**, JSON s `ok: true` a polem `images[]`. Každá položka: `url` (relativní cesta, např. `/outputs/backgrounds/ads-...png`), `format`, `prompt`, `caption`.
- **Network (DevTools):** POST na `/api/ads/images` s body `{ url, count, format }`, hlavička `x-api-key`. Úspěch → 200 a pole `images` s URL. Generování může trvat desítky sekund až několik minut (podle počtu obrázků).

### F2 – Změněné soubory
- `src/marketing/adsStudio.js` (getBrandContextFromUrl, generateImagesFromUrl; import replicate + buildNegativePrompt)
- `src/routes/adsStudio.js` (POST /ads/images, error handling)
- `server.js` (log: ads/draft, ads/images)
- `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx` (sekce Obrázkové reklamy, stav, grid, NEOBOT_API_BASE pro URL obrázků)
- `PROJECT_STATE.md` (F2 záznam)

### F2 – Fix produkčního 404 (nasazení)
- **Problém:** Na VPS vracel `POST https://api.neobot.cz/api/ads/images` **404** „Cannot POST /api/ads/images“, zatímco F1 (`/api/ads/draft`) fungoval (200).
- **Diagnostika:** Route `"/ads/images"` byla v kódu přítomná (`src/routes/adsStudio.js`, ř. 63: `adsStudioRouter.post("/ads/images", ...)`). PM2 proces běžel z **cwd: /home/vpsuser/neobot**, ale byl spuštěn dříve než nasazení F2 – v paměti měl starou verzi bez `/ads/images`.
- **Oprava:** Tvrdý restart: `pm2 delete neobot; pm2 start ecosystem.config.js`. Po startu v logu: `adsStudioRouter mounted: /api/ads/draft, /api/ads/images`.
- **Ověření curl (produkce):**
  ```bash
  curl -i -X POST "https://api.neobot.cz/api/ads/images" \
    -H "Content-Type: application/json" \
    -H "x-api-key: <PLATNY_KLIC>" \
    -d '{"url":"https://example.com","count":3,"format":"square"}'
  ```
  **Výsledek po opravě:** Už **ne 404**. Endpoint odpovídá – **503** s `error: "IMAGE_PROVIDER_FAILED"` (Replicate rate limit / kredit), což potvrzuje, že route existuje a request došel do handleru. Pro 200 je potřeba platný REPLICATE_API_TOKEN a dostatečný kredit/rate limit u Replicate.
- **Poučení:** Po nasazení nových route vždy restartovat proces (`pm2 restart neobot --update-env` nebo `pm2 delete neobot; pm2 start ecosystem.config.js`), aby Node načetl aktuální soubory.

### F2 – Replicate rate limit (429)
- **Co to znamená:** Replicate API vrací **429 Too Many Requests**, když je překročen rate limit (např. nízký kredit, omezení požadavků za minutu). Dříve jsme to vraceli jako **503 IMAGE_PROVIDER_FAILED**, což bylo matoucí pro UX.
- **Jak se to nyní chová:**
  - **Detekce:** V `imageProviders/replicate.js` při chybě obsahující „429“ nebo „Too Many Requests“ vyhodíme chybu s `code: "RATE_LIMITED"` a `retryAfterSeconds` (z parsování `retry_after` z těla odpovědi Replicate, jinak default 30 s).
  - **Backend response:** Route `POST /api/ads/images` vrací **HTTP 429** a JSON: `{ ok: false, error: "RATE_LIMITED", provider: "replicate", message: "Replicate rate limit. Zkuste později.", retryAfterSeconds: <number> }`.
  - **Retry strategie:** Na 429 se neprovádí okamžitý retry; chyba se propaguje jako 429. Pro ostatní chyby generování: exponenciální backoff (5 s, 15 s), max 2 retry. Mezi generováním jednotlivých obrázků je delay 2 s, aby se zbytečně netrefoval limit.
  - **Frontend:** Při 429 / `RATE_LIMITED` se zobrazí hláška „Replicate rate limit. Zkuste později.“, doporučený čas před opakováním (`retryAfterSeconds`) a tlačítko **Zkusit znovu**.
- **Jak testovat:** Při reálném 429 od Replicate uvidíte v Network odpověď **429** a v těle `error: "RATE_LIMITED"`, `retryAfterSeconds`. Na stránce AI Ads Studio (Obrázkové reklamy) se zobrazí chybová karta s doporučeným časem a tlačítkem „Zkusit znovu“. Simulace: při dosažení Replicate rate limitu (např. několik požadavků za sebou) dostanete 429 a uvedené chování.

---

## 📌 Pravidlo: viditelnost v menu po přihlášení (firemní profil)

**Od teď platí:** Cokoliv nového (endpointy, moduly, stránky) **MUSÍ** být vždy viditelné a použitelné na webu v menu po přihlášení na firemním profilu.

1. **Každá nová funkce musí mít:**
   - **backend endpoint (API)**
   - **frontend stránku / UI** (ne jen backend)
   - **položku v menu (AppSidebar)** v části `/app` (po přihlášení)
   - **rotu v App.tsx** (nebo kde se registrují route pro `/app`)

2. **Žádné „hotovo“ nebereme jako hotovo, dokud:**
   - není dostupná stránka v `/app` (po loginu),
   - není v menu,
   - a jde otestovat kliknutím + Network requestem.

3. **Když přidáš novou funkci:**
   - aktualizuj **PROJECT_STATE.md**: kde je v menu, jaká je URL route, jaký endpoint volá, jak testovat,
   - napiš **přesné kroky testu v UI** (po přihlášení).

**AI Ads Studio (F1, F2, F3, …)** i všechny další funkce implementujeme vždy tímto způsobem: backend + UI + menu po přihlášení.

---

### Kde je co v /app (menu, route, endpoint, test v UI)

| Funkce | Menu (sidebar) | URL route | Endpoint(y) | Kroky testu v UI (po přihlášení) |
|--------|----------------|-----------|-------------|-----------------------------------|
| **AI Ads Studio** (F1 + F2) | Reklama → **AI Ads Studio** | `/app/ads` | `POST /api/ads/draft`, `POST /api/ads/images` | 1. Přihlásit se na neobot.cz (firemní profil). 2. V levém menu kliknout **Reklama** → **AI Ads Studio**. 3. Ověřit, že se zobrazí stránka s polem „URL webu“ a sekcí „Obrázkové reklamy“. 4. **F1:** Zadat URL (např. `https://example.com`), kliknout **Generovat reklamu** → v Network uvidět `POST …/api/ads/draft`, 200 a JSON s `brand` a `ads`. 5. **F2:** Stejnou URL, zvolit počet (3–6) a formát, kliknout **Vygenerovat obrázky** → v Network uvidět `POST …/api/ads/images`, po dokončení 200 a pole `images[]`. |

- **Soubor menu:** `frontend/neo-mind-guide-main/src/components/app/AppSidebar.tsx` (skupina `adsMenuItems`, položka „AI Ads Studio“, odkaz `/app/ads`).
- **Soubor rout:** `frontend/neo-mind-guide-main/src/App.tsx` (v `<Route path="/app">` dítě `<Route path="ads" element={<AdsStudioPage />} />`).

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
- **nové funkce:** vždy backend + stránka v `/app` + položka v menu + route v App.tsx; dokumentovat v PROJECT_STATE.md (kde v menu, route, endpoint, kroky testu v UI)
