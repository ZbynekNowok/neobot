"use strict";

const { buildLLMSystemPrompt, buildLLMUserPrompt, buildProviderPrompt } = require("../context/contextEngine.js");
const { buildDebugOutput } = require("../context/contextDebug.js");
const { markContextUsage } = require("../context/contextGuard.js");
const { llmChat } = require("../llm/llmGateway.js");
const { composeImageWithText } = require("../marketing/imageCompose.js");
const {
  generateBackground,
  generateFromImage,
  buildPrompt,
  buildNegativePrompt,
} = require("../imageProviders/replicate.js");

const DEV_GUARD = process.env.NODE_ENV !== "production";

/**
 * Hard enforcement: every generate function must receive a valid ContextPack.
 */
function assertContextPack(contextPack) {
  if (!contextPack) throw new Error("ContextPack missing");
  if (!contextPack.traceId) throw new Error("ContextPack traceId missing");
  if (!contextPack.resolvedIndustry) throw new Error("ContextPack resolvedIndustry missing");
  if (contextPack.brief === undefined || contextPack.brief === null) throw new Error("ContextPack brief missing");
}

/**
 * Generate text via LLM. Only entry point for text generation (content, ads, SEO, chat, etc.).
 * @param {{ contextPack: object, task: string, params?: object, debug?: boolean }}
 * @returns {Promise<{ output_text: string, _raw?: object, _debug?: object }>}
 */
async function generateText({ contextPack, task, params = {}, debug = false }) {
  assertContextPack(contextPack);
  const requestId = contextPack.traceId || params.requestId || "orch-text";
  let messages;

  if (params.messages && Array.isArray(params.messages) && params.messages.length > 0) {
    const contextSystem = buildLLMSystemPrompt(contextPack, "");
    const copy = params.messages.map((m) => ({ role: m.role, content: String(m.content || "") }));
    const first = copy[0];
    if (first && first.role === "system") {
      first.content = contextSystem + "\n\n" + (first.content || "");
    } else {
      copy.unshift({ role: "system", content: contextSystem });
    }
    messages = copy;
  } else {
    const extraSystem = params.extraSystem || "";
    const systemPrompt = buildLLMSystemPrompt(contextPack, extraSystem);
    const userPrompt = buildLLMUserPrompt(contextPack, task || "");
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    if (debug) {
      params._lastSystemPrompt = systemPrompt;
      params._lastUserPrompt = userPrompt;
    }
  }

  if (DEV_GUARD) {
    console.log("[NeoBot Orchestrator]", contextPack.traceId, contextPack.resolvedIndustry, contextPack.outputType);
  }
  markContextUsage(contextPack);
  let result;
  try {
    result = await llmChat({
      requestId,
      traceId: contextPack.traceId,
      model: params.model || process.env.CONTENT_MODEL || "gpt-4o-mini",
      messages,
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxOutputTokens ?? 1500,
      purpose: params.purpose || contextPack.outputType || "neobot_generate",
    });
  } catch (err) {
    console.error("Orchestrator provider error:", err);
    throw err;
  }

  if (debug) {
    result._debug = buildDebugOutput(contextPack, {
      finalSystemPrompt: params._lastSystemPrompt || (messages[0]?.role === "system" ? messages[0].content : ""),
      finalUserPrompt: params._lastUserPrompt || (messages.find((m) => m.role === "user")?.content || ""),
    });
  }
  return result;
}

/**
 * Generate image (background-only or full compose with text). Only entry point for image generation.
 * Injects contextPack.brief and contextPack.resolvedIndustry into the flow.
 * @param {{ contextPack: object, task: "background" | "compose", params: object, debug?: boolean }}
 */
async function generateImage({ contextPack, task, params, debug = false }) {
  assertContextPack(contextPack);
  if (DEV_GUARD) {
    console.log("[NeoBot Orchestrator]", contextPack.traceId, contextPack.resolvedIndustry, contextPack.outputType);
  }
  markContextUsage(contextPack);

  const options = {
    ...params,
    prompt: contextPack.brief || params.prompt || "professional marketing visual",
    userPrompt: contextPack.brief || params.userPrompt,
    clientProfile: contextPack.clientProfile
      ? { ...contextPack.clientProfile, industry: contextPack.resolvedIndustry }
      : { ...params.clientProfile, industry: contextPack.resolvedIndustry },
    industry: contextPack.resolvedIndustry,
    debug: debug || params.debug,
    _traceId: contextPack.traceId,
  };

  try {
    if (task === "background" && params.backgroundOnly) {
      const result = await composeImageWithText(options, contextPack.traceId || params.requestId);
      if (debug) result._debug = buildDebugOutput(contextPack, result._debug || {});
      return result;
    }
    const result = await composeImageWithText(options, contextPack.traceId || params.requestId);
    if (debug) {
      result._debug = buildDebugOutput(contextPack, result._debug || {});
    }
    return result;
  } catch (err) {
    console.error("Orchestrator provider error:", err);
    throw err;
  }
}

/**
 * Generate background image for design/social-card (fixed dimensions, no compose).
 * Uses contextPack.brief and contextPack.resolvedIndustry. Only entry point for design background.
 * @param {{ contextPack: object, params: { width: number, height: number, style?: string, purpose?: string, palette?: string, brand?: object }, debug?: boolean }}
 */
async function generateDesignBackground({ contextPack, params, debug = false }) {
  assertContextPack(contextPack);
  if (DEV_GUARD) {
    console.log("[NeoBot Orchestrator]", contextPack.traceId, contextPack.resolvedIndustry, contextPack.outputType);
  }
  markContextUsage(contextPack);

  const industry = contextPack.resolvedIndustry || "general";
  const description = contextPack.brief || params.description || "social media marketing visual with clean negative space";
  const brand = params.brand && typeof params.brand === "object" ? params.brand : (contextPack.clientProfile ? { name: contextPack.clientProfile.brandName, primary: "#2563eb", accent: "#7c3aed" } : { primary: "#2563eb", accent: "#7c3aed", name: "" });

  const bgPrompt = buildPrompt({
    industry,
    style: params.style || "minimal",
    purpose: params.purpose || "sale",
    palette: params.palette || "neutral",
    description,
    brand,
  });
  const negativePrompt = buildNegativePrompt(industry);

  let bgResult;
  try {
    bgResult = await generateBackground({
      prompt: bgPrompt,
      negativePrompt,
      width: params.width || 1080,
      height: params.height || 1080,
      jobId: contextPack.traceId || params.jobId || `design-bg-${Date.now()}`,
    });
  } catch (err) {
    console.error("Orchestrator provider error:", err);
    throw err;
  }

  const result = {
    background: {
      imageUrl: bgResult.publicUrl,
      width: bgResult.width,
      height: bgResult.height,
      engine: "replicate_sdxl",
      model: bgResult.model,
    },
  };
  if (debug) result._debug = buildDebugOutput(contextPack, { providerPrompt: bgPrompt, negativePrompt });
  return result;
}

/**
 * Generate background via Replicate with contextPack (industry + brief). For ads/workers that need raw generateBackground.
 * @param {{ contextPack: object, params: object, debug?: boolean }}
 */
async function generateBackgroundWithContext({ contextPack, params = {}, debug = false }) {
  assertContextPack(contextPack);
  if (DEV_GUARD) {
    console.log("[NeoBot Orchestrator]", contextPack.traceId, contextPack.resolvedIndustry, contextPack.outputType);
  }
  markContextUsage(contextPack);

  const merged = {
    ...params,
    clientProfile: params.clientProfile || contextPack.clientProfile
      ? { ...(contextPack.clientProfile || {}), ...(params.clientProfile || {}), industry: contextPack.resolvedIndustry }
      : { industry: contextPack.resolvedIndustry },
    industry: params.industry ?? contextPack.resolvedIndustry,
    campaignPrompt: params.campaignPrompt ?? contextPack.brief ?? params.prompt,
    jobId: params.jobId || contextPack.traceId,
  };
  let result;
  try {
    result = await generateBackground(merged);
  } catch (err) {
    console.error("Orchestrator provider error:", err);
    throw err;
  }
  if (debug) result._debug = buildDebugOutput(contextPack, { providerPrompt: merged.campaignPrompt });
  return result;
}

/**
 * Generate image-from-image (product variants) via Replicate with contextPack.
 * @param {{ contextPack: object, params: object, debug?: boolean }}
 */
async function generateFromImageWithContext({ contextPack, params = {}, debug = false }) {
  assertContextPack(contextPack);
  if (DEV_GUARD) {
    console.log("[NeoBot Orchestrator]", contextPack.traceId, contextPack.resolvedIndustry, contextPack.outputType);
  }
  markContextUsage(contextPack);

  const merged = {
    ...params,
    clientProfile: params.clientProfile || contextPack.clientProfile
      ? { ...(contextPack.clientProfile || {}), ...(params.clientProfile || {}), industry: contextPack.resolvedIndustry }
      : { industry: contextPack.resolvedIndustry },
    industry: params.industry ?? contextPack.resolvedIndustry,
    jobId: params.jobId || contextPack.traceId,
  };
  let result;
  try {
    result = await generateFromImage(merged);
  } catch (err) {
    console.error("Orchestrator provider error:", err);
    throw err;
  }
  if (debug) result._debug = buildDebugOutput(contextPack, {});
  return result;
}

/**
 * Generate SEO (delegate to LLM with context). Placeholder for queue-based SEO worker integration.
 * @param {{ contextPack: object, task: string, params?: object, debug?: boolean }}
 */
async function generateSEO({ contextPack, task, params = {}, debug = false }) {
  return generateText({
    contextPack,
    task,
    params: { ...params, purpose: "seo_generate" },
    debug,
  });
}

/**
 * Generate video script/prompt. Delegate to LLM with context.
 * @param {{ contextPack: object, task: string, params?: object, debug?: boolean }}
 */
async function generateVideoPrompt({ contextPack, task, params = {}, debug = false }) {
  return generateText({
    contextPack,
    task,
    params: { ...params, purpose: "video_prompt" },
    debug,
  });
}

module.exports = {
  generateText,
  generateImage,
  generateDesignBackground,
  generateBackgroundWithContext,
  generateFromImageWithContext,
  generateSEO,
  generateVideoPrompt,
};
