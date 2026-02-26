"use strict";

const express = require("express");
const { analyzeUrlAndDraftAds } = require("../marketing/adsStudio.js");

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
    if (err.status === 403 || err.status === 404 || err.code === "FETCH_FAILED" || err.name === "AbortError") {
      return res.status(502).json({
        ok: false,
        error: "FETCH_FAILED",
        message: "Web se nepodařilo stáhnout (timeout, 403, 404 nebo síťová chyba).",
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

module.exports = { adsStudioRouter };
