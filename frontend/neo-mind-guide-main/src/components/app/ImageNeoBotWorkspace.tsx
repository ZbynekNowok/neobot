import { useState, useEffect, useRef, useCallback } from "react";
import { useTaskOutputSaver } from "@/hooks/useTaskOutputSaver";
import TaskContextBanner from "@/components/app/TaskContextBanner";
import { NEOBOT_API_BASE, NEOBOT_API_KEY, saveOutputToHistory, neobotFetch } from "@/lib/neobot";
import {
  ArrowRight,
  Image,
  Wand2,
  ChevronDown,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  Pencil,
  ArrowLeft,
  Check,
  Save,
  FileText,
  Video,
  CalendarCheck,
  LayoutTemplate,
  Type,
} from "lucide-react";
import {
  functionCategories,
  styleOptions,
  formatOptions,
  purposeOptions,
  colorOptions,
  type ImageFunction,
  type FunctionCategory,
} from "./imageNeoBotConstants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Group, Rect } from "react-konva";
import { UserProfile } from "@/components/app/AppLayout";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

interface ImageSection {
  id: string;
  title: string;
  content: string;
  isEditing?: boolean;
}

interface ImageOutputData {
  name: string;
  style: string;
  format: string;
  purpose: string;
  imageUrl: string | null;
  logoUrl?: string | null;
  sections: ImageSection[];
}

interface ComposeState {
  backgroundUrl: string;
  layers: any[];
  format: "square" | "story" | "landscape";
  resolution: "preview" | "standard" | "high";
}

type TextLayoutKey = "headline" | "subheadline" | "cta";

interface TextLayoutItemBase {
  xPct: number;
  yPct: number;
  fontSize: number;
  color: string;
  useAutoContrast?: boolean;
}

interface CtaLayoutItem extends TextLayoutItemBase {
  widthPct: number;
  heightPct: number;
  bgColor?: string;
  borderRadius?: number;
}

type TextLayoutItem = TextLayoutItemBase | CtaLayoutItem;

function isCtaLayout(item: TextLayoutItem): item is CtaLayoutItem {
  return "widthPct" in item && "heightPct" in item;
}

const DEFAULT_LAYOUT: Record<TextLayoutKey, TextLayoutItem> = {
  headline: { xPct: 0.07, yPct: 0.17, fontSize: 48, color: "#ffffff", useAutoContrast: true },
  subheadline: { xPct: 0.07, yPct: 0.22, fontSize: 24, color: "#ffffff", useAutoContrast: true },
  cta: { xPct: 0.07, yPct: 0.28, widthPct: 0.26, heightPct: 0.06, fontSize: 20, color: "#ffffff", bgColor: "#2563eb", borderRadius: 999, useAutoContrast: true },
};

/** Canvas dimensions for compose (must match backend getCanvasDimensions). */
function getCanvasDimensions(format: string, resolution: string): { width: number; height: number } {
  const fmt = ["square", "story", "landscape"].includes(format) ? format : "square";
  const res = ["preview", "standard", "high"].includes(resolution) ? resolution : "standard";
  const presets: Record<string, Record<string, { width: number; height: number }>> = {
    preview: { square: { width: 720, height: 720 }, story: { width: 720, height: 1280 }, landscape: { width: 1280, height: 720 } },
    standard: { square: { width: 1080, height: 1080 }, story: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } },
    high: { square: { width: 2048, height: 2048 }, story: { width: 2048, height: 3640 }, landscape: { width: 3640, height: 2048 } },
  };
  const p = presets[res]?.[fmt] ?? presets.standard.square;
  return { width: p.width, height: p.height };
}

function buildUnifiedBrief({ mainBrief, topic, keywords, offer }: { mainBrief: string; topic?: string; keywords?: string; offer?: string }) {
  const lines: string[] = [];
  lines.push(`BRIEF: ${(mainBrief && mainBrief.trim()) || ""}`);
  if (topic?.trim()) lines.push(`KONTEXT: ${topic.trim()}`);
  if (keywords?.trim()) lines.push(`KLÍČOVÁ SLOVA: ${keywords.trim()}`);
  if (offer?.trim()) lines.push(`POPIS: ${offer.trim()}`);
  return lines.join("\n");
}

const MAX_STAGE_DISPLAY = 420;

function ComposeCanvas({
  composeState,
  draftTexts,
  backgroundImage,
  onLayerDragEnd,
}: {
  composeState: ComposeState;
  draftTexts: { headline: string; subheadline: string; bullets: string[]; cta: string };
  backgroundImage: HTMLImageElement;
  onLayerDragEnd: (id: string, x: number, y: number) => void;
}) {
  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(composeState.format, composeState.resolution);
  const scale = Math.min(MAX_STAGE_DISPLAY / canvasWidth, MAX_STAGE_DISPLAY / canvasHeight, 1);

  const draggableLayers = (composeState.layers || []).filter(
    (l: any) => (l.type === "text" || l.type === "button") && typeof l.x === "number" && typeof l.y === "number"
  );

  const getLayerText = (layer: any) => {
    if (layer.id === "headline") return draftTexts.headline || layer.text || "";
    if (layer.id === "subheadline") return draftTexts.subheadline || layer.text || "";
    if (layer.id === "cta") return draftTexts.cta || layer.text || "";
    return String(layer.text || "");
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ width: canvasWidth * scale, height: canvasHeight * scale, maxWidth: "100%" }}>
      <Stage width={canvasWidth} height={canvasHeight} scaleX={scale} scaleY={scale}>
        <Layer>
          <KonvaImage image={backgroundImage} x={0} y={0} width={canvasWidth} height={canvasHeight} listening={false} />
          {draggableLayers.map((layer: any) => {
            if (layer.type === "text") {
              const fontSize = Number(layer.fontSize) || 32;
              const color = (layer.color && String(layer.color).trim()) || "#ffffff";
              const text = getLayerText(layer);
              return (
                <KonvaText
                  key={layer.id}
                  x={layer.x}
                  y={layer.y}
                  text={text || " "}
                  fontSize={fontSize}
                  fontFamily="Inter, sans-serif"
                  fontStyle={Number(layer.fontWeight) >= 700 ? "bold" : "normal"}
                  fill={color}
                  listening={true}
                  draggable
                  onDragEnd={(e) => onLayerDragEnd(layer.id, e.target.x(), e.target.y())}
                />
              );
            }
            if (layer.type === "button") {
              const w = Number(layer.w) || 280;
              const h = Number(layer.h) || 64;
              const bg = (layer.bg && String(layer.bg).trim()) || "#2563eb";
              const color = (layer.color && String(layer.color).trim()) || "#ffffff";
              const text = getLayerText(layer);
              return (
                <Group key={layer.id} x={layer.x} y={layer.y} draggable onDragEnd={(e) => onLayerDragEnd(layer.id, e.target.x(), e.target.y())}>
                  <Rect width={w} height={h} fill={bg} cornerRadius={Math.min(999, h / 2, w / 2)} listening={false} />
                  <KonvaText
                    text={text || " "}
                    width={w}
                    height={h}
                    fontSize={Math.min(32, h * 0.5)}
                    fontFamily="Inter, sans-serif"
                    fontStyle="bold"
                    fill={color}
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                    offsetX={w / 2}
                    offsetY={h / 2}
                    x={w / 2}
                    y={h / 2}
                  />
                </Group>
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}

const HEADER_OFFSET_PX = 220;

/** Interactive text editor: overlay divs over image with drag (%), font size, color. */
function ComposeEditor({
  composeState,
  draftTexts,
  backgroundImageUrl,
  layout,
  setLayout,
  selectedLayer,
  onSelectLayer,
  scale: scaleProp,
  fillContainer,
  containerRef: containerRefProp,
  aspectRatio,
}: {
  composeState: ComposeState;
  draftTexts: { headline: string; subheadline: string; bullets: string[]; cta: string };
  backgroundImageUrl: string;
  layout: Record<TextLayoutKey, TextLayoutItem>;
  setLayout: React.Dispatch<React.SetStateAction<Record<TextLayoutKey, TextLayoutItem>>>;
  selectedLayer: TextLayoutKey | null;
  onSelectLayer: (key: TextLayoutKey | null) => void;
  scale: number;
  fillContainer?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  aspectRatio?: number;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = containerRefProp ?? internalRef;
  const [dragging, setDragging] = useState<{
    id: TextLayoutKey;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(composeState.format, composeState.resolution);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !fillContainer) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, [fillContainer, containerRef]);

  const scale = fillContainer && containerSize.w > 0 && containerSize.h > 0
    ? Math.min(containerSize.w / canvasWidth, containerSize.h / canvasHeight, 1)
    : scaleProp;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = (e.clientX - dragging.startX) / rect.width;
      const deltaYPct = (e.clientY - dragging.startY) / rect.height;
      const xPct = Math.max(0, Math.min(1, dragging.startXPct + deltaXPct));
      const yPct = Math.max(0, Math.min(1, dragging.startYPct + deltaYPct));
      setLayout((prev) => {
        const next = { ...prev[dragging.id], xPct, yPct };
        return { ...prev, [dragging.id]: next };
      });
    },
    [dragging, setLayout]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const items: { key: TextLayoutKey; label: string; text: string; isButton?: boolean }[] = [
    { key: "headline", label: "Nadpis", text: draftTexts.headline || "Nadpis" },
    { key: "subheadline", label: "Podnadpis", text: draftTexts.subheadline || "Podnadpis" },
    { key: "cta", label: "CTA", text: draftTexts.cta || "CTA", isButton: true },
  ];

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden select-none"
      style={
        fillContainer
          ? { width: "100%", height: "100%", aspectRatio: canvasWidth / canvasHeight, maxWidth: "100%", maxHeight: "100%" }
          : { width: canvasWidth * scale, height: canvasHeight * scale, maxWidth: "100%" }
      }
    >
      <img
        src={backgroundImageUrl}
        alt="Background"
        className={`absolute inset-0 w-full h-full pointer-events-none ${fillContainer ? "object-contain" : "object-cover"}`}
        draggable={false}
      />
      {items.map(({ key, label, text, isButton }) => {
        const item = layout[key];
        const isSelected = selectedLayer === key;
        const leftPct = item.xPct * 100;
        const topPct = item.yPct * 100;
        if (isButton && isCtaLayout(item)) {
          const ctaBg = item.bgColor && /^#[0-9a-fA-F]{3,8}$/.test(item.bgColor) ? item.bgColor : "#2563eb";
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className="absolute cursor-move rounded-full px-6 py-3 flex items-center justify-center font-semibold whitespace-nowrap outline-none"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${item.widthPct * 100}%`,
                minHeight: 44,
                fontSize: Math.max(10, Math.min(24, Math.round(item.fontSize * scale))),
                backgroundColor: ctaBg,
                color: item.color,
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                border: isSelected ? "2px solid var(--primary)" : "2px solid transparent",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (e.button === 0) {
                  onSelectLayer(key);
                  setDragging({ id: key, startX: e.clientX, startY: e.clientY, startXPct: item.xPct, startYPct: item.yPct });
                }
              }}
            >
              {text || label}
            </div>
          );
        }
        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            className="absolute cursor-move font-bold whitespace-pre-wrap outline-none max-w-[85%]"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              fontSize: Math.max(10, Math.min(72, Math.round(item.fontSize * scale))),
              color: item.color,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              border: isSelected ? "2px solid var(--primary)" : "2px solid transparent",
              lineHeight: 1.2,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              if (e.button === 0) {
                onSelectLayer(key);
                setDragging({ id: key, startX: e.clientX, startY: e.clientY, startXPct: item.xPct, startYPct: item.yPct });
              }
            }}
          >
            {text || label}
          </div>
        );
      })}
    </div>
  );
}

type OutputMode = "visual" | "marketing";
type Step = "select" | "input" | "proposal" | "output";

interface ImageNeoBotWorkspaceProps {
  profile: UserProfile | null;
  onBack: () => void;
}

export default function ImageNeoBotWorkspace({ profile, onBack }: ImageNeoBotWorkspaceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [selectedFunction, setSelectedFunction] = useState<ImageFunction | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("social");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Output mode: visual (no text) or marketing (with text/flyer)
  const [outputMode, setOutputMode] = useState<OutputMode>("visual");

  // Marketing mode – main brief + optional advanced fields
  const [mainBrief, setMainBrief] = useState("");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [offer, setOffer] = useState("");
  const [marketingStep, setMarketingStep] = useState(0);
  // Draft response texts (editable after generation)
  const [draftTexts, setDraftTexts] = useState<{ headline: string; subheadline: string; bullets: string[]; cta: string }>({ headline: "", subheadline: "", bullets: [], cta: "" });

  // Quick settings
  const [style, setStyle] = useState("minimalist");
  const [format, setFormat] = useState("square");
  const [purpose, setPurpose] = useState("prodej");
  const [color, setColor] = useState("neutral");
  const [textLayout, setTextLayout] = useState<"auto" | "flyer" | "balanced" | "visual">("auto");
  const [textPlacement, setTextPlacement] = useState<"auto" | "bottom_left" | "bottom_center" | "top_left" | "top_center" | "center" | "right_panel">("auto");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Output data
  const [imageOutput, setImageOutput] = useState<ImageOutputData | null>(null);
  const [composeState, setComposeState] = useState<ComposeState | null>(null);
  const [layout, setLayout] = useState<Record<TextLayoutKey, TextLayoutItem>>(DEFAULT_LAYOUT);
  const [selectedLayer, setSelectedLayer] = useState<TextLayoutKey | null>(null);
  const [loadingCompose, setLoadingCompose] = useState(false);
  const [loadingRender, setLoadingRender] = useState(false);
  const [errorCompose, setErrorCompose] = useState<string | null>(null);
  const [errorRender, setErrorRender] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [lastComposeMeta, setLastComposeMeta] = useState<{ backgroundUrl: string; format: string; resolution: string } | null>(null);
  const initialLayoutRef = useRef<Record<TextLayoutKey, TextLayoutItem> | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const { taskContext, saveOutputToTask, isSavingToTask, savedToTask, navigateBackToTask } = useTaskOutputSaver();

  const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

  // Load background image for Konva when composeState has backgroundUrl
  useEffect(() => {
    if (!composeState?.backgroundUrl) {
      setBackgroundImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBackgroundImage(img);
    img.onerror = () => setBackgroundImage(null);
    img.src = composeState.backgroundUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [composeState?.backgroundUrl]);

  // Sync layout (layoutOverrides) from composeState.layers when we get new layers from API (px → %). Store initial for "Zrušit úpravy".
  useEffect(() => {
    const layers = composeState?.layers;
    if (!Array.isArray(layers) || !composeState) return;
    const { width: cw, height: ch } = getCanvasDimensions(composeState.format, composeState.resolution);
    const headline = layers.find((l: any) => l.type === "text" && l.id === "headline");
    const subheadline = layers.find((l: any) => l.type === "text" && l.id === "subheadline");
    const cta = layers.find((l: any) => (l.type === "text" || l.type === "button") && l.id === "cta");
    const nextLayout: Record<TextLayoutKey, TextLayoutItem> = {
      headline: headline && typeof headline.x === "number" && typeof headline.y === "number"
        ? { ...DEFAULT_LAYOUT.headline, xPct: headline.x / cw, yPct: headline.y / ch, fontSize: Number(headline.fontSize) || 48, color: (headline.color && String(headline.color).trim()) || "#ffffff" }
        : { ...DEFAULT_LAYOUT.headline },
      subheadline: subheadline && typeof subheadline.x === "number" && typeof subheadline.y === "number"
        ? { ...DEFAULT_LAYOUT.subheadline, xPct: subheadline.x / cw, yPct: subheadline.y / ch, fontSize: Number(subheadline.fontSize) || 24, color: (subheadline.color && String(subheadline.color).trim()) || "#ffffff" }
        : { ...DEFAULT_LAYOUT.subheadline },
      cta: cta && typeof cta.x === "number" && typeof cta.y === "number"
        ? {
            ...DEFAULT_LAYOUT.cta,
            xPct: cta.x / cw,
            yPct: cta.y / ch,
            widthPct: typeof cta.w === "number" ? cta.w / cw : 0.26,
            heightPct: typeof cta.h === "number" ? cta.h / ch : 0.06,
            fontSize: Number(cta.fontSize) || 20,
            color: (cta.color && String(cta.color).trim()) || "#ffffff",
            bgColor: (cta.bg && String(cta.bg).trim()) || "#2563eb",
            borderRadius: typeof cta.radius === "number" ? cta.radius : 999,
          }
        : { ...DEFAULT_LAYOUT.cta },
    };
    setLayout(nextLayout);
    initialLayoutRef.current = JSON.parse(JSON.stringify(nextLayout));
  }, [composeState?.layers, composeState?.format, composeState?.resolution]);

  // Reset to step 1 on mount if no task context
  useEffect(() => {
    if (!taskContext) {
      setCurrentStep("select");
      setSelectedFunction(null);
      setInputValue("");
      setImageOutput(null);
      setOutputMode("visual");
      setMainBrief("");
      setTopic("");
      setKeywords("");
      setOffer("");
      setDraftTexts({ headline: "", subheadline: "", bullets: [], cta: "" });
      setMarketingStep(0);
      return;
    }

    // Has task context: auto-prefill and skip to step 2
    const funcMap: Record<string, string> = {
      instagram: "instagram-post",
      facebook: "facebook-post",
    };
    const funcId = funcMap[taskContext.channel?.toLowerCase()];
    if (funcId) {
      const allFuncs = functionCategories.flatMap(c => c.functions);
      const matched = allFuncs.find(f => f.id === funcId);
      if (matched) {
        setSelectedFunction(matched);
        setFormat(matched.defaultFormat);
      }
    }
    const brief = [taskContext.task, taskContext.goal ? `Cíl: ${taskContext.goal}` : ""].filter(Boolean).join("\n");
    if (brief) {
      setInputValue(brief);
      setMainBrief(brief);
    }
    setCurrentStep("input");
  }, [taskContext]);

  const handleFunctionSelect = (func: ImageFunction) => {
    setSelectedFunction(func);
    setFormat(func.defaultFormat);
    setCurrentStep("input");
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const getFormatLabel = () => formatOptions.find(f => f.id === format)?.label || "1:1";
  const getStyleLabel = () => styleOptions.find(s => s.id === style)?.label || "Minimalistický";

  // Generate image prompt for "visual" mode
  const generateImagePrompt = (): string => {
    const styleMap: Record<string, string> = {
      minimalist: "minimalistický, čistý, jednoduché linie",
      luxury: "luxusní, elegantní, vysoce kvalitní",
      playful: "hravý, veselý, dynamický",
      natural: "přírodní, organický, realistický"
    };
    const formatMap: Record<string, string> = { square: "1:1", portrait: "9:16", landscape: "16:9", story: "9:16" };

    const styleText = styleMap[style] || "moderní";
    const aspectRatio = formatMap[format] || "1:1";
    const mainPrompt = `${inputValue}\n\nStyl: ${styleText}\nFormát: ${aspectRatio}`;
    const negativePrompt = "nízká kvalita, rozmazané, defektní, deformované, ugly, watermark, text, loga, copyrighted";

    return `ČÁST 1: HLAVNÍ PROMPT\n${mainPrompt}\n\nČÁST 2: NEGATIVNÍ PROMPT\n${negativePrompt}\n\nČÁST 3: ASPECT RATIO\n${aspectRatio}\n\nČÁST 4: STYL\n${styleText}`;
  };

  const generateMockContent = (): ImageSection[] => {
    const prompt = generateImagePrompt();
    return [
      { id: "main-prompt", title: "Hlavní Prompt", content: prompt.split("ČÁST 2:")[0].replace("ČÁST 1: HLAVNÍ PROMPT\n", "").trim() },
      { id: "negative-prompt", title: "Negativní Prompt", content: prompt.split("ČÁST 3:")[0].split("ČÁST 2: NEGATIVNÍ PROMPT\n")[1].trim() },
      { id: "aspect-ratio", title: "Aspect Ratio", content: getFormatLabel() },
      { id: "style", title: "Styl", content: getStyleLabel() }
    ];
  };

  // Resolve format string for backend
  const getBackendFormat = (): string => {
    const map: Record<string, string> = { square: "1:1", portrait: "4:5", landscape: "16:9", story: "9:16" };
    return map[format] || "1:1";
  };


  // Visual mode: generate single background via /api/images/compose with backgroundOnly: true
  const fetchVisualBackground = async (prompt: string) => {
    const composeFormat = format === "portrait" || format === "story" ? "story" : format === "landscape" ? "landscape" : "square";
    const styleMap: Record<string, string> = {
      minimalist: "minimalisticky",
      luxury: "luxusni",
      playful: "hravy",
      natural: "prirozeny",
    };
    const paletteMap: Record<string, string> = {
      neutral: "neutralni",
      warm: "teple",
      cool: "studene",
      vibrant: "vyrazne",
    };
    let data: any;
    try {
      data = await neobotFetch("/api/images/compose", {
        method: "POST",
        body: JSON.stringify({
          type: "instagram_post",
          format: composeFormat,
          resolution: "standard",
          style: styleMap[style] || "minimalisticky",
          purpose: purpose,
          palette: paletteMap[color] || "neutralni",
          prompt: prompt.trim(),
          brand: profile ? { name: profile.brand_name || undefined } : {},
          backgroundOnly: true,
          textLayout: "flyer",
          textPlacement: "bottom_left",
          clientProfile: profile
            ? {
                brandName: profile.brand_name || undefined,
                industry: profile.business || undefined,
                brandStyle: profile.brand_keywords || undefined,
                style: profile.brand_keywords || undefined,
                targetAudience: profile.ideal_customer || undefined,
                uniqueValue: profile.unique_value || undefined,
                inspirationBrands: profile.inspiration_brands || undefined,
                marketingGoal: profile.marketing_goal || undefined,
                industryLock: true,
              }
            : undefined,
        }),
      }) as any;
    } catch (e: any) {
      const msg = e?.responseData?.message || e?.message || "Generování obrázku se nezdařilo.";
      console.error("[fetchVisualBackground] API error:", e?.status, e?.responseData, e?.message);
      throw new Error(msg);
    }
    const bg = data?.background;
    if (!bg?.url) {
      const msg = data?.message || data?.error || "Server nevrátil obrázek (chybí background.url).";
      console.error("[fetchVisualBackground] Unexpected response:", data);
      throw new Error(msg);
    }
    return {
      backgroundUrl: bg.url.startsWith("http") ? bg.url : `${NEOBOT_API_BASE}${bg.url}`,
      width: bg.width,
      height: bg.height,
      prompt,
    };
  };

  const handleGenerate = async () => {
    if (outputMode === "marketing") {
      if (!mainBrief.trim()) return;
    } else {
      if (!inputValue.trim()) return;
    }
    setIsGenerating(true);

    const backendFormat = getBackendFormat();

    // Marketing mode (Grafika s textem) → POST /api/images/compose
    if (outputMode === "marketing") {
      setErrorCompose(null);
      setLoadingCompose(true);
      try {
        const composeFormat = format === "portrait" || format === "story" ? "story" : format === "landscape" ? "landscape" : "square";
        const styleMap: Record<string, string> = {
          minimalist: "minimalisticky",
          luxury: "luxusni",
          playful: "hravy",
          natural: "prirozeny",
        };
        const paletteMap: Record<string, string> = {
          neutral: "neutralni",
          warm: "teple",
          cool: "studene",
          vibrant: "vyrazne",
        };
        const unifiedPrompt = buildUnifiedBrief({
          mainBrief: mainBrief.trim(),
          topic: topic.trim() || undefined,
          keywords: keywords.trim() || undefined,
          offer: offer.trim() || undefined,
        });
        const payload = {
          type: selectedFunction?.id || "instagram_post",
          format: composeFormat,
          resolution: "standard",
          style: styleMap[style] || "minimalisticky",
          purpose: purpose,
          palette: paletteMap[color] || "neutralni",
          prompt: unifiedPrompt,
          brand: profile ? { name: profile.brand_name || undefined } : {},
          backgroundOnly: false,
          textLayout,
          textPlacement,
          clientProfile: profile
            ? {
                brandName: profile.brand_name || undefined,
                industry: profile.business || undefined,
                brandStyle: profile.brand_keywords || undefined,
                style: profile.brand_keywords || undefined,
                targetAudience: profile.ideal_customer || undefined,
                uniqueValue: profile.unique_value || undefined,
                inspirationBrands: profile.inspiration_brands || undefined,
                marketingGoal: profile.marketing_goal || undefined,
                industryLock: true,
              }
            : undefined,
        };
        const data = await neobotFetch("/api/images/compose", {
          method: "POST",
          body: JSON.stringify(payload),
        }) as any;
        const bgUrl = data?.background?.url
          ? (String(data.background.url).startsWith("http") ? data.background.url : `${NEOBOT_API_BASE}${data.background.url}`)
          : "";
        const compositeUrl = data?.composite?.url
          ? (String(data.composite.url).startsWith("http") ? data.composite.url : `${NEOBOT_API_BASE}${data.composite.url}`)
          : "";
        const responseFormat = data?.format || composeFormat;
        const resolution = data?.resolution || "standard";
        setComposeState({
          backgroundUrl: bgUrl,
          layers: Array.isArray(data?.layers) ? data.layers : [],
          format: responseFormat,
          resolution,
        });
        setLastComposeMeta({ backgroundUrl: bgUrl, format: responseFormat, resolution });
        const texts = data?.texts || {};
        setDraftTexts({
          headline: texts.headline || "",
          subheadline: texts.subheadline || "",
          bullets: [],
          cta: texts.cta || "",
        });
        const sections: ImageSection[] = [
          { id: "headline", title: "Nadpis", content: texts.headline || "" },
          { id: "subheadline", title: "Podnadpis", content: texts.subheadline || "" },
          { id: "cta", title: "Výzva k akci (CTA)", content: texts.cta || "" },
          { id: "format", title: "Formát", content: getFormatLabel() },
        ].filter(s => s.content);
        setImageOutput({
          name: `${selectedFunction?.label || "Grafika"} – s textem`,
          style: getStyleLabel(),
          format: getFormatLabel(),
          purpose: purposeOptions.find(p => p.id === purpose)?.label || "Prodej",
          imageUrl: compositeUrl,
          logoUrl: null,
          sections,
        });
        setCurrentStep("proposal");
      } catch (e: any) {
        const status = e?.status;
        const msg = e?.message || "Compose selhal";
        let displayMsg = msg;
        if (status === 429) displayMsg = "Limit poskytovatele (zkus později)";
        else if (status === 503) displayMsg = "Model je dočasně nedostupný";
        setErrorCompose(displayMsg);
        if (status === 429) toast.error("Limit poskytovatele (zkus později)");
        else if (status === 503) toast.error("Model je dočasně nedostupný");
        else toast.error(msg);
      } finally {
        setLoadingCompose(false);
        setIsGenerating(false);
      }
      return;
    }

    // Visual mode → single background via /api/images/compose with backgroundOnly: true
    try {
      const bgData = await fetchVisualBackground(inputValue);

      const resolvedBgUrl = bgData.backgroundUrl || null;

      const sections = generateMockContent();
      if (bgData.prompt) {
        sections[0] = { id: "main-prompt", title: "Hlavní Prompt", content: bgData.prompt };
      }

      setImageOutput({
        name: selectedFunction?.label || "Vizuál",
        style: getStyleLabel(),
        format: getFormatLabel(),
        purpose: purposeOptions.find(p => p.id === purpose)?.label || "Prodej",
        imageUrl: resolvedBgUrl,
        sections,
      });
      setCurrentStep("proposal");
    } catch (e: any) {
      console.error("Background generation error:", e?.status, e?.responseData, e?.message);
      const msg = e?.message || "Generování obrázku se nezdařilo. Zkontroluj konzoli (F12) a REPLICATE_API_TOKEN na serveru.";
      toast.error("Chyba: " + msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelEdits = () => {
    const initial = initialLayoutRef.current;
    if (initial) setLayout(JSON.parse(JSON.stringify(initial)));
    setSelectedLayer(null);
  };

  const handleUpdateLayout = async () => {
    const meta = lastComposeMeta || composeState;
    if (!meta?.backgroundUrl) return;
    setErrorRender(null);
    setLoadingRender(true);
    try {
      const h = layout.headline;
      const s = layout.subheadline;
      const c = layout.cta;
      const layoutOverrides = {
        headline: { xPct: h.xPct, yPct: h.yPct, fontSize: h.fontSize, color: h.color, useAutoContrast: h.useAutoContrast !== false },
        subheadline: { xPct: s.xPct, yPct: s.yPct, fontSize: s.fontSize, color: s.color, useAutoContrast: s.useAutoContrast !== false },
        cta: isCtaLayout(c)
          ? { xPct: c.xPct, yPct: c.yPct, widthPct: c.widthPct, heightPct: c.heightPct, fontSize: c.fontSize, color: c.color, bgColor: c.bgColor || "#2563eb", borderRadius: typeof c.borderRadius === "number" ? c.borderRadius : 999, useAutoContrast: c.useAutoContrast !== false }
          : { xPct: c.xPct, yPct: c.yPct, widthPct: 0.26, heightPct: 0.06, fontSize: c.fontSize, color: c.color, bgColor: "#2563eb", borderRadius: 999, useAutoContrast: c.useAutoContrast !== false },
      };
      const data = await neobotFetch("/api/images/compose/render", {
        method: "POST",
        body: JSON.stringify({
          backgroundUrl: meta.backgroundUrl,
          format: meta.format,
          resolution: meta.resolution,
          headline: draftTexts.headline,
          subheadline: draftTexts.subheadline,
          cta: draftTexts.cta,
          layout: layoutOverrides,
          layoutOverrides,
          autoContrast: true,
        }),
      }) as any;
      const compositeUrl = data?.composite?.url
        ? (String(data.composite.url).startsWith("http") ? data.composite.url : `${NEOBOT_API_BASE}${data.composite.url}`)
        : "";
      if (compositeUrl && imageOutput) {
        setImageOutput({ ...imageOutput, imageUrl: compositeUrl });
      }
      if (Array.isArray(data?.layers)) {
        setComposeState((prev) => (prev ? { ...prev, layers: data.layers } : null));
      }
    } catch (e: any) {
      const status = e?.status;
      const msg = e?.message || "Render selhal";
      const displayMsg = status === 500 ? "Render se nepodařil" : msg;
      setErrorRender(displayMsg);
      if (status === 400) toast.error(msg);
      else if (status === 500) toast.error("Render se nepodařil");
      else toast.error(msg);
    } finally {
      setLoadingRender(false);
    }
  };

  const updateLayerPosition = (id: string, x: number, y: number) => {
    setComposeState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        layers: prev.layers.map((l: any) => (l.id === id ? { ...l, x, y } : l)),
      };
    });
  };

  const handleEditSection = (sectionId: string) => {
    if (!imageOutput) return;
    setImageOutput({
      ...imageOutput,
      sections: imageOutput.sections.map(s => 
        s.id === sectionId ? { ...s, isEditing: !s.isEditing } : s
      )
    });
  };

  const handleSectionChange = (sectionId: string, content: string) => {
    if (!imageOutput) return;
    setImageOutput({
      ...imageOutput,
      sections: imageOutput.sections.map(s => 
        s.id === sectionId ? { ...s, content } : s
      )
    });
  };

  const handleContinueToOutput = () => setCurrentStep("output");
  const handleEditInput = () => setCurrentStep("input");
  const handleEditProposal = () => setCurrentStep("proposal");

  const handleNewVariant = () => {
    setCurrentStep("input");
    setInputValue("");
    setImageOutput(null);
    setComposeState(null);
    setErrorCompose(null);
    setErrorRender(null);
  };

  const handleNewImage = () => {
    setCurrentStep("select");
    setSelectedFunction(null);
    setInputValue("");
    setImageOutput(null);
    setComposeState(null);
    setErrorCompose(null);
    setErrorRender(null);
    setOutputMode("visual");
    setMainBrief("");
    setTopic("");
    setKeywords("");
    setOffer("");
    setDraftTexts({ headline: "", subheadline: "", bullets: [], cta: "" });
    setMarketingStep(0);
    toast.success("Připraveno pro další vizuál");
  };

  const handleCopyAll = () => {
    if (!imageOutput) return;
    if (outputMode === "marketing") {
      const text = imageOutput.sections.map(s => `${s.title}:\n${s.content}`).join("\n\n");
      navigator.clipboard.writeText(text);
    } else {
      navigator.clipboard.writeText(generateImagePrompt());
    }
    toast.success("Zkopírováno do schránky");
  };

  const handleCopySection = (section: ImageSection) => {
    navigator.clipboard.writeText(section.content);
    toast.success("Sekce zkopírována");
  };

  const handleDownload = () => {
    if (!imageOutput) return;
    const content = imageOutput.sections.map(s => `${s.title.toUpperCase()}:\n${s.content}`).join("\n\n---\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neobot-image-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Staženo");
  };

  const handleSave = () => toast.success("Prompt uložen");

  const getStepNumber = () => {
    switch (currentStep) {
      case "select": return 1;
      case "input": return 2;
      case "proposal": return 3;
      case "output": return 4;
    }
  };

  const steps = [
    { label: "Typ vizuálu" },
    { label: "Zadání" },
    { label: "Návrh" },
    { label: "Výstup" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
          <Image className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Obrázkový NeoBot</h1>
          <p className="text-muted-foreground">Grafik a vizuální kreativec pro tvůj brand</p>
        </div>
      </div>

      <NeoBotSteps currentStep={getStepNumber()} steps={steps} accentColor="accent" />

      {taskContext && <TaskContextBanner taskContext={taskContext} onNavigateBack={navigateBackToTask} />}

      {/* STEP 1: Select visual type – pouze výběr karet vlevo, bez prázdného panelu */}
      {currentStep === "select" && (
        <div className="max-w-xl">
          <h2 className="font-semibold text-foreground mb-4">Co chceš vytvořit?</h2>
          <div className="space-y-1">
            {functionCategories.map((category) => (
              <div key={category.id} className="glass rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <category.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-medium text-sm text-foreground">{category.title}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCategory === category.id ? "rotate-180" : ""}`} />
                </button>
                {expandedCategory === category.id && (
                  <div className="px-3 pb-3 space-y-1">
                    {category.functions.map((func) => (
                      <button
                        key={func.id}
                        onClick={() => handleFunctionSelect(func)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      >
                        <div className="font-medium">{func.label}</div>
                        <div className="text-xs opacity-70">{func.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Input & Settings */}
      {currentStep === "input" && selectedFunction && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{selectedFunction.label}</h3>
                <p className="text-sm text-muted-foreground">{selectedFunction.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("select")}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zpět
              </Button>
            </div>

            {/* Output Mode Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Výstupní režim</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOutputMode("visual")}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    outputMode === "visual"
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Image className={`w-5 h-5 shrink-0 ${outputMode === "visual" ? "text-accent" : "text-muted-foreground"}`} />
                  <div>
                    <div className="text-sm font-medium text-foreground">Vizuál bez textu</div>
                    <div className="text-xs text-muted-foreground">Pozadí, fotka, ilustrace</div>
                  </div>
                </button>
                <button
                  onClick={() => setOutputMode("marketing")}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    outputMode === "marketing"
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Type className={`w-5 h-5 shrink-0 ${outputMode === "marketing" ? "text-accent" : "text-muted-foreground"}`} />
                  <div>
                    <div className="text-sm font-medium text-foreground">Grafika s textem</div>
                    <div className="text-xs text-muted-foreground">Leták, banner, promo</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Rychlé nastavení</h4>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Styl</label>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map(opt => (
                    <button key={opt.id} onClick={() => setStyle(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        style === opt.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Formát <span className="text-xs opacity-60">(odvozeno z typu)</span></label>
                <div className="flex flex-wrap gap-2">
                  {formatOptions.map(opt => (
                    <button key={opt.id} onClick={() => setFormat(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        format === opt.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Účel</label>
                <div className="flex flex-wrap gap-2">
                  {purposeOptions.map(opt => (
                    <button key={opt.id} onClick={() => setPurpose(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        purpose === opt.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Barevnost</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(opt => (
                    <button key={opt.id} onClick={() => setColor(opt.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        color === opt.id ? "bg-accent text-accent-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {outputMode === "marketing" && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((o) => !o)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                    Pokročilé (kompozice a umístění textu)
                  </button>
                  {advancedOpen && (
                    <>
                      <div className="space-y-2 pl-6">
                        <label className="text-sm text-muted-foreground">Kompozice textu</label>
                        <select
                          value={textLayout}
                          onChange={e => setTextLayout(e.target.value as "auto" | "flyer" | "balanced" | "visual")}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                          <option value="auto">Auto (AI podle obrázku)</option>
                          <option value="flyer">Leták (text dominuje)</option>
                          <option value="balanced">Vyvážená</option>
                          <option value="visual">Vizuál dominuje</option>
                        </select>
                      </div>
                      <div className="space-y-2 pl-6">
                        <label className="text-sm text-muted-foreground">Umístění textu</label>
                        <select
                          value={textPlacement}
                          onChange={e => setTextPlacement(e.target.value as "auto" | "bottom_left" | "bottom_center" | "top_left" | "top_center" | "center" | "right_panel")}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                          <option value="auto">Auto (podle obrázku)</option>
                          <option value="bottom_left">Dole vlevo</option>
                          <option value="bottom_center">Dole na středu</option>
                          <option value="top_left">Nahoře vlevo</option>
                          <option value="top_center">Nahoře na středu</option>
                          <option value="center">Na středu</option>
                          <option value="right_panel">Vpravo (panel)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Marketing mode: jeden hlavní prompt */}
            {outputMode === "marketing" && (
              <div className="space-y-4 border-t border-border/50 pt-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground block">Zadání pro grafiku</label>
                  <Textarea
                    placeholder="Např.: Jarní kolekce dámské módy, fashion butik — nebo: moderní interiér obýváku, kovové zahradní vrátky s povrchovou úpravou"
                    value={mainBrief}
                    onChange={e => setMainBrief(e.target.value)}
                    className="min-h-[100px] bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">Podle tohoto textu se vygeneruje pozadí i texty grafiky.</p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!mainBrief.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
                  size="lg"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generuji návrh...</>
                  ) : (
                    <>Vytvořit návrh<ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                {isDebug && mainBrief.trim() && (() => {
                  const debugPrompt = buildUnifiedBrief({
                    mainBrief: mainBrief.trim(),
                    topic: topic.trim() || undefined,
                    keywords: keywords.trim() || undefined,
                    offer: offer.trim() || undefined,
                  });
                  const displayPrompt = debugPrompt.length > 400 ? debugPrompt.slice(0, 400) + "…" : debugPrompt;
                  return (
                    <div className="rounded-lg bg-muted/50 p-3 text-left">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Prompt poslaný do API:</p>
                      <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-32 overflow-auto">{displayPrompt}</pre>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Visual mode: single input */}
            {outputMode !== "marketing" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Zadání</label>
                  <Textarea
                    placeholder="Např.: Fotka zahradní branky v moderním stylu, světlé pozadí, důraz na detail a kvalitu zpracování"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="min-h-[100px] bg-background/50"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!inputValue.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
                  size="lg"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generuji návrh...</>
                  ) : (
                    <>Vytvořit návrh<ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Proposal (Editable) */}
      {currentStep === "proposal" && imageOutput && (
        <div className={`space-y-6 ${outputMode === "marketing" && composeState ? "max-w-[1400px] mx-auto" : "max-w-3xl mx-auto"}`}>
          <div style={{ position: "fixed", top: 10, left: 10, zIndex: 9999, background: "red", color: "white", padding: "6px 10px", borderRadius: "8px" }}>
            UI_STEP3_PATCH_ACTIVE
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">{imageOutput.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">{imageOutput.style}</span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">{imageOutput.format}</span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">{imageOutput.purpose}</span>
                {outputMode === "marketing" && (
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">Grafika s textem</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEditInput}>
                <Pencil className="w-4 h-4 mr-1" />Upravit zadání
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleGenerate()}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />Regenerovat
              </Button>
            </div>
          </div>

          {/* Marketing: grid = preview (left) + inspector panel (right). Visual: single column. */}
          {outputMode === "marketing" && composeState?.backgroundUrl ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Left: preview – fixní výška, celý obrázek vidět bez scrollu */}
              <div
                ref={previewContainerRef}
                className="relative rounded-2xl border border-white/10 bg-white/5 h-[calc(100vh-260px)] min-h-[520px] overflow-hidden flex items-center justify-center"
              >
                {editMode && Array.isArray(composeState.layers) && composeState.layers.some((l: any) => (l.type === "text" || l.type === "button") && typeof l.x === "number") ? (
                  <ComposeEditor
                    composeState={composeState}
                    draftTexts={draftTexts}
                    backgroundImageUrl={composeState.backgroundUrl.startsWith("http") ? composeState.backgroundUrl : `${NEOBOT_API_BASE}${composeState.backgroundUrl}`}
                    layout={layout}
                    setLayout={setLayout}
                    selectedLayer={selectedLayer}
                    onSelectLayer={setSelectedLayer}
                    scale={1}
                    fillContainer
                    containerRef={previewContainerRef}
                    aspectRatio={getCanvasDimensions(composeState.format, composeState.resolution).width / getCanvasDimensions(composeState.format, composeState.resolution).height}
                  />
                ) : (
                  <img
                    src={imageOutput.imageUrl || (composeState.backgroundUrl.startsWith("http") ? composeState.backgroundUrl : `${NEOBOT_API_BASE}${composeState.backgroundUrl}`)}
                    alt="Návrh"
                    className="w-full h-full object-contain"
                  />
                )}
                {loadingRender && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <span className="ml-2 text-white text-sm">Aktualizuji layout…</span>
                  </div>
                )}
              </div>

              {/* Right: editor panel – sticky, scrollovatelný */}
              <div className="sticky top-24 h-[calc(100vh-260px)] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col">
                <div className="space-y-4 pb-4">
                  {composeState && (
                    <Button
                      variant={editMode ? "secondary" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => setEditMode((v) => !v)}
                    >
                      <LayoutTemplate className="w-4 h-4 mr-1" />
                      {editMode ? "Skrýt editor" : "Upravit design"}
                    </Button>
                  )}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Texty grafiky</h4>
                    {composeState && (
                      <Button variant="outline" size="sm" onClick={() => handleGenerate()} disabled={loadingCompose}>
                        <Wand2 className={`w-4 h-4 mr-1 ${loadingCompose ? "animate-spin" : ""}`} />
                        Přepsat od AI
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Vybraný prvek</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button type="button" variant={selectedLayer === "headline" ? "default" : "outline"} size="sm" onClick={() => setSelectedLayer(selectedLayer === "headline" ? null : "headline")}>Nadpis</Button>
                      <Button type="button" variant={selectedLayer === "subheadline" ? "default" : "outline"} size="sm" onClick={() => setSelectedLayer(selectedLayer === "subheadline" ? null : "subheadline")}>Podnadpis</Button>
                      <Button type="button" variant={selectedLayer === "cta" ? "default" : "outline"} size="sm" onClick={() => setSelectedLayer(selectedLayer === "cta" ? null : "cta")}>CTA</Button>
                    </div>
                  </div>
                  {selectedLayer && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                      <h5 className="text-sm font-medium text-foreground">Upravit: {selectedLayer === "headline" ? "Nadpis" : selectedLayer === "subheadline" ? "Podnadpis" : "CTA"}</h5>
                      <div className="space-y-2">
                        <Label>Velikost písma</Label>
                        <Slider value={[layout[selectedLayer].fontSize]} onValueChange={([v]) => setLayout((prev) => ({ ...prev, [selectedLayer]: { ...prev[selectedLayer], fontSize: v ?? prev[selectedLayer].fontSize } }))} min={12} max={selectedLayer === "cta" ? 24 : 72} step={2} />
                        <span className="text-xs text-muted-foreground">{layout[selectedLayer].fontSize}px</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Label>Automatický kontrast</Label>
                        <button type="button" role="switch" aria-checked={layout[selectedLayer].useAutoContrast !== false} onClick={() => setLayout((prev) => ({ ...prev, [selectedLayer]: { ...prev[selectedLayer], useAutoContrast: !(prev[selectedLayer].useAutoContrast !== false) } }))} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${(layout[selectedLayer].useAutoContrast !== false) ? "bg-primary" : "bg-muted"}`}>
                          <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow ring-0 transition-transform ${(layout[selectedLayer].useAutoContrast !== false) ? "translate-x-5" : "translate-x-0.5"}`} style={{ marginTop: 2 }} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Label>Barva textu</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={layout[selectedLayer].color} onChange={(e) => setLayout((prev) => ({ ...prev, [selectedLayer]: { ...prev[selectedLayer], color: e.target.value } }))} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" disabled={layout[selectedLayer].useAutoContrast !== false} />
                          <Input value={layout[selectedLayer].color} onChange={(e) => setLayout((prev) => ({ ...prev, [selectedLayer]: { ...prev[selectedLayer], color: e.target.value || "#ffffff" } }))} className="flex-1 font-mono text-sm bg-background/50" disabled={layout[selectedLayer].useAutoContrast !== false} />
                        </div>
                      </div>
                      {selectedLayer === "cta" && isCtaLayout(layout.cta) && (
                        <>
                          <div className="space-y-2">
                            <Label>Barva pozadí CTA</Label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={layout.cta.bgColor && /^#[0-9a-fA-F]{3,8}$/.test(layout.cta.bgColor) ? layout.cta.bgColor : "#2563eb"} onChange={(e) => setLayout((prev) => ({ ...prev, cta: { ...prev.cta, bgColor: e.target.value } }))} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" />
                              <Input value={layout.cta.bgColor || "#2563eb"} onChange={(e) => setLayout((prev) => ({ ...prev, cta: { ...prev.cta, bgColor: e.target.value || "#2563eb" } }))} className="flex-1 font-mono text-sm bg-background/50" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Zaoblení rohů</Label>
                            <Slider value={[typeof layout.cta.borderRadius === "number" ? layout.cta.borderRadius : 999]} onValueChange={([v]) => setLayout((prev) => ({ ...prev, cta: { ...prev.cta, borderRadius: v ?? 999 } }))} min={0} max={999} step={4} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Nadpis</label>
                    <Input value={draftTexts.headline} onChange={e => setDraftTexts(prev => ({ ...prev, headline: e.target.value }))} className="bg-background/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Podnadpis</label>
                    <Input value={draftTexts.subheadline} onChange={e => setDraftTexts(prev => ({ ...prev, subheadline: e.target.value }))} className="bg-background/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">CTA</label>
                    <Input value={draftTexts.cta} onChange={e => setDraftTexts(prev => ({ ...prev, cta: e.target.value }))} className="bg-background/50" />
                  </div>
                </div>
                <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-black/70 to-transparent space-y-2">
                  <Button className="w-full" onClick={handleUpdateLayout} disabled={loadingRender || !composeState}>
                    {loadingRender ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aktualizuji…</> : "Použít změny"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleCancelEdits}>
                    Zrušit úpravy
                  </Button>
                </div>
              </div>
            </div>
          ) : outputMode === "marketing" ? (
            <div className="glass rounded-xl p-8 text-center">
              {imageOutput?.imageUrl ? (
                <div className="relative inline-block w-full max-w-md mx-auto">
                  <img src={imageOutput.imageUrl} alt="Návrh" className="w-full rounded-lg object-contain max-h-[70vh]" />
                  {loadingRender && (
                    <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                      <span className="ml-2 text-white text-sm">Aktualizuji layout…</span>
                    </div>
                  )}
                </div>
              ) : isGenerating || loadingCompose ? (
                <div className="w-full aspect-square max-w-md mx-auto rounded-lg bg-muted/50 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground mt-2">Generuji obrázek…</p>
                </div>
              ) : (
                <Button onClick={() => handleGenerate()} variant="outline">
                  <Image className="w-4 h-4 mr-2" />Vygenerovat obrázek
                </Button>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              {imageOutput?.imageUrl ? (
                <img src={imageOutput.imageUrl} alt="Návrh" className="w-full max-w-md mx-auto rounded-lg object-contain max-h-[70vh]" />
              ) : isGenerating || loadingCompose ? (
                <div className="w-full aspect-square max-w-md mx-auto rounded-lg bg-muted/50 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground mt-2">Generuji obrázek…</p>
                </div>
              ) : (
                <Button onClick={() => handleGenerate()} variant="outline">
                  <Image className="w-4 h-4 mr-2" />Vygenerovat obrázek
                </Button>
              )}
            </div>
          )}

          {/* Content Sections: errors + debug (marketing); sections for visual */}
          {outputMode === "marketing" ? (
            <div className="space-y-4">
              {(errorCompose || errorRender) && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorCompose && <p><strong>Compose:</strong> {errorCompose}</p>}
                  {errorRender && <p><strong>Render:</strong> {errorRender}</p>}
                </div>
              )}
              {isDebug && (
                <p className="text-xs text-muted-foreground">
                  compose calls: /api/images/compose · render calls: /api/images/compose/render
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {imageOutput.sections.map((section) => (
                <div key={section.id} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{section.title}</h4>
                    <div className="flex gap-1">
                      <button onClick={() => handleCopySection(section)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditSection(section.id)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        {section.isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {section.isEditing ? (
                    <Textarea value={section.content} onChange={(e) => handleSectionChange(section.id, e.target.value)} className="min-h-[100px] bg-background/50" />
                  ) : (
                    <div className="text-muted-foreground whitespace-pre-wrap">{section.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleContinueToOutput} className="bg-gradient-to-r from-accent to-primary hover:opacity-90" size="lg">
              Pokračovat k výstupu<ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Output */}
      {currentStep === "output" && imageOutput && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{imageOutput.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span><strong className="text-foreground">Styl:</strong> {imageOutput.style}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span><strong className="text-foreground">Formát:</strong> {imageOutput.format}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button variant="outline" size="sm" onClick={handleCopyAll}>
                  <Copy className="w-4 h-4 mr-1" />Zkopírovat
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />Stáhnout
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" />Uložit
                </Button>
                {taskContext && (
                  <Button size="sm" disabled={isSavingToTask || savedToTask}
                    onClick={() => {
                      const content = outputMode === "marketing"
                        ? imageOutput.sections.map(s => `${s.title}:\n${s.content}`).join("\n\n")
                        : generateImagePrompt();
                      saveOutputToTask("visual_prompt", content);
                    }}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    {isSavingToTask ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-1" />}
                    {savedToTask ? "Uloženo k úkolu" : "Uložit k úkolu"}
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              {imageOutput.imageUrl ? (
                <div className="relative inline-block w-full max-w-lg">
                  <img src={imageOutput.imageUrl} alt={imageOutput.name} className="w-full rounded-lg object-contain max-h-[500px]" />
                  {outputMode === "marketing" && imageOutput.logoUrl && (
                    <div className="absolute top-3 right-3 w-12 h-12 rounded-lg bg-background/90 shadow flex items-center justify-center overflow-hidden">
                      <img src={imageOutput.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg bg-muted/30 flex items-center justify-center">
                  <div className="text-center">
                    <Image className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {outputMode === "marketing" ? "Obrázek bude dostupný po připojení image enginu" : "Náhled vizuálu"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h4 className="font-semibold text-foreground mb-4">Co dál?</h4>
            <p className="text-sm text-muted-foreground mb-6">Vizuál je připraven. Můžeš pokračovat tvorbou textu nebo videa.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <FileText className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Napsat text</div>
                  <div className="text-xs text-muted-foreground">Textový NeoBot</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-4 px-4">
                <Video className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Navrhnout video</div>
                  <div className="text-xs text-muted-foreground">Video NeoBot</div>
                </div>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {taskContext && (
              <Button variant="default" onClick={navigateBackToTask} className="bg-gradient-to-r from-primary to-accent">
                <ArrowLeft className="w-4 h-4 mr-1" />Vrátit se do úkolu
              </Button>
            )}
            <Button variant="ghost" onClick={handleNewVariant}>Vytvořit variantu</Button>
            <Button variant="ghost" onClick={handleEditProposal}>
              <Pencil className="w-4 h-4 mr-1" />Upravit návrh
            </Button>
            <Button variant="ghost" onClick={handleNewImage}>Nový vizuál</Button>
          </div>
        </div>
      )}
    </div>
  );
}
