"use strict";

const { db } = require("../db/database.js");
const { getLimitForPlan, DEFAULT_PLAN_KEY } = require("../saas/planLimits.js");
const { estimateUnits } = require("./estimateUnits.js");

/**
 * Get current period usage for a workspace.
 * @param {string} workspaceId
 * @returns {{ period: string, used: number, limit: number, remaining: number }}
 */
function getWorkspaceUsage(workspaceId) {
  const period = new Date().toISOString().slice(0, 7);
  let row = db.prepare(
    "SELECT used_units, limit_units FROM workspace_usage WHERE workspace_id = ? AND period = ?"
  ).get(workspaceId, period);

  if (!row) {
    const planRow = db.prepare(
      "SELECT plan_key FROM workspace_plans WHERE workspace_id = ? ORDER BY period_start DESC LIMIT 1"
    ).get(workspaceId);
    const planKey = (planRow && planRow.plan_key) || DEFAULT_PLAN_KEY;
    const limitUnits = getLimitForPlan(planKey);
    const crypto = require("crypto");
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.prepare(`
      INSERT INTO workspace_usage (id, workspace_id, period, used_units, limit_units, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(crypto.randomUUID(), workspaceId, period, limitUnits, now);
    row = { used_units: 0, limit_units: limitUnits };
  }

  const used = row.used_units || 0;
  const limit = row.limit_units || 0;
  return {
    period,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

/**
 * Middleware factory: check limit and consume units for the given operation type.
 * Must run after getAuthUser and ensureWorkspace (req.workspace.id set).
 * On limit exceeded returns 402.
 */
function checkAndConsumeUsage(type) {
  return function (req, res, next) {
    const workspaceId = req.workspace && req.workspace.id;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Workspace required" });
    }

    const units = estimateUnits({ type });
    const period = new Date().toISOString().slice(0, 7);

    let row = db.prepare(
      "SELECT used_units, limit_units FROM workspace_usage WHERE workspace_id = ? AND period = ?"
    ).get(workspaceId, period);

    if (!row) {
      const planRow = db.prepare(
        "SELECT plan_key FROM workspace_plans WHERE workspace_id = ? ORDER BY period_start DESC LIMIT 1"
      ).get(workspaceId);
      const planKey = (planRow && planRow.plan_key) || DEFAULT_PLAN_KEY;
      const limitUnits = getLimitForPlan(planKey);
      const crypto = require("crypto");
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      db.prepare(`
        INSERT INTO workspace_usage (id, workspace_id, period, used_units, limit_units, updated_at)
        VALUES (?, ?, ?, 0, ?, ?)
      `).run(crypto.randomUUID(), workspaceId, period, limitUnits, now);
      row = { used_units: 0, limit_units: limitUnits };
    }

    const used = row.used_units || 0;
    const limit = row.limit_units || 0;
    if (used + units > limit) {
      return res.status(402).json({
        ok: false,
        error: "QUOTA_EXCEEDED",
        message: "Došel kredit / units. Obnovte limit v dalším období nebo upgradujte plán.",
      });
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.prepare(`
      UPDATE workspace_usage SET used_units = used_units + ?, updated_at = ? WHERE workspace_id = ? AND period = ?
    `).run(units, now, workspaceId, period);

    next();
  };
}

module.exports = { getWorkspaceUsage, checkAndConsumeUsage };
