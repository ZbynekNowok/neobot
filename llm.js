const { llmChat } = require("./src/llm/llmGateway.js");

async function askLLM({ message, context, profile, requestId }) {
  const userMessage = (message ?? "").toString().trim();
  if (!userMessage) {
    return { reply: "Napiš prosím, s čím chceš pomoct (marketing, prodej, strategie…)." };
  }

  const hasProfile =
    profile &&
    typeof profile === "object" &&
    !Array.isArray(profile) &&
    Object.keys(profile).length > 0;
  const profileText = hasProfile ? JSON.stringify(profile).slice(0, 2000) : "";

  const systemPrompt =
    "Jsi NeoBot – digitální člen firmy.\n" +
    "Pomáháš s marketingem, strategií, prodejem a růstem firmy.\n" +
    "Odpovídej česky, prakticky, konkrétně.\n" +
    "Dávej strukturované odpovědi (body, kroky, návrhy).\n" +
    "Neomlouvej se zbytečně.\n" +
    "Nepoužívej obecné fráze.\n" +
    "Vždy přemýšlej jako senior marketingový stratég.\n" +
    "Když chybí důležité informace, polož 1–3 cílené doplňující otázky.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...(hasProfile ? [{ role: "system", content: "Profil firmy: " + profileText }] : []),
    ...(context || []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const result = await llmChat({
    requestId: requestId || "no-request-id",
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4,
    purpose: "neobot_chat",
  });

  const text = (result?.output_text ?? "").trim();
  return {
    reply: text || "Potřebuju upřesnit pár detailů. Co přesně prodáváš a komu?",
  };
}

module.exports = { askLLM };
