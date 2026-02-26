# Shrnutí 26. 2. 2025 – historie, SEO, generování, Lovable

**Datum:** 2025-02-26  
**Stav:** uloženo pro pokračování zítra

## Co jsme dělali

### 1. Historie výstupů
- **GET /api/outputs** – jedna historie, bez category filtru (zpět do stavu „jako ráno“).
- **GET /api/seo/history** – znovu přidáno, aby SEO Historie na Lovable nedostávala 404 (Lovable volal /api/seo/list, ten neexistoval).
- **GET /api/seo/audit/list** – přidáno v me.js (položky type = seo_audit), fallback ve server.js. Lovable záložka „audity“ ho volá.

### 2. Ukládání do historie (proč byla prázdná)
- **saveOutput** se nikde nevolal – výstupy se neukládaly. Přidáno:
  - **design.js** – po úspěšném vygenerování „Grafika s textem“ volá saveOutput(..., "social_card_draft", ...).
  - **POST /api/outputs** v me.js – Lovable může po každém vygenerování (text, SEO) poslat výstup na backend (type: content_generate, seo_generate, seo_audit), aby se položky zobrazily v Historie výstupů i SEO Historie.

### 3. Dva zdroje dat („dva enginy“)
- Textový obsah a část obrázků = Lovable (Supabase / useTaskOutputSaver). Grafika s textem = náš backend (design/social-card/draft). Proto 18+8 položek z včerejška v GET /api/outputs nebyly – byly v Lovable. Doporučení: vše ukládat na backend přes POST /api/outputs (jedna zdroj pravdy). Viz **docs/HISTORIE-DVA-ZDROJE.md**.

### 4. Lovable – prompty a návody
- **docs/LOVABLE-PROMPT-KONTEXT.md** – kontext + několik promptů pro Ask Lovable:
  - Načítání historie: GET /api/outputs, GET /api/seo/history, GET /api/seo/audit/list.
  - Ukládání: po každém generování volat POST /api/outputs s type, input, output.
  - SEO jen na stránce SEO Historie: z hlavní Historie výstupů odstranit záložku/filtr SEO.
  - Oprava generování: ověřit, že „Grafika s textem“ volá POST /api/design/social-card/draft s x-api-key; text buď POST /api/content/generate (backend), nebo Edge Function – zkontrolovat v DevTools který request padá (401/404/500).

### 5. Problémy, které uživatel popisoval
- „Historie prázdná“ – příčina: backend neukládal výstupy; řešení: saveOutput v design.js + POST /api/outputs pro Lovable.
- „SEO tam kde nemá“ – SEO má být jen na /app/seo/historie, ne v hlavní Historie výstupů; prompt pro Lovable na odstranění SEO záložky/filtru z /app/historie.
- „Nejde generovat text ani obrázek“ – ověřit v Lovable URL a x-api-key pro design endpoint a pro text (content/generate nebo Edge Function); backend má design, content/generate v tomto server.js není namountovaný.

## Soubory změněné / vytvořené dnes
- src/routes/me.js – POST /api/outputs, GET /api/seo/history, GET /api/seo/audit/list.
- src/routes/design.js – saveOutput po úspěšném social-card/draft.
- server.js – fallbacky pro /api/seo/history, /api/seo/audit/list.
- docs/HISTORIE-DVA-ZDROJE.md – vysvětlení dvou zdrojů dat.
- docs/LOVABLE-PROMPT-KONTEXT.md – rozšířeno o prompty (historie, ukládání, SEO jen v SEO Historie, oprava generování).
- docs/LOVABLE-HISTORIE-VYSTUPU.md – návod pro Lovable.
- docs/completed-tasks/2025-02-26_historie-seo-generovani-lovable.md – tento soubor.

## Na zítra / dokončit
- Ověřit na Lovable, že po promptech: (1) SEO je jen v SEO Historie, (2) generování textu a obrázku funguje (správné endpointy a x-api-key).
- Pokud text má generovat backend, zvážit namountování content/generate route v server.js (v kódu existuje odkaz v docs, route v tomto slim serveru není).
