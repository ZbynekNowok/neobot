import { useState, useMemo, useEffect } from "react";
import { Calendar, List, Info, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContentTask, ContentPlan, CalendarView } from "./types";
import CalendarGrid from "./CalendarGrid";
import TaskDetailModal from "./TaskDetailModal";
import { format as fnsFormat, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

interface ContentCalendarProps {
  plan: ContentPlan;
  onCreateText: (task: ContentTask) => void;
  onCreateScript: (task: ContentTask) => void;
  onCreateVisual: (task: ContentTask) => void;
  onUpdateTaskStatus?: (taskIndex: number, status: "planned" | "done") => void;
  onUpdateTask?: (updatedTask: ContentTask, taskIndex: number) => void;
  onMoveTask?: (taskIndex: number, newDate: string, newDay: string) => void;
  isTaskSaving?: boolean;
  initialTaskIndex?: number;
}

export default function ContentCalendar({
  plan,
  onCreateText,
  onCreateScript,
  onCreateVisual,
  onUpdateTaskStatus,
  onUpdateTask,
  onMoveTask,
  isTaskSaving,
  initialTaskIndex,
}: ContentCalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [selectedTask, setSelectedTask] = useState<ContentTask | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(-1);
  const [showModal, setShowModal] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize to the plan's first task date so the plan is visible immediately
    const firstDate = plan.tasks
      .map((t) => t.date)
      .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()[0];
    return firstDate ? parseISO(firstDate) : new Date();
  });

  // Compute plan date range
  const planRange = useMemo(() => {
    const dates = plan.tasks
      .map((t) => t.date)
      .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (dates.length === 0) return null;
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [plan.tasks]);

  const rangeLabel = useMemo(() => {
    if (!planRange) return null;
    const minDate = parseISO(planRange.min);
    const maxDate = parseISO(planRange.max);
    return `${fnsFormat(minDate, "d. M. yyyy", { locale: cs })} – ${fnsFormat(maxDate, "d. M. yyyy", { locale: cs })}`;
  }, [planRange]);

  // Auto-open modal when initialTaskIndex is provided
  useEffect(() => {
    if (initialTaskIndex !== undefined && initialTaskIndex >= 0 && initialTaskIndex < plan.tasks.length) {
      const task = plan.tasks[initialTaskIndex];
      setSelectedTask(task);
      setSelectedTaskIndex(initialTaskIndex);
      setShowModal(true);
    }
  }, [initialTaskIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTaskClick = (task: ContentTask) => {
    setSelectedTask(task);
    setSelectedTaskIndex(plan.tasks.indexOf(task));
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  // Get today's tasks
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = plan.tasks.filter((t) => t.date === today);

  return (
    <div className="space-y-3">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">{plan.name}</h2>
          <p className="text-xs text-muted-foreground">
            {plan.tasks.length} úkolů • {plan.period === "tyden" ? "Týdenní" : "Měsíční"}
            {rangeLabel && <span className="ml-1">• 📅 {rangeLabel}</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant={view === "week" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => setView("week")}>
            <Calendar className="w-3.5 h-3.5 mr-1" /> Týden
          </Button>
          <Button variant={view === "month" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => setView("month")}>
            <List className="w-3.5 h-3.5 mr-1" /> Měsíc
          </Button>
        </div>
      </div>

      {/* Today's tasks highlight (compact) */}
      {todayTasks.length > 0 && (
        <div className="glass rounded-lg p-3 border-l-4 border-l-primary">
          <h3 className="font-semibold text-foreground text-sm mb-1.5">🎯 Dnes</h3>
          <div className="flex flex-wrap gap-1.5">
            {todayTasks.map((task, idx) => (
              <button
                key={idx}
                onClick={() => handleTaskClick(task)}
                className="text-left px-2 py-1 rounded-md bg-background/50 hover:bg-background transition-colors text-xs"
              >
                <span className="font-medium text-foreground">{task.channel}</span>
                <span className="text-muted-foreground ml-1">{task.format}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="glass rounded-xl p-3">
        <CalendarGrid
          tasks={plan.tasks}
          view={view}
          onTaskClick={handleTaskClick}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onMoveTask={onMoveTask}
          planRange={planRange}
        />
      </div>

      {/* Strategy explanation (collapsed by default) */}
      {plan.goal && (
        <Collapsible open={showStrategy} onOpenChange={setShowStrategy}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Proč to funguje</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  showStrategy ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="glass rounded-xl p-4 mt-2">
              <p className="text-sm text-muted-foreground">{plan.goal}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        open={showModal}
        onClose={handleCloseModal}
        onCreateText={onCreateText}
        onCreateScript={onCreateScript}
        onCreateVisual={onCreateVisual}
        onUpdateTask={onUpdateTask ? (updated) => {
          onUpdateTask(updated, selectedTaskIndex);
          setSelectedTask(updated);
        } : undefined}
        isSaving={isTaskSaving}
      />
    </div>
  );
}
