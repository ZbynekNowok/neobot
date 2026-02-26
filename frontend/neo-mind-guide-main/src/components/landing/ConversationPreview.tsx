import { Bot, User } from "lucide-react";

const conversation = [
  {
    role: "user",
    message: "Potřebuji pomoct s marketingem pro můj e-shop s ručně vyráběnými svíčkami.",
  },
  {
    role: "bot",
    message: "Skvěle! Ručně vyráběné svíčky jsou krásný produkt. Řekni mi víc – kdo jsou tví ideální zákazníci? Jsou to spíše lidé, kteří hledají dárky, nebo ti, co si chtějí zpříjemnit domov?",
  },
  {
    role: "user",
    message: "Asi obojí, ale hlavně ženy mezi 25-45, které mají rády hezké věci do bytu.",
  },
  {
    role: "bot",
    message: "Perfektní! Pro tuto cílovku navrhuji zaměřit se na Instagram a Pinterest. Začněme strategií – mám pro tebe 3 pilíře obsahu:\n\n1. **Za oponou** – ukazuj tvorbu svíček\n2. **Lifestyle** – svíčky v krásných interiérech\n3. **Edukace** – tipy na péči, vůně do bytu\n\nChceš, abych ti připravil konkrétní nápady na první týden?",
  },
];

export const ConversationPreview = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container px-4 relative">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            Ukázka
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Konverzace, která vede k výsledkům
          </h2>
          <p className="text-xl text-muted-foreground">
            NeoBot se neptá na komplikované formuláře. Prostě si povídáte a on vás vede.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="glass rounded-2xl border-glow overflow-hidden">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display font-semibold">NeoBot</div>
                <div className="text-sm text-muted-foreground">Váš AI marketingový asistent</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Online</span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user" ? "bg-muted" : "bg-gradient-to-br from-primary to-accent"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : "bg-muted rounded-tl-md"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input preview */}
            <div className="px-6 py-4 border-t border-border/50">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
                <span className="text-muted-foreground text-sm">Napište zprávu...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
