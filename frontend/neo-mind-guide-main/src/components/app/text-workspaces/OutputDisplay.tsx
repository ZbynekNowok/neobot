import { Copy, Download, Save, Lightbulb, FileText, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextOutputData } from "./types";
import { toast } from "sonner";

interface OutputDisplayProps {
  output: TextOutputData;
  onNewVariant: () => void;
  onEdit: () => void;
  onNew: () => void;
  primaryLabel?: string;
  primaryDescription?: string;
  notesLabel?: string;
  notesDescription?: string;
}

export default function OutputDisplay({ 
  output, 
  onNewVariant, 
  onEdit, 
  onNew,
  primaryLabel = "Text k použití",
  primaryDescription = "Finální text připravený k použití",
  notesLabel = "Poznámky a doporučení",
  notesDescription = "Interní podklad – není určeno k publikaci"
}: OutputDisplayProps) {
  const handleCopyPostText = () => {
    const text = output.parsed?.postText || output.sections[0]?.content || "";
    navigator.clipboard.writeText(text);
    toast.success("Text zkopírován");
  };

  const handleCopyNotes = () => {
    if (!output.parsed?.notes) return;
    navigator.clipboard.writeText(output.parsed.notes);
    toast.success("Poznámky zkopírovány");
  };

  const handleCopyAll = () => {
    const content = output.parsed?.rawContent || output.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(content);
    toast.success("Vše zkopírováno");
  };

  const handleDownload = () => {
    const content = output.sections
      .map(s => `${s.title.toUpperCase()}:\n${s.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neobot-text-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Staženo");
  };

  const handleSave = () => {
    toast.success("Text uložen");
  };

  return (
    <div className="space-y-6">
      {/* Header with metadata */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">{output.name}</h3>
            {output.metadata && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(output.metadata).map(([key, value]) => (
                  <span key={key} className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Stáhnout
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Uložit
            </Button>
          </div>
        </div>
      </div>

      {/* Primary output */}
      <div className="glass rounded-xl p-6 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {primaryLabel}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {primaryDescription}
            </p>
          </div>
          <Button onClick={handleCopyPostText} className="bg-primary hover:bg-primary/90">
            <Copy className="w-4 h-4 mr-1" />
            Zkopírovat text
          </Button>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 text-foreground whitespace-pre-wrap leading-relaxed">
          {output.parsed?.postText || output.sections[0]?.content || ""}
        </div>
      </div>

      {/* Notes section - only shown if notes exist */}
      {output.parsed?.notes && (
        <div className="glass rounded-xl p-6 border-l-4 border-l-amber-500/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                {notesLabel}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {notesDescription}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyNotes}>
              <Copy className="w-4 h-4 mr-1" />
              Zkopírovat poznámky
            </Button>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-foreground/80 whitespace-pre-wrap leading-relaxed text-sm">
            {output.parsed.notes}
          </div>
        </div>
      )}

      {/* Copy All */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={handleCopyAll}>
          <Copy className="w-4 h-4 mr-1" />
          Zkopírovat vše
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="ghost" onClick={onNewVariant}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Vytvořit variantu
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Upravit text
        </Button>
        <Button variant="ghost" onClick={onNew}>
          Nový text
        </Button>
      </div>
    </div>
  );
}
