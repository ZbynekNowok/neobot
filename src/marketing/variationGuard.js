"use strict";

const crypto = require("crypto");

// In‑memory store for recent outputs. Minimal LRU + TTL.
const STORE_LIMIT = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** @type {Map<string, { items: { signatures: any, createdAt: number }[], updatedAt: number }>} */
const variationStore = new Map();

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length > 2);
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function maskKey(key) {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 10) return "***" + k.slice(-3);
  return k.slice(0, 6) + "..." + k.slice(-4);
}

/**
 * Heuristicky vytáhne "hooky", CTA a claimy z textu.
 * Neřeší perfektní lingvistiku, jde jen o rozumnou stopu pro anti-repeat.
 */
function extractSignatures(text) {
  const raw = String(text || "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const hooks = [];
  const ctas = [];
  const claims = [];

  const ctaRegex = /\b(klikni|objednej|získej|kup|vyzkoušej|přidej se|rezervuj|zaregistruj)\b/i;
  const hookRegex = /\b(zkus|představ si|co kdyby|už žádné|přestaň|objev)\b/i;

  for (const line of lines) {
    if (line.length > 260) continue; // příliš dlouhé, spíš text než hook
    if (/^[-*•]/.test(line) || hookRegex.test(line)) {
      hooks.push(line);
      continue;
    }
    if (ctaRegex.test(line)) {
      ctas.push(line);
      continue;
    }
    if (claims.length < 8 && /!|\?|%|Kč|zdarma|garance/i.test(line)) {
      claims.push(line);
    }
  }

  return {
    hooks: unique(hooks).slice(0, 8),
    ctas: unique(ctas).slice(0, 8),
    claims: unique(claims).slice(0, 8),
  };
}

/**
 * Jednoduchá Jaccard podobnost mezi dvěma texty (pro případné rozšíření).
 */
function scoreSimilarity(a, b) {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 && tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]);
  return union.size === 0 ? 0 : intersection / union.size;
}

function makeStoreKey({ userKey, type, industry, platform }) {
  const safeUserKey = userKey || "anon";
  const parts = [
    safeUserKey,
    type || "generic",
    (industry || "").toLowerCase().slice(0, 40),
    (platform || "").toLowerCase(),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

function getEntry(storeKey, now) {
  const entry = variationStore.get(storeKey);
  if (!entry) return null;
  if (now - entry.updatedAt > TTL_MS) {
    variationStore.delete(storeKey);
    return null;
  }
  return entry;
}

function trimStoreIfNeeded() {
  if (variationStore.size <= STORE_LIMIT) return;
  const oldestKey = variationStore.keys().next().value;
  if (oldestKey) variationStore.delete(oldestKey);
}

function rememberOutput(keyOptions, signatures) {
  const now = Date.now();
  const storeKey = makeStoreKey(keyOptions);
  const existing = getEntry(storeKey, now) || { items: [], updatedAt: now };
  existing.items.unshift({ signatures, createdAt: now });
  existing.items = existing.items.slice(0, 5);
  existing.updatedAt = now;
  variationStore.set(storeKey, existing);
  trimStoreIfNeeded();
  return storeKey;
}

/**
 * Vytvoří krátkou instrukci pro LLM, která má zabránit opakování hooků/CTA/claimů.
 */
function buildAntiRepeatInstruction(summary) {
  if (!summary) return "";
  const hooks = unique(summary.hooks || []);
  const ctas = unique(summary.ctas || []);
  const claims = unique(summary.claims || []);

  if (!hooks.length && !ctas.length && !claims.length) return "";

  const parts = [];
  parts.push(
    "DŮLEŽITÉ: Nevytvářej stejné hooky, CTA ani konkrétní claimy jako v předchozích variantách. Styl může být podobný, ale použij jiné konkrétní formulace."
  );
  if (hooks.length) {
    parts.push(
      `Nepoužívej stejné hooky jako například: ${hooks
        .slice(0, 3)
        .join(" · ")}.`
    );
  }
  if (ctas.length) {
    parts.push(
      `Nepoužívej stejné CTA věty jako například: ${ctas
        .slice(0, 3)
        .join(" · ")}.`
    );
  }
  if (claims.length) {
    parts.push(
      `Zkus jiné komunikační úhly než: ${claims
        .slice(0, 3)
        .join(" · ")}. Zaměř se na odlišné benefity, motivace nebo situace.`
    );
  }
  parts.push(
    "Zvaž různé úhly komunikace (např. cena, bezpečí, rychlost, jednoduchost, status, pohodlí) a vyber takové, které se liší od předchozích variant."
  );
  return parts.join(" ");
}

/**
 * Vrátí anti-repeat instrukci a debug data pro daný klíč.
 */
function getAntiRepeatData(keyOptions) {
  const now = Date.now();
  const storeKey = makeStoreKey(keyOptions);
  const entry = getEntry(storeKey, now);
  if (!entry || !entry.items.length) {
    return {
      instruction: "",
      debug: {
        used: false,
        bannedHooks: [],
        bannedCtas: [],
        storeKey: maskKey(storeKey),
      },
    };
  }

  const hooks = new Set();
  const ctas = new Set();
  const claims = new Set();

  for (const item of entry.items) {
    if (!item || !item.signatures) continue;
    const s = item.signatures;
    (s.hooks || []).forEach((h) => hooks.add(h));
    (s.ctas || []).forEach((c) => ctas.add(c));
    (s.claims || []).forEach((c) => claims.add(c));
  }

  const summary = {
    hooks: Array.from(hooks),
    ctas: Array.from(ctas),
    claims: Array.from(claims),
  };

  const instruction = buildAntiRepeatInstruction(summary);

  return {
    instruction,
    debug: {
      used: Boolean(instruction),
      bannedHooks: summary.hooks.slice(0, 10),
      bannedCtas: summary.ctas.slice(0, 10),
      storeKey: maskKey(storeKey),
    },
  };
}

module.exports = {
  extractSignatures,
  scoreSimilarity,
  buildAntiRepeatInstruction,
  getAntiRepeatData,
  rememberOutput,
};

