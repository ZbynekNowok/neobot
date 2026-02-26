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

async function run() {
  let failed = 0;
  const assert = (name, ok, detail) => {
    if (!ok) {
      failed++;
      console.log("FAIL:", name, detail || "");
    } else {
      console.log("OK:", name);
    }
  };

  console.log("Base URL:", BASE);
  console.log("Auth:", isProd && API_KEY ? "x-api-key" : "x-dev-user-id");

  // A) GET /api/chat/ping (prod: needs auth; dev: no auth from localhost)
  try {
    const pingOpts = { method: "GET" };
    if (isProd && API_KEY) pingOpts.headers = { "x-api-key": API_KEY };
    else if (!isProd) pingOpts.headers = { "x-dev-user-id": DEV_USER };
    const r = await fetch(BASE + "/api/chat/ping", pingOpts);
    const j = await r.json().catch(() => ({}));
    assert("GET /api/chat/ping", r.status === 200 && j.ok === true, r.status + " " + JSON.stringify(j));
  } catch (e) {
    assert("GET /api/chat/ping", false, e.message);
  }

  // B) POST /api/workspace/profile
  try {
    const r = await fetch(BASE + "/api/workspace/profile", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        business_name: "Test Květiny",
        industry: "květinářství",
        city: "Brno",
        tone: "přátelský",
        usp: "Doručení v den objednávky.",
      }),
    });
    const j = await r.json().catch(() => ({}));
    assert("POST /api/workspace/profile", r.status === 200 && j.ok === true, r.status + " " + JSON.stringify(j));
  } catch (e) {
    assert("POST /api/workspace/profile", false, e.message);
  }

  // C) POST /api/chat
  let threadId;
  try {
    const r = await fetch(BASE + "/api/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mode: "marketing", message: "Napiš krátký slogan pro naši květinářství v Brně." }),
    });
    const j = await r.json().catch(() => ({}));
    const ok = r.status === 200 && j.ok === true && j.reply;
    if (ok) threadId = j.threadId;
    assert("POST /api/chat", ok, r.status + " " + (j.error || ""));
    if (j.reply && (j.reply.includes("Brno") || j.reply.includes("Brně"))) {
      console.log("OK: Reply contains brand context (city)");
    } else if (j.reply) {
      console.log("INFO: Reply received (brand context not checked)");
    }
  } catch (e) {
    assert("POST /api/chat", false, e.message);
  }

  // D) GET /api/chat/threads
  try {
    const r = await fetch(BASE + "/api/chat/threads", { method: "GET", headers: authHeaders() });
    const j = await r.json().catch(() => ({}));
    assert("GET /api/chat/threads", r.status === 200 && j.ok === true && Array.isArray(j.threads), r.status + " " + JSON.stringify(j).slice(0, 100));
  } catch (e) {
    assert("GET /api/chat/threads", false, e.message);
  }

  // E) GET /api/outputs (all roles incl. viewer)
  try {
    const r = await fetch(BASE + "/api/outputs", { method: "GET", headers: authHeaders() });
    const j = await r.json().catch(() => ({}));
    assert("GET /api/outputs", r.status === 200 && j.ok === true && Array.isArray(j.items), r.status + " " + (j.error || ""));
  } catch (e) {
    assert("GET /api/outputs", false, e.message);
  }

  if (failed > 0) {
    console.log("\nTotal failures:", failed);
    process.exit(1);
  }
  console.log("\nAll tests passed.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
