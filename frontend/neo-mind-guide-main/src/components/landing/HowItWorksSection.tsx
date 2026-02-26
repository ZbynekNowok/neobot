import { MessageSquare, Lightbulb, Rocket } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    number: "01",
    title: "Řekněte NeoBoovi o svém podnikání",
    description: "Popište svůj produkt, cílovou skupinu a cíle. NeoBot pochopí váš kontext a přizpůsobí se.",
  },
  {
    icon: Lightbulb,
    number: "02",
    title: "Společně vytvoříte strategii",
    description: "NeoBot vás provede otázkami a pomůže vám definovat jasný marketingový plán s konkrétními kroky.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Tvořte obsah a realizujte",
    description: "Generujte texty, nápady na příspěvky, e-maily a reklamy. NeoBot vás vede až k výsledkům.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 gradient-bg" />
      
      <div className="container px-4 relative">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            Jak to funguje
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Tři kroky k lepšímu marketingu
          </h2>
          <p className="text-xl text-muted-foreground">
            NeoBot není jen nástroj. Je to váš AI partner, který vás provede celým procesem.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-primary/50 to-transparent z-0" />
                )}
                
                <div className="glass rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/30 hover:scale-105">
                  {/* Number badge */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-display font-bold text-primary">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h3 className="font-display text-xl font-bold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
