const express = require("express");
const { addJob } = require("../queue/jobQueue.js");
const {
  composeImageWithText,
  renderCompositeOnly,
  getCanvasDimensions,
} = require("../marketing/imageCompose.js");
const { buildContextPack } = require("../context/contextEngine.js");
const { generateImage } = require("../orchestrator/generate.js");

const imagesRouter = express.Router();

/**
 * POST /api/images/background
 * (legacy) Generate background image using Replicate SDXL via job queue.
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

function normalizeResolution(raw) {
  if (!raw || typeof raw !== "string") return "standard";
  if (["preview", "standard", "high"].includes(raw)) return raw;
  return "standard";
}

function normalizeFormat(raw) {
  if (!raw || typeof raw !== "string") return "square";
  if (["square", "story", "landscape"].includes(raw)) return raw;
  return "square";
}

function isHexColor(val) {
  return typeof val === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val);
}

function validateAndNormalizeLayers(layers, canvasWidth, canvasHeight) {
  if (!Array.isArray(layers)) throw new Error("layers must be array");
  if (layers.length > 10) throw new Error("Too many layers (max 10)");

  const safeLayers = [];

  for (const raw of layers) {
    if (!raw || typeof raw.type !== "string") continue;
    const type = raw.type;

    if (type === "gradient") {
      let strength = Number(raw.strength);
      if (!Number.isFinite(strength)) strength = 0.55;
      strength = Math.min(1, Math.max(0, strength));
      safeLayers.push({
        type: "gradient",
        direction: raw.direction === "top" ? "top" : "bottom",
        strength,
      });
    } else if (type === "text") {
      if (!raw.id || typeof raw.id !== "string") {
        throw new Error("text layer requires id");
      }
      const text = String(raw.text || "").trim();
      const id = raw.id;
      const maxHeadlineLen = 80;
      const maxSubheadlineLen = 140;
      const maxCtaLen = 24;
      let maxLen = 140;
      if (id === "headline") maxLen = maxHeadlineLen;
      else if (id === "subheadline") maxLen = maxSubheadlineLen;
      else if (id === "cta") maxLen = maxCtaLen;
      const clippedText = text.slice(0, maxLen);

      let fontSize = Number(raw.fontSize || 40);
      if (!Number.isFinite(fontSize)) fontSize = 40;
      fontSize = Math.min(140, Math.max(12, fontSize));

      let fontWeight = Number(raw.fontWeight || 600);
      if (!Number.isFinite(fontWeight)) fontWeight = 600;
      fontWeight = Math.min(900, Math.max(300, fontWeight));

      const align = ["left", "center", "right"].includes(raw.align)
        ? raw.align
        : "left";

      let maxWidthPct = Number(raw.maxWidthPct || 0.8);
      if (!Number.isFinite(maxWidthPct)) maxWidthPct = 0.8;
      maxWidthPct = Math.min(0.95, Math.max(0.3, maxWidthPct));

      let x = Number(raw.x || 80);
      let y = Number(raw.y || canvasHeight * 0.7);
      if (!Number.isFinite(x)) x = 80;
      if (!Number.isFinite(y)) y = canvasHeight * 0.7;
      x = Math.min(canvasWidth, Math.max(0, x));
      y = Math.min(canvasHeight, Math.max(0, y));

      const useAutoContrast = raw.useAutoContrast === true || raw.useAutoContrast === "true";
      const color = useAutoContrast ? "" : (isHexColor(raw.color) ? raw.color : "#ffffff");

      safeLayers.push({
        type: "text",
        id,
        text: clippedText,
        x,
        y,
        fontSize,
        fontWeight,
        color,
        align,
        maxWidthPct,
      });
    } else if (type === "button") {
      if (!raw.id || typeof raw.id !== "string") {
        throw new Error("button layer requires id");
      }
      const text = String(raw.text || "").trim().slice(0, 32);

      let x = Number(raw.x ?? 80);
      let y = Number(raw.y ?? canvasHeight * 0.8);
      if (!Number.isFinite(x)) x = 80;
      if (!Number.isFinite(y)) y = canvasHeight * 0.8;

      let width = Number(raw.width ?? raw.w ?? 260);
      let height = Number(raw.height ?? raw.h ?? 56);
      if (!Number.isFinite(width)) width = 260;
      if (!Number.isFinite(height)) height = 56;
      width = Math.min(900, Math.max(120, width));
      height = Math.min(220, Math.max(40, height));

      if (x + width > canvasWidth) x = canvasWidth - width - 16;
      if (y + height > canvasHeight) y = canvasHeight - height - 16;
      if (x < 0) x = 0;
      if (y < 0) y = 0;

      const backgroundColor = isHexColor(raw.backgroundColor) ? raw.backgroundColor : (isHexColor(raw.bg) ? raw.bg : "#2563eb");
      const useAutoContrast = raw.useAutoContrast === true || raw.useAutoContrast === "true";
      const textColor = useAutoContrast ? "" : (isHexColor(raw.textColor) ? raw.textColor : (isHexColor(raw.color) ? raw.color : "#ffffff"));
      let borderRadius = Number(raw.borderRadius ?? raw.radius ?? 999);
      if (!Number.isFinite(borderRadius)) borderRadius = 999;
      borderRadius = Math.min(999, Math.max(0, borderRadius));
      let fontSize = Number(raw.fontSize);
      if (!Number.isFinite(fontSize)) fontSize = Math.min(32, Math.floor(height * 0.5));
      fontSize = Math.min(96, Math.max(10, fontSize));

      safeLayers.push({
        type: "button",
        id: raw.id,
        text,
        x,
        y,
        width,
        height,
        fontSize,
        backgroundColor,
        textColor,
        borderRadius,
      });
    }
  }

  return safeLayers;
}

/**
 * Compose background + text + layout into final PNG.
 */
imagesRouter.post("/images/compose", async (req, res) => {
  const body = req.body || {};
  const type = body.type;
  const format = normalizeFormat(body.format);
  const resolution = normalizeResolution(body.resolution);
  const style = body.style;
  const purpose = body.purpose;
  const palette = body.palette;
  const prompt = body.prompt ?? body.userPrompt;
  const brand = body.brand && typeof body.brand === "object" ? body.brand : {};
  const backgroundOnly = Boolean(body.backgroundOnly);
  const textLayout = body.textLayout && ["flyer", "balanced", "visual"].includes(body.textLayout) ? body.textLayout : "flyer";
  const textPlacement =
    body.textPlacement && ["bottom_left", "bottom_center", "top_left", "top_center", "center", "right_panel", "auto"].includes(body.textPlacement)
      ? body.textPlacement
      : "bottom_left";

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_PARAMS",
      message: "Pole prompt je povinné.",
    });
  }

  try {
    const isDev = process.env.NODE_ENV !== "production";
    const debugEnabled = req.query?.debug === "1" || isDev;

    const contextPack = await buildContextPack({
      body: { ...body, prompt: prompt.trim(), userPrompt: prompt.trim(), outputType: "image" },
      workspace: req.workspace || null,
      routeName: "images/compose",
    });

    const result = await generateImage({
      contextPack,
      task: backgroundOnly ? "background" : "compose",
      params: {
        type,
        format,
        resolution,
        style,
        purpose,
        palette,
        prompt: contextPack.brief,
        userPrompt: contextPack.brief,
        brand,
        backgroundOnly,
        textLayout,
        textPlacement,
        clientProfile: body.clientProfile && typeof body.clientProfile === "object" ? body.clientProfile : undefined,
        requestId: req.id || contextPack.traceId,
        stylePreset: body.stylePreset && String(body.stylePreset).trim() ? String(body.stylePreset).trim() : undefined,
      },
      debug: debugEnabled,
    });

    if (backgroundOnly) {
      const json = { ok: true, background: result.background };
      if (result._debug) json._debug = result._debug;
      return res.json(json);
    }

    const json = {
      ok: true,
      background: result.background,
      texts: result.texts,
      composite: result.composite,
      layers: result.layers,
      format: result.format,
      resolution: result.resolution,
    };
    if (result._debug) json._debug = result._debug;
    return res.json(json);
  } catch (err) {
    if (err?.code === "RATE_LIMITED") {
      return res.status(429).json({
        ok: false,
        error: "RATE_LIMITED",
        provider: "replicate",
        message: "Replicate rate limit. Zkuste později.",
      });
    }
    if (err?.code === "LLM_UNAVAILABLE" || err?.httpStatus === 503) {
      return res.status(503).json({
        ok: false,
        error: "LLM_UNAVAILABLE",
        message: "Služba pro generování textu nebo layoutu není k dispozici.",
      });
    }
    console.error("[POST /api/images/compose]", err);
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: err?.message || "Generování grafiky s textem selhalo.",
    });
  }
});

/**
 * Build layers array from layout (percent-based) + headline, subheadline, cta texts.
 * Used when POST body contains layout instead of pre-built layers.
 */
function buildLayersFromLayout(layout, headline, subheadline, cta, canvasWidth, canvasHeight) {
  const layers = [];
  if (layout.headline && typeof layout.headline.xPct === "number" && typeof layout.headline.yPct === "number") {
    const h = layout.headline;
    layers.push({
      type: "text",
      id: "headline",
      text: String(headline ?? "").trim().slice(0, 80),
      x: Math.round(h.xPct * canvasWidth),
      y: Math.round(h.yPct * canvasHeight),
      fontSize: Number(h.fontSize) || 40,
      fontWeight: 800,
      color: h.useAutoContrast ? "" : (h.color || "#ffffff"),
      useAutoContrast: !!h.useAutoContrast,
      align: "left",
      maxWidthPct: 0.8,
    });
  }
  if (layout.subheadline && typeof layout.subheadline.xPct === "number" && typeof layout.subheadline.yPct === "number") {
    const s = layout.subheadline;
    layers.push({
      type: "text",
      id: "subheadline",
      text: String(subheadline ?? "").trim().slice(0, 140),
      x: Math.round(s.xPct * canvasWidth),
      y: Math.round(s.yPct * canvasHeight),
      fontSize: Number(s.fontSize) || 24,
      fontWeight: 400,
      color: s.useAutoContrast ? "" : (s.color || "#ffffff"),
      useAutoContrast: !!s.useAutoContrast,
      align: "left",
      maxWidthPct: 0.8,
    });
  }
  if (layout.cta && typeof layout.cta.xPct === "number" && typeof layout.cta.yPct === "number" && typeof layout.cta.widthPct === "number" && typeof layout.cta.heightPct === "number") {
    const c = layout.cta;
    layers.push({
      type: "button",
      id: "cta",
      text: String(cta ?? "").trim().slice(0, 32),
      x: Math.round(c.xPct * canvasWidth),
      y: Math.round(c.yPct * canvasHeight),
      width: Math.round(c.widthPct * canvasWidth),
      height: Math.round(c.heightPct * canvasHeight),
      fontSize: Math.min(96, Math.max(10, Number(c.fontSize) || 20)),
      backgroundColor: isHexColor(c.bgColor) ? c.bgColor : "#2563eb",
      textColor: c.useAutoContrast ? "" : (c.color || "#ffffff"),
      useAutoContrast: !!c.useAutoContrast,
      borderRadius: Math.min(999, Math.max(0, Number(c.borderRadius ?? c.radius ?? 999))),
    });
  }
  return layers;
}

/**
 * POST /api/images/compose/render
 * Re-render composite PNG from existing background + layers (no new background/LLM).
 * Accepts either body.layers or body.layout + body.headline, body.subheadline, body.cta.
 */
imagesRouter.post("/images/compose/render", async (req, res) => {
  const body = req.body || {};
  const backgroundUrl = body.backgroundUrl || body.backgroundPath;
  const format = normalizeFormat(body.format);
  const resolution = normalizeResolution(body.resolution);
  let layers = body.layers;
  const layout = body.layout || body.layoutOverrides;

  if (!backgroundUrl || typeof backgroundUrl !== "string") {
    return res.status(400).json({
      ok: false,
      error: "INVALID_PARAMS",
      message: "backgroundUrl je povinný.",
    });
  }

  let dims;
  try {
    dims = getCanvasDimensions(format, resolution);
  } catch {
    return res.status(400).json({
      ok: false,
      error: "INVALID_PARAMS",
      message: "Neplatný formát nebo rozlišení.",
    });
  }

  if (!Array.isArray(layers) && layout && typeof layout === "object" && (layout.headline || layout.subheadline || layout.cta)) {
    const textLayers = buildLayersFromLayout(
      layout,
      body.headline,
      body.subheadline,
      body.cta,
      dims.outputWidth,
      dims.outputHeight
    );
    layers = [
      { type: "gradient", direction: "bottom", strength: 0.4 },
      ...textLayers,
    ];
  }

  if (!Array.isArray(layers)) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_PARAMS",
      message: "layers nebo layout je povinný.",
    });
  }

  let safeLayers;
  try {
    safeLayers = validateAndNormalizeLayers(
      layers,
      dims.outputWidth,
      dims.outputHeight
    );
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_LAYERS",
      message: err?.message || "Neplatné vrstvy pro canvas renderer.",
    });
  }

  try {
    const result = await renderCompositeOnly(
      {
        backgroundUrl,
        format,
        resolution,
        layers: safeLayers,
      },
      req.id || `compose-${Date.now()}`
    );

    const json = {
      ok: true,
      composite: result.composite,
      layers: result.layers,
      format: result.format,
      resolution: result.resolution,
    };
    if (req.query?.debug === "1") {
      json._debug = { layersUsed: safeLayers };
    }
    return res.json(json);
  } catch (err) {
    console.error("[POST /api/images/compose/render]", err);
    return res.status(500).json({
      ok: false,
      error: "RENDER_FAILED",
      message: err?.message || "Přerenderování grafiky selhalo.",
    });
  }
});

module.exports = { imagesRouter };

