"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { fetch } = require("undici");
const sharp = require("sharp");
const { spawn } = require("child_process");
const { analyzeUrlAndDraftAds, generateImagesFromUrl, generateProductVariants } = require("../marketing/adsStudio.js");

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
  const resolution = normalizeResolution(req.body?.resolution);
  const requestId = req.id || `ads-img-${Date.now()}`;
  const clientProfile = req.body?.clientProfile && typeof req.body.clientProfile === "object" ? req.body.clientProfile : undefined;
  const isDev = process.env.NODE_ENV !== "production";
  const debug = req.query?.debug === "1" && isDev;

  try {
    const { images, _debug } = await generateImagesFromUrl(url.trim(), { count, format, requestId, resolution, clientProfile, debug });
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
