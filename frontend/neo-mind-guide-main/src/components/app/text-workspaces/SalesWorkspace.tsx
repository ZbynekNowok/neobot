import { useState } from "react";
import { ShoppingCart, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceProps, TextOutputData, SettingOption } from "./types";
import WorkspaceHeader from "./WorkspaceHeader";
import SettingsToggle from "./SettingsToggle";
import OutputDisplay from "./OutputDisplay";
import { useTextGeneration } from "./useTextGeneration";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

// Typy obsahu
const contentTypes: SettingOption[] = [
  { id: "ad-copy", label: "Reklamní text", description: "Krátký, úderný text pro reklamy" },
  { id: "sales-copy", label: "Prodejní text", description: "Přesvědčivý text zaměřený na prodej" },
  { id: "promo", label: "Text pro akci / slevu", description: "Oznámení akce nebo slevy" },
];

// Kde bude text použit
const usageOptions: SettingOption[] = [
  { id: "reklama", label: "Reklama" },
  { id: "web", label: "Web" },
  { id: "email", label: "E-mail" },
];

// Účel
const purposeOptions: SettingOption[] = [
  { id: "prodej", label: "Prodej" },
  { id: "kontakt", label: "Získání kontaktu" },
];

// Tón
const toneOptions: SettingOption[] = [
  { id: "formalni", label: "Formální" },
  { id: "neformalni", label: "Neformální" },
  { id: "presvedcivy", label: "Přesvědčivý" },
];

// Intenzita prodeje
const intensityOptions: SettingOption[] = [
  { id: "jemna", label: "Jemná" },
  { id: "stredni", label: "Střední" },
  { id: "silna", label: "Silná" },
];

// Délka textu
const lengthOptions: SettingOption[] = [
  { id: "kratky", label: "Krátký" },
  { id: "stredni", label: "Střední" },
  { id: "dlouhy", label: "Dlouhý" },
];

type Step = "select" | "input" | "output";

export default function SalesWorkspace({ profile, onBack }: WorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [contentType, setContentType] = useState<string | null>(null);
  const [usage, setUsage] = useState("reklama");
  const [purpose, setPurpose] = useState("prodej");
  const [tone, setTone] = useState("presvedcivy");
  const [intensity, setIntensity] = useState("stredni");
  const [length, setLength] = useState("stredni");
  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState<TextOutputData | null>(null);
  
  const { generate, parseResponse, parseToSections, isGenerating } = useTextGeneration();

  const steps = [
    { label: "Typ textu" },
    { label: "Zadání" },
    { label: "Výstup" },
  ];

  // Map contentType to correct backend type
  const getBackendType = (ct: string): string => {
    switch (ct) {
      case "ad-copy": return "ad_copy";
      case "sales-copy": return "sales_copy";
      case "promo": return "sales_copy"; // promo is a type of sales copy
      default: return "sales_copy";
    }
  };

  const handleGenerate = async () => {
    if (!inputValue.trim() || !contentType) return;
    
    const content = await generate({
      profile,
      type: getBackendType(contentType),
      prompt: inputValue.trim(),
      settings: {
        contentType,
        usage,
        purpose,
        tone,
        intensity,
        length,
        noHashtags: true,
        noVisualNotes: true,
        requireCTA: true,
      }
    });

    if (content) {
      const parsed = parseResponse(content);
      const sections = parseToSections(content);
      
      setOutput({
        name: contentTypes.find(t => t.id === contentType)?.label || "Prodejní text",
        sections,
        parsed,
        metadata: {
          usage: usageOptions.find(u => u.id === usage)?.label || usage,
          purpose: purposeOptions.find(p => p.id === purpose)?.label || purpose,
          tone: toneOptions.find(t => t.id === tone)?.label || tone,
          intensity: intensityOptions.find(i => i.id === intensity)?.label || intensity,
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
    setInputValue("");
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
        icon={ShoppingCart}
        title="Prodejní texty"
        description="Reklamní texty, prodejní copy, texty pro akce a slevy"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select content type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Jaký prodejní text potřebuješ?</h2>
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
                label="Kde bude text použit"
                options={usageOptions}
                value={usage}
                onChange={setUsage}
              />
              
              <SettingsToggle
                label="Účel"
                options={purposeOptions}
                value={purpose}
                onChange={setPurpose}
              />
              
              <SettingsToggle
                label="Tón"
                options={toneOptions}
                value={tone}
                onChange={setTone}
              />
              
              <SettingsToggle
                label="Intenzita prodeje"
                options={intensityOptions}
                value={intensity}
                onChange={setIntensity}
              />
              
              <SettingsToggle
                label="Délka textu"
                options={lengthOptions}
                value={length}
                onChange={setLength}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Zadání</label>
              <Textarea
                placeholder="Např.: Prodejní text na novou kolekci dámských šatů. Zdůraznit kvalitu materiálu a českou výrobu. Cílová skupina ženy 30-50 let."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[120px] bg-background/50"
              />
            </div>

            <Button
              onClick={handleGenerate}
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

      {/* STEP 3: Output */}
      {currentStep === "output" && output && (
        <div className="max-w-3xl mx-auto">
          <OutputDisplay
            output={output}
            onNewVariant={handleNewVariant}
            onEdit={handleEdit}
            onNew={handleNew}
            primaryLabel="Prodejní text"
            primaryDescription="Text s jasnou výzvou k akci"
          />
        </div>
      )}
    </div>
  );
}
