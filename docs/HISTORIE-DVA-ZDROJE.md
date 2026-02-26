# Historie výstupů – dva zdroje dat („dva enginy“)

## Situace

- **Včera** jsi měl v historii ~18 položek textového NeoBota a ~8 obrázkového (ne „grafika s textem“). Ty položky nejspíš **nešly přes api.neobot.cz** – byly uložené v **Lovable** (Supabase, `useTaskOutputSaver`, nebo jiné úložiště v rámci Lovable).
- **Grafika s textem** je generovaná **jen na backendu** (api.neobot.cz) – endpoint POST `/api/design/social-card/draft`. Zbytek (textový obsah, „obyčejné“ obrázky) může být generovaný v Lovable (Edge Functions, klient) a ukládaný v Lovable.

Výsledek: **dva „enginy“** = dvě úložiště:

| Kde se generuje | Kde se ukládá (doposud) | Co naplňuje GET /api/outputs |
|-----------------|-------------------------|------------------------------|
| **Lovable** (text, část obrázků) | Lovable / Supabase / lokální stav | nic – na backend to neposíláte |
| **Backend** (grafika s textem) | tabulka `outputs` na api.neobot.cz | ano – od chvíle, kdy design route volá saveOutput |

Pokud stránka **Historie** v Lovable čte **jen** z GET `/api/outputs` (náš backend), uvidíš **jen to, co backend sám uložil** – tedy zatím prakticky jen nové „grafika s textem“ (a cokoliv, co Lovable pošle přes POST `/api/outputs`). Těch 18+8 z včerejška v naší DB není.

---

## Co je na backendu hotové

1. **Grafika s textem** – po úspěšném vygenerování backend sám volá `saveOutput(..., "social_card_draft", ...)`. Položky se zapisují do `outputs` a objeví se v GET `/api/outputs`. (Platí po nasazení a restartu serveru.)
2. **POST /api/outputs** – Lovable může po **jakémkoli** vygenerování (text, SEO, obrázek) poslat výstup na backend:  
   `POST /api/outputs` s body `{ type, input, output }`. Backend to uloží a položky se zobrazí v historii.

---

## Jak sjednotit historii (doporučení)

**Varianta A – jedna historie na backendu (doporučené)**  
- Stránka **Historie** v Lovable čte **jen** GET `/api/outputs` (a případně GET `/api/seo/history`).  
- Po **každém** vygenerování v Lovable (text, SEO, obrázek – bez ohledu na to, kde to běželo) Lovable zavolá **POST /api/outputs** s `type`, `input`, `output`.  
- Všechny výstupy pak budou v jedné tabulce na backendu a historie bude konzistentní.  
- Staré položky (18+8) z Lovable do backendu nejdou doplnit automaticky – jen ručně nebo migrací, pokud je Lovable někde má uložené.

**Varianta B – dvě úložiště**  
- Historie zobrazuje data z Lovable (Supabase / lokální) **a** z GET `/api/outputs`. To znamená v Lovable sloučit dva zdroje (např. dva requesty) a zobrazit je v jednom seznamu. Je to složitější a může být nekonzistence (duplicity, jiné formáty).

---

## Tvé 4 vygenerované „grafika s textem“ z dneška

- Pokud byly vygenerované **před** nasazením úpravy s `saveOutput` v design route (nebo před restartem serveru), backend je **neuložil** – v GET `/api/outputs` je mít nebudeš.  
- Od nasazení a restartu se každé další vygenerování „grafika s textem“ už ukládá a v historii se zobrazí.

Shrnutí: ano, „grafika s textem“ je jiný engine (náš backend), zatímco text a část obrázků jde přes Lovable. Proto může být historie rozbitá na dvě části. Řešení je buď všechno zapisovat na backend přes POST `/api/outputs`, nebo v Lovable zobrazovat historii ze dvou zdrojů.
