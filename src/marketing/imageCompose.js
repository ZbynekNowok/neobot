"use strict";

const path = require("path");
const { generateBackground } = require("../imageProviders");
const { llmChat } = require("../llm/llmGateway.js");
const { renderComposite, measureTextBlock } = require("../render/canvasRenderer.js");
const { pickBestPlacementFromImage } = require("./copySpace.js");
const { buildMasterImagePrompt, buildMasterNegativePrompt } = require("./masterPromptBuilder.js");

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

const DEBUG_COMPOSE = process.env.DEBUG === "1" || process.env.DEBUG_COMPOSE === "1";

const INDUSTRY_OBJECTS = {
  fashion: "elegant female model wearing modern outfit, boutique interior, clothing rack",
  construction: "construction helmet, laptop with spreadsheet, architectural blueprints, construction site",
  real_estate: "modern house exterior, architectural model, real estate office",
  restaurant: "gourmet food on table, restaurant interior",
  fitness: "fitness studio, athletic person training",
  saas: "laptop with dashboard interface, modern office",
  general: "professional studio background",
};

/**
 * Detect industry from prompt for contextual background (keyword matching).
 * @returns {"fashion"|"construction"|"real_estate"|"restaurant"|"fitness"|"saas"|"general"}
 */
function detectIndustry(prompt) {
  const p = (prompt && String(prompt).toLowerCase()) || "";
  if (/\b(móda|fashion|butik|oblečen|šaty|sukně|kabát|kolekce|outfit|dámsk|pánsk|oděv)\b/.test(p)) return "fashion";
  if (/\b(stavba|stavebn[ií]|stavebn[ií]ch|rozpočet|rozpočty|projekt|úrs|rts|architekt|blueprint|výkres|stavebnictv)\b/.test(p)) return "construction";
  if (/\b(realit|nemovitost|pronájem|prodej byt|dům na prodej|architektura)\b/.test(p)) return "real_estate";
  if (/\b(restaurac|gastro|jídlo|menu|kuchyně|culinary|food|kavárna)\b/.test(p)) return "restaurant";
  if (/\b(fitness|sport|tělocvična|trénink|athletic|posilovna)\b/.test(p)) return "fitness";
  if (/\b(saas|software|aplikace|dashboard|digitální|tech)\b/.test(p)) return "saas";
  return "general";
}

/**
 * Heuristic topic detection from user prompt (no LLM).
 * Brand can hint industry but must not override explicit prompt.
 * @returns {"fashion"|"beauty"|"food"|"home"|"real-estate"|"tech"|"generic"}
 */
function detectTopic(userPrompt, brand) {
  const p = (userPrompt && String(userPrompt).toLowerCase()) || "";
  const b = (brand && typeof brand === "object") ? (brand.industry || brand.name || "").toLowerCase() : "";

  const fashionTerms = /fashion|moda|butik|oblecen[ií]|šaty|sukn[eě]|kab[aá]t|kolekce|outfit|ženy|d[aá]msk[eé]|dámské|pánsk[eé]|oděv|oblečení/;
  const beautyTerms = /kosmetika|skincare|make-up|makeup|kr[eé]m|s[eé]rum|kr[aá]s[aá]|vlasy|nehty/;
  const foodTerms = /jídlo|potravin|restaurac|kav[aá]rn|jídeln|menu|recept|kuchyn[eě]|food|culinary/;
  const homeTerms = /interi[eé]r|n[aá]bytek|obýv[aá]k|kuchyn[eě]|dekorace|byt|dům|pokoj|místnost|living room|furniture|wood wall|dřevěná stěna/;
  const realEstateTerms = /realit|nemovitost|pron[aá]jem|prodej (byt|domu|nemovitosti)|dům na prodej|byt k pronájmu/;
  const techTerms = /tech|software|aplikac|digit[aá]ln[ií]|IT|gadget|elektronik/;

  if (fashionTerms.test(p) || fashionTerms.test(b)) return "fashion";
  if (beautyTerms.test(p) || beautyTerms.test(b)) return "beauty";
  if (foodTerms.test(p) || foodTerms.test(b)) return "food";
  if (realEstateTerms.test(p) || realEstateTerms.test(b)) return "real-estate";
  if (homeTerms.test(p)) return "home";
  if (techTerms.test(p) || techTerms.test(b)) return "tech";
  if (homeTerms.test(b)) return "home";

  return "generic";
}

const COPY_SPACE_BY_PLACEMENT = {
  bottom_left: "large clean copy space in the lower-left quadrant",
  bottom_center: "large clean copy space at the bottom center",
  top_left: "large clean copy space in the upper-left quadrant",
  top_center: "large clean copy space at the top center",
  center: "large clean copy space in the center",
  right_panel: "clean vertical copy space panel on the right side",
};

/**
 * Build background prompt via Master Image Prompt Engine (marketing quality, industry lock, anti-repeat).
 */
function buildBackgroundPrompt(opts) {
  const { userPrompt, topic, style, palette, purpose, brand, textLayout, textPlacement } = opts || {};
  const brief = (userPrompt && String(userPrompt).trim()) || "professional marketing visual";
  const industry = detectIndustry(brief);
  const objects = INDUSTRY_OBJECTS[industry] || INDUSTRY_OBJECTS.general;
  const layoutMode = textLayout === "balanced" || textLayout === "visual" ? textLayout : "flyer";
  const placementText =
    textPlacement === "auto"
      ? "large clean copy space for headline and text, low clutter areas"
      : (COPY_SPACE_BY_PLACEMENT[textPlacement] || COPY_SPACE_BY_PLACEMENT.bottom_left);

  const styleMap = {
    minimalisticky: "minimalist, clean, simple composition",
    luxusni: "luxury, premium, elegant, high-end",
    hravy: "playful, vibrant, dynamic, fun",
    prirozeny: "natural, organic, authentic, realistic",
  };
  const paletteMap = {
    neutralni: "neutral colors, beige, gray, white",
    teple: "warm colors, orange, yellow, red",
    studene: "cool colors, blue, green, teal",
    vyrazne: "bold, vibrant, high contrast colors",
  };

  const campaignParts = [
    `Advertisement background for ${industry}, ${objects}. Photorealistic.`,
    brief,
  ];
  if (styleMap[style]) campaignParts.push(styleMap[style]);
  if (paletteMap[palette]) campaignParts.push(paletteMap[palette]);

  const placementHint = layoutMode === "flyer" ? `${placementText}. Low clutter.` : null;

  const clientProfile = {
    industry,
    brandName: brand && brand.name ? brand.name : null,
    colors: brand && Array.isArray(brand.colors) ? brand.colors : null,
  };

  return buildMasterImagePrompt({
    clientProfile,
    campaignPrompt: campaignParts.join(". "),
    industry,
    imageMode: "background",
    variationKey: `compose-bg-${Date.now()}`,
    placementHint,
  });
}

/**
 * Negative prompt via Master Image Prompt Engine (industry-aware, no text, anti-repeat).
 */
function buildNegativePrompt(industry, textLayout) {
  return buildMasterNegativePrompt({
    clientProfile: { industry: industry || "general" },
    industry: industry || "general",
    imageMode: "background",
    textLayout: textLayout || null,
  });
}

function buildLayoutPrompt(opts) {
  const { prompt, style, purpose, isRetry } = opts || {};
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

  const retryBlock = isRetry
    ? "\nDŮLEŽITÉ: Předchozí text byl mimo téma (interiér/nábytek). Texty MUSÍ odpovídat pouze tomuto zadání: " + (prompt || "") + "\n"
    : "";

  return `
Jsi seniorní art director a copywriter. Tvým úkolem je NAVRHNOUT texty a rozložení pro grafiku s textem.

KRITICKÉ: Texty MUSÍ odpovídat briefu uživatele. Nesmí se objevit jiné téma (např. interiér, nábytek, byt, pokud uživatel píše o módě/fashion).${retryBlock}

Kontext:
- Popis / zadání (BRIEF – drž se ho): ${prompt || "(neuvedeno)"}
- Styl: ${style || "neuvedeno"}
- ${purposeText}
- ${styleText}

Pravidla:
- Texty MUSÍ být česky, krátké, úderné a marketingové.
- Headline max ~80 znaků, subheadline max ~140 znaků, CTA max ~24 znaků.
- ŽÁDNÉ hashtagy (#) a žádné dlouhé odstavce.
- Žádné zmínky o interiéru, nábytku, bytě, pokud brief není o tom.

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

const OFF_TOPIC_TERMS = /interi[eé]r|interiér|n[aá]bytek|byt(?!ový)|odstíny pro interiér|obýv[aá]k|kuchyn[eě]|pokoj|místnost|dřevěná stěna|wood/;

function isLayoutOffTopic(parsed) {
  const h = (parsed.headline || "").toLowerCase();
  const s = (parsed.subheadline || "").toLowerCase();
  return OFF_TOPIC_TERMS.test(h) || OFF_TOPIC_TERMS.test(s);
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

const SAFE_AREA_BY_PLACEMENT = {
  bottom_left: { xPct: 0.07, yPct: 0.6, wPct: 0.86, hPct: 0.33, align: "left" },
  bottom_center: { xPct: 0.07, yPct: 0.6, wPct: 0.86, hPct: 0.33, align: "center" },
  top_left: { xPct: 0.07, yPct: 0.05, wPct: 0.86, hPct: 0.35, align: "left" },
  top_center: { xPct: 0.2, yPct: 0.05, wPct: 0.6, hPct: 0.3, align: "center" },
  center: { xPct: 0.25, yPct: 0.35, wPct: 0.5, hPct: 0.3, align: "center" },
  right_panel: { xPct: 0.52, yPct: 0.1, wPct: 0.43, hPct: 0.8, align: "left" },
};

const HEADLINE_FONT_SIZES = [56, 48, 40];
const SUBHEADLINE_FONT_SIZES = [32, 28, 24];
const GAP = 16;
const CTA_HEIGHT = 64;
const CTA_GAP = 24;

/**
 * Stack headline, subheadline, CTA in safe area without overlap. Reduces font sizes if needed.
 */
function layoutStackedText({ placement, canvasW, canvasH, headline, subheadline, cta }) {
  const area = SAFE_AREA_BY_PLACEMENT[placement] || SAFE_AREA_BY_PLACEMENT.bottom_left;
  const safeX = Math.round(canvasW * area.xPct);
  const safeY = Math.round(canvasH * area.yPct);
  const safeW = Math.round(canvasW * area.wPct);
  const safeH = Math.round(canvasH * area.hPct);
  const align = area.align || "left";

  const headlineText = String(headline || "").trim();
  const subheadlineText = String(subheadline || "").trim();
  const ctaText = String(cta || "").trim();

  const layers = [];
  let bestHeadlineSize = HEADLINE_FONT_SIZES[0];
  let bestSubheadlineSize = SUBHEADLINE_FONT_SIZES[0];
  let fits = false;

  for (let hi = 0; hi < HEADLINE_FONT_SIZES.length && !fits; hi++) {
    for (let si = 0; si < SUBHEADLINE_FONT_SIZES.length && !fits; si++) {
      const hSize = HEADLINE_FONT_SIZES[hi];
      const sSize = SUBHEADLINE_FONT_SIZES[si];
      const hMeas = headlineText ? measureTextBlock(headlineText, safeW, hSize, 800) : { height: 0 };
      const sMeas = subheadlineText ? measureTextBlock(subheadlineText, safeW, sSize, 400) : { height: 0 };
      const ctaH = ctaText ? CTA_HEIGHT + CTA_GAP : 0;
      const totalH = hMeas.height + (headlineText && subheadlineText ? GAP : 0) + sMeas.height + (subheadlineText && ctaText ? GAP : 0) + ctaH;
      if (totalH <= safeH) {
        bestHeadlineSize = hSize;
        bestSubheadlineSize = sSize;
        fits = true;
      }
    }
  }

  let currentY = safeY;
  if (headlineText) {
    const hMeas = measureTextBlock(headlineText, safeW, bestHeadlineSize, 800);
    layers.push({
      type: "text",
      id: "headline",
      text: headlineText,
      x: safeX,
      y: currentY,
      fontSize: bestHeadlineSize,
      fontWeight: 800,
      color: "#ffffff",
      align,
      maxWidthPct: safeW / canvasW,
    });
    currentY += hMeas.height + GAP;
  }
  if (subheadlineText) {
    const sMeas = measureTextBlock(subheadlineText, safeW, bestSubheadlineSize, 400);
    layers.push({
      type: "text",
      id: "subheadline",
      text: subheadlineText,
      x: safeX,
      y: currentY,
      fontSize: bestSubheadlineSize,
      fontWeight: 400,
      color: "#e5e7eb",
      align,
      maxWidthPct: safeW / canvasW,
    });
    currentY += sMeas.height + GAP;
  }
  if (ctaText) {
    let ctaX = safeX;
    const ctaW = 280;
    if (align === "center") {
      ctaX = safeX + Math.round((safeW - ctaW) / 2);
    }
    layers.push({
      type: "button",
      id: "cta",
      text: ctaText,
      x: ctaX,
      y: currentY,
      w: ctaW,
      h: CTA_HEIGHT,
      bg: "#2563eb",
      color: "#ffffff",
      radius: 999,
    });
  }
  return layers;
}

function buildLayersFromLayout(layout, dims, opts) {
  const { outputWidth: width, outputHeight: height } = dims;
  const textLayout = (opts && opts.textLayout) === "balanced" || (opts && opts.textLayout) === "visual" ? opts.textLayout : "flyer";
  const textPlacement =
    (opts && opts.textPlacement && SAFE_AREA_BY_PLACEMENT[opts.textPlacement]) ? opts.textPlacement : "bottom_left";

  const layers = [];

  if (textLayout === "flyer") {
    layers.push({ type: "panel", opacity: 0.65 });
  } else {
    const overlayCfg = (layout && layout.overlay) || { type: "bottomGradient", strength: textLayout === "visual" ? 0.35 : 0.55 };
    layers.push({
      type: "gradient",
      direction: overlayCfg.direction || "bottom",
      strength: typeof overlayCfg.strength === "number" ? overlayCfg.strength : 0.55,
    });
  }

  const stacked = layoutStackedText({
    placement: textPlacement,
    canvasW: width,
    canvasH: height,
    headline: layout && layout.headline,
    subheadline: layout && layout.subheadline,
    cta: layout && layout.cta,
  });
  layers.push(...stacked);

  return layers;
}

async function composeImageWithText(options, requestId) {
  const format = normalizeFormat(options.format);
  const resolution = normalizeResolution(options.resolution);
  const dims = getCanvasDimensions(format, resolution);

  const userPrompt = (options.prompt && String(options.prompt).trim()) || "";
  const topic = detectTopic(userPrompt, options.brand);
  const textLayout = options.textLayout === "balanced" || options.textLayout === "visual" ? options.textLayout : "flyer";
  const requestedPlacement =
    options.textPlacement === "auto" || (options.textPlacement && (COPY_SPACE_BY_PLACEMENT[options.textPlacement] || SAFE_AREA_BY_PLACEMENT[options.textPlacement]))
      ? options.textPlacement
      : "bottom_left";
  const industry = detectIndustry(userPrompt || "");

  const bgPrompt = buildBackgroundPrompt({
    userPrompt: userPrompt || "professional marketing visual",
    topic,
    style: options.style,
    purpose: options.purpose,
    palette: options.palette,
    brand: options.brand,
    textLayout,
    textPlacement: requestedPlacement,
  });
  const negativePrompt = buildNegativePrompt(industry, textLayout);

  if (DEBUG_COMPOSE) {
    console.log("[compose] industry:", industry, "topic:", topic, "textLayout:", textLayout, "textPlacement:", requestedPlacement);
    console.log("[compose] bgPrompt (first 200 chars):", bgPrompt.slice(0, 200) + (bgPrompt.length > 200 ? "…" : ""));
    console.log("[compose] negPrompt:", negativePrompt.slice(0, 150) + (negativePrompt.length > 150 ? "…" : ""));
  }

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
    backgroundUrl.replace(/^\/+/, "")
  );

  let effectivePlacement = requestedPlacement;
  if (requestedPlacement === "auto") {
    try {
      const result = await pickBestPlacementFromImage(backgroundPath, textLayout);
      effectivePlacement = result.placement;
      if (DEBUG_COMPOSE) {
        console.log("[compose] auto placement chosen:", effectivePlacement, "scores:", result.scores);
      }
    } catch (err) {
      if (DEBUG_COMPOSE) console.warn("[compose] copy-space detection failed, using bottom_left:", err?.message);
      effectivePlacement = "bottom_left";
    }
  }

  let layoutPrompt = buildLayoutPrompt({
    prompt: userPrompt,
    style: options.style,
    purpose: options.purpose,
    isRetry: false,
  });

  let llmRes = await llmChat({
    requestId: `${requestId || "compose"}-layout`,
    model: "gpt-4o-mini",
    purpose: "image_text_layout",
    messages: [{ role: "user", content: layoutPrompt }],
    temperature: 0.7,
    maxOutputTokens: 600,
  });

  let parsed = safeParseLayoutJson(llmRes.output_text || "");

  if (isLayoutOffTopic(parsed) && userPrompt) {
    if (DEBUG_COMPOSE) console.log("[compose] layout off-topic, retrying LLM with brief:", userPrompt.slice(0, 80));
    layoutPrompt = buildLayoutPrompt({
      prompt: userPrompt,
      style: options.style,
      purpose: options.purpose,
      isRetry: true,
    });
    llmRes = await llmChat({
      requestId: `${requestId || "compose"}-layout-retry`,
      model: "gpt-4o-mini",
      purpose: "image_text_layout",
      messages: [{ role: "user", content: layoutPrompt }],
      temperature: 0.5,
      maxOutputTokens: 600,
    });
    parsed = safeParseLayoutJson(llmRes.output_text || "");
  }

  const layers = buildLayersFromLayout(parsed, dims, { textLayout, textPlacement: effectivePlacement });

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

  const result = {
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
  if (options.debug) {
    result._debug = { prompt: bgPrompt, negativePrompt };
  }
  return result;
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

