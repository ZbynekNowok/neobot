"use strict";

const express = require("express");
const { analyzeUrlAndDraftAds, generateImagesFromUrl } = require("../marketing/adsStudio.js");

const adsStudioRouter = express.Router();

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

  try {
    const result = await analyzeUrlAndDraftAds(url.trim(), requestId);
    return res.json({
      ok: true,
      brand: result.brand,
      ads: result.ads,
    });
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
  const requestId = req.id || `ads-img-${Date.now()}`;

  try {
    const { images } = await generateImagesFromUrl(url.trim(), { count, format, requestId });
    return res.json({
      ok: true,
      images: images.map((img) => ({
        url: img.url,
        format: img.format,
        prompt: img.prompt,
        caption: img.caption,
      })),
    });
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

module.exports = { adsStudioRouter };
