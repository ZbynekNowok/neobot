#!/usr/bin/env node
"use strict";

/**
 * Static checks for frontend: ImageNeoBotWorkspace must contain expected strings
 * (live render on drag, style presets, compose/render API).
 * Exit 0 on success, 1 on missing.
 */

const fs = require("fs");
const path = require("path");

const FE_FILE = path.join(
  __dirname,
  "../../frontend/neo-mind-guide-main/src/components/app/ImageNeoBotWorkspace.tsx"
);

const REQUIRED = [
  "useThrottledCallback",
  "onDragMove",
  "/api/images/compose/render",
  "stylePresetOptions",
];

let failed = [];
const content = fs.existsSync(FE_FILE)
  ? fs.readFileSync(FE_FILE, "utf8")
  : "";

for (const s of REQUIRED) {
  if (!content.includes(s)) failed.push(s);
}

if (failed.length) {
  console.error("Missing in ImageNeoBotWorkspace.tsx:", failed.join(", "));
  process.exit(1);
}
process.exit(0);
