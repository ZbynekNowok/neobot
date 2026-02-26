"use strict";

/**
 * Sets req.user and optionally req.workspaceId.
 * - x-api-key: must match API_KEY or NEOBOT_API_KEY; looks up default (first) workspace, sets req.workspaceId and req.user = { id: owner_user_id }. Stores key prefix in req._apiKeyPrefix.
 * - x-dev-user-id (dev only): sets req.user = { id: header value }.
 * Otherwise 401.
 */

const isProduction = process.env.NODE_ENV === "production";
const API_KEY = process.env.API_KEY || process.env.NEOBOT_API_KEY || "";

function getAuthUser(req, res, next) {
  const apiKeyHeader = req.headers["x-api-key"];
  const devUserId = req.headers["x-dev-user-id"];

  if (apiKeyHeader && typeof apiKeyHeader === "string" && API_KEY && apiKeyHeader === API_KEY) {
    const { db } = require("../db/database.js");
    const row = db.prepare(
      "SELECT id, owner_user_id FROM workspaces ORDER BY created_at ASC LIMIT 1"
    ).get();
    if (row) {
      req.workspaceId = row.id;
      req.user = { id: row.owner_user_id };
      req._apiKeyPrefix = apiKeyHeader.slice(0, 8);
      return next();
    }
  }

  if (!isProduction && devUserId && typeof devUserId === "string" && devUserId.trim()) {
    req.user = { id: devUserId.trim() };
    return next();
  }

  return res.status(401).json({
    ok: false,
    error: "UNAUTHORIZED",
    message: "Chybí nebo je neplatný API klíč (x-api-key) nebo v režimu dev hlavička x-dev-user-id.",
  });
}

module.exports = { getAuthUser };
