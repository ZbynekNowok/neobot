import { useState } from "react";
import {
  FileText,
  Image,
  Video,
  Lightbulb,
  Copy,
  Download,
  RefreshCw,
  Pencil,
  Check,
  Play,
  Clock,
  Target,
  Layers,
  Palette,
  Scissors,
  Music,
  CheckSquare,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Types
export type NeoBotType = "text" | "image" | "video" | "strategy";

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

interface EditingTip {
  id: number;
  text: string;
}

interface TextOutputData {
  headline: string;
  mainText: string;
  cta: string;
}

interface ImageOutputData {
  description: string;
  visualConcept: string;
  colorPalette: string;
  composition: string;
}

interface VideoOutputData {
  clips: VideoClip[];
  hookVariants: HookVariant[];
  recommendation: string;
  editingTips?: EditingTip[];
  musicRecommendation?: string;
  publishingChecklist?: string[];
}

interface StrategyOutputData {
  summary: string;
  steps: { id: number; title: string; description: string }[];
  priorities: string[];
  timeline: string;
}

interface ContextInfo {
  platform?: string;
  purpose?: string;
  style?: string;
  format?: string;
  tone?: string;
  clipCount?: number;
  logic?: string;
}

interface UnifiedOutputProps {
  type: NeoBotType;
  outputType: string;
  context: ContextInfo;
  textData?: TextOutputData;
  imageData?: ImageOutputData;
  videoData?: VideoOutputData;
  strategyData?: StrategyOutputData;
  onEditInput: () => void;
  onNewVariant: () => void;
  onContinueVideo?: () => void;
}

const neoBotConfig: Record<NeoBotType, { icon: React.ElementType; name: string; color: string }> = {
  text: { icon: FileText, name: "Textový NeoBot", color: "primary" },
  image: { icon: Image, name: "Obrázkový NeoBot", color: "accent" },
  video: { icon: Video, name: "Video NeoBot", color: "primary" },
  strategy: { icon: Lightbulb, name: "Strategický NeoBot", color: "accent" },
};

export default function UnifiedOutput({
  type,
  outputType,
  context,
  textData,
  imageData,
  videoData,
  strategyData,
  onEditInput,
  onNewVariant,
  onContinueVideo,
}: UnifiedOutputProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const config = neoBotConfig[type];
  const Icon = config.icon;

  const handleCopyAll = () => {
    let content = "";

    if (type === "text" && textData) {
      content = `NADPIS:\n${textData.headline}\n\nHLAVNÍ TEXT:\n${textData.mainText}\n\nCTA:\n${textData.cta}`;
    } else if (type === "image" && imageData) {
      content = `POPIS VIZUÁLU:\n${imageData.description}\n\nVIZUÁLNÍ KONCEPT:\n${imageData.visualConcept}\n\nBAREVNÁ PALETA:\n${imageData.colorPalette}\n\nKOMPOZICE:\n${imageData.composition}`;
    } else if (type === "video" && videoData) {
      content = videoData.clips
        .map(
          (clip) =>
            `KLIP ${clip.id} – ${clip.phase}\nDélka: ${clip.duration}\nÚčel: ${clip.purpose}\n\nCo se děje:\n${clip.visual}\n\nText/mluvený obsah:\n${clip.script}\n\nTip: ${clip.tip}\n---`
        )
        .join("\n\n");
    } else if (type === "strategy" && strategyData) {
      content = `SHRNUTÍ:\n${strategyData.summary}\n\nKROKY:\n${strategyData.steps
        .map((s) => `${s.id}. ${s.title}: ${s.description}`)
        .join("\n")}\n\nPRIORITY:\n${strategyData.priorities.join("\n")}\n\nČASOVÝ RÁMEC:\n${strategyData.timeline}`;
    }

    navigator.clipboard.writeText(content);
    toast.success("Výstup zkopírován do schránky");
  };

  const handleDownload = () => {
    let content = "";
    let filename = `neobot-${type}-output.txt`;

    if (type === "text" && textData) {
      content = `NADPIS:\n${textData.headline}\n\nHLAVNÍ TEXT:\n${textData.mainText}\n\nCTA:\n${textData.cta}`;
    } else if (type === "image" && imageData) {
      content = `POPIS VIZUÁLU:\n${imageData.description}\n\nVIZUÁLNÍ KONCEPT:\n${imageData.visualConcept}\n\nBAREVNÁ PALETA:\n${imageData.colorPalette}\n\nKOMPOZICE:\n${imageData.composition}`;
    } else if (type === "video" && videoData) {
      content = videoData.clips
        .map(
          (clip) =>
            `KLIP ${clip.id} – ${clip.phase}\nDélka: ${clip.duration}\nÚčel: ${clip.purpose}\n\nCo se děje:\n${clip.visual}\n\nText/mluvený obsah:\n${clip.script}\n\nTip: ${clip.tip}\n---`
        )
        .join("\n\n");
    } else if (type === "strategy" && strategyData) {
      content = `SHRNUTÍ:\n${strategyData.summary}\n\nKROKY:\n${strategyData.steps
        .map((s) => `${s.id}. ${s.title}: ${s.description}`)
        .join("\n")}\n\nPRIORITY:\n${strategyData.priorities.join("\n")}\n\nČASOVÝ RÁMEC:\n${strategyData.timeline}`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Soubor stažen");
  };

  const handleCopyClip = (clipId: number, clip: VideoClip) => {
    const clipText = `KLIP ${clip.id} – ${clip.phase}\nDélka: ${clip.duration}\nÚčel: ${clip.purpose}\n\nCo se děje:\n${clip.visual}\n\nText/mluvený obsah:\n${clip.script}\n\nTip: ${clip.tip}`;
    navigator.clipboard.writeText(clipText);
    setCopiedItem(`clip-${clipId}`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${config.color}/20 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${config.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{config.name}</p>
              <h3 className="font-display text-xl font-bold text-foreground">{outputType}</h3>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEditInput}>
            <Pencil className="w-4 h-4" />
            Upravit zadání
          </Button>
        </div>
      </div>

      {/* Context Summary */}
      {Object.keys(context).length > 0 && (
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/10">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Kontext výstupu
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {context.platform && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Platforma</span>
                <p className="text-sm font-medium text-foreground">{context.platform}</p>
              </div>
            )}
            {context.purpose && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Účel</span>
                <p className="text-sm font-medium text-foreground">{context.purpose}</p>
              </div>
            )}
            {context.style && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Styl</span>
                <p className="text-sm font-medium text-foreground">{context.style}</p>
              </div>
            )}
            {context.tone && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Tón</span>
                <p className="text-sm font-medium text-foreground">{context.tone}</p>
              </div>
            )}
            {context.format && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Formát</span>
                <p className="text-sm font-medium text-foreground">{context.format}</p>
              </div>
            )}
            {context.clipCount && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Počet klipů</span>
                <p className="text-sm font-medium text-foreground">{context.clipCount}</p>
              </div>
            )}
            {context.logic && (
              <div className="col-span-2 space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Logika</span>
                <p className="text-sm font-medium text-foreground">{context.logic}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Text Output */}
      {type === "text" && textData && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nadpis</h4>
              <p className="text-lg font-semibold text-foreground">{textData.headline}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hlavní text</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{textData.mainText}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Výzva k akci (CTA)</h4>
              <p className="text-sm font-medium text-primary">{textData.cta}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Image Output */}
      {type === "image" && imageData && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 space-y-4">
            {/* Placeholder for image */}
            <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-border/50">
              <div className="text-center p-8">
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Náhled vizuálu</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Popis vizuálu</h4>
              <p className="text-sm text-foreground">{imageData.description}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vizuální koncept</h4>
              <p className="text-sm text-foreground">{imageData.visualConcept}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Barevná paleta</h4>
                <p className="text-sm text-foreground">{imageData.colorPalette}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kompozice</h4>
                <p className="text-sm text-foreground">{imageData.composition}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Video Output */}
      {type === "video" && videoData && (
        <div className="space-y-6">
          {/* Video Structure Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Struktura videa
            </h4>

            {videoData.clips.map((clip) => (
              <div
                key={clip.id}
                className="glass rounded-xl overflow-hidden border border-border/50 hover:border-primary/20 transition-colors"
              >
                {/* Clip Header */}
                <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-foreground">Klip {clip.id} – {clip.phase}</h5>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          {clip.duration}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
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
                    {copiedItem === `clip-${clip.id}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Clip Content */}
                <div className="p-4 space-y-4">
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
          {videoData.hookVariants && videoData.hookVariants.length > 0 && (
            <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Varianty hooku
              </h4>
              <p className="text-sm text-muted-foreground">Alternativní začátky videa pro A/B testování.</p>
              <div className="space-y-2">
                {videoData.hookVariants.map((variant) => (
                  <div key={variant.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {variant.id}
                    </span>
                    <p className="text-sm text-foreground">{variant.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editing Tips */}
          {videoData.editingTips && videoData.editingTips.length > 0 && (
            <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                Tipy pro střih
              </h4>
              <div className="space-y-2">
                {videoData.editingTips.map((tip) => (
                  <div key={tip.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-foreground">{tip.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Music Recommendation */}
          {videoData.musicRecommendation && (
            <div className="glass rounded-xl p-5 space-y-3 border border-border/50">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                Doporučení hudby / trendu
              </h4>
              <p className="text-sm text-foreground">{videoData.musicRecommendation}</p>
            </div>
          )}

          {/* Publishing Checklist */}
          {videoData.publishingChecklist && videoData.publishingChecklist.length > 0 && (
            <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                Checklist před publikací
              </h4>
              <div className="space-y-2">
                {videoData.publishingChecklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                    <div className="w-5 h-5 rounded border border-border/50 flex-shrink-0" />
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NeoBot Recommendation */}
          {videoData.recommendation && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                Doporučení NeoBota
              </h4>
              <p className="text-sm text-foreground">{videoData.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Strategy Output */}
      {type === "strategy" && strategyData && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shrnutí strategie</h4>
              <p className="text-sm text-foreground">{strategyData.summary}</p>
            </div>
          </div>

          <div className="glass rounded-xl p-5 space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Kroky k realizaci
            </h4>
            <div className="space-y-3">
              {strategyData.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-4">
                  <span className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-bold flex-shrink-0">
                    {step.id}
                  </span>
                  <div>
                    <h5 className="font-semibold text-foreground">{step.title}</h5>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-foreground">Priority</h4>
              <ul className="space-y-2">
                {strategyData.priorities.map((priority, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {priority}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-xl p-5 space-y-3">
              <h4 className="font-semibold text-foreground">Časový rámec</h4>
              <p className="text-sm text-foreground">{strategyData.timeline}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Action Buttons */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
        <div className="flex flex-col sm:flex-row gap-3 p-4 glass rounded-xl border border-border/50">
          <Button variant="outline" onClick={handleCopyAll} className="flex-1">
            <Copy className="w-4 h-4" />
            {type === "video" ? "Zkopírovat celý scénář" : "Zkopírovat výstup"}
          </Button>
          <Button
            onClick={onNewVariant}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            Vytvořit další variantu
          </Button>
          {type === "video" && onContinueVideo && (
            <Button
              onClick={onContinueVideo}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <ArrowRight className="w-4 h-4" />
              Navázat dalším videem
            </Button>
          )}
          {type !== "video" && (
            <Button variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4" />
              Stáhnout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
