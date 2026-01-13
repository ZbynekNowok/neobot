// server.js
// TASK 1.1 – Okamžitá odezva UI (ACK + polling)

const path = require("path");
const express = require("express");

const memory = require("./memory");
const decisionTree = require("./decisionTree");

const app = express();
app.use(express.json({ limit: "1mb" }));

// frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

app.use(express.static(__dirname));

// 🔴 JEDINÁ DŮLEŽITÁ FUNKCE
async function runDecisionTree(sessionId, message) {
  return await decisionTree.decideNextStep({
    sessionId,
    message,
  });
}

// POST /think/chat → okamžitý ACK
app.post("/think/chat", (req, res) => {
  const sessionId = String(req.body.sessionId || "").trim();
  const message = String(req.body.message || "").trim();

  if (!sessionId || !message) {
    return res.status(400).json({ status: "error", error: "Missing sessionId or message" });
  }

  const requestId = memory.createRequest(sessionId);

  // okamžitá odezva UI
  res.json({ status: "accepted", requestId });

  // async zpracování
  setImmediate(async () => {
    try {
      const result = await runDecisionTree(sessionId, message);
      memory.setRequestResult(sessionId, requestId, result);
    } catch (err) {
      memory.setRequestError(sessionId, requestId, {
        status: "error",
        error: err.message,
      });
    }
  });
});

// polling
app.get("/think/result", (req, res) => {
  const { sessionId, requestId } = req.query;

  const r = memory.getRequest(sessionId, requestId);
  if (!r) return res.status(404).json({ status: "error", error: "Unknown request" });

  if (r.status === "pending") return res.json({ status: "pending" });
  if (r.status === "error") return res.json({ status: "error", payload: r.payload });

  return res.json({ status: "done", payload: r.payload });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NeoBot running on port ${PORT}`);
});
