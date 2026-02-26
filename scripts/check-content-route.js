#!/usr/bin/env node
"use strict";
/**
 * Run on server to verify content route is in the app.
 * Usage: node scripts/check-content-route.js
 * Or: cd /home/vpsuser/neobot && node scripts/check-content-route.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

let contentRouterLoaded = false;
try {
  require("../src/routes/content.js");
  contentRouterLoaded = true;
} catch (e) {
  console.error("content.js failed to load:", e.message);
}

console.log("Content router load:", contentRouterLoaded ? "OK" : "FAILED");
console.log("OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);
process.exit(contentRouterLoaded ? 0 : 1);
