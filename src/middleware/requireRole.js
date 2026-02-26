/**
 * RBAC: require current user to have one of the allowed roles in the workspace.
 * Must run after getAuthUser and ensureWorkspace (req.user, req.workspace set).
 * Sets req.workspaceRole and returns 403 if role not in allowedRoles.
 * @param {string[]} allowedRoles - e.g. ['owner'], ['owner','editor'], ['owner','editor','viewer']
 */
function requireRole(allowedRoles) {
  const set = new Set(Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]);

  return function (req, res, next) {
    if (!req.user || !req.user.id || !req.workspace || !req.workspace.id) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Authentication required" });
    }

    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    const { db } = require("../db/database.js");
    const row = db.prepare("SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?").get(workspaceId, userId);

    if (!row) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "You do not have access to this workspace" });
    }

    if (!set.has(row.role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Insufficient role for this action" });
    }

    req.workspaceRole = row.role;
    next();
  };
}

module.exports = { requireRole };
