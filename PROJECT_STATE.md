# NeoBot – Project State

## 🧠 Project Overview
NeoBot je produkční AI marketingový konzultant.
Nejde o demo ani ChatGPT klon – cílem je řízený dialog, sběr kontextu a konkrétní doporučení.

Backend je „mozek“, frontend je hloupý klient.

---

## 🏗️ Aktuální architektura (HOTOVO)

### Server
- VPS: Ubuntu 24.04
- Node.js + Express
- PM2 (process name: `neobot`)
- Port: `3000`

### Backend soubory
- `server.js` – API, routing
- `decisionTree.js` – řízení dialogu (onboarding → strategie)
- `llm.js` – OpenAI API wrapper (stručné, strukturované odpovědi)
- `memory.js` – session paměť (in-memory)
- `profile.json` – placeholder pro budoucí profil uživatele
- `ecosystem.config.js` – PM2 config (BEZ tajných klíčů)

### Frontend
- `chat.html`
- jednoduchý web chat
- historie ukládána v `localStorage`
- odpovědi zobrazovány po řádcích
- frontend neobsahuje žádnou logiku rozhodování

---

## 🔐 Bezpečnost
- OpenAI API key **NENÍ v kódu**
- API key je dostupný pouze přes `process.env.OPENAI_API_KEY`
- `.env` je v `.gitignore`
- `node_modules` nejsou verzované
- GitHub Secret Scanning je aktivní a ověřený

---

## 🚦 Aktuální stav
- Server běží stabilně
- API endpoint: `POST /think/chat`
- NeoBot odpovídá
- Žádné 401 chyby
- Žádné pády
- GitHub repo je veřejné a čisté

Repo:
https://github.com/ZbynekNowok/neobot

---

## 🧭 Koncept řízení
- Rozhodovací logika je **výhradně na serveru**
- LLM „přemýšlí“, ale **nesmí řídit tok**
- DecisionTree určuje:
  - fázi dialogu
  - další otázky
  - směr konverzace

NeoBot:
- klade správné otázky
- sbírá kontext
- dává konkrétní doporučení
- nemluví obecně

---

## 🗺️ Roadmapa (DODRŽUJE SE POŘADÍ)

### EPIC 1 – Výkon & UX
- TASK 1.1 – Okamžitá odezva UI ⬅️ **AKTUÁLNÍ**
- TASK 1.2 – Streaming odpovědi
- TASK 1.3 – Ořezání kontextu

### EPIC 2 – Logika chatu
- TASK 2.1 – Oddělení módů (onboarding / volný chat)
- TASK 2.2 – Lock na otázky

### EPIC 3 – Paměť & data
- TASK 3.1 – Server-side persistence
- TASK 3.2 – Profil uživatele

### EPIC 4 – Role NeoBota
- TASK 4.1 – Přepínač role (konzultant / copywriter / stratég)

### EPIC 5 – Produkce
- TASK 5.1 – Rate limit
- TASK 5.2 – Bezpečnost

---

## ⚠️ Pravidla pro další vývoj
- vždy navazovat na existující stav
- řešit vždy **jen jeden task**
- nezačínat další task bez potvrzení
- při návrhu změny vždy říct:
  - proč
  - který soubor
  - co přesně se změní
- kód psát vždy jako **CELÝ SOUBOR k nahrazení**
- žádné mazání dat
- žádné resetování serveru
- žádné změny ENV nebo API klíčů
