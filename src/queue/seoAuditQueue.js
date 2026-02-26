// DEPRECATED: Use jobQueue.js instead
// This file is kept for backward compatibility
const { addJob, jobQueue } = require("./jobQueue.js");

const seoAuditQueue = {
  add: async function (name, data, options) {
    if (name !== "audit") {
      throw new Error("Only 'audit' job type is supported");
    }
    return await addJob("seo_audit", data, options);
  },
};

module.exports = { seoAuditQueue };
