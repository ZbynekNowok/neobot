"use strict";

/**
 * Industry-specific prompt fragments and prohibitions for the Master Image Prompt Engine.
 * Keeps generation within client industry context and avoids cross-industry drift.
 */

const INDUSTRY_PROMPTS = {
  automotive: {
    environments: "car detailing studio, garage, showroom, automotive workshop",
    lighting: "dramatic reflections on paint, professional detailing lighting, sharp reflections",
    heroSubjects: "car as dominant subject, detailing action, polishing, ceramic coating, paint care",
    prohibited: "portrait only, people without car, bar, office, unrelated lifestyle, fashion, restaurant",
  },
  detailing: {
    environments: "car detailing studio, garage, showroom, automotive workshop",
    lighting: "dramatic reflections on paint, professional detailing lighting, sharp reflections",
    heroSubjects: "car as dominant subject, detailing action, polishing, ceramic coating, paint care",
    prohibited: "portrait only, people without car, bar, office, unrelated lifestyle, fashion, restaurant",
  },
  fashion: {
    environments: "fashion studio, boutique, editorial set, urban street style, runway backdrop",
    lighting: "soft editorial lighting, fashion photography lighting, premium look",
    heroSubjects: "model in outfit, clothing display, accessory focus, lifestyle fashion moment",
    prohibited: "construction site, blueprints, restaurant food, gym equipment, office desk, copiers, car detailing",
  },
  construction: {
    environments: "construction site, office with blueprints, modern architecture, project site",
    lighting: "professional documentary lighting, clear daylight, office lighting",
    heroSubjects: "construction helmet, architectural plans, laptop with spreadsheet, tools, building elements",
    prohibited: "fashion model, dresses, boutique, restaurant dish, fitness gym, clothing rack",
  },
  real_estate: {
    environments: "modern house exterior, architectural model, real estate office, property showcase",
    lighting: "architectural photography, natural light, professional real estate look",
    heroSubjects: "property exterior, architectural model, key visual of space",
    prohibited: "fashion clothing, restaurant food, construction helmet, fitness equipment",
  },
  restaurant: {
    environments: "restaurant interior, gourmet table setting, kitchen, cafe atmosphere",
    lighting: "appetizing food photography lighting, warm ambient, professional culinary",
    heroSubjects: "gourmet food on table, dish presentation, restaurant scene",
    prohibited: "fashion model, construction, fitness gym, office dashboard, clothing",
  },
  fitness: {
    environments: "fitness studio, gym, outdoor training, athletic facility",
    lighting: "dynamic athletic lighting, natural energy, motivational look",
    heroSubjects: "athletic person training, fitness equipment, healthy lifestyle moment",
    prohibited: "restaurant food, fashion boutique, construction site, office desk",
  },
  saas: {
    environments: "modern office, tech workspace, laptop and dashboard, clean professional setting",
    lighting: "clean modern office lighting, screen glow, professional",
    heroSubjects: "laptop with dashboard interface, modern office, tech product",
    prohibited: "restaurant food, fashion model, construction helmet, fitness gym",
  },
  general: {
    environments: "professional studio, clean marketing set, versatile commercial backdrop",
    lighting: "professional commercial lighting, clean and premium",
    heroSubjects: "hero product or subject, clear focal point",
    prohibited: "cluttered, busy unrelated elements, many cars, car lineup, dealership catalog",
  },
};

module.exports = {
  INDUSTRY_PROMPTS,
};
