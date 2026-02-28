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

function drawTextLayer(ctx, layer, width, height) {
  const text = String(layer.text || "").trim();
  if (!text) return;

  const fontSize = clamp(Number(layer.fontSize || 40), 12, 140);
  const fontWeight = clamp(Number(layer.fontWeight || 600), 300, 900);
  const align = ["left", "center", "right"].includes(layer.align) ? layer.align : "left";
  const maxWidthPct = clamp(Number(layer.maxWidthPct || 0.8), 0.3, 0.95);
  const maxWidth = width * maxWidthPct;

  let color = typeof layer.color === "string" && layer.color.trim() ? layer.color.trim() : "#ffffff";

  let x = clamp(Number(layer.x || 80), 0, width);
  let y = clamp(Number(layer.y || height * 0.7), 0, height);

  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = color;

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

  let x = clamp(Number(layer.x || 80), 0, width);
  let y = clamp(Number(layer.y || height * 0.8), 0, height);
  const w = clamp(Number(layer.w || 260), 120, Math.min(900, width));
  const h = clamp(Number(layer.h || 56), 40, Math.min(220, height));
  const radius = clamp(Number(layer.radius ?? 999), 0, 999);

  const bg = typeof layer.bg === "string" && layer.bg.trim() ? layer.bg.trim() : "#2563eb";
  const color = typeof layer.color === "string" && layer.color.trim() ? layer.color.trim() : "#ffffff";

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
  ctx.font = `600 ${Math.min(32, h * 0.5)}px Inter, sans-serif`;
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

