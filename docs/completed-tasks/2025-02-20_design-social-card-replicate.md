# Design – Grafika s textem (Replicate SDXL + LLM texty)

**Stav:** hotovo (v kódu i v aktuálním server.js)

## Co je hotové

- **POST `/api/design/social-card/draft`** – na vstupu: goals, theme, keywords, product_description, (volitelně profile), format, style, palette, purpose. Vygeneruje pozadí (Replicate SDXL) a texty (LLM), vrátí šablonu s URL obrázku a texty.
- Prompt pro obrázek i texty vychází z **fullUserBrief** (goals + theme + keywords + product_description).
- Profil klienta: načtení z DB (workspace_profile podle workspace_id), nebo z body. Design endpoint načte profil z DB.

## Kde to je v kódu

- **Route:** `src/routes/design.js` – POST `/design/social-card/draft`, getAuthUser, ensureWorkspace, getProfileByWorkspaceId.
- **Obrázek:** `src/imageProviders/replicate.js` – buildPrompt, buildNegativePrompt, generateBackground (ukládá do `public/outputs/backgrounds/<jobId>.png`), rozměry dělitelné 8, seed integer.
- **Texty:** `src/llm/llmGateway.js` (llmChat).
- **Server:** `server.js` – mountuje designRouter na `/api`.

## Env

- `REPLICATE_API_TOKEN` v `.env`.

## Jak volat (Lovable)

- URL: `POST https://api.neobot.cz/api/design/social-card/draft`
- Hlavička: `x-api-key: <workspace API key>`
- Body: goals, theme, keywords, product_description, format (např. 4:5), style, palette, purpose. Odpověď: `{ ok: true, template }` s background (publicUrl), layout.slots, texts, meta.
