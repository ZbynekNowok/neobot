import { useCallback, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaskOutput } from "@/components/app/content-calendar/types";

export interface TaskContext {
  type: string;
  task: string;
  channel: string;
  format: string;
  goal: string;
  planId: string;
  taskDate: string;
  taskIndex: number;
}

export function useTaskOutputSaver() {
  const [isSavingToTask, setIsSavingToTask] = useState(false);
  const [savedToTask, setSavedToTask] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const taskContext = useMemo<TaskContext | null>(() => {
    // Only use URL query params - no sessionStorage persistence
    const planId = searchParams.get("planId");
    const itemId = searchParams.get("itemId");
    
    if (!planId || !itemId) return null;

    try {
      const taskIndex = parseInt(itemId, 10);
      if (isNaN(taskIndex)) return null;

      // Minimal context from URL - only what we need for saving
      return {
        type: "task",
        task: "",
        channel: "",
        format: "",
        goal: "",
        planId,
        taskDate: "",
        taskIndex,
      };
    } catch {
      return null;
    }
  }, [searchParams]);

  const saveOutputToTask = useCallback(async (outputType: "text" | "script" | "visual" | "visual_prompt", content: string) => {
    if (!taskContext?.planId) {
      toast.error("Chybí kontext úkolu");
      return false;
    }

    setIsSavingToTask(true);
    try {
      const { data: plan, error: fetchError } = await supabase
        .from("content_plans")
        .select("tasks")
        .eq("id", taskContext.planId)
        .maybeSingle();

      if (fetchError || !plan) throw new Error("Plan not found");

      const tasks = plan.tasks as any[];
      // Use taskIndex if available, fallback to date-based lookup
      let taskIndex = taskContext.taskIndex >= 0 ? taskContext.taskIndex : -1;
      if (taskIndex === -1) {
        taskIndex = tasks.findIndex((t: any) => t.date === taskContext.taskDate);
      }
      if (taskIndex === -1) throw new Error("Task not found");

      const newOutput: TaskOutput = {
        id: crypto.randomUUID(),
        type: outputType,
        content,
        created_at: new Date().toISOString(),
        is_final: false,
      };

      const existingOutputs = tasks[taskIndex].outputs || [];
      tasks[taskIndex].outputs = [...existingOutputs, newOutput];

      const { error: updateError } = await supabase
        .from("content_plans")
        .update({ tasks: tasks as any, updated_at: new Date().toISOString() })
        .eq("id", taskContext.planId);

      if (updateError) throw updateError;

      setSavedToTask(true);
      toast.success("Výstup uložen k úkolu v plánu");
      return true;
    } catch (e) {
      console.error("Failed to save output to task:", e);
      toast.error("Nepodařilo se uložit výstup k úkolu");
      return false;
    } finally {
      setIsSavingToTask(false);
    }
  }, [taskContext]);

  const navigateBackToTask = useCallback(() => {
    if (!taskContext?.planId) return;
    const params = new URLSearchParams({
      planId: taskContext.planId,
      itemIndex: String(taskContext.taskIndex),
    });
    navigate(`/app/plan?${params.toString()}`);
  }, [taskContext, navigate]);

  return { taskContext, saveOutputToTask, isSavingToTask, savedToTask, navigateBackToTask };
}
