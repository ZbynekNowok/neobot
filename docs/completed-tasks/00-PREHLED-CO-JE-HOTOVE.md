# Přehled: Co všechno máme hotové (NeoBot)

Poslední průchod projektem: 2025-02-20. Slouží jako vstupní přehled pro nové chaty – vždy si přečti tuto složku (`docs/completed-tasks/`), tento soubor je index. **Lovable (frontend) struktura a mapování na API:** viz **`CONTEXT.md`** v kořeni projektu.

---

## 1. Co běží v aktuálním server.js

Soubor **`server.js`** (slim verze) mountuje jen:

| Oblast | Endpointy | Soubory |
|--------|-----------|---------|
| **Health** | GET `/health`, GET `/ready` | `src/routes/health.js` |
| **Design (Grafika s textem)** | POST `/api/design/social-card/draft` | `src/routes/design.js`, `src/imageProviders/replicate.js`, `src/llm/llmGateway.js` |
| **Me + Historie výstupů** | GET `/api/me`, GET `/api/outputs`, GET `/api/list` (fallback když meRouter neběží) | `src/routes/me.js` |

- CORS zapnutý, statika z `public/`, JSON limit 2MB.
- Replicate: token z `.env` (REPLICATE_API_TOKEN), fallback čtení z .env pokud není v process.env.

---

## 2. Co je implementované v kódu (ale v tomto server.js není namountované)

Tyto routery existují a jsou plně funkční, ale v aktuálním **server.js** chybí `app.use(...)`:

| Oblast | Endpointy | Soubor |
|--------|-----------|--------|
| **Chat** | GET `/api/chat/ping`, GET `/api/chat/threads`, GET `/api/chat/threads/:id`, POST `/api/chat` | `src/routes/chat.js` |
| **Workspace profil** | GET/POST `/api/workspace/profile` | `src/routes/workspaceProfile.js` |
| **Uživatelé workspace** | GET/POST/PATCH/DELETE `/api/workspace/users` | `src/routes/workspaceUsers.js` |
| **Publish** | POST `/api/publish`, approve/reject/status/list | `src/routes/publish.js` |
| **Publish targets** | GET `/api/publish/targets`, POST/DELETE Wordpress | `src/routes/publishTargets.js` |
| **Jobs** | GET `/api/jobs/:id` | `src/routes/jobs.js` |
| **Obrázky** | POST `/api/images/background` | `src/routes/images.js` |

Když budeš chtít „plnou“ aplikaci (chat, profil, publish, …), stačí v **server.js** načíst tyto routery a namountovat je pod `/api` (viz např. `docs/CHAT_MVP_REPORT.md`, `LAUNCH_READY_REPORT.md`).

---

## 3. Auth a databáze

- **Auth:** `getAuthUser` (x-api-key / API klíč → workspace), `ensureWorkspace`, `requireRole` (owner/editor/viewer). Role a API klíče v DB.
- **DB:** SQLite přes `src/db/database.js` (workspaces, workspace_members, workspace_plans, workspace_usage, outputs, api_keys, workspace_profile, …). Migrace při načtení modulu; `npm run db:migrate` volitelně.
- **Historie výstupů:** Tabulka `outputs`; zápis `src/saas/saveOutput.js`, čtení GET `/api/outputs` v `src/routes/me.js`. Viz `2025-02-19_historie-vystupu-api.md`.

---

## 4. Frontend (public/)

- **Výstupy:** `public/outputs.js` – volá `api/outputs?limit=50`, tabulka, tlačítko „Pokračovat v chatu k tomuto výstupu“.
- **Chat, Brand, Historie, SEO, Publish, Uživatelé, Dashboard:** odpovídající .js a stránky (chat.js, brand.js, history-page.js, seo.js, publish.js, users.js, dashboard).
- API klíč v localStorage, jednotné chybové hlášky (401/403/402/429/500), RBAC na frontendu.

---

## 5. Ostatní moduly (bez přímého mountu v tomto server.js)

- **LLM:** `src/llm/llmGateway.js` (používá design + chat).
- **Design:** šablony `src/design/templateLoader.js`, `renderEngine.js`, Replicate v `src/imageProviders/replicate.js` a `index.js`.
- **SEO / Publish / Jobs:** fronty (BullMQ), workeři (seoWorker, seoAuditWorker, publishWorker), payloadBuilders, Wordpress klients.
- **SaaS:** `src/saas/planLimits.js`, `saveOutput.js`.
- **Cleanup:** `src/chat/cleanupOldThreads.js`, `src/cleanup/cleanupGeneratedImages.js`.

---

## 6. Dokumentace a testy

- **docs/completed-tasks/** – tato složka (paměť projektu).
- **docs/CHAT_MVP_REPORT.md**, **LAUNCH_READY_REPORT.md**, **docs/SAAS_MVP_TESTS.md**, **docs/AUTH_DETECTION_SUMMARY.md** – popis chatu, RBAC, API klíčů, portu, UI.
- **scripts/chat-api-test.js** – test chat + profile + outputs; `npm run test:chat`.
- **tests/rbac.test.js** – RBAC testy.

---

## 7. Jednotlivé záznamy v této složce

- **README.md** – konvence (jeden úkol = jeden soubor, název YYYY-MM-DD_popis.md).
- **00-PREHLED-CO-JE-HOTOVE.md** – tento přehled.
- **2025-02-19_historie-vystupu-api.md** – GET /api/outputs, me.js, saveOutput, fallback.
- **2025-02-26_historie-seo-generovani-lovable.md** – historie SEO (seo/history, seo/audit/list), saveOutput v design + POST /api/outputs, dva zdroje dat, prompty pro Lovable, oprava generování.

Při dokončení nového úkolu přidej nový soubor (YYYY-MM-DD_popis.md) a případně doplň tento přehled.
