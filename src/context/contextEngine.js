"use strict";

const crypto = require("crypto");
const { getClientProfile } = require("../marketing/clientProfile.js");

/** Force rules: brief regex → industry. Applied before profile industry. */
const INDUSTRY_FORCE_RULES = [
  { pattern: /\b(autobazar|auto ?bazar|bazar ?aut|prodej ?aut|prodejna ?aut|autosalon|autosal[oó]n|dealership|car ?dealer|car ?dealership|used ?cars|ojet[eé] ?vozy|auto|automotive|detailing|car|vozidlo|lak|politura|ceramic|car wash|myt[ií] aut)\b/i, industry: "automotive" },
  { pattern: /\b(móda|fashion|butik|oblečen|šaty|sukně|kabát|kolekce|outfit|dámsk|pánsk|oděv)\b/i, industry: "fashion" },
  { pattern: /\b(stavba|stavebn[ií]|stavebn[ií]ch|rozpočet|rozpočty|projekt|úrs|rts|architekt|blueprint|výkres|stavebnictv)\b/i, industry: "construction" },
  { pattern: /\b(realit|nemovitost|pronájem|prodej byt|dům na prodej|architektura)\b/i, industry: "real_estate" },
  { pattern: /\b(restaurac|gastro|jídlo|menu|kuchyně|culinary|food|kavárna)\b/i, industry: "restaurant" },
  { pattern: /\b(fitness|sport|tělocvična|trénink|athletic|posilovna)\b/i, industry: "fitness" },
  { pattern: /\b(saas|software|aplikace|dashboard|digitální|tech)\b/i, industry: "saas" },
];

/** Topic keywords per industry (for LLM/image context). */
const TOPIC_KEYWORDS_BY_INDUSTRY = {
  automotive: ["cars", "used cars", "dealership", "showroom", "car lot", "financing", "vehicles", "automotive"],
  fashion: ["fashion", "clothing", "outfit", "boutique", "apparel"],
  construction: ["construction", "building", "renovation", "architecture", "project"],
  real_estate: ["real estate", "property", "house", "apartment", "rent", "sale"],
  restaurant: ["restaurant", "food", "culinary", "menu", "dining"],
  fitness: ["fitness", "gym", "training", "sport", "health"],
  saas: ["software", "SaaS", "digital", "app", "technology"],
  general: [],
};

/**
 * Extract normalized brief from request body (single source of truth).
 * @param {object} body - req.body
 * @returns {string}
 */
function extractBrief(body) {
  if (!body || typeof body !== "object") return "";
  const raw =
    body.prompt ??
    body.userPrompt ??
    body.brief ??
    body.campaignPrompt ??
    body.text ??
    body.instructions ??
    "";
  return String(raw || "").trim();
}

/**
 * Resolve industry from brief + requested + profile. Force rules win over profile.
 * @param {string} brief
 * @param {string|null} requestedIndustry - body.industry or body.clientProfile?.industry
 * @param {string|null} profileIndustry - from workspace/profile
 * @returns {{ industry: string, source: "force" | "requested" | "profile" | "detected" }}
 */
function resolveIndustry(brief, requestedIndustry, profileIndustry) {
  const b = (brief && String(brief).toLowerCase()) || "";
  for (const { pattern, industry } of INDUSTRY_FORCE_RULES) {
    if (pattern.test(b)) return { industry, source: "force" };
  }
  if (requestedIndustry && String(requestedIndustry).trim()) {
    const normalized = String(requestedIndustry).toLowerCase().trim().replace(/-/g, "_");
    if (["automotive", "detailing", "fashion", "construction", "real_estate", "restaurant", "fitness", "saas", "general"].includes(normalized)) {
      return { industry: normalized === "realestate" ? "real_estate" : normalized, source: "requested" };
    }
  }
  if (profileIndustry && String(profileIndustry).trim()) {
    const normalized = String(profileIndustry).toLowerCase().trim().replace(/-/g, "_");
    if (normalized === "realestate") return { industry: "real_estate", source: "profile" };
    if (["automotive", "detailing", "fashion", "construction", "real_estate", "restaurant", "fitness", "saas", "general"].includes(normalized)) {
      return { industry: normalized, source: "profile" };
    }
  }
  return { industry: "general", source: "detected" };
}

/**
 * Build full ContextPack for any generative route.
 * @param {object} opts - { body, user, workspace, routeName }
 * @returns {Promise<ContextPack>}
 */
async function buildContextPack({ body = {}, user, workspace, routeName = "" }) {
  const brief = extractBrief(body);
  const clientProfile = body.clientProfile && typeof body.clientProfile === "object" ? body.clientProfile : null;
  const requestedIndustry = body.industry ?? clientProfile?.industry ?? null;
  const profileIndustry = (workspace && workspace.industry) || (clientProfile && clientProfile.industry) || null;
  const { industry: resolvedIndustry, source: industrySource } = resolveIndustry(brief, requestedIndustry, profileIndustry);

  const topicKeywords = TOPIC_KEYWORDS_BY_INDUSTRY[resolvedIndustry] || [];
  if (resolvedIndustry === "automotive" && brief) {
    topicKeywords.push("cars", "used cars", "dealership", "showroom");
  }

  const platform = body.platform ?? body.channel ?? null;
  const goal = body.goal ?? body.purpose ?? null;
  const language = (body.language && String(body.language).trim()) || "cs";
  const outputType = (body.outputType || body.taskType || routeName) || "content";

  const constraints = body.constraints && typeof body.constraints === "object"
    ? {
        mustInclude: Array.isArray(body.constraints.mustInclude) ? body.constraints.mustInclude : [],
        forbidden: Array.isArray(body.constraints.forbidden) ? body.constraints.forbidden : [],
        hardRules: Array.isArray(body.constraints.hardRules) ? body.constraints.hardRules : [],
      }
    : { mustInclude: [], forbidden: [], hardRules: [] };

  const audience = body.audience ?? clientProfile?.targetAudience ?? (workspace && workspace.target_audience) ?? null;
  const offerSummary = body.offerSummary ?? body.product_description ?? body.offer ?? null;

  const style = {
    tone: body.tone ?? clientProfile?.style ?? (workspace && workspace.tone) ?? null,
    length: body.length ?? null,
    formatHints: Array.isArray(body.formatHints) ? body.formatHints : [],
    preset: body.stylePreset && String(body.stylePreset).trim() ? String(body.stylePreset).trim().toLowerCase() : "auto",
  };

  const traceId = body.traceId ?? crypto.randomUUID();

  return {
    brief,
    language,
    outputType,
    platform,
    goal,
    resolvedIndustry,
    topicKeywords,
    offerSummary: offerSummary != null ? String(offerSummary) : undefined,
    audience: audience != null ? String(audience) : undefined,
    style,
    constraints,
    sources: {
      requestedIndustry: requestedIndustry ?? null,
      detectedIndustry: resolvedIndustry,
      profileIndustry: profileIndustry ?? null,
      industrySource,
    },
    traceId,
    clientProfile: clientProfile
      ? getClientProfile(clientProfile, resolvedIndustry)
      : workspace
        ? getClientProfile({ industry: workspace.industry, brandName: workspace.business_name }, resolvedIndustry)
        : null,
  };
}

/**
 * Build system prompt that enforces context (industry + brief); no topic drift.
 * @param {object} contextPack - ContextPack from buildContextPack
 * @param {string} [extraSystem] - Optional extra instructions
 * @returns {string}
 */
function buildLLMSystemPrompt(contextPack, extraSystem = "") {
  const { brief, resolvedIndustry, topicKeywords, audience, style, constraints } = contextPack;
  const topicLine = topicKeywords.length ? `Téma/klíčová slova: ${topicKeywords.join(", ")}.` : "";
  const industryLine = `Obor: ${resolvedIndustry}. Výstup MUSÍ zůstat v tomto oboru.`;
  const briefLine = brief ? `Zadání od klienta: ${brief}. Drž se tohoto zadání.` : "Žádné konkrétní zadání – drž se oboru a tématu.";
  const forbidLine = constraints.forbidden && constraints.forbidden.length
    ? `Nesmíš zmiňovat ani používat: ${constraints.forbidden.join(", ")}.`
    : "";
  const mustLine = constraints.mustInclude && constraints.mustInclude.length
    ? `Musíš zahrnout: ${constraints.mustInclude.join(", ")}.`
    : "";
  const selfCheck = "Před odpovědí zkontroluj, zda výstup explicitně souvisí se zadáním a oborem; pokud ne, oprav ho.";

  return [
    "Jsi NeoBot – marketingový asistent. Odpovídej výhradně v češtině (pokud není uvedeno jinak).",
    industryLine,
    topicLine,
    briefLine,
    audience ? `Cílová skupina: ${audience}.` : "",
    style.tone ? `Tón: ${style.tone}.` : "",
    mustLine,
    forbidLine,
    "Nesmíš měnit téma ani obor. Pokud chybí informace, použij bezpečné defaulty v rámci oboru.",
    selfCheck,
    extraSystem,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build user prompt: brief + task + constraints.
 * @param {object} contextPack - ContextPack from buildContextPack
 * @param {string} taskPrompt - Task-specific instruction (e.g. "Napiš reklamní text pro Instagram.")
 * @returns {string}
 */
function buildLLMUserPrompt(contextPack, taskPrompt) {
  const parts = [taskPrompt];
  if (contextPack.brief) parts.push(`Zadání: ${contextPack.brief}`);
  if (contextPack.constraints.hardRules && contextPack.constraints.hardRules.length) {
    parts.push("Pravidla: " + contextPack.constraints.hardRules.join("; "));
  }
  return parts.filter(Boolean).join("\n\n");
}

/**
 * For image/video: return params to pass to master prompt builder (brief + resolvedIndustry).
 * Actual prompt building stays in masterPromptBuilder; this just returns the context part.
 * @param {object} contextPack - ContextPack from buildContextPack
 * @param {string} [taskPrompt] - Optional task suffix
 * @returns {{ brief: string, industry: string, topicKeywords: string[] }}
 */
function buildProviderPrompt(contextPack, taskPrompt = "") {
  const brief = contextPack.brief
    ? (taskPrompt ? `${contextPack.brief}. ${taskPrompt}` : contextPack.brief)
    : taskPrompt || "professional marketing visual";
  return {
    brief,
    industry: contextPack.resolvedIndustry,
    topicKeywords: contextPack.topicKeywords || [],
  };
}

module.exports = {
  extractBrief,
  resolveIndustry,
  buildContextPack,
  buildLLMSystemPrompt,
  buildLLMUserPrompt,
  buildProviderPrompt,
  TOPIC_KEYWORDS_BY_INDUSTRY,
  INDUSTRY_FORCE_RULES,
};
