import { useState, useEffect } from "react";
import { useTaskOutputSaver } from "@/hooks/useTaskOutputSaver";
import TaskContextBanner from "@/components/app/TaskContextBanner";
import { 
  ArrowRight,
  FileText,
  Share2,
  ShoppingCart,
  Globe,
  Mail,
  Package,
  Wand2,
  Lightbulb,
  ChevronDown,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  Pencil,
  Check,
  ArrowLeft,
  Save,
  Video,
  Image,
  Target,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from "@/components/app/AppLayout";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";
import { NEOBOT_API_BASE, NEOBOT_API_KEY, saveOutputToHistory } from "@/lib/neobot";

import {
  SalesWorkspace,
  WebSeoWorkspace,
  EmailWorkspace,
  ProductsWorkspace,
  TransformWorkspace,
} from "@/components/app/text-workspaces";

interface TextFunction {
  id: string;
  label: string;
  description: string;
  isStrategy?: boolean;
}

interface FunctionCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  functions: TextFunction[];
}

interface TextSection {
  id: string;
  title: string;
  content: string;
  isEditing?: boolean;
}

interface ParsedOutput {
  postText: string;      // Čistý text příspěvku (bez nadpisů)
  notes: string | null;  // Poznámky (čas publikace, vizuál)
  rawContent: string;    // Původní celý text
}

interface TextOutputData {
  name: string;
  platform: string;
  purpose: string;
  tone: string;
  sections: TextSection[];
  parsed: ParsedOutput;  // Nové: rozparsovaný výstup
}

const functionCategories: FunctionCategory[] = [
  {
    id: "social",
    title: "Sociální sítě",
    icon: Share2,
    functions: [
      { id: "facebook", label: "Příspěvek na Facebook", description: "Poutavý příspěvek na Facebook s přirozeným tónem." },
      { id: "instagram", label: "Příspěvek na Instagram", description: "Instagram caption s relevantními hashtagy." },
      { id: "linkedin", label: "Příspěvek na LinkedIn", description: "Profesionální příspěvek pro LinkedIn." },
      { id: "threads", label: "Příspěvek na Threads / X", description: "Krátký, úderný text pro Threads nebo X." },
      { id: "series", label: "Série příspěvků", description: "Naplánovaná série příspěvků na celý týden." },
    ]
  },
  {
    id: "sales",
    title: "Prodejní texty",
    icon: ShoppingCart,
    functions: [
      { id: "sales-copy", label: "Prodejní text", description: "Přesvědčivý text zaměřený na prodej." },
      { id: "ad-copy", label: "Reklamní text", description: "Krátký, úderný text pro reklamy." },
      { id: "landing-page", label: "Text pro landing page", description: "Kompletní texty pro prodejní stránku." },
      { id: "promo", label: "Text pro akci / slevu", description: "Oznámení akce nebo novinky." },
    ]
  },
  {
    id: "web",
    title: "Web & SEO",
    icon: Globe,
    functions: [
      { id: "homepage", label: "Text na homepage", description: "Hlavní texty pro domovskou stránku." },
      { id: "seo-article", label: "SEO článek / blog", description: "Článek optimalizovaný pro vyhledávače." },
      { id: "meta", label: "Meta title a description", description: "SEO metadata pro stránky webu." },
    ]
  },
  {
    id: "email",
    title: "E-maily & Newslettery",
    icon: Mail,
    functions: [
      { id: "single-email", label: "Jednorázový e-mail", description: "Jeden e-mail pro konkrétní účel." },
      { id: "newsletter", label: "Newsletter", description: "Pravidelný informační e-mail." },
      { id: "sales-email", label: "Prodejní e-mail", description: "E-mail zaměřený na prodej." },
      { id: "email-sequence", label: "Automatická sekvence", description: "Série e-mailů pro onboarding nebo prodej." },
    ]
  },
  {
    id: "products",
    title: "Produkty & Služby",
    icon: Package,
    functions: [
      { id: "product-desc", label: "Popis produktu", description: "Prodejní popis produktu s benefity." },
      { id: "service-desc", label: "Popis služby", description: "Detailní popis služby." },
      { id: "faq", label: "FAQ", description: "Časté otázky a odpovědi." },
    ]
  },
  {
    id: "transform",
    title: "Úpravy textu",
    icon: Wand2,
    functions: [
      { id: "rewrite", label: "Přepsat text", description: "Kompletní přepis textu." },
      { id: "simplify", label: "Zjednodušit text", description: "Zjednodušení složitého textu." },
      { id: "tone-change", label: "Změnit tón", description: "Úprava tónu komunikace." },
    ]
  },
  // Strategy category removed - Calendar is now the single source of truth for planning
  // Users should use the dedicated "Obsahový plán" section for strategy/planning
];

// Quick settings
const platformOptions = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "web", label: "Web" },
];

const purposeOptions = [
  { id: "prodej", label: "Prodej" },
  { id: "engagement", label: "Engagement" },
  { id: "edukace", label: "Edukace" },
  { id: "brand", label: "Brand" },
];

const toneOptions = [
  { id: "formalni", label: "Formální" },
  { id: "neformalni", label: "Neformální" },
  { id: "hravy", label: "Hravý" },
  { id: "expertni", label: "Expertní" },
];

const lengthOptions = [
  { id: "kratky", label: "Krátký" },
  { id: "stredni", label: "Střední" },
  { id: "dlouhy", label: "Dlouhý" },
];

type Step = "select" | "input" | "proposal" | "output";

interface TextNeoBotWorkspaceProps {
  profile: UserProfile | null;
  onBack: () => void;
}

export default function TextNeoBotWorkspace({ profile, onBack }: TextNeoBotWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [selectedFunction, setSelectedFunction] = useState<TextFunction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("social");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick settings
  const [platform, setPlatform] = useState("instagram");
  const [purpose, setPurpose] = useState("prodej");
  const [tone, setTone] = useState("neformalni");
  const [length, setLength] = useState("stredni");

  // Debug mode: show platform state on localhost or ?debug=1
  const isDebug = typeof window !== "undefined" && (
    window.location.hostname === "localhost" || 
    new URLSearchParams(window.location.search).get("debug") === "1"
  );

  // Helper: get current labels from state (single source of truth)
  const platformLabel = platformOptions.find(p => p.id === platform)?.label || platform;
  const purposeLabel = purposeOptions.find(p => p.id === purpose)?.label || purpose;
  const toneLabel = toneOptions.find(t => t.id === tone)?.label || tone;
  
  // Output data
  const [textOutput, setTextOutput] = useState<TextOutputData | null>(null);
  const { taskContext, saveOutputToTask, isSavingToTask, savedToTask, navigateBackToTask } = useTaskOutputSaver();

  // Auto-prefill from task context
  // Reset to step 1 on mount if no task context
  // Auto-prefill and jump to step 2 if task context exists
  useEffect(() => {
    if (!taskContext) {
      // Clean state: start from step 1
      setCurrentStep("select");
      setSelectedFunction(null);
      setInputValue("");
      setTextOutput(null);
      return;
    }

    // Has task context: auto-prefill and skip to step 2
    const channelMap: Record<string, string> = {
      instagram: "instagram", facebook: "facebook", linkedin: "linkedin", web: "web",
    };
    const mappedPlatform = channelMap[taskContext.channel?.toLowerCase()];
    if (mappedPlatform) setPlatform(mappedPlatform);

    const funcMap: Record<string, string> = {
      instagram: "instagram", facebook: "facebook", linkedin: "linkedin", threads: "threads",
    };
    const funcId = funcMap[taskContext.channel?.toLowerCase()];
    if (funcId) {
      const allFuncs = functionCategories.flatMap(c => c.functions);
      const matched = allFuncs.find(f => f.id === funcId);
      if (matched) {
        setSelectedFunction(matched);
        setExpandedCategory("social");
      }
    }

    const brief = [taskContext.task, taskContext.goal ? `Cíl: ${taskContext.goal}` : ""].filter(Boolean).join("\n");
    if (brief) setInputValue(brief);

    setCurrentStep("input");
  }, [taskContext]);

  // Handler pro výběr kategorie - specializované workspaces
  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === "social") {
      // Sociální sítě zůstávají v původním flow
      setExpandedCategory(categoryId);
      return;
    }
    // Ostatní kategorie mají vlastní workspace
    setSelectedCategory(categoryId);
  };

  const handleBackFromWorkspace = () => {
    setSelectedCategory(null);
  };

  const handleFunctionSelect = (func: TextFunction) => {
    setSelectedFunction(func);
    // Set platform from selected function to keep single source of truth
    const funcToPlatform: Record<string, string> = {
      facebook: "facebook",
      instagram: "instagram",
      linkedin: "linkedin",
      threads: "web",
    };
    if (funcToPlatform[func.id]) {
      setPlatform(funcToPlatform[func.id]);
    }
    setCurrentStep("input");
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Renderování specializovaných workspaces
  if (selectedCategory === "sales") {
    return <SalesWorkspace profile={profile} onBack={handleBackFromWorkspace} />;
  }
  if (selectedCategory === "web") {
    return <WebSeoWorkspace profile={profile} onBack={handleBackFromWorkspace} />;
  }
  if (selectedCategory === "email") {
    return <EmailWorkspace profile={profile} onBack={handleBackFromWorkspace} />;
  }
  if (selectedCategory === "products") {
    return <ProductsWorkspace profile={profile} onBack={handleBackFromWorkspace} />;
  }
  if (selectedCategory === "transform") {
    return <TransformWorkspace profile={profile} onBack={handleBackFromWorkspace} />;
  }
  // Strategy category removed - use dedicated "Obsahový plán" page instead

  // Strategy category removed - use dedicated "Obsahový plán" page instead


  const handleGenerate = async () => {
    if (!inputValue.trim()) return;
    setIsGenerating(true);
    
    const url = `${NEOBOT_API_BASE}/api/content/generate`;

    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-api-key": NEOBOT_API_KEY,
        },
        body: JSON.stringify({
          profile,
          type: "create_post",
          prompt: inputValue.trim(),
          settings: {
            platform,
            purpose,
            tone,
            length,
            functionType: selectedFunction?.id
          }
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          throw new Error("Chybí nebo je neplatný API klíč.");
        }
        if (res.status === 402) {
          throw new Error("Došel kredit/units.");
        }
        if (res.status === 400) {
          throw new Error(body.error || body.message || "Neplatný požadavek.");
        }
        throw new Error(body.error || body.message || `Chyba ${res.status}`);
      }

      const data = await res.json();

      if (!data.ok) {
        throw new Error("Backend returned ok=false");
      }

      // Build text content from response
      let postText = data.text || "";
      if (data.hashtags && data.hashtags.length > 0) {
        postText += "\n\n" + data.hashtags.join(" ");
      }

      const notes = data.notes && data.notes.length > 0
        ? data.notes.map((n: string) => `• ${n}`).join("\n")
        : null;

      const parsed: ParsedOutput = {
        postText,
        notes,
        rawContent: data.text || ""
      };

      const sections: TextSection[] = [{
        id: "postText",
        title: "Text k publikaci",
        content: postText
      }];

      if (notes) {
        sections.push({
          id: "notes",
          title: "Poznámky",
          content: notes
        });
      }
      
      setTextOutput({
        name: selectedFunction?.label || "Text",
        platform: platformOptions.find(p => p.id === platform)?.label || "Instagram",
        purpose: purposeOptions.find(p => p.id === purpose)?.label || "Prodej",
        tone: toneOptions.find(t => t.id === tone)?.label || "Neformální",
        sections,
        parsed
      });
      setCurrentStep("proposal");

      // Save to history (non-blocking)
      saveOutputToHistory("content_generate", {
        type: "create_post",
        prompt: inputValue.trim(),
        platform,
        purpose,
        tone,
        functionType: selectedFunction?.id,
      }, {
        text: data.text,
        hashtags: data.hashtags,
        notes: data.notes,
      });
    } catch (error: any) {
      console.error("Error generating content:", error);
      const msg = error?.message || `Nepodařilo se vygenerovat obsah.`;
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSection = (sectionId: string) => {
    if (!textOutput) return;
    setTextOutput({
      ...textOutput,
      sections: textOutput.sections.map(s => 
        s.id === sectionId ? { ...s, isEditing: !s.isEditing } : s
      )
    });
  };

  const handleSectionChange = (sectionId: string, content: string) => {
    if (!textOutput) return;
    setTextOutput({
      ...textOutput,
      sections: textOutput.sections.map(s => 
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

  const handleNewVariant = () => {
    setCurrentStep("input");
    setInputValue("");
    setTextOutput(null);
  };

  const handleNewText = () => {
    setCurrentStep("select");
    setSelectedFunction(null);
    setInputValue("");
    setTextOutput(null);
    toast.success("Připraveno pro další text");
  };

  const handleCopyAll = () => {
    if (!textOutput) return;
    const content = textOutput.parsed?.rawContent || textOutput.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(content);
    toast.success("Vše zkopírováno");
  };

  const handleCopyPostText = () => {
    if (!textOutput) return;
    const text = textOutput.parsed?.postText || textOutput.sections[0]?.content || "";
    navigator.clipboard.writeText(text);
    toast.success("Text příspěvku zkopírován");
  };

  const handleCopyNotes = () => {
    if (!textOutput?.parsed?.notes) return;
    navigator.clipboard.writeText(textOutput.parsed.notes);
    toast.success("Poznámky zkopírovány");
  };

  const handleCopySection = (section: TextSection) => {
    navigator.clipboard.writeText(section.content);
    toast.success("Sekce zkopírována");
  };

  const handleDownload = () => {
    if (!textOutput) return;
    const content = textOutput.sections
      .map(s => `${s.title.toUpperCase()}:\n${s.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neobot-text-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Staženo");
  };

  const handleSave = () => {
    toast.success("Text uložen");
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
    { label: "Typ textu" },
    { label: "Zadání" },
    { label: "Návrh" },
    { label: "Výstup" },
  ];

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
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Textový NeoBot</h1>
          <p className="text-muted-foreground">Copywriter a textový tvůrce pro tvůj brand</p>
        </div>
      </div>

      {/* Progress Steps */}
      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* Task context banner */}
      {taskContext && <TaskContextBanner taskContext={taskContext} onNavigateBack={navigateBackToTask} />}

      {/* STEP 1: Select Output Type */}
      {currentStep === "select" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <h2 className="font-semibold text-foreground mb-4">Co chceš vytvořit?</h2>
            
            <div className="space-y-1">
              {functionCategories.map((category) => (
                <div key={category.id} className="glass rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (category.id === "social") {
                        toggleCategory(category.id);
                      } else {
                        handleCategorySelect(category.id);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm text-foreground">{category.title}</span>
                    </div>
                    {category.id === "social" ? (
                      <ChevronDown 
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedCategory === category.id ? "rotate-180" : ""
                        }`} 
                      />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  {category.id === "social" && expandedCategory === category.id && (
                    <div className="px-3 pb-3 space-y-1">
                      {category.functions.map((func) => (
                        <button
                          key={func.id}
                          onClick={() => handleFunctionSelect(func)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-primary hover:text-primary-foreground text-muted-foreground"
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
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Vyber typ textu</h3>
              <p className="text-sm text-muted-foreground">
                Zvol z kategorií vlevo, jaký text chceš vytvořit
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

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Účel</label>
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

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tón</label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTone(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        tone === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Délka</label>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setLength(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        length === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Zadání</label>
              <Textarea
                placeholder="Např.: Příspěvek o nových dámských šatech. Cílová skupina ženy 30–50, důraz na kvalitu a pohodlí. Přirozený tón, bez přehnaných slibů."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[120px] bg-background/50"
              />
            </div>

            {/* CTA */}
            <Button
              onClick={() => handleGenerate()}
              disabled={!inputValue.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generuji text...
                </>
              ) : (
                <>
                  Vytvořit text
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Proposal (Editable) */}
      {currentStep === "proposal" && textOutput && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">{textOutput.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {platformLabel}
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                  {purposeLabel}
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                  {toneLabel}
                </span>
              </div>
              {isDebug && (
                <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                  Platform state: {platform} | purpose: {purpose} | tone: {tone} | length: {length}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditInput}>
                <Pencil className="w-4 h-4 mr-1" />
                Upravit zadání
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleGenerate()}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerovat
              </Button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-4">
            {textOutput.sections.map((section) => (
              <div key={section.id} className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">{section.title}</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopySection(section)}
                      className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
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
                </div>
                
                {section.isEditing ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleSectionChange(section.id, e.target.value)}
                    className="min-h-[100px] bg-background/50"
                  />
                ) : (
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              onClick={handleContinueToOutput}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              Pokračovat k výstupu
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Output & Navigation */}
      {currentStep === "output" && textOutput && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header with metadata */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{textOutput.name}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    <span>{platformLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span>{purposeLabel}</span>
                  </div>
                </div>
                {isDebug && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                    Platform state: {platform} | purpose: {purpose} | tone: {tone} | length: {length}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Stáhnout
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" />
                  Uložit
                </Button>
                {taskContext && (
                  <Button
                    size="sm"
                    disabled={isSavingToTask || savedToTask}
                    onClick={() => {
                      const content = textOutput?.parsed?.postText || textOutput?.sections[0]?.content || "";
                      saveOutputToTask("text", content);
                    }}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    {isSavingToTask ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-1" />}
                    {savedToTask ? "Uloženo k úkolu" : "Uložit k úkolu"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Text k publikaci - hlavní výstup určený k publikaci */}
          <div className="glass rounded-xl p-6 border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Text k publikaci
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tento text je připraven k publikaci
                </p>
              </div>
              <Button onClick={handleCopyPostText} className="bg-primary hover:bg-primary/90">
                <Copy className="w-4 h-4 mr-1" />
                Zkopírovat text
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-foreground whitespace-pre-wrap leading-relaxed">
              {textOutput.parsed?.postText || textOutput.sections[0]?.content || ""}
            </div>
          </div>

          {/* Poznámky & doporučení - jasně oddělené jako interní podklad */}
          {textOutput.parsed?.notes && (
            <div className="glass rounded-xl p-6 border-l-4 border-l-accent/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    Poznámky & doporučení
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interní podklad – není určeno k publikaci
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyNotes}>
                  <Copy className="w-4 h-4 mr-1" />
                  Zkopírovat
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
                {textOutput.parsed.notes}
              </div>
            </div>
          )}

          {/* Copy All button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
              <Copy className="w-4 h-4 mr-1" />
              Zkopírovat vše
            </Button>
          </div>

          {/* Action Buttons - Navigation to other NeoBots */}
          <div className="glass rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-4">Co dál?</h4>
            <p className="text-sm text-muted-foreground mb-6">
              Text je připraven. Můžeš pokračovat tvorbou vizuálů nebo videa.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <Image className="w-5 h-5 mr-3 text-accent" />
                <div className="text-left">
                  <div className="font-medium">Vytvořit vizuál</div>
                  <div className="text-xs text-muted-foreground">Obrázkový NeoBot</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <Video className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Navrhnout video</div>
                  <div className="text-xs text-muted-foreground">Video NeoBot</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            {taskContext && (
              <Button variant="default" onClick={navigateBackToTask} className="bg-gradient-to-r from-primary to-accent">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Vrátit se do úkolu
              </Button>
            )}
            <Button variant="ghost" onClick={handleNewVariant}>
              Vytvořit variantu
            </Button>
            <Button variant="ghost" onClick={handleEditProposal}>
              <Pencil className="w-4 h-4 mr-1" />
              Upravit text
            </Button>
            <Button variant="ghost" onClick={handleNewText}>
              Nový text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
