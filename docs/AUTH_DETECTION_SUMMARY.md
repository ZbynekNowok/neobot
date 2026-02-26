# Auth Detection Summary (NeoBot backend)

## 1) Nalezený stav

### Kde se řeší auth
- **Žádné uživatelské auth.** V projektu není middleware ani route, která by ověřovala identitu uživatele (JWT, session, cookie).
- **Pouze request identifikace:** `src/middleware/requestId.js` přidává `req.id` (UUID pro logování), ne user id.
- **Session pouze pro chat:** `memory.js` a `decisionTree.js` používají `sessionId` z body requestu (`/think/chat`). SessionId generuje frontend (`makeSessionId()` v `chat.js`), není vázané na přihlášeného uživatele.

### Identifikátor uživatele
- **Aktuálně žádný.** API endpointy (SEO, content, marketing, jobs, …) nečtou žádný user id ani email.

### Odkud se bere (pro budoucí integraci)
- **Authorization Bearer:** CORS povoluje header `Authorization` (`server.js`, `apiProxy.js`), ale žádný kód ho nečte.
- **Cookie/Session:** Nepoužívá se.
- **.env:** Vyhledání `SUPABASE_*`, `JWT_*`, `SESSION_*`, `COOKIE_*`, `AUTH_*` – **žádné proměnné nenalezeny.**

### Závěr
Backend je bez uživatelské autentizace. Pro SaaS MVP je implementován **DEV režim** s headerem `x-dev-user-id` (pouze mimo production nebo s `?debug=1`). V production bez nastavené auth (např. Supabase JWT) endpointy chráněné auth vrací **401**.

---

## 2) Jednotný způsob identifikace

- **Helper/middleware:** `getAuthUser(req)` → nastaví `req.user = { id, email }` nebo pošle 401.
- **DEV režim:** Pokud `NODE_ENV !== 'production'` nebo `?debug=1`, lze použít header `x-dev-user-id` (a volitelně `x-dev-user-email`). V production je tento header ignorován.
- **Produkce:** Bez nastavené auth (Supabase JWT / session) → 401. Připraveno na pozdější ověření JWT (např. `user.sub` jako id).
