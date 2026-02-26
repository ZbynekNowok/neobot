import { useState } from "react";
import { 
  ArrowRight,
  Target,
  TrendingUp,
  LayoutGrid,
  ShoppingCart,
  Megaphone,
  BarChart3,
  ChevronDown,
  Loader2,
  Pencil,
  Check,
  Copy,
  ArrowLeft,
  FileText,
  Video,
  Image,
  Calendar,
  Save,
  Download,
  RefreshCw,
  Compass,
  Users,
  Layers,
  Route,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from "@/components/app/AppLayout";
import { toast } from "sonner";
import NeoBotSteps from "@/components/app/NeoBotSteps";

// Types
interface StrategyFunction {
  id: string;
  label: string;
  description: string;
}

interface FunctionCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  functions: StrategyFunction[];
}

interface StrategySection {
  id: string;
  title: string;
  content: string;
  isEditing?: boolean;
}

interface NeoBotTask {
  neobot: "text" | "video" | "image";
  task: string;
  priority: "high" | "medium" | "low";
}

interface StrategyData {
  name: string;
  goal: string;
  timeHorizon: string;
  channels: string[];
  sections: StrategySection[];
  neobotTasks: NeoBotTask[];
}

const functionCategories: FunctionCategory[] = [
  {
    id: "direction",
    title: "Marketingový směr",
    icon: Compass,
    functions: [
      { id: "marketing-90", label: "Marketingový směr na 90 dní", description: "Komplexní plán na následující čtvrtletí." },
      { id: "positioning", label: "Positioning značky", description: "Jak se odlišit od konkurence a zaujmout." },
      { id: "target-messaging", label: "Cílové skupiny & messaging", description: "Komu a jak komunikovat." },
      { id: "channel-priorities", label: "Priority kanálů", description: "Co dělat a co nedělat v jednotlivých kanálech." },
    ]
  },
  {
    id: "content",
    title: "Obsahová strategie",
    icon: LayoutGrid,
    functions: [
      { id: "content-quarter", label: "Obsahová strategie na měsíc / kvartál", description: "Plán obsahu na delší období." },
      { id: "content-pillars", label: "Obsahové pilíře", description: "Hlavní témata tvé komunikace." },
      { id: "funnel-content", label: "Typy obsahu podle funnelu", description: "Co tvořit pro awareness, consideration, conversion." },
      { id: "neobot-roles", label: "Doporučení, který NeoBot co tvoří", description: "Rozdělení práce mezi NeoBoty." },
    ]
  },
  {
    id: "sales",
    title: "Prodej & funnel",
    icon: ShoppingCart,
    functions: [
      { id: "funnel-design", label: "Návrh prodejního funnelu", description: "Cesta zákazníka od prvního kontaktu k nákupu." },
      { id: "landing-optimization", label: "Optimalizace landing pages", description: "Jak zlepšit konverze na stránkách." },
      { id: "upsell-logic", label: "Upsell / cross-sell logika", description: "Jak zvýšit hodnotu objednávky." },
      { id: "weak-points", label: "Slabá místa v cestě zákazníka", description: "Kde ztrácíš zákazníky a proč." },
    ]
  },
  {
    id: "campaigns",
    title: "Kampaně",
    icon: Megaphone,
    functions: [
      { id: "campaign-design", label: "Návrh kampaně", description: "Launch, promo nebo sezónní kampaň." },
      { id: "campaign-structure", label: "Struktura kampaně", description: "Kanály, formáty a timing." },
      { id: "campaign-message", label: "Hlavní message a CTA", description: "Co říct a k čemu vyzývat." },
      { id: "campaign-outputs", label: "Přehled výstupů pro NeoBoty", description: "Co připravit v Textovém, Video a Obrázkovém NeoBotovi." },
    ]
  },
  {
    id: "growth",
    title: "Růst & optimalizace",
    icon: BarChart3,
    functions: [
      { id: "whats-not-working", label: "Co aktuálně nefunguje a proč", description: "Audit problémových oblastí." },
      { id: "testing-recommendations", label: "Doporučení testů", description: "A/B testy, formáty, hooky." },
      { id: "optimization-checklist", label: "Optimalizační checklist", description: "Konkrétní kroky ke zlepšení." },
      { id: "next-growth-step", label: "Další krok růstu", description: "Na co se zaměřit právě teď." },
    ]
  }
];

// Quick settings options
const goalOptions = [
  { id: "prodej", label: "Prodej" },
  { id: "rust-znacky", label: "Růst značky" },
  { id: "engagement", label: "Engagement" },
  { id: "stabilita", label: "Stabilita / systém" },
];

const timeHorizonOptions = [
  { id: "30", label: "30 dní" },
  { id: "90", label: "90 dní" },
  { id: "180", label: "6 měsíců" },
];

const channelOptions = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "web-seo", label: "Web / SEO" },
  { id: "email", label: "E-mail" },
  { id: "kombinace", label: "Kombinace" },
];

const budgetOptions = [
  { id: "none", label: "Bez rozpočtu" },
  { id: "low", label: "Nízký" },
  { id: "medium", label: "Střední" },
  { id: "high", label: "Vyšší" },
];

// Example placeholders for different strategy types
const placeholderExamples: Record<string, string> = {
  "marketing-90": "Prodávám dámské šaty online. Cílovka ženy 30–50, komunikuji kvalitu a pohodlí. Chci za 90 dní zdvojnásobit prodeje bez slev. Aktuálně publikuji 2× týdně na Instagram.",
  "positioning": "Mám e-shop s přírodní kosmetikou. Konkurence je levnější, ale já sázím na kvalitu. Potřebuji se jasně odlišit a vysvětlit, proč jsem dražší.",
  "content-pillars": "Jsem fitness trenérka. Nevím, o čem mám psát, abych přitáhla nové klientky. Chci vytvořit 3–4 hlavní témata, kolem kterých budu komunikovat.",
  "campaign-design": "Připravuji jarní kampaň na novou kolekci šatů. Mám 3 týdny na přípravu. Budget na reklamu je 10 000 Kč.",
  "default": "Popiš svou situaci, cíl a co chceš změnit. Čím konkrétnější budeš, tím přesnější strategii dostaneš."
};

type Step = "select" | "input" | "proposal" | "output";

interface StrategyNeoBotWorkspaceProps {
  profile: UserProfile | null;
  onBack: () => void;
}

export default function StrategyNeoBotWorkspace({ profile, onBack }: StrategyNeoBotWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [selectedFunction, setSelectedFunction] = useState<StrategyFunction | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("direction");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick settings
  const [goal, setGoal] = useState("prodej");
  const [timeHorizon, setTimeHorizon] = useState("90");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["instagram"]);
  const [budget, setBudget] = useState("none");
  
  // Strategy data
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);

  const handleFunctionSelect = (func: StrategyFunction) => {
    setSelectedFunction(func);
    setCurrentStep("input");
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const getPlaceholder = () => {
    if (selectedFunction?.id && placeholderExamples[selectedFunction.id]) {
      return placeholderExamples[selectedFunction.id];
    }
    return placeholderExamples.default;
  };

  const generateMockStrategy = (): { sections: StrategySection[], tasks: NeoBotTask[] } => {
    const sections: StrategySection[] = [
      {
        id: "summary",
        title: "Shrnutí situace",
        content: "**Co funguje:**\n• Organický dosah na Instagramu roste\n• Zákazníci oceňují kvalitu produktů\n• E-mail marketing má nadprůměrnou open rate\n\n**Co brzdí:**\n• Nízká frekvence publikování\n• Chybí jasná obsahová strategie\n• Příliš mnoho kanálů najednou",
      },
      {
        id: "decisions",
        title: "Klíčová rozhodnutí",
        content: "**Na co se zaměřit:**\n• Konsolidace komunikace na 2 hlavní kanály (Instagram + E-mail)\n• Vytvoření 3 obsahových pilířů kolem produktu\n• Budování komunity přes autentický obsah\n\n**Co teď NEDĚLAT:**\n• Neroztahovat se na nové platformy\n• Neinvestovat do placené reklamy před optimalizací organiky\n• Nekopírovat konkurenci – držet vlastní hlas",
      },
      {
        id: "content-impact",
        title: "Dopady na obsah",
        content: "**Textový obsah:**\n• Příspěvky 3× týdně (2× edukace, 1× prodej)\n• Newsletter 1× týdně s tipem + produktem\n• Stories každý den pro engagement\n\n**Video obsah:**\n• 2 Reels týdně (behind the scenes, produkt v akci)\n• 1 edukační video měsíčně\n\n**Vizuální obsah:**\n• Produktové fotky v novém stylu\n• Carousel grafiky pro tipy\n• Stories šablony pro konzistenci",
      },
      {
        id: "priorities",
        title: "Priority (TOP 5)",
        content: "🥇 **Obsahový audit** – analyzuj nejúspěšnější příspěvky za 6 měsíců\n🥈 **Definice obsahových pilířů** – 3 hlavní témata komunikace\n🥉 **Obsahový kalendář** – naplánuj 2 týdny dopředu\n4️⃣ **Engagement strategie** – odpovídej do 1 hodiny\n5️⃣ **Měření výsledků** – týdenní reporting klíčových metrik",
      }
    ];

    const tasks: NeoBotTask[] = [
      { neobot: "text", task: "Vytvořit 6 příspěvků na Instagram (2 týdny dopředu)", priority: "high" },
      { neobot: "text", task: "Napsat newsletter šablonu s tipem + produktem", priority: "high" },
      { neobot: "video", task: "Připravit scénář pro 2 Reels (behind the scenes)", priority: "medium" },
      { neobot: "video", task: "Navrhnout edukační video o kvalitě materiálů", priority: "medium" },
      { neobot: "image", task: "Vytvořit produktové vizuály v novém stylu", priority: "high" },
      { neobot: "image", task: "Navrhnout carousel grafiku pro tipy", priority: "low" },
    ];

    return { sections, tasks };
  };

  const handleGenerateStrategy = async () => {
    if (!inputValue.trim()) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      const { sections, tasks } = generateMockStrategy();
      setStrategyData({
        name: selectedFunction?.label || "Marketingová strategie",
        goal: goalOptions.find(g => g.id === goal)?.label || "Prodej",
        timeHorizon: timeHorizonOptions.find(t => t.id === timeHorizon)?.label || "90 dní",
        channels: selectedChannels.map(c => channelOptions.find(ch => ch.id === c)?.label || c),
        sections,
        neobotTasks: tasks,
      });
      setCurrentStep("proposal");
      setIsGenerating(false);
    }, 1500);
  };

  const handleEditSection = (sectionId: string) => {
    if (!strategyData) return;
    setStrategyData({
      ...strategyData,
      sections: strategyData.sections.map(s => 
        s.id === sectionId ? { ...s, isEditing: !s.isEditing } : s
      )
    });
  };

  const handleSectionChange = (sectionId: string, content: string) => {
    if (!strategyData) return;
    setStrategyData({
      ...strategyData,
      sections: strategyData.sections.map(s => 
        s.id === sectionId ? { ...s, content } : s
      )
    });
  };

  const handleContinueToOutput = () => {
    setCurrentStep("output");
  };

  const handleEditInput = () => {
    setCurrentStep("input");
  };

  const handleEditProposal = () => {
    setCurrentStep("proposal");
  };

  const handleCopyStrategy = () => {
    if (!strategyData) return;
    const content = strategyData.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(content);
    toast.success("Strategie zkopírována");
  };

  const handleDownload = () => {
    if (!strategyData) return;
    const content = `# ${strategyData.name}\n\nCíl: ${strategyData.goal}\nČasový horizont: ${strategyData.timeHorizon}\nKanály: ${strategyData.channels.join(", ")}\n\n` +
      strategyData.sections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategie-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Strategie stažena");
  };

  const handleNewVariant = () => {
    setInputValue("");
    setStrategyData(null);
    setCurrentStep("input");
  };

  const handleNewStrategy = () => {
    setInputValue("");
    setStrategyData(null);
    setSelectedFunction(null);
    setCurrentStep("select");
    toast.success("Připraveno pro novou strategii");
  };

  const handleSaveStrategy = () => {
    toast.success("Strategie uložena");
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select": return 1;
      case "input": return 2;
      case "proposal": return 3;
      case "output": return 4;
    }
  };

  const steps = [
    { label: "Typ strategie" },
    { label: "Zadání" },
    { label: "Návrh" },
    { label: "Výstup" },
  ];

  const getNeoBotIcon = (neobot: string) => {
    switch (neobot) {
      case "text": return FileText;
      case "video": return Video;
      case "image": return Image;
      default: return FileText;
    }
  };

  const getNeoBotLabel = (neobot: string) => {
    switch (neobot) {
      case "text": return "Textový NeoBot";
      case "video": return "Video NeoBot";
      case "image": return "Obrázkový NeoBot";
      default: return "NeoBot";
    }
  };

  const getNeoBotColor = (neobot: string) => {
    switch (neobot) {
      case "text": return "text-primary";
      case "video": return "text-primary";
      case "image": return "text-accent";
      default: return "text-primary";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">Priorita</span>;
      case "medium": return <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">Střední</span>;
      case "low": return <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Nízká</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
          <Target className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Strategický NeoBot</h1>
          <p className="text-muted-foreground">Řídicí centrum marketingu. Stanovuje priority a řídí ostatní NeoBoty.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <NeoBotSteps currentStep={getStepNumber()} steps={steps} accentColor="accent" />

      {/* STEP 1: Select Strategy Type */}
      {currentStep === "select" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-semibold text-foreground mb-4">Jakou strategii potřebuješ?</h2>
            
            <div className="space-y-1">
              {functionCategories.map((category) => (
                <div key={category.id} className="glass rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <category.icon className="w-4 h-4 text-accent" />
                      </div>
                      <span className="font-medium text-sm text-foreground">{category.title}</span>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedCategory === category.id ? "rotate-180" : ""
                      }`} 
                    />
                  </button>
                  
                  {expandedCategory === category.id && (
                    <div className="px-3 pb-3 space-y-1">
                      {category.functions.map((func) => (
                        <button
                          key={func.id}
                          onClick={() => handleFunctionSelect(func)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                        >
                          <div className="font-medium">{func.label}</div>
                          <div className="text-xs opacity-70">{func.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass rounded-xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Vyber typ strategie</h3>
                <p className="text-sm text-muted-foreground">
                  Strategický NeoBot analyzuje situaci, stanoví priority a řekne, co dělat dál
                </p>
              </div>

              {/* Info boxes */}
              <div className="space-y-3 mt-6">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Compass className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Stanoví směr</div>
                    <div className="text-xs text-muted-foreground">Na co se zaměřit a co nedělat</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Layers className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Rozdělí práci</div>
                    <div className="text-xs text-muted-foreground">Co připravit v Textovém, Video a Obrázkovém NeoBotovi</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <div className="font-medium text-sm text-foreground">Určí priority</div>
                    <div className="text-xs text-muted-foreground">Co udělat jako první, co může počkat</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Input & Settings */}
      {currentStep === "input" && selectedFunction && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{selectedFunction.label}</h3>
                <p className="text-sm text-muted-foreground">{selectedFunction.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("select")}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zpět
              </Button>
            </div>

            {/* Quick Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Rychlé nastavení</h4>
              
              {/* Goal */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Hlavní cíl</label>
                <div className="flex flex-wrap gap-2">
                  {goalOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setGoal(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        goal === opt.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Horizon */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Časový horizont</label>
                <div className="flex flex-wrap gap-2">
                  {timeHorizonOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTimeHorizon(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeHorizon === opt.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels (multi-select) */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Kanály (vyber všechny relevantní)</label>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleChannel(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedChannels.includes(opt.id)
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Rozpočet na marketing</label>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setBudget(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        budget === opt.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Popiš svou situaci</label>
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={getPlaceholder()}
                className="min-h-[140px] bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Čím konkrétnější budeš, tím přesnější strategii dostaneš.
              </p>
            </div>

            {/* CTA */}
            <Button
              onClick={handleGenerateStrategy}
              disabled={!inputValue.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generuji strategii...
                </>
              ) : (
                <>
                  Vytvořit strategii
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Proposal (Editable) */}
      {currentStep === "proposal" && strategyData && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">{strategyData.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                  {strategyData.goal}
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                  {strategyData.timeHorizon}
                </span>
                {strategyData.channels.map(channel => (
                  <span key={channel} className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    {channel}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditInput}>
                <Pencil className="w-4 h-4 mr-1" />
                Upravit zadání
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setIsGenerating(true);
                setTimeout(() => {
                  const { sections, tasks } = generateMockStrategy();
                  setStrategyData({ ...strategyData, sections, neobotTasks: tasks });
                  setIsGenerating(false);
                  toast.success("Strategie přegenerována");
                }, 1000);
              }}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerovat
              </Button>
            </div>
          </div>

          {/* Strategy Sections */}
          <div className="space-y-4">
            {strategyData.sections.map((section) => (
              <div key={section.id} className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">{section.title}</h4>
                  <button
                    onClick={() => handleEditSection(section.id)}
                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {section.isEditing ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Pencil className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {section.isEditing ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.id, e.target.value)}
                    className="min-h-[150px] bg-background/50"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {section.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">
                        {line.startsWith('**') ? (
                          <strong className="text-foreground">{line.replace(/\*\*/g, '')}</strong>
                        ) : line.startsWith('•') || line.startsWith('🥇') || line.startsWith('🥈') || line.startsWith('🥉') || /^\d+\./.test(line) || /^\d️⃣/.test(line) ? (
                          <span className="block">{line}</span>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              onClick={handleContinueToOutput}
              className="bg-gradient-to-r from-accent to-primary hover:opacity-90"
              size="lg"
            >
              Pokračovat k výstupu
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Output & Navigation */}
      {currentStep === "output" && strategyData && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Strategy Summary Card */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-accent" />
                  <span className="text-sm text-accent font-medium">Strategický NeoBot</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{strategyData.name}</h3>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cíl:</span>
                    <span className="ml-2 text-foreground font-medium">{strategyData.goal}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horizont:</span>
                    <span className="ml-2 text-foreground font-medium">{strategyData.timeHorizon}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kanály:</span>
                    <span className="ml-2 text-foreground font-medium">{strategyData.channels.join(", ")}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyStrategy}>
                  <Copy className="w-4 h-4 mr-1" />
                  Zkopírovat
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Stáhnout
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveStrategy}>
                  <Save className="w-4 h-4 mr-1" />
                  Uložit
                </Button>
              </div>
            </div>

            {/* Key decisions summary */}
            <div className="border-t border-border/50 pt-4">
              <h4 className="font-semibold text-foreground mb-3">Klíčová rozhodnutí</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {strategyData.sections.slice(0, 2).map(section => (
                  <div key={section.id} className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs font-medium text-accent mb-1">{section.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {section.content.split('\n')[0].replace(/\*\*/g, '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NeoBot Tasks - Command Center */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-accent" />
              <h4 className="font-semibold text-foreground">Úkoly pro ostatní NeoBoty</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Na základě strategie jsem připravil seznam úkolů. Klikni na tlačítko a přejdi do příslušného NeoBota.
            </p>
            
            <div className="space-y-3">
              {strategyData.neobotTasks.map((task, index) => {
                const Icon = getNeoBotIcon(task.neobot);
                return (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${getNeoBotColor(task.neobot)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{task.task}</div>
                        <div className="text-xs text-muted-foreground">{getNeoBotLabel(task.neobot)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getPriorityBadge(task.priority)}
                      <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
                        Otevřít
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions - Navigate to other NeoBots */}
          <div className="glass rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-4">Rychlé akce</h4>
            
            <div className="grid sm:grid-cols-3 gap-3">
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <FileText className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Vytvořit obsah</div>
                  <div className="text-xs text-muted-foreground">Textový NeoBot</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <Video className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Navrhnout videa</div>
                  <div className="text-xs text-muted-foreground">Video NeoBot</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <Image className="w-5 h-5 mr-3 text-accent" />
                <div className="text-left">
                  <div className="font-medium">Připravit vizuály</div>
                  <div className="text-xs text-muted-foreground">Obrázkový NeoBot</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="ghost" onClick={handleNewVariant}>
              Alternativní strategie
            </Button>
            <Button variant="ghost" onClick={handleEditProposal}>
              <Pencil className="w-4 h-4 mr-1" />
              Upravit strategii
            </Button>
            <Button variant="ghost" onClick={handleNewStrategy}>
              Nová strategie
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
