# NeoBot – Stav projektu a trvalá paměť

## Aktuální architektura NeoBot

- **Request** → route (images, content, chat, …) → **buildContextPack** (Context Engine) → **Orchestrator** (generate.js) → **Provider** (Replicate, LLM, imageCompose).
- Všechny generace procházejí **ContextPack** a **Orchestrator**; žádné přímé volání route → provider.
- Obrázky: ContextPack → generateImage → composeImageWithText / generateBackground → replicate.run (SDXL).
- Text: ContextPack → generateText → llmChat.

## Stabilní endpointy

| Metoda | Endpoint | Popis |
|--------|----------|--------|
| GET | /api/status | Stav služby (status, service, uptime) |
| POST | /api/images/compose | Skládaná grafika (background + texty + layout) |
| POST | /api/images/compose/render | Re-render kompozice (background + layers, bez nového pozadí) |

## Kritéria stability

- **Skript:** `scripts/tests/run-all.sh`
- **PASS** = vše OK, změny lze commitovat.
- **FAIL** = nesmí být commit; opravit před dalším commitem.

## Známé problémy

- **nginx port mismatch** – proxy musí být na `127.0.0.1:8080`; oprava: `scripts/fix-nginx-port.sh`.
- **Změna návratových typů builderu** – `buildMasterImagePrompt` vrací objekt `{ prompt, negativePrompt }`; všichni volající musí podporovat zpětnou kompatibilitu (string vs object).
