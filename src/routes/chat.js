const express = require("express");
const crypto = require("crypto");
const { db } = require("../db/database.js");
const { getAuthUser } = require("../auth/getAuthUser.js");
const { ensureWorkspace } = require("../auth/ensureWorkspace.js");
const { requireRole } = require("../middleware/requireRole.js");
const { checkAndConsumeUsage } = require("../usage/checkAndConsumeUsage.js");
const { buildSystemPrompt } = require("../chat/buildSystemPrompt.js");
const { generateThreadSummary } = require("../chat/threadSummary.js");
const { llmChat } = require("../llm/llmGateway.js");

const chatRouter = express.Router();
const allRoles = ["owner", "editor", "viewer"];
const ownerOrEditor = ["owner", "editor"];

const isProduction = process.env.NODE_ENV === "production";

/**
 * Ping: production = same auth as other chat (x-api-key). Dev = no auth only from localhost or ?debug=1; else 401.
 */
function optionalAuthForPing(req, res, next) {
  if (isProduction) {
    return getAuthUser(req, res, () => ensureWorkspace(req, res, next));
  }
  const fromLocalhost =
    req.ip === "127.0.0.1" ||
    req.ip === "::1" ||
    req.ip === "::ffff:127.0.0.1" ||
    (req.headers["x-forwarded-for"] && String(req.headers["x-forwarded-for"]).split(",")[0].trim() === "127.0.0.1");
  const debugQuery = req.query && req.query.debug === "1";
  if (fromLocalhost || debugQuery) return next();
  return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Authentication required" });
}

/**
 * GET /api/chat/ping - test endpoint (auth: production required; dev optional from localhost or ?debug=1)
 */
chatRouter.get("/ping", optionalAuthForPing, (req, res) => {
  res.json({ ok: true, route: "chat" });
});

const MAX_RECENT_MESSAGES = 10;
const MESSAGE_COUNT_BEFORE_SUMMARY = 10;
const TITLE_MAX_LEN = 50;
const MAX_MESSAGE_LENGTH = 3000;
const CHAT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CHAT_RATE_LIMIT_MAX = 20;

const chatRateLimitMap = new Map();

function checkChatRateLimit(workspaceId, userId) {
  const key = `${workspaceId}:${userId}`;
  const now = Date.now();
  let bucket = chatRateLimitMap.get(key);
  if (!bucket) {
    bucket = { count: 0, resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS };
    chatRateLimitMap.set(key, bucket);
  }
  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + CHAT_RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  if (bucket.count > CHAT_RATE_LIMIT_MAX) return false;
  return true;
}

function getProfile(workspaceId) {
  const row = db.prepare(
    "SELECT business_name, industry, target_audience, city, tone, usp, main_services, cta_style, forbidden_words FROM workspace_profile WHERE workspace_id = ?"
  ).get(workspaceId);
  if (!row) return null;
  const p = { ...row };
  if (row.main_services) try { p.main_services = JSON.parse(row.main_services); } catch (_) {}
  if (row.forbidden_words) try { p.forbidden_words = JSON.parse(row.forbidden_words); } catch (_) {}
  return p;
}

/**
 * GET /api/chat/threads (all roles)
 */
chatRouter.get("/threads", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const workspaceId = req.workspace.id;
  const userId = req.user.id;
  const rows = db.prepare(`
    SELECT id, title, mode, last_message_at, created_at
    FROM chat_threads
    WHERE workspace_id = ? AND user_id = ?
    ORDER BY last_message_at DESC
    LIMIT 100
  `).all(workspaceId, userId);
  res.json({
    ok: true,
    threads: rows.map((r) => ({
      id: r.id,
      title: r.title || "(bez názvu)",
      mode: r.mode,
      last_message_at: r.last_message_at,
      created_at: r.created_at,
    })),
  });
});

/**
 * GET /api/chat/threads/:id (all roles)
 */
chatRouter.get("/threads/:id", getAuthUser, ensureWorkspace, requireRole(allRoles), (req, res) => {
  const { id } = req.params;
  const workspaceId = req.workspace.id;
  const userId = req.user.id;
  const thread = db.prepare(
    "SELECT id, title, mode, thread_summary, created_at, last_message_at FROM chat_threads WHERE id = ? AND workspace_id = ? AND user_id = ?"
  ).get(id, workspaceId, userId);
  if (!thread) {
    return res.status(404).json({ ok: false, error: "Thread not found" });
  }
  const messages = db.prepare(`
    SELECT id, role, content, created_at
    FROM chat_messages
    WHERE thread_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(id);
  const ordered = messages.reverse();
  res.json({
    ok: true,
    thread: {
      id: thread.id,
      title: thread.title,
      mode: thread.mode,
      thread_summary: thread.thread_summary,
      created_at: thread.created_at,
      last_message_at: thread.last_message_at,
    },
    messages: ordered.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })),
  });
});

/**
 * POST /api/chat (owner + editor)
 */
chatRouter.post(
  "/",
  getAuthUser,
  ensureWorkspace,
  requireRole(ownerOrEditor),
  checkAndConsumeUsage("chat_message"),
  async (req, res) => {
    const { threadId, mode = "marketing", message } = req.body || {};
    const workspaceId = req.workspace.id;
    const userId = req.user.id;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ ok: false, error: "message must be at most 3000 characters" });
    }

    if (!checkChatRateLimit(workspaceId, userId)) {
      return res.status(429).json({ ok: false, error: "Too many messages. Try again in a minute." });
    }

    const validMode = mode === "general" ? "general" : "marketing";
    let thread;

    if (threadId) {
      thread = db.prepare(
        "SELECT id, title, thread_summary FROM chat_threads WHERE id = ? AND workspace_id = ? AND user_id = ?"
      ).get(threadId, workspaceId, userId);
      if (!thread) {
        return res.status(404).json({ ok: false, error: "Thread not found" });
      }
    } else {
      const id = crypto.randomUUID();
      const title = message.trim().slice(0, TITLE_MAX_LEN) || "Nový chat";
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      db.prepare(`
        INSERT INTO chat_threads (id, workspace_id, user_id, title, mode, created_at, last_message_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, workspaceId, userId, title, validMode, now, now);
      thread = { id, title, thread_summary: null };
    }

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.prepare(
      "INSERT INTO chat_messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(msgId, thread.id, "user", message.trim(), now);

    const profile = getProfile(workspaceId);
    const systemPrompt = buildSystemPrompt(profile, validMode);

    const recentMessages = db.prepare(`
      SELECT role, content FROM chat_messages
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(thread.id, MAX_RECENT_MESSAGES + 1);
    const ordered = recentMessages.reverse();

    const messagesForLlm = [
      { role: "system", content: systemPrompt },
    ];
    if (thread.thread_summary) {
      messagesForLlm.push({
        role: "system",
        content: "Shrnutí dosavadní konverzace:\n" + thread.thread_summary,
      });
    }
    ordered.forEach((m) => {
      messagesForLlm.push({ role: m.role, content: m.content });
    });

    let reply;
    try {
      const result = await llmChat({
        requestId: req.id,
        model: "gpt-4o-mini",
        messages: messagesForLlm,
        temperature: 0.7,
        maxOutputTokens: 800,
        purpose: "chat_marketing",
      });
      reply = (result.output_text || "").trim();
    } catch (err) {
      return res.status(err.httpStatus === 503 ? 503 : 500).json({
        ok: false,
        error: err.message || "LLM unavailable",
      });
    }

    const assistantId = crypto.randomUUID();
    const now2 = new Date().toISOString().slice(0, 19).replace("T", " ");
    db.prepare(
      "INSERT INTO chat_messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(assistantId, thread.id, "assistant", reply, now2);

    db.prepare("UPDATE chat_threads SET last_message_at = ? WHERE id = ?").run(now2, thread.id);

    if (!thread.title || thread.title === "Nový chat") {
      const newTitle = message.trim().slice(0, TITLE_MAX_LEN) || "Chat";
      db.prepare("UPDATE chat_threads SET title = ? WHERE id = ?").run(newTitle, thread.id);
    }

    const totalMessages = db.prepare("SELECT COUNT(*) as c FROM chat_messages WHERE thread_id = ?").get(thread.id).c;
    if (totalMessages >= MESSAGE_COUNT_BEFORE_SUMMARY && (totalMessages % MESSAGE_COUNT_BEFORE_SUMMARY === 0 || !thread.thread_summary)) {
      setImmediate(() => {
        generateThreadSummary(thread.id, req.id).catch(() => {});
      });
    }

    res.json({
      ok: true,
      threadId: thread.id,
      reply,
      meta: { units: 2, model: "gpt-4o-mini" },
    });
  }
);

module.exports = { chatRouter };
