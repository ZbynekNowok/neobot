const express = require("express");
const { db } = require("../db/database.js");
const { encryptSecret } = require("../security/crypto.js");

const publishTargetsRouter = express.Router();
const DEFAULT_WORKSPACE = "default";

function hasPublishSecretKey() {
  const raw = process.env.PUBLISH_SECRET_KEY;
  return raw && typeof raw === "string" && raw.length >= 32;
}

function requireSecretKey(req, res, next) {
  if (!hasPublishSecretKey()) {
    return res.status(503).json({
      error: "Publish connections unavailable",
      code: "PUBLISH_SECRET_KEY_MISSING",
    });
  }
  next();
}

publishTargetsRouter.get("/publish/targets", (req, res) => {
  const rows = db.prepare(`
    SELECT id, workspace_id, platform, base_url, username, created_at
    FROM publish_targets
    ORDER BY workspace_id, platform
  `).all();

  res.json(rows);
});

publishTargetsRouter.post("/publish/targets/wordpress", requireSecretKey, (req, res) => {
  const { baseUrl, username, appPassword } = req.body || {};
  const workspaceId = (req.body && req.body.workspace_id != null && String(req.body.workspace_id).trim())
    ? String(req.body.workspace_id).trim()
    : DEFAULT_WORKSPACE;

  const url = (baseUrl != null && typeof baseUrl === "string") ? baseUrl.trim() : "";
  if (!url) {
    return res.status(400).json({ error: "Missing or invalid baseUrl" });
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return res.status(400).json({ error: "baseUrl must be http or https" });
    }
  } catch (_) {
    return res.status(400).json({ error: "Invalid baseUrl" });
  }

  if (!username || typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ error: "Missing or invalid username" });
  }
  if (!appPassword || typeof appPassword !== "string" || !appPassword.trim()) {
    return res.status(400).json({ error: "Missing or invalid appPassword" });
  }

  let secretEnc;
  try {
    secretEnc = encryptSecret(appPassword.trim());
  } catch (err) {
    if (err && err.message === "PUBLISH_SECRET_KEY_MISSING") {
      return res.status(503).json({ error: "Publish connections unavailable", code: "PUBLISH_SECRET_KEY_MISSING" });
    }
    throw err;
  }

  const baseUrlNorm = url.replace(/\/+$/, "") || url;
  const usernameTrim = username.trim();

  db.prepare(`
    INSERT INTO publish_targets (workspace_id, platform, base_url, username, secret_enc)
    VALUES (?, 'wordpress', ?, ?, ?)
    ON CONFLICT(workspace_id, platform) DO UPDATE SET
      base_url = excluded.base_url,
      username = excluded.username,
      secret_enc = excluded.secret_enc
  `).run(workspaceId, baseUrlNorm, usernameTrim, secretEnc);

  res.json({ ok: true });
});

publishTargetsRouter.delete("/publish/targets/wordpress", (req, res) => {
  const workspaceId = (req.query && req.query.workspace_id != null && String(req.query.workspace_id).trim())
    ? String(req.query.workspace_id).trim()
    : DEFAULT_WORKSPACE;

  const result = db.prepare(
    "DELETE FROM publish_targets WHERE workspace_id = ? AND platform = 'wordpress'"
  ).run(workspaceId);

  res.json({ ok: true, deleted: result.changes > 0 });
});

module.exports = { publishTargetsRouter };
