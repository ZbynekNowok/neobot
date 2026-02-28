"use strict";

const {
  GLOBAL_MARKETING_BASE,
  GLOBAL_NEGATIVE_BASE,
  CREATIVE_VARIATION_SEEDS,
} = require("../config/masterPrompt.js");
const { INDUSTRY_PROMPTS } = require("../config/industryPrompts.js");

const DEBUG_MASTER = process.env.DEBUG === "1" || process.env.DEBUG_COMPOSE === "1";

function pickCreativeVariation(variationKey) {
  if (!variationKey || CREATIVE_VARIATION_SEEDS.length === 0) {
    return CREATIVE_VARIATION_SEEDS[0];
  }
  let hash = 0;
  const str = String(variationKey);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % CREATIVE_VARIATION_SEEDS.length;
  return CREATIVE_VARIATION_SEEDS[index];
}

/**
 * Build the master image prompt for SDXL (and any image generation).
 * Ensures marketing quality, anti-repetition, and industry lock.
 *
 * @param {object} opts
 * @param {object} opts.clientProfile - { industry, brandName, style, targetAudience, colors, industryLock }
 * @param {string} opts.campaignPrompt - User/LLM campaign or scene description
 * @param {string} opts.industry - Override industry (default from clientProfile.industry)
 * @param {string} opts.imageMode - "background" | "img2img" | "ads"
 * @param {string} opts.variationKey - e.g. requestId-i for batch anti-repeat
 * @param {string} opts.placementHint - Copy-space hint (e.g. for background mode)
 */
function buildMasterImagePrompt(opts) {
  const {
    clientProfile = {},
    campaignPrompt = "",
    industry: industryOverride,
    imageMode = "background",
    variationKey,
    placementHint,
  } = opts || {};

  const industry = industryOverride || clientProfile.industry || "general";
  const ind = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.general;

  const parts = [];

  parts.push(GLOBAL_MARKETING_BASE);

  parts.push(ind.environments);
  parts.push(ind.lighting);
  parts.push(ind.heroSubjects);

  if (campaignPrompt && String(campaignPrompt).trim()) {
    parts.push(String(campaignPrompt).trim());
  }

  parts.push("No duplicated items, no rows of identical products, no grid. Unique single composition.");
  parts.push(`Strictly stay within ${industry} context. Do not switch industries.`);

  if (clientProfile.brandName) {
    parts.push(`Brand: ${clientProfile.brandName}.`);
  }
  if (clientProfile.style) {
    parts.push(`Style: ${clientProfile.style}.`);
  }
  if (Array.isArray(clientProfile.colors) && clientProfile.colors.length > 0) {
    parts.push(`Brand colors: ${clientProfile.colors.slice(0, 5).join(", ")}.`);
  }

  const variation = pickCreativeVariation(variationKey);
  parts.push(variation);

  if (placementHint && String(placementHint).trim()) {
    parts.push(String(placementHint).trim());
  }

  if (imageMode === "background" || imageMode === "ads") {
    parts.push("No text, no letters, no logo, no watermark in the image. Leave clean space for typography.");
  }
  if (imageMode === "img2img") {
    parts.push("Preserve product identity. No text, no logo in the image.");
  }

  const finalPrompt = parts.join(". ");

  if (DEBUG_MASTER) {
    console.log("[masterPrompt] industry:", industry, "imageMode:", imageMode, "variationKey:", variationKey, "variation:", variation.slice(0, 50) + "...");
  }

  return finalPrompt;
}

/**
 * Build master negative prompt (industry-aware, no text, anti-repeat).
 *
 * @param {object} opts
 * @param {object} opts.clientProfile - { industry }
 * @param {string} opts.industry - Override
 * @param {string} opts.imageMode - "background" | "img2img" | "ads"
 * @param {string} opts.textLayout - Optional; for flyer/balanced
 */
function buildMasterNegativePrompt(opts) {
  const { clientProfile = {}, industry: industryOverride, imageMode, textLayout } = opts || {};
  const industry = industryOverride || clientProfile.industry || "general";
  const ind = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.general;

  const parts = [GLOBAL_NEGATIVE_BASE];

  if (ind.prohibited) {
    parts.push(ind.prohibited);
  }

  return parts.join(", ");
}

module.exports = {
  buildMasterImagePrompt,
  buildMasterNegativePrompt,
  pickCreativeVariation,
};
