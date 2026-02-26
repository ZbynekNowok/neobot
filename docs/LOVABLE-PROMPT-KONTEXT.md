# Prompt / kontext pro Lovable projekt

Tento text můžeš zkopírovat do Lovable do souboru **`.cursorrules`**, **`CONTEXT.md`** nebo do popisu projektu, aby AI i ty věděli, jak napojit frontend na NeoBot API.

---

## Text ke zkopírování

```
NeoBot backend API: https://api.neobot.cz

- Všechny requesty na api.neobot.cz musí mít hlavičku: x-api-key: <workspace API klíč>.
- Klíč a base URL jsou v src/lib/neobot.ts (NEOBOT_API_BASE, NEOBOT_API_KEY).

Důležité endpointy:
- GET /api/outputs?limit=50 → historie výstupů (stránka Historie /app/historie). Odpověď: { ok: true, items: [] }.
- GET /api/me → workspace a využití (dashboard).
- POST /api/design/social-card/draft → Grafika s textem (body: goals, theme, keywords, product_description, format, style, palette, purpose).

Stránka Historie výstupů (/app/historie, HistoryPage) musí při načtení volat GET ${NEOBOT_API_BASE}/api/outputs?limit=50 s hlavičkou x-api-key a zobrazit data.items (nebo prázdný stav, pokud items.length === 0).
```

---

## Prompt pro „Ask Lovable“ (zkopíruj a vlož)

Toto můžeš vložit přímo do chatu **Ask Lovable**, aby opravil stránky Historie a SEO Historie:

```
Backend NeoBot je na https://api.neobot.cz. Každý request musí mít hlavičku x-api-key (hodnota z NEOBOT_API_KEY v src/lib/neobot.ts).

Prosím uprav:

1) Stránku Historie výstupů (/app/historie, HistoryPage):
   - Při načtení volej GET ${NEOBOT_API_BASE}/api/outputs?limit=50 s hlavičkou x-api-key (použij sdílený helper z neobot.ts, např. neobotFetch).
   - Zobraz data.items (tabulka nebo seznam). Když items.length === 0, zobraz prázdný stav typu „Zatím nemáš žádné výstupy“.

2) Stránku SEO Historie (/app/seo/historie, SeoHistoryPage):
   - Nepoužívej endpoint /api/seo/list (neexistuje, vrací 404).
   - Místo toho volej GET ${NEOBOT_API_BASE}/api/seo/history?limit=50 s hlavičkou x-api-key (stejný helper jako u Historie).
   - Odpověď je { ok: true, items: [] } – zobraz items. Prázdný stav, když items.length === 0.

Oba endpointy vrací pole items; každá položka má id, type, input, output, created_at. Používej vždy NEOBOT_API_BASE a x-api-key z src/lib/neobot.ts.

3) Aby se výstupy v historii opravdu objevily: po každém úspěšném vygenerování obsahu (text, SEO článek, SEO audit) zavolej POST ${NEOBOT_API_BASE}/api/outputs s hlavičkou x-api-key a body: { type: "content_generate" nebo "seo_generate" nebo "seo_audit", input: { ... co uživatel zadal }, output: { ... vygenerovaný výsledek } }. Backend to uloží a položky se zobrazí v Historie výstupů i v SEO Historie (podle type).
```

---

## Jeden kompletní prompt pro Ask Lovable (zkopíruj celý blok)

```
Backend NeoBot je na https://api.neobot.cz. Používej vždy NEOBOT_API_BASE a NEOBOT_API_KEY z src/lib/neobot.ts. Každý request na api.neobot.cz musí mít hlavičku x-api-key.

Úkoly:

1) Historie výstupů (/app/historie, HistoryPage)
   - Při načtení stránky volej GET ${NEOBOT_API_BASE}/api/outputs?limit=50 s hlavičkou x-api-key (použij sdílený helper, např. neobotFetch z neobot.ts).
   - Zobraz data.items. Každá položka má id, type, input, output, created_at. Podle type (content_generate, social_card_draft, seo_generate, seo_audit, …) můžeš filtrovat záložky (Textové, Obrázkové, SEO atd.). Když items.length === 0, zobraz prázdný stav: „Zatím nemáš žádné výstupy“.

2) SEO Historie (/app/seo/historie, SeoHistoryPage)
   - Nepoužívej /api/seo/list (neexistuje, 404). Volej GET ${NEOBOT_API_BASE}/api/seo/history?limit=50 s x-api-key.
   - Zobraz data.items (seo_generate, seo_audit). Prázdný stav, když items.length === 0.

3) Ukládání do historie (důležité – jinak historie zůstane prázdná)
   Po každém úspěšném vygenerování obsahu (ať už text, SEO článek, SEO audit, nebo jakýkoli výstup z tvého enginu) zavolej:
   POST ${NEOBOT_API_BASE}/api/outputs
   Hlavička: x-api-key
   Body (JSON): { "type": "<typ>", "input": { ... co uživatel zadal }, "output": { ... vygenerovaný výsledek } }
   Povolené type: content_generate (text), seo_generate (SEO článek), seo_audit (SEO audit), social_card_draft (grafika s textem – ten backend ukládá sám, ale pro konzistenci můžeš poslat taky).
   Bez tohoto POST se položky v Historie výstupů a SEO Historie nezobrazí – backend je jediný zdroj pravdy pro historii.
```

---

## Prompt: SEO jen v SEO Historie + oprava generování (zkopíruj do Ask Lovable)

Použij, když máš v hlavní historii SEO tam kde nemá, a když nejde generovat text ani obrázek:

```
Potřebuji dvě úpravy:

1) SEO jen na stránce SEO Historie – ne v hlavní Historie výstupů
   - Na stránce „Historie výstupů“ (/app/historie) odstraň záložku/filtr „SEO“ (a vyhledávací pole „Q SEO“ pokud je jen pro SEO). Hlavní historie má zobrazovat jen: Textové, Obrázkové, Video, Úpravy textu. SEO výstupy mají být pouze na stránce „SEO Historie“ (/app/seo/historie), ne v obecné historii tvorby obsahu.

2) Oprava generování textu a obrázku
   - Grafika s textem (obrázek): musí volat POST ${NEOBOT_API_BASE}/api/design/social-card/draft s hlavičkou x-api-key a body: goals, theme, keywords, product_description, format, style, palette, purpose. Ověř, že tlačítko „Vytvořit návrh“ na stránce Tvorba obsahu (Image workspace) volá přesně tento endpoint a že NEOBOT_API_KEY se posílá. Při 401 zkontroluj, že klíč je nastaven v neobot.ts / env.
   - Text: pokud generování textu jde přes api.neobot.cz, endpoint je POST /api/content/generate – ověř URL a x-api-key. Pokud text generuje Lovable Edge Function (generate-content), ověř, že se volá a že vrací výsledek do UI (ne 404/500).
   - V DevTools (Síť) zkontroluj, který request padá (status 401, 404, 500) a oprav buď URL, nebo hlavičku x-api-key, nebo tělo requestu.

Backend nyní vrací i GET /api/seo/audit/list?limit=20 (audity) – odpověď { ok: true, items: [] }. SeoHistoryPage může pro záložku „audity“ volat tento endpoint.
```

---

Konec promptu pro Lovable.
