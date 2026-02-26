"use strict";

const { fetch } = require("undici");
const cheerio = require("cheerio");
const { llmChat } = require("../llm/llmGateway.js");

const FETCH_TIMEOUT_MS = 15000;
const MAX_PROMPT_CHARS = 12000;

/**
 * Stáhne HTML z URL (bez headless), vyčistí a vrátí text pro LLM.
 * @param {string} url - platná http(s) URL
 * @returns {Promise<{ title: string, metaDescription: string, bodyText: string }>}
 */
async function fetchUrlContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "NeoBot-AdsStudio/1.0 (marketing analysis)",
      "Accept": "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    if (response.status === 403 || response.status === 404) err.code = "FETCH_FAILED";
    throw err;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe").remove();
  const title = ($("title").text() || "").replace(/\s+/g, " ").trim().slice(0, 300);
  let metaDescription = "";
  $('meta[name="description"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) metaDescription = c.replace(/\s+/g, " ").trim().slice(0, 500);
  });

  const headings = [];
  $("h1, h2").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
  });
  const headingBlock = headings.slice(0, 10).join("\n");

  const paragraphs = [];
  $("p").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length > 20) paragraphs.push(t);
  });
  const bodyParagraphs = paragraphs.slice(0, 5).join("\n\n");
  const bodyText = [headingBlock, bodyParagraphs].filter(Boolean).join("\n\n").slice(0, MAX_PROMPT_CHARS);

  return {
    title,
    metaDescription,
    bodyText: bodyText || title || metaDescription || "(žádný text)",
  };
}

/**
 * Analýza URL a vygenerování Ads Draft (brand summary + reklamní texty).
 * @param {string} url - http(s) URL
 * @param {string} [requestId] - pro logování
 * @returns {Promise<{ brand: object, ads: object }>}
 */
async function analyzeUrlAndDraftAds(url, requestId = "ads-draft") {
  const content = await fetchUrlContent(url);

  const prompt = `Jsi expert na reklamu a brand. Na základě následujícího obsahu webu vytvoř:
1) Stručný brand summary (název, popis, služby, USP, tón, cílová skupina).
2) Reklamní texty pro Meta (Facebook/Instagram) a Google Ads.

OBSAH WEBU:
Title: ${content.title}
Meta description: ${content.metaDescription}

Tělo (nadpisy + odstavce):
${content.bodyText}

Vrať JEDINĚ platný JSON bez markdown a bez textu před/za ním. Struktura:
{
  "brand": {
    "name": "string",
    "description": "string",
    "services": ["string"],
    "usp": ["string"],
    "tone": "string",
    "target_audience": "string"
  },
  "ads": {
    "meta_primary_texts": ["string"] (přesně 5 položek, hlavní text pro Meta),
    "meta_headlines": ["string"] (přesně 5 položek, krátké headlines),
    "google_headlines": ["string"] (přesně 10 položek, max 30 znaků),
    "google_descriptions": ["string"] (přesně 6 položek, max 90 znaků)
  }
}
Všechny texty v češtině. Pole services a usp mohou mít 0 až cca 10 položek. Ostatní pole přesně v uvedeném počtu.`;

  const response = await llmChat({
    requestId,
    model: "gpt-4o-mini",
    purpose: "ads_draft",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    maxOutputTokens: 4000,
  });

  const text = (response.output_text || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM nevrátil platný JSON");
  }

  let data;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("Neplatný JSON z LLM");
  }

  const brand = data.brand && typeof data.brand === "object" ? data.brand : {};
  const ads = data.ads && typeof data.ads === "object" ? data.ads : {};

  const ensureString = (v) => (typeof v === "string" ? v : String(v || ""));
  const ensureStringArray = (v, maxLen) => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => x.trim().slice(0, maxLen || 10000));
  };

  return {
    brand: {
      name: ensureString(brand.name),
      description: ensureString(brand.description),
      services: ensureStringArray(brand.services),
      usp: ensureStringArray(brand.usp),
      tone: ensureString(brand.tone),
      target_audience: ensureString(brand.target_audience),
    },
    ads: {
      meta_primary_texts: ensureStringArray(ads.meta_primary_texts).slice(0, 5),
      meta_headlines: ensureStringArray(ads.meta_headlines, 200).slice(0, 5),
      google_headlines: ensureStringArray(ads.google_headlines, 30).slice(0, 10),
      google_descriptions: ensureStringArray(ads.google_descriptions, 90).slice(0, 6),
    },
  };
}

module.exports = {
  fetchUrlContent,
  analyzeUrlAndDraftAds,
};
