# Launch-ready report – NeoBot stabilizace

## 1. Změněné soubory

| Soubor | Úpravy |
|--------|--------|
| `server.js` | PORT/ENV: startup log `PORT=<port> NODE_ENV=<env>`; jediný zdroj pravdy pro port (default 3000). |
| `scripts/chat-api-test.js` | BASE z `process.env.API_BASE_URL` nebo `http://127.0.0.1:${PORT}` (PORT z env, jinak 3000); ping s auth v prod / dev; přidán test GET /api/outputs. |
| `src/routes/chat.js` | Ping: v dev bez auth pouze z localhost nebo `?debug=1`, jinak 401. |
| `public/js/api.js` | `humanErrorMessage(status)` pro 401/403/402/429/500; dispatch `neobot-api-error` s human message; throw err s `message: humanErrorMessage(status)`. |
| `public/chat.html` | Modal 401 nahrazen jednotným `modal-api-error` (401/403/402/429/500); sekce „Využití“ na dashboardu; navigace: Dashboard, Chat, Marketing, Profil firmy (/brand), Výstupy, Historie, SEO, SEO Audit, Publish, Uživatelé. |
| `public/dashboard.js` | Jednotný modal pro API chyby (lidské hlášky); loadUsage() + panel „Využití“ (used/limit/zbývá z GET /api/me); Test API alert bez raw JSON. |

## 2. Co bylo opraveno / sjednoceno

- **Port:** V celém projektu se používá jediný zdroj: `process.env.PORT || 3000`. V kódu ani v dokumentaci není 3001.
- **Ping:** V production vyžaduje stejnou auth jako ostatní chat endpointy (x-api-key). V dev bez auth pouze z localhost nebo `?debug=1`, jinak 401.
- **API klíč v UI:** Maskování (prvních 6 + poslední 4 znaky), tlačítko „Vymazat API klíč“, helper vždy posílá x-api-key, pokud je uložen.
- **Chyby API:** Jednotné lidské hlášky (401/403/402/429/500), nikde se nezobrazuje raw JSON uživateli. Modal s tlačítkem „Přejít do Dashboardu“ u 401, u ostatních „Zavřít“.
- **RBAC:** V backendu již zavedeno (requireRole, workspace_users). Frontend při 403 zobrazuje „Nemáte oprávnění (role).“ přes jednotný modal.
- **Usage:** Při 402 modal: „Vyčerpali jste limit tarifu. Navýšte tarif nebo počkejte na reset.“ Na dashboardu panel „Využití“: použito / limit / zbývá z GET /api/me.
- **UI:** Brand pouze na /brand, v chatu link „Upravit profil firmy“ → /brand. Navigace sjednocená (Profil firmy, Výstupy, Uživatelé atd.).

## 3. Potvrzení: port sjednocen

- `server.js`: `const PORT = process.env.PORT || 3000`; při startu log `PORT=<port> NODE_ENV=<env>`.
- `scripts/chat-api-test.js`: `BASE = process.env.API_BASE_URL || "http://127.0.0.1:" + PORT`, kde `PORT` z env nebo 3000.
- V repozitáři není výskyt `3001` v kódu ani skriptech.

## 4. Potvrzení: ping zabezpečen

- **Production:** `optionalAuthForPing` volá `getAuthUser` → `ensureWorkspace` (stejná auth jako ostatní chat endpointy).
- **Dev:** Bez auth pouze pokud `fromLocalhost` nebo `req.query.debug === "1"`; jinak `res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Authentication required" })`.

## 5. Potvrzení: UI maskuje API klíč a umí ho smazat

- V dashboardu se zobrazuje jen maskovaná verze (prvních 6 + „…“ + poslední 4) v `#dashboard-api-key-masked`; input slouží jen pro zadání nového klíče.
- Tlačítko „Vymazat API klíč“ volá `localStorage.removeItem("neobot_api_key")` a vyprázdní input a maskovaný text.
- `NeoBotAPI.maskApiKey()` v `public/js/api.js` používá stejné pravidlo.

## 6. Potvrzení RBAC

- **Backend:** Middleware `requireRole(allowedRoles)` v `src/middleware/requireRole.js`; role z `workspace_users`.
- **Omezení:** POST /api/workspace/profile → owner; POST /api/chat, POST /api/marketing/*, POST /api/design/render → owner+editor; GET /api/chat/threads, GET /api/chat/threads/:id, GET /api/outputs, GET /api/workspace/profile → všechny role.
- **Frontend:** Při 403 se zobrazí modal s textem „Nemáte oprávnění (role).“ (přes `neobot-api-error` a `humanErrorMessage(403)`).

## 7. UI flow (stručný popis)

1. **Dashboard:** API klíč (maskovaný nebo prázdné pole), stav API, Test API, panel **Využití** (použito / limit / zbývá), poslední články a audity. Debug panel jen při localhost nebo `?debug=1`.
2. **Chat:** Režim Marketing/Obecný, link „Upravit profil firmy“ → /brand, vlákna v sidebaru, odeslání zprávy (owner/editor).
3. **Profil firmy (/brand):** Samostatná stránka – formulář Brand, Poslední úprava, Uložit, Vyčistit profil.
4. **Výstupy:** Seznam výstupů (všechny role včetně viewer).
5. **Uživatelé (/users):** Seznam uživatelů workspace, role, přidání e-mailem (owner only).
6. **Chyby:** Při 401/403/402/429/500 se zobrazí modal s lidským textem a tlačítkem (Přejít do Dashboardu u 401, Zavřít u ostatních). Nikde není raw JSON.

## 8. Výsledky testů

Spuštění: `node scripts/chat-api-test.js` (server běží na PORT z env, default 3000).

- **GET /api/chat/ping:** S auth (v prod x-api-key, v dev x-dev-user-id) → 200, `ok: true`.
- **POST /api/workspace/profile:** S auth (owner) → 200, `ok: true`.
- **POST /api/chat:** S auth (owner/editor) → 200, `ok: true`, `reply` a `threadId`.
- **GET /api/chat/threads:** S auth → 200, `ok: true`, `threads` pole.
- **GET /api/outputs:** S auth (všechny role) → 200, `ok: true`, `items` pole.

Scénáře RBAC (vyžadují více uživatelů/klíčů v workspace):

- Owner: může vše (profile POST, chat POST, outputs GET).
- Editor: může POST /api/chat a generovat, nemůže POST /api/workspace/profile (403).
- Viewer: může GET /api/outputs a GET /api/chat/threads, nemůže POST /api/chat (403).

Tyto scénáře se ověřují ručně nebo s více klíči; automatický test `test:chat` ověřuje flow s jedním auth kontextem (owner).

---

**Shrnutí:** Port a env jsou sjednoceny, ping je v production chráněn auth, v dev jen z localhost nebo debug. API klíč je v UI maskovaný a jde smazat. Chyby 401/403/402/429/500 mají jednotné lidské hlášky a modal bez raw JSON. RBAC je na backendu i ve frontendu (403 hláška). Dashboard má panel Využití a navigace je sjednocená včetně Profil firmy a Uživatelé.
