const express = require("express");
const cors = require("cors");

const { decideNextStep } = require("./decisionTree.js");
const { askLLM } = require("./llm.js");
const { addMessage, getContext } = require("./memory.js");

const app = express();

/**
 * MIDDLEWARE
 */
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // chat.html

/**
 * CHAT ENDPOINT
 */
app.post("/think/chat", async (req, res) => {
  try {
    res.setHeader("X-NeoBot-Status", "processing");
    res.setHeader("Cache-Control", "no-store");

    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: "Missing message or sessionId" });
    }

    addMessage(sessionId, "user", message);

    const decision = decideNextStep({ sessionId, message });

    if (decision.action === "ASK") {
      addMessage(sessionId, "assistant", decision.reply);
      return res.json({
        status: "ok",
        action: "ASK",
        reply: decision.reply
      });
    }

    if (decision.action === "READY") {
      await new Promise(r => setImmediate(r));

      const reply = await askLLM({
        message: `Vytvoř marketingovou strategii pro tento projekt:\n${JSON.stringify(
          decision.profile,
          null,
          2
        )}`,
        context: []
      });

      addMessage(sessionId, "assistant", reply);

      return res.json({
        status: "ok",
        action: "LLM_RESPONSE",
        reply
      });
    }

    await new Promise(r => setImmediate(r));

    const reply = await askLLM({
      message,
      context: getContext(sessionId)
    });

    addMessage(sessionId, "assistant", reply);

    return res.json({
      status: "ok",
      action: "LLM_RESPONSE",
      reply
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * START SERVER
 */
const PORT = 3000;
app.listen(PORT, () => {
  console.log("🚀 NeoBot server běží na portu 3000");
});
