import { Megaphone, Target, Rocket, SplitSquareHorizontal, Layers3, Shuffle, Banknote } from "lucide-react";
import { FeatureTile } from "@/components/ui/FeatureTile";

const campaigns = [
  { title: "Vytvořit kampaň", description: "Rychlý start nové kampaně napříč kanály.", icon: <Rocket className="w-4 h-4" /> },
  { title: "Funnel kampaně", description: "Návrh funnelu od prvního dotyku po konverzi.", icon: <SplitSquareHorizontal className="w-4 h-4" /> },
  { title: "Kreativní úhly", description: "Různé pohledy na produkt a komunikaci.", icon: <Megaphone className="w-4 h-4" /> },
  { title: "Varianty A/B testů", description: "Návrhy variant pro A/B testování.", icon: <Shuffle className="w-4 h-4" /> },
  { title: "Strategie kampaně", description: "Struktura, messaging a cílení kampaně.", icon: <Target className="w-4 h-4" /> },
  { title: "Segmenty publika", description: "Návrh segmentů podle chování a zájmů.", icon: <Layers3 className="w-4 h-4" /> },
  { title: "Rozpočtový návrh", description: "Navrhne rozdělení rozpočtu a testovací plán kampaně.", icon: <Banknote className="w-4 h-4" /> },
] as const;

export default function CampaignsPage() {
  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Kampaně</h1>
          <p className="text-muted-foreground text-sm">
            Přehled budoucích nástrojů pro plánování a řízení kampaní.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((item) => (
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

