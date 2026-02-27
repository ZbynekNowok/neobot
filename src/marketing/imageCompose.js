"use strict";

const path = require("path");
const { generateBackground } = require("../imageProviders");
const { llmChat } = require("../llm/llmGateway.js");
const { renderComposite } = require("../render/canvasRenderer.js");

const PUBLIC_DIR = path.join(__dirname, "../../public");

const ALLOWED_FORMATS = ["square", "story", "landscape"];
const ALLOWED_RESOLUTIONS = ["preview", "standard", "high"];

function normalizeFormat(raw) {
  if (!raw || typeof raw !== "string") return "square";
  if (ALLOWED_FORMATS.includes(raw)) return raw;
  return "square";
}

function normalizeResolution(raw) {
  if (!raw || typeof raw !== "string") return "standard";
  if (ALLOWED_RESOLUTIONS.includes(raw)) return raw;
  return "standard";
}

/**
 * Map format + resolution to generate/output dimensions.
 */
function getCanvasDimensions(formatInput, resolutionInput) {
  const format = normalizeFormat(formatInput);
  const resolution = normalizeResolution(resolutionInput);

  const presets = {
    preview: {
      square: { generate: { width: 720, height: 720 }, output: { width: 720, height: 720 } },
      story: { generate: { width: 720, height: 1280 }, output: { width: 720, height: 1280 } },
      landscape: { generate: { width: 1280, height: 720 }, output: { width: 1280, height: 720 } },
    },
    standard: {
      square: { generate: { width: 720, height: 720 }, output: { width: 1080, height: 1080 } },
      story: { generate: { width: 720, height: 1280 }, output: { width: 1080, height: 1920 } },
      landscape: { generate: { width: 1280, height: 720 }, output: { width: 1920, height: 1080 } },
    },
    high: {
      square: { generate: { width: 1024, height: 1024 }, output: { width: 2048, height: 2048 } },
      story: { generate: { width: 1024, height: 1820 }, output: { width: 2048, height: 3640 } },
      landscape: { generate: { width: 1820, height: 1024 }, output: { width: 3640, height: 2048 } },
    },
  };

  const preset =
    (presets[resolution] && presets[resolution][format]) || presets.standard.square;

  return {
    format,
    resolution,
    generateWidth: preset.generate.width,
    generateHeight: preset.generate.height,
    outputWidth: preset.output.width,
    outputHeight: preset.output.height,
  };
}

function buildBackgroundPrompt(opts) {
  const { prompt, style, purpose, palette, brand } = opts || {};
  const styleMap = {
    minimalisticky: "minimalist, clean, simple composition",
    luxusni: "luxury, premium, elegant, high-end",
    hravy: "playful, vibrant, dynamic, fun",
    prirozeny: "natural, organic, authentic, realistic",
  };
  const purposeMap = {
    prodej: "sales-focused, conversion oriented",
    brand: "brand awareness, storytelling",
    engagement: "social engagement, attention grabbing",
    edukace: "educational, informative, clear",
  };
  const paletteMap = {
    neutralni: "neutral colors, beige, gray, white",
    teple: "warm colors, orange, yellow, red",
    studene: "cool colors, blue, green, teal",
    vyrazne: "bold, vibrant, high contrast colors",
  };

  const parts = [];
  parts.push(
    "high quality marketing visual background, no text, no logo, no watermark"
  );
  if (prompt) parts.push(String(prompt));
  if (styleMap[style]) parts.push(styleMap[style]);
  if (purposeMap[purpose]) parts.push(purposeMap[purpose]);
  if (paletteMap[palette]) parts.push(paletteMap[palette]);
  if (brand && brand.name) parts.push(`for brand ${brand.name}`);
  if (brand && Array.isArray(brand.colors) && brand.colors.length > 0) {
    parts.push(`brand colors ${brand.colors.join(", ")}`);
  }
  parts.push("safe for work, professional, family friendly, photo-realistic or modern illustration");
  return parts.join(", ");
}

function buildLayoutPrompt(opts) {
  const { prompt, style, purpose } = opts || {};
  const styleText =
    style === "hravy"
      ? "Hravý, uvolněný, můžeš použít maximálně 1 emoji."
      : "Seriózní / profesionální, BEZ emoji.";

  const purposeText = (() => {
    switch (purpose) {
      case "prodej":
        return "Primární cíl: PODPORA PRODEJE (jasný benefit a CTA).";
      case "brand":
        return "Primární cíl: BRAND (vztah ke značce, emoce).";
      case "engagement":
        return "Primární cíl: ENGAGEMENT (pobídka k interakci, otázka, reakce).";
      case "edukace":
        return "Primární cíl: EDUKACE (krátké vysvětlení, jednoduchá rada).";
      default:
        return "Primární cíl: marketingový vizuál pro sociální sítě.";
    }
  })();

  return `
Jsi seniorní art director a copywriter. Tvým úkolem je NAVRHNOUT texty a rozložení pro grafiku s textem.

Kontext:
- Popis / zadání: ${prompt || "(neuvedeno)"}
- Styl: ${style || "neuvedeno"}
- ${purposeText}
- ${styleText}

Pravidla:
- Texty MUSÍ být česky, krátké, úderné a marketingové.
- Headline max ~80 znaků, subheadline max ~140 znaků, CTA max ~24 znaků.
- ŽÁDNÉ hashtagy (#) a žádné dlouhé odstavce.

Výstup:
Vrátíš JEDINĚ platný JSON (žádný jiný text okolo) tohoto tvaru:
{
  "headline": "krátký úderný nadpis",
  "subheadline": "krátký podnadpis (může být prázdný)",
  "cta": "krátká výzva k akci",
  "layout": {
    "headline": { "anchor":"bottom-left", "maxWidthPct": 0.8, "fontScale": 1.0 },
    "subheadline": { "anchor":"bottom-left", "maxWidthPct": 0.8, "fontScale": 0.7 },
    "cta": { "anchor":"bottom-left", "style":"filled" },
    "overlay": { "type":"bottomGradient", "strength": 0.55 }
  }
}

Pozor:
- Nepřidávej žádná další pole mimo tato.
- Nepiš žádný komentář ani vysvětlení, jen čistý JSON.
`;
}

function safeParseLayoutJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("LLM nevrátil žádný text pro layout");
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM nevrátil platný JSON");
  const parsed = JSON.parse(match[0]);
  const out = {
    headline: typeof parsed.headline === "string" ? parsed.headline.trim() : "",
    subheadline:
      typeof parsed.subheadline === "string" ? parsed.subheadline.trim() : "",
    cta: typeof parsed.cta === "string" ? parsed.cta.trim() : "",
    layout: parsed.layout && typeof parsed.layout === "object" ? parsed.layout : {},
  };
  if (!out.headline && !out.subheadline && !out.cta) {
    throw new Error("LLM JSON neobsahuje texty");
  }
  return out;
}

function buildLayersFromLayout(layout, dims) {
  const { outputWidth: width, outputHeight: height } = dims;
  const layers = [];

  const overlayCfg = layout.overlay || { type: "bottomGradient", strength: 0.55 };
  if (overlayCfg && overlayCfg.type === "bottomGradient") {
    layers.push({
      type: "gradient",
      direction: "bottom",
      strength: typeof overlayCfg.strength === "number" ? overlayCfg.strength : 0.55,
    });
  }

  const baseX = 80;
  let currentY = height - 260;

  if (layout.headline) {
    layers.push({
      type: "text",
      id: "headline",
      text: layout.headline,
      x: baseX,
      y: currentY,
      fontSize: 56,
      fontWeight: 800,
      color: "#ffffff",
      align: "left",
      maxWidthPct:
        typeof layout.headline.maxWidthPct === "number"
          ? layout.headline.maxWidthPct
          : 0.8,
    });
    currentY += 70;
  }

  if (layout.subheadline) {
    layers.push({
      type: "text",
      id: "subheadline",
      text: layout.subheadline,
      x: baseX,
      y: currentY,
      fontSize: 32,
      fontWeight: 400,
      color: "#e5e7eb",
      align: "left",
      maxWidthPct:
        typeof layout.subheadline.maxWidthPct === "number"
          ? layout.subheadline.maxWidthPct
          : 0.8,
    });
    currentY += 70;
  }

  if (layout.cta) {
    const buttonY = Math.min(height - 96, currentY + 24);
    layers.push({
      type: "button",
      id: "cta",
      text: layout.cta,
      x: baseX,
      y: buttonY,
      w: 280,
      h: 64,
      bg: "#2563eb",
      color: "#ffffff",
      radius: 999,
    });
  }

  return layers;
}

async function composeImageWithText(options, requestId) {
  const format = normalizeFormat(options.format);
  const resolution = normalizeResolution(options.resolution);
  const dims = getCanvasDimensions(format, resolution);

  const bgPrompt = buildBackgroundPrompt({
    prompt: options.prompt,
    style: options.style,
    purpose: options.purpose,
    palette: options.palette,
    brand: options.brand,
  });

  const negativePrompt =
    "text, words, letters, logo, watermark, ui, screenshot, caption, signage";

  const bgJobId = `compose-bg-${requestId || Date.now()}`;
  const bgResult = await generateBackground({
    prompt: bgPrompt,
    negativePrompt,
    width: dims.generateWidth,
    height: dims.generateHeight,
    outputWidth: dims.outputWidth,
    outputHeight: dims.outputHeight,
    jobId: bgJobId,
    resolution,
  });

  const backgroundUrl = bgResult.publicUrl;
  const backgroundPath = path.join(
    PUBLIC_DIR,
    backgroundUrl.replace(/^\\/+/, "")
  );

  const layoutPrompt = buildLayoutPrompt({
    prompt: options.prompt,
    style: options.style,
    purpose: options.purpose,
  });

  const llmRes = await llmChat({
    requestId: `${requestId || "compose"}-layout`,
    model: "gpt-4o-mini",
    purpose: "image_text_layout",
    messages: [{ role: "user", content: layoutPrompt }],
    temperature: 0.7,
    maxOutputTokens: 600,
  });

  const parsed = safeParseLayoutJson(llmRes.output_text || "");
  const layers = buildLayersFromLayout(parsed, dims);

  const compositesDir = path.join(PUBLIC_DIR, "outputs/composites");
  const fileName = `compose-${requestId || Date.now()}.png`;
  const outputPath = path.join(compositesDir, fileName);

  const composite = await renderComposite({
    backgroundPath,
    width: dims.outputWidth,
    height: dims.outputHeight,
    layers,
    outputPath,
  });

  return {
    background: {
      url: backgroundUrl,
      width: bgResult.width || dims.outputWidth,
      height: bgResult.height || dims.outputHeight,
      resolution,
    },
    texts: {
      headline: parsed.headline,
      subheadline: parsed.subheadline,
      cta: parsed.cta,
    },
    composite: {
      url: `/outputs/composites/${fileName}`,
      width: composite.width,
      height: composite.height,
    },
    layers,
    format,
    resolution,
  };
}

async function renderCompositeOnly(options, requestId) {
  const format = normalizeFormat(options.format);
  const resolution = normalizeResolution(options.resolution);
  const dims = getCanvasDimensions(format, resolution);

  const backgroundUrl = options.backgroundUrl;
  const compositesDir = path.join(PUBLIC_DIR, "outputs/composites");
  const suffix = Date.now();
  const fileName = `compose-${requestId || "render"}-r${suffix}.png`;
  const outputPath = path.join(compositesDir, fileName);

  const composite = await renderComposite({
    backgroundUrl,
    width: dims.outputWidth,
    height: dims.outputHeight,
    layers: Array.isArray(options.layers) ? options.layers : [],
    outputPath,
  });

  return {
    composite: {
      url: `/outputs/composites/${fileName}`,
      width: composite.width,
      height: composite.height,
    },
    layers: Array.isArray(options.layers) ? options.layers : [],
    format,
    resolution,
  };
}

module.exports = {
  composeImageWithText,
  renderCompositeOnly,
  getCanvasDimensions,
  normalizeResolution,
  normalizeFormat,
};

