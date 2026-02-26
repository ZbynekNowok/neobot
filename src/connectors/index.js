const { wpCreatePost, wpUpdatePost } = require("./wordpressClient.js");

async function publishWithConnector({ action, target }) {
  const platform = (action.target_platform || "").toLowerCase();
  if (platform === "wordpress") {
    return publishWordPress({ action, target });
  }
  throw new Error("Unsupported platform: " + (action.target_platform || ""));
}

function parsePayload(payloadJson) {
  if (typeof payloadJson === "string") {
    try {
      return JSON.parse(payloadJson);
    } catch (_) {
      throw new Error("Invalid payload_json");
    }
  }
  return payloadJson || {};
}

async function publishWordPress({ action, target }) {
  const payload = parsePayload(action.payload_json);
  const postType = payload.postType === "page" ? "page" : "post";
  const mode = payload.mode === "update" ? "update" : "create";
  const status = payload.status || "draft";
  const baseUrl = target.base_url;
  const username = target.username;
  const appPassword = target.appPassword;

  if (!baseUrl || !username || !appPassword) {
    throw new Error("WordPress target missing base_url, username or appPassword");
  }

  if (mode === "update") {
    const remoteId = payload.remoteId;
    if (remoteId == null) throw new Error("update requires payload.remoteId");
    return wpUpdatePost({
      baseUrl,
      username,
      appPassword,
      postType,
      remoteId,
      title: payload.title,
      content: payload.content,
      excerpt: payload.excerpt,
      slug: payload.slug,
      status,
    });
  }

  return wpCreatePost({
    baseUrl,
    username,
    appPassword,
    postType,
    title: payload.title,
    content: payload.content,
    excerpt: payload.excerpt,
    slug: payload.slug,
    status,
  });
}

module.exports = { publishWithConnector };
