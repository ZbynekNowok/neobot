/**
 * Hardcoded monthly unit limits per plan (no Stripe yet).
 */
const PLAN_LIMITS = {
  start: 30_000,
  growth: 100_000,
  pro: 300_000,
};

const DEFAULT_PLAN_KEY = "start";

function getLimitForPlan(planKey) {
  return PLAN_LIMITS[planKey] ?? PLAN_LIMITS[DEFAULT_PLAN_KEY];
}

module.exports = { PLAN_LIMITS, DEFAULT_PLAN_KEY, getLimitForPlan };
