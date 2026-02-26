const express = require("express");
const { addJob } = require("../queue/jobQueue.js");

const imagesRouter = express.Router();

/**
 * POST /api/images/background
 * Generate background image using Replicate SDXL
 */
imagesRouter.post("/images/background", async (req, res) => {
  const {
    category,
    platform,
    format,
    style,
    purpose,
    palette,
    industry,
    description,
    brand,
  } = req.body || {};

  // Validation
  if (category !== "social") {
    return res.status(400).json({ error: "Only 'social' category supported" });
  }

  if (platform !== "instagram") {
    return res.status(400).json({ error: "Only 'instagram' platform supported" });
  }

  const validFormats = ["1:1", "9:16", "16:9"];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ error: `Format must be one of: ${validFormats.join(", ")}` });
  }

  const validStyles = ["minimal", "luxury", "playful", "natural"];
  if (style && !validStyles.includes(style)) {
    return res.status(400).json({ error: `Style must be one of: ${validStyles.join(", ")}` });
  }

  const validPurposes = ["sale", "brand", "engagement", "education"];
  if (purpose && !validPurposes.includes(purpose)) {
    return res.status(400).json({ error: `Purpose must be one of: ${validPurposes.join(", ")}` });
  }

  const validPalettes = ["neutral", "warm", "cool", "bold"];
  if (palette && !validPalettes.includes(palette)) {
    return res.status(400).json({ error: `Palette must be one of: ${validPalettes.join(", ")}` });
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    // Create job
    const job = await addJob("image_background", {
      category: category || "social",
      platform: platform || "instagram",
      format,
      style: style || "natural",
      purpose: purpose || "engagement",
      palette: palette || "neutral",
      industry: industry ? industry.trim() : "",
      description: description.trim(),
      brand: brand || {},
      requestId: req.id,
    });

    res.json({
      ok: true,
      jobId: String(job.id),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message || "Failed to create image generation job",
    });
  }
});

module.exports = { imagesRouter };
