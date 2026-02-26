import { 
  Film, 
  Clock, 
  Target, 
  Palette, 
  Layers,
  Lightbulb,
  Copy,
  RefreshCw,
  Pencil,
  Check,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface VideoClip {
  id: number;
  name: string;
  phase: string;
  duration: string;
  purpose: string;
  visual: string;
  script: string;
  tip: string;
}

interface HookVariant {
  id: number;
  text: string;
}

interface VideoScriptData {
  platform: string;
  purpose: string;
  style: string;
  clipCount: number;
  logic: string;
  clips: VideoClip[];
  hookVariants: HookVariant[];
  recommendation: string;
}

interface VideoScriptOutputProps {
  scriptData: VideoScriptData;
  onEdit: () => void;
  onNewVariant: () => void;
}

export default function VideoScriptOutput({ scriptData, onEdit, onNewVariant }: VideoScriptOutputProps) {
  const [copiedClip, setCopiedClip] = useState<number | null>(null);

  const handleCopyScript = () => {
    const fullScript = scriptData.clips.map((clip, index) => 
      `KLIP ${index + 1} – ${clip.phase}\n` +
      `Délka: ${clip.duration}\n` +
      `Účel: ${clip.purpose}\n\n` +
      `Co se děje:\n${clip.visual}\n\n` +
      `Text/mluvený obsah:\n${clip.script}\n\n` +
      `Tip: ${clip.tip}\n` +
      `---`
    ).join('\n\n');

    navigator.clipboard.writeText(fullScript);
    toast.success("Scénář zkopírován do schránky");
  };

  const handleCopyClip = (clipId: number, clip: VideoClip) => {
    const clipText = 
      `KLIP ${clip.id} – ${clip.phase}\n` +
      `Délka: ${clip.duration}\n` +
      `Účel: ${clip.purpose}\n\n` +
      `Co se děje:\n${clip.visual}\n\n` +
      `Text/mluvený obsah:\n${clip.script}\n\n` +
      `Tip: ${clip.tip}`;

    navigator.clipboard.writeText(clipText);
    setCopiedClip(clipId);
    setTimeout(() => setCopiedClip(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Film className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Scénář videa
            </h3>
            <p className="text-sm text-muted-foreground">
              Video rozdělené do jednotlivých klipů s jasným účelem.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/10">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Přehled videa
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Platforma</span>
            <p className="text-sm font-medium text-foreground">{scriptData.platform}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Účel</span>
            <p className="text-sm font-medium text-foreground">{scriptData.purpose}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Styl</span>
            <p className="text-sm font-medium text-foreground">{scriptData.style}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Počet klipů</span>
            <p className="text-sm font-medium text-foreground">{scriptData.clipCount}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Logika videa</span>
            <p className="text-sm font-medium text-foreground">{scriptData.logic}</p>
          </div>
        </div>
      </div>

      {/* Video Clips */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Struktura videa
        </h4>
        
        {scriptData.clips.map((clip, index) => (
          <div 
            key={clip.id} 
            className="glass rounded-xl p-5 space-y-4 border border-border/50 hover:border-primary/20 transition-colors"
          >
            {/* Clip Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">
                    Klip {clip.id} – {clip.phase}
                  </h5>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {clip.duration}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {clip.purpose}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyClip(clip.id, clip)}
                className="text-muted-foreground hover:text-foreground"
              >
                {copiedClip === clip.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Clip Content */}
            <div className="space-y-3 pl-13">
              <div className="bg-muted/30 rounded-lg p-4">
                <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Co se děje ve videu
                </h6>
                <p className="text-sm text-foreground">{clip.visual}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Text / mluvený obsah
                </h6>
                <p className="text-sm text-foreground italic">„{clip.script}"</p>
              </div>

              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <h6 className="text-xs font-semibold text-accent uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Tip pro natáčení
                </h6>
                <p className="text-sm text-foreground">{clip.tip}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hook Variants */}
      {scriptData.hookVariants.length > 0 && (
        <div className="glass rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Varianty hooku
          </h4>
          <p className="text-sm text-muted-foreground">
            Alternativní začátky videa pro A/B testování.
          </p>
          <div className="space-y-2">
            {scriptData.hookVariants.map((variant) => (
              <div 
                key={variant.id}
                className="flex items-start gap-3 bg-muted/30 rounded-lg p-3"
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {variant.id}
                </span>
                <p className="text-sm text-foreground">{variant.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NeoBot Recommendation */}
      {scriptData.recommendation && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20">
          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            Doporučení NeoBota
          </h4>
          <p className="text-sm text-foreground">{scriptData.recommendation}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={onEdit}
          className="flex-1"
        >
          <Pencil className="w-4 h-4" />
          Upravit zadání
        </Button>
        <Button
          variant="outline"
          onClick={onNewVariant}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4" />
          Vytvořit jinou variantu
        </Button>
        <Button
          onClick={handleCopyScript}
          className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <Copy className="w-4 h-4" />
          Zkopírovat scénář
        </Button>
      </div>
    </div>
  );
}
