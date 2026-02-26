# Lovable: Jak zobrazit historii výstupů

Backend už vrací data na **GET `/api/outputs`**. Na Lovable je potřeba stránku **Historie** (`/app/historie`, `HistoryPage`) napojit na toto volání.

---

## 1. URL a hlavička

- **URL:** `https://api.neobot.cz/api/outputs?limit=50`
- **Metoda:** GET
- **Hlavička:** `x-api-key: <workspace API klíč>`

API klíč by měl být v Lovable k dispozici tam, kde už voláte backend (např. v `src/lib/neobot.ts` jako `NEOBOT_API_KEY` nebo z nastavení uživatele/workspace).

---

## 2. Odpověď API

```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "type": "content_generate",
      "input": { ... },
      "output": { ... },
      "created_by": null,
      "created_at": "2025-02-20T12:00:00.000Z"
    }
  ]
}
```

- `items` je vždy pole (i když prázdné).
- Při chybě auth: **401** s `{ "ok": false, "error": "UNAUTHORIZED" }`.

---

## 3. Co v Lovable udělat

1. **Na stránce Historie (`HistoryPage` / `/app/historie`):**
   - Při načtení stránky (nebo v `useEffect`) zavolat:
     - `fetch(`${NEOBOT_API_BASE}/api/outputs?limit=50`, { headers: { 'x-api-key': NEOBOT_API_KEY } })`
   - Nebo použít existující API helper z `src/lib/neobot.ts` / `src/lib/api.ts`, pokud tam už přidáte metodu pro GET outputs (s hlavičkou `x-api-key`).

2. **Kontrola konfigurace:**
   - `NEOBOT_API_BASE` = `https://api.neobot.cz` (bez lomítka na konci).
   - `NEOBOT_API_KEY` = platný workspace API klíč (např. `nb_...`). Bez něj API vrátí 401 a historie se nenačte.

3. **Zobrazení:**
   - Po úspěšné odpovědi zobrazit `data.items` (tabulka, karty, seznam – podle vašeho UI).
   - Pokud `items.length === 0`, zobrazit např. „Zatím nemáte žádné výstupy“.

---

## 4. Rychlý test API z příkazové řádky

```bash
curl -s "https://api.neobot.cz/api/outputs?limit=50" \
  -H "x-api-key: TVOJ_API_KLIC"
```

Očekávaně: `{"ok":true,"items":[...]}` nebo `{"ok":true,"items":[]}`. Při špatném klíči: 401.

---

## 5. Časté důvody, proč „to nevidím“

- **Stránka Historie nevolá API** – v komponentě pro `/app/historie` chybí `fetch` (nebo React Query / useSWR) na `GET /api/outputs`.
- **Špatná URL** – např. jiná doména nebo path (musí být přesně `https://api.neobot.cz/api/outputs`).
- **Chybí nebo špatný x-api-key** – bez platného klíče backend vrací 401 a frontend nemá data.
- **CORS** – backend má zapnutý CORS; pokud voláte z prohlížeče z domény Lovable, mělo by to projít. Při 401/403 jde o auth, ne CORS.

Pokud po napojení stále nic nevidíš, v DevTools (Záložka Síť) zkontroluj, jestli se request na `api.neobot.cz/api/outputs` vůbec odešle a jaký je status a odpověď.
