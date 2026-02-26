import { useState, useEffect } from "react";
import { useTaskOutputSaver } from "@/hooks/useTaskOutputSaver";
import TaskContextBanner from "@/components/app/TaskContextBanner";
import { 
  ArrowRight,
  Video,
  Instagram,
  ShoppingBag,
  Megaphone,
  GraduationCap,
  Heart,
  ChevronDown,
  Loader2,
  Film,
  Play,
  Clock,
  Target,
  Lightbulb,
  RefreshCw,
  Pencil,
  Check,
  Copy,
  Download,
  ArrowLeft,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from "@/components/app/AppLayout";
import { toast } from "sonner";

// Types
interface VideoClip {
  id: number;
  visual: string;
  script: string;
  tip: string;
}

interface VideoScriptData {
  clips: VideoClip[];
  platform: string;
  duration: string;
  style: string;
  purpose: string;
}

interface VideoFunction {
  id: string;
  label: string;
  description: string;
}

interface FunctionCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  functions: VideoFunction[];
}

const functionCategories: FunctionCategory[] = [
  {
    id: "social",
    title: "Sociální sítě",
    icon: Instagram,
    functions: [
      { id: "tiktok", label: "TikTok video", description: "Scénář optimalizovaný pro TikTok formát a styl." },
      { id: "instagram-reel", label: "Instagram Reel", description: "Připravím strukturovaný scénář: hook → obsah → CTA." },
      { id: "stories", label: "Instagram Stories (sekvence)", description: "Série navazujících stories s jasným příběhem." },
      { id: "video-hook", label: "Video hook (první 3 sekundy)", description: "Poutavý úvod, který zastaví scrollování." },
    ]
  },
  {
    id: "products",
    title: "Produkty & e-shop",
    icon: ShoppingBag,
    functions: [
      { id: "product-video", label: "Produktové video", description: "Scénář pro prezentaci produktu a jeho benefitů." },
      { id: "review-demo", label: "Video recenze / ukázka", description: "Autentická ukázka produktu v akci." },
      { id: "how-it-works", label: "Jak produkt funguje", description: "Vysvětlující video o používání produktu." },
    ]
  },
  {
    id: "ads",
    title: "Reklama & kampaně",
    icon: Megaphone,
    functions: [
      { id: "video-ad", label: "Video reklama", description: "Reklamní scénář optimalizovaný pro placené kampaně." },
      { id: "ugc-ad", label: "UGC styl reklamy", description: "Autentický reklamní obsah ve stylu uživatelů." },
    ]
  },
  {
    id: "education",
    title: "Edukace & obsah",
    icon: GraduationCap,
    functions: [
      { id: "educational", label: "Edukační video", description: "Vzdělávací obsah pro tvou cílovou skupinu." },
      { id: "tip-howto", label: "Tip / návod / how-to", description: "Praktický návod nebo rychlý tip." },
    ]
  },
  {
    id: "brand",
    title: "Brand & osobnost",
    icon: Heart,
    functions: [
      { id: "storytelling", label: "Storytelling video", description: "Příběh, který propojí značku s diváky." },
      { id: "brand-intro", label: "Představení značky", description: "Video o tom, kdo jsi a co děláš." },
    ]
  }
];

// Quick settings options
const platformOptions = [
  { id: "tiktok", label: "TikTok" },
  { id: "reels", label: "Instagram Reels" },
  { id: "shorts", label: "YouTube Shorts" },
];

const purposeOptions = [
  { id: "prodej", label: "Prodej" },
  { id: "engagement", label: "Engagement" },
  { id: "edukace", label: "Edukace" },
  { id: "brand", label: "Brand" },
];

const styleOptions = [
  { id: "ugc", label: "UGC" },
  { id: "prirozeny", label: "Přirozený" },
  { id: "profesionalni", label: "Profesionální" },
  { id: "emocni", label: "Emoční" },
];

const durationOptions = [
  { id: "5", label: "5 s", clips: 1 },
  { id: "10", label: "10 s", clips: 2 },
  { id: "15", label: "15 s", clips: 3 },
];

type Step = "select" | "input" | "script" | "output";

interface VideoNeoBotWorkspaceProps {
  profile: UserProfile | null;
  onBack: () => void;
}

export default function VideoNeoBotWorkspace({ profile, onBack }: VideoNeoBotWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [selectedFunction, setSelectedFunction] = useState<VideoFunction | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("social");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick settings
  const [platform, setPlatform] = useState("reels");
  const [purpose, setPurpose] = useState("prodej");
  const [style, setStyle] = useState("prirozeny");
  const [duration, setDuration] = useState("15");
  
  // Script data
  const [scriptData, setScriptData] = useState<VideoScriptData | null>(null);
  const [editableClips, setEditableClips] = useState<VideoClip[]>([]);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { taskContext, saveOutputToTask, isSavingToTask, savedToTask, navigateBackToTask } = useTaskOutputSaver();

  // Reset to step 1 on mount if no task context
  // Auto-prefill and jump to step 2 if task context exists
  useEffect(() => {
    if (!taskContext) {
      // Clean state: start from step 1
      setCurrentStep("select");
      setSelectedFunction(null);
      setInputValue("");
      setScriptData(null);
      setEditableClips([]);
      return;
    }

    // Has task context: auto-prefill and skip to step 2
    const funcMap: Record<string, string> = {
      tiktok: "tiktok", reels: "instagram-reel", reel: "instagram-reel",
    };
    const key = taskContext.format?.toLowerCase() || taskContext.channel?.toLowerCase();
    const funcId = funcMap[key];
    if (funcId) {
      const allFuncs = functionCategories.flatMap(c => c.functions);
      const matched = allFuncs.find(f => f.id === funcId);
      if (matched) setSelectedFunction(matched);
    }
    const brief = [taskContext.task, taskContext.goal ? `Cíl: ${taskContext.goal}` : ""].filter(Boolean).join("\n");
    if (brief) setInputValue(brief);
    setCurrentStep("input");
  }, [taskContext]);

  const getClipCount = () => {
    const found = durationOptions.find(d => d.id === duration);
    return found?.clips || 3;
  };

  const handleFunctionSelect = (func: VideoFunction) => {
    setSelectedFunction(func);
    setCurrentStep("input");
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const generateMockScript = (): VideoClip[] => {
    const clipCount = getClipCount();
    const clips: VideoClip[] = [];
    
    const templates = [
      {
        visual: "Detailní záběr na produkt v rukou. Pohyb je pomalý, buduje očekávání.",
        script: "Tohle nosím, když chci vypadat skvěle, ale zároveň se cítit pohodlně.",
        tip: "Natáčej v přirozeném světle u okna. Detaily prodávají."
      },
      {
        visual: "Střih na celou postavu. Ukázka produktu v akci, reálné prostředí.",
        script: "Prémiový materiál, který nezmačkáš. A ten střih? Lichotí každé postavě.",
        tip: "Použij pomalý záběr. Zvuk při pohybu dodá autenticitu."
      },
      {
        visual: "Záběr na CTA - obrazovka, odkaz, nebo přímý kontakt s kamerou.",
        script: "Klikni na odkaz v bio a objednej si ještě dnes!",
        tip: "Ukonči úsměvem a očním kontaktem."
      }
    ];
    
    for (let i = 0; i < clipCount; i++) {
      clips.push({
        id: i + 1,
        visual: templates[i % templates.length].visual,
        script: templates[i % templates.length].script,
        tip: templates[i % templates.length].tip
      });
    }
    
    return clips;
  };

  const handleGenerateScript = async () => {
    if (!inputValue.trim()) return;
    setIsGenerating(true);
    
    // Simulate generation
    setTimeout(() => {
      const clips = generateMockScript();
      setEditableClips(clips);
      setScriptData({
        clips,
        platform: platformOptions.find(p => p.id === platform)?.label || "Instagram Reels",
        duration: durationOptions.find(d => d.id === duration)?.label || "15 s",
        style: styleOptions.find(s => s.id === style)?.label || "Přirozený",
        purpose: purposeOptions.find(p => p.id === purpose)?.label || "Prodej",
      });
      setCurrentStep("script");
      setIsGenerating(false);
    }, 1500);
  };

  const handleRegenerateScript = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const clips = generateMockScript();
      setEditableClips(clips);
      setIsGenerating(false);
      toast.success("Scénář přegenerován");
    }, 1000);
  };

  const handleCreateVideo = () => {
    if (scriptData) {
      setScriptData({ ...scriptData, clips: editableClips });
    }
    setCurrentStep("output");
  };

  const handleEditScript = () => {
    setCurrentStep("script");
  };

  const handleEditInput = () => {
    setCurrentStep("input");
  };

  const handleNewVariant = () => {
    setInputValue("");
    setEditableClips([]);
    setScriptData(null);
    setCurrentStep("input");
  };

  const handleContinueVideo = () => {
    setInputValue("");
    setEditableClips([]);
    setScriptData(null);
    setCurrentStep("select");
    toast.success("Připraveno pro další video");
  };

  const handleClipChange = (clipId: number, field: keyof VideoClip, value: string) => {
    setEditableClips(prev => 
      prev.map(clip => 
        clip.id === clipId ? { ...clip, [field]: value } : clip
      )
    );
  };

  const handleCopyScript = () => {
    if (!scriptData) return;
    const content = editableClips
      .map(clip => `KLIP ${clip.id}\n\nCo se děje:\n${clip.visual}\n\nText:\n${clip.script}\n\nTip: ${clip.tip}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(content);
    toast.success("Scénář zkopírován");
  };

  const handleCopyClip = (clip: VideoClip) => {
    const content = `KLIP ${clip.id}\n\nCo se děje:\n${clip.visual}\n\nText:\n${clip.script}\n\nTip: ${clip.tip}`;
    navigator.clipboard.writeText(content);
    setCopiedItem(`clip-${clip.id}`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select": return 1;
      case "input": return 2;
      case "script": return 3;
      case "output": return 4;
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Video className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Video NeoBot</h1>
          <p className="text-muted-foreground">Vytvoř kompletní scénář a plán k natáčení krátkých videí.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { step: 1, label: "Typ videa" },
          { step: 2, label: "Zadání" },
          { step: 3, label: "Scénář" },
          { step: 4, label: "Výstup" },
        ].map((item, index) => (
          <div key={item.step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              getStepNumber() >= item.step 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              {item.step}
            </div>
            <span className={`text-sm hidden sm:block ${
              getStepNumber() >= item.step ? "text-foreground" : "text-muted-foreground"
            }`}>
              {item.label}
            </span>
            {index < 3 && (
              <div className={`w-8 h-0.5 ${
                getStepNumber() > item.step ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Task context banner */}
      {taskContext && <TaskContextBanner taskContext={taskContext} onNavigateBack={navigateBackToTask} />}

      {/* STEP 1: Select Video Type */}
      {currentStep === "select" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-semibold text-foreground mb-4">Co chceš vytvořit?</h2>
            
            <div className="space-y-1">
              {functionCategories.map((category) => (
                <div key={category.id} className="glass rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="w-4 h-4 text-primary" />
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
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-primary hover:text-primary-foreground text-muted-foreground hover:text-foreground"
                        >
                          {func.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Vyber typ video obsahu</h3>
              <p className="text-sm text-muted-foreground">
                Zvol z kategorií vlevo, jaké video chceš vytvořit
              </p>
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
              
              {/* Platform */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Platforma</label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPlatform(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        platform === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Účel videa</label>
                <div className="flex flex-wrap gap-2">
                  {purposeOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPurpose(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        purpose === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Styl videa</label>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setStyle(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        style === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Délka videa</label>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setDuration(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        duration === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label} ({opt.clips} {opt.clips === 1 ? "klip" : "klipy"})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Zadání</label>
              <Textarea
                placeholder="Např.: Reel pro dámské šaty, ženy 30–50 let, přirozený styl, důraz na pohodlí a kvalitu."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[120px] bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>

            {/* CTA */}
            <Button
              onClick={handleGenerateScript}
              disabled={!inputValue.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generuji scénář...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Vytvořit scénář
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Editable Script */}
      {currentStep === "script" && scriptData && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-foreground">Scénář videa</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditInput}>
                  <Pencil className="w-4 h-4" />
                  Upravit zadání
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateScript} disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerovat
                </Button>
              </div>
            </div>

            {/* Context */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                {scriptData.platform}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm">
                {scriptData.duration}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                {scriptData.style}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                {scriptData.purpose}
              </span>
            </div>
          </div>

          {/* Editable Clips */}
          {editableClips.map((clip, index) => (
            <div key={clip.id} className="glass rounded-xl overflow-hidden border border-border/50">
              <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground">Klip {clip.id}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        <Clock className="w-3 h-3" />
                        {parseInt(duration) / getClipCount()} s
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleCopyClip(clip)}>
                  {copiedItem === `clip-${clip.id}` ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Co se děje ve videu
                  </label>
                  <Textarea
                    value={clip.visual}
                    onChange={(e) => handleClipChange(clip.id, "visual", e.target.value)}
                    className="min-h-[80px] bg-muted/30 border-border/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Text / mluvený obsah
                  </label>
                  <Textarea
                    value={clip.script}
                    onChange={(e) => handleClipChange(clip.id, "script", e.target.value)}
                    className="min-h-[60px] bg-muted/30 border-border/30"
                  />
                </div>

                <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
                  <div className="flex items-center gap-1 text-xs font-semibold text-accent uppercase tracking-wide mb-1">
                    <Lightbulb className="w-3 h-3" />
                    Tip pro natáčení
                  </div>
                  <p className="text-sm text-foreground">{clip.tip}</p>
                </div>
              </div>
            </div>
          ))}

          {/* CTA */}
          <Button
            onClick={handleCreateVideo}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 py-6"
          >
            <Film className="w-5 h-5" />
            Vytvořit video
          </Button>
        </div>
      )}

      {/* STEP 4: Final Output */}
      {currentStep === "output" && scriptData && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Video Preview Placeholder */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="aspect-[9/16] max-h-[400px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto">
              <div className="text-center p-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">Náhled videa</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Video je připraveno k natáčení podle scénáře</p>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-xl font-bold text-foreground mb-4">{scriptData.platform} video</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{scriptData.duration}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{scriptData.purpose}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-foreground">{scriptData.style}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-sm text-foreground">{editableClips.length} {editableClips.length === 1 ? "klip" : "klipy"}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid sm:grid-cols-2 gap-3">
            {taskContext && (
              <Button
                disabled={isSavingToTask || savedToTask}
                onClick={() => {
                  const content = editableClips.map(c => `Klip ${c.id}:\nVizuál: ${c.visual}\nText: ${c.script}\nTip: ${c.tip}`).join("\n\n");
                  saveOutputToTask("script", content);
                }}
                className="py-6 bg-gradient-to-r from-primary to-accent col-span-2"
              >
                {isSavingToTask ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-1" />}
                {savedToTask ? "Uloženo k úkolu" : "Uložit k úkolu"}
              </Button>
            )}
            <Button variant="outline" onClick={handleCopyScript} className="py-6">
              <Copy className="w-4 h-4" />
              Zkopírovat scénář
            </Button>
            <Button variant="outline" onClick={() => toast.success("Stahování připraveno")} className="py-6">
              <Download className="w-4 h-4" />
              Stáhnout video
            </Button>
            <Button variant="outline" onClick={handleNewVariant} className="py-6">
              <RefreshCw className="w-4 h-4" />
              Vytvořit variantu
            </Button>
            <Button variant="outline" onClick={handleEditScript} className="py-6">
              <Pencil className="w-4 h-4" />
              Upravit scénář
            </Button>
          </div>

          <Button
            onClick={handleContinueVideo}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 py-6"
          >
            <ArrowRight className="w-5 h-5" />
            Navázat dalším videem
          </Button>

          {taskContext && (
            <Button variant="default" onClick={navigateBackToTask} className="w-full bg-gradient-to-r from-primary to-accent py-6">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Vrátit se do úkolu
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
