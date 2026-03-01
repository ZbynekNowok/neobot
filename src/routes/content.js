"use strict";

const express = require("express");
const crypto = require("crypto");
const { buildContextPack } = require("../context/contextEngine.js");
const { generateText } = require("../orchestrator/generate.js");

let llmChat;
try {
  llmChat = require("../llm/llmGateway.js").llmChat;
} catch (e) {
  llmChat = null;
}

const contentRouter = express.Router();

const PLATFORMS = new Set(["facebook", "instagram"]);
const PLATFORM_ALIASES = { fb: "facebook", ig: "instagram" };

/**
 * Vybere a normalizuje platform z requestu (backward compatible).
 * Pořadí: body.platform → query.platform → body.meta?.platform → body.channel → body.settings?.platform.
 * @returns {{ value: string, source: string }} normalizovaná hodnota a zdroj (pro debug)
 */
function getPlatform(req) {
  const body = req.body || {};
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const raw =
    (typeof body.platform === "string" && body.platform.trim()) ||
    (typeof req.query?.platform === "string" && req.query.platform.trim()) ||
    (typeof meta.platform === "string" && meta.platform.trim()) ||
    (typeof body.channel === "string" && body.channel.trim()) ||
    (typeof settings.platform === "string" && settings.platform.trim()) ||
    "";
  const key = (raw.toLowerCase().trim() || "");
  const normalized = PLATFORM_ALIASES[key] || key;
  const source =
    typeof body.platform === "string" && body.platform.trim() ? "body.platform"
    : typeof req.query?.platform === "string" && req.query.platform.trim() ? "query.platform"
    : typeof meta.platform === "string" && meta.platform.trim() ? "meta.platform"
    : typeof body.channel === "string" && body.channel.trim() ? "channel"
    : typeof settings.platform === "string" && settings.platform.trim() ? "settings.platform"
    : "none";
  return { value: normalized, source };
}

const TONE_LABELS = {
  formalni: "formální a profesionální",
  neformalni: "neformální a přátelský",
  hravy: "hravý a odlehčený",
  expertni: "expertní a autoritativní",
  presvedcivy: "přesvědčivý a prodejní",
  profesionalni: "profesionální",
  osobni: "osobní a přátelský",
  prodejni: "prodejní",
  informativni: "informativní",
  pratelsky: "přátelský",
};
const PURPOSE_LABELS = {
  prodej: "prodej produktu/služby",
  engagement: "zvýšení interakce a dosahu",
  edukace: "edukace a předání hodnoty",
  education: "edukace a předání hodnoty",
  brand: "budování povědomí o značce",
  kontakt: "získání kontaktu",
  informovani: "informování",
  onboarding: "onboarding nového zákazníka",
};
const LENGTH_RANGES = {
  kratky: { min: 200, max: 400 },
  stredni: { min: 500, max: 900 },
  dlouhy: { min: 900, max: 1600 },
};

function getLengthRange(len) {
  const key = (String(len || "stredni").toLowerCase()).trim();
  return LENGTH_RANGES[key] || LENGTH_RANGES.stredni;
}

/** Build a short "firemní profil" block for the LLM so all content is tailored to the client. */
function buildProfileBlock(profile) {
  if (!profile || typeof profile !== "object") return "";
  const p = profile;
  const name = p.business_name || p.brand_name || "";
  const industry = p.industry || p.business || "";
  const audience = p.target_audience || p.ideal_customer || "";
  const usp = p.usp || p.unique_value || "";
  const tone = p.tone || p.communication_style || p.brand_keywords || p.cta_style || "";
  const services = p.main_services != null
    ? (Array.isArray(p.main_services) ? p.main_services.join(", ") : String(p.main_services))
    : (Array.isArray(p.marketing_goal) ? p.marketing_goal.join(", ") : "");
  const parts = [];
  if (name) parts.push(`Značka / firma: ${name}`);
  if (industry) parts.push(`Obor / činnost: ${industry}`);
  if (audience) parts.push(`Cílový zákazník: ${audience}`);
  if (usp) parts.push(`Jedinečná hodnota / USP: ${usp}`);
  if (tone) parts.push(`Tón / styl komunikace: ${tone}`);
  if (services) parts.push(`Cíle nebo služby: ${services}`);
  if (parts.length === 0) return "";
  return "\n\nPROFIL KLIENTA (všechny texty musí být v souladu s tímto profilem):\n" + parts.join("\n");
}

/** Remove year (20xx) from text unless user prompt explicitly mentions a year */
function stripYearsFromText(text, userPrompt) {
  if (!text || typeof text !== "string") return text;
  const hasExplicitYear = /\b20\d{2}\b/.test(userPrompt || "");
  if (hasExplicitYear) return text;
  return text.replace(/\b20\d{2}\b/g, "").replace(/\s+/g, " ").trim();
}

function stripYearsFromHashtags(hashtags, userPrompt) {
  if (!Array.isArray(hashtags)) return [];
  const hasExplicitYear = /\b20\d{2}\b/.test(userPrompt || "");
  if (hasExplicitYear) return hashtags;
  return hashtags
    .filter((h) => typeof h === "string")
    .map((h) => h.replace(/#?20\d{2}/gi, "").replace(/#+/g, "#").trim())
    .filter((h) => h.length > 1);
}

/** Parse LLM response: expect JSON block or fallback to plain text */
function parseGenerateResponse(outputText) {
  const text = (outputText || "").trim();
  let textPart = "";
  let hashtags = [];
  let notes = [];

  // Try JSON block (e.g. ```json ... ``` or raw {"text":...}
  const jsonMatch = text.match(/\{[\s\S]*"text"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      textPart = typeof parsed.text === "string" ? parsed.text.trim() : "";
      hashtags = Array.isArray(parsed.hashtags)
        ? parsed.hashtags.filter((h) => typeof h === "string").map((h) => (h.startsWith("#") ? h : "#" + h))
        : [];
      notes = Array.isArray(parsed.notes)
        ? parsed.notes.filter((n) => typeof n === "string")
        : [];
    } catch (_) {
      /* ignore */
    }
  }

  if (!textPart) {
    // Fallback: use full output as text, try to extract "Hashtagy:" line
    const hashtagLine = text.match(/(?:Hashtagy|hashtags?):\s*([^\n]+)/i);
    if (hashtagLine) {
      hashtags = (hashtagLine[1].match(/#\w+/g) || []).slice(0, 15);
      textPart = text.replace(/\n*(?:Hashtagy|hashtags?):[^\n]*/i, "").trim();
    } else {
      textPart = text;
    }
    const notesBlock = textPart.match(/---\s*\n([\s\S]*)/);
    if (notesBlock) {
      notes = notesBlock[1]
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      textPart = textPart.replace(/\s*---\s*\n[\s\S]*/, "").trim();
    }
  }

  return {
    text: textPart || text,
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    notes: Array.isArray(notes) ? notes : [],
  };
}

contentRouter.post("/content/generate", async (req, res) => {
  if (!llmChat) {
    return res.status(503).json({
      ok: false,
      error: "Služba pro generování textu není nakonfigurována (OPENAI_API_KEY).",
    });
  }

  const body = req.body || {};
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const type = body.type || "create_post";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};

  if (!prompt) {
    return res.status(400).json({ ok: false, error: "Prompt is required" });
  }

  const debugEnabled = req.query?.debug === "1";
  const { value: platform, source: platformSource } = getPlatform(req);
  if (!platform) {
    const payload = {
      ok: false,
      error: "Platform is required. Send platform: 'facebook' or 'instagram' in body, query (?platform=), or body.settings.platform",
    };
    if (debugEnabled) payload._debug = { platformSource, platformValue: null };
    return res.status(400).json(payload);
  }
  if (!PLATFORMS.has(platform)) {
    const payload = {
      ok: false,
      error: "Platform must be 'facebook' or 'instagram'",
    };
    if (debugEnabled) payload._debug = { platformSource, platformValue: platform };
    return res.status(400).json(payload);
  }

  const purpose = (settings.purpose || "prodej").toLowerCase().trim();
  const tone = (settings.tone || "neformalni").toLowerCase().trim();
  const lengthKey = (settings.length || "stredni").toLowerCase().trim();
  const lengthRange = getLengthRange(lengthKey);

  const toneDesc = TONE_LABELS[tone] || tone;
  const purposeDesc = PURPOSE_LABELS[purpose] || purpose;
  const platformName = platform === "instagram" ? "Instagram" : "Facebook";

  const profileBlock = buildProfileBlock(profile);
  const debugEnabledForLlm = debugEnabled || process.env.NODE_ENV !== "production";

  try {
    const contextPack = await buildContextPack({
      body: {
        prompt,
        userPrompt: prompt,
        brief: prompt,
        platform,
        goal: purpose,
        clientProfile: profile && Object.keys(profile).length ? { ...profile, industry: profile.industry || profile.business } : null,
        outputType: "content_generate",
      },
      routeName: "content/generate",
    });

    const extraSystem = `Pravidla: Piš pouze finální text příspěvku, žádné vysvětlování. Délka textu: ${lengthRange.min}–${lengthRange.max} znaků.
Všechny texty musí být uzpůsobeny firemnímu profilu klienta (značka, cílová skupina, tón, USP).${profileBlock}

Výstup vrať jako jeden JSON objekt s klíči: "text", "hashtags" (pole řetězců, každý hashtag s #), "notes" (pole krátkých tipů, volitelné). Žádný text mimo JSON.`;

    const taskPrompt = `Vytvoř příspěvek pro ${platformName}.
Účel: ${purposeDesc}. Tón: ${toneDesc}. Délka: ${lengthRange.min}–${lengthRange.max} znaků.

Vrať pouze validní JSON ve tvaru: {"text":"...","hashtags":["#tag1","#tag2"],"notes":["tip1","tip2"]}`;
    const result = await generateText({
      contextPack,
      task: taskPrompt,
      params: {
        model: process.env.CONTENT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        maxOutputTokens: 1500,
        purpose: "content_generate",
        extraSystem,
      },
      debug: debugEnabledForLlm,
    });

    const output_text = result.output_text;

    const parsed = parseGenerateResponse(output_text);
    let { text, hashtags, notes } = parsed;

    text = stripYearsFromText(text, prompt);
    hashtags = stripYearsFromHashtags(hashtags, prompt);

    const json = {
      ok: true,
      text: text || "",
      hashtags: hashtags || [],
      notes: notes || [],
    };
    if (debugEnabled && result._debug) json._debug = result._debug;
    if (debugEnabled) json._debug = { ...(json._debug || {}), platformSource, platformValue: platform };
    return res.json(json);
  } catch (err) {
    const code = err.code === "LLM_UNAVAILABLE" ? 503 : 500;
    const message = err.code === "LLM_UNAVAILABLE" ? "Služba pro generování textu je dočasně nedostupná." : (err.message || "Chyba generování.");
    return res.status(code).json({ ok: false, error: message });
  }
});

module.exports = { contentRouter };
