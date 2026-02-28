"use strict";

/**
 * Global Master Image Prompt Engine – base constants applied to ALL image generation.
 * Ensures: commercial quality, single scene, no collage/grid/screenshot, NO TEXT in image.
 */

const GLOBAL_POSITIVE_BASE = [
  "commercial advertising photo, high-end, sharp, crisp, professional lighting",
  "single scene, one hero subject, no collage, no grid, no tiled layout",
  "NO TEXT, NO LOGOS, NO WATERMARKS, NO UI, NO WEBSITE SCREENSHOT",
  "leave clean copy-space areas (top/bottom/side), low clutter",
].join(", ");

const GLOBAL_NEGATIVE_BASE = [
  "text, letters, typography, watermark, logo, caption",
  "collage, grid, tiled layout, lineup, catalog sheet, product sheet, multiple products, repeated objects",
  "website screenshot, webpage, UI, interface, browser, menu, header, footer, paragraph text, lorem ipsum",
  "blurry, soft focus, motion blur, low detail, out of focus",
].join(", ");

const CREATIVE_VARIATION_SEEDS = [
  "editorial lifestyle scene, dynamic angle, shallow depth of field",
  "studio editorial, soft key light, premium look",
  "street lifestyle, natural light, urban context",
  "boutique interior, warm ambient, curated props",
  "outdoor spring city, golden hour, aspirational mood",
  "minimalist studio, single hero, clean shadows",
  "environmental portrait style, rich backdrop, cinematic",
  "lifestyle moment, candid feel, authentic setting",
];

module.exports = {
  GLOBAL_POSITIVE_BASE,
  GLOBAL_NEGATIVE_BASE,
  CREATIVE_VARIATION_SEEDS,
};
