/**
 * Delete files in public/generated older than 90 days.
 * Run on startup and then every 24 hours.
 */

const path = require("path");
const fs = require("fs");
const { logger } = require("../logger.js");

const GENERATED_DIR = path.join(__dirname, "../../public/generated");
const RETENTION_DAYS = 90;

function cleanupGeneratedImages() {
  if (!fs.existsSync(GENERATED_DIR)) {
    return { deleted: 0 };
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(GENERATED_DIR, { withFileTypes: true });
  let deleted = 0;

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const filePath = path.join(GENERATED_DIR, ent.name);
    try {
      const stat = fs.statSync(filePath);
      const mtimeMs = stat.mtimeMs;
      if (mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deleted += 1;
      }
    } catch (err) {
      logger.warn({ event: "cleanup_generated_unlink_error", file: ent.name, error: err.message }, "cleanup generated unlink failed");
    }
  }

  if (deleted > 0) {
    logger.info({ event: "cleanup_generated", deleted, retention_days: RETENTION_DAYS }, "cleanup_generated: " + deleted + " files deleted");
  }

  return { deleted };
}

function scheduleCleanup() {
  logger.info({ event: "cleanup_generated_scheduled", interval_hours: 24, retention_days: RETENTION_DAYS }, "Generated images cleanup scheduled (every 24h, retention 90 days)");
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    try {
      cleanupGeneratedImages();
    } catch (e) {
      logger.warn({ event: "cleanup_generated_error", error: e.message }, "cleanup_generated_error");
    }
  }, intervalMs);
}

module.exports = { cleanupGeneratedImages, scheduleCleanup };
