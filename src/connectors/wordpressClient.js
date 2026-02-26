const { fetch } = require("undici");

const USER_AGENT = "NeoBotPublish/1.0";
const TIMEOUT_MS = 30000;

function basicAuth(username, appPassword) {
  const token = Buffer.from(username + ":" + appPassword, "utf8").toString("base64");
  return "Basic " + token;
}

function normalizeBaseUrl(url) {
  const s = String(url).trim().replace(/\/+$/, "");
  return s || null;
}

async function wpRequest({ baseUrl, username, appPassword, method, path, body }) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) throw new Error("Invalid baseUrl");
  const url = base + path;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
        "Authorization": basicAuth(username, appPassword),
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      const msg = (data && (data.message || data.code)) || res.statusText || "WP request failed";
      const err = new Error("WP " + res.status + ": " + msg);
      err.statusCode = res.status;
      throw err;
    }
    return data;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      const err = new Error("WP request timeout");
      err.statusCode = 408;
      throw err;
    }
    throw e;
  }
}

async function wpCreatePost({ baseUrl, username, appPassword, postType, title, content, excerpt, slug, status }) {
  const endpoint = postType === "page" ? "/wp-json/wp/v2/pages" : "/wp-json/wp/v2/posts";
  const body = {};
  if (title != null) body.title = title;
  if (content != null) body.content = content;
  if (excerpt != null) body.excerpt = excerpt;
  if (slug != null) body.slug = slug;
  if (status != null) body.status = status;

  const data = await wpRequest({
    baseUrl,
    username,
    appPassword,
    method: "POST",
    path: endpoint,
    body,
  });

  const id = data && (data.id != null) ? data.id : null;
  const link = data && data.link ? data.link : null;
  return { remoteId: id, remoteUrl: link };
}

async function wpUpdatePost({ baseUrl, username, appPassword, postType, remoteId, title, content, excerpt, slug, status }) {
  const endpoint = postType === "page"
    ? "/wp-json/wp/v2/pages/" + remoteId
    : "/wp-json/wp/v2/posts/" + remoteId;
  const body = {};
  if (title != null) body.title = title;
  if (content != null) body.content = content;
  if (excerpt != null) body.excerpt = excerpt;
  if (slug != null) body.slug = slug;
  if (status != null) body.status = status;

  const data = await wpRequest({
    baseUrl,
    username,
    appPassword,
    method: "PUT",
    path: endpoint,
    body,
  });

  const id = data && (data.id != null) ? data.id : remoteId;
  const link = data && data.link ? data.link : null;
  return { remoteId: id, remoteUrl: link };
}

module.exports = { wpCreatePost, wpUpdatePost };
