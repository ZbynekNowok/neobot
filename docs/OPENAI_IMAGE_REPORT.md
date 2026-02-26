# OpenAI Image – background engine report

## Změněné / nové soubory

| Soubor | Změna |
|--------|--------|
| **server.js** | Na začátku (po dotenv) kontrola `OPENAI_API_KEY`: pokud chybí → `console.error("OPENAI_API_KEY missing")` a `process.exit(1)`. |
| **src/ai/openaiImage.js** | **NOVÝ** – služba pro generování obrázků: `generateImage({ prompt, format })`, OpenAI SDK (`dall-e-3`), ukládání do `public/generated/background-<uuid>.png`, vrací `{ imageUrl, filePath }`. Mapování formátu na velikost: 1:1→1024x1024, 4:5 a 9:16→1024x1792, 16:9→1792x1024 (limity DALL-E 3). |
| **src/routes/marketing.js** | `POST /api/marketing/background`: pouze tělo `{ prompt, format }`, validace, `checkAndConsumeUsage("image_background")`, volání `generateImage()`, odpověď `{ ok: true, imageUrl }`. Import `generateImage` z `../ai/openaiImage.js`. |
| **src/usage/estimateUnits.js** | Přidán typ **image_background: 1200** jednotek. |
| **src/design/renderEngine.js** | V `fetchImageBuffer(url)` podpora lokální cesty: pokud `url` začíná `/` (a ne `//`), načtení souboru z `public` (path.join(PUBLIC_DIR, url)), aby render mohl používat `/generated/...`. |
| **src/workers/jobWorker.js** | V handleru `marketing_flyer` krok „Background generation“: místo Replicate volání `generateImage()` z `../ai/openaiImage.js` s `artDirection.backgroundPrompt` a formátem 4:5 / 9:16; do `artDirection.backgroundImageUrl` se nastaví vrácené `imageUrl`. |
| **scripts/test-openai-background.js** | **NOVÝ** – skript pro self-test: POST na `/api/marketing/background`, ověření `ok: true` a existence souboru v `public/generated`. |

## Potvrzení funkce generování obrázků

- **POST /api/marketing/background**  
  - Přijme `{ prompt, format }`, zkontroluje prompt a formát (1:1, 4:5, 9:16, 16:9).  
  - Spotřebuje 1200 jednotek (`image_background`).  
  - Zavolá OpenAI (DALL-E 3), obrázek uloží do `public/generated/background-<uuid>.png` a vrátí `{ ok: true, imageUrl: "/generated/background-<uuid>.png" }`.  

- **Flyer**  
  - Při generování letáku bez dodaného `backgroundUrl` worker zavolá `generateImage()` s art direction promptem a příslušným formátem a před renderem použije vrácené `imageUrl`.  
  - Render načte obrázek přes podporu lokální cesty v `fetchImageBuffer` (`/generated/...` → čtení z `public`).  

- **ENV**  
  - Při startu serveru se kontroluje `OPENAI_API_KEY`; pokud chybí, aplikace skončí s hláškou „OPENAI_API_KEY missing“.  

## Velikost generovaného souboru a čas

- **Velikost:** Závisí na DALL-E 3 (PNG, typicky řádově stovky KB až nízké jednotky MB). Konkrétní hodnotu zjistíte po běhu testu (např. `scripts/test-openai-background.js` kontroluje existenci a může doplnit `stat.size`).  
- **Čas:** Generování obrázku u OpenAI obvykle 5–20 s; po návratu odpovědi se ještě zapisuje soubor na disk (zanedbatelné).  

*(Pro konkrétní čísla spusťte test a případně doplňte do skriptu výpis `stat.size` a měření času.)*

## Self-test

1. **ENV**  
   Do `.env` nastavte `OPENAI_API_KEY` (a volitelně `API_KEY` nebo `DEV_USER` pro auth).  

2. **Spuštění serveru**  
   ```bash
   npm start
   # nebo: node server.js
   ```  
   Bez `OPENAI_API_KEY` server skončí s „OPENAI_API_KEY missing“.  

3. **Background endpoint**  
   ```bash
   curl -X POST "http://localhost:${PORT}/api/marketing/background" \
     -H "x-api-key: <valid key>" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"modern abstract marketing background blue gradient","format":"1:1"}'
   ```  
   Očekávaná odpověď: `{"ok":true,"imageUrl":"/generated/background-<uuid>.png"}`.  
   Ověření: soubor `public/generated/background-<uuid>.png` existuje a je přístupný v prohlížeči na `http://localhost:PORT/generated/background-<uuid>.png`.  

4. **Automatický skript**  
   ```bash
   node scripts/test-openai-background.js
   ```  
   (Server musí běžet a v `.env` musí být nastavený API klíč pro auth.)  

5. **Flyer včetně pozadí**  
   `POST /api/marketing/flyer` s platným tělem (industry, brand, offer, format).  
   Ověření: job doběhne, v DB/odpovědi je `png_url` (finální leták) a v průběhu se vygeneruje pozadí přes OpenAI a uloží do `public/generated/`, které render použije.  

## Možné chyby

- **OPENAI_API_KEY missing** – při startu: doplňte klíč do `.env`. Při volání `generateImage` bez klíče: stejná hláška z `openaiImage.js`.  
- **400 prompt/format** – chybí nebo neplatný `prompt`, nebo `format` není jedna z: 1:1, 4:5, 9:16, 16:9.  
- **402** – vyčerpán limit (spotřeba 1200 jednotek za jeden background).  
- **500** – chyba OpenAI API (síť, kvóta, neplatný klíč) nebo chyba při zápisu souboru; v odpovědi `error` s textem z `err.message`.  

---

**Shrnutí:** OpenAI Image je napojen jako první background engine: synchronní generování přes `src/ai/openaiImage.js`, ukládání do `public/generated/`, vrácení URL. Endpoint `POST /api/marketing/background` vrací `imageUrl`, flyer worker při absenci `backgroundUrl` automaticky volá `generateImage` a použije vrácené URL před renderem. Usage typ `image_background` má 1200 jednotek.
