const IORedis = require("ioredis");

const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null }
);

module.exports = { redisConnection };
