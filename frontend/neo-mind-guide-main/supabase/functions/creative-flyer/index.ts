import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function safeStr(v: unknown, max = 500): string {
  const s = typeof v === "string" ? v : "";
  return s.length > max ? s.slice(0, max) : s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await req.json();

    const format = safeStr(body.format, 30) || "square"; // square | story | wide
    const offer = safeStr(body.offer, 1000);
    const goal = safeStr(body.goal, 500);
    const audience = safeStr(body.audience, 500);
    const tone = safeStr(body.tone, 100) || "profesionální";
    const language = safeStr(body.language, 30) || "cs";
    const planId = safeStr(body.planId, 60);
    const itemId = safeStr(body.itemId, 10);

    if (!offer) {
      return new Response(
        JSON.stringify({ error: "Pole 'offer' je povinné." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Chybí LOVABLE_API_KEY." }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const aspectMap: Record<string, string> = {
      square: "1:1 (1080×1080)",
      story: "9:16 (1080×1920)",
      wide: "16:9 (1920×1080)",
    };
    const aspectDesc = aspectMap[format] || aspectMap.square;

    const systemPrompt = `Jsi profesionální grafický designér a copywriter pro letáky a bannery.
Tvým úkolem je vygenerovat kompletní textový a vizuální koncept letáku/banneru.

Odpověz POUZE v tomto JSON formátu (žádný jiný text):
{
  "headline": "hlavní nadpis letáku (max 8 slov)",
  "subheadline": "podnadpis (max 15 slov)",
  "body_text": "tělo letáku (max 3 krátké věty)",
  "cta": "výzva k akci (max 5 slov)",
  "visual_description": "popis vizuálu/pozadí pro grafika (1 odstavec)",
  "color_palette": ["barva1", "barva2", "barva3"],
  "layout_notes": "poznámky k layoutu",
  "image_prompt": "detailní prompt pro generování obrázku v angličtině, optimalizovaný pro AI image generátor"
}`;

    const userPrompt = `Vytvoř leták/banner s těmito parametry:
- Formát: ${aspectDesc}
- Nabídka/produkt: ${offer}
- Cíl: ${goal || "zvýšení prodejů"}
- Cílová skupina: ${audience || "neuvedeno"}
- Tón komunikace: ${tone}
- Jazyk: ${language === "cs" ? "čeština" : language}`;

    const aiRes = await fetch("https://api.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "Chyba AI generování." }),
        { status: 502, headers: jsonHeaders }
      );
    }

    const aiData = await aiRes.json();
    const rawContent = aiData?.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let flyerData: any = null;
    try {
      // Extract JSON from possible markdown code block
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) || rawContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawContent;
      flyerData = JSON.parse(jsonStr.trim());
    } catch {
      flyerData = {
        headline: "Leták",
        subheadline: "",
        body_text: rawContent,
        cta: "",
        visual_description: "",
        color_palette: [],
        layout_notes: "",
        image_prompt: "",
      };
    }

    // For MVP, no actual image generation – return the structured data
    const result = {
      finalImageUrl: null, // Will be filled when image engine is connected
      metadata: {
        format,
        aspectRatio: aspectDesc,
        ...flyerData,
      },
      planId: planId || null,
      itemId: itemId || null,
    };

    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (e) {
    console.error("creative-flyer error:", e);
    return new Response(
      JSON.stringify({ error: "Interní chyba serveru." }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
