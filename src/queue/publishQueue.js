// DEPRECATED: Use jobQueue.js instead
// This file is kept for backward compatibility
const { addJob, jobQueue } = require("./jobQueue.js");

const publishQueue = {
  add: async function (name, data, options) {
    if (name !== "publish") {
      throw new Error("Only 'publish' job type is supported");
    }
    return await addJob("publish", data, options);
  },
};

module.exports = { publishQueue };
