// DEPRECATED: Use jobQueue.js instead
// This file is kept for backward compatibility
const { addJob, jobQueue } = require("./jobQueue.js");

const seoQueue = {
  add: async function (name, data, options) {
    if (name !== "generate-article") {
      throw new Error("Only 'generate-article' job type is supported");
    }
    return await addJob("seo_generate", data, options);
  },
  remove: async function (jobId) {
    const job = await jobQueue.getJob(jobId);
    if (!job) return 0;
    await job.remove();
    return 1;
  },
};

module.exports = { seoQueue };
