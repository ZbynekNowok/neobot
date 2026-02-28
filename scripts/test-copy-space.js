#!/usr/bin/env node
/**
 * Dev test: run copy-space detection on a background image and print scores per placement.
 * Usage: node scripts/test-copy-space.js <path-to-image>
 * Example: node scripts/test-copy-space.js public/outputs/backgrounds/some.png
 */
const path = require("path");
const { pickBestPlacementFromImage } = require("../src/marketing/copySpace.js");

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: node scripts/test-copy-space.js <path-to-image>");
  process.exit(1);
}

const absPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);

(async () => {
  try {
    const result = await pickBestPlacementFromImage(absPath, "flyer");
    console.log("Chosen placement:", result.placement);
    console.log("Scores (lower = cleaner):");
    if (result.scores) {
      Object.entries(result.scores)
        .sort((a, b) => a[1] - b[1])
        .forEach(([p, s]) => console.log("  ", p, ":", s.toFixed(2)));
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
