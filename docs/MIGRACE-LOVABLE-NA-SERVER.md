# Přesun webu z Lovable na vlastní server

## Shrnutí

Web z Lovable lze přesunout na tvůj server. Není to zásadní technický problém – jde hlavně o export kódu, úpravu auth/dat a nasazení. **Úpravy designu a kódu pak můžeš dělat přímo v Cursoru (já můžu editovat React/HTML/CSS)** – bez Lovable.

---

## Co bude potřeba

### 1. Export kódu z Lovable
- Z Lovable exportovat / stáhnout celý frontend (React + Vite + TypeScript, složka se zdrojáky).
- Přidat ho do tohoto repa (např. složka `frontend/` nebo `web/`) nebo do samostatného repa.

### 2. Auth a data
- **Lovable dnes:** pravděpodobně Supabase (přihlášení, `profiles`, `content_plans`).
- **Na tvém serveru:** buď:
  - **A)** Nechat Supabase jen pro auth a volitelně data (frontend dál volá Supabase + api.neobot.cz), nebo
  - **B)** Přesunout přihlášení na tvůj backend (session / JWT) a data do tvé DB (SQLite už máš – workspaces, outputs, workspace_profile). Pak by frontend volal jen api.neobot.cz.

### 3. Build a nasazení
- Frontend: `npm install`, `npm run build` → výstup do `dist/` (nebo `build/`).
- Na serveru: naservírovat obsah `dist/` – např. nginx jako statiku, nebo `express.static` v Node (třeba pod stejnou doménou jako API, nebo subdoména typu app.neobot.cz).
- Env: `NEOBOT_API_BASE` (a další) nastavit při buildu nebo v konfigu (podle toho, jak to máš v kódu).

### 4. Co tím získáš
- Jedno místo vývoje: vše v jednom repu (backend + frontend).
- Žádné čekání na propojení Lovable ↔ backend – frontend jen volá tvé API.
- **Úpravy designu a chování:** přímo v kódu (React komponenty, Tailwind, CSS). V Cursoru to jde dělat i bez Lovable – můžu navrhovat a psát změny v .tsx/.css a přizpůsobovat UI.

---

## Kde může být „problém“

- **Čas na migraci:** export, úprava auth (pokud přecházíš z Supabase na tvůj backend), otestování, nasazení.
- **Supabase:** pokud chceš úplně odejít od Lovable/Supabase, musíš nahradit přihlášení a případně profily/plány v tvé DB a v API.
- **Lovable už nebude:** žádný vizuální editor „Ask Lovable“ – změny se dělají v kódu (Cursor + já). To je zároveň výhoda: jeden zdroj pravdy, žádné dvojité propojení.

---

## Odpověď na „dokážeš dělat úpravy designu bez Lovable?“

**Ano.** Jakmile bude frontend v repozitáři (React/HTML/CSS/TS), můžu:
- měnit layout, styly, komponenty (Tailwind, CSS, shadcn/ui),
- upravovat stránky a formuláře,
- navrhovat a psát změny v souborech.

Lovable není potřeba – stačí kód v projektu a Cursor.
