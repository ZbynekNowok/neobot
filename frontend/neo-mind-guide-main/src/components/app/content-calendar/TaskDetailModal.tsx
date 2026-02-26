import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Video, Image, Calendar, Target, Hash, Pencil, Save, X, Loader2, Copy, Star, Trash2 } from "lucide-react";
import { ContentTask, TaskOutput, formatColors, channelIcons } from "./types";

const channelOptions = ["Instagram", "Facebook", "TikTok", "LinkedIn", "Twitter", "Threads", "X", "Email", "Web", "YouTube", "Blog"];
const formatOptions = ["Stories", "Post", "Reel", "Reels", "Live", "Blog", "Email", "Newsletter", "Carousel", "Article"];

interface TaskDetailModalProps {
  task: ContentTask | null;
  open: boolean;
  onClose: () => void;
  onCreateText: (task: ContentTask) => void;
  onCreateScript: (task: ContentTask) => void;
  onCreateVisual: (task: ContentTask) => void;
  onUpdateTask?: (updatedTask: ContentTask) => void;
  isSaving?: boolean;
}

export default function TaskDetailModal({
  task,
  open,
  onClose,
  onCreateText,
  onCreateScript,
  onCreateVisual,
  onUpdateTask,
  isSaving,
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ContentTask | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  useEffect(() => {
    if (task && open) {
      setEditData({ ...task });
      setIsEditing(false);
      setIsDirty(false);
    }
  }, [task, open]);

  if (!task) return null;

  const currentTask = isEditing && editData ? editData : task;
  const formatKey = currentTask.format?.toLowerCase() || "default";
  const colors = formatColors[formatKey] || formatColors.default;
  const channelIcon = channelIcons[currentTask.channel?.toLowerCase()] || "📱";

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
    } catch {
      return dateStr;
    }
  };

  const handleEdit = (field: keyof ContentTask, value: string) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!editData || !onUpdateTask) return;
    onUpdateTask(editData);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      setIsEditing(false);
      setEditData(task ? { ...task } : null);
    }
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDirtyDiscard = () => {
    setShowDirtyConfirm(false);
    setIsDirty(false);
    setIsEditing(false);
    setEditData(task ? { ...task } : null);
    onClose();
  };

  const handleDirtySave = () => {
    setShowDirtyConfirm(false);
    handleSave();
    onClose();
  };

  // --- Output actions ---
  const handleToggleFinal = (outputId: string) => {
    if (!onUpdateTask) return;
    const outputs = (currentTask.outputs || []).map(o =>
      o.id === outputId ? { ...o, is_final: !o.is_final } : o
    );
    const updated = { ...currentTask, outputs };
    onUpdateTask(updated);
  };

  const handleDeleteOutput = (outputId: string) => {
    if (!onUpdateTask) return;
    const outputs = (currentTask.outputs || []).filter(o => o.id !== outputId);
    const updated = { ...currentTask, outputs };
    onUpdateTask(updated);
  };

  const sortedOutputs = [...(currentTask.outputs || [])].sort((a, b) => {
    // Final first, then by date desc
    if (a.is_final !== b.is_final) return a.is_final ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleRequestClose(); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Detail úkolu
              </DialogTitle>
              {onUpdateTask && !isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-1" /> Upravit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date (read-only) */}
            <div className="text-center pb-3 border-b border-border">
              <p className="text-lg font-semibold text-foreground">{currentTask.day}</p>
              <p className="text-sm text-muted-foreground">{formatDate(currentTask.date)}</p>
            </div>

            {/* Channel & Format */}
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Platforma</Label>
                  <Select value={editData?.channel || ""} onValueChange={(v) => handleEdit("channel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((ch) => (
                        <SelectItem key={ch} value={ch}>{channelIcons[ch.toLowerCase()] || "📱"} {ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Formát</Label>
                  <Select value={editData?.format || ""} onValueChange={(v) => handleEdit("format", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{channelIcon}</span>
                <div>
                  <p className="font-medium text-foreground">{currentTask.channel}</p>
                  <Badge className={`${colors.bg} ${colors.border} ${colors.text} border`}>
                    {currentTask.format}
                  </Badge>
                </div>
              </div>
            )}

            {/* Status */}
            {isEditing && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={editData?.status || "planned"} onValueChange={(v) => handleEdit("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">🗓️ Naplánováno</SelectItem>
                    <SelectItem value="done">✅ Hotovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="w-4 h-4" />
                <span>Co vytvořit</span>
              </div>
              {isEditing ? (
                <Textarea value={editData?.task || ""} onChange={(e) => handleEdit("task", e.target.value)}
                  className="min-h-[80px]" placeholder="Popis úkolu..." />
              ) : (
                <p className="text-foreground font-medium pl-6">{currentTask.task}</p>
              )}
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" />
                <span>Cíl</span>
              </div>
              {isEditing ? (
                <Textarea value={editData?.goal || ""} onChange={(e) => handleEdit("goal", e.target.value)}
                  className="min-h-[60px]" placeholder="Cíl úkolu..." />
              ) : (
                <p className="text-foreground pl-6">{currentTask.goal}</p>
              )}
            </div>

            {/* Edit action buttons */}
            {isEditing && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button onClick={handleSave} disabled={isSaving || !isDirty} className="flex-1 gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Uložit změny
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-1" /> Zrušit
                </Button>
              </div>
            )}

            {/* Outputs section */}
            {!isEditing && sortedOutputs.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-sm font-medium text-foreground">📎 Výstupy ({sortedOutputs.length})</p>
                {sortedOutputs.map((output) => {
                   const typeLabels = { text: "Text", script: "Scénář", visual: "Vizuál", visual_prompt: "Image Prompt" };
                   const typeIcons = { text: FileText, script: Video, visual: Image, visual_prompt: Image };
                   const Icon = typeIcons[output.type] || FileText;
                  return (
                    <div
                      key={output.id}
                      className={`rounded-lg border p-3 space-y-2 transition-colors ${
                        output.is_final
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Icon className="w-4 h-4 text-primary" />
                          {typeLabels[output.type] || output.type}
                          {output.is_final && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">
                              ⭐ Finální
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-muted-foreground mr-1">
                            {new Date(output.created_at).toLocaleDateString("cs-CZ")}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(output.content);
                              toast.success("Zkopírováno");
                            }}
                            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            title="Kopírovat"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {onUpdateTask && (
                            <>
                              <button
                                onClick={() => handleToggleFinal(output.id)}
                                className={`p-1 rounded hover:bg-muted/50 ${
                                  output.is_final ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                                title={output.is_final ? "Zrušit finální" : "Označit jako finální"}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOutput(output.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Smazat výstup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{output.content}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons (view mode) */}
            {!isEditing && (
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-sm text-muted-foreground mb-3">Vytvořit obsah:</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="justify-start gap-2" onClick={() => onCreateText(currentTask)}>
                    <FileText className="w-4 h-4 text-primary" /> Vytvořit text
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={() => onCreateScript(currentTask)}>
                    <Video className="w-4 h-4 text-purple-500" /> Vytvořit scénář
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={() => onCreateVisual(currentTask)}>
                    <Image className="w-4 h-4 text-green-500" /> Vytvořit vizuál
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dirty state confirm */}
      <AlertDialog open={showDirtyConfirm} onOpenChange={setShowDirtyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuložené změny</AlertDialogTitle>
            <AlertDialogDescription>Máte neuložené změny v úkolu. Co chcete udělat?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowDirtyConfirm(false)}>Zrušit</AlertDialogCancel>
            <Button variant="outline" onClick={handleDirtyDiscard}>Zahodit</Button>
            <AlertDialogAction onClick={handleDirtySave}>Uložit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
