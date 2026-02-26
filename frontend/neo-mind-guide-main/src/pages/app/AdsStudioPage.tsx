import { useState } from "react";
import { Megaphone, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { neobotFetch } from "@/lib/neobot";

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

type Status = "idle" | "loading" | "error" | "success";

export default function AdsStudioPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdsDraftResult | null>(null);

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

      {status === "error" && error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
          {error}
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
