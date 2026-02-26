"use strict";

const express = require("express");
const crypto = require("crypto");
const { llmChat } = require("../llm/llmGateway.js");
const {
  generateBackground,
  buildPrompt,
  buildNegativePrompt,
} = require("../imageProviders/replicate.js");

let getAuthUser, ensureWorkspace, getProfileByWorkspaceId, saveOutput;
try {
  getAuthUser = require("../auth/getAuthUser.js").getAuthUser;
  ensureWorkspace = require("../auth/ensureWorkspace.js").ensureWorkspace;
  const { db } = require("../db/database.js");
  saveOutput = require("../saas/saveOutput.js").saveOutput;
  function rowToProfile(row) {
    if (!row) return null;
    let main_services = row.main_services;
    if (typeof main_services === "string" && main_services) {
      try {
        main_services = JSON.parse(main_services);
      } catch (_) {
        main_services = null;
      }
    }
    return {
      business_name: row.business_name,
      industry: row.industry,
      target_audience: row.target_audience,
      city: row.city,
      tone: row.tone,
      usp: row.usp,
      main_services: Array.isArray(main_services) ? main_services : null,
      cta_style: row.cta_style,
      brand_logo_url: row.brand_logo_url || null,
    };
  }
  getProfileByWorkspaceId = (workspaceId) => {
    const row = db.prepare(
      "SELECT business_name, industry, target_audience, city, tone, usp, main_services, cta_style, brand_logo_url FROM workspace_profile WHERE workspace_id = ?"
    ).get(workspaceId);
    return rowToProfile(row);
  };
} catch (_) {
  getAuthUser = (req, res, next) => next();
  ensureWorkspace = (req, res, next) => next();
  getProfileByWorkspaceId = () => null;
  saveOutput = () => {};
}

const designRouter = express.Router();

const FORMAT_DIMENSIONS = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1344 },
  "9:16": { width: 1080, height: 1920 },
};

function getFormatKey(format) {
  const key = String(format || "4:5").trim();
  if (FORMAT_DIMENSIONS[key]) return key;
  if (key === "ig_post") return "4:5";
  if (key === "ig_story") return "9:16";
  return "4:5";
}

function parseKeywords(raw) {
  if (Array.isArray(raw)) return raw.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, 20);
  if (typeof raw === "string" && raw.trim()) return raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  return [];
}

function trimString(val) {
  return val != null && typeof val === "string" ? val.trim() || null : null;
}

function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    business_name: trimString(raw.business_name),
    industry: trimString(raw.industry),
    target_audience: trimString(raw.target_audience),
    city: trimString(raw.city),
    tone: trimString(raw.tone),
    usp: trimString(raw.usp),
    main_services: Array.isArray(raw.main_services) ? raw.main_services.slice(0, 20) : null,
    cta_style: trimString(raw.cta_style),
    brand_logo_url: trimString(raw.brand_logo_url),
  };
}

designRouter.post("/design/social-card/draft", getAuthUser, ensureWorkspace, async (req, res) => {
  const {
    url,
    goals: rawGoals,
    theme: rawTheme,
    keywords: rawKeywords,
    product_description: rawProductDesc,
    profile: rawProfile,
    format: rawFormat,
    style,
    palette,
    purpose,
  } = req.body || {};

  const goals = trimString(rawGoals);
  const theme = trimString(rawTheme);
  const keywords = parseKeywords(rawKeywords);
  const productDescription = trimString(rawProductDesc);
  const fullUserBrief = [goals, theme, keywords.length ? keywords.join(", ") : "", productDescription]
    .filter(Boolean)
    .join(". ");

  let profile =
    (req.workspace && getProfileByWorkspaceId && getProfileByWorkspaceId(req.workspace.id)) || null;
  if (!profile) profile = normalizeProfile(rawProfile);
  else profile = normalizeProfile(profile);

  const formatKey = getFormatKey(rawFormat);
  const dims = FORMAT_DIMENSIONS[formatKey];
  const jobId = crypto.randomUUID();

  try {
    const bgPrompt = buildPrompt({
      industry: profile?.industry || "",
      style: style || "minimal",
      purpose: purpose || "sale",
      palette: palette || "neutral",
      description: fullUserBrief || "social media marketing visual with clean negative space",
      brand: profile ? { primary: "#2563eb", accent: "#7c3aed", name: profile.business_name || "" } : {},
    });
    const negativePrompt = buildNegativePrompt();
    const bgResult = await generateBackground({
      prompt: bgPrompt,
      negativePrompt,
      width: dims.width,
      height: dims.height,
      jobId,
    });

    const background = {
      imageUrl: bgResult.publicUrl,
      width: bgResult.width,
      height: bgResult.height,
      engine: "replicate_sdxl",
      model: bgResult.model,
    };

    const contextLines = [];
    if (profile) {
      if (profile.business_name) contextLines.push("Firma / značka: " + profile.business_name);
      if (profile.industry) contextLines.push("Obor: " + profile.industry);
      if (profile.target_audience) contextLines.push("Cílová skupina: " + profile.target_audience);
      if (profile.usp) contextLines.push("USP: " + profile.usp);
      if (profile.tone) contextLines.push("Tón komunikace: " + profile.tone);
    }
    if (goals) contextLines.push("Cíl kampaně: " + goals);
    if (theme) contextLines.push("Téma vizuálu: " + theme);
    if (keywords.length) contextLines.push("Klíčová slova: " + keywords.join(", "));
    const contextBlock = contextLines.length ? "Kontekst klienta a kampaně:\n" + contextLines.join("\n") + "\n\n" : "";

    const llmPrompt = `${contextBlock}Vytvoř návrh textů pro jeden vizuál na sociální sítě. Výstup vrať JEDINĚ jako platný JSON (žádný další text):
{
  "headline": string,
  "subheadline": string | null,
  "bullets": string[],
  "cta": string
}
Piš česky. Headline úderný, max ~8 slov. CTA krátké.`;

    let texts = { headline: "", subheadline: null, bullets: [], cta: "Zjistit více" };
    try {
      const llmRes = await llmChat({
        requestId: req.id || jobId,
        model: "gpt-4o-mini",
        purpose: "social_card_text",
        messages: [{ role: "user", content: llmPrompt }],
        temperature: 0.8,
        maxOutputTokens: 600,
      });
      const rawText = (llmRes.output_text || "").trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.headline === "string") texts.headline = parsed.headline.trim();
          if (parsed.subheadline != null && typeof parsed.subheadline === "string") texts.subheadline = parsed.subheadline.trim();
          if (Array.isArray(parsed.bullets)) texts.bullets = parsed.bullets.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, 3);
          if (typeof parsed.cta === "string" && parsed.cta.trim()) texts.cta = parsed.cta.trim();
        }
      }
    } catch (_) {}
    if (!texts.headline) texts.headline = theme || goals || "Zaujmi své zákazníky";
    if (!texts.cta) texts.cta = "Zjistit více";

    const template = {
      templateId: "social_card_v1",
      background,
      logoUrl: profile?.brand_logo_url || null,
      layout: {
        format: formatKey,
        slots: [
          { id: "headline", type: "text", x: 0.1, y: 0.2, w: 0.8 },
          { id: "subheadline", type: "text", x: 0.1, y: 0.3, w: 0.8 },
          { id: "bullets", type: "list", x: 0.1, y: 0.42, w: 0.8 },
          { id: "cta", type: "button", x: 0.1, y: 0.78, w: 0.4 },
        ],
      },
      texts,
      meta: { sourceUrl: url ? String(url) : null, goals: goals || null, theme: theme || null, keywords },
    };

    if (req.workspace && req.workspace.id && typeof saveOutput === "function") {
      try {
        saveOutput(
          req.workspace.id,
          "social_card_draft",
          { goals, theme, keywords, product_description: productDescription, format: formatKey, style, palette, purpose },
          { template },
          req.user?.id || null
        );
      } catch (_) {}
    }

    res.json({ ok: true, template });
  } catch (err) {
    const message = err && err.message ? String(err.message) : "Generation failed";
    console.error("[design/social-card/draft] failed:", message, err);
    res.status(500).json({ ok: false, error: "SOCIAL_CARD_DRAFT_FAILED", message });
  }
});

module.exports = { designRouter };
