# Chat + Brand Memory – report implementace a self-testu

## Změněné soubory

- **server.js** – mount `app.use("/api/chat", chatRouter)`, log „Chat routes mounted“, „SERVER STARTED v2“, volání cleanup + scheduleCleanup
- **src/routes/chat.js** – validace délky zprávy (max 3000 znaků → 400), in-memory rate limit (20 zpráv/minutu na workspace+user), routes `/ping`, `/threads`, `/threads/:id`, `POST /`
- **src/chat/cleanupOldThreads.js** – log „Chat cleanup scheduled (every 24h, retention 90 days)“
- **public/js/api.js** – hlavička `x-api-key` z `localStorage.getItem("neobot_api_key")`
- **public/chat.html** – layout chatu (sidebar + hlavní panel), panel Brand (formulář), panel Výstupy, pole API klíč v dashboardu, odkazy Brand a Výstupy v menu
- **public/chat.js** – přepsáno na thread API (GET threads, GET thread/:id, POST /api/chat), Nový chat, režim Marketing/Obecný, `NeoBotChatOpenWithPrefill`
- **public/dashboard.js** – rozšíření allPanels/allNavIds o brand-panel a outputs-panel, načtení/uložení API klíče do localStorage
- **public/history-page.js** – rozšíření allPanels/allNavIds o brand, marketing, outputs
- **package.json** – skript `test:chat`

## Přidané soubory

- **scripts/chat-api-test.js** – automatický test (ping, profile POST, chat POST, threads GET) přes fetch
- **public/brand.js** – načtení/uložení workspace profilu, toast „Uloženo“
- **public/outputs.js** – načtení GET /api/outputs, tlačítko „Pokračovat v chatu k tomuto výstupu“
- **docs/CHAT_MVP_REPORT.md** – tento report

## Výsledek testů

- **GET /api/chat/ping** – 200, `{ ok: true, route: "chat" }`
- **POST /api/workspace/profile** – 200, `{ ok: true, profile: {...} }`
- **POST /api/chat** (mode marketing) – 200, `{ ok: true, threadId, reply, meta }`
- **GET /api/chat/threads** – 200, `{ ok: true, threads: [...] }`

Spuštění testu (server musí běžet). Test defaultně volá `http://127.0.0.1:${PORT}` (PORT z env, jinak 3000):

```bash
npm run test:chat
# nebo s jiným portem
PORT=3000 node scripts/chat-api-test.js
# nebo vlastní URL
API_BASE_URL=http://127.0.0.1:4000 node scripts/chat-api-test.js
```

## Potvrzení, že endpointy vrací 200

- **GET /api/chat/ping** – 200 (bez auth)
- **GET /api/chat/threads** – 200 s auth (x-api-key nebo x-dev-user-id)
- **GET /api/chat/threads/:id** – 200 s auth
- **POST /api/chat** – 200 s auth
- **GET /api/workspace/profile** – 200 s auth
- **POST /api/workspace/profile** – 200 s auth

## Potvrzení, že UI funguje

- **Chat** – levý sidebar (seznam vláken), tlačítko „Nový chat“, výběr režimu Marketing/Obecný, vstup + Odeslat, optimistické přidání zprávy, načtení odpovědi, scroll dolů, obnovení seznamu vláken po vytvoření nového
- **Brand** – formulář (business_name, industry, target_audience, city, tone, usp, main_services po řádcích, cta_style, forbidden_words po řádcích), načtení GET profile při otevření, uložení POST profile, toast „Uloženo“
- **Výstupy** – tabulka z GET /api/outputs, u každého řádku tlačítko „Pokračovat v chatu k tomuto výstupu“ → přepne na Chat, nový thread, předvyplněná zpráva
- **Dashboard** – pole „API klíč (pro Chat a Brand)“ ukládá do `localStorage.neobot_api_key`; bez klíče vrací chat 401 s hláškou o nastavení klíče

## Log serveru po restartu

Po `node server.js` (nebo `pm2 restart neobot --update-env`) se v logu objeví:

```
Chat routes mounted
SERVER STARTED v2
NeoBot running on port ${PORT}
Chat cleanup scheduled (every 24h, retention 90 days)
```

(Případně další řádky podle NODE_ENV a PM2.)

## Stabilita (Faze 2)

- Zpráva delší než 3000 znaků → **400** s chybou „message must be at most 3000 characters“
- Více než 20 zpráv za minutu (na workspace+user) → **429** „Too many messages. Try again in a minute.“
- Max 50 zpráv na vlákno v GET thread/:id (LIMIT 50 v SQL)
- Shrnutí vlákna se generuje po každých 10 zprávách (setImmediate, neblokuje odpověď)
- Cleanup vláken starších 90 dní: při startu a pak každých 24 h

## Usage

- Každé volání POST /api/chat spotřebuje **2 units** (typ `chat_message`) v rámci stávajícího usage systému (workspace_usage, limity dle plánu).
