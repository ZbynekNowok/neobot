/**
 * Image provider - Replicate SDXL
 * Delegates to replicate.js
 */
const replicateProvider = require("./replicate.js");

/**
 * Generate background image
 * Uses Replicate SDXL
 */
async function generateBackground(params) {
  return await replicateProvider.generateBackground(params);
}

module.exports = {
  generateBackground,
};
