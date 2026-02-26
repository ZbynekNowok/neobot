# Splněné úkoly

Složka slouží jako **paměť projektu**: každý splněný úkol se zapisuje sem, aby v dalších chatech (nebo při onboardingu) bylo jasné, co už je hotové.

## Konvence

- **Jeden úkol = jeden soubor**  
  Název: `YYYY-MM-DD_kratky-popis.md` (datum dokončení + slug).
- **Obsah:** stručně *co* bylo uděláno, *kde* v kódu to je, případně *jak* to ověřit.

## Přehled

- **`00-PREHLED-CO-JE-HOTOVE.md`** – index: co běží v server.js, co je v kódu ale není namountované, auth, DB, frontend, odkazy na ostatní záznamy. Na začátku konverzace si ho přečti.

## Příklady

- `2025-02-19_historie-vystupu-api.md` – GET `/api/outputs`, `me.js`, tabulka `outputs`, fallback v `server.js`.
- `2025-02-20_design-social-card-replicate.md` – POST `/api/design/social-card/draft`, Replicate + LLM texty.
- `2025-02-20_chat-brand-rbac-saas.md` – Chat, workspace profil, RBAC, SaaS API klíče (v kódu; v aktuálním server.js nejsou mountované).

---

Při dokončení nového úkolu přidej nový soubor (nebo doplň tento README podle potřeby).
