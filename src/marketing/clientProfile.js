"use strict";

/**
 * Client profile resolution for Master Image Prompt Engine.
 * Client mode: use strict profile from request. Agency mode: use selected client/campaign profile.
 * Fallback: use fallbackIndustry (caller should pass detectIndustry(userPrompt) when no profile).
 */

const NORMALIZED_INDUSTRIES = [
  "fashion",
  "construction",
  "real_estate",
  "restaurant",
  "fitness",
  "saas",
  "general",
];

function normalizeIndustry(industry) {
  if (!industry || typeof industry !== "string") return "general";
  const i = industry.toLowerCase().trim().replace(/-/g, "_");
  if (NORMALIZED_INDUSTRIES.includes(i)) return i;
  if (i === "realestate") return "real_estate";
  return "general";
}

/**
 * Get resolved client profile for prompt building.
 * @param {object} clientProfileFromReq - Optional profile from req.body.clientProfile (e.g. { industry, brandName, style, targetAudience, colors })
 * @param {string} fallbackIndustry - Industry when no profile (e.g. from detectIndustry(userPrompt))
 * @returns {{ industry: string, brandName?: string, style?: string, targetAudience?: string, colors?: string[], industryLock: boolean }}
 */
function getClientProfile(clientProfileFromReq, fallbackIndustry) {
  if (clientProfileFromReq && typeof clientProfileFromReq === "object") {
    const industry = normalizeIndustry(clientProfileFromReq.industry || fallbackIndustry || "general");
    return {
      industry,
      brandName: clientProfileFromReq.brandName || clientProfileFromReq.name || null,
      style: clientProfileFromReq.style || null,
      targetAudience: clientProfileFromReq.targetAudience || null,
      colors: Array.isArray(clientProfileFromReq.colors) ? clientProfileFromReq.colors : null,
      industryLock: true,
    };
  }
  return {
    industry: normalizeIndustry(fallbackIndustry || "general"),
    brandName: null,
    style: null,
    targetAudience: null,
    colors: null,
    industryLock: false,
  };
}

module.exports = {
  getClientProfile,
  normalizeIndustry,
};
