import { useState, useEffect } from "react";
import { Lightbulb, ArrowRight, ArrowLeft, Loader2, Calendar, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceProps, TextOutputData, SettingOption } from "./types";
import WorkspaceHeader from "./WorkspaceHeader";
import SettingsToggle from "./SettingsToggle";
import OutputDisplay from "./OutputDisplay";
import { useTextGeneration } from "./useTextGeneration";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { ContentCalendar, ContentTask, ContentPlan } from "@/components/app/content-calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Typy obsahu
const contentTypes: SettingOption[] = [
  { id: "content-plan", label: "Obsahový plán", description: "Interaktivní kalendář s denními úkoly" },
  { id: "campaign", label: "Marketingová kampaň", description: "Návrh marketingové kampaně" },
  { id: "topic-ideas", label: "Doporučení témat", description: "Návrh témat podle tvého podnikání" },
];

// Období
const periodOptions: SettingOption[] = [
  { id: "tyden", label: "Týden" },
  { id: "mesic", label: "Měsíc" },
];

// Cíl
const goalOptions: SettingOption[] = [
  { id: "prodej", label: "Prodej" },
  { id: "rust", label: "Růst" },
  { id: "znacka", label: "Značka" },
];

type Step = "select" | "input" | "output" | "calendar";

export default function StrategyPlanningWorkspace({ profile, onBack }: WorkspaceProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [contentType, setContentType] = useState<string | null>(null);
  const [period, setPeriod] = useState("tyden");
  const [goal, setGoal] = useState("rust");
  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState<TextOutputData | null>(null);
  const [calendarPlan, setCalendarPlan] = useState<ContentPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { generate, isGenerating } = useTextGeneration();

  const steps = contentType === "content-plan" 
    ? [
        { label: "Typ plánu" },
        { label: "Nastavení" },
        { label: "Kalendář" },
      ]
    : [
        { label: "Typ plánu" },
        { label: "Zadání" },
        { label: "Výstup" },
      ];

  // Parse JSON response for content plan
  const parseContentPlanResponse = (content: string): ContentTask[] => {
    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            day: item.day || "Den",
            date: item.date || new Date().toISOString().split("T")[0],
            channel: item.channel || "Instagram",
            format: item.format || "Post",
            task: item.task || "",
            goal: item.goal || "",
            recommended_action: item.recommended_action || "Vytvořit obsah",
          }));
        }
      }
      return [];
    } catch (e) {
      console.error("Failed to parse content plan JSON:", e);
      return [];
    }
  };

  // Special parser for strategy - structured output, no ready-to-publish texts
  const parseStrategyResponse = (content: string): { postText: string; notes: null; rawContent: string } => {
    return {
      postText: content.trim(),
      notes: null,
      rawContent: content
    };
  };

  // Map contentType to correct backend type
  const getBackendType = (ct: string): string => {
    switch (ct) {
      case "content-plan": return "content_plan";
      case "campaign": return "campaign";
      case "topic-ideas": return "recommend_topics";
      default: return "content_plan";
    }
  };

  const handleGenerate = async () => {
    if (!contentType) return;
    
    const content = await generate({
      profile,
      type: getBackendType(contentType),
      prompt: inputValue.trim() || "Vytvoř plán podle mého profilu",
      settings: {
        contentType,
        period,
        goal,
        structuredOutput: contentType === "content-plan",
        noReadyTexts: true,
        planningFocus: true,
      }
    });

    if (content) {
      if (contentType === "content-plan") {
        // Parse as JSON for calendar
        const tasks = parseContentPlanResponse(content);
        
        if (tasks.length > 0) {
          const plan: ContentPlan = {
            id: crypto.randomUUID(),
            user_id: "", // Will be set when saving
            name: `Obsahový plán - ${period === "tyden" ? "týden" : "měsíc"}`,
            period: period as "tyden" | "mesic",
            goal: goalOptions.find(g => g.id === goal)?.label || goal,
            tasks,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setCalendarPlan(plan);
          setCurrentStep("calendar");
          toast.success(`Vygenerováno ${tasks.length} úkolů do kalendáře`);
        } else {
          toast.error("Nepodařilo se zpracovat plán. Zkuste to znovu.");
        }
      } else {
        // Regular text output for campaign/topics
        const parsed = parseStrategyResponse(content);
        
        setOutput({
          name: contentTypes.find(t => t.id === contentType)?.label || "Plán",
          sections: [{ id: "plan", title: "Plán", content: parsed.postText }],
          parsed,
          metadata: {
            period: periodOptions.find(p => p.id === period)?.label || period,
            goal: goalOptions.find(g => g.id === goal)?.label || goal,
          }
        });
        setCurrentStep("output");
      }
    }
  };

  const handleSavePlan = async () => {
    if (!calendarPlan) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Pro uložení plánu se musíte přihlásit");
        return;
      }

      const { error } = await supabase.from("content_plans").insert({
        user_id: user.id,
        name: calendarPlan.name,
        period: calendarPlan.period,
        goal: calendarPlan.goal,
        tasks: calendarPlan.tasks as any, // JSONB
      });

      if (error) throw error;
      
      toast.success("Plán byl uložen!");
    } catch (e) {
      console.error("Failed to save plan:", e);
      toast.error("Nepodařilo se uložit plán");
    } finally {
      setIsSaving(false);
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
    setCalendarPlan(null);
    toast.success("Připraveno pro nový plán");
  };

  // Calendar action handlers - navigate to respective workspaces with context
  const handleCreateText = (task: ContentTask) => {
    // Store task context in sessionStorage for the text workspace to pick up
    sessionStorage.setItem("neobot_task_context", JSON.stringify({
      type: "text",
      task: task.task,
      channel: task.channel,
      format: task.format,
      goal: task.goal,
    }));
    navigate("/app/tvorba?workspace=social");
    toast.success("Přesměrováno na tvorbu textu s kontextem");
  };

  const handleCreateScript = (task: ContentTask) => {
    sessionStorage.setItem("neobot_task_context", JSON.stringify({
      type: "script",
      task: task.task,
      channel: task.channel,
      format: task.format,
      goal: task.goal,
    }));
    navigate("/app/tvorba?workspace=video");
    toast.success("Přesměrováno na tvorbu scénáře s kontextem");
  };

  const handleCreateVisual = (task: ContentTask) => {
    sessionStorage.setItem("neobot_task_context", JSON.stringify({
      type: "visual",
      task: task.task,
      channel: task.channel,
      format: task.format,
      goal: task.goal,
    }));
    navigate("/app/tvorba?workspace=image");
    toast.success("Přesměrováno na tvorbu vizuálu s kontextem");
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "select": return 1;
      case "input": return 2;
      case "output": 
      case "calendar": return 3;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <WorkspaceHeader
        icon={Lightbulb}
        title="Strategie & plánování"
        description="Obsahové plány, kampaně a doporučení témat"
        onBack={onBack}
      />

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} />

      {/* STEP 1: Select content type */}
      {currentStep === "select" && (
        <div className="max-w-2xl mx-auto">
          <h2 className="font-semibold text-foreground mb-6 text-center">Jaký plán potřebuješ?</h2>
          <div className="grid gap-4">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="glass rounded-xl p-6 text-left hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {type.id === "content-plan" && (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    {type.id === "campaign" && (
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-accent" />
                      </div>
                    )}
                    {type.id === "topic-ideas" && (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {type.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </div>
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
                label="Období"
                options={periodOptions}
                value={period}
                onChange={setPeriod}
              />
              
              <SettingsToggle
                label="Cíl"
                options={goalOptions}
                value={goal}
                onChange={setGoal}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Doplňující informace (volitelné)</label>
              <Textarea
                placeholder="Např.: Chystáme novou kolekci, chceme se zaměřit na mladší zákazníky..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {contentType === "content-plan" ? "Generuji kalendář..." : "Generuji plán..."}
                </>
              ) : (
                <>
                  {contentType === "content-plan" ? "Vytvořit kalendář" : "Vytvořit plán"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Calendar Output (for content-plan) */}
      {currentStep === "calendar" && calendarPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Upravit nastavení
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSavePlan}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Uložit plán
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewVariant}>
                <Sparkles className="w-4 h-4 mr-1" />
                Nová varianta
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNew}>
                Nový plán
              </Button>
            </div>
          </div>

          <ContentCalendar
            plan={calendarPlan}
            onCreateText={handleCreateText}
            onCreateScript={handleCreateScript}
            onCreateVisual={handleCreateVisual}
          />
        </div>
      )}

      {/* STEP 3: Text Output (for campaign/topics) */}
      {currentStep === "output" && output && (
        <div className="max-w-3xl mx-auto">
          <OutputDisplay
            output={output}
            onNewVariant={handleNewVariant}
            onEdit={handleEdit}
            onNew={handleNew}
            primaryLabel="Strategický plán"
            primaryDescription="Strukturovaný přehled – není určeno k přímé publikaci"
          />
        </div>
      )}
    </div>
  );
}
