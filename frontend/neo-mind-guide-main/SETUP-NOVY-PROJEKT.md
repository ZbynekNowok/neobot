# Přepnutí NeoBot na nový Supabase projekt (ZbynekNowok's Project)

Starý projekt (`ahyjonqtjidrhibwyyol`) není v tomto účtu k dispozici. Aplikace se přepne na projekt **ZbynekNowok's Project** (ref: `wezrqowuvinlzsyrjqfk`).

## 1. Získat API údaje z Supabase

1. Otevři projekt **ZbynekNowok's Project** v Supabase Dashboard.
2. V levém menu: **Project Settings** (ozubené kolečko dole).
3. V levém submenu: **API**.
4. Zkopíruj:
   - **Project URL** (např. `https://wezrqowuvinlzsyrjqfk.supabase.co`)
   - **anon public** klíč (sekce "Project API keys").

## 2. Upravit `.env` ve frontendu

V souboru `frontend/neo-mind-guide-main/.env` nastav:

```env
VITE_SUPABASE_PROJECT_ID="wezrqowuvinlzsyrjqfk"
VITE_SUPABASE_URL="https://wezrqowuvinlzsyrjqfk.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<sem vlož anon public klíč z kroku 1>"
```

(Zbytek řádků v `.env` nech beze změny.)

## 3. Nastavit databázi v novém projektu

1. V Supabase Dashboard v projektu **ZbynekNowok's Project** otevři **SQL Editor**.
2. Klikni **New query**.
3. Zkopíruj **celý obsah** souboru `frontend/neo-mind-guide-main/supabase/setup-new-project.sql`.
4. Vlož do editoru a klikni **Run** (nebo Ctrl+Enter).
5. Mělo by se zobrazit „Success“ – vytvoří se tabulky `profiles`, `content_plans` a politiky pro Storage.

## 4. Vytvořit bucket pro loga

1. V levém menu stejného projektu: **Storage**.
2. **New bucket**.
3. **Name:** `brand-logos`
4. **Public bucket:** zapni (ON).
5. **Create bucket**.

## 5. Restart aplikace

- Pokud běží dev server (`npm run dev`), zastav ho (Ctrl+C) a znovu spusť.
- Pokud používáš build, znovu nasaď / znovu spusť.

## 6. Přihlášení znovu

V novém projektu je prázdná databáze – **nejsou tam stará data ani účty**. V aplikaci:

1. Odhlásit se (pokud jsi přihlášen).
2. Znovu se **registrovat / přihlásit** (Steam nebo e‑mail podle toho, co aplikace nabízí).
3. Projít **onboarding** (firemní profil, logo atd.).
4. Nahrát logo – bucket `brand-logos` už bude existovat a upload by měl fungovat.

---

Po dokončení těchto kroků běží NeoBot na novém Supabase projektu a nahrávání loga by mělo fungovat.
