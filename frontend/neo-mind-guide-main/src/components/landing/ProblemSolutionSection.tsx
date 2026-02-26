import { AlertTriangle, CheckCircle } from "lucide-react";

export const ProblemSolutionSection = () => {
  return (
    <section className="py-28 md:py-36 relative">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5">
              Proč <span className="text-gradient">NeoBot</span>?
            </h2>
            <p className="text-muted-foreground text-lg">
              Porovnejte si, jak se liší marketing s AI asistentem a bez něj.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {/* Problem */}
            <div className="rounded-2xl p-8 lg:p-10 py-10 lg:py-12 relative overflow-hidden bg-gradient-to-b from-[hsl(0,15%,14%)] to-[hsl(0,12%,10%)] border border-destructive/20 shadow-[0_8px_32px_-8px_hsl(0,50%,30%,0.15),0_16px_48px_-16px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-destructive/70 via-destructive/40 to-transparent" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-xl bg-destructive/20 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(0,50%,50%,0.3)]">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-display text-xl font-semibold">Bez NeoBota</h3>
              </div>
              <ul className="space-y-5">
                {[
                  "Hodiny strávené přemýšlením nad obsahem",
                  "Nekonzistentní marketing bez strategie",
                  "Pocit, že nevíte, kde začít",
                  "Přeskakování mezi nástroji a tipy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground text-base">
                    <span className="text-destructive/70 mt-0.5 font-bold">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div className="rounded-2xl p-8 lg:p-10 py-10 lg:py-12 relative overflow-hidden bg-gradient-to-b from-[hsl(195,22%,14%)] to-[hsl(195,18%,10%)] border border-primary/25 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.2),0_16px_48px_-16px_rgba(0,0,0,0.5),0_0_40px_-12px_hsl(var(--primary)/0.15)]">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-transparent" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold">S NeoBotem</h3>
              </div>
              <ul className="space-y-5">
                {[
                  "Nápady na obsah během minuty",
                  "Jasná strategie přizpůsobená vám",
                  "Krok za krokem průvodce marketingem",
                  "Všechno na jednom místě",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-base">
                    <span className="text-primary mt-0.5 font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
