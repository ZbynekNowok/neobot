const crypto = require("crypto");
const { db } = require("../db/database.js");

/**
 * Save successful output to outputs table.
 * @param { string } workspaceId
 * @param { string } type - e.g. content_generate, background_generate, marketing_flyer
 * @param { object } inputJson - request body (sanitized if needed)
 * @param { object } outputJson - response payload
 * @param { string | null } createdBy - user id
 */
function saveOutput(workspaceId, type, inputJson, outputJson, createdBy) {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO outputs (id, workspace_id, type, input_json, output_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    workspaceId,
    type,
    JSON.stringify(inputJson || {}),
    JSON.stringify(outputJson || {}),
    createdBy || null
  );
  return id;
}

module.exports = { saveOutput };
