"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { fetch } = require("undici");
const sharp = require("sharp");
const { spawn } = require("child_process");
const crypto = require("crypto");
const { analyzeUrlAndDraftAds, generateImagesFromUrl, generateProductVariants } = require("../marketing/adsStudio.js");
const { buildContextPack } = require("../context/contextEngine.js");
const { generateText } = require("../orchestrator/generate.js");
const { detectIndustry } = require("../marketing/imageCompose.js");
const {
  extractSignatures,
  getAntiRepeatData,
  rememberOutput,
} = require("../marketing/variationGuard.js");

const DEBUG_ADS = process.env.DEBUG_ADS === "1" || process.env.DEBUG === "1";
const UPLOAD_CLEANUP_DELAY_MS = 8000; // Po úspěchu čekáme, než Replicate stáhne upload

const ALLOWED_RESOLUTIONS = ["preview", "standard", "high"];

function normalizeResolution(raw) {
  if (!raw || typeof raw !== "string") return "standard";
  return ALLOWED_RESOLUTIONS.includes(raw) ? raw : "standard";
}

const adsStudioRouter = express.Router();

const UPLOAD_DIR = path.join(__dirname, "../../public/outputs/uploads");
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (_) {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || ".jpg";
    const safe = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const name = `product-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe === ".jpg" || safe === ".jpeg" || safe === ".png" || safe === ".webp" ? safe : ".jpg"}`;
    cb(null, name);
  },
});

const uploadProductImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error("INVALID_FILE"));
  },
}).single("productImage");

function isValidUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  const u = url.trim();
  return /^https?:\/\/[^\s]+$/i.test(u);
}

adsStudioRouter.post("/ads/draft", async (req, res) => {
  const url = req.body?.url;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_URL",
      message: "Povinný parametr url musí být platná http nebo https URL.",
    });
  }

  const requestId = req.id || `ads-${Date.now()}`;
  const headers = req.headers || {};
  const rawUserKey =
    headers["x-api-key"] ||
    headers["x-api-key".toLowerCase()] ||
    req.ip ||
    headers["x-forwarded-for"] ||
    headers["x-real-ip"] ||
    "anon";
  const userHash = crypto.createHash("sha256").update(String(rawUserKey)).digest("hex").slice(0, 16);
  const variationKey = {
    userKey: userHash,
    type: "ads_draft",
    industry: "",
    platform: "multi",
  };
  const debugEnabled = req.query?.debug === "1" || DEBUG_ADS;

  try {
    const result = await analyzeUrlAndDraftAds(url.trim(), requestId, {
      variationKey,
      debug: debugEnabled,
    });
    const json = {
      ok: true,
      brand: result.brand,
      ads: result.ads,
    };
    if (debugEnabled && result._debug) {
      json._debug = result._debug;
    }
    return res.json(json);
  } catch (err) {
    const isFetchError =
      err.code === "FETCH_FAILED" ||
      err.name === "AbortError" ||
      err.status === 403 ||
      err.status === 404 ||
      (err.causeCode && ["ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(err.causeCode));
    if (isFetchError) {
      return res.status(502).json({
        ok: false,
        error: "FETCH_FAILED",
        message: "Nepodařilo se stáhnout web (DNS/timeout/SSL).",
      });
    }
    if (err.httpStatus === 503 || err.code === "LLM_UNAVAILABLE") {
      return res.status(503).json({
        ok: false,
        error: "LLM_UNAVAILABLE",
        message: "Služba pro generování není k dispozici.",
      });
    }
    console.error("[POST /api/ads/draft]", err);
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: err?.message || "Interní chyba serveru.",
    });
  }
});

adsStudioRouter.post("/ads/images", async (req, res) => {
  const url = req.body?.url;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_URL",
      message: "Povinný parametr url musí být platná http nebo https URL.",
    });
  }

  const count = Math.min(6, Math.max(3, parseInt(req.body?.count, 10) || 4));
  const format = ["square", "story", "both"].includes(req.body?.format) ? req.body.format : "square";
  const resolution = normalizeResolution(req.body?.resolution);
  const requestId = req.id || `ads-img-${Date.now()}`;
  const clientProfile = req.body?.clientProfile && typeof req.body.clientProfile === "object" ? req.body.clientProfile : undefined;
  const isDev = process.env.NODE_ENV !== "production";
  const debug = req.query?.debug === "1" && isDev;

  const headers = req.headers || {};
  const rawUserKey =
    headers["x-api-key"] ||
    headers["x-api-key".toLowerCase()] ||
    req.ip ||
    headers["x-forwarded-for"] ||
    headers["x-real-ip"] ||
    "anon";
  const userHash = crypto.createHash("sha256").update(String(rawUserKey)).digest("hex").slice(0, 16);
  const variationKey = {
    userKey: userHash,
    type: "ads_images",
    industry: "",
    platform: format,
  };

  try {
    const { images, _debug } = await generateImagesFromUrl(url.trim(), {
      count,
      format,
      requestId,
      resolution,
      clientProfile,
      debug,
      variationKey,
    });
    const json = {
      ok: true,
      images: images.map((img) => ({
        url: img.url,
        format: img.format,
        prompt: img.prompt,
        caption: img.caption,
        width: img.width,
        height: img.height,
        resolution: img.resolution,
      })),
    };
    if (_debug) json._debug = _debug;
    return res.json(json);
  } catch (err) {
    const isFetchError =
      err.code === "FETCH_FAILED" ||
      err.name === "AbortError" ||
      err.status === 403 ||
      err.status === 404 ||
      (err.causeCode &&
        [
          "ENOTFOUND",
          "ETIMEDOUT",
          "ECONNRESET",
          "ECONNREFUSED",
          "CERT_HAS_EXPIRED",
          "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
          "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
        ].includes(err.causeCode));
    if (isFetchError) {
      return res.status(502).json({
        ok: false,
        error: "FETCH_FAILED",
        message: "Nepodařilo se stáhnout web (DNS/timeout/SSL).",
      });
    }
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({
        ok: false,
        error: "RATE_LIMITED",
        provider: "replicate",
        message: "Replicate rate limit. Zkuste později.",
        retryAfterSeconds: err.retryAfterSeconds ?? 30,
      });
    }
    if (err.code === "IMAGE_PROVIDER_FAILED" || err.httpStatus === 503) {
      return res.status(503).json({
        ok: false,
        error: "IMAGE_PROVIDER_FAILED",
        message: err?.message || "Generování obrázků selhalo.",
      });
    }
    if (err.httpStatus === 503 || err.code === "LLM_UNAVAILABLE") {
      return res.status(503).json({
        ok: false,
        error: "LLM_UNAVAILABLE",
        message: "Služba pro generování není k dispozici.",
      });
    }
    console.error("[POST /api/ads/images]", err);
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: err?.message || "Interní chyba serveru.",
    });
  }
});

adsStudioRouter.post("/ads/score", async (req, res) => {
  const body = req.body || {};
  const adTextRaw = typeof body.adText === "string" ? body.adText.trim() : "";
  const headlineRaw = typeof body.headline === "string" ? body.headline.trim() : "";
  const ctaRaw = typeof body.cta === "string" ? body.cta.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const platform =
    body.platform === "facebook" || body.platform === "instagram" || body.platform === "google"
      ? body.platform
      : null;

  if (!adTextRaw || adTextRaw.length < 20) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_AD_TEXT",
      message: "Pole adText je povinné a musí mít alespoň 20 znaků.",
    });
  }

  const settings =
    body.meta && typeof body.meta === "object" && body.meta.settings && typeof body.meta.settings === "object"
      ? body.meta.settings
      : {};

  const variantsRaw = settings.variants;
  let variants = Number(variantsRaw) || 2;
  if (![1, 2, 3].includes(variants)) variants = 2;

  const debugEnabled = req.query?.debug === "1" || process.env.NODE_ENV !== "production";

  const headers = req.headers || {};
  const rawUserKey =
    headers["x-api-key"] ||
    headers["x-api-key".toLowerCase()] ||
    req.ip ||
    headers["x-forwarded-for"] ||
    headers["x-real-ip"] ||
    "anon";
  const userHash = crypto.createHash("sha256").update(String(rawUserKey)).digest("hex").slice(0, 16);

  const campaignContextLines = [];
  if (settings.goal) campaignContextLines.push(`Cíl kampaně: ${String(settings.goal)}`);
  if (settings.funnel) campaignContextLines.push(`Fáze funnelu: ${String(settings.funnel)}`);
  if (settings.angle) campaignContextLines.push(`Kreativní úhel: ${String(settings.angle)}`);
  if (settings.salesTone) campaignContextLines.push(`Prodejní styl: ${String(settings.salesTone)}`);
  if (platform) campaignContextLines.push(`Platforma: ${platform}`);
  if (url) campaignContextLines.push(`URL landing page: ${url}`);

  const topicSource = [adTextRaw, headlineRaw, ctaRaw, url].filter(Boolean).join("\n");
  let topicHint = "general";
  let topicIndustry = "general";
  if (topicSource.trim()) {
    const cleaned = topicSource.replace(/\s+/g, " ").trim();
    topicHint = cleaned.length > 220 ? `${cleaned.slice(0, 220)}…` : cleaned;
    try {
      topicIndustry = detectIndustry(topicSource) || "general";
    } catch {
      topicIndustry = "general";
    }
  }

  const baseBriefParts = [
    "Reklamní text (primární):",
    adTextRaw,
    headlineRaw && `Headline: ${headlineRaw}`,
    ctaRaw && `CTA: ${ctaRaw}`,
    campaignContextLines.length ? "\nMetadata kampaně:\n" + campaignContextLines.join("\n") : "",
  ].filter(Boolean);
  const brief = baseBriefParts.join("\n\n");

  try {
    const contextPack = await buildContextPack({
      body: {
        prompt: brief,
        userPrompt: brief,
        brief,
        adText: adTextRaw,
        headline: headlineRaw || null,
        cta: ctaRaw || null,
        platform: platform || null,
        meta: { settings },
        outputType: "ads_score",
      },
      routeName: "ads/score",
    });

    const profileIndustry =
      (contextPack && (contextPack.resolvedIndustry || (contextPack.profile && contextPack.profile.industry))) ||
      null;
    const usedIndustry = topicIndustry || "general";
    contextPack.resolvedIndustry = usedIndustry;

    const variationKey = {
      userKey: userHash,
      type: "ads_score",
      industry: contextPack.resolvedIndustry || "",
      platform: platform || "generic",
    };
    const antiRepeat = getAntiRepeatData(variationKey);

    const baseTaskPrompt = `Jsi zkušený performance marketér a specialista na online reklamu.

Primární kontext je VŽDY vložený text reklamy (adText). Pokud se téma adText liší od profilu/oboru workspace, MUSÍŠ se řídit textem reklamy a profil ignorovat. Nepřepisuj reklamu do jiného oboru, než jaký vyplývá z adText.

Tvým úkolem je:
1) Oznámkovat kvalitu dané reklamy na škále 0–10 (0 velmi slabá, 10 špičková).
2) Stručně shrnout proč (1–2 věty).
3) Vypsat hlavní silné stránky a slabiny.
4) Navrhnout konkrétní kroky, jak reklamu zlepšit (copy, struktura, nabídka, CTA, hook).
5) Vytvořit ${variants} vylepšené varianty reklamy (adText + volitelně headline, CTA) v češtině.

Hodnoť s ohledem na:
- cíl kampaně, fázi funnelu, kreativní úhel a prodejní styl (pokud jsou v zadání),
- sílu hooku v prvních větách,
- jasnost nabídky a konkrétnost benefitů,
- vhodnou míru urgence (jen pokud dává smysl),
- čitelnost a srozumitelnost,
- vhodné CTA.

Téma reklamy (podle adText): ${topicHint}.

Výstup vrať JEDINĚ jako platný JSON (žádný další text před ani za JSONem) v tomto tvaru:
{
  "score": number,                  // 0–10
  "summary": string,                // 1–2 věty
  "strengths": string[],            // 3–6 bodů
  "weaknesses": string[],           // 3–6 bodů
  "suggestions": string[],          // 3–7 konkrétních kroků
  "improvedVariants": [
    {
      "adText": string,
      "headline": string | null,
      "cta": string | null
    }
  ]
}

Piš česky. V improvedVariants generuj maximálně ${variants} variant.`;

    const taskPrompt = antiRepeat.instruction
      ? `${baseTaskPrompt}\n\n${antiRepeat.instruction}`
      : baseTaskPrompt;

    const llmRes = await generateText({
      contextPack,
      task: taskPrompt,
      params: {
        model: process.env.CONTENT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        maxOutputTokens: 1800,
        purpose: "ads_score",
      },
      debug: debugEnabled,
    });

    const raw = (llmRes.output_text || "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({
        ok: false,
        error: "LLM_INVALID_JSON",
        message: "LLM nevrátil platný JSON pro ads/score.",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(502).json({
        ok: false,
        error: "LLM_INVALID_JSON",
        message: "Neplatný JSON z LLM pro ads/score.",
      });
    }

    const num = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(10, n));
    };
    const str = (v) => (typeof v === "string" ? v.trim() : "");
    const strArray = (v, min = 0, max = 10) => {
      if (!Array.isArray(v)) return [];
      return v
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, max);
    };

    const score = num(parsed.score);
    const summary = str(parsed.summary);
    const strengths = strArray(parsed.strengths, 0, 8);
    const weaknesses = strArray(parsed.weaknesses, 0, 8);
    const suggestions = strArray(parsed.suggestions, 0, 10);

    const rawVariants = Array.isArray(parsed.improvedVariants) ? parsed.improvedVariants : [];
    const improvedVariants = rawVariants
      .map((v) => ({
        adText: str(v.adText),
        headline: str(v.headline) || undefined,
        cta: str(v.cta) || undefined,
      }))
      .filter((v) => v.adText)
      .slice(0, variants);

    const signatureSource = [
      adTextRaw,
      headlineRaw,
      ctaRaw,
      ...improvedVariants.map((v) => v.adText),
      ...improvedVariants.map((v) => v.headline || ""),
      ...improvedVariants.map((v) => v.cta || ""),
    ]
      .filter(Boolean)
      .join("\n");
    const signatures = extractSignatures(signatureSource);
    rememberOutput(variationKey, signatures);

    const response = {
      ok: true,
      score,
      summary,
      strengths,
      weaknesses,
      suggestions,
      improvedVariants,
    };

    if (debugEnabled) {
      response._debug = {
        ...(llmRes._debug || {}),
        topicHint,
        topicIndustry,
        profileIndustry,
        usedIndustry,
        antiRepeat: {
          used: Boolean(antiRepeat && antiRepeat.instruction),
          bannedHooks: antiRepeat?.debug?.bannedHooks || [],
          bannedCtas: antiRepeat?.debug?.bannedCtas || [],
          storeKey: antiRepeat?.debug?.storeKey || "",
        },
      };
    }

    return res.json(response);
  } catch (err) {
    const message = err && err.message ? String(err.message) : "Scoring failed";
    console.error("[POST /api/ads/score]", message, err);
    return res.status(500).json({
      ok: false,
      error: "ADS_SCORE_FAILED",
      message,
    });
  }
});

adsStudioRouter.post("/ads/product-variants", (req, res) => {
  uploadProductImage(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.message === "INVALID_FILE") {
        return res.status(400).json({
          ok: false,
          error: "INVALID_FILE",
          message: "Soubor musí být obrázek (jpg, png nebo webp).",
        });
      }
      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          ok: false,
          error: "FILE_TOO_LARGE",
          message: "Soubor je příliš velký (max 8 MB).",
        });
      }
      return res.status(400).json({
        ok: false,
        error: "INVALID_PARAMS",
        message: multerErr?.message || "Chybný upload.",
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_PARAMS",
        message: "Povinný parametr productImage (soubor) chybí.",
      });
    }

    const variants = Math.min(8, Math.max(4, parseInt(req.body?.variants, 10) || 4));
    const format = ["square", "story", "both"].includes(req.body?.format) ? req.body.format : "square";
    const style = ["modern", "luxury", "minimal", "industrial"].includes(req.body?.style) ? req.body.style : "modern";
    const productName = typeof req.body?.productName === "string" ? req.body.productName.trim() : "";
    const resolution = normalizeResolution(req.body?.resolution);
    const requestId = req.id || `ads-product-${Date.now()}`;
    let clientProfile = req.body?.clientProfile && typeof req.body.clientProfile === "object" ? req.body.clientProfile : undefined;
    if (req.body?.clientProfile && typeof req.body.clientProfile === "string") {
      try {
        clientProfile = JSON.parse(req.body.clientProfile);
      } catch (_) {}
    }

    const proto = req.get("x-forwarded-proto") || req.protocol || "https";
    const host = req.get("x-forwarded-host") || req.get("host") || "api.neobot.cz";
    const baseUrl = `${proto}://${host}`;
    const publicImageUrl = `${baseUrl}/outputs/uploads/${req.file.filename}`;

    if (DEBUG_ADS) {
      console.log("[F3] publicImageUrl (upload)", publicImageUrl);
    }

    let headOk = false;
    try {
      const headRes = await fetch(publicImageUrl, { method: "HEAD", redirect: "follow" });
      headOk = headRes.ok;
      if (!headOk && DEBUG_ADS) {
        console.warn("[F3] HEAD upload URL status", headRes.status);
      }
    } catch (headErr) {
      if (DEBUG_ADS) console.warn("[F3] HEAD upload URL failed", headErr?.message);
    }
    if (!headOk) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(502).json({
        ok: false,
        error: "UPLOAD_NOT_REACHABLE",
        message: "Uploadovaný obrázek není z internetu dostupný. Replicate nemůže stáhnout vstup.",
      });
    }

    const isDev = process.env.NODE_ENV !== "production";
    const debug = req.query?.debug === "1" && isDev;

    const headers = req.headers || {};
    const rawUserKey =
      headers["x-api-key"] ||
      headers["x-api-key".toLowerCase()] ||
      req.ip ||
      headers["x-forwarded-for"] ||
      headers["x-real-ip"] ||
      "anon";
    const userHash = crypto.createHash("sha256").update(String(rawUserKey)).digest("hex").slice(0, 16);
    const variationKey = {
      userKey: userHash,
      type: "ads_product",
      industry: "",
      platform: format,
    };

    try {
      const { images, _debug } = await generateProductVariants({
        publicImageUrl,
        variants,
        format,
        productName,
        style,
        requestId,
        resolution,
        clientProfile,
        variationKey,
        debug,
      });

      setTimeout(() => {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }, UPLOAD_CLEANUP_DELAY_MS);

      const json = {
        ok: true,
        images: images.map((img) => ({
          url: img.url,
          format: img.format,
          prompt: img.prompt,
          caption: img.caption,
          width: img.width,
          height: img.height,
          resolution: img.resolution,
        })),
      };
      if (_debug) json._debug = _debug;
      return res.json(json);
    } catch (err) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}

      if (err.code === "RATE_LIMITED") {
        return res.status(429).json({
          ok: false,
          error: "RATE_LIMITED",
          provider: "replicate",
          message: "Replicate rate limit. Zkuste později.",
          retryAfterSeconds: err.retryAfterSeconds ?? 30,
        });
      }
      if (err.code === "IMAGE_PROVIDER_FAILED" || err.httpStatus === 503) {
        return res.status(503).json({
          ok: false,
          error: "IMAGE_PROVIDER_FAILED",
          message: err?.message || "Generování obrázků selhalo.",
        });
      }
      if (err.httpStatus === 503 || err.code === "LLM_UNAVAILABLE") {
        return res.status(503).json({
          ok: false,
          error: "LLM_UNAVAILABLE",
          message: "Služba pro generování není k dispozici.",
        });
      }
      console.error("[POST /api/ads/product-variants]", err);
      return res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR",
        message: err?.message || "Interní chyba serveru.",
      });
    }
  });
});

function inferResolutionFromDimensions(width, height) {
  if (!width || !height) return undefined;
  const w = Number(width);
  const h = Number(height);
  if (
    (w === 720 && h === 720) ||
    (w === 720 && h === 1280)
  ) return "preview";
  if (
    (w === 1080 && h === 1080) ||
    (w === 1080 && h === 1920)
  ) return "standard";
  if (
    (w === 2048 && h === 2048) ||
    (w === 2048 && h === 3640)
  ) return "high";
  if (
    (w === 1024 && h === 1024) ||
    (w === 1024 && h === 1820)
  ) return "high";
  return undefined;
}

async function collectAdsHistoryFromDir(dir, type) {
  let files;
  try {
    files = await fs.promises.readdir(dir);
  } catch {
    return [];
  }
  const entries = await Promise.all(
    files
      .filter((name) => name.toLowerCase().endsWith(".png"))
      .map(async (name) => {
        const filePath = path.join(dir, name);
        let stats;
        try {
          stats = await fs.promises.stat(filePath);
        } catch {
          return null;
        }
        let width;
        let height;
        try {
          const metadata = await sharp(filePath).metadata();
          width = metadata.width || undefined;
          height = metadata.height || undefined;
        } catch {
          width = undefined;
          height = undefined;
        }
        const inferredResolution = inferResolutionFromDimensions(width, height);
        const url =
          type === "image"
            ? `/outputs/backgrounds/${name}`
            : `/outputs/product-ads/${name}`;
        return {
          url,
          type,
          resolution: inferredResolution,
          width,
          height,
          createdAt: stats.mtime.toISOString(),
        };
      })
  );
  return entries.filter((x) => x != null);
}

adsStudioRouter.get("/ads/history", async (_req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, "../../public/outputs/backgrounds");
    const productAdsDir = path.join(__dirname, "../../public/outputs/product-ads");
    const [backgrounds, products] = await Promise.all([
      collectAdsHistoryFromDir(backgroundsDir, "image"),
      collectAdsHistoryFromDir(productAdsDir, "product"),
    ]);
    const items = backgrounds
      .concat(products)
      .sort((a, b) => {
        const at = Date.parse(a.createdAt);
        const bt = Date.parse(b.createdAt);
        return Number.isNaN(bt - at) ? 0 : bt - at;
      });
    return res.json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("[GET /api/ads/history]", err);
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: "Nepodařilo se načíst historii reklam.",
    });
  }
});

function getVideoDimensions(format) {
  const fmt = typeof format === "string" ? format : "story";
  if (fmt === "square") return { width: 1080, height: 1080 };
  if (fmt === "landscape") return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 }; // story (default)
}

function resolveLocalImagePathFromUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let rel = raw.trim();
  if (/^https?:\/\//i.test(rel)) {
    try {
      const u = new URL(rel);
      rel = u.pathname || "";
    } catch {
      return null;
    }
  }
  if (!rel.startsWith("/")) rel = "/" + rel;
  if (!rel.startsWith("/outputs/backgrounds/") && !rel.startsWith("/outputs/product-ads/")) {
    return null;
  }
  const safe = rel.replace(/^\/+/, "");
  return path.join(__dirname, "../../public", safe);
}

function runFfmpeg(inputPath, outputPath, width, height, durationSeconds) {
  return new Promise((resolve, reject) => {
    const duration = Math.max(1, Math.min(30, Number(durationSeconds) || 8));
    const args = [
      "-y",
      "-loop",
      "1",
      "-i",
      inputPath,
      "-t",
      String(duration),
      "-vf",
      `scale=${width}:${height},zoompan=z='min(zoom+0.0015,1.2)':d=1:s=${width}x${height},fps=30`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    const ff = spawn("ffmpeg", args);
    let stderr = "";
    ff.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    ff.on("error", (err) => {
      reject(err);
    });
    ff.on("close", (code) => {
      if (code === 0) {
        resolve({ duration });
      } else {
        const err = new Error(`ffmpeg exited with code ${code}: ${stderr.slice(0, 1000)}`);
        reject(err);
      }
    });
  });
}

adsStudioRouter.post("/ads/video", async (req, res) => {
  const imageUrl = req.body?.imageUrl;
  const format = ["story", "square", "landscape"].includes(req.body?.format) ? req.body.format : "story";
  const rawDuration = Number(req.body?.duration);
  const duration =
    Number.isFinite(rawDuration) && rawDuration >= 5 && rawDuration <= 10 ? rawDuration : 8;

  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).json({
      ok: false,
      error: "INVALID_PARAMS",
      message: "Povinný parametr imageUrl musí být cesta k existujícímu obrázku.",
    });
  }

  const inputPath = resolveLocalImagePathFromUrl(imageUrl);
  if (!inputPath) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_IMAGE_URL",
      message:
        "imageUrl musí odkazovat na obrázek v /outputs/backgrounds/ nebo /outputs/product-ads/.",
    });
  }

  let stats;
  try {
    stats = await fs.promises.stat(inputPath);
    if (!stats.isFile()) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_IMAGE_URL",
        message: "Zadaný obrázek neexistuje nebo není soubor.",
      });
    }
  } catch {
    return res.status(400).json({
      ok: false,
      error: "INVALID_IMAGE_URL",
      message: "Zadaný obrázek neexistuje.",
    });
  }

  const { width, height } = getVideoDimensions(format);
  const videosDir = path.join(__dirname, "../../public/outputs/videos");
  try {
    fs.mkdirSync(videosDir, { recursive: true });
  } catch (_) {}

  const fileName = `ads-video-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.mp4`;
  const outputPath = path.join(videosDir, fileName);

  try {
    await runFfmpeg(inputPath, outputPath, width, height, duration);
    return res.json({
      ok: true,
      video: {
        url: `/outputs/videos/${fileName}`,
        width,
        height,
        duration,
        format,
      },
    });
  } catch (err) {
    console.error("[POST /api/ads/video]", err);
    if (err?.code === "ENOENT") {
      return res.status(500).json({
        ok: false,
        error: "FFMPEG_NOT_AVAILABLE",
        message: "ffmpeg není dostupné na serveru. Kontaktuj správce.",
      });
    }
    return res.status(500).json({
      ok: false,
      error: "VIDEO_GENERATION_FAILED",
      message: err?.message || "Generování videa selhalo.",
    });
  }
});

module.exports = { adsStudioRouter };
