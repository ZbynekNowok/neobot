import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const FinalCTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
      </div>
      
      <div className="container px-4 relative">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-12 md:p-16 text-center border-glow">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Začněte ještě dnes</span>
            </div>
            
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
              Připraveni na
              <span className="text-gradient"> chytřejší marketing?</span>
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Vyzkoušejte NeoBota 3 dny zdarma a zjistěte, jak vám AI může pomoci s marketingem.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/start">
                  Vyzkoušet NeoBot zdarma
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            
            <p className="mt-8 text-sm text-muted-foreground">
              Připojte se k 500+ podnikatelům, kteří už používají NeoBota
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
