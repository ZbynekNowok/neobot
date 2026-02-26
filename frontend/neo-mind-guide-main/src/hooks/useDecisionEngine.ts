import { UserProfile } from "@/components/app/AppLayout";

export interface RecommendedStep {
  type: "strategy" | "planning" | "creation";
  summary_text: string;
  recommendation_text: string;
  cta_text: string;
  cta_link: string;
}

/**
 * Deterministic Decision Engine for NeoBot
 *
 * Evaluates onboarding answers to determine the recommended next step.
 * Priority order: Strategy > Planning > Creation
 *
 * IMPORTANT: This logic must be deterministic - same data = same output
 * AI models must NOT override this decision.
 */
export function getRecommendedStep(profile: UserProfile | null): RecommendedStep | null {
  if (!profile) return null;

  const brandName = profile.brand_name || "tvé značky";

  // Map profile fields to decision inputs
  const businessStage = profile.business_stage; // Q2
  const valueProposition = profile.unique_value; // Q5
  const marketingGoals = profile.marketing_goal || []; // Q6 (ideálně pole hodnot)
  const blockers = profile.marketing_blocker; // Q7
  const publishingFrequency = profile.content_frequency; // Q10
  const contentProblems = profile.content_struggle; // Q11

  // ✅ Safe text normalizations (prevents .toLowerCase() crashes)
  const blockersText = (blockers || "").toLowerCase();
  const freqText = (publishingFrequency || "").toLowerCase();
  const contentText = (contentProblems || "").toLowerCase();

  // Helper functions for condition checking
  const hasGoal = (goal: string) => Array.isArray(marketingGoals) && marketingGoals.includes(goal);
  const hasValueProposition = !!(valueProposition && valueProposition.trim().length > 10);

  // Check for blocker indicators
  const hasStrategyBlocker =
    blockers === "no-strategy" ||
    blockers === "no-direction" ||
    blockersText.includes("chaos") ||
    blockersText.includes("směr") ||
    blockersText.includes("nevim") ||
    blockersText.includes("nevím");

  const hasContentNotWorkingProblem =
    contentText.includes("nefunguje") || contentText.includes("bez výsledků");

  const hasRegularityProblem =
    contentText.includes("pravidelnost") ||
    contentText.includes("nedržím") ||
    contentText.includes("nepravidelně");

  const hasCreativeBlockProblem =
    contentText.includes("nevím, co psát") ||
    contentText.includes("nevim, co psat") ||
    contentText.includes("neumím napsat") ||
    contentText.includes("neumim napsat") ||
    contentText.includes("nápady") ||
    contentText.includes("napady");

  const isRegularPublisher =
    !!publishingFrequency &&
    publishingFrequency !== "never" &&
    publishingFrequency !== "rarely" &&
    !freqText.includes("zatím") &&
    !freqText.includes("zatim");

  // ========================================
  // 1️⃣ STRATEGY (highest priority)
  // ========================================
  if (
    hasGoal("clarify-strategy") ||
    !hasValueProposition ||
    businessStage === "selling-no-system" ||
    hasStrategyBlocker ||
    hasContentNotWorkingProblem
  ) {
    return {
      type: "strategy",
      summary_text: `Marketing značky ${brandName} teď postrádá jasný směr.`,
      recommendation_text:
        "Než začneš tvořit další obsah, je potřeba si ujasnit jednoduchou a udržitelnou strategii.",
      cta_text: "Vytvořit strategický přehled",
      cta_link: "/app/strategie",
    };
  }

  // ========================================
  // 2️⃣ PLANNING
  // ========================================
  if (
    hasValueProposition &&
    (hasGoal("save-time") || hasRegularityProblem) &&
    publishingFrequency !== "never" &&
    !freqText.includes("zatím") &&
    !freqText.includes("zatim")
  ) {
    return {
      type: "planning",
      summary_text: `Značka ${brandName} má jasný směr, ale chybí jí pravidelnost.`,
      recommendation_text: "Největší přínos teď bude jednoduchý a dlouhodobě udržitelný plán.",
      cta_text: "Vytvořit jednoduchý plán",
      cta_link: "/app/planovac",
    };
  }

  // ========================================
  // 3️⃣ CREATION
  // ========================================
  if (
    hasValueProposition &&
    (hasGoal("new-customers") || hasGoal("increase-sales")) &&
    isRegularPublisher &&
    !hasCreativeBlockProblem
  ) {
    return {
      type: "creation",
      summary_text: `Značka ${brandName} má jasný směr i kapacitu.`,
      recommendation_text: "Teď dává smysl soustředit se na konkrétní obsahové výstupy.",
      cta_text: "Začít s tvorbou obsahu",
      cta_link: "/app/tvorba",
    };
  }

  // ========================================
  // 4️⃣ FALLBACK (required)
  // ========================================
  return {
    type: "strategy",
    summary_text: `Marketing značky ${brandName} potřebuje pevnější základ.`,
    recommendation_text: "Nejbezpečnější další krok je začít ujasněním strategie.",
    cta_text: "Vytvořit strategický přehled",
    cta_link: "/app/strategie",
  };
}

/**
 * Hook wrapper for Decision Engine
 * Returns the recommended step based on user profile
 */
export function useDecisionEngine(profile: UserProfile | null): RecommendedStep | null {
  return getRecommendedStep(profile);
}
