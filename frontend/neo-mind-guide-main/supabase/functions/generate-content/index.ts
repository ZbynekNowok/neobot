import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sseHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
};

const jsonHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const styleLabels: Record<string, string> = {
  professional: "profesionální a věcný",
  friendly: "přátelský a osobní",
  sales: "prodejní a přesvědčivý",
  educational: "edukační a informativní",
  creative: "kreativní a originální",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  web: "webové stránky",
  email: "e-mailový marketing",
  ads: "reklamní platformy (Meta/Google)",
};

const goalLabels: Record<string, string> = {
  customers: "získání nových zákazníků",
  sales: "zvýšení prodejů",
  brand: "budování značky",
  followers: "získání sledujících",
  time: "úspora času",
};

const businessStageLabels: Record<string, string> = {
  idea: "nápad nebo plánování",
  starting: "rozjezd (první zákazníci)",
  growing: "růst (stabilní příjmy)",
  established: "zavedený byznys",
  scaling: "škálování",
};

const contentTypeLabels: Record<string, string> = {
  social: "příspěvek na sociální sítě",
  web: "text na web nebo blog",
  newsletter: "newsletter nebo e-mail",
  ads: "reklamní text",
};

const toneLabels: Record<string, string> = {
  formalni: "formální a profesionální",
  neformalni: "neformální a přátelský",
  hravy: "hravý a odlehčený",
  expertni: "expertní a autoritativní",
  presvedcivy: "přesvědčivý a prodejní",
  profesionalni: "profesionální",
  osobni: "osobní a přátelský",
  prodejni: "prodejní",
  informativni: "informativní",
  pratelsky: "přátelský",
};

// ✅ Povolené typy požadavků
const ALLOWED_TYPES = new Set([
  // Sociální sítě
  "first_content",
  "create_post",
  "change_tone",
  "new_variant",
  "change_platform",
  // Prodejní texty
  "ad_copy",
  "sales_copy",
  // Web & SEO
  "web_copy",
  "seo_article",
  "seo_meta",
  // E-maily
  "email_copy",
  // Produkty & Služby
  "product_description",
  "service_description",
  "faq",
  // Úpravy textu
  "rewrite",
  "simplify",
  "shorten",
  // Strategie & plánování
  "explain_strategy",
  "content_plan",
  "campaign",
  "recommend_topics",
]);

// Délkové rozsahy podle typu a volby
type LengthRange = { min: number; max: number };

function getLengthRange(type: string, uiLength: string): LengthRange {
  const len = (uiLength || "stredni").toLowerCase();

  // SEO článek má vlastní delší režimy
  if (type === "seo_article") {
    if (len === "kratky") return { min: 2200, max: 3500 };
    if (len === "dlouhy") return { min: 5500, max: 8000 };
    return { min: 3500, max: 5500 };
  }

  // Web copy (homepage/landing) má delší režimy
  if (type === "web_copy") {
    if (len === "kratky") return { min: 800, max: 1500 };
    if (len === "dlouhy") return { min: 2500, max: 4000 };
    return { min: 1500, max: 2500 };
  }

  // Default režim pro ostatní typy
  if (len === "kratky") return { min: 200, max: 400 };
  if (len === "dlouhy") return { min: 900, max: 1600 };
  return { min: 500, max: 900 }; // střední
}

function safeStr(v: unknown, maxLen = 500): string {
  const s = typeof v === "string" ? v : "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function safeArr(v: unknown, maxItems = 20, maxItemLen = 60): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((x) => safeStr(x, maxItemLen))
    .slice(0, maxItems);
}

// Denní zadání může přijít pod různými názvy
function pickDailyTask(body: any): string {
  const candidates = [
    body?.prompt,
    body?.task,
    body?.instruction,
    body?.input,
    body?.message,
    body?.text,
    body?.user_input,
    body?.userPrompt,
    body?.daily_prompt,
    body?.daily_task,
    body?.content_request,
  ];

  for (const c of candidates) {
    const s = safeStr(c, 2000).trim();
    if (s) return s;
  }
  return "";
}

// Mapování účelu z UI na český popis
const purposeLabels: Record<string, string> = {
  prodej: "prodej produktu/služby",
  engagement: "zvýšení interakce a dosahu",
  edukace: "edukace a předání hodnoty",
  brand: "budování povědomí o značce",
  kontakt: "získání kontaktu",
  informovani: "informování",
  onboarding: "onboarding nového zákazníka",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Nepodporovaná metoda." }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Neplatná data v požadavku." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const profile = body?.profile ?? null;
    const rawType = body?.type ?? "";
    const type = ALLOWED_TYPES.has(rawType) ? rawType : "first_content";

    // Extrakce UI settings
    const uiSettings = body?.settings ?? {};
    const uiPlatform = safeStr(uiSettings.platform, 30);
    const uiPurpose = safeStr(uiSettings.purpose, 30);
    const uiTone = safeStr(uiSettings.tone, 30);
    const uiLength = safeStr(uiSettings.length, 30) || "stredni";
    const uiTargetTone = safeStr(uiSettings.targetTone, 30);
    const uiNoHashtags = !!uiSettings.noHashtags;
    const uiRequireCTA = !!uiSettings.requireCTA;

    if (!profile || typeof profile !== "object") {
      return new Response(JSON.stringify({ error: "Chybí profil klienta." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Chybí klíč LOVABLE_API_KEY." }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    // Denní zadání (to, co dnes chce uživatel) – MÁ PRIORITU
    const dailyTask = pickDailyTask(body);

    // Extrahuj informace z profilu
    const business = safeStr(profile.business, 120);
    const business_stage = safeStr(profile.business_stage, 60);
    const ideal_customer = safeStr(profile.ideal_customer, 280);
    const customer_problem = safeStr(profile.customer_problem, 280);
    const customer_problem_other = safeStr(profile.customer_problem_other, 280);
    const unique_value = safeStr(profile.unique_value, 280);

    const marketing_goal = safeArr(profile.marketing_goal, 20, 40);
    const marketing_blocker = safeStr(profile.marketing_blocker, 160);

    const active_channels = safeArr(profile.active_channels, 10, 30);
    const priority_channel = safeStr(profile.priority_channel, 30);

    const communication_style = safeStr(profile.communication_style, 30);
    const brand_keywords = safeStr(profile.brand_keywords, 200);
    const inspiration_brands = safeStr(profile.inspiration_brands, 200);

    const content_type = safeStr(profile.content_type, 30);
    const profilePlatform = safeStr(profile.platform, 30);
    const goal = safeStr(profile.goal, 30);

    const content_frequency = safeStr(profile.content_frequency, 60);
    const content_struggle = safeStr(profile.content_struggle, 200);

    // HIERARCHIE: UI settings > profil
    const effectivePlatform = uiPlatform || profilePlatform || priority_channel;
    const effectivePurpose = uiPurpose;
    const effectiveTone = uiTone || communication_style;
    const effectiveLength = uiLength;

    // Popisky
    const styleDesc = toneLabels[effectiveTone] || styleLabels[effectiveTone] || effectiveTone || "neuvedeno";
    const contentDesc = contentTypeLabels[content_type] || content_type || "neuvedeno";
    const platformDesc = platformLabels[effectivePlatform] || effectivePlatform || "neuvedeno";
    const purposeDesc = purposeLabels[effectivePurpose] || effectivePurpose || "neuvedeno";
    const goalDesc = goalLabels[goal] || goal || "neuvedeno";
    const stageDesc = businessStageLabels[business_stage] || business_stage || "neuvedeno";

    const lengthRange = getLengthRange(type, effectiveLength);

    const marketingGoalsText =
      marketing_goal.length > 0
        ? marketing_goal.map((g) => goalLabels[g] || g).join(", ")
        : goalDesc;

    const channelsText =
      active_channels.length > 0
        ? active_channels.map((c) => platformLabels[c] || c).join(", ")
        : "neuvedeno";

    const customerProblemText = customer_problem_other || customer_problem || "neuvedeno";

    // ═══════════════════════════════════════════════════════════════
    // SYSTÉMOVÝ PROMPT
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = `Jsi NeoBot – marketingový copywriter.

══════════════════════════════════════════════════════════════════════
ABSOLUTNÍ PRAVIDLA (NEPORUŠIT)
══════════════════════════════════════════════════════════════════════

1️⃣ AKTUÁLNÍ VOLBA UŽIVATELE (z UI) – MÁ ABSOLUTNÍ PŘEDNOST:
   - Platforma: ${platformDesc}
   - Účel: ${purposeDesc}
   - Tón: ${styleDesc}
   - Délka: ${effectiveLength} (~${lengthRange.min}–${lengthRange.max} znaků)

2️⃣ DENNÍ ZADÁNÍ – určuje TÉMA / PRODUKT / KAMPAŇ (hlavní instrukce)

3️⃣ PROFIL FIRMY – pouze jako KONTEXT (obor, cílovka, značka)

══════════════════════════════════════════════════════════════════════
PROFIL KLIENTA (POUZE KONTEXT)
══════════════════════════════════════════════════════════════════════
📋 PODNIKÁNÍ:
- Obor/činnost: ${business || "neuvedeno"}
- Fáze podnikání: ${stageDesc}
- Jedinečná hodnota: ${unique_value || "neuvedeno"}

👥 CÍLOVÁ SKUPINA:
- Ideální zákazník: ${ideal_customer || "neuvedeno"}
- Hlavní problém zákazníka: ${customerProblemText}

🎯 MARKETING:
- Cíle: ${marketingGoalsText}
- Co brzdí marketing: ${marketing_blocker || "neuvedeno"}
- S čím bojuje v obsahu: ${content_struggle || "neuvedeno"}

📱 KANÁLY A OBSAH:
- Aktivní kanály: ${channelsText}
- Preferovaný typ obsahu: ${contentDesc}
- Frekvence tvorby: ${content_frequency || "neuvedeno"}

🗣️ HLAS ZNAČKY:
- Klíčová slova značky: ${brand_keywords || "neuvedeno"}
- Inspirační značky: ${inspiration_brands || "neuvedeno"}
`;

    // Denní zadání blok
    const dailyTaskBlock = dailyTask
      ? `═══════════════════════════════════════
DENNÍ ZADÁNÍ (HLAVNÍ ÚKOL)
═══════════════════════════════════════
${dailyTask}
`
      : "";

    // Dodatečná pravidla z UI
    const additionalRules: string[] = [];
    if (uiNoHashtags) additionalRules.push("Nepoužívej hashtagy.");
    if (uiRequireCTA) additionalRules.push("Na konci textu přidej 1 jasnou výzvu k akci (CTA).");

    const extraRulesText = additionalRules.length > 0 ? `\nDodatečná pravidla:\n- ${additionalRules.join("\n- ")}\n` : "";

    // ═══════════════════════════════════════════════════════════════
    // FORMÁT VÝSTUPU PRO PRODUKČNÍ TYPY (ne strategie)
    // ═══════════════════════════════════════════════════════════════
    const productionOutputFormat = `
═══════════════════════════════════════
FORMÁT VÝSTUPU (STRIKTNĚ DODRŽUJ)
═══════════════════════════════════════

ČÁST 1: TEXT
(Zde napiš POUZE hotový finální text k publikaci/použití. Bez nadpisů, bez komentářů, bez vysvětlení, bez „Tvůj marketingový směr", bez kroků. Délka: ${lengthRange.min}–${lengthRange.max} znaků.)

---

ČÁST 2: POZNÁMKY
Nejlepší čas publikace: (konkrétní den/hodina nebo „kdykoli")
Doporučený vizuál: (krátký popis vhodného obrázku/grafiky)
Tipy: (1–2 stručné tipy pro lepší výsledek)
`;

    // ═══════════════════════════════════════════════════════════════
    // USER PROMPT PODLE TYPU
    // ═══════════════════════════════════════════════════════════════
    let userPrompt = "";

    switch (type) {
      // ═══════════════════════════════════════
      // SOCIÁLNÍ SÍTĚ
      // ═══════════════════════════════════════
      case "create_post":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový PŘÍSPĚVEK pro ${platformDesc}.

DŮLEŽITÉ:
- Piš POUZE finální text příspěvku (žádné vysvětlování, žádná strategie)
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Styl: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "first_content":
        userPrompt = `${dailyTaskBlock}
Vytvoř první marketingový směr na základě profilu a denního zadání.

FORMÁT ODPOVĚDI:
**Tvůj první marketingový směr**
[Stručné shrnutí – 2-3 věty]

**Doporučené kroky:**
1. [krok]
2. [krok]
3. [krok]

**Proč tento přístup:**
[1-2 věty]`;
        break;

      // ═══════════════════════════════════════
      // PRODEJNÍ TEXTY
      // ═══════════════════════════════════════
      case "ad_copy":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový REKLAMNÍ TEXT.

DŮLEŽITÉ:
- Piš POUZE finální reklamní text připravený k použití v reklamě
- NIKDY nevysvětluj strategii, kroky ani „proč tento přístup"
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
- Cíl: ${purposeDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "sales_copy":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový PRODEJNÍ TEXT.

DŮLEŽITÉ:
- Piš POUZE finální prodejní text připravený k použití
- NIKDY nevysvětluj strategii, kroky ani „proč tento přístup"
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
- Cíl: ${purposeDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      // ═══════════════════════════════════════
      // WEB & SEO
      // ═══════════════════════════════════════
      case "web_copy":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový TEXT NA WEB (homepage / landing page / popis služby).

DŮLEŽITÉ:
- Piš POUZE finální text připravený k vložení na web
- Použij jasnou strukturu (nadpisy H1, H2, odstavce)
- NIKDY nevysvětluj strategii ani proces
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "seo_article":
        userPrompt = `${dailyTaskBlock}
Napiš hotový SEO ČLÁNEK / BLOG.

DŮLEŽITÉ:
- Piš POUZE finální článek připravený k publikaci
- Včetně H1, H2/H3 podnadpisů
- NIKDY nevysvětluj strategii ani proces
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "seo_meta":
        userPrompt = `${dailyTaskBlock}
Vytvoř META TITLE a META DESCRIPTION pro stránku.

DŮLEŽITÉ:
- Meta title: max 60 znaků, obsahuje hlavní klíčové slovo
- Meta description: 140–160 znaků, výzva k akci
- NIKDY nevysvětluj strategii

═══════════════════════════════════════
FORMÁT VÝSTUPU
═══════════════════════════════════════

ČÁST 1: TEXT
Meta title: [max 60 znaků]
Meta description: [140–160 znaků]

---

ČÁST 2: POZNÁMKY
Tipy: (1–2 SEO tipy pro lepší CTR)`;
        break;

      // ═══════════════════════════════════════
      // E-MAILY
      // ═══════════════════════════════════════
      case "email_copy":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový E-MAIL.

DŮLEŽITÉ:
- Piš POUZE finální e-mail připravený k odeslání
- NIKDY nevysvětluj strategii ani proces
- Žádné hashtagy, žádné zmínky o sociálních sítích
- Tón: ${styleDesc}
- Cíl: ${purposeDesc}
${extraRulesText}

═══════════════════════════════════════
FORMÁT VÝSTUPU
═══════════════════════════════════════

ČÁST 1: TEXT
Předmět: [předmět e-mailu]
Preheader: [krátký preview text]

[Tělo e-mailu - délka ${lengthRange.min}–${lengthRange.max} znaků]

---

ČÁST 2: POZNÁMKY
Nejlepší čas odeslání: (konkrétní den/hodina)
Tipy: (1–2 tipy pro vyšší open rate)`;
        break;

      // ═══════════════════════════════════════
      // PRODUKTY & SLUŽBY
      // ═══════════════════════════════════════
      case "product_description":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový POPIS PRODUKTU.

DŮLEŽITÉ:
- Piš POUZE finální popis produktu připravený k použití
- Zdůrazni benefity pro zákazníka
- NIKDY nevysvětluj strategii ani proces
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "service_description":
        userPrompt = `${dailyTaskBlock}
Vytvoř hotový POPIS SLUŽBY.

DŮLEŽITÉ:
- Piš POUZE finální popis služby připravený k použití
- Zdůrazni benefity pro zákazníka
- NIKDY nevysvětluj strategii ani proces
- Délka: ${lengthRange.min}–${lengthRange.max} znaků
- Tón: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "faq":
        userPrompt = `${dailyTaskBlock}
Vytvoř FAQ (časté otázky a odpovědi).

DŮLEŽITÉ:
- Piš POUZE hotové Q&A připravené k použití
- 3–5 relevantních otázek s odpověďmi
- NIKDY nevysvětluj strategii ani proces
- Tón: ${styleDesc}
${extraRulesText}
${productionOutputFormat}`;
        break;

      // ═══════════════════════════════════════
      // ÚPRAVY TEXTU
      // ═══════════════════════════════════════
      case "rewrite":
        userPrompt = `${dailyTaskBlock}
PŘEPIŠ tento text do nové podoby.

DŮLEŽITÉ:
- Vrať POUZE přepsaný text (bez vysvětlení, bez komentářů)
- Zachovej původní význam
- Délka výstupu podobná originálu
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "simplify":
        userPrompt = `${dailyTaskBlock}
ZJEDNODUŠ tento text.

DŮLEŽITÉ:
- Vrať POUZE zjednodušený text (bez vysvětlení, bez komentářů)
- Kratší věty, jednodušší slova
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "shorten":
        userPrompt = `${dailyTaskBlock}
ZKRAŤ tento text.

DŮLEŽITÉ:
- Vrať POUZE zkrácený text (bez vysvětlení, bez komentářů)
- Zachovej klíčové informace
${extraRulesText}
${productionOutputFormat}`;
        break;

      case "change_tone":
        userPrompt = `${dailyTaskBlock}
ZMĚŇ TÓN tohoto textu na: ${toneLabels[uiTargetTone] || uiTargetTone || styleDesc}

DŮLEŽITÉ:
- Vrať POUZE upravený text (bez vysvětlení, bez komentářů)
- Zachovej původní obsah a délku
${extraRulesText}
${productionOutputFormat}`;
        break;

      // ═══════════════════════════════════════
      // STRATEGIE & PLÁNOVÁNÍ (jediná sekce s analýzou)
      // ═══════════════════════════════════════
      case "content_plan": {
        // Get period from settings
        const planPeriod = uiSettings?.period === "mesic" ? 30 : 7;
        const planGoal = uiSettings?.goal || "růst";
        
        // Generate dates starting from today
        const startDate = new Date();
        const dateExamples = Array.from({ length: Math.min(planPeriod, 7) }, (_, i) => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          return d.toISOString().split("T")[0];
        });

        userPrompt = `${dailyTaskBlock}
Vytvoř STRUKTUROVANÝ OBSAHOVÝ PLÁN jako JSON pole.

OBDOBÍ: ${planPeriod === 30 ? "měsíc (30 dnů)" : "týden (7 dnů)"}
CÍL: ${planGoal}

STRIKTNÍ PRAVIDLA:
1. Vrať POUZE validní JSON pole (žádný text před ani po)
2. Každý den = jeden objekt v poli
3. Formát data: YYYY-MM-DD (začínej od ${dateExamples[0]})
4. Následující dny: ${dateExamples.slice(1, 4).join(", ")}...

POVINNÁ STRUKTURA KAŽDÉHO OBJEKTU:
{
  "day": "Pondělí", // Den v týdnu česky
  "date": "YYYY-MM-DD", // Datum
  "channel": "Instagram", // Kanál (Instagram/Facebook/TikTok/LinkedIn/Email/Web)
  "format": "Stories", // Formát (Stories/Post/Reel/Live/Carousel/Article/Newsletter)
  "task": "Popis co vytvořit", // Konkrétní úkol
  "goal": "Cíl příspěvku", // Proč to děláme
  "recommended_action": "Vytvořit Stories text" // Doporučená akce
}

PŘÍKLAD VÝSTUPU (vrať pouze toto, nic jiného):
[
  {"day":"Pondělí","date":"${dateExamples[0]}","channel":"Instagram","format":"Stories","task":"Ukázka zákulisí práce","goal":"Budování důvěry","recommended_action":"Vytvořit Stories text"},
  {"day":"Úterý","date":"${dateExamples[1] || dateExamples[0]}","channel":"Instagram","format":"Post","task":"Edukativní tip pro zákazníky","goal":"Přidání hodnoty","recommended_action":"Vytvořit text příspěvku"}
]

Vytvoř plán pro celé období (${planPeriod} dnů). Vrať POUZE JSON pole, žádný další text.`;
        break;
      }

      case "campaign":
        userPrompt = `${dailyTaskBlock}
Vytvoř návrh MARKETINGOVÉ KAMPANĚ.

Zde MŮŽEŠ použít analytický přístup:
- Navrhni strukturu kampaně
- Vysvětli strategii a důvody
- Doporuč kanály a formáty

Formát:
**Návrh kampaně**
[Strukturovaný návrh]

**Strategické poznámky:**
[Vysvětlení přístupu]`;
        break;

      case "recommend_topics":
        userPrompt = `${dailyTaskBlock}
Navrhni DOPORUČENÍ TÉMAT pro obsah.

Zde MŮŽEŠ použít analytický přístup:
- Navrhni konkrétní témata
- Vysvětli proč jsou relevantní
- Doporuč formáty

Formát:
**Doporučená témata**
1. [Téma] – [krátké vysvětlení]
2. [Téma] – [krátké vysvětlení]
...

**Strategické poznámky:**
[Vysvětlení přístupu]`;
        break;

      case "explain_strategy":
        userPrompt = `${dailyTaskBlock}
Stručně vysvětli strategii: proč tento formát, proč tento tón, jaký očekávaný efekt. Max 4 věty.`;
        break;

      case "new_variant":
        userPrompt = `${dailyTaskBlock}
Vytvoř NOVOU variantu obsahu pro ${platformDesc}. Jiný úhel pohledu, stejná délka a formát.
${productionOutputFormat}`;
        break;

      case "change_platform":
        userPrompt = `${dailyTaskBlock}
Přizpůsob obsah pro JINOU platformu (navrhni vhodnou alternativu k ${platformDesc}). Zachovej sdělení.
${productionOutputFormat}`;
        break;

      default:
        userPrompt = `${dailyTaskBlock}
Vytvoř nový ${contentDesc} pro ${platformDesc}.
${productionOutputFormat}`;
        break;
    }

    // Log (bez citlivých dat)
    console.log("generate-content request:", {
      type,
      hasDailyTask: !!dailyTask,
      platform: effectivePlatform || "unknown",
      length: effectiveLength,
      lengthRange,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků. Zkuste to později." }), {
          status: 429,
          headers: jsonHeaders,
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nedostatek kreditů. Doplňte kredit." }), {
          status: 402,
          headers: jsonHeaders,
        });
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText.slice(0, 500));
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(response.body, { headers: sseHeaders });
  } catch (error) {
    console.error("generate-content error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Neznámá chyba" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
