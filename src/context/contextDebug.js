"use strict";

/**
 * Build debug object for API response (when ?debug=1).
 * Truncates long strings so responses stay small.
 */
function truncate(str, maxLen = 200) {
  if (str == null) return undefined;
  const s = String(str);
  return s.length <= maxLen ? s : s.slice(0, maxLen) + "...";
}

/**
 * @param {object} contextPack - Full ContextPack
 * @param {object} [extra] - { finalSystemPrompt, finalUserPrompt, providerPrompt, negativePrompt, industryUsed, heroLockUsed }
 * @returns {object} Safe debug object for JSON response
 */
function buildDebugOutput(contextPack, extra = {}) {
  const out = {
    contextUsed: {
      brief: truncate(contextPack.brief),
      resolvedIndustry: contextPack.resolvedIndustry,
      outputType: contextPack.outputType,
      topicKeywords: contextPack.topicKeywords,
      sources: contextPack.sources,
      traceId: contextPack.traceId,
      style: contextPack.style && typeof contextPack.style === "object" ? { preset: contextPack.style.preset } : undefined,
      constraints:
        contextPack.constraints && typeof contextPack.constraints === "object"
          ? { negativePrompt: truncate(contextPack.constraints.negativePrompt, 500) }
          : undefined,
    },
  };
  if (extra.finalSystemPrompt != null) out.finalSystemPrompt = truncate(extra.finalSystemPrompt, 400);
  if (extra.finalUserPrompt != null) out.finalUserPrompt = truncate(extra.finalUserPrompt, 400);
  if (extra.providerPrompt != null) out.providerPrompt = truncate(extra.providerPrompt, 400);
  if (extra.negativePrompt != null) out.negativePrompt = truncate(extra.negativePrompt, 500);
  if (extra.industryUsed != null) out.industryUsed = extra.industryUsed;
  if (extra.heroLockUsed != null) out.heroLockUsed = extra.heroLockUsed;
  if (extra.multipleOutputsReturned != null) out.multipleOutputsReturned = extra.multipleOutputsReturned;
  if (extra.suspectedCollage != null) out.suspectedCollage = extra.suspectedCollage;
  return out;
}

module.exports = { buildDebugOutput, truncate };
