import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Lightbulb, Target, Handshake, Mail, MessageCircle } from "lucide-react";

const ONas = () => {
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
                Náš příběh
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <span className="text-gradient">O nás</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                Věříme, že kvalitní marketing by měl být dostupný pro každého. Proto jsme vytvořili NeoBota.
              </p>
            </div>
          </div>
        </section>

        {/* Proč NeoBot vznikl */}
        <section className="py-16">
          <div className="container px-4 max-w-4xl">
            <div className="glass rounded-2xl p-8 md:p-12 animate-fade-in">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">Proč NeoBot vznikl</h2>
              </div>
              <div className="space-y-4 text-muted-foreground text-lg">
                <p>
                  Marketing je dnes složitější než kdy dříve. Sociální sítě, e-maily, reklamy, webový obsah – každý kanál vyžaduje jiný přístup, jiný tón a neustálou pozornost.
                </p>
                <p>
                  Pro malé firmy a jednotlivce je téměř nemožné udržet krok s většími hráči, kteří mají celé marketingové týmy. NeoBot vznikl, aby tuto nerovnováhu vyrovnal.
                </p>
                <p>
                  Chtěli jsme vytvořit nástroj, který bude fungovat jako zkušený marketingový kolega – někdo, kdo vám pomůže přemýšlet, plánovat a tvořit, aniž byste museli být expertem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Naše vize */}
        <section className="py-16">
          <div className="container px-4 max-w-4xl">
            <div className="glass rounded-2xl p-8 md:p-12 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">Naše vize</h2>
              </div>
              <div className="space-y-4 text-muted-foreground text-lg">
                <p>
                  Chceme žít ve světě, kde velikost firmy neurčuje kvalitu jejího marketingu. Kde má každý podnikatel přístup k nástrojům a znalostem, které dříve byly dostupné jen velkým korporacím.
                </p>
                <p>
                  NeoBot není jen další AI nástroj. Je to začátek nové éry, kde technologie skutečně pomáhá lidem růst a uspět v podnikání.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI jako partner */}
        <section className="py-16">
          <div className="container px-4 max-w-4xl">
            <div className="glass rounded-2xl p-8 md:p-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Handshake className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">AI jako partner, ne náhrada</h2>
              </div>
              <div className="space-y-4 text-muted-foreground text-lg">
                <p>
                  Nevěříme v AI, která nahrazuje lidskou kreativitu. Věříme v AI, která ji posiluje.
                </p>
                <p>
                  NeoBot vás nepřevezme – provází vás. Klade otázky, nabízí perspektivy a pomáhá vám dojít k rozhodnutím, která jsou opravdu vaše. Výsledný obsah nese váš rukopis, NeoBot jen pomáhá najít tu správnou cestu.
                </p>
                <p>
                  Protože nejlepší marketing vzniká, když se spojí lidská intuice s technologickou silou.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Kontakt */}
        <section className="py-16 pb-24">
          <div className="container px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Spojte se s námi</h2>
              <p className="text-muted-foreground">Máte otázky nebo návrhy? Rádi se s vámi spojíme.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">E-mail</h3>
                <a href="mailto:info@neobot.cz" className="text-primary hover:underline">
                  info@neobot.cz
                </a>
              </div>
              
              <div className="glass rounded-2xl p-6 text-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Podpora</h3>
                <a href="mailto:podpora@neobot.cz" className="text-primary hover:underline">
                  podpora@neobot.cz
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ONas;
