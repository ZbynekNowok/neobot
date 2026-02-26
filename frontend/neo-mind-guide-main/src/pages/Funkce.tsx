import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Target, 
  Lightbulb, 
  CalendarDays, 
  Palette,
  Layers,
  ArrowRight,
  Sparkles
} from "lucide-react";

const capabilities = [
  {
    icon: Brain,
    title: "Pamatuje si vaše podnikání",
    description: "NeoBot pracuje s kontextem vašeho podnikání – zná vaši cílovou skupinu, produkty, styl komunikace i cíle.",
    note: "Nemusíte vše vysvětlovat znovu. Čím déle ho používáte, tím lepší výstupy dostáváte."
  },
  {
    icon: Target,
    title: "Řeší cíle, ne prompty",
    description: "Místo složitých zadání NeoBotu jednoduše řeknete, čeho chcete dosáhnout.",
    note: "Například růst, objednávky nebo uvedení nového produktu. NeoBot sám zvolí správný postup i formát."
  },
  {
    icon: Lightbulb,
    title: "Myslí strategicky, tvoří systematicky",
    description: "NeoBot nejdřív přemýšlí, až potom tvoří.",
    note: "Navrhuje strategii, strukturu a souvislosti, aby obsah dával smysl dlouhodobě."
  },
  {
    icon: CalendarDays,
    title: "Automatické obsahové plány",
    description: "NeoBot připravuje přehledné obsahové plány na dny i týdny dopředu.",
    note: "Vždy víte, co publikovat, kdy a proč."
  },
  {
    icon: Palette,
    title: "Konzistentní značka napříč kanály",
    description: "NeoBot hlídá tón komunikace a styl značky napříč všemi výstupy.",
    note: "Každý text působí jednotně a profesionálně."
  },
  {
    icon: Layers,
    title: "Násobí hodnotu obsahu",
    description: "Z jednoho nápadu NeoBot vytváří více výstupů.",
    note: "Méně práce, více využitelného obsahu."
  }
];

const useCases = [
  "Chci napsat obsah na sociální sítě",
  "Chci připravit obsahový plán",
  "Chci vymyslet reklamní text",
  "Chci sjednotit komunikaci značky"
];

const Funkce = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero sekce */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container px-4 relative">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-8 animate-fade-in">
                Co všechno <span className="text-gradient">NeoBot</span> dokáže
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
                NeoBot není sada nástrojů. Je to inteligentní marketingový partner, který chápe vaše podnikání a pomáhá vám růst systematicky.
              </p>
            </div>
          </div>
        </section>

        {/* Hlavní schopnosti - 6 boxů v 2x3 mřížce */}
        <section className="py-20 relative">
          <div className="container px-4">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {capabilities.map((capability, index) => (
                <Card 
                  key={capability.title}
                  className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <capability.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-display text-xl font-semibold pt-2">{capability.title}</h3>
                    </div>
                    <p className="text-foreground/90 mb-4 leading-relaxed">
                      {capability.description}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {capability.note}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Jak NeoBot funguje - 4 kroky */}
        <section className="py-20 relative">
          <div className="container px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                <span className="text-gradient">NeoBot</span> funguje jako systém, ne jako chatbot
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                NeoBot nejdřív chápe kontext vašeho podnikání, pak navrhuje strategii a teprve potom tvoří obsah. Vše dává smysl jako jeden celek.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8 md:gap-6">
                {/* Krok 1 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold mb-4">
                      1
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-3">
                      Pochopí vaše podnikání
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      NeoBot pracuje s kontextem vašeho podnikání – cíli, cílovou skupinou, produkty a stylem komunikace. Čím déle ho používáte, tím přesněji reaguje a navrhuje další kroky, které dávají smysl právě pro vás.
                    </p>
                  </div>
                  {/* Connector line - hidden on mobile */}
                  <div className="hidden md:block absolute top-5 left-[calc(100%-12px)] w-[calc(100%-32px)] h-px bg-border/50" />
                </div>

                {/* Krok 2 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold mb-4">
                      2
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-3">
                      Navrhne jasnou strategii
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Než začne cokoliv tvořit, NeoBot nejdřív přemýšlí. Navrhuje strukturu, témata a souvislosti tak, aby obsah nebyl nahodilý, ale dlouhodobě podporoval vaše cíle.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-5 left-[calc(100%-12px)] w-[calc(100%-32px)] h-px bg-border/50" />
                </div>

                {/* Krok 3 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold mb-4">
                      3
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-3">
                      Tvoří a plánuje obsah
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Na základě strategie připravuje konkrétní výstupy a přehledné obsahové plány na dny i týdny dopředu. Vždy víte, co publikovat, kdy a proč – bez chaosu a improvizace.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-5 left-[calc(100%-12px)] w-[calc(100%-32px)] h-px bg-border/50" />
                </div>

                {/* Krok 4 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold mb-4">
                      4
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-3">
                      Zlepšuje se podle výsledků
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      NeoBot pracuje se zpětnou vazbou a výsledky. Pomáhá ladit obsah tak, aby nepřinášel jen pocit aktivity, ale skutečný dopad na vaše podnikání.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Jak NeoBot používáte */}
        <section className="py-20 relative bg-muted/20">
          <div className="container px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Jak <span className="text-gradient">NeoBot</span> používáte
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Po přihlášení pracujete v přehledném dashboardu. Vyberete si, co chcete vytvořit – NeoBot se postará o zbytek.
              </p>
            </div>

            {/* Dashboard preview */}
            <div className="max-w-3xl mx-auto">
              <Card className="bg-card/80 border-border/50 overflow-hidden">
                <div className="bg-muted/30 border-b border-border/30 px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">Firemní profil</span>
                </div>
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      Co chcete dnes vytvořit?
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {useCases.map((useCase) => (
                      <div 
                        key={useCase}
                        className="p-5 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 hover:bg-muted/50 transition-all duration-300 cursor-pointer group"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {useCase}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/30">
                    NeoBot vždy navrhne další logický krok.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA sekce */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
          <div className="container px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
                Marketing bez <span className="text-gradient">chaosu</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                NeoBot spojuje strategii, obsah i plánování do jednoho chytrého systému.
              </p>
              <div className="flex flex-col items-center gap-4">
                <Button asChild size="lg" className="text-lg px-8 py-6 glow-primary">
                  <Link to="/start">
                    Vyzkoušet NeoBot zdarma
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  3denní zkušební období • Zadání karty • Předplatné se aktivuje automaticky
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Funkce;
