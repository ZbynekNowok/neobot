"use strict";

/**
 * Global Master Image Prompt Engine – base constants applied to ALL image generation.
 * Ensures marketing creative quality, anti-repetition, and no catalog/grid look.
 */

const GLOBAL_MARKETING_BASE = [
  "high-end commercial marketing photography",
  "cinematic lighting",
  "premium advertising look",
  "professional art direction",
  "rich environment with depth",
  "visual storytelling",
  "unique composition",
  "one clear hero subject",
  "varied scene props relevant to industry",
  "no repetition",
  "NEVER: boring catalog, product-on-plain-wall, grid or rows of identical items, repetitive duplicates, symmetrical duplication artifacts",
  "NEVER: text, letters, logos, watermark in the image",
].join(", ");

const GLOBAL_NEGATIVE_BASE = [
  "text",
  "letters",
  "words",
  "typography",
  "watermark",
  "logo",
  "brand name",
  "duplicated objects",
  "clone artifacts",
  "repeating pattern",
  "grid layout",
  "rows of identical items",
  "catalog shot",
  "plain white wall",
  "boring",
  "nsfw",
  "nude",
  "explicit",
].join(", ");

const CREATIVE_VARIATION_SEEDS = [
  "editorial lifestyle scene, dynamic angle, shallow depth of field",
  "studio editorial, soft key light, premium fashion look",
  "street lifestyle, natural light, urban context",
  "boutique interior, warm ambient, curated props",
  "outdoor spring city, golden hour, aspirational mood",
  "minimalist studio, single hero, clean shadows",
  "environmental portrait style, rich backdrop, cinematic",
  "lifestyle moment, candid feel, authentic setting",
];

module.exports = {
  GLOBAL_MARKETING_BASE,
  GLOBAL_NEGATIVE_BASE,
  CREATIVE_VARIATION_SEEDS,
};
