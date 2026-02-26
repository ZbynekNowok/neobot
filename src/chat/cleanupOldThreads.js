/**
 * Delete chat_threads and their chat_messages where last_message_at is older than 90 days.
 * Run on startup and then every 24 hours.
 */

const { db } = require("../db/database.js");

const RETENTION_DAYS = 90;

function cleanupOldThreads() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 19).replace("T", " ");

  const threads = db.prepare(
    "SELECT id FROM chat_threads WHERE last_message_at < ?"
  ).all(cutoffStr);

  let deletedThreads = 0;
  let deletedMessages = 0;

  for (const t of threads) {
    const msgCount = db.prepare("SELECT COUNT(*) as c FROM chat_messages WHERE thread_id = ?").get(t.id).c;
    db.prepare("DELETE FROM chat_messages WHERE thread_id = ?").run(t.id);
    db.prepare("DELETE FROM chat_threads WHERE id = ?").run(t.id);
    deletedThreads += 1;
    deletedMessages += msgCount;
  }

  if (deletedThreads > 0) {
    console.log(`[chat cleanup] Deleted ${deletedThreads} threads and ${deletedMessages} messages (older than ${RETENTION_DAYS} days)`);
  }

  return { deletedThreads, deletedMessages };
}

function scheduleCleanup() {
  console.log("Chat cleanup scheduled (every 24h, retention 90 days)");
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    try {
      cleanupOldThreads();
    } catch (e) {
      console.error("[chat cleanup] Error:", e.message);
    }
  }, intervalMs);
}

module.exports = { cleanupOldThreads, scheduleCleanup };
