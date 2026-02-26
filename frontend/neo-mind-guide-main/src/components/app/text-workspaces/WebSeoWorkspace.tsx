import { useState } from "react";
import { Globe, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { WorkspaceProps, TextOutputData, SettingOption } from "./types";
import WorkspaceHeader from "./WorkspaceHeader";
import SettingsToggle from "./SettingsToggle";
import OutputDisplay from "./OutputDisplay";
import { useTextGeneration } from "./useTextGeneration";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

// Typy obsahu
const contentTypes: SettingOption[] = [
  { id: "homepage", label: "Text na homepage", description: "Hlavní texty pro domovskou stránku" },
  { id: "landing", label: "Landing page", description: "Prodejní stránka pro produkt nebo službu" },
  { id: "seo-article", label: "SEO článek / blog", description: "Článek optimalizovaný pro vyhledávače" },
  { id: "meta", label: "Meta title & description", description: "SEO metadata pro stránky webu" },
];

// Cíl stránky
const goalOptions: SettingOption[] = [
  { id: "prodej", label: "Prodej" },
  { id: "informovani", label: "Informování" },
  { id: "seo", label: "SEO" },
];

// Tón
const toneOptions: SettingOption[] = [
  { id: "profesionalni", label: "Profesionální" },
  { id: "pratelsky", label: "Přátelský" },
  { id: "expertni", label: "Expertní" },
];

// Délka textu
const lengthOptions: SettingOption[] = [
  { id: "kratky", label: "Krátký" },
  { id: "stredni", label: "Střední" },
  { id: "dlouhy", label: "Dlouhý" },
];

type Step = "select" | "input" | "output";

export default function WebSeoWorkspace({ profile, onBack }: WorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [contentType, setContentType] = useState<string | null>(null);
  const [goal, setGoal] = useState("seo");
  const [tone, setTone] = useState("profesionalni");
  const [length, setLength] = useState("stredni");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [output, setOutput] = useState<TextOutputData | null>(null);
  
  const { generate, parseResponse, parseToSections, isGenerating } = useTextGeneration();

  const steps = [
    { label: "Typ obsahu" },
    { label: "Zadání" },
    { label: "Výstup" },
  ];

  // Map contentType to correct backend type
  const getBackendType = (ct: string): string => {
    switch (ct) {
      case "homepage": return "web_copy";
      case "landing": return "web_copy";
      case "seo-article": return "seo_article";
      case "meta": return "seo_meta";
      default: return "web_copy";
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || !contentType) return;
    
    const content = await generate({
      profile,
      type: getBackendType(contentType),
      prompt: topic.trim(),
      settings: {
        contentType,
        goal,
        tone,
        keywords: keywords.trim() || undefined,
        length: contentType === "seo-article" ? "dlouhy" : length,
        noEmoji: true,
        noSocialCTA: true,
        structuredOutput: true,
        seoStructure: contentType === "seo-article",
      }
    });

    if (content) {
      const parsed = parseResponse(content);
      const sections = parseToSections(content);
      
      setOutput({
        name: contentTypes.find(t => t.id === contentType)?.label || "Web text",
        sections,
        parsed,
        metadata: {
          goal: goalOptions.find(g => g.id === goal)?.label || goal,
          tone: toneOptions.find(t => t.id === tone)?.label || tone,
        }
      });
      setCurrentStep("output");
    }
  };

  const handleSelectType = (typeId: string) => {
    setContentType(typeId);
    setCurrentStep("input");
  };

  const handleNewVariant = () => {
    handleGenerate();
  };

  const handleEdit = () => {
    setCurrentStep("input");
  };

  const handleNew = () => {
    setCurrentStep("select");
    setContentType(null);
    setTopic("");
    setKeywords("");
    setOutput(null);
    toast.success("Připraveno pro nový text");
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select": return 1;
      case "input": return 2;
      case "output": return 3;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <WorkspaceHeader
        icon={Globe}
        title="Web & SEO"
        description="Texty na web, landing pages, SEO články a metadata"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select content type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Jaký webový obsah potřebuješ?</h2>
          <div className="grid gap-4">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="glass rounded-xl p-6 text-left hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {type.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Input & Settings */}
      {currentStep === "input" && contentType && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {contentTypes.find(t => t.id === contentType)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {contentTypes.find(t => t.id === contentType)?.description}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("select")}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zpět
              </Button>
            </div>

            <div className="space-y-4">
              <SettingsToggle
                label="Cíl stránky"
                options={goalOptions}
                value={goal}
                onChange={setGoal}
              />
              
              <SettingsToggle
                label="Tón"
                options={toneOptions}
                value={tone}
                onChange={setTone}
              />
              
              {contentType !== "seo-article" && contentType !== "meta" && (
                <SettingsToggle
                  label="Délka textu"
                  options={lengthOptions}
                  value={length}
                  onChange={setLength}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Téma / produkt / služba</label>
              <Textarea
                placeholder="Např.: E-shop s ručně vyráběnými svíčkami. Nabízíme sójové svíčky s přírodními vůněmi, vyráběné v Česku."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Klíčová slova (volitelné)</label>
              <Input
                placeholder="Např.: sójové svíčky, přírodní svíčky, české svíčky"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
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

      {/* STEP 3: Output */}
      {currentStep === "output" && output && (
        <div className="max-w-3xl mx-auto">
          <OutputDisplay
            output={output}
            onNewVariant={handleNewVariant}
            onEdit={handleEdit}
            onNew={handleNew}
            primaryLabel="Text pro web"
            primaryDescription="Strukturovaný text připravený k použití"
          />
        </div>
      )}
    </div>
  );
}
