import { useState, useRef } from "react";
import { Search, Copy, Download, Save, Loader2, History } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { NEOBOT_API_BASE, NEOBOT_API_KEY, fetchWorkspaceProfile } from "@/lib/neobot";

interface GeneratorResult {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  outline?: string[];
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(words: number) {
  return Math.max(1, Math.ceil(words / 200));
}

const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "x-api-key": NEOBOT_API_KEY,
};

function handleApiError(status: number, body: any): string {
  if (status === 401 || status === 403) return "Chybí nebo je neplatný API klíč.";
  if (status === 402) return "Došel kredit / units.";
  return (body?.message || body?.error) || "Požadavek selhal";
}

export default function SeoGeneratorPage() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("cs");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("medium");
  const [tone, setTone] = useState("professional");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMsg("Načítám profil a odesílám…");
    abortRef.current = false;

    try {
      // Fetch fresh profile
      const profile = await fetchWorkspaceProfile();

      const requestBody: any = { topic: keyword.trim() };
      if (profile) {
        requestBody.profile = {
          business_name: profile.business_name,
          industry: profile.industry,
          usp: profile.usp,
        };
        requestBody.target_audience = profile.target_audience;
      }
      requestBody.tone = tone;

      // 1) POST generate → get jobId
      const genRes = await fetch(`${NEOBOT_API_BASE}/api/seo/generate`, {
        method: "POST",
        credentials: "omit",
        headers: API_HEADERS,
        body: JSON.stringify(requestBody),
      });
      const genBody = await genRes.json().catch(() => null);
      if (!genRes.ok || !genBody?.jobId) {
        throw new Error(handleApiError(genRes.status, genBody));
      }

      const jobId = genBody.jobId;
      setStatusMsg("Generuji článek…");

      // 2) Poll status every 2.5s
      let status = "";
      while (!abortRef.current) {
        await new Promise(r => setTimeout(r, 2500));
        const statusRes = await fetch(`${NEOBOT_API_BASE}/api/seo/status/${jobId}`, {
          credentials: "omit",
          headers: { "Accept": "application/json", "x-api-key": NEOBOT_API_KEY },
        });
        const statusBody = await statusRes.json().catch(() => null);
        status = statusBody?.status || "";

        if (status === "completed") break;
        if (status === "failed" || status === "cancelled") {
          throw new Error(statusBody?.message || `Generování ${status === "failed" ? "selhalo" : "bylo zrušeno"}.`);
        }
        setStatusMsg(`Stav: ${status || "zpracovávám"}…`);
      }

      if (abortRef.current) return;

      // 3) Fetch result
      setStatusMsg("Načítám výsledek…");
      const resultRes = await fetch(`${NEOBOT_API_BASE}/api/seo/result/${jobId}`, {
        credentials: "omit",
        headers: { "Accept": "application/json", "x-api-key": NEOBOT_API_KEY },
      });
      const resultBody = await resultRes.json().catch(() => null);
      if (!resultRes.ok || !resultBody) {
        throw new Error(handleApiError(resultRes.status, resultBody));
      }

      const content = resultBody.content || resultBody.text || "";

      const generated: GeneratorResult = {
        title: resultBody.title || keyword,
        content,
        metaTitle: resultBody.metaTitle || resultBody.title || keyword,
        metaDescription: resultBody.metaDescription || "",
        slug: resultBody.slug || keyword.trim(),
        outline: resultBody.outline,
      };

      setResult(generated);

      // Save to backend history
      try {
        await fetch(`${NEOBOT_API_BASE}/api/outputs`, {
          method: "POST",
          credentials: "omit",
          headers: API_HEADERS,
          body: JSON.stringify({
            type: "seo_generate",
            input: { topic: keyword.trim(), tone, language, length, audience },
            output: {
              text: generated.content,
              title: generated.title,
              metaTitle: generated.metaTitle,
              metaDescription: generated.metaDescription,
              slug: generated.slug,
              outline: generated.outline,
            },
          }),
        });
      } catch {
        // History save is non-critical, don't block
      }

      toast({ title: "Článek vygenerován", description: generated.title });
    } catch (err: any) {
      const msg = err?.message || "Nepodařilo se vygenerovat článek";
      setError(msg.includes("Failed to fetch") || msg.includes("NetworkError")
        ? `Nepodařilo se spojit se serverem (${NEOBOT_API_BASE}). Zkontroluj síť.`
        : msg);
    } finally {
      setIsLoading(false);
      setStatusMsg(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} zkopírován` });
  };

  const downloadArticle = () => {
    if (!result) return;
    const blob = new Blob([`# ${result.title}\n\n${result.content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.slug || "article"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">SEO Generator</h1>
          <p className="text-muted-foreground">Generuj SEO optimalizované články pomocí AI.</p>
        </div>
        <Link to="/app/historie">
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" /> Historie výstupů
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Zadání</h2>
          <div className="space-y-3">
            <div>
              <Label>Klíčové slovo / téma *</Label>
              <Textarea
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="např. Jak vybrat jarní šaty pro ženy nad 30 – průvodce stylem a trendy 2025"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jazyk</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs">Čeština</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Délka</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Krátký</SelectItem>
                    <SelectItem value="medium">Střední</SelectItem>
                    <SelectItem value="long">Dlouhý</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cílová skupina</Label>
              <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="např. malí podnikatelé" />
            </div>
            <div>
              <Label>Tón</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Profesionální</SelectItem>
                  <SelectItem value="casual">Neformální</SelectItem>
                  <SelectItem value="friendly">Přátelský</SelectItem>
                  <SelectItem value="academic">Akademický</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading || !keyword.trim()} className="w-full">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generuji…</> : <><Search className="w-4 h-4 mr-2" /> Generovat článek</>}
          </Button>
        </div>

        {/* Right: Output */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Výstup</h2>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Search className="w-10 h-10 mb-2" />
              <p className="text-sm">Zadej téma a klikni Generovat</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">{statusMsg || "Generuji článek…"}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Počet slov</span>
                  <p className="text-foreground font-medium">{wordCount(result.content)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Doba čtení</span>
                  <p className="text-foreground font-medium">{readingTime(wordCount(result.content))} min</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-xs text-muted-foreground">Meta Title</span>
                <p className="text-foreground text-sm font-medium">{result.metaTitle}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-xs text-muted-foreground">Meta Description</span>
                <p className="text-foreground text-sm">{result.metaDescription}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-xs text-muted-foreground">Slug</span>
                <p className="text-foreground text-sm font-mono">{result.slug}</p>
              </div>

              {/* Article content */}
              <div className="p-4 rounded-lg bg-muted/20 border border-border/50 max-h-96 overflow-auto">
                <h3 className="text-lg font-semibold text-foreground mb-3">{result.title}</h3>
                <div className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">{result.content}</div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.content, "Článek")}>
                  <Copy className="w-4 h-4 mr-1" /> Kopírovat
                </Button>
                <Button size="sm" variant="outline" onClick={downloadArticle}>
                  <Download className="w-4 h-4 mr-1" /> Stáhnout MD
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast({ title: "Uloženo do historie" })}>
                  <Save className="w-4 h-4 mr-1" /> Uloženo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
