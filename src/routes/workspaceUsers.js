const express = require("express");
const crypto = require("crypto");
const { db } = require("../db/database.js");
const { getAuthUser } = require("../auth/getAuthUser.js");
const { ensureWorkspace } = require("../auth/ensureWorkspace.js");
const { requireRole } = require("../middleware/requireRole.js");

const router = express.Router();
const VALID_ROLES = ["owner", "editor", "viewer"];

/**
 * GET /api/workspace/users (owner only)
 */
router.get("/workspace/users", getAuthUser, ensureWorkspace, requireRole(["owner"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const rows = db.prepare(`
    SELECT id, user_id, role, created_at
    FROM workspace_users
    WHERE workspace_id = ?
    ORDER BY created_at ASC
  `).all(workspaceId);

  res.json({
    ok: true,
    users: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at,
    })),
  });
});

/**
 * POST /api/workspace/users { email, role } (owner only)
 */
router.post("/workspace/users", getAuthUser, ensureWorkspace, requireRole(["owner"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const { email, role } = req.body || {};

  const emailTrimmed = email != null && typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailTrimmed) {
    return res.status(400).json({ ok: false, error: "email is required" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: "role must be owner, editor, or viewer" });
  }

  const user_id = emailTrimmed.includes("@") ? emailTrimmed : "email:" + emailTrimmed;

  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO workspace_users (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, workspaceId, user_id, role);

    const row = db.prepare("SELECT id, user_id, role, created_at FROM workspace_users WHERE id = ?").get(id);
    res.status(201).json({ ok: true, user: { id: row.id, user_id: row.user_id, role: row.role, created_at: row.created_at } });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE")) {
      return res.status(409).json({ ok: false, error: "User already in workspace" });
    }
    throw err;
  }
});

/**
 * PATCH /api/workspace/users/:id { role } (owner only)
 */
router.patch("/workspace/users/:id", getAuthUser, ensureWorkspace, requireRole(["owner"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const { id } = req.params;
  const { role } = req.body || {};

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: "role must be owner, editor, or viewer" });
  }

  const row = db.prepare("SELECT id, user_id, role FROM workspace_users WHERE id = ? AND workspace_id = ?").get(id, workspaceId);
  if (!row) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const ownerCount = db.prepare("SELECT COUNT(*) as c FROM workspace_users WHERE workspace_id = ? AND role = 'owner'").get(workspaceId);
  if (row.role === "owner" && role !== "owner" && ownerCount.c <= 1) {
    return res.status(400).json({ ok: false, error: "Cannot remove the last owner" });
  }

  db.prepare("UPDATE workspace_users SET role = ? WHERE id = ? AND workspace_id = ?").run(role, id, workspaceId);
  const updated = db.prepare("SELECT id, user_id, role, created_at FROM workspace_users WHERE id = ?").get(id);
  res.json({ ok: true, user: { id: updated.id, user_id: updated.user_id, role: updated.role, created_at: updated.created_at } });
});

/**
 * DELETE /api/workspace/users/:id (owner only)
 */
router.delete("/workspace/users/:id", getAuthUser, ensureWorkspace, requireRole(["owner"]), (req, res) => {
  const workspaceId = req.workspace.id;
  const { id } = req.params;

  const row = db.prepare("SELECT id, user_id, role FROM workspace_users WHERE id = ? AND workspace_id = ?").get(id, workspaceId);
  if (!row) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const ownerCount = db.prepare("SELECT COUNT(*) as c FROM workspace_users WHERE workspace_id = ? AND role = 'owner'").get(workspaceId);
  if (row.role === "owner" && ownerCount.c <= 1) {
    return res.status(400).json({ ok: false, error: "Cannot remove the last owner" });
  }

  db.prepare("DELETE FROM workspace_users WHERE id = ? AND workspace_id = ?").run(id, workspaceId);
  res.json({ ok: true });
});

module.exports = { workspaceUsersRouter: router };
