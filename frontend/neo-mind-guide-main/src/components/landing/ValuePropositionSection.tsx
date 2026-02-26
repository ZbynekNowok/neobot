import { Zap, Target, TrendingUp, MessageSquare } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Rychlý obsah",
    description: "Vytvořte příspěvky, e-maily a reklamy během sekund, ne hodin.",
  },
  {
    icon: Target,
    title: "Jasná strategie",
    description: "NeoBot vám pomůže definovat cíle a sestavit konkrétní plán.",
  },
  {
    icon: MessageSquare,
    title: "Konzistentní hlas",
    description: "Zachovejte jednotný styl komunikace napříč všemi kanály.",
  },
  {
    icon: TrendingUp,
    title: "Měřitelné výsledky",
    description: "Sledujte, co funguje, a optimalizujte svůj marketing.",
  },
];

export const ValuePropositionSection = () => {
  return (
    <section className="py-20 relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      
      <div className="container px-4 relative">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5">
            Jak vám <span className="text-gradient">NeoBot</span> pomůže v praxi
          </h2>
          <p className="text-lg text-muted-foreground">
            Konec chaosu v marketingu. S NeoBotem máte jasný plán a nástroje k jeho realizaci.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group rounded-2xl p-7 md:p-9 transition-all duration-300 bg-gradient-to-b from-[hsl(195,22%,14%)] to-[hsl(195,18%,11%)] border border-white/[0.08] shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.1),0_16px_48px_-16px_rgba(0,0,0,0.4)] backdrop-blur-sm hover:from-[hsl(195,22%,16%)] hover:to-[hsl(195,18%,13%)] hover:border-white/[0.12] hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.15),0_20px_56px_-16px_rgba(0,0,0,0.5)]"
            >
              {/* Header row - icon + title */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-[3.75rem] h-[3.75rem] md:w-[4.25rem] md:h-[4.25rem] rounded-xl bg-gradient-to-br from-primary/20 via-cyan-500/15 to-primary/10 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.35)] group-hover:from-primary/30 group-hover:via-cyan-500/20 group-hover:to-primary/15 group-hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.45)] transition-all duration-300 shrink-0">
                  <benefit.icon className="w-8 h-8 md:w-9 md:h-9 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {benefit.title}
                </h3>
              </div>
              
              <p className="text-base md:text-lg text-muted-foreground/90 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
