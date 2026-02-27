import { useState } from "react";
import { Megaphone, Loader2, Copy, ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { neobotFetch, NEOBOT_API_BASE, NEOBOT_API_KEY } from "@/lib/neobot";

interface AdsDraftBrand {
  name: string;
  description: string;
  services: string[];
  usp: string[];
  tone: string;
  target_audience: string;
}

interface AdsDraftAds {
  meta_primary_texts: string[];
  meta_headlines: string[];
  google_headlines: string[];
  google_descriptions: string[];
}

interface AdsDraftResult {
  brand: AdsDraftBrand;
  ads: AdsDraftAds;
}

interface AdsImageItem {
  url: string;
  format: string;
  prompt: string;
  caption: string;
  width?: number;
  height?: number;
  resolution?: "preview" | "standard" | "high";
}

interface AdsHistoryItem {
  url: string;
  type: "image" | "product";
  resolution?: "preview" | "standard" | "high";
  width?: number;
  height?: number;
  createdAt: string;
}

interface AdsVideo {
  url: string;
  width: number;
  height: number;
  duration: number;
  format?: "story" | "square" | "landscape";
}

type Status = "idle" | "loading" | "error" | "success";
type ImageStatus = "idle" | "loading" | "error" | "success";
type Resolution = "preview" | "standard" | "high";

export default function AdsStudioPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdsDraftResult | null>(null);

  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageRetryAfterSeconds, setImageRetryAfterSeconds] = useState<number | null>(null);
  const [imageResult, setImageResult] = useState<AdsImageItem[]>([]);
  const [imageCount, setImageCount] = useState(4);
  const [imageFormat, setImageFormat] = useState<"square" | "story" | "both">("square");
  const [resolution, setResolution] = useState<Resolution>("standard");

  const [productFile, setProductFile] = useState<File | null>(null);
  const [productVariants, setProductVariants] = useState(4);
  const [productFormat, setProductFormat] = useState<"square" | "story" | "both">("square");
  const [productStyle, setProductStyle] = useState<"modern" | "luxury" | "minimal" | "industrial">("modern");
  const [productName, setProductName] = useState("");
  const [productStatus, setProductStatus] = useState<ImageStatus>("idle");
  const [productError, setProductError] = useState<string | null>(null);
  const [productRetryAfterSeconds, setProductRetryAfterSeconds] = useState<number | null>(null);
  const [productResult, setProductResult] = useState<AdsImageItem[]>([]);

  const [historyStatus, setHistoryStatus] = useState<ImageStatus>("idle");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<AdsHistoryItem[]>([]);

  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [videoFormat, setVideoFormat] = useState<"story" | "square" | "landscape">("story");
  const [videoDuration, setVideoDuration] = useState(8);
  const [videoStatus, setVideoStatus] = useState<ImageStatus>("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<AdsVideo | null>(null);

  const handleGenerate = async () => {
    const u = url.trim();
    if (!u) {
      toast.error("Zadej URL webu");
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      toast.error("URL musí začínat na http:// nebo https://");
      return;
    }

    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const data = await neobotFetch("/api/ads/draft", {
        method: "POST",
        body: JSON.stringify({ url: u }),
      });
      if (!data?.ok && data?.brand === undefined) {
        throw new Error(data?.message || data?.error || "Nepodařilo se vygenerovat");
      }
      setResult({
        brand: data.brand || {},
        ads: data.ads || {},
      });
      setStatus("success");
      toast.success("Reklamní texty vygenerovány");
    } catch (err: any) {
      const msg = err?.message || "Chyba při generování";
      setError(msg);
      setStatus("error");
      toast.error(msg);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} zkopírováno`);
  };

  const handleGenerateProductVariants = async () => {
    if (!productFile) {
      toast.error("Vyberte produktovou fotku");
      return;
    }
    setProductStatus("loading");
    setProductError(null);
    setProductRetryAfterSeconds(null);
    setProductResult([]);
    const form = new FormData();
    form.append("productImage", productFile);
    form.append("variants", String(productVariants));
    form.append("format", productFormat);
    form.append("style", productStyle);
    form.append("resolution", resolution);
    if (productName.trim()) form.append("productName", productName.trim());
    try {
      const res = await fetch(`${NEOBOT_API_BASE}/api/ads/product-variants`, {
        method: "POST",
        headers: { "x-api-key": NEOBOT_API_KEY },
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = new Error(data?.message || data?.error || `HTTP ${res.status}`) as Error & { status?: number; responseData?: Record<string, unknown> };
        err.status = res.status;
        err.responseData = data && typeof data === "object" ? data : undefined;
        throw err;
      }
      if (!data?.ok || !Array.isArray(data?.images)) {
        throw new Error(data?.message || data?.error || "Nepodařilo se vygenerovat scény");
      }
      setProductResult(data.images);
      setProductStatus("success");
      toast.success(`Vygenerováno ${data.images.length} scén`);
    } catch (err: any) {
      const status = err?.status;
      const responseData = err?.responseData;
      const isRateLimited = status === 429 || responseData?.error === "RATE_LIMITED";
      const retryAfter = typeof responseData?.retryAfterSeconds === "number" ? responseData.retryAfterSeconds : null;
      if (isRateLimited) {
        setProductError("Replicate rate limit. Zkuste později.");
        setProductRetryAfterSeconds(retryAfter ?? 30);
        toast.error("Překročen limit požadavků. Zkuste to za chvíli.");
      } else {
        setProductError(err?.message || "Chyba při generování scén");
        setProductRetryAfterSeconds(null);
        toast.error(err?.message || "Chyba při generování scén");
      }
      setProductStatus("error");
    }
  };

  const handleGenerateImages = async () => {
    const u = url.trim();
    if (!u) {
      toast.error("Zadej URL webu (nahoře)");
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      toast.error("URL musí začínat na http:// nebo https://");
      return;
    }
    setImageStatus("loading");
    setImageError(null);
    setImageRetryAfterSeconds(null);
    setImageResult([]);
    try {
      const data = await neobotFetch("/api/ads/images", {
        method: "POST",
        body: JSON.stringify({ url: u, count: imageCount, format: imageFormat, resolution }),
      });
      if (!data?.ok || !Array.isArray(data?.images)) {
        throw new Error(data?.message || data?.error || "Nepodařilo se vygenerovat obrázky");
      }
      setImageResult(data.images);
      setImageStatus("success");
      toast.success(`Vygenerováno ${data.images.length} obrázků`);
    } catch (err: any) {
      const status = err?.status;
      const responseData = err?.responseData;
      const isRateLimited = status === 429 || responseData?.error === "RATE_LIMITED";
      const retryAfter = typeof responseData?.retryAfterSeconds === "number" ? responseData.retryAfterSeconds : null;

      if (isRateLimited) {
        setImageError("Replicate rate limit. Zkuste později.");
        setImageRetryAfterSeconds(retryAfter ?? 30);
        toast.error("Překročen limit požadavků. Zkuste to za chvíli.");
      } else {
        const msg = err?.message || "Chyba při generování obrázků";
        setImageError(msg);
        setImageRetryAfterSeconds(null);
        toast.error(msg);
      }
      setImageStatus("error");
    }
  };

  const handleLoadHistory = async () => {
    setHistoryStatus("loading");
    setHistoryError(null);
    try {
      const data = await neobotFetch("/api/ads/history", {
        method: "GET",
      });
      if (!data?.ok || !Array.isArray(data?.items)) {
        throw new Error(data?.message || data?.error || "Nepodařilo se načíst historii");
      }
      setHistoryItems(data.items);
      setHistoryStatus("success");
    } catch (err: any) {
      const msg = err?.message || "Chyba při načítání historie";
      setHistoryError(msg);
      setHistoryStatus("error");
      toast.error(msg);
    }
  };

  const handleGenerateVideo = async () => {
    const img = videoImageUrl.trim();
    if (!img) {
      toast.error("Zadej URL obrázku (např. z Historie reklam nebo /outputs/backgrounds/...)");
      return;
    }
    const dur = Number(videoDuration);
    if (!Number.isFinite(dur) || dur < 5 || dur > 10) {
      toast.error("Délka videa musí být mezi 5 a 10 sekundami.");
      return;
    }

    setVideoStatus("loading");
    setVideoError(null);
    setVideoResult(null);

    try {
      const data = await neobotFetch("/api/ads/video", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: img,
          format: videoFormat,
          duration: dur,
        }),
      });
      if (!data?.ok || !data?.video) {
        throw new Error(data?.message || data?.error || "Nepodařilo se vygenerovat video");
      }
      setVideoResult(data.video);
      setVideoStatus("success");
      toast.success("Video reklama vygenerována");
    } catch (err: any) {
      const msg = err?.message || "Chyba při generování videa";
      setVideoError(msg);
      setVideoStatus("error");
      toast.error(msg);
    }
  };

  const renderList = (items: string[], title: string, maxChars?: number) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground"
          >
            <span className="flex-1 break-words">
              {maxChars && item.length > maxChars ? item.slice(0, maxChars) + "…" : item}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => copyText(item, title)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Megaphone className="w-8 h-8" />
          AI Ads Studio
        </h1>
        <p className="text-muted-foreground">
          Zadej URL webu a vygeneruj brand summary a reklamní texty pro Meta a Google.
        </p>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <Label htmlFor="ads-url">URL webu</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="ads-url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1"
            disabled={status === "loading"}
          />
          <Button onClick={handleGenerate} disabled={status === "loading"} className="gap-2">
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generuji…
              </>
            ) : (
              "Generovat reklamu"
            )}
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Historie reklam
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Přehled všech dříve vygenerovaných reklamních obrázků (URL → obrázky i produktové scény).
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleLoadHistory}
            disabled={historyStatus === "loading"}
            className="gap-2"
            type="button"
          >
            {historyStatus === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Načítám historii…
              </>
            ) : (
              "Načíst historii"
            )}
          </Button>
          {historyStatus === "success" && (
            <span className="text-xs text-muted-foreground">
              {historyItems.length === 0
                ? "Zatím žádné vygenerované reklamy."
                : `Nalezeno ${historyItems.length} položek`}
            </span>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Video reklama (F4.1 MVP)
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Vytvoř krátké reklamní video (MP4) z existujícího obrázku. Vlož URL obrázku z Reklamního
          studia (např. z Historie reklam nebo přímo cestu typu /outputs/backgrounds/…).
        </p>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">URL obrázku</Label>
            <Input
              placeholder="/outputs/backgrounds/ads-123.png nebo https://api.neobot.cz/outputs/..."
              value={videoImageUrl}
              onChange={(e) => setVideoImageUrl(e.target.value)}
              disabled={videoStatus === "loading"}
              className="min-w-[260px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Formát videa</Label>
            <select
              value={videoFormat}
              onChange={(e) =>
                setVideoFormat(e.target.value as "story" | "square" | "landscape")
              }
              disabled={videoStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="story">Story (1080×1920)</option>
              <option value="square">Square (1080×1080)</option>
              <option value="landscape">Landscape (1920×1080)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Délka videa (5–10 s)</Label>
            <select
              value={videoDuration}
              onChange={(e) => setVideoDuration(Number(e.target.value))}
              disabled={videoStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {[5, 6, 7, 8, 9, 10].map((d) => (
                <option key={d} value={d}>
                  {d} s
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleGenerateVideo}
            disabled={videoStatus === "loading"}
            className="gap-2"
          >
            {videoStatus === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generuji video…
              </>
            ) : (
              "Vygenerovat video"
            )}
          </Button>
        </div>
        {videoStatus === "error" && videoError && (
          <div className="mt-3 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            {videoError}
          </div>
        )}
        {videoStatus === "success" && videoResult && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Video vygenerováno ({videoResult.width}×{videoResult.height},{" "}
              {videoResult.duration} s).
            </p>
            <div className="w-full max-w-xl">
              <video
                src={`${NEOBOT_API_BASE}${videoResult.url}`}
                controls
                className="w-full rounded-lg border border-border bg-black"
              />
            </div>
            <div>
              <a
                href={`${NEOBOT_API_BASE}${videoResult.url}`}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <Download className="w-3 h-3" />
                  Stáhnout video
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Obrázkové reklamy (3–6)
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Vygeneruj reklamní obrázky podle URL webu. Použij stejnou URL jako výše.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Počet</Label>
            <select
              value={imageCount}
              onChange={(e) => setImageCount(Number(e.target.value))}
              disabled={imageStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Formát</Label>
            <select
              value={imageFormat}
              onChange={(e) => setImageFormat(e.target.value as "square" | "story" | "both")}
              disabled={imageStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="square">Čtverec</option>
              <option value="story">Story</option>
              <option value="both">Obojí</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Rozlišení</Label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              disabled={imageStatus === "loading" || productStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="preview">Náhled – 720p (nejrychlejší)</option>
              <option value="standard">Standard – 1080p (doporučeno)</option>
              <option value="high">Vysoké – 2048p (nejvyšší kvalita)</option>
            </select>
          </div>
          <Button
            onClick={handleGenerateImages}
            disabled={imageStatus === "loading" || !url.trim()}
            className="gap-2"
          >
            {imageStatus === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generuji obrázky…
              </>
            ) : (
              "Vygenerovat obrázky"
            )}
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Produktová fotka → Reklamní scény (4–8)
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Nahrajte produktovou fotku a vygenerujte 4–8 marketingových scén s produktem.
        </p>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Produktová fotka (jpg, png, webp, max 8 MB)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
              disabled={productStatus === "loading"}
              className="text-sm file:mr-2 file:py-2 file:px-3 file:rounded-md file:border file:bg-muted"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Počet scén</Label>
            <select
              value={productVariants}
              onChange={(e) => setProductVariants(Number(e.target.value))}
              disabled={productStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {[4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Formát</Label>
            <select
              value={productFormat}
              onChange={(e) => setProductFormat(e.target.value as "square" | "story" | "both")}
              disabled={productStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="square">Čtverec</option>
              <option value="story">Story</option>
              <option value="both">Obojí</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Styl</Label>
            <select
              value={productStyle}
              onChange={(e) => setProductStyle(e.target.value as "modern" | "luxury" | "minimal" | "industrial")}
              disabled={productStatus === "loading"}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="modern">Moderní</option>
              <option value="luxury">Luxusní</option>
              <option value="minimal">Minimalistický</option>
              <option value="industrial">Industriální</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Název produktu (volitelné)</Label>
            <Input
              placeholder="např. Boty X"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={productStatus === "loading"}
              className="w-40"
            />
          </div>
          <Button
            onClick={handleGenerateProductVariants}
            disabled={productStatus === "loading" || !productFile}
            className="gap-2"
          >
            {productStatus === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generuji scény…
              </>
            ) : (
              "Vygenerovat scény"
            )}
          </Button>
        </div>
      </div>

      {status === "error" && error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
          {error}
        </div>
      )}

      {imageStatus === "error" && imageError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6 space-y-2">
          <p>{imageError}</p>
          {imageRetryAfterSeconds != null && (
            <p className="text-sm opacity-90">
              Doporučený čas před opakováním: <strong>{imageRetryAfterSeconds} s</strong>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGenerateImages()}
            className="mt-2"
          >
            Zkusit znovu
          </Button>
        </div>
      )}

      {productStatus === "error" && productError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6 space-y-2">
          <p>{productError}</p>
          {productRetryAfterSeconds != null && (
            <p className="text-sm opacity-90">
              Doporučený čas před opakováním: <strong>{productRetryAfterSeconds} s</strong>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGenerateProductVariants()}
            className="mt-2"
          >
            Zkusit znovu
          </Button>
        </div>
      )}

      {historyStatus === "error" && historyError && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
          {historyError}
        </div>
      )}

      {historyStatus === "success" && historyItems.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-foreground mb-4">Historie reklamních obrázků</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyItems.map((item, i) => {
              const created = new Date(item.createdAt);
              const resolutionLabel = item.resolution ?? "standard";
              const sizeLabel =
                item.width && item.height ? `${item.width}×${item.height}` : "neznámé rozměry";
              const typeLabel = item.type === "product" ? "Produktová scéna" : "URL → obrázek";
              return (
                <div key={`${item.url}-${i}`} className="glass rounded-xl overflow-hidden">
                  <a
                    href={`${NEOBOT_API_BASE}${item.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square bg-muted"
                  >
                    <img
                      src={`${NEOBOT_API_BASE}${item.url}`}
                      alt={typeLabel}
                      className="w-full h-full object-cover"
                    />
                  </a>
                  <div className="p-3 space-y-1 text-sm">
                    <p className="text-xs text-muted-foreground">{typeLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Rozlišení: <span className="font-medium">{resolutionLabel}</span>{" "}
                      {sizeLabel !== "neznámé rozměry" && `(${sizeLabel})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vygenerováno:{" "}
                      <span className="font-medium">
                        {Number.isNaN(created.getTime())
                          ? "neznámé datum"
                          : created.toLocaleString("cs-CZ")}
                      </span>
                    </p>
                    <div className="pt-2">
                      <a
                        href={`${NEOBOT_API_BASE}${item.url}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 w-full justify-center"
                        >
                          <Download className="w-3 h-3" />
                          Stáhnout
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {imageStatus === "success" && imageResult.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-foreground mb-4">Vygenerované obrázky</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageResult.map((img, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden">
                <a
                  href={`${NEOBOT_API_BASE}${img.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square bg-muted"
                >
                  <img
                    src={`${NEOBOT_API_BASE}${img.url}`}
                    alt={img.caption || `Reklama ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="p-3 space-y-2">
                  <p className="text-sm text-foreground line-clamp-2">{img.caption}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => copyText(img.caption, "Caption")}
                    >
                      <Copy className="w-3 h-3" />
                      Kopírovat caption
                    </Button>
                    <a
                      href={`${NEOBOT_API_BASE}${img.url}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button type="button" variant="outline" size="sm" className="gap-1">
                        <Download className="w-3 h-3" />
                        Stáhnout
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {productStatus === "success" && productResult.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-foreground mb-4">Vygenerované reklamní scény</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productResult.map((img, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden">
                <a
                  href={`${NEOBOT_API_BASE}${img.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square bg-muted"
                >
                  <img
                    src={`${NEOBOT_API_BASE}${img.url}`}
                    alt={img.caption || `Scéna ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="p-3 space-y-2">
                  <p className="text-sm text-foreground line-clamp-2">{img.caption}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => copyText(img.caption, "Caption")}
                    >
                      <Copy className="w-3 h-3" />
                      Kopírovat caption
                    </Button>
                    <a
                      href={`${NEOBOT_API_BASE}${img.url}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button type="button" variant="outline" size="sm" className="gap-1">
                        <Download className="w-3 h-3" />
                        Stáhnout
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "success" && result && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Brand */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg text-foreground border-b pb-2">Brand</h2>
            {result.brand.name && (
              <p><span className="text-muted-foreground">Název:</span> {result.brand.name}</p>
            )}
            {result.brand.description && (
              <p><span className="text-muted-foreground">Popis:</span> {result.brand.description}</p>
            )}
            {result.brand.tone && (
              <p><span className="text-muted-foreground">Tón:</span> {result.brand.tone}</p>
            )}
            {result.brand.target_audience && (
              <p><span className="text-muted-foreground">Cílová skupina:</span> {result.brand.target_audience}</p>
            )}
            {result.brand.services?.length > 0 && renderList(result.brand.services, "Služby")}
            {result.brand.usp?.length > 0 && renderList(result.brand.usp, "USP")}
          </div>

          {/* Meta primary texts */}
          <div className="glass rounded-xl p-6">
            {renderList(
              result.ads.meta_primary_texts || [],
              "Meta – hlavní texty (5)"
            )}
          </div>

          {/* Meta headlines */}
          <div className="glass rounded-xl p-6">
            {renderList(
              result.ads.meta_headlines || [],
              "Meta – headlines (5)"
            )}
          </div>

          {/* Google headlines */}
          <div className="glass rounded-xl p-6">
            {renderList(
              result.ads.google_headlines || [],
              "Google Ads – headlines (max 30 znaků)",
              35
            )}
          </div>

          {/* Google descriptions */}
          <div className="glass rounded-xl p-6 md:col-span-2">
            {renderList(
              result.ads.google_descriptions || [],
              "Google Ads – popisy (max 90 znaků)",
              95
            )}
          </div>
        </div>
      )}

      {status === "idle" && !result && (
        <p className="text-muted-foreground text-sm">Zadej URL a klikni na „Generovat reklamu“.</p>
      )}
    </div>
  );
}
