# Architektura NeoBot – přehled složek a konvence

## Účel složek v `/src`

### `/src/routes`
**Účel:** HTTP API – definice endpointů a napojení na business logiku.  
Každý soubor exportuje Express router (např. `contentRouter`, `designRouter`, `meRouter`).  
- `health.js` – `/health`, `/ready`  
- `content.js` – generování textu (`POST /api/content/generate`), používá `../llm/llmGateway.js`  
- `design.js` – grafika s textem (`/api/design/social-card/draft`), používá `imageProviders`, `design/renderEngine`  
- `me.js` – `/api/me`, `/api/outputs`, `/api/seo/*` (historie výstupů, workspace info)  
- `workspaceProfile.js` – `/api/workspace/profile` (profil značky pro backend)  
- `publish.js` – publikování (např. WordPress), přidává joby do fronty  
- `publishTargets.js` – cíle publikování  
- `images.js` – generování obrázků (pozadí), přidává joby  
- `jobs.js` – stav jobů (`/api/jobs/:id`)  
- `chat.js`, `apiProxy.js` – chat a proxy na externí API  

**Použití:** Přidávat nové endpointy = nový soubor v `routes/` (nebo rozšířit stávající router) a zaregistrovat ho v `server.js`.

---

### `/src/marketing`
**Účel:** Business logika specifická pro marketingové výstupy (art direction, copy).  
- `artDirection.js` – AI generování „art direction“ pro letáky (layout, barvy, mood, background prompt); volá `llm/llmGateway.js`.  

**Použití:** Další marketingové AI pomocníky (copy, varianty, A/B návrhy) dávat sem.

---

### `/src/imageProviders`
**Účel:** Abstrakce nad poskytovateli generování obrázků (Replicate, případně další).  
- `replicate.js` – volání Replicate API (SDXL, pozadí).  
- `index.js` – re-export, jednotné API (`generateBackground`).  

**Použití:** Nový provider = nový soubor (např. `openai.js`) a zapojení v `index.js`. Generování obrázků z API volá tyto moduly.

---

### `/src/publish`
**Účel:** Příprava payloadů a logika pro publikování na externí platformy (WordPress, atd.).  
- `payloadBuilders.js` – pomocné funkce (escape HTML, slug, build WP post draft ze SEO článku).  

**Použití:** Nové platformy nebo formáty payloadů – nové buildery zde, vlastní „odeslání“ v `connectors/`.

---

### `/src/render`
**Účel:** Vykreslování finálního výstupu do obrázku (PNG atd.).  
- `flyerRenderer.js` – renderování marketingového letáku z art direction + šablony (Puppeteer, fallback placeholder).  

**Použití:** Nové typy výstupů (jiný formát, jiná šablona) = rozšířit zde nebo nový renderer v `render/`.

---

### `/src/llm`
**Účel:** Jednotné volání LLM (OpenAI chat completions).  
- `llmGateway.js` – `llmChat()` s timeoutem, retry (429, 5xx), logováním.  

**Použití:** Veškeré AI generování **textu** (content, art direction, copy) by mělo jít přes `llm/llmGateway.js`. Nové modely nebo providery lze rozšířit zde.

---

### `/src/queue`
**Účel:** Fronty pro asynchronní joby (BullMQ + Redis).  
- `jobQueue.js` – jednotná fronta `"jobs"`, `addJob(type, payload)`, typy např. `seo_generate`, `seo_audit`, `publish`, `image_background`.  
- `redis.js` – připojení k Redis.  
- `seoQueue.js`, `seoAuditQueue.js`, `publishQueue.js` – deprecated, delegují na `jobQueue.js`.  

**Použití:** Nový typ background jobu = volat `addJob("novy_typ", payload)` z route; spotřebu jobů řeší worker (aktuálně jsou `workers/*` deprecated, spotřeba může být jinde nebo plánovaná).

---

### `/src/workers`
**Účel:** Spotřebiče jobů z fronty (SEO, audit, publish).  
- `seoWorker.js`, `seoAuditWorker.js`, `publishWorker.js` – aktuálně **deprecated** (exportují `null`).  
- Joby se přidávají v `routes/` (`addJob`), stav se čte přes `routes/jobs.js` (`/api/jobs/:id`).  

**Použití:** Až bude potřeba znovu spouštět joby v tomto procesu nebo v samostatném worker procesu, doplnit/obnovit worker, který bere z `queue/jobQueue.js`.

---

### `/src/connectors`
**Účel:** Konkrétní implementace integrací k externím službám (WordPress, atd.).  
- `wordpressClient.js` – vytvoření/aktualizace příspěvku na WordPressu.  
- `index.js` – `publishWithConnector({ action, target })` podle `target_platform`.  

**Použití:** Nová platforma (LinkedIn, Facebook, …) = nový klient v `connectors/` a rozšíření `publishWithConnector` v `index.js`.

---

### `/src/db`
**Účel:** Připojení k databázi a schéma (SQLite, better-sqlite3).  
- `database.js` – vytvoření DB, migrace (workspaces, workspace_profile, outputs, …), export `db`.  

**Použití:** Čtení/zápis do DB z routes, saas, workers – vždy přes `require("../db/database.js")`. Nové tabulky = migrace v `database.js` (runMigrations) nebo samostatné migrační soubory.

---

## Odpovědi na konkrétní otázky

### 1. Kam přidávat nové API endpointy
- **Nový router:** soubor v `src/routes/` (např. `src/routes/adsStudio.js`).  
- **Registrace:** v `server.js` – `require("./src/routes/...")` a `app.use("/api", router)`.  
- Malé rozšíření stávající domény lze přidat do příslušného routeru (content, design, me, …).

### 2. Kam patří business logika
- **Obecná / sdílená:** `src/saas/` (saveOutput, planLimits), `src/usage/` (checkAndConsumeUsage, estimateUnits).  
- **Marketing / kreativa:** `src/marketing/` (art direction, copy).  
- **Publikování:** `src/publish/` (payload buildery), `src/connectors/` (konkrétní platformy).  
- **Route-handlery** mohou obsahovat jednoduchou „orchestrační“ logiku; složitější věci volat z těchto modulů.

### 3. Kam patří AI generování (text, obrázky, video)
- **Text (LLM):** volání v `src/llm/llmGateway.js` (`llmChat`). Používají ho např. `routes/content.js`, `marketing/artDirection.js`.  
- **Obrázky:** `src/imageProviders/` (Replicate atd.) + volání z `routes/design.js`, `routes/images.js`.  
- **Video:** v aktuální struktuře není; logicky by šlo přidat např. `src/videoProviders/` nebo rozšířit `imageProviders` a odpovídající route.

### 4. Kam patří background joby
- **Přidání jobu:** v route (např. `publish.js`, `images.js`) pomocí `queue/jobQueue.js` → `addJob(type, payload)`.  
- **Definice fronty a typů:** `src/queue/jobQueue.js`.  
- **Spotřeba (worker):** `src/workers/` – aktuálně deprecated; obnova nebo nový worker by měl brát joby z `jobQueue` a volat příslušnou logiku (SEO, publish, obrázky).

### 5. Jak frontend komunikuje s backendem
- Frontend (Lovable/Vite) má `NEOBOT_API_BASE = "https://api.neobot.cz"` a `VITE_NEOBOT_API_KEY`.  
- Volání přes `neobotFetch(path, opts)` v `frontend/neo-mind-guide-main/src/lib/neobot.ts` – všechny requesty jdou na `https://api.neobot.cz` s hlavičkou `x-api-key`.  
- Endpointy: `/api/content/generate`, `/api/workspace/profile`, `/api/outputs`, `/api/design/...`, `/api/me`, `/api/jobs/:id` atd.  
- CORS a JSON jsou na backendu (Express) nastavené v `server.js`.

### 6. Hlavní entry point serveru
- **Soubor:** `server.js` v kořenu projektu (`/home/vpsuser/neobot/server.js`).  
- Načítá `.env`, Express, CORS, JSON, statické soubory z `public/`, pak montuje routy a naslouchá na `PORT` (default 3000).  
- PM2 spouští `server.js` (viz `ecosystem.config.js`).

### 7. Který soubor registruje routes
- **Soubor:** `server.js`.  
- Routy se registrují sekvenčně: `healthRouter`, `designRouter`, `contentRouter`, `meRouter`, `workspaceProfileRouter`.  
- Každý router je připojen přes `app.use("/api", ...)` nebo `app.use(healthRouter)` (health bez prefixu).  
- Nový modul = nový `require("./src/routes/xxx.js")` a `app.use("/api", xxxRouter)`.

---

## Doporučení: umístění modulu „AI Ads Studio“

Podle stávající architektury:

| Co | Kam |
|----|-----|
| **API endpointy** | `src/routes/adsStudio.js` (nebo `ads.js`) – např. `POST /api/ads/draft`, `GET /api/ads/campaigns`. V `server.js` přidat `app.use("/api", adsStudioRouter)`. |
| **Business logika** | `src/marketing/adsStudio.js` (nebo nová složka `src/ads/` s více soubory) – tvorba kampaní, návrhy copy, targeting. |
| **AI text (copy, návrhy)** | Volat `src/llm/llmGateway.js` z `src/marketing/adsStudio.js` (nebo z `src/ads/`). |
| **AI obrázky pro reklamy** | Použít stávající `src/imageProviders/` nebo rozšířit o ad-specifické prompty; případně `src/design/renderEngine.js` pro finální kreativa. |
| **Background joby** | Pokud budou dlouhé úlohy (např. generování sady variant), přidávat joby přes `src/queue/jobQueue.js` s typem např. `ads_campaign_generate`; spotřebu v budoucím workeru. |
| **Uložení výstupů** | Stejně jako u ostatních výstupů – `src/saas/saveOutput.js` a v `me.js` povolit nový typ v `allowed` (např. `ads_draft`). |

**Stručně:**  
- **Routes:** `src/routes/adsStudio.js`  
- **Logika + AI:** `src/marketing/adsStudio.js` (nebo `src/ads/` pokud poroste)  
- **Registrace:** v `server.js` jedna řádka pro `adsStudioRouter`.

Tím zůstane konzistence s ostatními moduly (content, design, publish) a oddělení API, business logiky a LLM/obrázkových providerů.
