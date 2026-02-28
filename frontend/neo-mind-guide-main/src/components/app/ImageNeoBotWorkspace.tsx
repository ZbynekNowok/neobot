import { useState, useEffect } from "react";
import { useTaskOutputSaver } from "@/hooks/useTaskOutputSaver";
import TaskContextBanner from "@/components/app/TaskContextBanner";
import { NEOBOT_API_BASE, NEOBOT_API_KEY, saveOutputToHistory, neobotFetch } from "@/lib/neobot";
import { 
  ArrowRight,
  Image,
  Instagram,
  ShoppingBag,
  Megaphone,
  Palette,
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
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Group, Rect } from "react-konva";
import { UserProfile } from "@/components/app/AppLayout";
import NeoBotSteps from "@/components/app/NeoBotSteps";
import { toast } from "sonner";

interface ImageFunction {
  id: string;
  label: string;
  description: string;
  defaultFormat: "square" | "portrait" | "landscape" | "story";
}

interface FunctionCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  functions: ImageFunction[];
}

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

// Each function now has a defaultFormat derived from type
const functionCategories: FunctionCategory[] = [
  {
    id: "social",
    title: "Sociální sítě",
    icon: Instagram,
    functions: [
      { id: "instagram-post", label: "Příspěvek na Instagram", description: "Vizuálně atraktivní grafika pro Instagram feed.", defaultFormat: "square" },
      { id: "facebook-post", label: "Facebook post", description: "Vizuál optimalizovaný pro Facebook.", defaultFormat: "landscape" },
      { id: "stories", label: "Instagram Stories", description: "Vertikální grafika pro příběhy.", defaultFormat: "story" },
      { id: "reel-cover", label: "Reel cover / náhled", description: "Poutavý náhled pro Reels nebo TikTok.", defaultFormat: "portrait" },
    ]
  },
  {
    id: "products",
    title: "Produkty & e-shop",
    icon: ShoppingBag,
    functions: [
      { id: "product-visual", label: "Produktový vizuál", description: "Profesionální vizualizace produktu.", defaultFormat: "square" },
      { id: "lifestyle", label: "Lifestyle fotka", description: "Produkt v reálném prostředí.", defaultFormat: "landscape" },
      { id: "white-bg", label: "Produkt na bílém pozadí", description: "Čistá produktová fotografie.", defaultFormat: "square" },
      { id: "banner", label: "Produktový banner", description: "Banner pro e-shop nebo reklamu.", defaultFormat: "landscape" },
    ]
  },
  {
    id: "ads",
    title: "Reklama & bannery",
    icon: Megaphone,
    functions: [
      { id: "ad-banner", label: "Reklamní banner", description: "Banner pro online reklamní kampaně.", defaultFormat: "landscape" },
      { id: "hero-visual", label: "Hero vizuál", description: "Hlavní vizuál pro kampaň.", defaultFormat: "landscape" },
      { id: "promo", label: "Promo grafika", description: "Grafika pro akce a novinky.", defaultFormat: "square" },
      { id: "banner-16-9", label: "Banner (16:9)", description: "Široký banner pro web a reklamu.", defaultFormat: "landscape" },
      { id: "letak-4-5", label: "Leták / promo (4:5)", description: "Vertikální leták pro Instagram a print.", defaultFormat: "portrait" },
      { id: "letak-1-1", label: "Leták / promo (1:1)", description: "Čtvercový leták pro sociální sítě.", defaultFormat: "square" },
    ]
  },
  {
    id: "branding",
    title: "Branding & identita",
    icon: Palette,
    functions: [
      { id: "brand-visual", label: "Vizuál značky", description: "Vizuál reprezentující hodnoty značky.", defaultFormat: "square" },
      { id: "moodboard", label: "Moodboard", description: "Inspirační koláž pro vizuální směr.", defaultFormat: "landscape" },
      { id: "style-images", label: "Stylové obrázky", description: "Série konzistentních vizuálů.", defaultFormat: "square" },
    ]
  },
  {
    id: "edits",
    title: "Úpravy & varianty",
    icon: Wand2,
    functions: [
      { id: "variant", label: "Varianta vizuálu", description: "Nová verze stávajícího obrázku.", defaultFormat: "square" },
      { id: "style-change", label: "Jiný styl", description: "Změna stylu nebo atmosféry.", defaultFormat: "square" },
      { id: "format-change", label: "Jiný formát", description: "Přizpůsobení poměru stran.", defaultFormat: "square" },
    ]
  },
];

type OutputMode = "visual" | "marketing";

// Quick settings
const styleOptions = [
  { id: "minimalist", label: "Minimalistický" },
  { id: "luxury", label: "Luxusní" },
  { id: "playful", label: "Hravý" },
  { id: "natural", label: "Přirozený" },
];

const formatOptions = [
  { id: "square", label: "1:1 (čtverec)" },
  { id: "portrait", label: "9:16 (výška)" },
  { id: "landscape", label: "16:9 (šířka)" },
  { id: "story", label: "Story (9:16)" },
];

const purposeOptions = [
  { id: "prodej", label: "Prodej" },
  { id: "brand", label: "Brand" },
  { id: "engagement", label: "Engagement" },
  { id: "edukace", label: "Edukace" },
];

const colorOptions = [
  { id: "neutral", label: "Neutrální" },
  { id: "warm", label: "Teplé" },
  { id: "cool", label: "Studené" },
  { id: "vibrant", label: "Výrazné" },
];


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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Draft response texts (editable after generation)
  const [draftTexts, setDraftTexts] = useState<{ headline: string; subheadline: string; bullets: string[]; cta: string }>({ headline: "", subheadline: "", bullets: [], cta: "" });

  // Quick settings
  const [style, setStyle] = useState("minimalist");
  const [format, setFormat] = useState("square");
  const [purpose, setPurpose] = useState("prodej");
  const [color, setColor] = useState("neutral");
  const [textLayout, setTextLayout] = useState<"flyer" | "balanced" | "visual">("flyer");
  const [textPlacement, setTextPlacement] = useState<"auto" | "bottom_left" | "bottom_center" | "top_left" | "top_center" | "center" | "right_panel">("bottom_left");
  
  // Output data
  const [imageOutput, setImageOutput] = useState<ImageOutputData | null>(null);
  const [composeState, setComposeState] = useState<ComposeState | null>(null);
  const [loadingCompose, setLoadingCompose] = useState(false);
  const [loadingRender, setLoadingRender] = useState(false);
  const [errorCompose, setErrorCompose] = useState<string | null>(null);
  const [errorRender, setErrorRender] = useState<string | null>(null);
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


  // Direct fetch to NeoBot API for image generation
  const neobotImageFetch = async (prompt: string, backendFormat: string) => {
    const res = await fetch(`${NEOBOT_API_BASE}/api/marketing/background`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": NEOBOT_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        format: backendFormat,
        style: getStyleLabel(),
        purpose: purposeOptions.find(p => p.id === purpose)?.label || "Prodej",
        color: colorOptions.find(c => c.id === color)?.label || "Neutrální",
      }),
    });

    const body = await res.json().catch(() => null);
    console.log("[Image Generate] status", res.status, "body", body);

    if (!res.ok || !body || body.ok === false) {
      let msg = (body && (body.message || body.error)) || "Generování obrázku se nezdařilo.";
      if (res.status === 401 || res.status === 403) msg = "Chybí nebo je neplatný API klíč.";
      if (res.status === 402) msg = "Došel kredit / units.";
      if (res.status === 400) msg = body?.message || body?.error || "Chybný požadavek (chybí prompt?).";
      throw new Error(msg);
    }

    return body;
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
        setComposeState({
          backgroundUrl: bgUrl,
          layers: Array.isArray(data?.layers) ? data.layers : [],
          format: data?.format || composeFormat,
          resolution: data?.resolution || "standard",
        });
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

    // Visual mode → call /api/marketing/background directly
    try {
      const bgData = await neobotImageFetch(inputValue, backendFormat);

      const bgUrl = bgData?.backgroundUrl || bgData?.imageUrl || bgData?.url;
      const resolvedBgUrl = bgUrl
        ? (bgUrl.startsWith("http") ? bgUrl : `${NEOBOT_API_BASE}${bgUrl}`)
        : null;

      const sections = generateMockContent();
      if (bgData?.prompt) {
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
      console.error("Background generation error:", e);
      toast.error("Chyba: " + (e?.message || "Neznámá chyba"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateLayout = async () => {
    if (!composeState) return;
    setErrorRender(null);
    setLoadingRender(true);
    try {
      const updatedLayers = composeState.layers.map((layer: any) => {
        if (layer.type === "text" && layer.id === "headline") return { ...layer, text: draftTexts.headline };
        if (layer.type === "text" && layer.id === "subheadline") return { ...layer, text: draftTexts.subheadline };
        if (layer.type === "button" && layer.id === "cta") return { ...layer, text: draftTexts.cta };
        return layer;
      });
      const data = await neobotFetch("/api/images/compose/render", {
        method: "POST",
        body: JSON.stringify({
          backgroundUrl: composeState.backgroundUrl,
          format: composeState.format,
          resolution: composeState.resolution,
          layers: updatedLayers,
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

      {/* STEP 1: Select visual type */}
      {currentStep === "select" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
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

          <div className="lg:col-span-3">
            <div className="glass rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Vyber typ vizuálu</h3>
              <p className="text-sm text-muted-foreground">
                Zvol z kategorií vlevo, jaký obrázek chceš vytvořit
              </p>
            </div>
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
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Kompozice textu</label>
                    <select
                      value={textLayout}
                      onChange={e => setTextLayout(e.target.value as "flyer" | "balanced" | "visual")}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="flyer">Leták (text dominuje)</option>
                      <option value="balanced">Vyvážená</option>
                      <option value="visual">Vizuál dominuje</option>
                    </select>
                  </div>
                  <div className="space-y-2">
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

            {/* Marketing mode: one main field + optional collapsible */}
            {outputMode === "marketing" && (
              <div className="space-y-4 border-t border-border/50 pt-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-accent" />
                  Konzultační zadání pro grafiku
                </h4>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground block">Co chcete vytvořit?</label>
                  <Textarea
                    placeholder="Např.: Jarní kolekce dámské módy, fashion butik — nebo: moderní interiér obýváku"
                    value={mainBrief}
                    onChange={e => setMainBrief(e.target.value)}
                    className="min-h-[70px] bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">Povinné pole; podle něj se vygeneruje pozadí i texty.</p>
                </div>
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                      Pokročilé upřesnění (volitelné)
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid gap-4 pt-4 pl-6 border-l-2 border-border/50">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground block">Kontext / téma</label>
                        <Input
                          placeholder="Např.: Zahradní branka, wellness balíček, sezónní menu"
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground block">Klíčová slova (oddělená čárkou)</label>
                        <Input
                          placeholder="Např.: kvalita, akce, novinka, doprava zdarma"
                          value={keywords}
                          onChange={e => setKeywords(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground block">Popis produktu</label>
                        <Textarea
                          placeholder="Např.: Kovové zahradní vrátky s povrchovou úpravou, odolné vůči povětrnostním podmínkám"
                          value={offer}
                          onChange={e => setOffer(e.target.value)}
                          className="min-h-[70px] bg-background/50"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
        <div className="max-w-3xl mx-auto space-y-6">
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

          {/* Image Preview: Konva drag editor (marketing) or static image */}
          <div className="glass rounded-xl p-8 text-center">
            {outputMode === "marketing" && composeState?.backgroundUrl && backgroundImage && Array.isArray(composeState.layers) && composeState.layers.some((l: any) => (l.type === "text" || l.type === "button") && typeof l.x === "number" && typeof l.y === "number") ? (
              <div className="relative inline-block w-full max-w-md mx-auto">
                <ComposeCanvas
                  composeState={composeState}
                  draftTexts={draftTexts}
                  backgroundImage={backgroundImage}
                  onLayerDragEnd={updateLayerPosition}
                />
                {loadingRender && (
                  <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <span className="ml-2 text-white text-sm">Aktualizuji layout…</span>
                  </div>
                )}
                {imageOutput?.logoUrl && (
                  <div className="absolute top-3 right-3 w-14 h-14 rounded-lg bg-background/90 shadow-md flex items-center justify-center overflow-hidden pointer-events-none">
                    <img src={imageOutput.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            ) : imageOutput?.imageUrl ? (
              <div className="relative inline-block w-full max-w-md mx-auto">
                <img src={imageOutput.imageUrl} alt="Náhled vizuálu" className="w-full rounded-lg object-contain" />
                {loadingRender && (
                  <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <span className="ml-2 text-white text-sm">Aktualizuji layout…</span>
                  </div>
                )}
                {outputMode === "marketing" && imageOutput.logoUrl && (
                  <div className="absolute top-3 right-3 w-14 h-14 rounded-lg bg-background/90 shadow-md flex items-center justify-center overflow-hidden">
                    <img src={imageOutput.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            ) : isGenerating || loadingCompose ? (
              <div className="w-full aspect-square max-w-md mx-auto rounded-lg bg-muted/50 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">Generuji obrázek…</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square max-w-md mx-auto rounded-lg bg-muted/50 flex items-center justify-center">
                <Button onClick={() => handleGenerate()} variant="outline">
                  <Image className="w-4 h-4 mr-2" />Vygenerovat obrázek
                </Button>
              </div>
            )}
          </div>

          {/* Content Sections */}
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
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Texty grafiky</h4>
                {composeState && (
                  <Button variant="outline" size="sm" onClick={() => handleGenerate()} disabled={loadingCompose}>
                    <Wand2 className={`w-4 h-4 mr-1 ${loadingCompose ? "animate-spin" : ""}`} />
                    Přepsat texty od AI
                  </Button>
                )}
              </div>
              <div className="glass rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Nadpis (headline)</label>
                  <Input value={draftTexts.headline} onChange={e => setDraftTexts(prev => ({ ...prev, headline: e.target.value }))} className="bg-background/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Podnadpis (subheadline)</label>
                  <Input value={draftTexts.subheadline} onChange={e => setDraftTexts(prev => ({ ...prev, subheadline: e.target.value }))} className="bg-background/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Výzva k akci (CTA)</label>
                  <Input value={draftTexts.cta} onChange={e => setDraftTexts(prev => ({ ...prev, cta: e.target.value }))} className="bg-background/50" />
                </div>
                {composeState && (
                  <Button
                    onClick={handleUpdateLayout}
                    disabled={loadingRender || !composeState}
                    className="w-full sm:w-auto"
                  >
                    {loadingRender ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aktualizuji…</> : "Aktualizovat layout"}
                  </Button>
                )}
              </div>
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
