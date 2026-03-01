"use strict";

const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage, registerFont } = require("@napi-rs/canvas");

const PUBLIC_DIR = path.join(__dirname, "../../public");

// Try to register Inter fonts if present (non-fatal when missing)
const FONTS_DIR = path.join(__dirname, "../../assets/fonts");
try {
  const regularPath = path.join(FONTS_DIR, "Inter-Regular.ttf");
  if (fs.existsSync(regularPath)) {
    registerFont(regularPath, { family: "Inter", weight: "400" });
  }
} catch (_) {}

try {
  const boldPath = path.join(FONTS_DIR, "Inter-Bold.ttf");
  if (fs.existsSync(boldPath)) {
    registerFont(boldPath, { family: "Inter", weight: "700" });
  }
} catch (_) {}

function clamp(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function resolveBackgroundPath(backgroundUrl) {
  if (typeof backgroundUrl !== "string" || !backgroundUrl.trim()) {
    throw new Error("backgroundUrl required");
  }
  let rel = backgroundUrl.trim();
  if (/^https?:\/\//i.test(rel)) {
    const u = new URL(rel);
    rel = u.pathname || "";
  }
  if (!rel.startsWith("/")) rel = "/" + rel;
  if (!rel.startsWith("/outputs/backgrounds/")) {
    throw new Error("backgroundUrl must be in /outputs/backgrounds/");
  }
  const abs = path.join(PUBLIC_DIR, rel.replace(/^\/+/, ""));
  const normalized = path.normalize(abs);
  if (!normalized.startsWith(PUBLIC_DIR)) {
    throw new Error("backgroundUrl resolves outside of public directory");
  }
  return normalized;
}

function wordWrapLines(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? current + " " + word : word;
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Measure wrapped text block height (for layout without rendering).
 * Uses a minimal canvas context; font must be set before calling wordWrapLines.
 */
function measureTextBlock(text, maxWidthPx, fontSize, fontWeight) {
  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext("2d");
  const font = `${Number(fontWeight) || 600} ${Number(fontSize) || 32}px Inter, sans-serif`;
  ctx.font = font;
  const lines = wordWrapLines(ctx, String(text || "").trim(), maxWidthPx);
  const lineHeight = (Number(fontSize) || 32) * 1.2;
  return { lines: lines.length, height: lines.length * lineHeight };
}

function drawGradientLayer(ctx, layer, width, height) {
  const strength = clamp(Number(layer.strength ?? 0.5), 0, 1);
  const direction = layer.direction === "top" ? "top" : "bottom";

  let gradient;
  if (direction === "bottom") {
    gradient = ctx.createLinearGradient(0, height, 0, height * 0.4);
  } else {
    gradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  }

  const alpha = clamp(strength, 0, 1);
  gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawPanelLayer(ctx, layer, width, height) {
  const opacity = clamp(Number(layer.opacity ?? 0.65), 0.2, 0.9);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${opacity})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Compute average luminance of an ImageData region (0–255).
 * luminance = 0.299*R + 0.587*G + 0.114*B
 */
function averageLuminance(imageData) {
  const data = imageData.data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue; // skip very transparent pixels
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
    count += 1;
  }
  return count > 0 ? sum / count : 128;
}

/**
 * Get average luminance of a rectangle on the canvas (auto-contrast for text).
 * Uses ctx.getImageData and 0.299*R + 0.587*G + 0.114*B per pixel.
 * @returns {number} 0–255, or 128 if region invalid
 */
function getAverageLuminance(ctx, x, y, w, h) {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(w));
  const sh = Math.max(1, Math.floor(h));
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  if (sx + sw > width || sy + sh > height) return 128;
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  return averageLuminance(imageData);
}

function drawTextLayer(ctx, layer, width, height) {
  const text = String(layer.text || "").trim();
  if (!text) return;

  const fontSize = clamp(Number(layer.fontSize || 40), 12, 140);
  const fontWeight = clamp(Number(layer.fontWeight || 600), 300, 900);
  const fontFamily = typeof layer.fontFamily === "string" && layer.fontFamily.trim() ? layer.fontFamily.trim() : "Inter, sans-serif";
  const align = ["left", "center", "right"].includes(layer.align) ? layer.align : "left";
  const maxWidthPct = clamp(Number(layer.maxWidthPct || 0.8), 0.3, 0.95);
  const maxWidth = width * maxWidthPct;

  let x, y;
  if (layer.xPct != null) {
    const pct = layer.xPct <= 1 ? layer.xPct : layer.xPct / 100;
    x = width * pct;
  } else {
    x = Number(layer.x ?? 80);
  }
  if (layer.yPct != null) {
    const pct = layer.yPct <= 1 ? layer.yPct : layer.yPct / 100;
    y = height * pct;
  } else {
    y = Number(layer.y ?? height * 0.7);
  }
  x = clamp(x, 0, width);
  y = clamp(y, 0, height);

  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  const lines = wordWrapLines(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.2;

  let drawX = x;
  if (align === "center") {
    drawX = clamp(x, maxWidth / 2, width - maxWidth / 2);
  } else if (align === "right") {
    drawX = clamp(x, maxWidth, width);
  } else {
    drawX = clamp(x, 0, width - maxWidth);
  }

  const sampleLeft = align === "center" ? drawX - maxWidth / 2 : align === "right" ? drawX - maxWidth : drawX;
  const sampleTop = y - fontSize;
  const sampleWidth = maxWidth;
  const sampleHeight = lines.length * lineHeight + fontSize * 0.5;

  const hasManualColor = typeof layer.color === "string" && String(layer.color).trim().length > 0;
  let color;
  if (hasManualColor) {
    color = String(layer.color).trim();
  } else {
    const luminance = getAverageLuminance(ctx, sampleLeft, sampleTop, sampleWidth, sampleHeight);
    color = luminance > 160 ? "#111111" : "#ffffff";
  }

  function isColorDark(hex) {
    const s = String(hex).trim().replace(/^#/, "");
    if (s.length !== 3 && s.length !== 6) return false;
    let r, g, b;
    if (s.length === 3) {
      r = parseInt(s[0] + s[0], 16);
      g = parseInt(s[1] + s[1], 16);
      b = parseInt(s[2] + s[2], 16);
    } else {
      r = parseInt(s.slice(0, 2), 16);
      g = parseInt(s.slice(2, 4), 16);
      b = parseInt(s.slice(4, 6), 16);
    }
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    return L < 160;
  }
  const useWhiteShadow = isColorDark(color);
  if (useWhiteShadow) {
    ctx.shadowColor = "rgba(255,255,255,0.35)";
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
  }
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;

  let drawY = y;
  for (const line of lines) {
    ctx.fillText(line, drawX, drawY);
    drawY += lineHeight;
    if (drawY > height) break;
  }

  ctx.restore();
}

function drawButtonLayer(ctx, layer, width, height) {
  const text = String(layer.text || "").trim();
  if (!text) return;

  let x, y;
  if (layer.xPct != null) {
    const pct = layer.xPct <= 1 ? layer.xPct : layer.xPct / 100;
    x = width * pct;
  } else {
    x = Number(layer.x ?? 80);
  }
  if (layer.yPct != null) {
    const pct = layer.yPct <= 1 ? layer.yPct : layer.yPct / 100;
    y = height * pct;
  } else {
    y = Number(layer.y ?? height * 0.8);
  }
  x = clamp(x, 0, width);
  y = clamp(y, 0, height);
  const w = clamp(Number(layer.width ?? layer.w ?? 260), 120, Math.min(900, width));
  const h = clamp(Number(layer.height ?? layer.h ?? 56), 40, Math.min(220, height));
  const radius = clamp(Number(layer.borderRadius ?? layer.radius ?? 999), 0, 999);

  const bg = typeof (layer.backgroundColor ?? layer.bg) === "string" && String(layer.backgroundColor ?? layer.bg).trim() ? String(layer.backgroundColor ?? layer.bg).trim() : "#2563eb";
  const color = typeof (layer.textColor ?? layer.color) === "string" && String(layer.textColor ?? layer.color).trim() ? String(layer.textColor ?? layer.color).trim() : "#ffffff";
  const fontSize = clamp(Number(layer.fontSize || 0), 10, 96) || Math.min(32, Math.floor(h * 0.5));

  if (x + w > width) x = width - w - 16;
  if (y + h > height) y = height - h - 16;

  ctx.save();

  const r = Math.min(radius, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = bg;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerX = x + w / 2;
  const centerY = y + h / 2;

  ctx.fillText(text, centerX, centerY);

  ctx.restore();
}

/**
 * Render composite PNG from background + layers.
 * @param {{ backgroundUrl?: string, backgroundPath?: string, width: number, height: number, layers: any[], outputPath: string }}
 */
async function renderComposite({ backgroundUrl, backgroundPath, width, height, layers, outputPath }) {
  if (!backgroundUrl && !backgroundPath) {
    throw new Error("backgroundUrl or backgroundPath is required");
  }

  const bgPath = backgroundPath || resolveBackgroundPath(backgroundUrl);
  const w = clamp(Number(width) || 0, 320, 4096);
  const h = clamp(Number(height) || 0, 320, 4096);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const img = await loadImage(bgPath);
  ctx.drawImage(img, 0, 0, w, h);

  const safeLayers = Array.isArray(layers) ? layers.slice(0, 10) : [];

  for (const layer of safeLayers) {
    if (!layer || typeof layer.type !== "string") continue;
    if (layer.type === "gradient") {
      drawGradientLayer(ctx, layer, w, h);
    } else if (layer.type === "panel") {
      drawPanelLayer(ctx, layer, w, h);
    } else if (layer.type === "text") {
      drawTextLayer(ctx, layer, w, h);
    } else if (layer.type === "button") {
      drawButtonLayer(ctx, layer, w, h);
    }
  }

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);

  return {
    path: outputPath,
    width: w,
    height: h,
  };
}

module.exports = {
  renderComposite,
  measureTextBlock,
  wordWrapLines,
};

