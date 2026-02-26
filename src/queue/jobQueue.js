const { Queue } = require("bullmq");
const { redisConnection } = require("./redis.js");

const jobQueue = new Queue("jobs", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // Reduced from 3 for faster failure feedback
    backoff: {
      type: "exponential",
      delay: 5000, // 5s initial delay, then exponential backoff
    },
    removeOnComplete: false, // Keep completed jobs for /api/jobs/:id fallback
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

/**
 * Add a job to the unified queue
 * @param {string} type - Job type: "seo_generate", "seo_audit", "publish"
 * @param {object} payload - Job payload
 * @param {object} options - Optional BullMQ job options (merged with defaults)
 * @returns {Promise<Job>}
 */
async function addJob(type, payload, options = {}) {
  // Merge user options with defaults (user options take precedence)
  const jobOptions = {
    attempts: options.attempts !== undefined ? options.attempts : 2,
    backoff: options.backoff || {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: options.removeOnComplete !== undefined ? options.removeOnComplete : false,
    removeOnFail: options.removeOnFail !== undefined ? options.removeOnFail : false,
    ...options, // Allow any other BullMQ options
  };
  
  return await jobQueue.add(type, {
    type,
    ...payload,
  }, jobOptions);
}

/**
 * Get job by ID
 * @param {string} jobId
 * @returns {Promise<Job|null>}
 */
async function getJob(jobId) {
  return await jobQueue.getJob(jobId);
}

/**
 * Cancel/remove job from queue
 * @param {string} jobId
 * @returns {Promise<number>} Number of removed jobs (0 or 1)
 */
async function cancelJob(jobId) {
  const job = await jobQueue.getJob(jobId);
  if (!job) return 0;
  await job.remove();
  return 1;
}

module.exports = {
  jobQueue,
  addJob,
  getJob,
  cancelJob,
};
