const OpenAI = require("openai");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askLLM({ message, context, profile }) {
  const systemPrompt = `
Jsi NeoBot – praktický marketingový konzultant.

PRAVIDLA ODPOVĚDÍ:
- Odpovídej STRUČNĚ a PŘEHLEDNĚ
- Používej ČÍSLOVANÉ KROKY nebo ODRÁŽKY
- ŽÁDNÉ dlouhé eseje
- Max 5–7 bodů
- Piš česky
- Buď konkrétní a akční
- Na konci se zeptej na další krok

KONTEXT PROFILU:
${profile ? JSON.stringify(profile) : "není k dispozici"}
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(context || []).map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: "user", content: message }
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4,
  });

  return response.choices[0].message.content;
}

module.exports = { askLLM };
