#!/usr/bin/env node
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { fetch } = require("undici");

const PORT = process.env.PORT != null && String(process.env.PORT).trim() !== "" ? Number(process.env.PORT) : 3000;
const BASE = process.env.API_BASE_URL || "http://127.0.0.1:" + PORT;
const API_KEY = process.env.API_KEY;
const DEV_USER = process.env.DEV_USER || "test-user";
const isProd = process.env.NODE_ENV === "production";

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (isProd && API_KEY) h["x-api-key"] = API_KEY;
  else h["x-dev-user-id"] = DEV_USER;
  return h;
}

async function main() {
  console.log("Testing POST /api/marketing/background (OpenAI Image)");
  console.log("Base URL:", BASE);

  const r = await fetch(BASE + "/api/marketing/background", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      prompt: "modern abstract marketing background blue gradient",
      format: "1:1",
    }),
  });
  const j = await r.json().catch(() => ({}));

  if (r.status !== 200 || !j.ok || !j.imageUrl) {
    console.error("FAIL:", r.status, j);
    process.exit(1);
  }

  console.log("OK: ok:", j.ok, "imageUrl:", j.imageUrl);

  const fs = require("fs");
  const filePath = path.join(__dirname, "..", "public", j.imageUrl.replace(/^\//, ""));
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log("OK: File exists:", filePath, "size:", stat.size, "bytes");
  } else {
    console.error("FAIL: File not found:", filePath);
    process.exit(1);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
