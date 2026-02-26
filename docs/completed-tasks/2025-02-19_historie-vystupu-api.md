# Historie výstupů (API)

**Datum:** 2025-02-19  
**Stav:** hotovo

## Co je hotové

- **GET `/api/outputs`** – vrací položky z tabulky `outputs` pro daný workspace (limit např. 50).
- **GET `/api/list`** – stejné chování (kompatibilita).
- **GET `/api/me`** – informace o workspace a auth.

## Kde to je v kódu

- **Čtení:** `src/routes/me.js` – route `GET /outputs`, SELECT z `outputs` podle `workspace_id`.
- **Zápis:** `src/saas/saveOutput.js` – INSERT do `outputs` po úspěšném výstupu.
- **Server:** `server.js` – mountuje `meRouter` na `/api`. Pokud se meRouter nenačte, fallback: `/api/outputs` a `/api/list` vrací `{ ok: true, items: [] }`.

## Jak volat

- URL: `https://api.neobot.cz/api/outputs?limit=50`
- Hlavička: `x-api-key: <workspace API key>`

Frontend (Lovable): stránka „Historie výstupů“ volá tento endpoint.
