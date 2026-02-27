const Replicate = require("replicate");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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

function buildPrompt(params) {
  const { industry, style, purpose, palette, description, brand } = params;
  let promptParts = [];
  if (description) promptParts.push(description);
  const scene = getSceneFromIndustry(industry);
  if (scene) promptParts.push(scene);
  if (industry && !scene) promptParts.push(`context: ${industry}`);
  const styleMap = {
    minimal: "minimalist, clean, simple",
    luxury: "luxury, premium, elegant, sophisticated",
    playful: "playful, vibrant, fun, energetic",
    natural: "natural, organic, authentic, earthy",
  };
  if (style && styleMap[style]) promptParts.push(styleMap[style]);
  const purposeMap = {
    sale: "promotional, commercial",
    brand: "brand identity, professional",
    engagement: "engaging, social media friendly",
    education: "informative, clear, educational",
  };
  if (purpose && purposeMap[purpose]) promptParts.push(purposeMap[purpose]);
  const paletteMap = {
    neutral: "neutral colors, beige, gray, white",
    warm: "warm colors, orange, yellow, red tones",
    cool: "cool colors, blue, green, purple tones",
    bold: "bold colors, high contrast, vibrant",
  };
  if (palette && paletteMap[palette]) promptParts.push(paletteMap[palette]);
  if (brand && brand.primary) promptParts.push(`accent color ${brand.primary}`);
  promptParts.push("NO TEXT, NO LOGO, NO WATERMARK, leave negative space for typography");
  return promptParts.join(", ");
}

function buildNegativePrompt() {
  return "text, letters, words, logo, watermark, typography, caption, signage";
}

async function generateBackground(params) {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    jobId,
    outputWidth,
    outputHeight,
    resolution,
  } = params || {};
  if (!prompt || !jobId) throw new Error("Prompt and jobId required");
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN not set");

  const enhancedPrompt = `${prompt}, no text, no letters, no logo, no watermark, leave clean negative space for typography, safe for work, professional, family friendly`;
  const enhancedNegativePrompt = negativePrompt
    ? `${negativePrompt}, text, letters, words, watermark, logo, typography, caption, signage, nsfw, nude, explicit`
    : "text, letters, words, watermark, logo, typography, caption, signage, nsfw, nude, explicit";

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
  const resizedBuffer = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const outputsDir = path.join(__dirname, "../../public/outputs/backgrounds");
  fs.mkdirSync(outputsDir, { recursive: true });
  const filePath = path.join(outputsDir, `${jobId}.png`);
  fs.writeFileSync(filePath, resizedBuffer);

  return {
    publicUrl: `/outputs/backgrounds/${jobId}.png`,
    width: targetWidth,
    height: targetHeight,
    model: MODEL_ID,
    steps: input.num_inference_steps,
    resolution: resolution || undefined,
  };
}

/**
 * Image-to-image: generuje reklamní obrázek s použitím vstupního obrázku (produkt) jako reference.
 * Replicate SDXL parametr: image (URL vstupního obrázku), prompt_strength (0.7 = zachovat produkt).
 * @param {{ imageUrl: string, prompt: string, negativePrompt?: string, width: number, height: number, jobId: string, promptStrength?: number, outputWidth?: number, outputHeight?: number, resolution?: string }}
 * @returns {{ publicUrl: string, width: number, height: number, resolution?: string }}
 */
async function generateFromImage(params) {
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
  if (!imageUrl || !prompt || !jobId) throw new Error("imageUrl, prompt and jobId required");
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) throw new Error("REPLICATE_API_TOKEN not set");

  const enhancedPrompt = `${prompt}, no text, no letters, no logo, no watermark, professional, family friendly`;
  const enhancedNegativePrompt = negativePrompt
    ? `${negativePrompt}, text, letters, words, watermark, logo, typography, caption, signage, nsfw, nude, explicit`
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

  return {
    publicUrl: `/outputs/product-ads/${jobId}.png`,
    width: targetWidth,
    height: targetHeight,
    resolution: resolution || undefined,
  };
}

module.exports = {
  generateBackground,
  generateFromImage,
  buildPrompt,
  buildNegativePrompt,
  MODEL_ID,
};
