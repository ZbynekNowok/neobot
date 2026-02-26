const OpenAI = require("openai");
const { logger } = require("../logger.js");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err) {
  const status = err?.status;
  return (
    status === 429 ||
    (typeof status === "number" && status >= 500 && status <= 599) ||
    err?.code === "ETIMEDOUT" ||
    err?.name === "AbortError"
  );
}

/**
 * Single LLM call with timeout, retry (429 + 5xx only), and structured logging.
 * Uses chat.completions API. Returns { output_text } for compatibility.
 */
async function llmChat({
  requestId,
  model = "gpt-4o-mini",
  messages,
  temperature = 0.7,
  maxOutputTokens,
  purpose = "neobot_chat",
}) {
  const started = Date.now();
  const maxRetries = 2;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 45000);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages,
          temperature,
          max_tokens: maxOutputTokens,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const latency = Date.now() - started;
      const outputText = response?.choices?.[0]?.message?.content ?? "";

      logger.info(
        {
          request_id: requestId,
          purpose,
          model,
          latency_ms: latency,
          attempt,
          output_text_length: outputText.length,
        },
        "llm_success"
      );

      return { output_text: outputText, _raw: response };
    } catch (err) {
      clearTimeout(timeout);
      const latency = Date.now() - started;

      logger.warn(
        {
          request_id: requestId,
          purpose,
          model,
          latency_ms: latency,
          attempt,
          status: err?.status,
          name: err?.name,
          message: err?.message,
        },
        "llm_error"
      );

      if (attempt < maxRetries && isRetryable(err)) {
        const backoff =
          400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(backoff);
        continue;
      }

      const e = new Error("LLM_UNAVAILABLE");
      e.code = "LLM_UNAVAILABLE";
      e.httpStatus = 503;
      throw e;
    }
  }
}

module.exports = { llmChat };
