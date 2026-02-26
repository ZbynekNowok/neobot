import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Clock, ArrowRight, Sparkles, BookOpen, TrendingUp, Cpu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "vse", label: "Vše", icon: null },
  { id: "funkce", label: "Nové funkce", icon: Sparkles },
  { id: "navody", label: "Návody", icon: BookOpen },
  { id: "marketing", label: "Marketing", icon: TrendingUp },
  { id: "ai-tipy", label: "AI tipy", icon: Cpu },
];

const articles = [
  {
    id: 1,
    title: "Představujeme nové šablony pro e-commerce",
    excerpt: "Zjistěte, jak nové šablony pomohou vašemu e-shopu vytvářet efektivnější marketingové kampaně.",
    category: "funkce",
    categoryLabel: "Nové funkce",
    date: "15. prosince 2024",
    readTime: "4 min",
    image: null,
  },
  {
    id: 2,
    title: "5 způsobů, jak využít AI pro Instagram marketing",
    excerpt: "Praktické tipy, jak s pomocí NeoBota vytvořit obsah, který zaujme vaše sledující.",
    category: "ai-tipy",
    categoryLabel: "AI tipy",
    date: "12. prosince 2024",
    readTime: "6 min",
    image: null,
  },
  {
    id: 3,
    title: "Jak napsat e-mail, který otevřou",
    excerpt: "Kompletní průvodce tvorbou e-mailových kampaní s vysokou mírou otevření.",
    category: "marketing",
    categoryLabel: "Marketing",
    date: "10. prosince 2024",
    readTime: "8 min",
    image: null,
  },
  {
    id: 4,
    title: "Začínáme s NeoBotem: První kroky",
    excerpt: "Vše, co potřebujete vědět pro úspěšný start s vaším AI marketingovým asistentem.",
    category: "navody",
    categoryLabel: "Návody",
    date: "8. prosince 2024",
    readTime: "5 min",
    image: null,
  },
  {
    id: 5,
    title: "Nový AI engine pro lepší výsledky",
    excerpt: "Přečtěte si o vylepšeních, které jsme přinesli v poslední aktualizaci.",
    category: "funkce",
    categoryLabel: "Nové funkce",
    date: "5. prosince 2024",
    readTime: "3 min",
    image: null,
  },
  {
    id: 6,
    title: "Jak AI mění pravidla copywritingu",
    excerpt: "Pohled na budoucnost tvorby marketingového obsahu v éře umělé inteligence.",
    category: "ai-tipy",
    categoryLabel: "AI tipy",
    date: "1. prosince 2024",
    readTime: "7 min",
    image: null,
  },
];

const Novinky = () => {
  const [activeCategory, setActiveCategory] = useState("vse");

  const filteredArticles = activeCategory === "vse" 
    ? articles 
    : articles.filter(article => article.category === activeCategory);

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
                Blog
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <span className="text-gradient">Novinky a články</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                Tipy, návody a novinky ze světa AI marketingu. Naučte se tvořit lepší obsah a sledujte vývoj NeoBota.
              </p>
            </div>
          </div>
        </section>

        {/* Filtry */}
        <section className="pb-8">
          <div className="container px-4">
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
                    activeCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {category.icon && <category.icon className="w-4 h-4" />}
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Seznam článků */}
        <section className="py-8 pb-16">
          <div className="container px-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article, index) => (
                <article
                  key={article.id}
                  className="glass rounded-2xl overflow-hidden hover:bg-card/80 transition-all duration-300 group cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  {/* Placeholder pro obrázek */}
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                      {article.category === "funkce" && <Sparkles className="w-8 h-8 text-primary" />}
                      {article.category === "navody" && <BookOpen className="w-8 h-8 text-primary" />}
                      {article.category === "marketing" && <TrendingUp className="w-8 h-8 text-primary" />}
                      {article.category === "ai-tipy" && <Cpu className="w-8 h-8 text-primary" />}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {article.categoryLabel}
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </div>
                    </div>
                    
                    <h2 className="font-display text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h2>
                    
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">{article.date}</span>
                      <div className="flex items-center gap-1 text-primary font-medium text-sm">
                        <span>Číst</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">V této kategorii zatím nejsou žádné články.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Novinky;
