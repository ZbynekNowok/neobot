const path = require("path");
const fs = require("fs");

const TEMPLATES_DIR = path.join(__dirname, "templates");

const FORMAT_DIMENSIONS = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1080x1080": { width: 1080, height: 1080 },
  "1080x1350": { width: 1080, height: 1350 },
  "1080x1920": { width: 1080, height: 1920 },
  "1920x1080": { width: 1920, height: 1080 },
};

let templateCache = null;

function loadTemplates() {
  if (templateCache) return templateCache;
  templateCache = {};
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(TEMPLATES_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const t = JSON.parse(raw);
    templateCache[t.id] = t;
  }
  return templateCache;
}

function getTemplate(id) {
  const templates = loadTemplates();
  return templates[id] || null;
}

function listTemplates() {
  const templates = loadTemplates();
  return Object.values(templates).map((t) => ({
    id: t.id,
    name: t.name,
    supportedFormats: t.supportedFormats || [],
  }));
}

function resolveFormat(formatStr) {
  const s = String(formatStr || "").trim().toLowerCase();
  if (FORMAT_DIMENSIONS[s]) return { ...FORMAT_DIMENSIONS[s], format: s };
  const match = s.match(/^(\d+)\s*[x×]\s*(\d+)$/);
  if (match) {
    const w = parseInt(match[1], 10);
    const h = parseInt(match[2], 10);
    if (w >= 100 && w <= 4096 && h >= 100 && h <= 4096) {
      return { width: w, height: h, format: `${w}x${h}` };
    }
  }
  return null;
}

module.exports = {
  loadTemplates,
  getTemplate,
  listTemplates,
  resolveFormat,
  FORMAT_DIMENSIONS,
};
