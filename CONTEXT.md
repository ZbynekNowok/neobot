# Kontext projektu NeoBot

Tento soubor popisuje **celý projekt**: Lovable (frontend/app) i backend (api.neobot.cz, tento repozitář). Pro přehled hotového kódu na backendu viz `docs/completed-tasks/00-PREHLED-CO-JE-HOTOVE.md`.

---

## 📁 Struktura projektu – Lovable (frontend)

### 🌐 Landing / Veřejné stránky
- **`/`** – Landing page (`Index.tsx`) s hero, value proposition, use cases, how it works, demo, CTA, footer
- **`/funkce`** – Funkce (`Funkce.tsx`)
- **`/cenik`** – Ceník (`Cenik.tsx`)
- **`/navody`** – Návody (`Navody.tsx`)
- **`/novinky`** – Novinky (`Novinky.tsx`)
- **`/o-nas`** – O nás (`ONas.tsx`)
- **`/prihlasit`** – Přihlášení (`Prihlasit.tsx`)
- **`/start`** – Start page (`Start.tsx`)
- **`/onboarding`** – Onboarding průvodce (`Onboarding.tsx`)
- **`/admin`** – Admin panel (`Admin.tsx`)

### Landing komponenty
`src/components/landing/`: Navbar, HeroSection, ValuePropositionSection, ProblemSolutionSection, UseCasesSection, HowItWorksSection, InteractiveDemoSection, TargetAudienceSection, ConversationPreview, FinalCTASection, Footer

---

### 🖥️ App (autentizovaná část) – `/app/*`
Layout: `AppLayout.tsx` + `AppSidebar.tsx`

| Route | Stránka | Popis |
|-------|---------|--------|
| `/app` | `DashboardPage` | Hlavní dashboard |
| `/app/strategie` | `StrategyPage` | Strategie |
| `/app/plan` | `ContentPlanPage` | Obsahový plán / kalendář |
| `/app/tvorba` | `ContentCreationPage` | Tvorba obsahu (výběr NeoBota) |
| `/app/historie` | `HistoryPage` | Historie výstupů |
| `/app/nastaveni` | `SettingsPage` | Nastavení |
| `/app/seo/generator` | `SeoGeneratorPage` | SEO generátor |
| `/app/seo/audit` | `SeoAuditPage` | SEO audit |
| `/app/seo/historie` | `SeoHistoryPage` | SEO historie |
| `/app/publish` | `PublishCenterPage` | Publikační centrum |
| `/app/publish/connections` | `ConnectionsPage` | Propojení platforem |

---

### 🤖 NeoBot Workspaces (tvorba obsahu)
- **TextNeoBotWorkspace** – textový obsah (příspěvky, e-maily, web/SEO, produkty, sales, transformace)
- **ImageNeoBotWorkspace** – grafika (AI obrázky + „Grafika s textem" = marketing social card s konzultačním formulářem: goals, theme, keywords, product_description, format, style, palette, purpose)
- **VideoNeoBotWorkspace** – video scénáře (Reels, Shorts)
- **StrategyNeoBotWorkspace** – strategické plánování

### Text workspace moduly (`src/components/app/text-workspaces/`)
- `SalesWorkspace` – prodejní texty
- `WebSeoWorkspace` – web/SEO texty
- `EmailWorkspace` – e-maily
- `ProductsWorkspace` – produktové popisky
- `TransformWorkspace` – úpravy textu (přeformulovat, zkrátit, přeložit)
- `StrategyPlanningWorkspace` – strategické plánování
- `OutputDisplay` – zobrazení výstupu
- `SettingsToggle` – nastavení tónu/stylu
- `WorkspaceHeader` – hlavička workspace
- `useTextGeneration.ts` – hook pro generování textu (volá `POST /api/content/generate`)
- `types.ts` – sdílené typy (TextSection, ParsedOutput, WorkspaceProps…)

---

### 📅 Content Calendar (`src/components/app/content-calendar/`)
- `ContentCalendar` – hlavní kalendář
- `CalendarGrid` – mřížka
- `TaskDetailModal` – detail úkolu
- `types.ts` – ContentTask, ContentPlan, formátové barvy, ikony kanálů

---

### 🔧 App komponenty
- `AppLayout.tsx` – layout s profilem (UserProfile interface)
- `AppSidebar.tsx` – postranní menu
- `BusinessEditorModal.tsx` – editor firmy
- `NeoBotSteps.tsx` – průvodce kroky
- `QuickSettings.tsx` – rychlé nastavení
- `TaskContextBanner.tsx` – banner kontextu úkolu
- `UnifiedOutput.tsx` – sjednocený výstup
- `VideoScriptOutput.tsx` – výstup video scénáře
- `NavLink.tsx` – navigační odkaz

---

### ⚡ Backend (Edge Functions) – Lovable
- **`generate-content`** – generování textového obsahu
- **`creative-flyer`** – kreativní grafika
- **`api-proxy`** – API proxy
- **`admin-users`** – správa uživatelů

Konfigurace: `supabase/config.toml` – všechny funkce mají `verify_jwt = false`

---

### 🗃️ Databáze (Lovable Cloud)
**Tabulky:**
1. **`profiles`** – uživatelské profily (brand_name, business, ideal_customer, communication_style, unique_value, goal, brand_keywords, active_channels, onboarding stav, marketing cíle…)
2. **`content_plans`** – obsahové plány (name, period, goal, tasks jako JSON, user_id)

**Funkce:** `update_task_status(plan_id, task_index, new_status)`

---

### 🔌 Integrace & Utility (Lovable)
- `src/lib/neobot.ts` – NEOBOT_API_BASE, NEOBOT_API_KEY, fetchWorkspaceProfile
- `src/lib/api.ts` – API helpers
- `src/lib/utils.ts` – cn() utility
- `src/integrations/supabase/client.ts` – Supabase klient (auto-generated)
- `src/hooks/useDecisionEngine.ts` – rozhodovací engine
- `src/hooks/useTaskOutputSaver.ts` – ukládání výstupů úkolů
- `src/hooks/use-mobile.tsx` – detekce mobilů
- `src/hooks/use-toast.ts` – toast notifikace

---

### 🎨 UI knihovna (Lovable)
Kompletní **shadcn/ui** sada: accordion, alert, avatar, badge, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toggle, tooltip

---

### 📦 Tech stack (Lovable)
React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + TanStack React Query + React Router DOM + Recharts + Framer Motion (sonner) + date-fns + Zod + React Hook Form

### 🖼️ Assets (Lovable)
- `src/assets/neobot-icon.png`
- `src/assets/neobot-logo.png`

---

## 🔗 Mapování Lovable → Backend API (api.neobot.cz)

Lovable volá **https://api.neobot.cz** s hlavičkou **`x-api-key`** (workspace API klíč). NEOBOT_API_BASE / NEOBOT_API_KEY v `src/lib/neobot.ts`.

| Lovable stránka / funkce | Backend endpoint | Poznámka |
|--------------------------|------------------|----------|
| **Historie výstupů** (`/app/historie`, HistoryPage) | GET `/api/outputs?limit=50` | Vrací `{ ok: true, items: [...] }`. Položky z tabulky `outputs`. |
| **Grafika s textem** (ImageNeoBotWorkspace – social card) | POST `/api/design/social-card/draft` | Body: goals, theme, keywords, product_description, format, style, palette, purpose. Odpověď: `{ ok: true, template }` (background URL, texts, layout.slots). Profil načten z DB podle workspace. |
| **Profil firmy / workspace** (BusinessEditorModal, fetchWorkspaceProfile) | GET `/api/workspace/profile`, POST `/api/workspace/profile` | V tomto repu v kódu (`workspaceProfile.js`), v aktuálním server.js není namountované – viz `docs/completed-tasks/`. |
| **Dashboard / využití** | GET `/api/me` | Workspace, usage (used/limit/remaining), auth mode. |
| **Textový obsah** (useTextGeneration → POST /api/content/generate) | (Lovable Edge Function `generate-content` nebo proxy na backend) | Backend v tomto repu může mít vlastní route pro content/generate; aktuálně v server.js není. |

**Shrnutí:** V produkčním server.js jsou namountované: **health**, **design** (social-card/draft), **me** + **outputs/list**. Historie = GET `/api/outputs`. Grafika s textem = POST `/api/design/social-card/draft`. Ostatní (chat, workspace profile, publish, …) jsou v kódu, ale pro „slim“ deploy nejsou v server.js – viz `docs/completed-tasks/00-PREHLED-CO-JE-HOTOVE.md`.
