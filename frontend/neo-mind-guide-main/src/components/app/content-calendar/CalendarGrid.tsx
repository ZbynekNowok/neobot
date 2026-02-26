import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentTask, CalendarView, formatColors, channelIcons, dayNames } from "./types";
import { addDays, startOfWeek, format, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";

interface CalendarGridProps {
  tasks: ContentTask[];
  view: CalendarView;
  onTaskClick: (task: ContentTask) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onMoveTask?: (taskIndex: number, newDate: string, newDay: string) => void;
  planRange?: { min: string; max: string } | null;
}

export default function CalendarGrid({
  tasks,
  view,
  onTaskClick,
  currentDate,
  onDateChange,
  onMoveTask,
  planRange,
}: CalendarGridProps) {
  const [dragTaskIndex, setDragTaskIndex] = useState<number | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const getTasksForDate = (date: Date): ContentTask[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter((t) => t.date === dateStr);
  };

  const isInPlanRange = (date: Date): boolean => {
    if (!planRange) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr >= planRange.min && dateStr <= planRange.max;
  };

  const navigatePrev = () => {
    if (view === "week") onDateChange(subWeeks(currentDate, 2));
    else onDateChange(subMonths(currentDate, 1));
  };

  const navigateNext = () => {
    if (view === "week") onDateChange(addWeeks(currentDate, 2));
    else onDateChange(addMonths(currentDate, 1));
  };

  const handleDragStart = useCallback((e: React.DragEvent, task: ContentTask) => {
    const idx = tasks.indexOf(task);
    setDragTaskIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    // Add a slight delay to allow the drag image to be captured
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  }, [tasks]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
    setDragTaskIndex(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const dateStr = format(date, "yyyy-MM-dd");
    const dayName = format(date, "EEEE", { locale: cs });
    // Capitalize first letter
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    const taskIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(taskIdx) && tasks[taskIdx]?.date !== dateStr && onMoveTask) {
      onMoveTask(taskIdx, dateStr, capitalizedDay);
    }
    setDragTaskIndex(null);
    setDragOverDate(null);
  }, [tasks, onMoveTask]);

  const renderTaskCard = (task: ContentTask, idx: number, compact = false) => {
    const formatKey = task.format?.toLowerCase() || "default";
    const colors = formatColors[formatKey] || formatColors.default;
    const channelIcon = channelIcons[task.channel?.toLowerCase()] || "📱";
    const globalIdx = tasks.indexOf(task);
    const isDragging = dragTaskIndex === globalIdx;

    if (compact) {
      return (
        <button
          key={idx}
          onClick={() => onTaskClick(task)}
          draggable={!!onMoveTask}
          onDragStart={(e) => handleDragStart(e, task)}
          onDragEnd={handleDragEnd}
          className={`w-full text-left px-1 py-0.5 rounded ${colors.bg} hover:opacity-80 transition-all ${
            isDragging ? "opacity-50 scale-95" : ""
          } ${onMoveTask ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <span className={`text-[10px] font-medium truncate block ${colors.text}`}>
            {task.format}
          </span>
        </button>
      );
    }

    return (
      <div
        key={idx}
        draggable={!!onMoveTask}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        onClick={() => onTaskClick(task)}
        className={`w-full text-left p-1.5 rounded border ${colors.bg} ${colors.border} hover:opacity-80 transition-all ${
          isDragging ? "opacity-50 scale-95" : ""
        } ${onMoveTask ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-1">
          {onMoveTask && <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
          <span className="text-xs">{channelIcon}</span>
          <span className={`text-xs font-medium truncate ${colors.text}`}>
            {task.format}
          </span>
        </div>
        <p className="text-xs text-foreground/80 truncate mt-0.5">
          {task.task}
        </p>
      </div>
    );
  };

  const renderWeekView = () => {
    // Show 2 weeks (14 days) so plans spanning across weeks are fully visible
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Headers */}
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day.slice(0, 2)}
          </div>
        ))}

        {/* 2 weeks of day cells */}
        {days.map((date) => {
          const dayTasks = getTasksForDate(date);
          const isToday = isSameDay(date, new Date());
          const dateStr = format(date, "yyyy-MM-dd");
          const isDropTarget = dragOverDate === dateStr && dragTaskIndex !== null;
          const inRange = isInPlanRange(date);

          return (
            <div
              key={date.toISOString()}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              className={`min-h-[90px] rounded-lg border p-1.5 transition-all duration-200 ${
                isDropTarget
                  ? "border-primary border-2 bg-primary/10 scale-[1.02]"
                  : isToday
                  ? "border-primary bg-primary/5"
                  : inRange
                  ? "border-border bg-background/50"
                  : "border-border/40 bg-muted/30 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isToday ? "text-primary" : inRange ? "text-foreground" : "text-muted-foreground"}`}>
                  {format(date, "d")}
                </span>
                {dayTasks.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">{dayTasks.length}x</span>
                )}
              </div>

              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task, idx) => renderTaskCard(task, idx))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayTasks.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days = Array.from({ length: 42 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day.slice(0, 2)}
          </div>
        ))}

        {days.map((date) => {
          const dayTasks = getTasksForDate(date);
          const isToday = isSameDay(date, new Date());
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dateStr = format(date, "yyyy-MM-dd");
          const isDropTarget = dragOverDate === dateStr && dragTaskIndex !== null;
          const inRange = isInPlanRange(date);

          return (
            <div
              key={date.toISOString()}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              className={`min-h-[80px] rounded-lg border p-1 transition-all duration-200 ${
                isDropTarget
                  ? "border-primary border-2 bg-primary/10 scale-[1.02]"
                  : isToday
                  ? "border-primary bg-primary/5"
                  : inRange && isCurrentMonth
                  ? "border-border bg-primary/[0.03]"
                  : isCurrentMonth
                  ? "border-border bg-background/50"
                  : "border-border/30 bg-muted/20 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${
                  isToday ? "text-primary" : inRange && isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {format(date, "d")}
                </span>
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task, idx) => renderTaskCard(task, idx, true))}
                {dayTasks.length > 2 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayTasks.length - 2}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={navigatePrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">
            {view === "week"
              ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d. M.", { locale: cs })} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 13), "d. M. yyyy", { locale: cs })}`
              : format(currentDate, "LLLL yyyy", { locale: cs })}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={navigateNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {view === "week" ? renderWeekView() : renderMonthView()}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Typy:</span>
        {Object.entries(formatColors)
          .filter(([key]) => key !== "default")
          .map(([key, colors]) => (
            <Badge key={key} className={`${colors.bg} ${colors.border} ${colors.text} border text-xs capitalize`}>
              {key}
            </Badge>
          ))}
      </div>
    </div>
  );
}
