const express = require("express");

const healthRouter = express.Router();

healthRouter.get("/health", (req, res) => {
  res.json({
    ok: true,
    uptime_seconds: process.uptime(),
  });
});

healthRouter.get("/ready", (req, res) => {
  res.json({
    ok: true,
  });
});

module.exports = { healthRouter };
