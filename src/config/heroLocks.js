"use strict";

/**
 * HARD HERO LOCKS by keyword/industry.
 * Each lock defines required (MUST be visible) and forbidden (MUST NOT be visible) for the scene.
 * Used by Master Prompt Builder to keep generations on-topic and on-industry.
 */

const HERO_LOCKS = {
  automotive: {
    required: [
      "a real car as dominant hero subject (>=50% frame)",
      "car detailing action: polishing, washing, ceramic coating, paint reflections, detailing studio",
    ].join(", "),
    forbidden: [
      "portrait only, people without car, bar/office scenes, unrelated lifestyle",
    ].join(", "),
  },
  detailing: {
    required: [
      "a real car as dominant hero subject (>=50% frame)",
      "car detailing action: polishing, washing, ceramic coating, paint reflections, detailing studio",
    ].join(", "),
    forbidden: [
      "portrait only, people without car, bar/office scenes, unrelated lifestyle",
    ].join(", "),
  },
  fashion: {
    required: [
      "fashion products: clothing, outfit, model wearing apparel, boutique interior, editorial fashion shoot",
    ].join(", "),
    forbidden: [
      "electronics, printers, cars, tools, industrial scenes",
    ].join(", "),
  },
  real_estate: {
    required: [
      "property interior/exterior, architecture, living room/kitchen, facade, real estate mood",
    ].join(", "),
    forbidden: [
      "products on table, random portraits, cars",
    ].join(", "),
  },
  construction: {
    required: [
      "construction site, workers, materials, building structures, renovation scene",
    ].join(", "),
    forbidden: [
      "fashion/editorial, restaurant table",
    ].join(", "),
  },
  restaurant: {
    required: [
      "restaurant or food scene: gourmet dish, table setting, kitchen, cafe, culinary",
    ].join(", "),
    forbidden: [
      "fashion model, construction, cars, office dashboard",
    ].join(", "),
  },
  fitness: {
    required: [
      "fitness studio, gym, athletic person training, equipment, healthy lifestyle moment",
    ].join(", "),
    forbidden: [
      "restaurant food, fashion boutique, construction site, office desk",
    ].join(", "),
  },
  saas: {
    required: [
      "modern office, tech workspace, laptop, clean professional setting, product/dashboard context",
    ].join(", "),
    forbidden: [
      "restaurant food, fashion model, construction helmet, fitness gym",
    ].join(", "),
  },
  general: {
    required: [
      "one clear hero subject, professional commercial scene",
    ].join(", "),
    forbidden: [
      "cluttered, many unrelated subjects, catalog grid, lineup",
    ].join(", "),
  },
};

/**
 * Resolve hero lock key from industry string (and optional keyword hints).
 * @param {string} industry - Normalized industry (e.g. fashion, real_estate, automotive)
 * @returns {string} Key into HERO_LOCKS (e.g. "automotive", "fashion")
 */
function getHeroLockKey(industry) {
  if (!industry || typeof industry !== "string") return "general";
  const i = industry.toLowerCase().trim().replace(/-/g, "_");
  if (HERO_LOCKS[i]) return i;
  if (i === "realestate") return "real_estate";
  return "general";
}

/**
 * Get required and forbidden phrases for an industry.
 * @param {string} industry
 * @returns {{ required: string, forbidden: string }}
 */
function getHeroLock(industry) {
  const key = getHeroLockKey(industry);
  const lock = HERO_LOCKS[key] || HERO_LOCKS.general;
  return { required: lock.required, forbidden: lock.forbidden };
}

module.exports = {
  HERO_LOCKS,
  getHeroLockKey,
  getHeroLock,
};
