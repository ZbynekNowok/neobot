# Chat, Brand (profil firmy), RBAC, SaaS API klíče

**Stav:** hotovo v kódu; v aktuálním **server.js** tyto route **nejsou** namountované (slim server má jen health, design, me). Pro plnou aplikaci je potřeba v server.js přidat chatRouter, workspaceProfile, workspaceUsers atd.

## Co je hotové (v kódu)

- **Chat:** GET `/api/chat/ping`, GET `/api/chat/threads`, GET `/api/chat/threads/:id`, POST `/api/chat` (včetně režimu Marketing/Obecný). Vlákna a zprávy v DB, cleanup starých vláken (90 dní).
- **Workspace profil (Brand):** GET/POST `/api/workspace/profile` – business_name, industry, target_audience, city, tone, usp, main_services, cta_style. Ukládá se do tabulky `workspace_profile`.
- **RBAC:** Middleware `requireRole(allRoles)` v `src/middleware/requireRole.js`. Role: owner, editor, viewer. Owner: vše včetně POST profile a správy uživatelů. Editor: chat a generování. Viewer: jen čtení (threads, outputs, profile).
- **SaaS API klíče:** Admin bootstrap endpoint pro vytvoření workspace + API klíče (header `x-admin-key`). Klient používá `x-api-key`. Dokumentace v `docs/SAAS_MVP_TESTS.md`.
- **Usage (využití):** GET `/api/me` vrací workspace včetně usage (period, used, limit, remaining). Panel „Využití“ na dashboardu.

## Kde to je v kódu

- **Chat:** `src/routes/chat.js`, `src/chat/buildSystemPrompt.js`, `src/chat/threadSummary.js`, `src/chat/cleanupOldThreads.js`.
- **Profil:** `src/routes/workspaceProfile.js`.
- **Uživatelé:** `src/routes/workspaceUsers.js`.
- **Auth:** `src/auth/getAuthUser.js` (x-api-key → user + workspace), `src/auth/ensureWorkspace.js`, `src/middleware/requireRole.js`.
- **DB:** workspaces, workspace_members, workspace_plans, workspace_usage, api_keys, workspace_profile. Migrace v `src/db/database.js`.

## Dokumentace

- `docs/CHAT_MVP_REPORT.md` – chat, brand, výstupy, test:chat.
- `LAUNCH_READY_REPORT.md` – port, ping, API klíč maskování, chyby 401/403/402/429/500, RBAC, UI flow.
- `docs/SAAS_MVP_TESTS.md` – migrace, vytvoření API klíče, použití x-api-key.

## Test

- `npm run test:chat` – volá GET ping, POST profile, POST chat, GET threads, GET outputs (script: `scripts/chat-api-test.js`).
