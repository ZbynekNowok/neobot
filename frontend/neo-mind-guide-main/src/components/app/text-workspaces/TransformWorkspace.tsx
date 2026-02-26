import { useState } from "react";
import { Wand2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceProps, TextOutputData, SettingOption } from "./types";
import WorkspaceHeader from "./WorkspaceHeader";
import SettingsToggle from "./SettingsToggle";
import OutputDisplay from "./OutputDisplay";
import { useTextGeneration } from "./useTextGeneration";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

// Typy akcí
const actionTypes: SettingOption[] = [
  { id: "rewrite", label: "Přepsat text", description: "Kompletní přepis textu do nové podoby" },
  { id: "simplify", label: "Zjednodušit text", description: "Zjednodušení složitého textu" },
  { id: "shorten", label: "Zkrátit text", description: "Zkrácení textu při zachování podstaty" },
  { id: "tone-change", label: "Změnit tón", description: "Úprava tónu komunikace" },
];

// Požadovaný tón (pouze pro "tone-change")
const toneOptions: SettingOption[] = [
  { id: "formalni", label: "Formální" },
  { id: "neformalni", label: "Neformální" },
  { id: "hravy", label: "Hravý" },
  { id: "profesionalni", label: "Profesionální" },
  { id: "presvedcivy", label: "Přesvědčivý" },
];

type Step = "select" | "input" | "output";

export default function TransformWorkspace({ profile, onBack }: WorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [actionType, setActionType] = useState<string | null>(null);
  const [targetTone, setTargetTone] = useState("neformalni");
  const [originalText, setOriginalText] = useState("");
  const [output, setOutput] = useState<TextOutputData | null>(null);
  
  const { generate, isGenerating } = useTextGeneration();

  const steps = [
    { label: "Typ úpravy" },
    { label: "Původní text" },
    { label: "Výstup" },
  ];

  // Special parser - only return transformed text, no notes
  const parseTransformResponse = (content: string): { postText: string; notes: null; rawContent: string } => {
    // Remove any explanatory headers or notes
    let cleaned = content
      .replace(/^(?:##?\s*)?(?:Upravený text|Přepsaný text|Zjednodušený text|Zkrácený text)[:\s]*/im, "")
      .replace(/^(?:##?\s*)?(?:Vysvětlení|Poznámka|Komentář)[:\s]*[\s\S]*$/im, "")
      .trim();

    return {
      postText: cleaned,
      notes: null,
      rawContent: content
    };
  };

  // Map actionType to correct backend type
  const getBackendType = (action: string): string => {
    switch (action) {
      case "rewrite": return "rewrite";
      case "simplify": return "simplify";
      case "shorten": return "shorten";
      case "tone-change": return "change_tone";
      default: return "rewrite";
    }
  };

  const handleGenerate = async () => {
    if (!originalText.trim() || !actionType) return;
    
    const content = await generate({
      profile,
      type: getBackendType(actionType),
      prompt: originalText.trim(),
      settings: {
        actionType,
        targetTone: actionType === "tone-change" ? targetTone : undefined,
        noExplanation: true,
        noNotes: true,
        outputOnly: true,
      }
    });

    if (content) {
      const parsed = parseTransformResponse(content);
      
      setOutput({
        name: actionTypes.find(t => t.id === actionType)?.label || "Upravený text",
        sections: [{ id: "result", title: "Výsledek", content: parsed.postText }],
        parsed,
        metadata: actionType === "tone-change" ? {
          tone: toneOptions.find(t => t.id === targetTone)?.label || targetTone,
        } : undefined
      });
      setCurrentStep("output");
    }
  };

  const handleSelectAction = (action: string) => {
    setActionType(action);
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
    setActionType(null);
    setOriginalText("");
    setOutput(null);
    toast.success("Připraveno pro novou úpravu");
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
        icon={Wand2}
        title="Úpravy textu"
        description="Přepis, zjednodušení, zkrácení nebo změna tónu"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select action type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Co chceš s textem udělat?</h2>
          <div className="grid gap-4">
            {actionTypes.map((action) => (
              <button
                key={action.id}
                onClick={() => handleSelectAction(action.id)}
                className="glass rounded-xl p-6 text-left hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Input */}
      {currentStep === "input" && actionType && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {actionTypes.find(t => t.id === actionType)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {actionTypes.find(t => t.id === actionType)?.description}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("select")}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zpět
              </Button>
            </div>

            {actionType === "tone-change" && (
              <SettingsToggle
                label="Požadovaný tón"
                options={toneOptions}
                value={targetTone}
                onChange={setTargetTone}
              />
            )}

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Původní text</label>
              <Textarea
                placeholder="Vlož sem text, který chceš upravit..."
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                className="min-h-[200px] bg-background/50"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!originalText.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upravuji text...
                </>
              ) : (
                <>
                  Upravit text
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
            primaryLabel="Upravený text"
            primaryDescription="Pouze upravený text bez vysvětlení"
          />
        </div>
      )}
    </div>
  );
}
