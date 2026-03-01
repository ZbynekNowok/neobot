/**
 * Generate short thread summary (bullet points) for context.
 * Called after every 10 messages or when thread has no summary yet and has enough messages.
 */

const { buildContextPack } = require("../context/contextEngine.js");
const { generateText } = require("../orchestrator/generate.js");

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

  const brief = transcript.slice(0, 4000);
  const contextPack = await buildContextPack({
    body: { prompt: brief, brief, outputType: "chat_thread_summary" },
    routeName: "chat/thread_summary",
  });

  const taskPrompt = `Shrň stručně toto konverzační vlákno (v zadání) do odrážek (max 200–300 slov). Formát:
- Klient / kontext: …
- Cíl: …
- Dohodnuté / navržené: …
- Otevřené body: …`;

  const result = await generateText({
    contextPack,
    task: taskPrompt,
    params: {
      requestId: requestId || "summary-" + threadId,
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxOutputTokens: SUMMARY_MAX_TOKENS,
      purpose: "chat_thread_summary",
    },
    debug: false,
  });

  const output_text = result.output_text;

  const summary = (output_text || "").trim();
  if (!summary) return null;

  db.prepare("UPDATE chat_threads SET thread_summary = ? WHERE id = ?").run(summary, threadId);

  return summary;
}

module.exports = { generateThreadSummary };
