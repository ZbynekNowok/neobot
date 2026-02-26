import { Briefcase, User, Users, Palette } from "lucide-react";

const audiences = [
  {
    icon: User,
    title: "Solopodnikatelé",
    description: "Freelanceři, koučové, konzultanti, kteří potřebují marketing, ale nemají na to tým.",
  },
  {
    icon: Briefcase,
    title: "Malé firmy",
    description: "E-shopy, lokální biznisy a startupy s omezeným rozpočtem na marketing.",
  },
  {
    icon: Palette,
    title: "Tvůrci obsahu",
    description: "Blogeři, youtubeři, influenceři, kteří chtějí efektivnější tvorbu.",
  },
  {
    icon: Users,
    title: "Marketingové týmy",
    description: "Malé týmy, které potřebují AI asistenta pro rychlejší brainstorming a execution.",
  },
];

export const TargetAudienceSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 gradient-bg opacity-50" />
      
      <div className="container px-4 relative">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-wider uppercase mb-4 block">
            Pro koho
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            NeoBot je tu pro vás
          </h2>
          <p className="text-xl text-muted-foreground">
            Ať už jste na začátku nebo chcete posunout svůj marketing na další level.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {audiences.map((audience, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:border-primary/30 hover:scale-105 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                  <audience.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">
                  {audience.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
