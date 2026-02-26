/**
 * Build system prompt for chat (marketing vs general).
 * Injects Brand Memory from workspace_profile.
 */

function buildSystemPrompt(profile, mode) {
  if (mode === "general") {
    return "Jsi užitečný asistent. Odpovídej stručně a česky. Piš vždy česky. Buď konkrétní.";
  }

  const lines = [
    "Jsi profesionální marketingový AI asistent pro české malé a střední firmy.",
    "Odpovídej konkrétně, bez obecné omáčky.",
    "Piš vždy česky.",
    "Navrhuj CTA a varianty textů, kde je to vhodné.",
    "Vyhýbej se klišé a prázdným frázím.",
  ];

  if (profile && (profile.business_name || profile.industry || profile.usp)) {
    lines.push("");
    lines.push("--- Brand Memory (profil workspace) ---");
    if (profile.business_name) lines.push("Název firmy: " + profile.business_name);
    if (profile.industry) lines.push("Obor: " + profile.industry);
    if (profile.target_audience) lines.push("Cílová skupina: " + profile.target_audience);
    if (profile.city) lines.push("Město / region: " + profile.city);
    if (profile.usp) lines.push("USP: " + profile.usp);
    if (profile.tone) lines.push("Tón komunikace: " + profile.tone);
    if (profile.cta_style) lines.push("Styl CTA: " + profile.cta_style);
    if (profile.main_services) {
      let s = profile.main_services;
      if (typeof s === "string") try { s = JSON.parse(s); } catch (_) {}
      const list = Array.isArray(s) ? s.join(", ") : String(s || "");
      if (list) lines.push("Hlavní služby: " + list);
    }
    if (profile.forbidden_words) {
      let w = profile.forbidden_words;
      if (typeof w === "string") try { w = JSON.parse(w); } catch (_) {}
      const list = Array.isArray(w) ? w.join(", ") : String(w || "");
      if (list) lines.push("Nepoužívej tato slova/fráze: " + list);
    }
    lines.push("---");
  }

  return lines.join("\n");
}

module.exports = { buildSystemPrompt };
