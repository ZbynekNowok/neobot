import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { UserProfile } from "@/components/app/AppLayout";
import { Calendar, Loader2, Plus, Sparkles, ArrowLeft, Save, Trash2, ChevronDown, Check, Copy, CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ContentCalendar, ContentTask, ContentPlan } from "@/components/app/content-calendar";
import SettingsToggle from "@/components/app/text-workspaces/SettingsToggle";
import { SettingOption } from "@/components/app/text-workspaces/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ACTIVE_PLAN_KEY = "neobot_active_plan_id";

const periodOptions: SettingOption[] = [
  { id: "tyden", label: "Týden" },
  { id: "mesic", label: "Měsíc" },
];

const goalOptions: SettingOption[] = [
  { id: "prodej", label: "Prodej" },
  { id: "rust", label: "Růst" },
  { id: "znacka", label: "Značka" },
];

interface PlanListItem {
  id: string;
  name: string;
  period: string;
  created_at: string;
}

type PageState = "loading" | "empty" | "generate" | "calendar";
type ConfirmAction = "switch" | "new" | null;

export default function ContentPlanPage() {
  const { profile } = useOutletContext<{ profile: UserProfile | null }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [existingPlan, setExistingPlan] = useState<ContentPlan | null>(null);
  const [planList, setPlanList] = useState<PlanListItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save state
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<ContentPlan | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doAutoSave = useCallback(async (plan: ContentPlan) => {
    setSaveStatus("saving");
    try {
      const { error } = await supabase
        .from("content_plans")
        .update({ tasks: plan.tasks as any, updated_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw error;
      setSaveStatus("saved");
      setIsDirty(false);
      // Clear "saved" after 3s
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error("Auto-save failed:", e);
      setSaveStatus("error");
      toast.error("Nepodařilo se uložit změny");
    }
  }, []);

  const scheduleAutoSave = useCallback((plan: ContentPlan) => {
    pendingSaveRef.current = plan;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        doAutoSave(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    }, 600);
  }, [doAutoSave]);

  const retryAutoSave = useCallback(() => {
    const plan = pendingSaveRef.current || existingPlan;
    if (plan) doAutoSave(plan);
  }, [doAutoSave, existingPlan]);

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const pendingSwitchIdRef = useRef<string | null>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  // Generation settings
  const [period, setPeriod] = useState("tyden");
  const [goal, setGoal] = useState("rust");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ContentPlan | null>(null);

  // --- Helpers ---

  const setActivePlanId = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_PLAN_KEY, id);
    navigate(`?planId=${id}`, { replace: true });
  }, [navigate]);

  const clearActivePlan = useCallback(() => {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const loadPlanList = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("content_plans")
      .select("id, name, period, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setPlanList(data);
  }, []);

  const transformPlan = (data: any): ContentPlan => ({
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    period: data.period as "tyden" | "mesic",
    goal: data.goal || undefined,
    tasks: (data.tasks as any[]).map((task: any) => ({
      ...task,
      status: task.status || "planned",
    })),
    created_at: data.created_at,
    updated_at: data.updated_at,
  });

  const loadPlanById = useCallback(async (planId: string): Promise<ContentPlan | null> => {
    const { data, error } = await supabase
      .from("content_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();
    if (error || !data) return null;
    return transformPlan(data);
  }, []);

  const loadLatestPlan = useCallback(async (): Promise<ContentPlan | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("content_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return transformPlan(data);
  }, []);

  // --- Init ---

  useEffect(() => {
    const init = async () => {
      await loadPlanList();

      const urlPlanId = searchParams.get("planId");
      const storedPlanId = localStorage.getItem(ACTIVE_PLAN_KEY);
      const targetId = urlPlanId || storedPlanId;

      let plan: ContentPlan | null = null;
      
      // Try to load by URL param first
      if (urlPlanId) {
        plan = await loadPlanById(urlPlanId);
        if (!plan) {
          // URL planId doesn't exist, load latest and show error
          toast.error("Plán nenalezen");
          plan = await loadLatestPlan();
        }
      } else if (storedPlanId) {
        // Try localStorage
        plan = await loadPlanById(storedPlanId);
        if (!plan) {
          // localStorage planId doesn't exist, load latest
          plan = await loadLatestPlan();
        }
      } else {
        // No URL or localStorage, load latest
        plan = await loadLatestPlan();
      }

      if (plan) {
        setExistingPlan(plan);
        setActivePlanId(plan.id);
        setPageState("calendar");
      } else {
        setPageState("empty");
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Switch plan ---

  const switchToPlan = useCallback(async (planId: string) => {
    const plan = await loadPlanById(planId);
    if (plan) {
      setExistingPlan(plan);
      setActivePlanId(plan.id);
      setGeneratedPlan(null);
      setIsDirty(false);
      setPageState("calendar");
    }
  }, [loadPlanById, setActivePlanId]);

  const guardedAction = (action: ConfirmAction, targetPlanId?: string) => {
    if (isDirty) {
      setConfirmAction(action);
      pendingSwitchIdRef.current = targetPlanId || null;
      setShowConfirm(true);
    } else if (action === "switch" && targetPlanId) {
      switchToPlan(targetPlanId);
    } else if (action === "new") {
      doCreateNew();
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    await handleSavePlan();
    executePostConfirmAction();
  };

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    setIsDirty(false);
    executePostConfirmAction();
  };

  const executePostConfirmAction = () => {
    if (confirmAction === "switch" && pendingSwitchIdRef.current) {
      switchToPlan(pendingSwitchIdRef.current);
    } else if (confirmAction === "new") {
      doCreateNew();
    }
    pendingSwitchIdRef.current = null;
    setConfirmAction(null);
  };

  // --- Duplicate ---

  const handleDuplicatePlan = async (planId: string) => {
    try {
      const source = await loadPlanById(planId);
      if (!source) { toast.error("Plán nenalezen"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Přihlaste se"); return; }

      const { data, error } = await supabase
        .from("content_plans")
        .insert({
          user_id: user.id,
          name: `${source.name} (kopie)`,
          period: source.period,
          goal: source.goal || null,
          tasks: source.tasks.map(t => ({ ...t, status: "planned" })) as any,
        })
        .select()
        .single();

      if (error) throw error;

      await loadPlanList();
      // Set active plan ID and navigate with URL param
      localStorage.setItem(ACTIVE_PLAN_KEY, data.id);
      navigate(`?planId=${data.id}`, { replace: true });
      await switchToPlan(data.id);
      toast.success("Plán zduplikován");
    } catch (e) {
      console.error("Duplicate failed:", e);
      toast.error("Nepodařilo se zduplikovat plán");
    }
  };

  // --- Delete ---

  const confirmDeletePlan = (planId: string) => {
    setDeletePlanId(planId);
    setShowDeleteConfirm(true);
  };

  const executeDeletePlan = async () => {
    if (!deletePlanId) return;
    setShowDeleteConfirm(false);
    try {
      const { error } = await supabase.from("content_plans").delete().eq("id", deletePlanId);
      if (error) throw error;

      const wasActive = existingPlan?.id === deletePlanId;
      await loadPlanList();

      if (wasActive) {
        clearActivePlan();
        setExistingPlan(null);
        setIsDirty(false);
        const next = await loadLatestPlan();
        if (next) {
          setExistingPlan(next);
          localStorage.setItem(ACTIVE_PLAN_KEY, next.id);
          navigate(`?planId=${next.id}`, { replace: true });
          setPageState("calendar");
        } else {
          setPageState("empty");
        }
      }
      toast.success("Plán smazán");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error("Nepodařilo se smazat plán");
    } finally {
      setDeletePlanId(null);
    }
  };

  // --- Generate ---

  const parseContentPlanResponse = (content: string): ContentTask[] => {
    try {
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
            status: "planned" as const,
          }));
        }
      }
      return [];
    } catch (e) {
      console.error("Failed to parse content plan JSON:", e);
      return [];
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          profile,
          type: "content_plan",
          prompt: inputValue.trim() || "Vytvoř plán podle mého profilu",
          settings: { period, goal, structuredOutput: true, noReadyTexts: true, planningFocus: true },
        }),
      });
      if (!resp.ok) throw new Error("Failed to generate content");

      let content = "";
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let textBuffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsedChunk = JSON.parse(jsonStr);
              const delta = parsedChunk.choices?.[0]?.delta?.content as string | undefined;
              if (delta) content += delta;
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      }

      const tasks = parseContentPlanResponse(content);
      if (tasks.length > 0) {
        const plan: ContentPlan = {
          id: crypto.randomUUID(),
          user_id: "",
          name: `Obsahový plán - ${period === "tyden" ? "týden" : "měsíc"}`,
          period: period as "tyden" | "mesic",
          goal: goalOptions.find((g) => g.id === goal)?.label || goal,
          tasks,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setGeneratedPlan(plan);
        toast.success(`Vygenerováno ${tasks.length} úkolů`);
      } else {
        toast.error("Nepodařilo se zpracovat plán. Zkuste to znovu.");
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error("Nepodařilo se vygenerovat plán");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Save ---

  const handleSavePlan = async () => {
    const planToSave = generatedPlan || existingPlan;
    if (!planToSave) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Přihlaste se"); return; }

      if (existingPlan && !generatedPlan) {
        const { error } = await supabase
          .from("content_plans")
          .update({ tasks: existingPlan.tasks as any, updated_at: new Date().toISOString() })
          .eq("id", existingPlan.id);
        if (error) throw error;
        setIsDirty(false);
        toast.success("Plán uložen");
      } else if (generatedPlan) {
        const { data, error } = await supabase
          .from("content_plans")
          .insert({
            user_id: user.id,
            name: generatedPlan.name,
            period: generatedPlan.period,
            goal: generatedPlan.goal,
            tasks: generatedPlan.tasks as any,
          })
          .select()
          .single();
        if (error) throw error;

        const saved: ContentPlan = { ...generatedPlan, id: data.id, user_id: user.id };
        setExistingPlan(saved);
        setGeneratedPlan(null);
        // Store active plan and update URL
        localStorage.setItem(ACTIVE_PLAN_KEY, data.id);
        navigate(`?planId=${data.id}`, { replace: true });
        setIsDirty(false);
        setPageState("calendar");
        await loadPlanList();
        toast.success("Plán uložen");
      }
    } catch (e) {
      console.error("Save failed:", e);
      toast.error("Nepodařilo se uložit plán");
    } finally {
      setIsSaving(false);
    }
  };

  const doCreateNew = () => {
    setGeneratedPlan(null);
    setInputValue("");
    setIsDirty(false);
    setPageState("generate");
  };

  const handleCreateNew = () => guardedAction("new");

  // --- Calendar handlers ---

  const [isTaskSaving, setIsTaskSaving] = useState(false);

  const handleCreateText = (task: ContentTask) => {
    const taskIndex = existingPlan?.tasks.indexOf(task) ?? -1;
    navigate(`/app/tvorba?workspace=text&planId=${existingPlan?.id}&itemId=${taskIndex}`);
  };

  const handleCreateScript = (task: ContentTask) => {
    const taskIndex = existingPlan?.tasks.indexOf(task) ?? -1;
    navigate(`/app/tvorba?workspace=video&planId=${existingPlan?.id}&itemId=${taskIndex}`);
  };

  const handleCreateVisual = (task: ContentTask) => {
    const taskIndex = existingPlan?.tasks.indexOf(task) ?? -1;
    navigate(`/app/tvorba?workspace=image&planId=${existingPlan?.id}&itemId=${taskIndex}`);
  };

  const handleUpdateTask = async (updatedTask: ContentTask, taskIndex: number) => {
    if (!existingPlan || taskIndex < 0) return;
    setIsTaskSaving(true);
    const updatedTasks = existingPlan.tasks.map((t, i) =>
      i === taskIndex ? updatedTask : t
    );
    const updatedPlan = { ...existingPlan, tasks: updatedTasks };
    setExistingPlan(updatedPlan);
    setIsDirty(true);
    scheduleAutoSave(updatedPlan);
    setIsTaskSaving(false);
  };

  const handleUpdateTaskStatus = async (taskIndex: number, status: "planned" | "done") => {
    if (!existingPlan) return;
    const updatedTasks = existingPlan.tasks.map((t, i) =>
      i === taskIndex ? { ...t, status } : t
    );
    const updatedPlan = { ...existingPlan, tasks: updatedTasks };
    setExistingPlan(updatedPlan);
    setIsDirty(true);
    scheduleAutoSave(updatedPlan);
  };

  const handleMoveTask = async (taskIndex: number, newDate: string, newDay: string) => {
    if (!existingPlan || taskIndex < 0) return;
    const updatedTasks = existingPlan.tasks.map((t, i) =>
      i === taskIndex ? { ...t, date: newDate, day: newDay } : t
    );
    const updatedPlan = { ...existingPlan, tasks: updatedTasks };
    setExistingPlan(updatedPlan);
    setIsDirty(true);
    scheduleAutoSave(updatedPlan);
  };

  // --- Plan Selector ---

  const PlanSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Calendar className="w-4 h-4" />
          <span className="max-w-[200px] truncate">
            {existingPlan?.name || "Moje plány"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {planList.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Žádné plány</div>
        ) : (
          planList.map((p) => (
            <div key={p.id} className="group relative">
              <DropdownMenuItem
                onClick={() => {
                  if (p.id !== existingPlan?.id) guardedAction("switch", p.id);
                }}
                className="flex items-center justify-between pr-20"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.period === "tyden" ? "Týden" : "Měsíc"} •{" "}
                    {new Date(p.created_at).toLocaleDateString("cs-CZ")}
                  </div>
                </div>
                {existingPlan?.id === p.id && (
                  <Check className="w-4 h-4 text-primary ml-2 shrink-0" />
                )}
              </DropdownMenuItem>
              {/* Inline actions */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicatePlan(p.id); }}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  title="Duplikovat"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); confirmDeletePlan(p.id); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Smazat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nový plán
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // --- Render ---

  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Načítám obsahový plán...</p>
        </div>
      </div>
    );
  }

  if (pageState === "empty") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">Obsahový plán</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Naplánuj si obsah dopředu. AI ti vytvoří interaktivní kalendář s denními úkoly.
          </p>
          <Button onClick={() => doCreateNew()} size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Plus className="w-5 h-5 mr-2" />
            Nový plán
          </Button>
        </div>
      </div>
    );
  }

  if (pageState === "generate" || generatedPlan) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => {
            if (existingPlan) { setGeneratedPlan(null); setPageState("calendar"); }
            else if (planList.length > 0) { switchToPlan(planList[0].id); }
            else setPageState("empty");
          }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Zpět
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {generatedPlan ? "Nový obsahový plán" : "Vytvořit obsahový plán"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {generatedPlan ? "Zkontroluj a ulož plán" : "Nastav období a cíl"}
            </p>
          </div>
        </div>

        {!generatedPlan ? (
          <div className="glass rounded-xl p-6 space-y-6">
            <div className="space-y-4">
              <SettingsToggle label="Období" options={periodOptions} value={period} onChange={setPeriod} />
              <SettingsToggle label="Cíl" options={goalOptions} value={goal} onChange={setGoal} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Doplňující informace (volitelné)</label>
              <Textarea
                placeholder="Např.: Chystáme novou kolekci..."
                value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90" size="lg">
              {isGenerating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generuji kalendář...</>)
                : (<><Sparkles className="w-4 h-4 mr-2" />Vytvořit kalendář</>)}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGeneratedPlan(null)}>
                <Sparkles className="w-4 h-4 mr-1" /> Nová varianta
              </Button>
              <Button size="sm" onClick={handleSavePlan} disabled={isSaving}
                className="bg-gradient-to-r from-primary to-accent">
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Uložit plán
              </Button>
            </div>
            <ContentCalendar plan={generatedPlan} onCreateText={handleCreateText}
              onCreateScript={handleCreateScript} onCreateVisual={handleCreateVisual} />
          </div>
        )}
      </div>
    );
  }

  // Calendar state
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <PlanSelector />
          <p className="text-sm text-muted-foreground">
            {existingPlan?.tasks.filter((t) => t.status === "done").length || 0} z{" "}
            {existingPlan?.tasks.length || 0} hotovo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ukládám…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Check className="w-3.5 h-3.5" /> Uloženo
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <CloudOff className="w-3.5 h-3.5" /> Chyba uložení
              <button onClick={retryAutoSave} className="ml-1 underline hover:no-underline flex items-center gap-0.5">
                <RefreshCw className="w-3 h-3" /> Zkusit znovu
              </button>
            </span>
          )}
        </div>
      </div>

      {existingPlan && (
        <ContentCalendar plan={existingPlan} onCreateText={handleCreateText}
          onCreateScript={handleCreateScript} onCreateVisual={handleCreateVisual}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onUpdateTask={handleUpdateTask} onMoveTask={handleMoveTask} isTaskSaving={isTaskSaving}
          initialTaskIndex={searchParams.get("itemIndex") ? parseInt(searchParams.get("itemIndex")!, 10) : undefined} />
      )}

      {/* Unsaved changes dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuložené změny</AlertDialogTitle>
            <AlertDialogDescription>
              Máte neuložené změny v aktuálním plánu. Co chcete udělat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => { setShowConfirm(false); pendingSwitchIdRef.current = null; setConfirmAction(null); }}>
              Zrušit
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleConfirmDiscard}>Zahodit</Button>
            <AlertDialogAction onClick={handleConfirmSave}>Uložit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat plán</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete tento plán smazat? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
