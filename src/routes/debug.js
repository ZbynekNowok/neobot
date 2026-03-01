"use strict";

const express = require("express");
const { buildContextPack } = require("../context/contextEngine.js");

const debugRouter = express.Router();

/**
 * POST /api/debug/context
 * Dev only. Returns buildContextPack result for the given body (prompt/brief, industry, platform, etc.).
 */
debugRouter.post("/debug/context", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ ok: false, error: "Not available in production" });
  }

  try {
    const body = req.body || {};
    const contextPack = await buildContextPack({
      body,
      user: req.user || null,
      workspace: req.workspace || null,
      routeName: body.routeName || "debug/context",
    });

    return res.json({
      ok: true,
      contextPack,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "buildContextPack failed",
    });
  }
});

module.exports = { debugRouter };
