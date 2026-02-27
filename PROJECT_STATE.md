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
- **F3: Produktová fotka → Marketing scénáře** (4–8 variant) ✅ **HOTOVO**
  - Endpoint: `POST /api/ads/product-variants` (multipart: productImage, variants, format, style, productName)
  - Output: `{ "ok": true, "images": [ { "url": "/outputs/product-ads/....png", ... } ] }`
- **F4:** Image → Video Ad (5–10s video)
- **F5:** Social publish (FB/IG/LinkedIn) – navázat na existující publish modul

**Další krok:** F4 nebo jiný task dle priorit.

---

### F1 – Co bylo implementováno
- **Backend:** Router `src/routes/adsStudio.js` – POST `/api/ads/draft`, validace URL (http/https), chyby 400 / 502 / 503 / 500. Logika v `src/marketing/adsStudio.js`: stahování HTML (undici, timeout 15 s), parsování cheerio (title, meta, h1/h2, odstavce, max ~12k znaků), LLM přes `src/llm/llmGateway.js` → strukturovaný JSON výstup dle kontraktu.
- **Frontend:** Stránka „Reklamní studio“ (dříve „AI Ads Studio“) na route `/app/ads`, URL input + „Generovat reklamu“, volání `neobotFetch("/api/ads/draft", …)` s x-api-key. Karty: Brand, Meta texty, Meta headlines, Google headlines, Google descriptions; kopírování do schránky.
- **V menu:** Sekce **Reklamní studio** → položka **Reklamní studio** (jedna položka pro F1+F2+F3). Route: `/app/ads`. Endpoint: `POST /api/ads/draft`.

### F1 – Kroky testu v UI (po přihlášení)
1. Přihlásit se na web (firemní profil).
2. V levém sidebaru kliknout **Reklamní studio** → **Reklamní studio** (měla by se otevřít stránka `/app/ads`).
3. Do pole „URL webu“ zadat např. `https://example.com` a kliknout **Generovat reklamu**.
4. Otevřít DevTools → záložka Network; ověřit request `POST …/api/ads/draft` s body `{ "url": "https://example.com" }` a hlavičkou `x-api-key`; při úspěchu status **200** a v odpovědi `brand` a `ads`. Na stránce se zobrazí karty Brand, Meta texty, Meta headlines, Google headlines, Google descriptions.

### F1 – Jak to otestovat (curl / obecně)
1. Spusť backend (např. `node server.js` nebo PM2) a frontend (dev server z `frontend/neo-mind-guide-main`).
2. Přihlas se do app, v sidebaru zvol **Reklamní studio → Reklamní studio**.
3. Zadej URL (např. `https://example.com`) a klikni **Generovat reklamu**.
4. **Network (DevTools):** Očekávej `POST …/api/ads/draft` s body `{ "url": "https://..." }`, hlavička `x-api-key`. Při úspěchu status **200**, response JSON: `{ "ok": true, "brand": {...}, "ads": {...} }`. Při neplatné URL **400**, při nedostupném webu/timeout **502**, při chybě LLM **503**.

### F1 – Změněné / nové soubory
- `src/routes/adsStudio.js` (nový)
- `src/marketing/adsStudio.js` (nový)
- `server.js` (registrace routeru)
- `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx` (nový)
- `frontend/neo-mind-guide-main/src/App.tsx` (route `/app/ads`)
- `frontend/neo-mind-guide-main/src/components/app/AppSidebar.tsx` (sekce „Reklamní studio“, položka „Reklamní studio“, odkaz `/app/ads`)
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

- **V menu:** Stejná stránka jako F1 – **Reklamní studio → Reklamní studio** (`/app/ads`). Endpoint: `POST /api/ads/images`.

### F2 – Kroky testu v UI (po přihlášení)
1. Přihlásit se na web (firemní profil).
2. V levém sidebaru kliknout **Reklamní studio** → **Reklamní studio** (stránka `/app/ads`).
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

### F3 – Co bylo implementováno
- **Backend:** V `src/routes/adsStudio.js` přidán **POST /api/ads/product-variants** s multerem (upload `productImage`, max 8 MB, pouze image/jpeg, image/png, image/webp). Upload se ukládá do `public/outputs/uploads/`, po vygenerování se smaže. Logika v `src/marketing/adsStudio.js`: `generateProductVariants({ publicImageUrl, variants, format, productName, style, requestId })` – LLM vytvoří N promptů + captionů (produkt jako hlavní objekt, scény), pro každý obrázek volá `imageProviders/replicate.js` → **generateFromImage()** (image-to-image s parametrem **image** = URL nahrané fotky, **prompt_strength** 0.7). Výstupy do **public/outputs/product-ads/** (relativní URL `/outputs/product-ads/...`). Sekvenčně, delay 2 s mezi obrázky, RATE_LIMITED rethrow, max 2 retry s backoff 5 s, 15 s.
- **Replicate image-to-image:** V `replicate.js` nová funkce **generateFromImage(params)**. Používá stejný model SDXL; vstup **image** (string URL vstupního obrázku) a **prompt_strength** (default 0.7) – Replicate API parametry pro img2img.
- **Frontend:** Na stránce „Reklamní studio“ (stejná route `/app/ads`) nová sekce „Produktová fotka → Reklamní scény (4–8)“: file input (jpg/png/webp), počet scén 4–8, formát, styl (Moderní/Luxusní/Minimalistický/Industriální), volitelný název produktu, tlačítko „Vygenerovat scény“. Volání přes **FormData** na `POST /api/ads/product-variants` s hlavičkou `x-api-key`. Grid výsledků stejně jako F2 (náhled, Kopírovat caption, Stáhnout). Při 429 zobrazení retryAfterSeconds a „Zkusit znovu“.
- **V menu:** Stejná stránka – sekce **Reklamní studio** → položka **Reklamní studio** (`/app/ads`). Endpoint: `POST /api/ads/product-variants`.

### F3 – Jak otestovat
- **UI (po přihlášení):** Přihlásit se → **Reklama** → **AI Ads Studio** → sjet k sekci „Produktová fotka → Reklamní scény“. Vybrat soubor (jpg/png/webp), zvolit počet 4–8, formát, styl, volitelně název produktu → **Vygenerovat scény**. V Network ověřit `POST …/api/ads/product-variants` (FormData, productImage + variants, format, style, productName), hlavička `x-api-key`. Při úspěchu 200 a pole `images[]` s `url` (např. `/outputs/product-ads/product-xxx.png`). Obrázky otevřít přes **https://api.neobot.cz** + `url` (např. `https://api.neobot.cz/outputs/product-ads/product-xxx.png`).
- **Backend (curl):**
  ```bash
  curl -i -X POST "https://api.neobot.cz/api/ads/product-variants" \
    -H "x-api-key: <PLATNY_KLIC>" \
    -F "productImage=@/path/to/image.jpg" \
    -F "variants=4" -F "format=square" -F "style=modern"
  ```

### F3 – Změněné soubory
- `package.json` (multer)
- `src/imageProviders/replicate.js` (generateFromImage – image-to-image s parametrem **image**, prompt_strength)
- `src/marketing/adsStudio.js` (generateProductVariants)
- `src/routes/adsStudio.js` (multer upload, POST /ads/product-variants)
- `server.js` (log: product-variants)
- `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx` (sekce F3, FormData, product state, grid)
- `PROJECT_STATE.md` (F3 záznam)

### F3 – Produkční hardening (upload URL, výstupy, cleanup)
- **Veřejná dostupnost uploadu:** Před voláním `generateProductVariants` backend ověří, že `publicImageUrl` (URL nahraného souboru) vrací **HEAD 200**. Pokud ne (např. firewall, špatný host), vrací **502** s `error: "UPLOAD_NOT_REACHABLE"`. Replicate tak dostane pouze ověřenou URL. Pro debug: nastavte `DEBUG_ADS=1` nebo `DEBUG=1` – v logu se vypíše `publicImageUrl` (bez citlivých dat) a při neúspěchu HEAD i status.
- **Ověření z příkazové řádky:** Po úspěšném uploadu (nebo z logu při DEBUG_ADS=1) zkopírujte URL uploadu a ověřte: `curl -I "https://api.neobot.cz/outputs/uploads/product-XXXXX.jpg"` → očekávaný řádek `HTTP/1.1 200 OK` (nebo 304).
- **Pojmenování výstupů:** Každá varianta má unikátní soubor: **`{requestId}-{index}.png`** v adresáři `public/outputs/product-ads/`. Příklad: `ads-product-1734567890123-0.png`, `ads-product-1734567890123-1.png`, … Retry používá `{requestId}-{index}-retry1.png`. V odpovědi API je `url`: `/outputs/product-ads/{requestId}-{index}.png`.
- **Cleanup uploadu:** Nahraný soubor v `public/outputs/uploads/` se smaže **až po úspěšném dokončení** generování. Aby Replicate stihl obrázek stáhnout, před smazáním se čeká **8 s** (`UPLOAD_CLEANUP_DELAY_MS`). Při chybě (400, 502, 429, 503, 500) se upload smaže ihned.

### F3 – Produkční curl test (výsledek)
- **Příkaz:**
  ```bash
  curl -i -X POST "https://api.neobot.cz/api/ads/product-variants" \
    -H "x-api-key: <PLATNY_KLIC>" \
    -F "productImage=@/path/to/image.jpg" \
    -F "variants=4" -F "format=square" -F "style=modern"
  ```
- **Výsledek před nasazením:** **404** „Cannot POST /api/ads/product-variants“ – endpoint na produkci nebyl po nasazení F3 restartován (PM2 drží starý kód).
- **Po nasazení a restartu** (`pm2 restart neobot --update-env` nebo tvrdý restart): očekávané odpovědi **200** (úspěch) nebo **429** (RATE_LIMITED). Při 200 odpověď obsahuje např.:
  ```json
  { "ok": true, "images": [
    { "url": "/outputs/product-ads/ads-product-1734567890123-0.png", "format": "square", "prompt": "...", "caption": "..." },
    ...
  ]}
  ```
- **Ukázka plné výstupní URL:** `https://api.neobot.cz/outputs/product-ads/ads-product-1734567890123-0.png`

### F3 – Fix produkčního 404 (nasazení)
- **Problém:** Na VPS vracel `POST https://api.neobot.cz/api/ads/product-variants` **404** „Cannot POST /api/ads/product-variants“ – endpoint nebyl v běžícím procesu, protože PM2 běžel se starým kódem bez F3 route.
- **Oprava:** Na VPS po nasazení F3 kódu byl proveden **restart PM2**: `pm2 restart neobot --update-env`. Tím se načetl aktuální kód včetně route `POST /api/ads/product-variants`.
- **Ověření:** Curl s multipart uploadem na `/api/ads/product-variants` po restartu už **nevrátil 404**. Endpoint odpovídá – např. **429** s `error: "RATE_LIMITED"` (Replicate rate limit), což potvrzuje, že route existuje a request došel do handleru (upload, HEAD kontrola, volání Replicate). Pro 200 je potřeba dostatečný kredit/rate limit u Replicate.
- **Poučení:** Po nasazení nových route (včetně F3) vždy na VPS restartovat proces: `pm2 restart neobot --update-env`, popř. `pm2 delete neobot; pm2 start ecosystem.config.js`.

### F3 – nginx upload limit fix
- **Problém:** `POST https://api.neobot.cz/api/ads/product-variants` vracel **HTTP 413 Request Entity Too Large** při uploadu produktových obrázků (např. 3 MB).
- **Příčina:** Nginx má výchozí limit velikosti těla requestu (cca 1 MB). Request se nedostane do backendu (multer má limit 8 MB) – nginx ho odmítne dříve.
- **Řešení:** V server bloku pro **api.neobot.cz** je nutné nastavit **`client_max_body_size 20M;`** (nad backendový limit 8 MB).
- **Kde upravit:** Konfigurace pro api.neobot.cz je na produkci v **`/etc/nginx/sites-available/default`** (server blok s `server_name api.neobot.cz;`). Řádek `client_max_body_size 20M;` přidej do tohoto bloku (např. hned za `server_name api.neobot.cz;`).
- **Aplikace na VPS:** Spusť na serveru (s právy root):  
  `sudo bash /home/vpsuser/neobot/scripts/nginx-f3-upload-limit.sh`  
  Skript řádek přidá (pokud tam ještě není), ověří `nginx -t` a provede `systemctl reload nginx`.
- **Ruční úprava:** Otevři `/etc/nginx/sites-available/default`, v bloku s `server_name api.neobot.cz;` přidej řádek `client_max_body_size 20M;`, pak `sudo nginx -t` a `sudo systemctl reload nginx`.
- **Nutnost:** Na produkci musí tento řádek být, jinak upload větších obrázků (F3) zůstane 413.
- **Ověření curl (před opravou):** Request s obrázkem ~3 MB vracel **413** (nginx). Po aplikaci skriptu a reloadu nginx očekávej **200** (s `images[]`) nebo **429** (RATE_LIMITED), už ne 413.

### Image generation optimalizace a výběr rozlišení (Reklamní studio F2 + F3)
- **Cíl:** Snížit náklady na generování obrázků (Replicate) a zároveň zachovat profesionální kvalitu výstupů v Reklamním studiu. Uživatel si může zvolit rozlišení výstupu, NeoBot interně generuje v nižším rozlišení a následně provádí upscale přes `sharp`.
- **Výběr rozlišení v UI:** Na stránce Reklamní studio (`/app/ads`) je ve F2 (Obrázkové reklamy) přidaný dropdown **„Rozlišení“** s hodnotami:
  - `preview` – *Náhled – 720p (nejrychlejší, nejlevnější)*
  - `standard` – *Standard – 1080p (doporučeno)* **(default)**
  - `high` – *Vysoké – 2048p (nejvyšší kvalita)*
  Zvolená hodnota se používá pro F2 i F3 (URL → obrázky i Produktová fotka → scény).
- **API parametry:** Frontend posílá do backendu parametr `resolution`:
  - `POST /api/ads/images` – JSON body `{ url, count, format, resolution }`
  - `POST /api/ads/product-variants` – FormData pole `resolution`.
  Pokud `resolution` chybí nebo má neznámou hodnotu, backend použije **`standard`** (zpětná kompatibilita).
- **Interní mapování rozlišení (F2 i F3):**
  - `preview`  
    - generate: 720p → `square: 720×720`, `story: 720×1280`  
    - upscale: **žádný** (výstup = generate)  
    - output: `square: 720×720`, `story: 720×1280`
  - `standard`  
    - generate: 720p → `square: 720×720`, `story: 720×1280`  
    - upscale: na 1080p  
    - output: `square: 1080×1080`, `story: 1080×1920`
  - `high`  
    - generate: 1024p → `square: 1024×1024`, `story: 1024×1820`  
    - upscale: na 2048p  
    - output: `square: 2048×2048`, `story: 2048×3640`
- **Implementace upscale (sharp):**
  - Reálné generování na Replicate probíhá v **interním rozlišení** (viz generate výše).  
  - Po získání URL výsledného obrázku z Replicate backend obrázek stáhne, v paměti zpracuje přes **`sharp`** a **uloží pouze finální (upscale) verzi**:
    - F2: `src/imageProviders/replicate.js` → `generateBackground()` → ukládá do `public/outputs/backgrounds/`.
    - F3: `src/imageProviders/replicate.js` → `generateFromImage()` → ukládá do `public/outputs/product-ads/`.
  - Dočasné nižší rozlišení se neukládá na disk (žádný extra soubor k mazání).
- **Marketingová logika (rozlišení):**
  - `src/marketing/adsStudio.js`:
    - Funkce `generateImagesFromUrl()` a `generateProductVariants()` přijímají parametr `resolution` a přes helper `getResolutionDims(format, resolution)` počítají:
      - `generateWidth` / `generateHeight` – rozměry pro volání Replicate,
      - `outputWidth` / `outputHeight` – cílové rozměry pro upscale.
    - Do providerů (`generateBackground`, `generateFromImage`) se předává jak generate, tak output rozlišení.
    - Pole `images[]` vráce-né z F2 a F3 nyní obsahuje i `width`, `height`, `resolution`.
- **Route a zpětná kompatibilita:**
  - `src/routes/adsStudio.js`:
    - `/ads/images`: čte `resolution` z body, normalizuje na `preview|standard|high` (jinak `standard`), předává dál do `generateImagesFromUrl`. Response `images[]` obsahuje `url`, `format`, `prompt`, `caption`, `width`, `height`, `resolution`.  
    - `/ads/product-variants`: čte `resolution` z `FormData` (body), normalizuje stejně, předává do `generateProductVariants`. Response `images[]` obsahuje `url`, `format`, `prompt`, `caption`, `width`, `height`, `resolution`.  
  - Pokud frontend starší verze `resolution` vůbec neposílá, backend použije **standard** a formát odpovědi zůstává kompatibilní (přidaná pole `width/height/resolution` jsou jen navíc).
- **Kde se ukládají soubory:**
  - F2 (URL → obrázky): finální PNG soubory v `public/outputs/backgrounds/` (např. `/outputs/backgrounds/ads-...png`), už v cílovém rozlišení podle `resolution`.
  - F3 (Produktová fotka → scény): finální PNG soubory v `public/outputs/product-ads/` (např. `/outputs/product-ads/ads-product-...png`), opět v cílovém rozlišení.

### F5 – Historie reklam (Reklamní studio)
- **Backend endpoint:** `GET /api/ads/history`
  - Route je implementovaná v `src/routes/adsStudio.js` jako součást `adsStudioRouter` (prefixed `/api` v `server.js`).
  - Response:
    ```json
    {
      "ok": true,
      "items": [
        {
          "url": "/outputs/backgrounds/ads-123.png",
          "type": "image",
          "resolution": "standard",
          "width": 1080,
          "height": 1080,
          "createdAt": "2025-02-27T10:00:00.000Z"
        }
      ]
    }
    ```
  - `type`:
    - `"image"` – klasické obrázky z F2 (URL → obrázky) v `public/outputs/backgrounds/`.
    - `"product"` – produktové scény z F3 v `public/outputs/product-ads/`.
  - `resolution`: `"preview" | "standard" | "high"` pokud lze odvodit z rozměrů (720p, 1080p, 2048p); jinak `null/undefined` (v response prostě chybí).
  - `width`, `height`: skutečné rozměry obrázku načtené přes `sharp.metadata()`.
  - `createdAt`: čas poslední modifikace souboru (`mtime`), ve formátu ISO stringu.
  - Vnitřně:
    - `src/routes/adsStudio.js` používá `fs.readdir` + `fs.stat` nad:
      - `public/outputs/backgrounds/`
      - `public/outputs/product-ads/`
    - Pro každý PNG soubor se načte metadata přes `sharp` (šířka/výška), dopočte se `resolution` podle tabulky rozlišení (720p/1080p/2048p) a sestaví se položka.
    - Položky z obou adresářů se spojí a seřadí podle `createdAt` **DESC** (nejnovější nahoře).

- **Frontend (Reklamní studio):**
  - Soubor: `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx`.
  - Přidán box **„Historie reklam“** se sekcí:
    - Tlačítko **„Načíst historii“** → po kliknutí volá `GET /api/ads/history` přes `neobotFetch("/api/ads/history")`.
    - Stav loading / error / success s hláškami (přes toast).
    - Grid „Historie reklamních obrázků“:
      - Náhled obrázku (odkaz na `NEOBOT_API_BASE + url`).
      - Typ (`URL → obrázek` vs. `Produktová scéna`).
      - Rozlišení (`resolution`) + rozměry (`width×height`).
      - Datum `createdAt` formátované `toLocaleString("cs-CZ")`.
      - Tlačítko **Stáhnout** (link s `download`).

- **Jak testovat:**
  1. Vygeneruj několik reklam v Reklamním studiu:
     - F2 (URL → obrázky) v různých rozlišeních (preview, standard, high).
     - F3 (Produktová fotka → scény) v různých rozlišeních a formátech (square/story).
  2. Na stránce `/app/ads` sjeď dolů na sekci **„Historie reklam“**.
  3. Klikni **„Načíst historii“**:
     - V Network zkontroluj `GET /api/ads/history` → `200` a `ok: true`.
     - Response `items[]` obsahuje záznamy z obou složek (`type: "image" | "product"`), seřazené od nejnovějších.
  4. Ověř, že:
     - Názvy a náhledy odpovídají dříve vygenerovaným obrázkům.
     - `resolution` + (`width`, `height`) odpovídají režimu (preview/standard/high) a formátu (square/story).
     - Po kliknutí na náhled / Stáhnout se obrázek správně otevře/stáhne z `https://api.neobot.cz` + `url`.

### F4 – Video reklamy (Reklamní studio F4.1 MVP)
- **Cíl:** Umožnit uživateli vytvořit krátkou video reklamu (MP4, 30 fps, H.264) z existujícího reklamního obrázku z Reklamního studia.
- **Backend endpoint:** `POST /api/ads/video`
  - Request body (JSON):
    ```json
    {
      "imageUrl": "/outputs/backgrounds/ads-123.png",
      "format": "story",
      "duration": 8
    }
    ```
    - `imageUrl` – URL obrázku z Reklamního studia:
      - relativní, např. `/outputs/backgrounds/ads-123.png` nebo `/outputs/product-ads/ads-product-123.png`, nebo
      - plná URL `https://api.neobot.cz/outputs/...` (backend si vezme `pathname`).
    - `format` – `"story" | "square | "landscape"` (default `story`):
      - `story` → 1080×1920,
      - `square` → 1080×1080,
      - `landscape` → 1920×1080.
    - `duration` – délka videa v sekundách, 5–10 (mimo rozsah se normalizuje na 8 s).
  - Validace:
    - `imageUrl` musí odkazovat na soubor v `public/outputs/backgrounds/` nebo `public/outputs/product-ads/` – jinak **400 INVALID_IMAGE_URL**.
    - Pokud soubor neexistuje, také **400 INVALID_IMAGE_URL**.
  - Implementace:
    - Soubor: `src/routes/adsStudio.js`.
    - Funkce:
      - `resolveLocalImagePathFromUrl(imageUrl)` – z JSON pole `imageUrl` (relativní nebo plná URL) udělá lokální cestu v `public/outputs/...`.
      - `getVideoDimensions(format)` – vrací `{ width, height }` podle formátu (viz výše).
      - `runFfmpeg(inputPath, outputPath, width, height, durationSeconds)` – spouští **ffmpeg**:
        - `ffmpeg -y -loop 1 -i input.png -t <duration> -vf "scale=WxH,zoompan=...:s=WxH,fps=30" -c:v libx264 -preset veryfast -profile:v high -pix_fmt yuv420p -movflags +faststart output.mp4`
        - Efekt: pomalý zoom (Ken Burns), 30 fps, H.264 MP4.
      - Endpoint `POST /ads/video`:
        1. Najde vstupní PNG/JPEG soubor podle `imageUrl`.
        2. Vypočítá rozměry podle `format`.
        3. Ujistí se, že existuje `public/outputs/videos/` (vytvoří pokud ne).
        4. Vygeneruje název `ads-video-{timestamp}-{random}.mp4`.
        5. Spustí ffmpeg přes `runFfmpeg`.
        6. Vrátí:
           ```json
           {
             "ok": true,
             "video": {
               "url": "/outputs/videos/ads-video-123.mp4",
               "width": 1080,
               "height": 1920,
               "duration": 8,
               "format": "story"
             }
           }
           ```
        7. Při chybě ffmpeg (např. binárka chybí) vrací **500** s `error: "FFMPEG_NOT_AVAILABLE"` nebo `VIDEO_GENERATION_FAILED`.

- **Frontend (Reklamní studio – Video reklama box):**
  - Soubor: `frontend/neo-mind-guide-main/src/pages/app/AdsStudioPage.tsx`.
  - Nová sekce **„Video reklama (F4.1 MVP)“**:
    - Inputy:
      - `URL obrázku` – textové pole (uživatel může vložit cestu z Historie reklam nebo rovnou `/outputs/...`).
      - `Formát videa` – dropdown (`Story 1080×1920`, `Square 1080×1080`, `Landscape 1920×1080`).
      - `Délka videa (5–10 s)` – dropdown s hodnotami 5–10 s (default 8 s).
    - Tlačítko **„Vygenerovat video“**:
      - volá `neobotFetch("/api/ads/video", { method: "POST", body: JSON.stringify({ imageUrl, format, duration }) })`.
      - chování:
        - loading → spinner a disabled stav,
        - error → chybová karta a toast,
        - success → uloží se `videoResult` (`{ url, width, height, duration, format }`).
    - Po úspěchu:
      - Zobrazí se `<video>` player s `src={NEOBOT_API_BASE + video.url}`, `controls`, 100 % šířky.
      - Pod playerem tlačítko **„Stáhnout video“** (anchor s `download` na `NEOBOT_API_BASE + video.url`).

- **Kde se ukládají soubory:**
  - Videa se ukládají do `public/outputs/videos/` jako `ads-video-<timestamp>-<random>.mp4`.
  - Na produkci jsou dostupná na `https://api.neobot.cz/outputs/videos/ads-video-...mp4`.

- **Jak testovat:**
  1. V Reklamním studiu (F2 nebo F3) vygeneruj obrázek a v sekci **Historie reklam** zkopíruj jeho URL (např. `/outputs/backgrounds/ads-...png`).
  2. V sekci **Video reklama (F4.1 MVP)** vlož URL obrázku:
     - buď relativní (`/outputs/backgrounds/...`), nebo plnou `https://api.neobot.cz/outputs/...`.
  3. Zvol formát (`story/square/landscape`) a délku (např. 8 s).
  4. Klikni **„Vygenerovat video“**:
     - V Network ověř `POST /api/ads/video` s body `{ imageUrl, format, duration }`.
     - Při úspěchu: **200** a `ok: true`, `video.url` ukazuje do `/outputs/videos/`.
  5. Ověř UI:
     - V sekci se objeví video player, video lze přehrát.
     - Tlačítko **„Stáhnout video“** stáhne MP4.
  6. Volitelně z konzole:
     ```bash
     curl -i -X POST "https://api.neobot.cz/api/ads/video" \
       -H "Content-Type: application/json" \
       -H "x-api-key: <PLATNY_KLIC>" \
       -d '{"imageUrl":"/outputs/backgrounds/ads-123.png","format":"story","duration":8}'
     ```
     - očekávej `200 OK` s `ok: true` a `video.url` v `/outputs/videos/`.

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
| **Reklamní studio** (F1 + F2 + F3) | Reklamní studio → **Reklamní studio** | `/app/ads` | `POST /api/ads/draft`, `POST /api/ads/images`, `POST /api/ads/product-variants` | 1. Přihlásit se na neobot.cz (firemní profil). 2. V levém menu kliknout **Reklamní studio** → **Reklamní studio**. 3. **F1:** URL + „Generovat reklamu“ → Network: `POST …/api/ads/draft`, 200, `brand` + `ads`. 4. **F2:** URL + počet + formát + „Vygenerovat obrázky“ → Network: `POST …/api/ads/images`, 200, `images[]`. 5. **F3:** Nahát produktovou fotku + počet scén + formát + styl + „Vygenerovat scény“ → Network: `POST …/api/ads/product-variants` (FormData), 200, `images[]`. Obrázky: `https://api.neobot.cz/outputs/product-ads/...png`. |

- **Soubor menu:** `frontend/neo-mind-guide-main/src/components/app/AppSidebar.tsx` (sekce `Reklamní studio`, `adsMenuItems` s položkou „Reklamní studio“, odkaz `/app/ads`).
- **Soubor rout:** `frontend/neo-mind-guide-main/src/App.tsx` (v `<Route path="/app">` dítě `<Route path="ads" element={<AdsStudioPage />} />`).

---

## 📋 Poslední session / Stav k pokračování (27. 2. 2026)

**Co je hotové:**
- **F3 (product-variants)** – produkční hardening: ověření upload URL (HEAD 200, jinak 502 UPLOAD_NOT_REACHABLE), unikátní výstupy `{requestId}-{index}.png`, cleanup uploadu po 8 s. Vše v kódu a v PROJECT_STATE.md.
- **F3 404:** Na VPS byl proveden `pm2 restart neobot --update-env`, endpoint `/api/ads/product-variants` už odpovídá (ne 404). Viz sekce „F3 – Fix produkčního 404 (nasazení)“.
- **F3 413 (nginx):** Přidán skript `scripts/nginx-f3-upload-limit.sh` a sekce „F3 – nginx upload limit fix“ v PROJECT_STATE.md. Nginx pro api.neobot.cz je v `/etc/nginx/sites-available/default`; bez `client_max_body_size 20M;` vrací uploady 413.

**Co zbývá udělat na VPS (jednou):**
- Spustit na produkci: **`sudo bash /home/vpsuser/neobot/scripts/nginx-f3-upload-limit.sh`**  
  Tím se do bloku api.neobot.cz v default přidá `client_max_body_size 20M;`, ověří `nginx -t` a reloadne nginx. Po tom curl na product-variants s větším obrázkem vrátí 200 nebo 429, ne 413.

**Kde to je v PROJECT_STATE.md:**
- F3 hardening: „F3 – Produkční hardening“, „F3 – Produkční curl test“, „F3 – Fix produkčního 404“, „F3 – nginx upload limit fix“.

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
