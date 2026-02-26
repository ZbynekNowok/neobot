"use strict";

const path = require("path");
const Database = require("better-sqlite3");
const crypto = require("crypto");

const DEFAULT_PLAN_KEY = "start";
const DB_DIR = process.env.NEOBOT_DB_DIR || path.join(__dirname, "..", "..");
const DB_PATH = path.join(DB_DIR, "neobot.db");

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma("journal_mode = WAL");

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_plans (
      workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
      plan_key TEXT NOT NULL,
      status TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS workspace_usage (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      period TEXT NOT NULL,
      used_units INTEGER NOT NULL DEFAULT 0,
      limit_units INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, period)
    );

    CREATE TABLE IF NOT EXISTS workspace_profile (
      workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
      business_name TEXT,
      industry TEXT,
      target_audience TEXT,
      city TEXT,
      tone TEXT,
      usp TEXT,
      main_services TEXT,
      cta_style TEXT,
      forbidden_words TEXT,
      brand_logo_url TEXT,
      updated_at TEXT
    );
  `);

  try {
    db.exec("ALTER TABLE workspace_profile ADD COLUMN brand_logo_url TEXT");
  } catch (_) {
    /* column may already exist */
  }
  db.exec(`

    CREATE TABLE IF NOT EXISTS outputs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      type TEXT NOT NULL,
      input_json TEXT,
      output_json TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_outputs_workspace_created ON outputs(workspace_id, created_at DESC);
  `);

  // Ensure default workspace exists (for API-key auth)
  const count = db.prepare("SELECT COUNT(*) AS c FROM workspaces").get();
  if (count.c === 0) {
    const { getLimitForPlan } = require("../saas/planLimits.js");
    const wid = crypto.randomUUID();
    const uid = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const period = now.slice(0, 7);
    const limitUnits = getLimitForPlan(DEFAULT_PLAN_KEY);

    db.prepare(
      "INSERT INTO workspaces (id, name, owner_user_id, created_at) VALUES (?, ?, ?, ?)"
    ).run(wid, "Default Workspace", "default-user", now);

    db.prepare(`
      INSERT INTO workspace_plans (workspace_id, plan_key, status, period_start, period_end)
      VALUES (?, ?, 'active', ?, NULL)
    `).run(wid, DEFAULT_PLAN_KEY, period + "-01");

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, 'default-user', 'owner', ?)
    `).run(crypto.randomUUID(), wid, now);

    db.prepare(`
      INSERT INTO workspace_users (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, 'default-user', 'owner', ?)
    `).run(uid, wid, now);

    db.prepare(`
      INSERT INTO workspace_usage (id, workspace_id, period, used_units, limit_units, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(crypto.randomUUID(), wid, period, limitUnits, now);
  }
}

runMigrations();

module.exports = { db };
