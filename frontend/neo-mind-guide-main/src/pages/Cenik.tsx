import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const plans = [
  {
    name: "Basic",
    price: "390 Kč",
    period: "měsíčně",
    description: "Pro jednotlivce, kteří chtějí NeoBot vyzkoušet",
    features: [
      "Počet slov 30 000",
      "Až 100 normostran textu",
      "Až 440 AI obrázků",
      "Až 25 AI videí",
      "Až 120 příspěvků pro sociální sítě",
      "Až 30 článků na blog",
      "Až 440 produktových popisků",
      "Až 100 newsletterů",
    ],
    cta: "Vyzkoušet na 3 dny zdarma",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "890 Kč",
    period: "měsíčně",
    description: "Pro podnikatele a tvůrce obsahu",
    features: [
      "100 000 slov",
      "Až 400 normostran textu",
      "Až 2400 AI obrázků",
      "Až 130 AI videí",
      "Až 580 příspěvků pro sociální sítě",
      "Až 140 článků na blog",
      "Až 2400 produktových popisků",
      "Až 450 newsletterů",
    ],
    cta: "Vyzkoušet na 3 dny zdarma",
    highlighted: true,
  },
  {
    name: "Business",
    price: "1 499 Kč",
    period: "měsíčně",
    description: "Pro týmy a agentury",
    features: [
      "200 000 slov",
      "Až 800 normostran textu",
      "Až 4800 AI obrázků",
      "Až 260 AI videí",
      "Až 1100 příspěvků pro sociální sítě",
      "Až 300 článků na blog",
      "Až 4800 produktových popisků",
      "Až 900 newsletterů",
    ],
    cta: "Vyzkoušet na 3 dny zdarma",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { name: "AI konverzace", free: "5/měsíc", pro: "Neomezené", business: "Neomezené" },
  { name: "Šablony", free: "Základní", pro: "Všechny", business: "Všechny + vlastní" },
  { name: "Platformy", free: "2", pro: "Všechny", business: "Všechny" },
  { name: "Export obsahu", free: false, pro: true, business: true },
  { name: "Vlastní brand voice", free: false, pro: true, business: true },
  { name: "Týmová spolupráce", free: false, pro: false, business: true },
  { name: "API přístup", free: false, pro: false, business: true },
  { name: "Prioritní podpora", free: false, pro: true, business: true },];

const faqs = [
  {
    question: "Je k dispozici zkušební verze?",
    answer: "Ano, nabízíme 3denní zkušební verzi zdarma. Po uplynutí zkušební doby se vám začne automaticky účtovat vybraný plán.",
  },
  {
    question: "Je potřeba platební karta?",
    answer: "Ano, pro aktivaci zkušební verze je potřeba zadat platební kartu. Po 3 dnech se vám automaticky začne účtovat vybraný plán.",
  },
  {
    question: "Můžu plán kdykoliv zrušit?",
    answer: "Samozřejmě. Předplatné můžete zrušit kdykoliv přímo v nastavení účtu. Po zrušení budete mít přístup do konce zaplaceného období.",
  },
  {
    question: "Pro koho je NeoBot vhodný?",
    answer: "NeoBot je ideální pro podnikatele, freelancery, tvůrce obsahu, malé firmy a marketingové týmy, kteří chtějí efektivněji vytvářet marketingový obsah.",
  },
  {
    question: "Můžu přejít na vyšší plán později?",
    answer: "Ano, upgrade na vyšší plán je možný kdykoliv. Rozdíl v ceně se automaticky přepočítá podle zbývajícího období.",
  },
  {
    question: "Nabízíte slevy pro neziskové organizace?",
    answer: "Ano, nabízíme speciální podmínky pro neziskové organizace a vzdělávací instituce. Kontaktujte nás pro více informací.",
  },
];

const Cenik = () => {
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
                Transparentní ceny
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <span className="text-gradient">Ceník NeoBot</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                AI marketingový asistent, který vám pomůže tvořit lepší obsah. Vyberte si plán podle vašich potřeb.
              </p>
            </div>
          </div>
        </section>

        {/* Cenové plány */}
        <section className="py-8 pb-16">
          <div className="container px-4">
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className={cn(
                    "rounded-2xl p-6 md:p-8 transition-all duration-300 animate-fade-in relative",
                    plan.highlighted
                      ? "bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary scale-105 md:scale-110"
                      : "glass"
                  )}
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        Doporučeno
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="font-display text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={cn(
                      "w-full py-3 rounded-lg font-medium transition-colors",
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-card border border-border hover:bg-muted"
                    )}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Porovnání plánů */}
        <section className="py-16">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Porovnání plánů</h2>
              <p className="text-muted-foreground">Detailní přehled funkcí v každém plánu</p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-display font-bold">Funkce</th>
                    <th className="text-center py-4 px-4 font-display font-bold">Basic</th>
                    <th className="text-center py-4 px-4 font-display font-bold text-primary">Standard</th>
                    <th className="text-center py-4 px-4 font-display font-bold">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-4 px-4 text-sm">{feature.name}</td>
                      <td className="py-4 px-4 text-center">
                        {typeof feature.free === "boolean" ? (
                          feature.free ? (
                            <Check className="w-5 h-5 text-primary mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">{feature.free}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center bg-primary/5">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <Check className="w-5 h-5 text-primary mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium">{feature.pro}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof feature.business === "boolean" ? (
                          feature.business ? (
                            <Check className="w-5 h-5 text-primary mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">{feature.business}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ sekce */}
        <section className="py-16">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Často kladené dotazy</h2>
              <p className="text-muted-foreground">Odpovědi na nejčastější otázky o cenách a plánech</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="glass rounded-xl px-6 border-none"
                  >
                    <AccordionTrigger className="text-left font-display font-medium hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA */}
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Cenik;
