const express = require("express");
const { jobQueue } = require("../queue/jobQueue.js");
const { db } = require("../db/database.js");

const jobsRouter = express.Router();

/**
 * GET /api/jobs/:id
 * Unified job status endpoint
 */
jobsRouter.get("/jobs/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Step 1: Try BullMQ first (for active/completed jobs that haven't been removed)
    let bullJob = null;
    let bullJobState = null;
    try {
      bullJob = await jobQueue.getJob(id);
      if (!bullJob && /^\d+$/.test(id)) {
        bullJob = await jobQueue.getJob(parseInt(id, 10));
      }
      
      if (bullJob) {
        // Map BullMQ states to our status
        if (await bullJob.isActive()) {
          bullJobState = "active";
        } else if (await bullJob.isCompleted()) {
          bullJobState = "completed";
        } else if (await bullJob.isFailed()) {
          bullJobState = "failed";
        } else if (await bullJob.isDelayed()) {
          bullJobState = "queued";
        } else {
          // waiting, waiting-children, etc. -> queued
          bullJobState = "queued";
        }
      }
    } catch (err) {
      // Job not in queue (completed and removed, or never existed)
    }
    
    // Step 2: Fallback to SQLite if BullMQ job not found
    const seoRow = db.prepare(`
      SELECT job_id, topic, content, status, created_at, completed_at
      FROM seo_articles WHERE job_id = ?
    `).get(id);
    
    const auditRow = !seoRow ? db.prepare(`
      SELECT job_id, base_url, status, pages_crawled, report_json, created_at, completed_at
      FROM seo_audits WHERE job_id = ?
    `).get(id) : null;
    
    // For publish jobs, check publish_actions by entity_id
    let publishRow = null;
    let flyerRow = null;
    if (!seoRow && !auditRow) {
      publishRow = db.prepare(`
        SELECT id, entity_type, entity_id, target_platform, status, result_json, error_message, created_at, completed_at
        FROM publish_actions WHERE entity_id = ? LIMIT 1
      `).get(id);
      
      if (!publishRow) {
        flyerRow = db.prepare(`
          SELECT job_id, industry, brand_json, offer_json, format, status, png_url, art_direction_json, created_at, completed_at
          FROM marketing_flyers WHERE job_id = ?
        `).get(id);
      }
    }
    
    // Step 3: If neither BullMQ nor SQLite has the job, return 404
    // Note: image_background jobs are only in BullMQ (no DB table)
    if (!bullJob && !seoRow && !auditRow && !publishRow && !flyerRow) {
      return res.status(404).json({
        ok: false,
        error: {
          message: "Job not found",
        },
      });
    }
    
    // Determine job type and status
    let jobType = null;
    let status = "queued"; // Default, will be normalized to queued|active|completed|failed
    let progress = 0;
    let result = null;
    let error = null;
    let safeData = null; // Only safe summary data, no sensitive info
    let createdAt = null;
    let completedAt = null;
    
    // Check if it's an image_background or background_generate job (only in BullMQ, no DB table)
    if (bullJob && bullJob.data && (bullJob.data.type === "image_background" || bullJob.data.type === "background_generate")) {
      jobType = bullJob.data.type;
      createdAt = bullJob.timestamp ? new Date(bullJob.timestamp).toISOString() : null;
      completedAt = bullJob.finishedOn ? new Date(bullJob.finishedOn).toISOString() : null;
      
      if (bullJob.data.type === "image_background") {
        safeData = {
          type: "image_background",
          format: bullJob.data.format,
          style: bullJob.data.style,
          purpose: bullJob.data.purpose,
        };
      } else {
        safeData = {
          type: "background_generate",
          format: bullJob.data.format,
          style: bullJob.data.style || null,
          purpose: bullJob.data.purpose || null,
          palette: bullJob.data.palette || null,
        };
      }
      
      if (bullJobState === "completed") {
        status = "completed";
        progress = 100;
        try {
          const returnValue = await bullJob.returnvalue;
          if (returnValue) {
            result = returnValue;
          }
        } catch (_) {}
      } else if (bullJobState === "failed") {
        status = "failed";
        progress = 0;
        const failedReason = bullJob.failedReason;
        if (failedReason) {
          error = normalizeError(failedReason, "IMAGE_GENERATION_FAILED");
        }
      } else if (bullJobState === "active") {
        status = "active";
        progress = bullJob.progress || 50;
      } else {
        status = "queued";
        progress = bullJob.progress || 0;
      }
      
      // Override with BullMQ progress if available
      if (bullJob.progress != null) {
        progress = bullJob.progress;
      }
    }
    
    // Normalize error to standard format: { message: string, code?: string, details?: any }
    function normalizeError(err, code = null) {
      if (!err) return null;
      if (typeof err === "string") {
        return { message: err, code: code || null };
      }
      if (err.message) {
        return {
          message: err.message,
          code: err.code || code || null,
          details: err.details || (err.stack ? { stack: err.stack } : null),
        };
      }
      return { message: String(err), code: code || null };
    }
    
    if (seoRow) {
      jobType = "seo_generate";
      createdAt = seoRow.created_at;
      completedAt = seoRow.completed_at;
      safeData = { type: "seo_generate", topic: seoRow.topic };
      
      // Map DB status to normalized status
      if (seoRow.status === "completed") {
        status = "completed";
        progress = 100;
        if (seoRow.content) {
          result = { content: seoRow.content };
        }
      } else if (seoRow.status === "failed" || seoRow.status === "cancelled") {
        status = "failed";
        progress = 0;
      } else if (seoRow.status === "processing") {
        status = "active";
        progress = bullJob?.progress || 20;
      } else {
        // queued, pending, etc.
        status = "queued";
        progress = bullJob?.progress || 0;
      }
      
    } else if (auditRow) {
      jobType = "seo_audit";
      createdAt = auditRow.created_at;
      completedAt = auditRow.completed_at;
      safeData = {
        type: "seo_audit",
        targetUrl: auditRow.base_url,
      };
      
      if (auditRow.status === "completed" || auditRow.status === "blocked_by_robots") {
        status = "completed";
        progress = 100;
        if (auditRow.report_json) {
          try {
            const report = JSON.parse(auditRow.report_json);
            result = { report: report };
          } catch (_) {}
        }
      } else if (auditRow.status === "failed") {
        status = "failed";
        progress = 0;
      } else if (auditRow.status === "processing") {
        status = "active";
        progress = bullJob?.progress || Math.min(90, Math.floor((auditRow.pages_crawled || 0) / 25 * 90));
      } else {
        status = "queued";
        progress = bullJob?.progress || 0;
      }
      
    } else if (publishRow) {
      jobType = "publish";
      createdAt = publishRow.created_at;
      completedAt = publishRow.completed_at;
      safeData = {
        type: "publish",
        connector: publishRow.target_platform,
      };
      
      if (publishRow.status === "completed") {
        status = "completed";
        progress = 100;
        if (publishRow.result_json) {
          try {
            result = JSON.parse(publishRow.result_json);
          } catch (_) {}
        }
      } else if (publishRow.status === "failed") {
        status = "failed";
        progress = 0;
        error = normalizeError(publishRow.error_message, "PUBLISH_FAILED");
      } else if (publishRow.status === "processing") {
        status = "active";
        progress = bullJob?.progress || 50;
      } else {
        status = "queued";
        progress = bullJob?.progress || 0;
      }
    } else if (flyerRow) {
      jobType = "marketing_flyer";
      createdAt = flyerRow.created_at;
      completedAt = flyerRow.completed_at;
      safeData = {
        type: "marketing_flyer",
        industry: flyerRow.industry,
        format: flyerRow.format,
      };
      
      if (flyerRow.status === "completed") {
        status = "completed";
        progress = 100;
        if (flyerRow.png_url) {
          try {
            let artDirection = null;
            if (flyerRow.art_direction_json) {
              artDirection = JSON.parse(flyerRow.art_direction_json);
            }
            result = {
              pngUrl: flyerRow.png_url,
              format: flyerRow.format,
              artDirection: artDirection,
            };
          } catch (_) {}
        }
      } else if (flyerRow.status === "failed") {
        status = "failed";
        progress = 0;
      } else if (flyerRow.status === "processing") {
        status = "active";
        progress = bullJob?.progress || 50;
      } else {
        status = "queued";
        progress = bullJob?.progress || 0;
      }
    }
    
    // Override with BullMQ state if available (BullMQ is source of truth for active jobs)
    // Skip if already processed as image_background or background_generate above
    if (bullJob && bullJobState && jobType !== "image_background" && jobType !== "background_generate") {
      status = bullJobState;
      
      // Get progress from BullMQ
      if (bullJob.progress != null) {
        progress = bullJob.progress;
      }
      
      // Get result from BullMQ if completed
      if (bullJobState === "completed") {
        try {
          const returnValue = await bullJob.returnvalue;
          if (returnValue) {
            result = returnValue;
          }
        } catch (_) {
          // Fallback to DB result if BullMQ returnvalue fails
        }
      }
      
      // Get error from BullMQ if failed
      if (bullJobState === "failed") {
        const failedReason = bullJob.failedReason;
        if (failedReason) {
          error = normalizeError(failedReason, "JOB_FAILED");
          if (bullJob.stacktrace) {
            error.details = { stack: bullJob.stacktrace };
          }
        }
      }
    }
    
    // Ensure status is one of: queued|active|completed|failed
    if (!["queued", "active", "completed", "failed"].includes(status)) {
      status = "queued";
    }
    
    // If completed but no result, try to get from DB
    if (status === "completed" && !result) {
      if (seoRow && seoRow.content) {
        result = { content: seoRow.content };
      } else if (auditRow && auditRow.report_json) {
        try {
          result = { report: JSON.parse(auditRow.report_json) };
        } catch (_) {}
      } else if (publishRow && publishRow.result_json) {
        try {
          result = JSON.parse(publishRow.result_json);
        } catch (_) {}
      }
    }

    res.json({
      ok: true,
      job: {
        id: String(id),
        type: jobType,
        status: status, // Always: queued|active|completed|failed
        progress: progress, // 0-100
        result: result, // null or result object
        error: error, // null or { message: string, code?: string, details?: any }
        created_at: createdAt,
        completed_at: completedAt,
        data: safeData, // Only safe summary, no sensitive data
      },
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: {
        message: err.message || "Internal server error",
        code: "INTERNAL_ERROR",
      },
    });
  }
});

module.exports = { jobsRouter };
