import { useState } from "react";
import { Package, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
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
  { id: "product-desc", label: "Popis produktu", description: "Prodejní popis produktu s benefity" },
  { id: "service-desc", label: "Popis služby", description: "Detailní popis služby" },
  { id: "faq", label: "FAQ", description: "Časté otázky a odpovědi" },
];

// Tón
const toneOptions: SettingOption[] = [
  { id: "prodejni", label: "Prodejní" },
  { id: "informativni", label: "Informativní" },
];

type Step = "select" | "input" | "output";

export default function ProductsWorkspace({ profile, onBack }: WorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [contentType, setContentType] = useState<string | null>(null);
  const [tone, setTone] = useState("prodejni");
  const [productName, setProductName] = useState("");
  const [benefits, setBenefits] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
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
      case "product-desc": return "product_description";
      case "service-desc": return "service_description";
      case "faq": return "faq";
      default: return "product_description";
    }
  };

  const handleGenerate = async () => {
    if (!productName.trim() || !contentType) return;
    
    const prompt = `${productName.trim()}${benefits.trim() ? `\n\nHlavní přínosy: ${benefits.trim()}` : ""}${targetAudience.trim() ? `\n\nCílová skupina: ${targetAudience.trim()}` : ""}`;
    
    const content = await generate({
      profile,
      type: getBackendType(contentType),
      prompt,
      settings: {
        contentType,
        tone,
        length: "stredni",
        noSocialElements: true,
        focusBenefits: true,
        readability: true,
      }
    });

    if (content) {
      const parsed = parseResponse(content);
      const sections = parseToSections(content);
      
      setOutput({
        name: contentTypes.find(t => t.id === contentType)?.label || "Popis",
        sections,
        parsed,
        metadata: {
          product: productName,
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
    setProductName("");
    setBenefits("");
    setTargetAudience("");
    setOutput(null);
    toast.success("Připraveno pro nový popis");
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
        icon={Package}
        title="Produkty & Služby"
        description="Popisy produktů, služeb a FAQ"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select content type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Co potřebuješ popsat?</h2>
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
                label="Tón"
                options={toneOptions}
                value={tone}
                onChange={setTone}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Název produktu / služby *</label>
              <Input
                placeholder="Např.: Prémiové sójové svíčky"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Hlavní přínosy</label>
              <Textarea
                placeholder="Např.: Dlouhá doba hoření (40+ hodin), přírodní vůně, ruční výroba v ČR, ekologické balení"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="min-h-[80px] bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Cílová skupina</label>
              <Input
                placeholder="Např.: Ženy 25-45 let, které dbají na kvalitu a ekologii"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!productName.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generuji popis...
                </>
              ) : (
                <>
                  Vytvořit popis
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
            primaryLabel={contentType === "faq" ? "FAQ" : "Popis"}
            primaryDescription="Připravený text s jasnými benefity"
          />
        </div>
      )}
    </div>
  );
}
