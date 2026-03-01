# Context/Brief Engine a Orchestrator – přehled

## Účel

- **Jeden zdroj pravdy** pro kontext u všech generací (text, SEO, ads, obrázky, video prompty).
- Všechny generace procházejí **orchestrátorem** s **ContextPackem** (brief, industry, topic keywords, constraints, style).
- **Žádné přímé volání** LLM nebo image providerů z rout – vše přes orchestrator.

---

## Změněné / nové soubory

### Nové
- `src/context/contextEngine.js` – extractBrief, buildContextPack, resolveIndustry, buildLLMSystemPrompt, buildLLMUserPrompt, buildProviderPrompt
- `src/context/contextSchemas.js` – dokumentace tvaru ContextPack (JSDoc)
- `src/context/contextDebug.js` – buildDebugOutput pro `_debug` v API odpovědích
- `src/orchestrator/generate.js` – generateText, generateImage, generateDesignBackground, generateBackgroundWithContext, generateFromImageWithContext, generateSEO, generateVideoPrompt
- `src/routes/debug.js` – POST `/api/debug/context` (jen dev)
- `docs/CONTEXT_ORCHESTRATOR.md` – tento soubor

### Upravené
- `server.js` – mount debug routeru (dev only), oprava `app.post` v content fallbacku
- `src/routes/images.js` – POST `/images/compose`: buildContextPack → generateImage, výstup `_debug`
- `src/routes/content.js` – POST `/content/generate`: buildContextPack → generateText, výstup `_debug`
- `src/routes/design.js` – POST `/design/social-card/draft`: buildContextPack → generateDesignBackground + generateText, výstup `_debug`
- `src/routes/chat.js` – odeslání zprávy: buildContextPack → generateText (s `params.messages`), výstup `_debug`
- `src/marketing/adsStudio.js` – analyzeUrlAndDraftAds, getBrandContextFromUrl, generateImagesFromUrl, generateProductVariants: buildContextPack + generateText / generateBackgroundWithContext / generateFromImageWithContext
- `src/chat/threadSummary.js` – buildContextPack + generateText
- `src/context/contextEngine.js` – oprava výrazu pro `outputType` (kompatibilita)

---

## Co je přesměrováno na orchestrator

| Route / modul | Endpoint / funkce | Orchestrator metoda |
|---------------|-------------------|----------------------|
| **content** | POST `/api/content/generate` | generateText |
| **images** | POST `/api/images/compose` | generateImage |
| **design** | POST `/api/design/social-card/draft` | generateDesignBackground, generateText |
| **chat** | POST (send message) | generateText (s `params.messages`) |
| **adsStudio** | analyzeUrlAndDraftAds (URL → draft) | generateText |
| **adsStudio** | getBrandContextFromUrl | generateText |
| **adsStudio** | generateImagesFromUrl | generateText + generateBackgroundWithContext |
| **adsStudio** | generateProductVariants | generateText + generateFromImageWithContext |
| **threadSummary** | generateThreadSummary | generateText |

**Pozn.:** imageCompose (composeImageWithText) se volá jen z orchestratoru (generateImage); interně stále používá `generateBackground` a `llmChat`, ale vstup (prompt, industry) už pochází z ContextPacku.

---

## Debug režim (`?debug=1`)

- **Jak zapnout:** přidat do requestu query parametr `debug=1`, např. `POST /api/content/generate?debug=1` nebo `POST /api/images/compose?debug=1`.
- **Co hledat v odpovědi:** pole `_debug` (pokud je přítomné), např.:
  - `contextUsed` – použitý kontext (brief, resolvedIndustry, topicKeywords, …)
  - `finalSystemPrompt` / `finalUserPrompt` – (zkrácené) prompty odeslané do LLM
  - `providerPrompt` / `negativePrompt` – u obrázků co šlo do Replicate
  - `resolvedIndustry` – výsledný obor (včetně force rule „autobazar“ → automotive)

V dev (`NODE_ENV !== "production"`) je debug automaticky zapnutý u `/api/images/compose`.

---

## Debug endpoint (jen dev)

- **POST /api/debug/context**  
  Body stejné jako u jiných generací (např. `prompt`, `brief`, `industry`, `platform`, `outputType`).  
  Odpověď: `{ ok: true, contextPack }` – výsledek `buildContextPack` pro daný body.  
  V production vrací 404.

---

## Autobazar / automotive (globálně)

- V **contextEngine** platí force rule: brief obsahující „autobazar“, „dealer“, „prodej aut“, „ojeté vozy“ atd. → `resolvedIndustry = "automotive"`.
- Pro automotive se doplní **topicKeywords**: cars, used cars, dealership, showroom, financing, …
- Platí pro **všechny** typy výstupu (text, SEO, obrázky, video prompty), protože všechny cesty vedou přes `buildContextPack` a orchestrator.

---

## Deploy kroky

1. **Backend**
   - `pm2 restart neobot` (nebo název vaší app v pm2).
   - Případně `node server.js` pro ověření startu.

2. **Frontend**
   - Pokud měníte jen backend (context/orchestrator), stačí restart backendu.
   - Pokud přidáváte/upravujete FE volání (viz níže), znovu nasadit frontend (build + nakopírovat dist).

3. **Doporučení na FE**
   - U všech requestů, které spouštějí generování, posílat jednotně:
     - `prompt` / `userPrompt` / `brief` (klidně stejná hodnota).
     - `outputType`: např. `"ads_copy"`, `"seo_article"`, `"image"`, `"video_prompt"`, `"content_generate"`.
   - Při `?debug=1` kontrolovat v odpovědi pole `_debug`.
