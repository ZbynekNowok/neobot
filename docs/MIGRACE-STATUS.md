# Migrace NeoBot z Lovable na náš server – stav

Poslední aktualizace: 26. 2. 2025

---

## Co je hotové

1. **Frontend z Lovable v repu**
   - Složka: `frontend/neo-mind-guide-main/` (React + Vite + TypeScript, shadcn).
   - Nahraný jako ZIP (neo-mind-guide-main), nic jsme nemazali.

2. **Build**
   - `npm install` a `npm run build` proběhly úspěšně.
   - Výstup: `frontend/neo-mind-guide-main/dist/` (index.html, assets, favicon, robots.txt).

3. **API v kódu**
   - `NEOBOT_API_BASE = "https://api.neobot.cz"` je v `src/lib/neobot.ts` – frontend volá tvůj backend.

4. **Nginx config připraven**
   - Soubor: **`nginx-neobot.cz.conf`** v kořeni projektu.
   - Servíruje `dist/` pro `neobot.cz` a `www.neobot.cz` (port 80). SSL můžeš doplnit certbotem.

5. **DNS (ty jsi nechal být)**
   - `api.neobot.cz` → A 37.46.208.176 (beze změny).
   - Root `neobot.cz` → A 185.158.133.1 (změnit na 37.46.208.176, až bude nginx hotový).
   - `www` → CNAME na neo-mind-guide.lovable.app (změnit na neobot.cz nebo A na 37.46.208.176).

---

## Co zbývá udělat (ty na serveru)

1. **Nasazení frontendu do /var/www/neobot** (nginx nemá přístup do /home/vpsuser)
   ```bash
   sudo mkdir -p /var/www/neobot
   sudo cp -r /home/vpsuser/neobot/frontend/neo-mind-guide-main/dist/* /var/www/neobot/
   ```
2. **Aktualizace nginx configu** (root teď ukazuje na /var/www/neobot)
   ```bash
   sudo cp /home/vpsuser/neobot/nginx-neobot.cz.conf /etc/nginx/sites-available/neobot.cz
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **DNS**
   - U registrátora: root `neobot.cz` A → **37.46.208.176**.
   - `www.neobot.cz` → CNAME na `neobot.cz` (nebo A 37.46.208.176).

3. **SSL (volitelně hned)**
   - `sudo certbot --nginx -d neobot.cz -d www.neobot.cz`
   - V `nginx-neobot.cz.conf` pak odkomentovat blok listen 443 a certifikáty.

4. **Produkční build s API klíčem (když budeš chtít přihlášení)**
   - `cd frontend/neo-mind-guide-main && VITE_NEOBOT_API_KEY="nb_tvuj_klic" npm run build`
   - Tím se klíč dostane do bundlu; bez něj bude historie/API volání 401 do doby, než uživatel zadá klíč v UI.

---

## Shrnutí

- **Kód a build:** hotovo v tomto repu.
- **Servírování:** připravený config, stačí zkopírovat a reload nginx.
- **DNS:** jedna úprava (root + www na IP serveru), až budeš chtít přepnout provoz z Lovable.

Jakmile nginx reloadneš a DNS propaguje, neobot.cz bude běžet z tvého serveru se stejným designem.
