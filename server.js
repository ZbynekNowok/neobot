"use strict";

/** Preferovat IPv4 při DNS (častý fix na VPS – vyhnutí se IPv6 problémům). */
const dns = require("node:dns");
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");

/**
 * Entry: health, design (Grafika s textem), me (Historie výstupů = GET /api/outputs).
 * Pokud používáš jiný vstupní soubor, přidej tam designRouter a meRouter.
 */

const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath, override: true });

if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN.length < 10) {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const line = raw.split(/\r?\n/).find((l) => l.startsWith("REPLICATE_API_TOKEN="));
    if (line) {
      const val = line.slice("REPLICATE_API_TOKEN=".length).trim();
      if (val.length >= 10) process.env.REPLICATE_API_TOKEN = val;
    }
  } catch (_) {}
}

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

const { healthRouter } = require("./src/routes/health.js");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(healthRouter);

try {
  const { designRouter } = require("./src/routes/design.js");
  app.use("/api", designRouter);
  console.log("designRouter mounted: /api/design/social-card/draft");
} catch (e) {
  console.warn("designRouter not loaded:", e.message);
}

try {
  const { imagesRouter } = require("./src/routes/images.js");
  app.use("/api", imagesRouter);
  console.log("imagesRouter mounted: /api/images/*");
} catch (e) {
  console.warn("imagesRouter not loaded:", e.message);
}

try {
  const { contentRouter } = require("./src/routes/content.js");
  app.use("/api", contentRouter);
  console.log("contentRouter mounted: /api/content/generate");
} catch (e) {
  console.warn("contentRouter not loaded:", e.message);
  app.post("/api/content/generate", (req, res) => {
    res.status(503).json({
      ok: false,
      error: "Generování textu není k dispozici (backend se nenačetl).",
    });
  });
}

// Debug (dev only): POST /api/debug/context – returns buildContextPack for given body
if (process.env.NODE_ENV !== "production") {
  try {
    const { debugRouter } = require("./src/routes/debug.js");
    app.use("/api", debugRouter);
    console.log("debugRouter mounted: /api/debug/context (dev only)");
  } catch (e) {
    console.warn("debugRouter not loaded:", e.message);
  }
}

// Historie výstupů, /api/me, /api/outputs, SEO history
let meRouterLoaded = false;
try {
  const meRouter = require("./src/routes/me.js").meRouter;
  app.use("/api", meRouter);
  meRouterLoaded = true;
  console.log("meRouter mounted: /api/me, /api/outputs, /api/seo/*");
} catch (e) {
  console.warn("meRouter not loaded:", e.message);
  const emptyOutputs = (req, res) => res.json({ ok: true, items: [] });
  app.get("/api/outputs", emptyOutputs);
  app.get("/api/list", emptyOutputs);
  app.get("/api/seo/history", emptyOutputs);
  app.get("/api/seo/audit/list", emptyOutputs);
  app.get("/api/me", (req, res) => {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "API key required (meRouter not loaded)" });
  });
}

// Workspace profile (profil značky pro generování textu / design)
try {
  const { workspaceProfileRouter } = require("./src/routes/workspaceProfile.js");
  app.use("/api", workspaceProfileRouter);
  console.log("workspaceProfileRouter mounted: /api/workspace/profile");
} catch (e) {
  console.warn("workspaceProfileRouter not loaded:", e.message);
}

// System audit: GET /api/system/audit/context – test ContextPack + orchestrator
try {
  const { systemAuditRouter } = require("./src/routes/systemAudit.js");
  app.use("/api/system/audit", systemAuditRouter);
  console.log("systemAuditRouter mounted: /api/system/audit/context");
} catch (e) {
  console.warn("systemAuditRouter not loaded:", e.message);
}

// AI Ads Studio – URL → Ads Draft (F1)
try {
  const { adsStudioRouter } = require("./src/routes/adsStudio.js");
  app.use("/api", adsStudioRouter);
  console.log("adsStudioRouter mounted: /api/ads/draft, /api/ads/images, /api/ads/product-variants");
} catch (e) {
  console.warn("adsStudioRouter not loaded:", e.message);
}

// SPA frontend (neo-mind-guide) – servíruj dist a fallback na index.html
const frontendDist = path.join(__dirname, "frontend", "neo-mind-guide-main", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    if (req.accepts("html")) {
      res.sendFile(path.join(frontendDist, "index.html"));
    } else {
      next();
    }
  });
}

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
