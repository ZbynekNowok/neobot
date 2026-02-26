const express = require("express");
const { db } = require("../db/database.js");
const { getAuthUser } = require("../auth/getAuthUser.js");
const { ensureWorkspace } = require("../auth/ensureWorkspace.js");
const { requireRole } = require("../middleware/requireRole.js");

const router = express.Router();

function rowToProfile(row) {
  if (!row) return null;
  const p = {
    business_name: row.business_name,
    industry: row.industry,
    target_audience: row.target_audience,
    city: row.city,
    tone: row.tone,
    usp: row.usp,
    main_services: row.main_services ? tryParseJson(row.main_services) : null,
    cta_style: row.cta_style,
    forbidden_words: row.forbidden_words ? tryParseJson(row.forbidden_words) : null,
    brand_logo_url: row.brand_logo_url || null,
    updated_at: row.updated_at,
  };
  return p;
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

/**
 * GET /api/workspace/profile (all roles)
 */
router.get("/workspace/profile", getAuthUser, ensureWorkspace, requireRole(["owner", "editor", "viewer"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const row = db.prepare(
    "SELECT business_name, industry, target_audience, city, tone, usp, main_services, cta_style, forbidden_words, brand_logo_url, updated_at FROM workspace_profile WHERE workspace_id = ?"
  ).get(workspaceId);
  const profile = rowToProfile(row);
  res.json({ ok: true, profile: profile || {} });
});

/**
 * POST /api/workspace/profile (owner only)
 */
router.post("/workspace/profile", getAuthUser, ensureWorkspace, requireRole(["owner"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const body = req.body || {};
  const business_name = body.business_name != null ? String(body.business_name).trim() || null : null;
  const industry = body.industry != null ? String(body.industry).trim() || null : null;
  const target_audience = body.target_audience != null ? String(body.target_audience).trim() || null : null;
  const city = body.city != null ? String(body.city).trim() || null : null;
  const tone = body.tone != null ? String(body.tone).trim() || null : null;
  const usp = body.usp != null ? String(body.usp).trim() || null : null;
  const cta_style = body.cta_style != null ? String(body.cta_style).trim() || null : null;
  const main_services = body.main_services != null
    ? (Array.isArray(body.main_services) ? JSON.stringify(body.main_services) : String(body.main_services).trim() || null)
    : null;
  const forbidden_words = body.forbidden_words != null
    ? (Array.isArray(body.forbidden_words) ? JSON.stringify(body.forbidden_words) : String(body.forbidden_words).trim() || null)
    : null;
  const brand_logo_url = body.brand_logo_url != null ? String(body.brand_logo_url).trim() || null : null;

  db.prepare(`
    INSERT INTO workspace_profile (workspace_id, business_name, industry, target_audience, city, tone, usp, main_services, cta_style, forbidden_words, brand_logo_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(workspace_id) DO UPDATE SET
      business_name = excluded.business_name,
      industry = excluded.industry,
      target_audience = excluded.target_audience,
      city = excluded.city,
      tone = excluded.tone,
      usp = excluded.usp,
      main_services = excluded.main_services,
      cta_style = excluded.cta_style,
      forbidden_words = excluded.forbidden_words,
      brand_logo_url = excluded.brand_logo_url,
      updated_at = datetime('now')
  `).run(workspaceId, business_name, industry, target_audience, city, tone, usp, main_services, cta_style, forbidden_words, brand_logo_url);

  const row = db.prepare(
    "SELECT business_name, industry, target_audience, city, tone, usp, main_services, cta_style, forbidden_words, brand_logo_url, updated_at FROM workspace_profile WHERE workspace_id = ?"
  ).get(workspaceId);
  res.json({ ok: true, profile: rowToProfile(row) });
});

module.exports = { workspaceProfileRouter: router };
