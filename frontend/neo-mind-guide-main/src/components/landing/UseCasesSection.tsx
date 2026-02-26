import { Instagram, Globe, Mail, Megaphone } from "lucide-react";

const useCases = [
  {
    icon: Instagram,
    title: "Sociální sítě",
    description: "Generujte nápady na příspěvky, carousely, reels a stories. Plánujte obsah na týdny dopředu.",
    features: ["Instagram", "LinkedIn", "Facebook", "TikTok"],
  },
  {
    icon: Globe,
    title: "Web & SEO",
    description: "Tvořte texty na web, blogové články a optimalizujte obsah pro vyhledávače.",
    features: ["Landing pages", "Blog články", "SEO texty", "Popisy produktů"],
  },
  {
    icon: Mail,
    title: "E-mail marketing",
    description: "Pište e-maily, které otevřou. Vytvořte welcome sekvence, newslettery i prodejní kampaně.",
    features: ["Newslettery", "Automatizace", "A/B testy", "Personalizace"],
  },
  {
    icon: Megaphone,
    title: "Reklama & PPC",
    description: "Připravte podklady pro reklamy na Facebooku, Google i dalších platformách.",
    features: ["Facebook Ads", "Google Ads", "Copy pro reklamy", "Cílení"],
  },
];

export const UseCasesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            Použití
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Marketing na všech frontách
          </h2>
          <p className="text-xl text-muted-foreground">
            NeoBot vám pomůže s každým kanálem. Od sociálních sítí po e-maily.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-8 transition-all duration-300 hover:border-primary/30 group"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <useCase.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {useCase.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {useCase.features.map((feature, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
