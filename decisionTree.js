const { setState, getState, setData, getData } = require("./memory");

function decideNextStep({ sessionId, message }) {
  const text = message.toLowerCase();

  // 1️⃣ první kontakt
  if (!getState(sessionId, "started")) {
    setState(sessionId, "started", true);
    return {
      action: "GREET",
      reply: "Ahoj 👋 Rád ti pomohu. Co dnes řešíš?"
    };
  }

  // 2️⃣ typ projektu
  if (!getData(sessionId).projectType) {
    setData(sessionId, "projectType", message);
    return {
      action: "ASK",
      reply: "Super 👍 Jaký je tvůj hlavní cíl? (např. prodej, růst značky, leady)"
    };
  }

  // 3️⃣ cíl
  if (!getData(sessionId).goal) {
    setData(sessionId, "goal", message);
    return {
      action: "ASK",
      reply: "Jaký marketingový kanál je pro tebe nejdůležitější? (Instagram, web, e-mail, reklamy…)"
    };
  }

  // 4️⃣ kanál
  if (!getData(sessionId).channel) {
    setData(sessionId, "channel", message);
    return {
      action: "ASK",
      reply: "Jaký máš zhruba měsíční rozpočet? (např. 0–5k / 5–20k / 20k+)"
    };
  }

  // 5️⃣ rozpočet
  if (!getData(sessionId).budget) {
    setData(sessionId, "budget", message);
    return {
      action: "ASK",
      reply: "V jakém časovém horizontu chceš vidět výsledky? (1–3 / 3–6 / 6+ měsíců)"
    };
  }

  // 6️⃣ vše máme → LLM
  if (!getData(sessionId).timeline) {
    setData(sessionId, "timeline", message);
  }

  return {
    action: "LLM",
    profile: getData(sessionId)
  };
}

module.exports = { decideNextStep };
