"use strict";

const path = require("path");
const fs = require("fs");
const { fetch } = require("undici");
const sharp = require("sharp");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { getTemplate, resolveFormat } = require("./templateLoader.js");

const ASSETS_FONTS = path.join(__dirname, "../../assets/fonts");
const RENDERS_DIR = path.join(__dirname, "../../public/renders");

function ensureRendersDir() {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

function parsePercent(str, size) {
  if (typeof str === "number") return str;
  const s = String(str).trim();
  if (s.endsWith("%")) return (parseFloat(s) / 100) * size;
  return parseFloat(s) || 0;
}

function registerFonts() {
  try {
    const bold = path.join(ASSETS_FONTS, "Inter-Bold.ttf");
    const reg = path.join(ASSETS_FONTS, "Inter-Regular.ttf");
    const single = path.join(ASSETS_FONTS, "Inter.ttf");
    if (fs.existsSync(bold)) GlobalFonts.registerFromPath(bold, "Inter");
    if (fs.existsSync(reg)) GlobalFonts.registerFromPath(reg, "Inter");
    if (fs.existsSync(single)) GlobalFonts.registerFromPath(single, "Inter");
  } catch (_) {}
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  if (!text || maxLines < 1) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    const w = ctx.measureText(next).width;
    if (w <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (lines.length >= maxLines) {
        current = word.length > 20 ? word.slice(0, 17) + "…" : word;
        break;
      }
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    const last = lines[maxLines - 1];
    if (last.length > 18) lines[maxLines - 1] = last.slice(0, 15) + "…";
  }
  return lines;
}

const PUBLIC_DIR = path.join(__dirname, "../../public");

async function fetchImageBuffer(url) {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
    const filePath = path.join(PUBLIC_DIR, url.replace(/^\//, ""));
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  }
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function loadBackground(backgroundUrl, width, height) {
  const buffer = await fetchImageBuffer(backgroundUrl);
  const resized = await sharp(buffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
  return resized;
}

function createSolidBackground(width, height, hex = "#1f2937") {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
}

async function render(params) {
  const {
    backgroundUrl,
    backgroundAssetId,
    templateId,
    format,
    copy,
    brand = {},
    options = {},
  } = params;

  const dims = resolveFormat(format || "4:5");
  if (!dims) throw new Error("Invalid format");

  const template = getTemplate(templateId || "promo_v1");
  if (!template) throw new Error("Unknown template: " + templateId);

  const { width, height } = dims;
  const primary = brand.primary || "#2563eb";
  const secondary = brand.secondary || brand.accent || "#7c3aed";
  const textColor = brand.textColor || "#ffffff";
  const darken = options.darken != null ? Number(options.darken) : 0.25;

  let bgBuffer;
  if (backgroundUrl) {
    bgBuffer = await loadBackground(backgroundUrl, width, height);
  } else {
    bgBuffer = await createSolidBackground(width, height, primary);
  }

  registerFonts();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgImage = await loadImage(bgBuffer);
  ctx.drawImage(bgImage, 0, 0, width, height);

  const overlay = template.bgOverlay || {};
  if (overlay.type === "dim" || darken > 0) {
    const opacity = overlay.opacity != null ? overlay.opacity : darken;
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    ctx.fillRect(0, 0, width, height);
  } else if (overlay.type === "linear" && overlay.stops && overlay.stops.length) {
    const grad =
      overlay.gradient === "to_right"
        ? ctx.createLinearGradient(0, 0, width, 0)
        : ctx.createLinearGradient(0, 0, 0, height);
    overlay.stops.forEach((s) => {
      grad.addColorStop(s.offset, `rgba(0,0,0,${s.opacity})`);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const pad = (template.safeArea && template.safeArea.paddingPercent) || 0.08;
  const safeW = width * (1 - 2 * pad);
  const safeH = height * (1 - 2 * pad);

  function zoneToPixels(zone) {
    const x = parsePercent(zone.x, width);
    const y = parsePercent(zone.y, height);
    const w = parsePercent(zone.width, width);
    const h = zone.height ? parsePercent(zone.height, height) : null;
    return { x, y, w, h };
  }

  const typo = template.typography || {};
  const zones = template.zones || {};
  const copyText = copy || {};

  function drawText(zoneKey, value) {
    if (!value) return;
    const zone = zones[zoneKey];
    const t = typo[zoneKey];
    if (!zone || !t) return;
    const { x, y, w } = zoneToPixels(zone);
    const fontSize = Math.round(Math.min(width, height) * (t.fontSizeRatio || 0.05));
    const maxLines = t.maxLines || 2;
    const align = zone.align || "left";

    ctx.font = `${t.fontWeight === "bold" ? "bold " : ""}${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
    const lineHeight = fontSize * (t.lineHeight || 1.2);
    const lines = wrapLines(ctx, value, w, maxLines);
    let dy = 0;
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + dy + fontSize);
      dy += lineHeight;
    });
  }

  if (copyText.headline) drawText("headline", copyText.headline);
  if (copyText.subheadline) drawText("subheadline", copyText.subheadline);

  const ctaZone = zones.cta;
  const ctaVal = copyText.cta;
  if (ctaVal && ctaZone) {
    const { x, y, w } = zoneToPixels(ctaZone);
    const t = typo.cta || typo.headline;
    const fontSize = Math.round(Math.min(width, height) * (t.fontSizeRatio || 0.035));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const padX = 24;
    const padY = 14;
    const m = ctx.measureText(ctaVal);
    const boxW = Math.min(m.width + padX * 2, w);
    const boxH = fontSize + padY * 2;
    let bx = x;
    if (ctaZone.align === "center") bx = x - boxW / 2;
    else if (ctaZone.align === "right") bx = x - boxW;
    ctx.fillStyle = primary;
    ctx.fillRect(bx, y - fontSize - padY, boxW, boxH);
    ctx.fillStyle = textColor;
    ctx.textAlign = ctaZone.align || "left";
    ctx.fillText(ctaVal, x, y);
  }

  if (copyText.footer) drawText("footer", copyText.footer);

  const logoUrl = brand.logoUrl;
  if (logoUrl && zones.logo) {
    try {
      const logoImage = await loadImage(logoUrl);
      const { x, y, w, h } = zoneToPixels(zones.logo);
      const maxW = w;
      const maxH = h || Math.round(height * 0.08);
      let lw = logoImage.width;
      let lh = logoImage.height;
      const ratio = Math.min(maxW / lw, maxH / lh, 1);
      lw = Math.round(lw * ratio);
      lh = Math.round(lh * ratio);
      const lx = zones.logo.align === "right" || zones.logo.anchor === "top-right" ? x - lw : x;
      ctx.drawImage(logoImage, lx, y, lw, lh);
    } catch (_) {
      // skip logo on load error
    }
  }

  return canvas.toBuffer("image/png");
}

async function renderToFile(params, filename) {
  ensureRendersDir();
  const buffer = await render(params);
  const filePath = path.join(RENDERS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = {
  render,
  renderToFile,
  ensureRendersDir,
  RENDERS_DIR,
};
