# Shrnutí práce – 26. 2. 2026

## Co je hotové

### 1. Generování textu
- Route **POST /api/content/generate** v `src/routes/content.js`.
- Validace: prompt povinný, platforma jen facebook/instagram.
- Firemní profil se vkládá do LLM promptu (značka, obor, cílovka, USP, tón).
- Odstraňování letopočtů z textu/hashtagů (pokud uživatel v promptu rok nezmínil).
- Volitelné načtení LLM + fallback route, aby při chybějícím OPENAI_API_KEY byl 503 místo 404.

### 2. Backend – databáze a auth
- **src/db/database.js** – SQLite (better-sqlite3), tabulky workspaces, workspace_plans, workspace_members, workspace_users, workspace_usage, workspace_profile, outputs. Sloupec **brand_logo_url** v workspace_profile. Při prvním startu se vytvoří výchozí workspace.
- **src/usage/checkAndConsumeUsage.js** – getWorkspaceUsage(workspaceId), checkAndConsumeUsage(type) middleware.
- **src/auth/getAuthUser.js** – ověření x-api-key (API_KEY / NEOBOT_API_KEY) nebo x-dev-user-id (dev), nastavení req.workspaceId a req.user.
- **server.js** – namountované: designRouter, contentRouter, meRouter, workspaceProfileRouter. Fallback route pro POST /api/content/generate při selhání načtení content routeru.
- **.env** – OPENAI_API_KEY, API_KEY (pro frontend), REPLICATE_API_TOKEN, ADMIN_BOOTSTRAP_KEY. Do frontendu při buildu stejná hodnota jako API_KEY v proměnné VITE_NEOBOT_API_KEY.

### 3. Profil a obsah
- Po dokončení onboardingu: **syncWorkspaceProfileFromOnboarding(data, brandLogoUrl)** → POST /api/workspace/profile.
- Při uložení sekce na stránce Strategie: **syncWorkspaceProfileFromSupabaseProfile(profile)** → POST /api/workspace/profile.
- Frontend **fetchWorkspaceProfile()** bere odpověď z data.profile.
- Content generate i design (Grafika s textem) používají firemní profil.

### 4. Firemní logo
- **workspace_profile.brand_logo_url** – GET/POST /api/workspace/profile, design vrací template.logoUrl.
- **Strategie → Profil značky**: velký klikací box „Klikni a nahraj logo“ (min-h 160px / 200px, max-w 320px, responzivní, čtverec i obdélník). Skrytý `<input type="file">`, upload do Supabase Storage bucket **brand-logos**.
- Onboarding předává brandLogoUrl do syncWorkspaceProfileFromOnboarding.
- Logo na vygenerované „Grafika s textem“ – zobrazení v rohu náhledu (imageOutput.logoUrl).

### 5. Dashboard → Firemní profil
- Přejmenování: v menu i na stránce **„Firemní profil“** (dříve Dashboard).
- Dva boxy vedle sebe: **(1) Logo + firemní název** + tlačítko „Upravit profil a logo“ → /app/strategie. **(2) Úkoly na dnešní den** – červený okraj/pozadí když máš nesplněné úkoly, zelený když nemáš nebo vše hotovo.
- Na Firemním profilu se v levém boxu zobrazuje logo z profilu (nebo placeholder „Žádné logo“).

### 6. Úvodní dotazy (onboarding)
- Všechny otázky z Lovable jsou v **frontend/neo-mind-guide-main/src/pages/Onboarding.tsx** (kroky 1–15, business, fáze, ideální zákazník, problém zákazníka, USP, marketingové cíle, kanály, frekvence, struggle, klíčová slova, inspirace, očekávání od NeoBota). Data se ukládají do Supabase `profiles` a syncují na backend.

---

## Co zbývá (požadavek uživatele)

- **Firemní profil (dashboard)** – levý box s „Žádné logo“:
  - Po **kliknutí přímo na toto okno** otevřít nahrání loga (bez odchodu na Strategii). Tj. na stránce `/app` (DashboardPage) udělat logo box klikací, skrytý file input a upload do Supabase + aktualizace profilu (a volitelně sync na backend).
  - **Zvětšit** logo okno na Firemním profilu (např. 2× větší než současné).

---

## Důležité cesty

- Backend: `server.js`, `src/routes/content.js`, `src/routes/design.js`, `src/routes/me.js`, `src/routes/workspaceProfile.js`, `src/db/database.js`, `src/auth/getAuthUser.js`, `src/usage/checkAndConsumeUsage.js`.
- Frontend: `frontend/neo-mind-guide-main/` (Vite, port 8080 v dev). Firemní profil stránka: `src/pages/app/DashboardPage.tsx`. Strategie + logo upload: `src/pages/app/StrategyPage.tsx`. Onboarding: `src/pages/Onboarding.tsx`.
- API base: `https://api.neobot.cz`. Web: `https://neobot.cz`. Lokální náhled: `http://localhost:8080`.
- Nasazení frontu: `npm run build` v `frontend/neo-mind-guide-main`, pak `sudo cp -r dist/* /var/www/neobot/`.
