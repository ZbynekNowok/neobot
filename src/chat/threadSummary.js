/**
 * Generate short thread summary (bullet points) for context.
 * Called after every 10 messages or when thread has no summary yet and has enough messages.
 */

const { llmChat } = require("../llm/llmGateway.js");

const SUMMARY_MAX_TOKENS = 250;

async function generateThreadSummary(threadId, requestId) {
  const { db } = require("../db/database.js");
  const rows = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE thread_id = ?
    ORDER BY created_at ASC
    LIMIT 30
  `).all(threadId);

  if (rows.length < 2) return null;

  const transcript = rows
    .map((r) => (r.role === "user" ? "Uživatel: " : "Asistent: ") + (r.content || "").slice(0, 500))
    .join("\n");

  const prompt = `Shrň stručně toto konverzační vlákno do odrážek (max 200–300 slov). Formát:
- Klient / kontext: …
- Cíl: …
- Dohodnuté / navržené: …
- Otevřené body: …

Konverzace:
---
${transcript.slice(0, 4000)}
---`;

  const { output_text } = await llmChat({
    requestId: requestId || "summary-" + threadId,
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    maxOutputTokens: SUMMARY_MAX_TOKENS,
    purpose: "chat_thread_summary",
  });

  const summary = (output_text || "").trim();
  if (!summary) return null;

  db.prepare("UPDATE chat_threads SET thread_summary = ? WHERE id = ?").run(summary, threadId);

  return summary;
}

module.exports = { generateThreadSummary };
