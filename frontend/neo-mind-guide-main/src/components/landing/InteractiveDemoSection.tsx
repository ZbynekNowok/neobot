import { useState, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import neobotIcon from "@/assets/neobot-icon.png";

const demoMessages = [
  {
    role: "bot" as const,
    text: "Ahoj! 👋 Jsem NeoBot, tvůj AI marketingový asistent. Co pro tebe můžu udělat?",
  },
  {
    role: "user" as const,
    text: "Mám kavárnu a nevím, co postovat na Instagram.",
  },
  {
    role: "bot" as const,
    text: "Super! Pro kavárnu mám hned nápady na tento týden:",
    list: [
      "📸 Pondělí: Zákulisí přípravy kávy",
      "☕ Úterý: Tip – jak poznat kvalitní zrno",
      "🥐 Středa: Váš nejoblíbenější dezert",
    ],
  },
];

export const InteractiveDemoSection = () => {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages < demoMessages.length) {
      const isBot = demoMessages[visibleMessages]?.role === "bot";
      
      if (isBot && visibleMessages > 0) {
        setIsTyping(true);
        const typingTimer = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => prev + 1);
        }, 1200);
        return () => clearTimeout(typingTimer);
      } else {
        const timer = setTimeout(() => {
          setVisibleMessages((prev) => prev + 1);
        }, visibleMessages === 0 ? 500 : 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [visibleMessages]);

  const restartDemo = () => {
    setVisibleMessages(0);
  };

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Živá ukázka</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
            Obsah za <span className="text-gradient">60 sekund</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Řekněte NeoBotu o svém podnikání a během minuty máte plán obsahu na celý týden.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Chat window */}
          <div className="glass rounded-2xl border-glow overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden">
                <img src={neobotIcon} alt="NeoBot" className="w-full h-full object-cover" />
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

            {/* Messages */}
            <div className="p-5 space-y-3">
              {demoMessages.slice(0, visibleMessages).map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 animate-fade-in ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      msg.role === "user" ? "bg-muted" : ""
                    }`}
                  >
                    {msg.role === "user" ? (
                      <span className="text-xs">👤</span>
                    ) : (
                      <img src={neobotIcon} alt="NeoBot" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : "bg-muted rounded-tl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.list && (
                      <ul className="mt-3 space-y-2">
                        {msg.list.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm bg-background/50 rounded-lg px-3 py-2"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={neobotIcon} alt="NeoBot" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-muted rounded-tl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* CTA */}
          <div className="text-center mt-6 space-y-3">
            {visibleMessages >= demoMessages.length && (
              <div className="animate-fade-in space-y-4">
                <p className="text-muted-foreground">
                  Tohle je jen ukázka. V plné verzi NeoBot vytvoří <strong className="text-foreground">kompletní strategii</strong> pro vaše podnikání.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/start">
                      Vyzkoušet zdarma
                    </Link>
                  </Button>
                  <Button variant="ghost" size="lg" onClick={restartDemo}>
                    Přehrát znovu
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
