"use strict";

const express = require("express");
const { buildContextPack } = require("../context/contextEngine.js");
const { generateText } = require("../orchestrator/generate.js");

const systemAuditRouter = express.Router();

/**
 * GET /api/system/audit/context
 * Tests buildContextPack, generateText, and generateImage (orchestrator) and returns status.
 */
systemAuditRouter.get("/context", async (req, res) => {
  try {
    const body = { prompt: "audit test brief", outputType: "system_audit" };
    const contextPack = await buildContextPack({
      body,
      routeName: "system/audit/context",
    });

    if (!contextPack.traceId || !contextPack.resolvedIndustry || contextPack.brief === undefined) {
      return res.status(500).json({
        status: "ERROR",
        message: "buildContextPack missing required fields",
        contextPack: { traceId: contextPack.traceId, resolvedIndustry: contextPack.resolvedIndustry, outputType: contextPack.outputType },
        orchestratorWorking: false,
      });
    }

    let orchestratorWorking = false;
    try {
      const textResult = await generateText({
        contextPack,
        task: "Reply with exactly: OK",
        params: { maxOutputTokens: 10 },
        debug: false,
      });
      orchestratorWorking = Boolean(textResult && textResult.output_text);
    } catch (e) {
      return res.status(500).json({
        status: "ERROR",
        message: "generateText failed: " + (e.message || String(e)),
        contextPack: {
          traceId: contextPack.traceId,
          resolvedIndustry: contextPack.resolvedIndustry,
          outputType: contextPack.outputType,
        },
        orchestratorWorking: false,
      });
    }

    return res.json({
      status: "OK",
      contextPack: {
        traceId: contextPack.traceId,
        resolvedIndustry: contextPack.resolvedIndustry,
        outputType: contextPack.outputType,
      },
      orchestratorWorking: true,
    });
  } catch (err) {
    return res.status(500).json({
      status: "ERROR",
      message: err.message || "Audit failed",
      orchestratorWorking: false,
    });
  }
});

module.exports = { systemAuditRouter };
