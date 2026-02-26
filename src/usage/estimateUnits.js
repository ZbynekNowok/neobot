/**
 * Rough unit estimates per operation type (to be replaced by real token/cost later).
 */
const ESTIMATES = {
  content_generate: 1500,
  background_generate: 3000,
  image_background: 1200,
  marketing_flyer: 5000,
  design_render: 2000,
  chat_message: 2,
  video_generate: 20000, // placeholder
  seo_generate: 4000,
  seo_audit: 3000,
};

/**
 * @param {{ type: string, payload?: object }} opts
 * @returns { number }
 */
function estimateUnits({ type, payload }) {
  const base = ESTIMATES[type];
  if (base !== undefined) return base;
  return 1000; // fallback
}

module.exports = { estimateUnits, ESTIMATES };
