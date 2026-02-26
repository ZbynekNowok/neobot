/**
 * Middleware: ensure req.workspace is set (user's workspace).
 * Requires req.user (run after getAuthUser).
 * 
 * - If req.workspaceId exists (from API key auth), use it directly
 * - Otherwise, find or create workspace based on user_id (DEV mode only)
 * - In production without workspaceId -> 401
 */

const crypto = require("crypto");
const { db } = require("../db/database.js");
const { getLimitForPlan, DEFAULT_PLAN_KEY } = require("../saas/planLimits.js");

const DEFAULT_WORKSPACE_NAME = "My Workspace";
const ROLE_OWNER = "owner";
const isProduction = process.env.NODE_ENV === "production";

function ensureWorkspace(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Authentication required" });
  }

  // If workspaceId already set from API key auth, use it
  if (req.workspaceId) {
    const workspaceRow = db.prepare(`
      SELECT w.id, w.name, w.owner_user_id, wp.plan_key
      FROM workspaces w
      LEFT JOIN workspace_plans wp ON wp.workspace_id = w.id
      WHERE w.id = ?
    `).get(req.workspaceId);

    if (workspaceRow) {
      req.workspace = {
        id: workspaceRow.id,
        name: workspaceRow.name,
        owner_user_id: workspaceRow.owner_user_id,
        plan_key: workspaceRow.plan_key || DEFAULT_PLAN_KEY,
      };
      return next();
    }
    // If workspaceId provided but not found -> 401
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Workspace not found" });
  }

  // Production: workspaceId must be set (from API key), otherwise 401
  if (isProduction) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Valid API key required" });
  }

  // DEV mode: find or create workspace based on user_id
  const userId = req.user.id;

  // Find workspace where user is member
  const memberRow = db.prepare(`
    SELECT w.id, w.name, w.owner_user_id, wp.plan_key
    FROM workspace_members m
    JOIN workspaces w ON w.id = m.workspace_id
    LEFT JOIN workspace_plans wp ON wp.workspace_id = w.id
    WHERE m.user_id = ?
    ORDER BY m.created_at ASC
    LIMIT 1
  `).get(userId);

  if (memberRow) {
    req.workspace = {
      id: memberRow.id,
      name: memberRow.name,
      owner_user_id: memberRow.owner_user_id,
      plan_key: memberRow.plan_key || DEFAULT_PLAN_KEY,
    };
    return next();
  }

  // Create default workspace + member + plan + first period usage row (DEV only)
  const workspaceId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const period = now.slice(0, 7); // YYYY-MM
  const limitUnits = getLimitForPlan(DEFAULT_PLAN_KEY);
  const usageId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO workspaces (id, name, owner_user_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(workspaceId, DEFAULT_WORKSPACE_NAME, userId, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(memberId, workspaceId, userId, ROLE_OWNER, now);

  const wuId = require("crypto").randomUUID();
  db.prepare(`
    INSERT INTO workspace_users (id, workspace_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(wuId, workspaceId, userId, ROLE_OWNER, now);

  db.prepare(`
    INSERT INTO workspace_plans (workspace_id, plan_key, status, period_start, period_end)
    VALUES (?, ?, ?, ?, ?)
  `).run(workspaceId, DEFAULT_PLAN_KEY, "active", period + "-01", null);

  db.prepare(`
    INSERT INTO workspace_usage (id, workspace_id, period, used_units, limit_units, updated_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(usageId, workspaceId, period, limitUnits, now);

  req.workspace = {
    id: workspaceId,
    name: DEFAULT_WORKSPACE_NAME,
    owner_user_id: userId,
    plan_key: DEFAULT_PLAN_KEY,
  };
  next();
}

module.exports = { ensureWorkspace };
