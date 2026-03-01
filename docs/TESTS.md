# NeoBot – Test checklist

## Automatické testy (server)

Spusť ze kořene repozitáře:

```bash
./scripts/tests/run-all.sh
```

Vyžaduje: běžící backend na `http://127.0.0.1:8080` (nebo `BASE_URL`). Pro test render endpointu je potřeba alespoň jeden obrázek v `public/outputs/backgrounds/` nebo env `BACKGROUND_URL`. Pro test compose se volá Replicate (síť, API token).

Výstup: `[PASS]` / `[FAIL]` / `[SKIP]` / `[INFO]` a na konci souhrn. Exit kód 0 = vše PASS, jinak 1.

---

## Manuální UI testy (frontend)

### 1) Krokový průvodce – krok 1: výběr stylu obrázku (preset)

- Otevři modul „Grafika s textem“ (marketing).
- V kroku 1 (zadání briefu) ověř, že je vidět **výběr stylu obrázku (preset)**.
- Očekávané hodnoty: **Auto**, **Fotografický**, **Realistický**, **Filmový**, **Animace**, **Design** (nebo ekvivalent v češtině).
- **PASS:** Selector je vidět a obsahuje uvedené presety.

### 2) Style preset v payloadu

- V kroku 1 zvol např. **Realistický**.
- Otevři DevTools → záložka **Network**.
- Spusť generování obrázku („Generovat“ / „Vytvořit návrh“).
- V seznamu požadavků najdi **POST** na `/api/images/compose` (nebo ekvivalent).
- Otevři tělo požadavku (Request payload).
- **PASS:** V payloadu je pole **stylePreset** (např. `"realistic"` nebo `"realistický"` podle API).

### 3) Krok 3: tahání bez „Upravit design“

- Po vygenerování návrhu přejdi do **kroku 3 (Návrh)**.
- **Nepoužívej** tlačítko „Upravit design“ – overlay (nadpis / podnadpis / CTA) by měl být hned aktivní.
- Chyť a **přetáhni nadpis** (headline).
- **PASS:** Pozice se mění hned při tažení a náhled obrázku se během/po tažení aktualizuje (live render), bez nutnosti kliknout na „Upravit design“.

### 4) CTA – šířka, výška, velikost písma

- V kroku 3 vyber v panelu **CTA**.
- Změň **šířku tlačítka (%)** a **výšku tlačítka (%)** (slidery).
- Klikni na **„Použít změny“** (Apply).
- **PASS:** Velikost tlačítka na vykresleném obrázku se změní podle sliderů.
- Změň **Velikost písma** CTA (např. na 40 px nebo 60 px).
- Znovu **„Použít změny“**.
- **PASS:** Velikost textu CTA na obrázku se změní.

### 5) Anti-collage (9:16, více generací)

- V kroku 1 nastav formát **9:16** (story/portrét).
- Zadej např. brief: **„luxusní módní kolekce“**.
- Spusť **5× generování** (5 různých návrhů).
- U každého vygenerovaného obrázku zkontroluj, že **není rozdělen na dva panely** (split / diptych / koláž).
- **PASS:** Všechny vygenerované obrázky jsou jeden souvislý snímek, žádný „dva obrázky vedle sebe nebo pod sebou“.

---

## Rychlý přehled

| Test | Typ | Kritérium |
|------|-----|-----------|
| Style preset selector | UI | V kroku 1 jsou presety (Auto / Foto / Real / Film / Anim / Design). |
| stylePreset v requestu | Network | POST compose obsahuje `stylePreset`. |
| Tahání bez gatingu | UI | V kroku 3 jde táhnout overlay a náhled se mění bez „Upravit design“. |
| CTA width/height | UI | Změna sliderů šířky/výšky CTA + Apply změní velikost tlačítka. |
| CTA fontSize | UI | Změna velikosti písma CTA + Apply změní text na obrázku. |
| Anti-collage 9:16 | UI | 5× generování 9:16 bez split/koláže. |
