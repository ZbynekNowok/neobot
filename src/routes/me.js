const express = require("express");
const { db } = require("../db/database.js");
const { getAuthUser } = require("../auth/getAuthUser.js");
const { ensureWorkspace } = require("../auth/ensureWorkspace.js");
const { requireRole } = require("../middleware/requireRole.js");
const { getWorkspaceUsage } = require("../usage/checkAndConsumeUsage.js");
const { saveOutput } = require("../saas/saveOutput.js");

const meRouter = express.Router();
const allRoles = ["owner", "editor", "viewer"];
const writeRoles = ["owner", "editor"];

/**
 * GET /api/me (all roles)
 */
meRouter.get("/me", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const usage = getWorkspaceUsage(req.workspace.id);
  
  // Determine auth mode
  const authMode = req.workspaceId ? "api_key" : "dev";
  const authInfo = {
    mode: authMode,
  };
  if (req._apiKeyPrefix) {
    authInfo.key_prefix = req._apiKeyPrefix;
  }

  res.json({
    ok: true,
    workspace: {
      id: req.workspace.id,
      name: req.workspace.name,
      plan_key: req.workspace.plan_key,
      usage: {
        period: usage.period,
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      },
    },
    auth: authInfo,
  });
});

/**
 * POST /api/outputs (owner, editor) – uložit výstup do historie (Lovable po vygenerování textu/SEO).
 * Body: { type: string, input?: object, output?: object }. type např. content_generate, seo_generate, seo_audit.
 */
meRouter.post("/outputs", getAuthUser, ensureWorkspace, requireRole(writeRoles), (req, res) => {
  const { type, input, output } = req.body || {};
  const t = typeof type === "string" ? type.trim() : "";
  const allowed = ["content_generate", "seo_generate", "seo_audit", "social_card_draft", "background_generate", "marketing_flyer"];
  if (!t || !allowed.includes(t)) {
    return res.status(400).json({ ok: false, error: "INVALID_TYPE", message: "type must be one of: " + allowed.join(", ") });
  }
  try {
    const id = saveOutput(
      req.workspace.id,
      t,
      input && typeof input === "object" ? input : {},
      output && typeof output === "object" ? output : {},
      req.user?.id || null
    );
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("[POST /api/outputs]", err);
    res.status(500).json({ ok: false, error: "SAVE_FAILED", message: err?.message || "Failed to save output" });
  }
});

/**
 * GET /api/outputs (all roles)
 */
meRouter.get("/outputs", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const rows = db.prepare(`
    SELECT id, workspace_id, type, input_json, output_json, created_by, created_at
    FROM outputs
    WHERE workspace_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.workspace.id, limit);

  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    input: r.input_json ? JSON.parse(r.input_json) : null,
    output: r.output_json ? JSON.parse(r.output_json) : null,
    created_by: r.created_by,
    created_at: r.created_at,
  }));

  res.json({ ok: true, items });
});

/**
 * GET /api/seo/history (all roles) – historie SEO výstupů (seo_generate, seo_audit).
 * Lovable stránka „SEO Historie“ (/app/seo/historie) volá tento endpoint – bez něj dostane 404.
 */
meRouter.get("/seo/history", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const rows = db.prepare(`
    SELECT id, workspace_id, type, input_json, output_json, created_by, created_at
    FROM outputs
    WHERE workspace_id = ? AND type LIKE 'seo_%'
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.workspace.id, limit);

  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    input: r.input_json ? JSON.parse(r.input_json) : null,
    output: r.output_json ? JSON.parse(r.output_json) : null,
    created_by: r.created_by,
    created_at: r.created_at,
  }));

  res.json({ ok: true, items });
});

/**
 * GET /api/seo/audit/list (all roles) – jen seo_audit položky (Lovable „audity“ tab).
 */
meRouter.get("/seo/audit/list", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const rows = db.prepare(`
    SELECT id, workspace_id, type, input_json, output_json, created_by, created_at
    FROM outputs
    WHERE workspace_id = ? AND type = 'seo_audit'
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.workspace.id, limit);

  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    input: r.input_json ? JSON.parse(r.input_json) : null,
    output: r.output_json ? JSON.parse(r.output_json) : null,
    created_by: r.created_by,
    created_at: r.created_at,
  }));

  res.json({ ok: true, items });
});

module.exports = { meRouter };
