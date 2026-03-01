# SAFE PATCH MODE (POVINNÉ)

Agent MUSÍ vždy:

- Provádět pouze minimální změny nutné pro opravu problému
- Nikdy refaktorovat nesouvisející části
- Nikdy neměnit fungující kód bez důvodu
- Zachovat zpětnou kompatibilitu API
- Nikdy neměnit návratové typy bez backward kompatibility
- Opravovat vždy pouze jeden FAIL test najednou

Po každé změně MUSÍ:

Spustit: `bash scripts/tests/run-all.sh`

Nikdy necommitovat pokud existuje FAIL.

---

# TEST GATE (POVINNÉ)

Před jakoukoliv změnou MUSÍ agent spustit: `bash scripts/tests/run-all.sh`

Uložit výstup do:

```
scripts/tests/last-run.txt
```

Před commitem MUSÍ agent spustit: `bash scripts/dev/pre-commit-check.sh`

Commit je zakázán pokud existuje FAIL.

---

# BEZPEČNOST (POVINNÉ)

Agent NIKDY nesmí:

- zobrazit obsah .env
- zobrazit API klíče
- spustit pm2 describe
- logovat environment variables

.env musí zůstat v .gitignore

---

# ARCHITEKTURA (POVINNÉ)

Agent MUSÍ vždy zachovat:

ContextPack → Orchestrator → Provider

Agent NESMÍ:

- volat route → provider napřímo

Pro debug používat:

?debug=1

---

# DEPLOY INVARIANTY

Backend MUSÍ běžet na portu:

8080

nginx MUSÍ proxy na:

127.0.0.1:8080

Endpoint MUSÍ fungovat:

GET /api/status
