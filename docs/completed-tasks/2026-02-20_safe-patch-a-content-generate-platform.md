# 2026-02-20: Safe Patch pravidla + fix /api/content/generate platform

## Co jsme dnes udělali

### 1) Trvalá pravidla a paměť projektu (bez změny produkční logiky)
- **`.cursor/rules/neobot-safe-patch.md`** – SAFE PATCH MODE, TEST GATE, BEZPEČNOST, ARCHITEKTURA, DEPLOY INVARIANTY.
- **`docs/PROJECT_STATE.md`** – architektura NeoBot, stabilní endpointy, kritéria stability (`run-all.sh`), známé problémy.
- **`scripts/dev/start-session.sh`** – denní start: branch, commity, PROJECT_STATE, run-all → `scripts/tests/last-run.txt`.
- **`scripts/dev/pre-commit-check.sh`** – spustí run-all.sh, při FAIL exit 1, při PASS exit 0.
- **`AGENTS.md`** – odkaz na `.cursor/rules/neobot-safe-patch.md`.

### 2) Bugfix: /api/content/generate – platform validace
- **Příčina:** Platforma se brala jen z `body.settings.platform`; klient posílal `body.platform` → vždy prázdné → chyba "Platform must be 'facebook' or 'instagram'".
- **Úpravy v `src/routes/content.js`:**
  - Funkce **`getPlatform(req)`**: pořadí `body.platform` → `query.platform` → `body.meta?.platform` → `body.channel` → `body.settings?.platform`. Normalizace (trim, lowercase), aliasy `fb`→facebook, `ig`→instagram.
  - Validace jen `facebook` / `instagram`; při chybě srozumitelná hláška.
  - Při `?debug=1` v odpovědi `_debug.platformSource` a `_debug.platformValue`.
- **Testy:** V **`scripts/tests/run-all.sh`** přidána **Part F: Content generate platform** – body platform, query platform, invalid (tiktok) → 400.

## Kde to v kódu je

- Pravidla: `.cursor/rules/neobot-safe-patch.md`, `AGENTS.md`
- Stav projektu: `docs/PROJECT_STATE.md`
- Dev skripty: `scripts/dev/start-session.sh`, `scripts/dev/pre-commit-check.sh`
- Content route + getPlatform: `src/routes/content.js` (řádky cca 17–45, pak použití v handleru)
- Testy Part F: `scripts/tests/run-all.sh` (Part F před Part E)

## Jak ověřit

```bash
# Stav + testy
bash scripts/dev/start-session.sh

# Pre-commit (před commitem)
bash scripts/dev/pre-commit-check.sh
```

Curl:
- `POST http://127.0.0.1:8080/api/content/generate` s `{"prompt":"x","type":"ad","platform":"facebook"}` → nemá vracet chybu o platformě.
- `POST .../api/content/generate?platform=facebook` s `{"prompt":"x","type":"ad"}` → totéž.
- `platform:"tiktok"` → 400 s "Platform must be 'facebook' or 'instagram'".

## Stav na konec dne

- Testy: **PASS 13, FAIL 0** (po `pm2 restart neobot --update-env`).
- Změny v `content.js` a `run-all.sh` jsou hotové; commit připraven (bez push):
  - `git add src/routes/content.js scripts/tests/run-all.sh`
  - message: `NeoBot: fix /api/content/generate platform validation (body + query + meta/channel/settings), getPlatform, Part F tests`

## Zítra pokračovat

- Případně commit + push.
- Další úkoly podle toho, co budeš chtít řešit – pravidla a platform fix jsou hotové.
