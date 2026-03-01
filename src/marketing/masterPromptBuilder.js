"use strict";

const {
  GLOBAL_POSITIVE_BASE,
  GLOBAL_NEGATIVE_BASE,
  CREATIVE_VARIATION_SEEDS,
} = require("../config/masterPrompt.js");
const { INDUSTRY_PROMPTS } = require("../config/industryPrompts.js");
const { getHeroLock, getHeroLockKey } = require("../config/heroLocks.js");
const { getClientProfile } = require("./clientProfile.js");

const DEBUG_MASTER = process.env.DEBUG === "1" || process.env.DEBUG_COMPOSE === "1";

// Last build debug info for _debug in API responses (dev mode)
let lastBuildDebug = { industryUsed: null, heroLockUsed: null };

function setLastBuildDebug(industryUsed, heroLockUsed) {
  lastBuildDebug = { industryUsed, heroLockUsed };
}

function getLastBuildDebug() {
  return { ...lastBuildDebug };
}

/**
 * Normalize input from client profile, user prompt, and optional industry override.
 * @param {{ clientProfile?: object, userPrompt?: string, industry?: string }}
 * @returns {{ resolvedIndustry: string, resolvedTopicKeywords: string }}
 */
function normalizeInput({ clientProfile = {}, userPrompt = "", industry: industryOverride } = {}) {
  const fallbackIndustry =
    typeof clientProfile === "object" && clientProfile.industry
      ? clientProfile.industry
      : industryOverride || "general";
  const resolved = getClientProfile(
    clientProfile && typeof clientProfile === "object" ? clientProfile : {},
    fallbackIndustry
  );
  const resolvedIndustry = industryOverride || resolved.industry || "general";
  const resolvedTopicKeywords = (userPrompt && String(userPrompt).trim()) || "";
  return { resolvedIndustry, resolvedTopicKeywords };
}

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

const STYLE_PRESET_PROMPTS = {
  photographic: "photorealistic, natural lighting, DSLR, shallow depth of field",
  realistic: "highly realistic, true-to-life textures, accurate proportions",
  cinematic: "cinematic lighting, film look, dramatic contrast, anamorphic",
  animation: "stylized animation, clean outlines, vibrant, illustration",
  design: "graphic design, minimalist, clean shapes, modern poster style",
};

function getStylePresetBlock(preset) {
  if (!preset || preset === "auto") return "";
  const key = String(preset).toLowerCase();
  return STYLE_PRESET_PROMPTS[key] || "";
}

/**
 * Build the master image prompt for all image generation (backgrounds, ads, product variants).
 * Composes: GLOBAL_POSITIVE_BASE + industry (environments, lighting) + HERO_LOCK.required + userPrompt + variation + "Strictly stay within [industry] context".
 *
 * @param {object} opts
 * @param {object} opts.clientProfile - { industry, brandName, style, targetAudience, colors, industryLock }
 * @param {string} opts.userPrompt - Campaign brief / scene description (alias: campaignPrompt)
 * @param {string} opts.industry - Override industry
 * @param {string} opts.imageMode - "background" | "img2img" | "ads"
 * @param {string} opts.variationKey - For anti-repeat (e.g. requestId-i)
 * @param {string} opts.placementHint - Copy-space hint (e.g. for background mode)
 * @param {string} opts.format - "square" | "story" | "landscape" (for portrait/1:1 anti-collage constraints)
 * @param {string} opts.stylePreset - "auto" | "photographic" | "realistic" | "cinematic" | "animation" | "design"
 */
function buildMasterImagePrompt(opts) {
  const {
    clientProfile = {},
    userPrompt,
    campaignPrompt,
    industry: industryOverride,
    imageMode = "background",
    variationKey,
    placementHint,
    format,
    stylePreset,
  } = opts || {};

  const userBrief = (userPrompt != null ? userPrompt : campaignPrompt) != null
    ? String(userPrompt != null ? userPrompt : campaignPrompt).trim()
    : "";

  const industry = industryOverride || clientProfile.industry || "general";
  const heroLockKey = getHeroLockKey(industry);
  const heroLock = getHeroLock(industry);
  const ind = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.general;

  setLastBuildDebug(industry, heroLockKey);

  const parts = [];

  parts.push(GLOBAL_POSITIVE_BASE);

  const isPortraitOrSquare = format === "story" || format === "square";
  if (isPortraitOrSquare) {
    parts.push("single subject centered, clean composition, one scene only");
  }

  const styleBlock = getStylePresetBlock(stylePreset);
  if (styleBlock) parts.push(styleBlock);

  parts.push(ind.environments);
  parts.push(ind.lighting);
  parts.push(ind.heroSubjects);
  parts.push(heroLock.required);

  if (userBrief) {
    parts.push(userBrief);
  }

  const variation = pickCreativeVariation(variationKey);
  parts.push(variation);

  parts.push(`Strictly stay within ${industry} context.`);

  if (clientProfile.brandName) {
    parts.push(`Brand: ${clientProfile.brandName}.`);
  }
  if (clientProfile.style) {
    parts.push(`Style: ${clientProfile.style}.`);
  }
  if (Array.isArray(clientProfile.colors) && clientProfile.colors.length > 0) {
    parts.push(`Brand colors: ${clientProfile.colors.slice(0, 5).join(", ")}.`);
  }

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
    console.log("[masterPrompt] industry:", industry, "heroLock:", heroLockKey, "imageMode:", imageMode, "variationKey:", variationKey);
  }

  return finalPrompt;
}

/**
 * Build master negative prompt: GLOBAL_NEGATIVE_BASE + HERO_LOCK.forbidden + industry prohibited.
 *
 * @param {object} opts
 * @param {object} opts.clientProfile - { industry }
 * @param {string} opts.industry - Override
 * @param {string} opts.imageMode - "background" | "img2img" | "ads"
 * @param {string} opts.textLayout - Optional
 */
function buildMasterNegativePrompt(opts) {
  const { clientProfile = {}, industry: industryOverride, imageMode, textLayout } = opts || {};
  const industry = industryOverride || clientProfile.industry || "general";
  const heroLockKey = getHeroLockKey(industry);
  const heroLock = getHeroLock(industry);
  const ind = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.general;

  setLastBuildDebug(industry, heroLockKey);

  const parts = [GLOBAL_NEGATIVE_BASE, heroLock.forbidden];
  if (ind.prohibited) {
    parts.push(ind.prohibited);
  }

  return parts.join(", ");
}

module.exports = {
  normalizeInput,
  buildMasterImagePrompt,
  buildMasterNegativePrompt,
  getLastBuildDebug,
  pickCreativeVariation,
};
