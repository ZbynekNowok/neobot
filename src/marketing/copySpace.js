"use strict";

const path = require("path");
const sharp = require("sharp");

/**
 * Region definitions for clutter scoring (fractions of image size).
 * Same style as SAFE_AREA_BY_PLACEMENT; used to sample gradient magnitude.
 */
const REGION_BY_PLACEMENT = {
  top_left: { xPct: 0.07, yPct: 0.05, wPct: 0.86, hPct: 0.35 },
  top_center: { xPct: 0.2, yPct: 0.05, wPct: 0.6, hPct: 0.3 },
  center: { xPct: 0.25, yPct: 0.35, wPct: 0.5, hPct: 0.3 },
  bottom_left: { xPct: 0.07, yPct: 0.6, wPct: 0.86, hPct: 0.33 },
  bottom_center: { xPct: 0.07, yPct: 0.6, wPct: 0.86, hPct: 0.33 },
  right_panel: { xPct: 0.52, yPct: 0.1, wPct: 0.43, hPct: 0.8 },
};

const CENTER_THRESHOLD = 0.85; // center allowed only if score(center) <= bestEdgeScore * this

/**
 * Compute mean gradient magnitude in a region (lower = cleaner / less clutter).
 * Uses grayscale image and simple |dx|+|dy| approximation.
 */
function regionClutterScore(gray, width, height, xPct, yPct, wPct, hPct) {
  const x0 = Math.max(1, Math.floor(width * xPct));
  const y0 = Math.max(1, Math.floor(height * yPct));
  const x1 = Math.min(width - 2, Math.floor(width * (xPct + wPct)));
  const y1 = Math.min(height - 2, Math.floor(height * (yPct + hPct)));
  if (x0 >= x1 || y0 >= y1) return Infinity;

  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * width + x;
      const dx = Math.abs((gray[i + 1] ?? gray[i]) - (gray[i - 1] ?? gray[i]));
      const dy = Math.abs((gray[i + width] ?? gray[i]) - (gray[i - width] ?? gray[i]));
      sum += dx + dy;
      count++;
    }
  }
  return count > 0 ? sum / count : Infinity;
}

/**
 * Load image, convert to grayscale buffer (1 byte per pixel).
 */
async function loadGrayscaleBuffer(imagePath) {
  const absPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
  const { data, info } = await sharp(absPath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { gray: new Uint8Array(data), width: info.width, height: info.height };
}

/**
 * Pick best text placement by analyzing background image for low-clutter regions.
 * Uses gradient magnitude (lower = cleaner). Center is allowed only if significantly
 * cleaner than edge regions (score <= bestEdgeScore * CENTER_THRESHOLD).
 *
 * @param {string} imagePath - Absolute or relative path to the background image
 * @param {string} textLayout - "flyer" | "balanced" | "visual" (flyer includes right_panel)
 * @returns {Promise<string>} One of: top_left, top_center, center, bottom_left, bottom_center, right_panel
 */
async function pickBestPlacementFromImage(imagePath, textLayout) {
  const { gray, width, height } = await loadGrayscaleBuffer(imagePath);

  const candidates = [
    "top_left",
    "top_center",
    "bottom_left",
    "bottom_center",
    "right_panel",
  ];
  if (textLayout === "flyer") {
    // right_panel already included
  }
  const includeCenter = true;
  const placements = includeCenter ? [...candidates, "center"] : candidates;

  const scores = {};
  for (const key of placements) {
    const r = REGION_BY_PLACEMENT[key];
    if (!r) continue;
    scores[key] = regionClutterScore(gray, width, height, r.xPct, r.yPct, r.wPct, r.hPct);
  }

  const edgePlacements = placements.filter((p) => p !== "center");
  const edgeScores = edgePlacements.map((p) => scores[p]).filter((s) => s != null);
  const bestEdgeScore = edgeScores.length > 0 ? Math.min(...edgeScores) : Infinity;
  const centerScore = scores.center != null ? scores.center : Infinity;
  const centerAllowed = centerScore <= bestEdgeScore * CENTER_THRESHOLD;

  let best = "bottom_left";
  let bestScore = Infinity;

  for (const p of placements) {
    const s = scores[p];
    if (s == null) continue;
    if (p === "center" && !centerAllowed) continue;
    if (s < bestScore) {
      best = p;
      bestScore = s;
    }
  }

  return { placement: best, scores };
}

/**
 * Public API: pick best placement and return only the placement string (for compose flow).
 */
async function pickBestPlacementFromImageForCompose(imagePath, textLayout) {
  const { placement, scores } = await pickBestPlacementFromImage(imagePath, textLayout);
  return placement;
}

module.exports = {
  pickBestPlacementFromImage,
  pickBestPlacementFromImageForCompose,
  REGION_BY_PLACEMENT,
};
