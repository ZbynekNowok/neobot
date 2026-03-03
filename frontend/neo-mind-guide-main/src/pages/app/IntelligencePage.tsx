import { Brain, Users, FileSearch, LineChart, Wand2, Sparkles, TrendingUp } from "lucide-react";
import { FeatureTile } from "@/components/ui/FeatureTile";

const intelligenceTiles = [
  { title: "Oborové šablony", description: "Předpřipravené šablony pro konkrétní odvětví.", icon: <FileSearch className="w-4 h-4" /> },
  { title: "Persony", description: "Návrh marketingových person podle cílového publika.", icon: <Users className="w-4 h-4" /> },
  { title: "Konverzní optimalizace", description: "Nápady, jak zvýšit konverzní poměr.", icon: <LineChart className="w-4 h-4" /> },
  { title: "Analýza výkonu", description: "Souhrn výkonu kampaní a obsahu.", icon: <Brain className="w-4 h-4" /> },
  { title: "Optimalizace kampaní", description: "Doporučení pro úpravy běžících kampaní.", icon: <Wand2 className="w-4 h-4" /> },
  { title: "Další inteligentní nástroje", description: "Experimentální funkce založené na datech.", icon: <Sparkles className="w-4 h-4" /> },
  { title: "CTR optimalizátor", description: "Navrhne úpravy textu a kreativy pro vyšší CTR.", icon: <TrendingUp className="w-4 h-4" /> },
] as const;

export default function IntelligencePage() {
  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Inteligence</h1>
          <p className="text-muted-foreground text-sm">
            Přehled připravovaných nástrojů pro analýzu a optimalizaci.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {intelligenceTiles.map((item) => (
          <FeatureTile
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
            disabled
            badgeText="Připravujeme"
            badgeTone="danger"
          />
        ))}
      </div>
    </div>
  );
}

