/**
 * decisionTree.js
 *
 * - Explicitní onboarding vs chat
 * - Onboarding otázky ve fixním pořadí
 * - Odpovědi se ukládají do profile
 * - Po dokončení onboarding přepne do chat módu
 */

const sessions = new Map();

/**
 * Onboarding kroky (otázky) + klíče pro ukládání odpovědí
 */
const ONBOARDING_STEPS = [
  {
    key: "projectType",
    question: "Ahoj 👋 Rád ti pomohu. Co dnes řešíš?"
  },
  {
    key: "goal",
    question: "Super 👍 Jaký je tvůj hlavní cíl? (např. prodej, růst značky, leady)"
  },
  {
    key: "channel",
    question: "Jaký marketingový kanál je pro tebe nejdůležitější? (Instagram, web, e-mail, reklamy…)"
  },
  {
    key: "budget",
    question: "Jaký máš zhruba měsíční rozpočet? (např. 0–5k / 5–20k / 20k+)"
  },
  {
    key: "timeline",
    question: "V jakém časovém horizontu chceš vidět výsledky? (1–3 / 3–6 / 6+ měsíců)"
  }
];

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      mode: "onboarding", // onboarding | chat
      step: 0,
      profile: {}
    });
  }
  return sessions.get(sessionId);
}

function decideNextStep({ sessionId, message }) {
  const session = getSession(sessionId);

  // === ONBOARDING ===
  if (session.mode === "onboarding") {
    // uložíme odpověď na předchozí otázku
    if (session.step > 0) {
      const prev = ONBOARDING_STEPS[session.step - 1];
      session.profile[prev.key] = message;
    }

    // zeptáme se na další otázku
    if (session.step < ONBOARDING_STEPS.length) {
      const step = ONBOARDING_STEPS[session.step];
      session.step++;

      return {
        action: "ASK",
        reply: step.question,
        mode: "onboarding"
      };
    }

    // onboarding hotový → přepni do chat módu
    session.mode = "chat";

    // ✅ vždy vrať reply (aby UI mělo co zobrazit)
    const p = session.profile;
    const summary =
      `Skvělé — mám základní kontext.\n` +
      `• Co řešíš: ${p.projectType || "-"}\n` +
      `• Cíl: ${p.goal || "-"}\n` +
      `• Kanál: ${p.channel || "-"}\n` +
      `• Rozpočet: ${p.budget || "-"}\n` +
      `• Horizont: ${p.timeline || "-"}\n\n` +
      `Teď mi napiš 1 věc: jaký je největší problém / překážka, kterou chceš vyřešit jako první?`;

    return {
      action: "READY",
      reply: summary,
      profile: session.profile,
      mode: "chat"
    };
  }

  // === CHAT (volný) ===
  session.profile.lastMessage = message;

  return {
    action: "CHAT",
    reply: "Rozumím. Napiš mi prosím víc detailů (co je produkt/služba, komu to prodáváš a co už jsi zkusil).",
    mode: "chat",
    profile: session.profile
  };
}

module.exports = { decideNextStep };
