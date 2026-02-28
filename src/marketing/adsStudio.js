"use strict";

const crypto = require("crypto");
const { fetch } = require("undici");
const cheerio = require("cheerio");
const { llmChat } = require("../llm/llmGateway.js");
const { generateBackground, generateFromImage, buildNegativePrompt } = require("../imageProviders/replicate.js");
const { detectIndustry } = require("./imageCompose.js");
const { getClientProfile } = require("./clientProfile.js");

const FETCH_TIMEOUT_MS = 15000;
const MAX_PROMPT_CHARS = 12000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB

/** Logovat pouze bezpečné pole chyby (nelogovat HTML ani citlivá data). */
function logFetchError(url, err, context) {
  const cause = err?.cause;
  const safe = {
    context,
    name: err?.name,
    code: err?.code ?? cause?.code,
    message: err?.message,
    causeMessage: cause?.message,
    causeCode: cause?.code,
    status: err?.status,
  };
  const stack = err?.stack ? String(err.stack).split("\n").slice(0, 8).join("\n") : "";
  console.warn("[adsStudio fetch error]", safe, stack ? "\n" + stack : "");
}

/**
 * Přečte body response s limitem velikosti (max 2 MB). Větší obsah uřízne.
 * @param {import("undici").Response} response
 * @param {number} maxBytes
 * @returns {Promise<string>}
 */
async function readBodyWithLimit(response, maxBytes = MAX_HTML_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total <= maxBytes) {
      chunks.push(chunk);
    } else {
      const remaining = maxBytes - (total - chunk.length);
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      break;
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Stáhne HTML z URL (bez headless), vyčistí a vrátí text pro LLM.
 * @param {string} url - platná http(s) URL
 * @returns {Promise<{ title: string, metaDescription: string, bodyText: string }>}
 */
async function fetchUrlContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      method: "GET",
      headers: {
        "User-Agent": "NeoBotAdsStudio/1.0 (+https://neobot.cz)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
  } catch (err) {
    clearTimeout(timeout);
    logFetchError(url, err, "network");
    const code = err?.cause?.code ?? err?.code ?? err?.name;
    const e = new Error(err?.message || "fetch failed");
    e.code = "FETCH_FAILED";
    e.causeCode = code;
    throw e;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    err.code = "FETCH_FAILED";
    throw err;
  }

  let html;
  try {
    html = await readBodyWithLimit(response);
  } catch (err) {
    logFetchError(url, err, "body_read");
    const e = new Error(err?.message || "body read failed");
    e.code = "FETCH_FAILED";
    throw e;
  }

  const $ = cheerio.load(html);

  $("script, style, noscript, iframe").remove();
  const title = ($("title").text() || "").replace(/\s+/g, " ").trim().slice(0, 300);
  let metaDescription = "";
  $('meta[name="description"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) metaDescription = c.replace(/\s+/g, " ").trim().slice(0, 500);
  });

  const headings = [];
  $("h1, h2").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
  });
  const headingBlock = headings.slice(0, 10).join("\n");

  const paragraphs = [];
  $("p").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length > 20) paragraphs.push(t);
  });
  const bodyParagraphs = paragraphs.slice(0, 5).join("\n\n");
  const bodyText = [headingBlock, bodyParagraphs].filter(Boolean).join("\n\n").slice(0, MAX_PROMPT_CHARS);

  return {
    title,
    metaDescription,
    bodyText: bodyText || title || metaDescription || "(žádný text)",
  };
}

/**
 * Analýza URL a vygenerování Ads Draft (brand summary + reklamní texty).
 * @param {string} url - http(s) URL
 * @param {string} [requestId] - pro logování
 * @returns {Promise<{ brand: object, ads: object }>}
 */
async function analyzeUrlAndDraftAds(url, requestId = "ads-draft") {
  const content = await fetchUrlContent(url);

  const prompt = `Jsi expert na reklamu a brand. Na základě následujícího obsahu webu vytvoř:
1) Stručný brand summary (název, popis, služby, USP, tón, cílová skupina).
2) Reklamní texty pro Meta (Facebook/Instagram) a Google Ads.

OBSAH WEBU:
Title: ${content.title}
Meta description: ${content.metaDescription}

Tělo (nadpisy + odstavce):
${content.bodyText}

Vrať JEDINĚ platný JSON bez markdown a bez textu před/za ním. Struktura:
{
  "brand": {
    "name": "string",
    "description": "string",
    "services": ["string"],
    "usp": ["string"],
    "tone": "string",
    "target_audience": "string"
  },
  "ads": {
    "meta_primary_texts": ["string"] (přesně 5 položek, hlavní text pro Meta),
    "meta_headlines": ["string"] (přesně 5 položek, krátké headlines),
    "google_headlines": ["string"] (přesně 10 položek, max 30 znaků),
    "google_descriptions": ["string"] (přesně 6 položek, max 90 znaků)
  }
}
Všechny texty v češtině. Pole services a usp mohou mít 0 až cca 10 položek. Ostatní pole přesně v uvedeném počtu.`;

  const response = await llmChat({
    requestId,
    model: "gpt-4o-mini",
    purpose: "ads_draft",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    maxOutputTokens: 4000,
  });

  const text = (response.output_text || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM nevrátil platný JSON");
  }

  let data;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("Neplatný JSON z LLM");
  }

  const brand = data.brand && typeof data.brand === "object" ? data.brand : {};
  const ads = data.ads && typeof data.ads === "object" ? data.ads : {};

  const ensureString = (v) => (typeof v === "string" ? v : String(v || ""));
  const ensureStringArray = (v, maxLen) => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => x.trim().slice(0, maxLen || 10000));
  };

  return {
    brand: {
      name: ensureString(brand.name),
      description: ensureString(brand.description),
      services: ensureStringArray(brand.services),
      usp: ensureStringArray(brand.usp),
      tone: ensureString(brand.tone),
      target_audience: ensureString(brand.target_audience),
    },
    ads: {
      meta_primary_texts: ensureStringArray(ads.meta_primary_texts).slice(0, 5),
      meta_headlines: ensureStringArray(ads.meta_headlines, 200).slice(0, 5),
      google_headlines: ensureStringArray(ads.google_headlines, 30).slice(0, 10),
      google_descriptions: ensureStringArray(ads.google_descriptions, 90).slice(0, 6),
    },
  };
}

/** Formát obrázku → výchozí rozměry (šířka, výška) pro standardní rozlišení. */
const IMAGE_FORMAT_DIMENSIONS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

const ALLOWED_RESOLUTIONS = ["preview", "standard", "high"];

function normalizeResolution(raw) {
  if (!raw || typeof raw !== "string") return "standard";
  return ALLOWED_RESOLUTIONS.includes(raw) ? raw : "standard";
}

/**
 * Mapování rozlišení:
 * - preview: generuje i vrací 720p
 * - standard: generuje 720p, upscale na 1080p
 * - high: generuje 1024p, upscale na 2048p
 */
const RESOLUTION_PRESETS = {
  preview: {
    square: { generate: { width: 720, height: 720 }, output: { width: 720, height: 720 } },
    story: { generate: { width: 720, height: 1280 }, output: { width: 720, height: 1280 } },
  },
  standard: {
    square: { generate: { width: 720, height: 720 }, output: { width: 1080, height: 1080 } },
    story: { generate: { width: 720, height: 1280 }, output: { width: 1080, height: 1920 } },
  },
  high: {
    square: { generate: { width: 1024, height: 1024 }, output: { width: 2048, height: 2048 } },
    story: { generate: { width: 1024, height: 1820 }, output: { width: 2048, height: 3640 } },
  },
};

function getResolutionDims(format, resolutionInput) {
  const resolution = normalizeResolution(resolutionInput);
  const fmt = format === "story" ? "story" : "square";
  const preset = (RESOLUTION_PRESETS[resolution] && RESOLUTION_PRESETS[resolution][fmt]) || RESOLUTION_PRESETS.standard.square;
  return {
    resolution,
    generateWidth: preset.generate.width,
    generateHeight: preset.generate.height,
    outputWidth: preset.output.width,
    outputHeight: preset.output.height,
  };
}

/**
 * Získá pouze brand kontext z URL (bez plného ads draft). Pro F2 – generování obrázků.
 * @param {string} url - http(s) URL
 * @param {string} [requestId]
 * @returns {Promise<{ name: string, description: string, services: string[], usp: string[], tone: string, target_audience: string }>}
 */
async function getBrandContextFromUrl(url, requestId = "ads-brand") {
  const content = await fetchUrlContent(url);
  const prompt = `Na základě obsahu webu vrať JEDINĚ platný JSON (žádný další text) s brand summary. Struktura:
{
  "brand": {
    "name": "string",
    "description": "string",
    "services": ["string"],
    "usp": ["string"],
    "tone": "string",
    "target_audience": "string"
  }
}
OBSAH WEBU:
Title: ${content.title}
Meta: ${content.metaDescription}
Tělo: ${content.bodyText.slice(0, 4000)}
Vše v češtině. Pole services a usp 0–10 položek.`;

  const response = await llmChat({
    requestId,
    model: "gpt-4o-mini",
    purpose: "ads_brand_context",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    maxOutputTokens: 1500,
  });

  const text = (response.output_text || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM nevrátil platný JSON pro brand");

  let data;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("Neplatný JSON z LLM (brand)");
  }

  const brand = data.brand && typeof data.brand === "object" ? data.brand : {};
  const ensureString = (v) => (typeof v === "string" ? v : String(v || "").trim() || "");
  const ensureArr = (v) => {
    if (!Array.isArray(v)) return [];
    return v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
  };
  return {
    name: ensureString(brand.name),
    description: ensureString(brand.description),
    services: ensureArr(brand.services),
    usp: ensureArr(brand.usp),
    tone: ensureString(brand.tone),
    target_audience: ensureString(brand.target_audience),
  };
}

const MAX_ADS_IMAGES = 6;
const IMAGE_GENERATION_TIMEOUT_MS = 125000; // o něco víc než Replicate 120s
const TOTAL_IMAGES_TIMEOUT_MS = 360000; // 6 min celkem
const DELAY_BETWEEN_IMAGES_MS = 2000; // 1–2 s mezi obrázky, aby se netrefil rate limit
const BACKOFF_DELAYS_MS = [5000, 15000]; // exponenciální backoff: max 2 retry (5s, 15s)

/**
 * Vygeneruje 3–6 reklamních obrázků na základě URL (brand context + Replicate).
 * @param {string} url - http(s) URL
 * @param {{ count?: number, format?: "square"|"story"|"both", requestId?: string, resolution?: "preview"|"standard"|"high" }} options
 * @returns {Promise<{ images: Array<{ url: string, format: string, prompt: string, caption: string, width?: number, height?: number, resolution?: string }> }>}
 */
async function generateImagesFromUrl(url, options = {}) {
  const count = Math.min(MAX_ADS_IMAGES, Math.max(3, Number(options.count) || 4));
  const format = ["square", "story", "both"].includes(options.format) ? options.format : "square";
  const requestId = options.requestId || `ads-img-${Date.now()}`;
  const resolution = normalizeResolution(options.resolution);
  const debug = Boolean(options.debug);

  const brand = await getBrandContextFromUrl(url, requestId);

  const promptForPrompts = `Jsi expert na reklamní vizuály. Pro brand "${brand.name}" (${brand.description}) vytvoř ${count} nápadů na reklamní obrázky.
Cílová skupina: ${brand.target_audience}. Tón: ${brand.tone}. USP: ${(brand.usp || []).slice(0, 5).join(", ")}.
Pro každý obrázek vrať krátký popis scény pro generování obrázku (v angličtině, pro AI image model): co má být na obrázku, nálada, styl. BEZ textu v obrázku.
A také krátký caption/headline v češtině pro sociální sítě (CTA).
Vrať JEDINĚ platný JSON:
{ "items": [ { "prompt": "english scene description for image, no text in image", "caption": "český caption / CTA" }, ... ] }
Přesně ${count} položek v items.`;

  const llmRes = await llmChat({
    requestId: `${requestId}-prompts`,
    model: "gpt-4o-mini",
    purpose: "ads_image_prompts",
    messages: [{ role: "user", content: promptForPrompts }],
    temperature: 0.8,
    maxOutputTokens: 2000,
  });

  const text = (llmRes.output_text || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM nevrátil platný JSON pro image prompts");

  let items;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    throw new Error("Neplatný JSON pro image prompts");
  }

  const fallbackIndustry = detectIndustry(brand.description || brand.name || "");
  const clientProfile = (options.clientProfile && typeof options.clientProfile === "object")
    ? getClientProfile(
        { ...options.clientProfile, style: options.clientProfile.style || options.clientProfile.brandStyle },
        fallbackIndustry
      )
    : { industry: fallbackIndustry, brandName: brand.name || null };
  const industry = clientProfile.industry;
  const formatsToGenerate = []; // { format: "square"|"story", index }
  if (format === "both") {
    const half = Math.floor(count / 2);
    for (let i = 0; i < count; i++) formatsToGenerate.push({ format: i < half ? "square" : "story", index: i });
  } else {
    for (let i = 0; i < count; i++) formatsToGenerate.push({ format, index: i });
  }

  const images = [];
  const startTime = Date.now();

  for (let i = 0; i < formatsToGenerate.length; i++) {
    if (Date.now() - startTime > TOTAL_IMAGES_TIMEOUT_MS) break;
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_BETWEEN_IMAGES_MS));

    const { format: fmt, index } = formatsToGenerate[i];
    const item = items[index] || items[items.length - 1] || { prompt: "professional marketing visual", caption: "Zjistit více" };
    const promptText = typeof item.prompt === "string" && item.prompt.trim() ? item.prompt.trim() : "professional advertising visual, clean, modern";
    const caption = typeof item.caption === "string" && item.caption.trim() ? item.caption.trim() : "Zjistit více";
    const { generateWidth, generateHeight, outputWidth, outputHeight } = getResolutionDims(fmt, resolution);
    const jobId = `ads-${requestId}-${i}-${crypto.randomUUID().slice(0, 8)}`;

    let result;
    let lastErr;
    for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
      try {
        result = await Promise.race([
          generateBackground({
            clientProfile,
            campaignPrompt: promptText,
            industry,
            imageMode: "ads",
            variationKey: `${requestId}-${i}`,
            width: generateWidth,
            height: generateHeight,
            outputWidth,
            outputHeight,
            jobId: attempt === 0 ? jobId : `${jobId}-retry${attempt}`,
            resolution,
            debug: i === 0 ? debug : false,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), IMAGE_GENERATION_TIMEOUT_MS)),
        ]);
        break;
      } catch (err) {
        lastErr = err;
        if (err?.code === "RATE_LIMITED") throw err;
        if (err?.message?.includes("timeout")) {
          const e = new Error("Image generation timeout");
          e.code = "IMAGE_PROVIDER_FAILED";
          throw e;
        }
        if (attempt < BACKOFF_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, BACKOFF_DELAYS_MS[attempt]));
        } else {
          const e = new Error(err?.message || "Replicate failed");
          e.code = "IMAGE_PROVIDER_FAILED";
          throw e;
        }
      }
    }

    images.push({
      url: result.publicUrl,
      format: fmt,
      prompt: promptText,
      caption,
      width: result.width,
      height: result.height,
      resolution: result.resolution || resolution,
      _debug: result._debug,
    });
  }

  const out = { images: images.map(({ _debug, ...img }) => img) };
  if (debug && images.length > 0 && images[0]._debug) {
    out._debug = images[0]._debug;
  }
  return out;
}

const PRODUCT_VARIANTS_MIN = 4;
const PRODUCT_VARIANTS_MAX = 8;
const PRODUCT_ADS_DELAY_MS = 2000;
const PRODUCT_ADS_BACKOFF_MS = [5000, 15000];

/**
 * Produktová fotka → 4–8 marketingových scén (image-to-image s Replicate).
 * @param {{ publicImageUrl: string, variants: number, format: "square"|"story"|"both", productName?: string, style: string, requestId: string, resolution?: "preview"|"standard"|"high" }}
 */
async function generateProductVariants(options) {
  const publicImageUrl = options.publicImageUrl;
  const variants = Math.min(PRODUCT_VARIANTS_MAX, Math.max(PRODUCT_VARIANTS_MIN, Number(options.variants) || 4));
  const format = ["square", "story", "both"].includes(options.format) ? options.format : "square";
  const productName = typeof options.productName === "string" && options.productName.trim() ? options.productName.trim() : "";
  const style = ["modern", "luxury", "minimal", "industrial"].includes(options.style) ? options.style : "modern";
  const requestId = options.requestId || `ads-product-${Date.now()}`;
  const resolution = normalizeResolution(options.resolution);
  const debug = Boolean(options.debug);

  const stylePrompt = {
    modern: "modern, clean, contemporary",
    luxury: "luxury, premium, elegant",
    minimal: "minimalist, simple, white space",
    industrial: "industrial, raw, urban",
  }[style] || "modern, clean";

  const productContext = productName
    ? productName
    : "product";

  const promptForScenes = `Jsi expert na reklamní vizuály. Vytvoř ${variants} nápadů na reklamní scény pro produkt: "${productContext}".
Styl: ${stylePrompt}. Pro každou scénu:
1) prompt v angličtině pro AI image model (image-to-image): popis scény (studio, lifestyle, environment), kde HLAVNÍ OBJEKT je produkt z nahrané fotky. Napiš: "Use the provided product photo as the main subject. Keep product identity, shape, colors." + popis prostředí (např. "in a modern studio with soft lighting", "on a marble surface", "in lifestyle setting"). ŽÁDNÝ text v obrázku (NO text, NO logo overlay). Realistické reklamní scény.
2) caption v češtině (krátký reklamní text / CTA).
Vrať JEDINĚ platný JSON: { "items": [ { "prompt": "english scene description...", "caption": "český caption" }, ... ] }
Přesně ${variants} položek v items.`;

  const llmRes = await llmChat({
    requestId: `${requestId}-prompts`,
    model: "gpt-4o-mini",
    purpose: "ads_product_scenes",
    messages: [{ role: "user", content: promptForScenes }],
    temperature: 0.8,
    maxOutputTokens: 2000,
  });

  const text = (llmRes.output_text || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM nevrátil platný JSON pro product scenes");

  let items;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch (e) {
    throw new Error("Neplatný JSON pro product scenes");
  }

  const fallbackIndustry = detectIndustry(productName || productContext || "");
  const clientProfile = (options.clientProfile && typeof options.clientProfile === "object")
    ? getClientProfile(
        { ...options.clientProfile, style: options.clientProfile.style || options.clientProfile.brandStyle },
        fallbackIndustry
      )
    : { industry: fallbackIndustry, brandName: null };
  const industry = clientProfile.industry;
  const formatsToGenerate = [];
  if (format === "both") {
    const half = Math.floor(variants / 2);
    for (let i = 0; i < variants; i++) formatsToGenerate.push({ format: i < half ? "square" : "story", index: i });
  } else {
    for (let i = 0; i < variants; i++) formatsToGenerate.push({ format, index: i });
  }

  const images = [];
  const startTime = Date.now();

  for (let i = 0; i < formatsToGenerate.length; i++) {
    if (Date.now() - startTime > TOTAL_IMAGES_TIMEOUT_MS) break;
    if (i > 0) await new Promise((r) => setTimeout(r, PRODUCT_ADS_DELAY_MS));

    const { format: fmt, index } = formatsToGenerate[i];
    const item = items[index] || items[items.length - 1] || { prompt: "Use the provided product photo as the main subject. Keep product identity. Modern studio.", caption: "Zjistit více" };
    const promptText = typeof item.prompt === "string" && item.prompt.trim() ? item.prompt.trim() : "Use the provided product photo as the main subject. Keep product identity. Professional ad scene.";
    const caption = typeof item.caption === "string" && item.caption.trim() ? item.caption.trim() : "Zjistit více";
    const { generateWidth, generateHeight, outputWidth, outputHeight } = getResolutionDims(fmt, resolution);
    const baseJobId = `${requestId}-${i}`;
    const jobId = baseJobId;

    let result;
    for (let attempt = 0; attempt <= PRODUCT_ADS_BACKOFF_MS.length; attempt++) {
      const attemptJobId = attempt === 0 ? jobId : `${baseJobId}-retry${attempt}`;
      try {
        result = await Promise.race([
          generateFromImage({
            imageUrl: publicImageUrl,
            prompt: promptText,
            clientProfile,
            industry,
            variationKey: `${requestId}-${i}`,
            width: generateWidth,
            height: generateHeight,
            outputWidth,
            outputHeight,
            jobId: attemptJobId,
            promptStrength: 0.7,
            resolution,
            debug: i === 0 ? debug : false,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), IMAGE_GENERATION_TIMEOUT_MS)),
        ]);
        break;
      } catch (err) {
        if (err?.code === "RATE_LIMITED") throw err;
        if (err?.message?.includes("timeout")) {
          const e = new Error("Image generation timeout");
          e.code = "IMAGE_PROVIDER_FAILED";
          throw e;
        }
        if (attempt < PRODUCT_ADS_BACKOFF_MS.length) {
          await new Promise((r) => setTimeout(r, PRODUCT_ADS_BACKOFF_MS[attempt]));
        } else {
          const e = new Error(err?.message || "Replicate failed");
          e.code = "IMAGE_PROVIDER_FAILED";
          throw e;
        }
      }
    }

    images.push({
      url: result.publicUrl,
      format: fmt,
      prompt: promptText,
      caption,
      width: result.width,
      height: result.height,
      resolution: result.resolution || resolution,
      _debug: result._debug,
    });
  }

  const out = { images: images.map(({ _debug, ...img }) => img) };
  if (debug && images.length > 0 && images[0]._debug) {
    out._debug = images[0]._debug;
  }
  return out;
}

module.exports = {
  fetchUrlContent,
  analyzeUrlAndDraftAds,
  getBrandContextFromUrl,
  generateImagesFromUrl,
  generateProductVariants,
};
