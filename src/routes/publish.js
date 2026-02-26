const express = require("express");
const { addJob } = require("../queue/jobQueue.js");
const { db } = require("../db/database.js");

const publishRouter = express.Router();

const ENTITY_TYPES = ["article", "page", "seo_fix"];
const ACTION_TYPES = ["create", "update"];

publishRouter.post("/publish", (req, res) => {
  const { workspace_id, entity_type, entity_id, target_platform, action_type, payload } = req.body || {};

  if (!entity_type || !ENTITY_TYPES.includes(entity_type)) {
    return res.status(400).json({ error: "Invalid or missing entity_type" });
  }
  if (!entity_id || typeof entity_id !== "string" || !entity_id.trim()) {
    return res.status(400).json({ error: "Invalid or missing entity_id" });
  }
  if (!target_platform || typeof target_platform !== "string" || !target_platform.trim()) {
    return res.status(400).json({ error: "Invalid or missing target_platform" });
  }
  if (!action_type || !ACTION_TYPES.includes(action_type)) {
    return res.status(400).json({ error: "Invalid or missing action_type" });
  }
  if (payload === undefined || payload === null) {
    return res.status(400).json({ error: "Missing payload" });
  }

  let payloadJson;
  try {
    payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
  } catch (_) {
    return res.status(400).json({ error: "Invalid payload (must be JSON-serializable)" });
  }

  const workspaceId = (workspace_id != null && String(workspace_id).trim()) ? String(workspace_id).trim() : null;

  db.prepare(`
    INSERT INTO publish_actions (workspace_id, entity_type, entity_id, target_platform, action_type, payload_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(workspaceId, entity_type, entity_id.trim(), target_platform.trim(), action_type, payloadJson, "draft");

  const id = db.prepare("SELECT last_insert_rowid() as id").get().id;

  res.status(201).json({
    ok: true,
    actionId: id,
    status: "draft",
  });
});

publishRouter.post("/publish/approve/:actionId", async (req, res) => {
  const actionId = parseInt(req.params.actionId, 10);
  if (!Number.isInteger(actionId) || actionId < 1) {
    return res.status(400).json({ error: "Invalid actionId" });
  }

  const row = db.prepare("SELECT id, status FROM publish_actions WHERE id = ?").get(actionId);
  if (!row) {
    return res.status(404).json({ error: "Action not found" });
  }
  if (row.status !== "draft") {
    return res.status(400).json({ error: "Only draft can be approved", status: row.status });
  }

  db.prepare(
    "UPDATE publish_actions SET status = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run("approved", actionId);

  await addJob("publish", {
    publishActionId: actionId,
    requestId: req.id,
  });

  res.json({
    ok: true,
    actionId,
    status: "approved",
    queued: true,
  });
});

publishRouter.post("/publish/reject/:actionId", (req, res) => {
  const actionId = parseInt(req.params.actionId, 10);
  if (!Number.isInteger(actionId) || actionId < 1) {
    return res.status(400).json({ error: "Invalid actionId" });
  }

  const row = db.prepare("SELECT id, status FROM publish_actions WHERE id = ?").get(actionId);
  if (!row) {
    return res.status(404).json({ error: "Action not found" });
  }
  if (row.status !== "draft") {
    return res.status(400).json({ error: "Only draft can be rejected", status: row.status });
  }

  db.prepare("UPDATE publish_actions SET status = ? WHERE id = ?").run("rejected", actionId);

  res.json({
    ok: true,
    actionId,
    status: "rejected",
  });
});

publishRouter.get("/publish/status/:actionId", (req, res) => {
  const actionId = parseInt(req.params.actionId, 10);
  if (!Number.isInteger(actionId) || actionId < 1) {
    return res.status(400).json({ error: "Invalid actionId" });
  }

  const row = db.prepare(`
    SELECT id, workspace_id, entity_type, entity_id, target_platform, action_type,
           payload_json, status, created_at, approved_at, completed_at, error_message, result_json
    FROM publish_actions
    WHERE id = ?
  `).get(actionId);

  if (!row) {
    return res.status(404).json({ error: "Action not found" });
  }

  res.json(row);
});

publishRouter.get("/publish/list", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const rows = db.prepare(`
    SELECT id, workspace_id, entity_type, entity_id, target_platform, action_type,
           status, created_at, approved_at, completed_at, result_json
    FROM publish_actions
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  res.json(rows);
});

module.exports = { publishRouter };
