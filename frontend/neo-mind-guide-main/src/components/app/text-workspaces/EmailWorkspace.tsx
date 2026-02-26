import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceProps, TextOutputData, SettingOption } from "./types";
import WorkspaceHeader from "./WorkspaceHeader";
import SettingsToggle from "./SettingsToggle";
import { useTextGeneration } from "./useTextGeneration";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

// Typy obsahu
const contentTypes: SettingOption[] = [
  { id: "single-email", label: "Jednorázový e-mail", description: "Jeden e-mail pro konkrétní účel" },
  { id: "newsletter", label: "Newsletter", description: "Pravidelný informační e-mail" },
  { id: "sales-email", label: "Prodejní e-mail", description: "E-mail zaměřený na prodej" },
  { id: "email-sequence", label: "Automatická sekvence", description: "Série e-mailů pro onboarding nebo prodej" },
];

// Účel
const purposeOptions: SettingOption[] = [
  { id: "prodej", label: "Prodej" },
  { id: "informovani", label: "Informování" },
  { id: "onboarding", label: "Onboarding" },
];

// Tón
const toneOptions: SettingOption[] = [
  { id: "osobni", label: "Osobní" },
  { id: "profesionalni", label: "Profesionální" },
];

// Délka
const lengthOptions: SettingOption[] = [
  { id: "kratky", label: "Krátký" },
  { id: "stredni", label: "Střední" },
];

interface EmailOutput {
  subject: string;
  preheader: string;
  body: string;
}

type Step = "select" | "input" | "output";

export default function EmailWorkspace({ profile, onBack }: WorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [contentType, setContentType] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("informovani");
  const [tone, setTone] = useState("osobni");
  const [length, setLength] = useState("stredni");
  const [inputValue, setInputValue] = useState("");
  const [emailOutput, setEmailOutput] = useState<EmailOutput | null>(null);
  const [rawOutput, setRawOutput] = useState<TextOutputData | null>(null);
  
  const { generate, isGenerating } = useTextGeneration();

  const steps = [
    { label: "Typ e-mailu" },
    { label: "Zadání" },
    { label: "Výstup" },
  ];

  // Parse email-specific format
  const parseEmailResponse = (content: string): EmailOutput => {
    let subject = "";
    let preheader = "";
    let body = content;

    // Extract subject
    const subjectMatch = content.match(/(?:##?\s*)?(?:Předmět|Subject)[:\s]*([^\n]+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = body.replace(subjectMatch[0], "").trim();
    }

    // Extract preheader
    const preheaderMatch = body.match(/(?:##?\s*)?(?:Preheader|Preview)[:\s]*([^\n]+)/i);
    if (preheaderMatch) {
      preheader = preheaderMatch[1].trim();
      body = body.replace(preheaderMatch[0], "").trim();
    }

    // Clean body
    body = body
      .replace(/^(?:##?\s*)?(?:Tělo e-mailu|Obsah|Body)[:\s]*/im, "")
      .replace(/^---+\s*/gm, "")
      .trim();

    return { subject, preheader, body };
  };

  const handleGenerate = async () => {
    if (!inputValue.trim() || !contentType) return;
    
    const content = await generate({
      profile,
      type: "email_copy", // Correct backend type
      prompt: inputValue.trim(),
      settings: {
        contentType,
        purpose,
        tone,
        length,
        noHashtags: true,
        noSocialMentions: true,
        emailFormat: true,
      }
    });

    if (content) {
      const parsed = parseEmailResponse(content);
      setEmailOutput(parsed);
      setRawOutput({
        name: contentTypes.find(t => t.id === contentType)?.label || "E-mail",
        sections: [
          { id: "subject", title: "Předmět", content: parsed.subject },
          { id: "preheader", title: "Preheader", content: parsed.preheader },
          { id: "body", title: "Tělo e-mailu", content: parsed.body },
        ],
        parsed: {
          postText: parsed.body,
          notes: null,
          rawContent: content
        },
        metadata: {
          purpose: purposeOptions.find(p => p.id === purpose)?.label || purpose,
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} zkopírován`);
  };

  const handleCopyAll = () => {
    if (!emailOutput) return;
    const text = `Předmět: ${emailOutput.subject}\nPreheader: ${emailOutput.preheader}\n\n${emailOutput.body}`;
    navigator.clipboard.writeText(text);
    toast.success("Celý e-mail zkopírován");
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
    setEmailOutput(null);
    setRawOutput(null);
    toast.success("Připraveno pro nový e-mail");
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
        icon={Mail}
        title="E-maily & Newslettery"
        description="Jednorázové e-maily, newslettery, prodejní e-maily a sekvence"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select content type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Jaký e-mail potřebuješ?</h2>
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
                label="Délka"
                options={lengthOptions}
                value={length}
                onChange={setLength}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Zadání</label>
              <Textarea
                placeholder="Např.: Newsletter o novinkách v e-shopu. Chceme informovat o nové kolekci a nabídnout 10% slevu pro stávající zákazníky."
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
                  Generuji e-mail...
                </>
              ) : (
                <>
                  Vytvořit e-mail
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Output - Email specific layout */}
      {currentStep === "output" && emailOutput && rawOutput && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">{rawOutput.name}</h3>
            {rawOutput.metadata && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(rawOutput.metadata).map(([key, value]) => (
                  <span key={key} className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="glass rounded-xl p-5 border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground">Předmět</h4>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(emailOutput.subject, "Předmět")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-foreground font-medium">{emailOutput.subject}</p>
          </div>

          {/* Preheader */}
          {emailOutput.preheader && (
            <div className="glass rounded-xl p-5 border-l-4 border-l-accent/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">Preheader</h4>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(emailOutput.preheader, "Preheader")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">{emailOutput.preheader}</p>
            </div>
          )}

          {/* Body */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-foreground">Tělo e-mailu</h4>
              <Button onClick={() => handleCopy(emailOutput.body, "Tělo e-mailu")} className="bg-primary hover:bg-primary/90">
                <Copy className="w-4 h-4 mr-1" />
                Zkopírovat
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-foreground whitespace-pre-wrap leading-relaxed">
              {emailOutput.body}
            </div>
          </div>

          {/* Copy All */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
              <Copy className="w-4 h-4 mr-1" />
              Zkopírovat celý e-mail
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="ghost" onClick={handleNewVariant}>
              Vytvořit variantu
            </Button>
            <Button variant="ghost" onClick={handleEdit}>
              Upravit zadání
            </Button>
            <Button variant="ghost" onClick={handleNew}>
              Nový e-mail
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
