const express = require("express");
const { fetch } = require("undici");

const PROXY_TIMEOUT_MS = 30000;
const apiProxyRouter = express.Router();

function getTargetBase() {
  const base = process.env.EXTERNAL_API_URL || "http://127.0.0.1:3000";
  return String(base).replace(/\/+$/, "");
}

function addCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Mounted at /api/proxy, so req.path is e.g. "/health" or "/seo/generate"
apiProxyRouter.use(function (req, res, next) {
  if (req.method === "OPTIONS") {
    addCors(res);
    return res.status(204).end();
  }
  next();
});
apiProxyRouter.use(express.json({ limit: "1mb" }));
apiProxyRouter.use(proxyHandler);

async function proxyHandler(req, res) {
  addCors(res);

  const pathSuffix = (req.path || "").replace(/^\//, "") || "";
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  const targetBase = getTargetBase();
  const targetUrl = targetBase + (pathSuffix ? "/" + pathSuffix : "") + query;

  const method = req.method;
  const headers = {};
  if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
  if (req.headers["authorization"]) headers["Authorization"] = req.headers["authorization"];

  let body = undefined;
  if (method !== "GET" && method !== "HEAD" && req.body !== undefined && req.body !== null) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  } else if (method !== "GET" && method !== "HEAD" && req.body === undefined && req.readableBody) {
    body = req.rawBody;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseHeaders = response.headers;
    const contentType = responseHeaders.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    res.status(response.status);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      res.status(504).json({ ok: false, message: "Proxy timeout" });
    } else {
      res.status(502).json({ ok: false, message: err.message || "Proxy error" });
    }
  }
}

module.exports = { apiProxyRouter };
