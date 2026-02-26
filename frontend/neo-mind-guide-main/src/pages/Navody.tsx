import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const tutorials = [
  {
    title: "Jak začít s NeoBotem",
    description: "Kompletní průvodce prvními kroky – od registrace až po první marketingový obsah.",
    readTime: "5 min",
    category: "Začátečníci",
  },
  {
    title: "Tvorba Instagram obsahu",
    description: "Naučte se vytvářet poutavé příspěvky, stories a reels s pomocí AI asistenta.",
    readTime: "8 min",
    category: "Sociální sítě",
  },
  {
    title: "E-mailové kampaně krok za krokem",
    description: "Jak napsat efektivní e-mail, který zaujme a přivede zákazníky.",
    readTime: "6 min",
    category: "E-mail marketing",
  },
  {
    title: "Optimalizace reklamních textů",
    description: "Tipy pro tvorbu PPC reklam, které konvertují lépe než konkurence.",
    readTime: "7 min",
    category: "Reklama",
  },
];

const Navody = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero sekce */}
        <section className="pt-32 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container px-4 relative">
            <div className="text-center max-w-4xl mx-auto">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
                Naučte se více
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <span className="text-gradient">Návody a tipy</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                Praktické návody, které vám pomohou vytěžit z NeoBota maximum. Od základů až po pokročilé techniky.
              </p>
            </div>
          </div>
        </section>

        {/* Seznam návodů */}
        <section className="py-16">
          <div className="container px-4">
            <div className="grid gap-6 md:grid-cols-2">
              {tutorials.map((tutorial, index) => (
                <article
                  key={index}
                  className="glass rounded-2xl p-6 hover:bg-card/80 transition-all duration-300 group cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {tutorial.category}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      {tutorial.readTime}
                    </div>
                  </div>
                  
                  <h2 className="font-display text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {tutorial.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-4">
                    {tutorial.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <span>Číst návod</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              ))}
            </div>

            {/* Placeholder pro další návody */}
            <div className="mt-12 text-center">
              <div className="glass rounded-2xl p-8 max-w-xl mx-auto">
                <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">Další návody již brzy</h3>
                <p className="text-muted-foreground">
                  Pracujeme na dalších návodech a tipech. Sledujte novinky.
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

export default Navody;
