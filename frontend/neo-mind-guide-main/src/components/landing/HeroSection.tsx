import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-x-hidden bg-background">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI-powered marketing assistant</span>
          </div>
          
          {/* Main headline */}
          <h1 className="animate-fade-up-delay font-display text-5xl md:text-7xl font-bold leading-tight mb-6 overflow-visible">
            Váš AI partner pro
            <span className="text-gradient block overflow-visible pb-[0.45em] -mb-[0.45em]">chytřejší marketing</span>
          </h1>
          
          {/* Subheadline */}
          <p className="animate-fade-up-delay-2 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed tracking-tight">
            NeoBot vám pomůže vymýšlet obsah, plánovat strategii a provede vás marketingem krok za krokem. Bez chaosu, s jasným plánem.
          </p>
          
          {/* CTAs */}
          <div className="animate-fade-up-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/start">
                Vyzkoušet zdarma
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/funkce">
                Jak to funguje?
              </Link>
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="animate-fade-up-delay-2 mt-12 flex items-center justify-center gap-8 text-muted-foreground text-sm">
            <span>✓ 3 dny zdarma</span>
            <span>✓ Zrušit kdykoliv</span>
            <span>✓ Česká podpora</span>
          </div>
        </div>
      </div>
    </section>
  );
};
