"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sharp = require("sharp");
const { logger } = require("../logger.js");

const OPENAI_IMAGE_MODEL = "dall-e-3";
const TIMEOUT_MS = 60000;

// DALL-E 3 supports only: 1024x1024, 1792x1024, 1024x1792
const FORMAT_TO_SIZE = {
  "1:1": "1024x1024",
  "4:5": "1024x1792",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
};

// Final dimensions (after optional crop). 4:5 = center-crop from 1024x1792 to 1024x1280
const FORMAT_TO_FINAL_DIMS = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "9:16": { width: 1024, height: 1792 },
  "16:9": { width: 1792, height: 1024 },
};

const GENERATED_DIR = path.join(__dirname, "../../public/generated");

function ensureGeneratedDir() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function getFormatKey(format) {
  const key = String(format || "4:5").trim();
  if (FORMAT_TO_SIZE[key]) return key;
  if (key === "ig_post") return "4:5";
  if (key === "ig_story") return "9:16";
  return "4:5";
}

/**
 * Map format to OpenAI size. DALL-E 3 supports 1024x1024, 1792x1024, 1024x1792.
 */
function getSizeForFormat(format) {
  const key = getFormatKey(format);
  return FORMAT_TO_SIZE[key];
}

function isRetryableError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || (err.response && err.response.status);
  if (status != null && status >= 500) return true;
  const code = err.code || err.name;
  if (code && typeof code === "string") {
    const c = code.toLowerCase();
    if (c === "econnreset" || c === "etimedout" || c === "enotfound" || c === "econnrefused" || c === "networkerror" || c === "fetch_error") return true;
  }
  if (err.message && /timeout|network|5\d\d/i.test(err.message)) return true;
  return false;
}

function errorCode(err) {
  if (!err) return "unknown";
  return String(err.status || err.statusCode || (err.response && err.response.status) || err.code || err.name || err.message || "unknown").slice(0, 64);
}

/**
 * Generate image via OpenAI, save to public/generated/background-<uuid>.png, return public URL + meta.
 * Timeout 60s, retry 1x on network/5xx only. Logs "openai_image_failed" + error code on failure.
 * For 4:5: generates 1024x1792 then center-crops to 1024x1280 with Sharp.
 * @param {{ prompt: string, format?: string }} opts
 * @returns { Promise<{ imageUrl: string, filePath: string, meta: { width, height, format, model } }> }
 */
async function generateImage({ prompt, format }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const formatKey = getFormatKey(format);
  const size = getSizeForFormat(format);
  const finalDims = FORMAT_TO_FINAL_DIMS[formatKey];

  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey });

  const doGenerate = () =>
    openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: prompt.trim(),
      n: 1,
      size,
      response_format: "b64_json",
      quality: "standard",
    });

  const withTimeout = (promise) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error("OpenAI image request timeout"), { code: "ETIMEDOUT" })), TIMEOUT_MS);
      }),
    ]);
  };

  let lastErr;
  let responseData = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      responseData = await withTimeout(doGenerate());
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === 1 && isRetryableError(err)) continue;
      logger.warn({ event: "openai_image_failed", error_code: errorCode(err), attempt }, "openai_image_failed");
      throw err;
    }
  }

  if (lastErr) {
    logger.warn({ event: "openai_image_failed", error_code: errorCode(lastErr), attempt: 2 }, "openai_image_failed");
    throw lastErr;
  }

  const b64 = responseData.data && responseData.data[0] && responseData.data[0].b64_json;
  if (!b64) {
    const err = new Error("OpenAI image response missing b64_json");
    logger.warn({ event: "openai_image_failed", error_code: "missing_b64" }, "openai_image_failed");
    throw err;
  }

  ensureGeneratedDir();
  const id = crypto.randomUUID();
  const filename = `background-${id}.png`;
  const filePath = path.join(GENERATED_DIR, filename);
  let buffer = Buffer.from(b64, "base64");

  if (formatKey === "4:5") {
    buffer = await sharp(buffer)
      .extract({
        left: 0,
        top: Math.round((1792 - 1280) / 2),
        width: 1024,
        height: 1280,
      })
      .png()
      .toBuffer();
  }

  fs.writeFileSync(filePath, buffer);

  const imageUrl = "/generated/" + filename;
  const meta = {
    width: finalDims.width,
    height: finalDims.height,
    format: formatKey,
    model: OPENAI_IMAGE_MODEL,
  };
  return { imageUrl, filePath, meta };
}

module.exports = {
  generateImage,
  getSizeForFormat,
  GENERATED_DIR,
};
