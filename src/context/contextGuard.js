"use strict";

/**
 * DEV-only runtime detection: ensures provider is only called after orchestrator has marked context usage.
 * Orchestrator calls markContextUsage(contextPack) before calling provider; provider calls assertContextUsed(traceId).
 */

function markContextUsage(contextPack) {
  global.__neobotContextUsage = global.__neobotContextUsage || new Set();
  global.__neobotContextUsage.add(contextPack.traceId);
}

function assertContextUsed(traceId) {
  if (process.env.NODE_ENV !== "production") {
    if (!global.__neobotContextUsage?.has(traceId)) {
      throw new Error("Provider called without orchestrator context usage");
    }
  }
}

module.exports = {
  markContextUsage,
  assertContextUsed,
};
