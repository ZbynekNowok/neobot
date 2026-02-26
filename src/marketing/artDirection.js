const { llmChat } = require("../llm/llmGateway.js");

const LAYOUT_VARIANTS = [
  "left_stack",
  "bottom_band",
  "center_card",
  "split",
  "top_banner",
  "corner_badge",
];

const OVERLAY_TYPES = ["gradient", "blur_card", "solid_band"];

/**
 * Generate AI art direction for marketing flyer
 */
async function generateArtDirection(industry, brand, offer, requestId) {
  const prompt = `Jsi kreativní ředitel pro marketingové letáky. Vytvoř art direction pro leták pro obor: "${industry}", značka: "${brand.name}", barvy: ${brand.primary} / ${brand.accent}.

Nabídka:
- Headline: ${offer.headline}
${offer.subheadline ? `- Subheadline: ${offer.subheadline}` : ""}
${offer.bullets.length > 0 ? `- Bullets: ${offer.bullets.join(", ")}` : ""}
- CTA: ${offer.cta}

Vrať JEDINĚ platný JSON (žádný markdown, žádný text před/za ním) s těmito klíči:
- "backgroundPrompt": string (popis pozadí BEZ textu, lifestyle/fotorealistické, nech negativní prostor pro typografii)
- "mood": string (např. "modern", "elegant", "playful", "professional")
- "layoutVariant": string (JEDNA z: ${LAYOUT_VARIANTS.join(", ")})
- "overlay": { "type": string (JEDNA z: ${OVERLAY_TYPES.join(", ")}), "strength": number (0.0-1.0) }
- "palette": { "primary": string (hex barva), "accent": string (hex barva), "text": string (hex barva, musí být čitelná) }

Pravidla:
- layoutVariant musí být přesně jedna z whitelistu variant
- overlay.type musí být přesně jedna z whitelistu typů
- palette.text musí být kontrastní (světlá na tmavém pozadí nebo tmavá na světlém)
- backgroundPrompt NESMÍ obsahovat žádný text, jen popis vizuálu`;

  try {
    const response = await llmChat({
      requestId: requestId,
      model: "gpt-4o-mini",
      purpose: "marketing_art_direction",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      maxOutputTokens: 500,
    });

    const text = (response.output_text || "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in LLM response");
    }

    const artDirection = JSON.parse(jsonMatch[0]);

    // Validate and fix layoutVariant
    if (!LAYOUT_VARIANTS.includes(artDirection.layoutVariant)) {
      artDirection.layoutVariant = LAYOUT_VARIANTS[0]; // Default fallback
    }

    // Validate and fix overlay.type
    if (!OVERLAY_TYPES.includes(artDirection.overlay?.type)) {
      artDirection.overlay = { type: "gradient", strength: 0.4 };
    }

    // Ensure overlay.strength is valid
    if (artDirection.overlay && (artDirection.overlay.strength < 0 || artDirection.overlay.strength > 1)) {
      artDirection.overlay.strength = 0.4;
    }

    // Validate palette
    if (!artDirection.palette) {
      artDirection.palette = {
        primary: brand.primary,
        accent: brand.accent,
        text: "#ffffff",
      };
    }

    // Ensure palette has required fields
    artDirection.palette.primary = artDirection.palette.primary || brand.primary;
    artDirection.palette.accent = artDirection.palette.accent || brand.accent;
    artDirection.palette.text = artDirection.palette.text || "#ffffff";

    return artDirection;
  } catch (err) {
    // Fallback art direction
    return {
      backgroundPrompt: `Professional lifestyle photography for ${industry} business, soft lighting, modern aesthetic, negative space for text`,
      mood: "professional",
      layoutVariant: "center_card",
      overlay: { type: "gradient", strength: 0.4 },
      palette: {
        primary: brand.primary,
        accent: brand.accent,
        text: "#ffffff",
      },
    };
  }
}

module.exports = { generateArtDirection, LAYOUT_VARIANTS, OVERLAY_TYPES };
