const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.x-api-key",
      "*.OPENAI_API_KEY",
      "*.apiKey",
      "*.api_key",
      "*.key",
    ],
    remove: true,
  },
});

module.exports = { logger };
