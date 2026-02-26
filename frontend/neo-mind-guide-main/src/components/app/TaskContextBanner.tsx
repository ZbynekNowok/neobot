import { CalendarCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskContext } from "@/hooks/useTaskOutputSaver";

interface TaskContextBannerProps {
  taskContext: TaskContext;
  onNavigateBack: () => void;
}

export default function TaskContextBanner({ taskContext, onNavigateBack }: TaskContextBannerProps) {
  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
        <span className="text-foreground">
          Generuješ výstup pro úkol: <strong>{taskContext.channel} {taskContext.format}</strong>
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onNavigateBack} className="shrink-0 text-xs">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        Zpět do plánu
      </Button>
    </div>
  );
}
