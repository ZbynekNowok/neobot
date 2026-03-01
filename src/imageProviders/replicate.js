const Replicate = require("replicate");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { buildMasterImagePrompt, buildMasterNegativePrompt, getLastBuildDebug } = require("../marketing/masterPromptBuilder.js");
const { GLOBAL_NEGATIVE_BASE } = require("../config/masterPrompt.js");

const MODEL_ID = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
const GENERATION_TIMEOUT_MS = 120000;

function getSceneFromIndustry(industry) {
  if (!industry || typeof industry !== "string") return null;
  const i = industry.toLowerCase();
  if (/móda|moda|fashion|oblečení|obleceni|oděv|odev|dámsk|damsk|pánsk|pansk|cloth|apparel/.test(i)) {
    return "marketing visual, fashion or apparel context, professional";
  }
  if (/restaurant|restaurace|jídlo|jidlo|food|kavárna|kavarna|cafe/.test(i)) {
    return "marketing visual, food or restaurant context, professional";
  }
  if (/kosmetika|beauty|krása|krasa|makeup|vlasy/.test(i)) {
    return "marketing visual, beauty context, professional";
  }
  if (/fitnes|sport|yoga|wellness/.test(i)) {
    return "marketing visual, fitness context, professional";
  }
  if (/vrátk|vratk|gate|kov|metal|stavebn|dveře|dvere/.test(i)) {
    return "marketing visual, product or construction context, professional";
  }
  return "marketing visual, professional";
}

/** Legacy buildPrompt for design.js route; prefer master builder for new code. */
function buildPrompt(params) {
  const { industry, style, purpose, palette, description, brand } = params;
  const clientProfile = {
    industry: industry || "general",
    brandName: brand?.name,
    colors: brand?.primary ? [brand.primary] : null,
  };
  const built = buildMasterImagePrompt({
    clientProfile,
    campaignPrompt: description || "",
    industry: industry || "general",
    imageMode: "ads",
    variationKey: `design-${Date.now()}`,
  });
  return typeof built === "object" && built && built.prompt != null ? built.prompt : built;
}

/** Legacy; master negative is used when using buildMasterImagePrompt. */
function buildNegativePrompt(industryOrOpts) {
  const opts = typeof industryOrOpts === "string"
    ? { industry: industryOrOpts }
    : (industryOrOpts && typeof industryOrOpts === "object" ? industryOrOpts : {});
  return buildMasterNegativePrompt(opts);
}

async function generateBackground(params) {
  if (process.env.NODE_ENV !== "production") {
    const { assertContextUsed } = require("../context/contextGuard.js");
    const tid = params?.traceId || params?.jobId;
    if (tid) assertContextUsed(tid);
  }
  const {
    prompt: legacyPrompt,
    negativePrompt: legacyNegative,
    width,
    height,
    jobId,
    outputWidth,
    outputHeight,
    resolution,
    clientProfile,
    campaignPrompt,
    industry,
    imageMode,
    variationKey,
    placementHint,
    textLayout,
    format,
    stylePreset,
  } = params || {};

  const profile = clientProfile && typeof clientProfile === "object"
    ? clientProfile
    : { industry: industry || "general" };
  const userPrompt = campaignPrompt != null ? String(campaignPrompt) : (legacyPrompt || "");
  let prompt;
  let negativePrompt;
  if (params.prompt != null && String(params.prompt).trim() && params.negativePrompt != null && String(params.negativePrompt).trim()) {
    prompt = String(params.prompt).trim();
    negativePrompt = String(params.negativePrompt).trim();
  } else {
    const built = buildMasterImagePrompt({
      clientProfile: profile,
      userPrompt: userPrompt || "professional marketing visual",
      campaignPrompt: userPrompt,
      industry: industry || profile.industry,
      imageMode: imageMode || "background",
      variationKey: variationKey || jobId,
      placementHint: placementHint || null,
      format: format || null,
      stylePreset: stylePreset || null,
    });
    prompt = typeof built === "object" && built && built.prompt != null ? built.prompt : built;
    negativePrompt = (typeof built === "object" && built && built.negativePrompt != null ? built.negativePrompt : null)
      || buildMasterNegativePrompt({
        clientProfile: profile,
        industry: industry || profile.industry,
        imageMode: imageMode || "background",
        textLayout: textLayout || null,
      });
  }
  if (params.negativePrompt && String(params.negativePrompt).trim()) {
    negativePrompt = `${negativePrompt}, ${String(params.negativePrompt).trim()}`;
  }

  if (!jobId) throw new Error("jobId required");
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN not set");

  const enhancedPrompt = `${prompt}, safe for work, professional, family friendly`;
  let enhancedNegativePrompt = negativePrompt
    ? `${negativePrompt}, nsfw, nude, explicit`
    : "text, letters, words, watermark, logo, typography, caption, signage, nsfw, nude, explicit";
  if (!enhancedNegativePrompt || enhancedNegativePrompt.length < 10) {
    console.error("Missing negativePrompt — injecting GLOBAL_NEGATIVE_BASE");
    enhancedNegativePrompt = GLOBAL_NEGATIVE_BASE + ", nsfw, nude, explicit";
  }

  const replicate = new Replicate({ auth: apiToken });
  const generateWidth = width || 1024;
  const generateHeight = height || 1024;
  const input = {
    prompt: enhancedPrompt,
    negative_prompt: enhancedNegativePrompt,
    width: generateWidth,
    height: generateHeight,
    num_outputs: 1,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    seed: Math.floor(Math.random() * 2147483647),
  };

  const DEFAULT_RATE_LIMIT_RETRY_AFTER = 30;

  function parseRetryAfterFromMessage(message) {
    if (!message || typeof message !== "string") return DEFAULT_RATE_LIMIT_RETRY_AFTER;
    const match = message.match(/"retry_after"\s*:\s*(\d+)/);
    if (match) return Math.min(300, Math.max(1, parseInt(match[1], 10)));
    return DEFAULT_RATE_LIMIT_RETRY_AFTER;
  }

  let output;
  try {
    const p = replicate.run(MODEL_ID, { input });
    const t = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), GENERATION_TIMEOUT_MS));
    output = await Promise.race([p, t]);
  } catch (e) {
    const msg = e?.message || "";
    if (msg.includes("timeout")) throw new Error("Image generation timeout after 120 seconds");
    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      const err = new Error("Replicate rate limit (429). Zkuste později.");
      err.code = "RATE_LIMITED";
      err.provider = "replicate";
      err.retryAfterSeconds = parseRetryAfterFromMessage(msg);
      throw err;
    }
    throw new Error(`Replicate generation failed: ${msg}`);
  }
  if (!output || !Array.isArray(output) || output.length === 0) throw new Error("Replicate returned no output");
  // Never stitch multiple outputs into one image. Always use first output only for background.
  const imageUrl = output[0];

  let imageBuffer;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    throw new Error(`Failed to download image: ${e.message}`);
  }

  const targetWidth = outputWidth || generateWidth;
  const targetHeight = outputHeight || generateHeight;

  let suspectedCollage = false;
  try {
    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (h >= 1.8 * targetHeight || w >= 1.8 * targetWidth) {
      suspectedCollage = true;
    }
  } catch {
    // ignore metadata errors
  }

  const resizedBuffer = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const outputsDir = path.join(__dirname, "../../public/outputs/backgrounds");
  fs.mkdirSync(outputsDir, { recursive: true });
  const filePath = path.join(outputsDir, `${jobId}.png`);
  fs.writeFileSync(filePath, resizedBuffer);

  const result = {
    publicUrl: `/outputs/backgrounds/${jobId}.png`,
    width: targetWidth,
    height: targetHeight,
    model: MODEL_ID,
    steps: input.num_inference_steps,
    resolution: resolution || undefined,
  };
  if (params.debug) {
    const { industryUsed, heroLockUsed } = getLastBuildDebug();
    result._debug = { industryUsed, heroLockUsed, prompt, negativePrompt };
    if (output.length > 1) {
      result._debug.multipleOutputsReturned = output.length;
      result._debug.note = "Using first output only; never stitching multiple into one image.";
    }
    if (suspectedCollage) {
      result._debug.suspectedCollage = true;
    }
  }
  return result;
}

/**
 * Image-to-image: generuje reklamní obrázek s použitím vstupního obrázku (produkt) jako reference.
 * Replicate SDXL parametr: image (URL vstupního obrázku), prompt_strength (0.7 = zachovat produkt).
 * @param {{ imageUrl: string, prompt: string, negativePrompt?: string, width: number, height: number, jobId: string, promptStrength?: number, outputWidth?: number, outputHeight?: number, resolution?: string }}
 * @returns {{ publicUrl: string, width: number, height: number, resolution?: string }}
 */
async function generateFromImage(params) {
  if (process.env.NODE_ENV !== "production") {
    const { assertContextUsed } = require("../context/contextGuard.js");
    const tid = params?.traceId || params?.jobId;
    if (tid) assertContextUsed(tid);
  }
  const {
    imageUrl,
    prompt,
    negativePrompt,
    width,
    height,
    jobId,
    promptStrength = 0.7,
    outputWidth,
    outputHeight,
    resolution,
  } = params || {};
  if (!imageUrl || !jobId) throw new Error("imageUrl and jobId required");
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN not set");

  const profile = params.clientProfile && typeof params.clientProfile === "object"
    ? params.clientProfile
    : { industry: params.industry || "general" };
  const userPrompt = (prompt && String(prompt).trim()) || "Professional product in scene";
  const built = buildMasterImagePrompt({
    clientProfile: profile,
    userPrompt,
    campaignPrompt: userPrompt,
    industry: params.industry || profile.industry,
    imageMode: "img2img",
    variationKey: params.variationKey || jobId,
  });
  const finalPrompt = typeof built === "object" && built && built.prompt != null ? built.prompt : built;
  const finalNegative = (typeof built === "object" && built && built.negativePrompt != null ? built.negativePrompt : null)
    || buildMasterNegativePrompt({
      clientProfile: profile,
      industry: params.industry || profile.industry,
      imageMode: "img2img",
    });

  const enhancedPrompt = `${finalPrompt}, professional, family friendly`;
  const enhancedNegativePrompt = finalNegative
    ? `${finalNegative}, nsfw, nude, explicit`
    : "text, letters, words, watermark, logo, typography, caption, signage, nsfw, nude, explicit";

  const replicate = new Replicate({ auth: apiToken });
  const generateWidth = width || 1024;
  const generateHeight = height || 1024;
  const input = {
    prompt: enhancedPrompt,
    negative_prompt: enhancedNegativePrompt,
    image: imageUrl,
    prompt_strength: Math.min(1, Math.max(0.1, promptStrength)),
    width: generateWidth,
    height: generateHeight,
    num_outputs: 1,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    seed: Math.floor(Math.random() * 2147483647),
  };

  const DEFAULT_RATE_LIMIT_RETRY_AFTER = 30;
  function parseRetryAfterFromMessage(message) {
    if (!message || typeof message !== "string") return DEFAULT_RATE_LIMIT_RETRY_AFTER;
    const match = message.match(/"retry_after"\s*:\s*(\d+)/);
    if (match) return Math.min(300, Math.max(1, parseInt(match[1], 10)));
    return DEFAULT_RATE_LIMIT_RETRY_AFTER;
  }

  let output;
  try {
    const p = replicate.run(MODEL_ID, { input });
    const t = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), GENERATION_TIMEOUT_MS));
    output = await Promise.race([p, t]);
  } catch (e) {
    const msg = e?.message || "";
    if (msg.includes("timeout")) throw new Error("Image generation timeout after 120 seconds");
    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      const err = new Error("Replicate rate limit (429). Zkuste později.");
      err.code = "RATE_LIMITED";
      err.provider = "replicate";
      err.retryAfterSeconds = parseRetryAfterFromMessage(msg);
      throw err;
    }
    throw new Error(`Replicate generation failed: ${msg}`);
  }
  if (!output || !Array.isArray(output) || output.length === 0) throw new Error("Replicate returned no output");
  const outImageUrl = output[0];

  let imageBuffer;
  try {
    const res = await fetch(outImageUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    throw new Error(`Failed to download image: ${e.message}`);
  }

  const targetWidth = outputWidth || generateWidth;
  const targetHeight = outputHeight || generateHeight;
  const resizedBuffer = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const outputsDir = path.join(__dirname, "../../public/outputs/product-ads");
  fs.mkdirSync(outputsDir, { recursive: true });
  const filePath = path.join(outputsDir, `${jobId}.png`);
  fs.writeFileSync(filePath, resizedBuffer);

  const result = {
    publicUrl: `/outputs/product-ads/${jobId}.png`,
    width: targetWidth,
    height: targetHeight,
    resolution: resolution || undefined,
  };
  if (params.debug) {
    const { industryUsed, heroLockUsed } = getLastBuildDebug();
    result._debug = { industryUsed, heroLockUsed, prompt: finalPrompt, negativePrompt: finalNegative };
  }
  return result;
}

module.exports = {
  generateBackground,
  generateFromImage,
  buildPrompt,
  buildNegativePrompt,
  MODEL_ID,
};
