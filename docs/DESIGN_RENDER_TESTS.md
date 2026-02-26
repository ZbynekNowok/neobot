# Design template renderer – testy

## Přehled

- **POST /api/design/render** – deterministické složení obrázku (background + text + logo) dle šablony.
- Šablony: `promo_v1`, `promo_v2`, `story_v1` (viz GET /api/design/templates).
- Formáty: `1:1`, `4:5`, `9:16`, `16:9` nebo `1080x1350` atd.

## 1) Seznam šablon

```bash
curl -s "http://localhost:3000/api/design/templates" | jq .
```

## 2) Render bez pozadí (solid barva)

Vyžaduje auth (x-api-key nebo v DEV x-dev-user-id).

```bash
# DEV
curl -s -X POST "http://localhost:3000/api/design/render" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "promo_v1",
    "format": "4:5",
    "copy": {
      "headline": "Jarní kolekce 2025",
      "subheadline": "Nové styly právě v prodeji.",
      "cta": "Prohlédnout",
      "footer": "#moda #jaro"
    },
    "brand": {
      "primary": "#2563eb",
      "secondary": "#7c3aed",
      "textColor": "#ffffff"
    },
    "options": { "darken": 0.2 }
  }' | jq .
```

Očekávaná odpověď: `{ "ok": true, "imageUrl": "/renders/<uuid>.png", "meta": { "templateId": "promo_v1", "format": "4:5", ... } }`.

Obrázek: `http://localhost:3000/renders/<uuid>.png`

## 3) Render s pozadím z URL

```bash
curl -s -X POST "http://localhost:3000/api/design/render" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "backgroundUrl": "https://picsum.photos/1080/1350",
    "templateId": "promo_v1",
    "format": "1080x1350",
    "copy": { "headline": "Akce", "subheadline": "Sleva 20 %", "cta": "Koupit" },
    "brand": { "primary": "#dc2626", "textColor": "#fff" }
  }' | jq .
```

## 4) Formáty 1:1 a 9:16

```bash
# 1080x1080
curl -s -X POST "http://localhost:3000/api/design/render" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"promo_v1","format":"1:1","copy":{"headline":"Square post","cta":"CTA"},"brand":{"primary":"#059669"}}' | jq .

# Story 9:16
curl -s -X POST "http://localhost:3000/api/design/render" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"story_v1","format":"9:16","copy":{"headline":"Story","subheadline":"Text","cta":"Swipe"},"brand":{"primary":"#7c3aed"}}' | jq .
```

## 5) Marketing flyer (job → design render)

Flyer job teď používá šablonový render místo Puppeteer. Po dokončení jobu je obrázek v `/renders/flyer-<jobId>.png` a záznam v `outputs` s typem `rendered_flyer`.

```bash
curl -s -X POST "http://localhost:3000/api/marketing/flyer" \
  -H "x-dev-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "fashion",
    "brand": { "name": "Test", "primary": "#2563eb" },
    "offer": { "headline": "Letní výprodej", "subheadline": "Až -50 %", "cta": "Nakupovat" },
    "format": "ig_post"
  }' | jq .

# Po dokončení jobu: GET /api/marketing/flyer/status/<jobId> -> png_url bude /renders/flyer-<jobId>.png
```

## Produkce

Použijte `x-api-key` místo `x-dev-user-id`; endpoint je stejný.
