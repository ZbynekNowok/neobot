import { useState, useEffect } from "react";
import { FileSearch, Loader2, Copy, Download, AlertTriangle, XCircle, Lightbulb, ListChecks, Clock, RotateCcw, ChevronDown, ChevronUp, ExternalLink, History, Target, Tag, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { NEOBOT_API_BASE, NEOBOT_API_KEY, saveOutputToHistory } from "@/lib/neobot";

/* ── Types ── */

interface AuditIssue {
  severity: "high" | "medium" | "low";
  message: string;
  urls?: string[];
  suggestion?: string;
  suggested_text?: string;
  current_state?: string;
}

interface ContentPlanItem {
  title: string;
  intent: string;
  outline_h2: string[];
  cta: string;
}

interface SuggestedFix {
  url: string;
  current_title?: string;
  current_meta_description?: string;
  suggested_title?: string;
  suggested_meta_description?: string;
}

interface AuditReport {
  page_summaries?: any[];
  issues?: AuditIssue[];
  quick_wins?: string[];
  recommendations?: string[];
  content_plan?: ContentPlanItem[];
  suggested_fixes?: SuggestedFix[];
  message?: string;
}

interface AuditResult {
  job_id: string;
  base_url: string;
  status: string;
  report?: AuditReport;
  goals?: string;
  theme?: string;
  keywords?: string | string[];
}

interface AuditListItem {
  job_id: string;
  base_url: string;
  status: string;
  pages_crawled?: number;
  created_at: string;
  completed_at?: string;
  audit_type?: string;
  goals_text?: string;
  theme_text?: string;
}

/* ── API helper ── */

const apiHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  "x-api-key": NEOBOT_API_KEY,
});

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${NEOBOT_API_BASE}${path}`, {
    ...opts,
    headers: { ...apiHeaders(), ...(opts?.headers || {}) },
    credentials: "omit",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Chybí nebo je neplatný API klíč.");
    if (res.status === 402) throw new Error("Došel kredit / units.");
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data;
}

/* ── Severity helpers ── */

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "high") return <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />;
  if (severity === "medium") return <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />;
  return <Lightbulb className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />;
}

const severityLabel: Record<string, string> = { high: "Vysoká", medium: "Střední", low: "Nízká" };
const severityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-orange-500 text-white",
  low: "bg-muted text-muted-foreground",
};

/* ── Component ── */

export default function SeoAuditPage() {
  const { toast } = useToast();

  // Form
  const [url, setUrl] = useState("");
  const [goals, setGoals] = useState("");
  const [theme, setTheme] = useState("");
  const [keywords, setKeywords] = useState("");
  const [auditType, setAuditType] = useState("standard");

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Result
  const [result, setResult] = useState<AuditResult | null>(null);

  // Past audits
  const [pastAudits, setPastAudits] = useState<AuditListItem[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  // Load past audits on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/api/seo/audit/list?limit=20");
        const list = Array.isArray(data) ? data : data?.items || data?.jobs || [];
        setPastAudits(list);
      } catch {
        // non-critical
      } finally {
        setPastLoading(false);
      }
    })();
  }, []);

  const handleAudit = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(10);
    setStatusMsg("Odesílám požadavek…");

    try {
      const body: Record<string, any> = { url: url.trim() };
      if (goals.trim()) body.goals = goals.trim();
      if (theme.trim()) body.theme = theme.trim();
      if (keywords.trim()) body.keywords = keywords.split(",").map(k => k.trim()).filter(Boolean);
      if (auditType) body.auditType = auditType;

      const startData = await apiFetch("/api/seo/audit", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const jobId = startData.jobId || startData.job_id;
      if (!jobId) throw new Error("Server nevrátil jobId");

      setProgress(20);
      setStatusMsg("Audit běží…");

      // Poll
      let attempts = 0;
      const maxAttempts = 180;
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000));
        attempts++;

        const status = await apiFetch(`/api/seo/audit/status/${jobId}`);
        const s = status.status || status.state;

        if (s === "completed" || s === "done") {
          setProgress(90);
          setStatusMsg("Stahuji výsledky…");
          break;
        }
        if (s === "failed" || s === "error") {
          throw new Error(status.error || status.message || "Audit selhal na serveru");
        }
        if (s === "blocked_by_robots") {
          throw new Error("Web blokuje přístup (robots.txt). Zkontrolujte nastavení webu.");
        }

        const crawled = status.pages_crawled || 0;
        setProgress(Math.min(20 + Math.floor((attempts / 60) * 65), 85));
        setStatusMsg(`Audit běží… (${crawled} stránek proskenováno)`);
      }

      if (attempts >= maxAttempts) throw new Error("Timeout – audit trval příliš dlouho");

      // Get result
      const resultData = await apiFetch(`/api/seo/audit/result/${jobId}`);
      setResult(resultData);
      setProgress(100);
      setStatusMsg("");

      // Save to history
      saveOutputToHistory("seo_audit", {
        url: url.trim(),
        goals: goals.trim(),
        theme: theme.trim(),
        keywords: keywords.trim(),
        auditType,
      }, resultData.report || resultData);

      toast({ title: "Audit dokončen" });
    } catch (err: any) {
      const msg = err?.message || "Audit selhal";
      setError(msg.includes("Failed to fetch") ? "Server nepovoluje požadavky z této domény." : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPastAudit = async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMsg("Načítám výsledek…");
    try {
      const data = await apiFetch(`/api/seo/audit/result/${jobId}`);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Nepodařilo se načíst audit.");
    } finally {
      setIsLoading(false);
      setStatusMsg("");
    }
  };

  const exportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = "seo-audit.json";
    a.click();
    URL.revokeObjectURL(u);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} zkopírováno` });
  };

  const report = result?.report;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">SEO Audit</h1>
          <p className="text-muted-foreground">Komplexní analýza webu s konkrétními doporučeními.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPast(!showPast)} className="gap-2">
          <History className="w-4 h-4" /> Předchozí audity
          {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Past audits */}
      {showPast && (
        <div className="glass rounded-xl p-4 mb-6 space-y-2">
          <h3 className="text-sm font-medium text-foreground mb-2">Předchozí audity</h3>
          {pastLoading ? (
            <p className="text-sm text-muted-foreground">Načítám…</p>
          ) : pastAudits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné audity.</p>
          ) : (
            pastAudits.map((a) => (
              <div key={a.job_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{a.base_url}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("cs")}</span>
                    <Badge variant={a.status === "completed" ? "secondary" : "outline"} className="text-xs">{a.status}</Badge>
                    {a.audit_type && <Badge variant="outline" className="text-xs">{a.audit_type}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => loadPastAudit(a.job_id)} disabled={a.status !== "completed"}>
                  Zobrazit
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Consultation form */}
      <div className="glass rounded-xl p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-foreground">Zadání auditu</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>URL webu *</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <Label>Typ auditu</Label>
            <Select value={auditType} onValueChange={setAuditType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Rychlý</SelectItem>
                <SelectItem value="standard">Standardní</SelectItem>
                <SelectItem value="full">Kompletní</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Co chcete řešit? Na co se má audit zaměřit?</Label>
          <Textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="např. zvýšit počet poptávek z vyhledávání" rows={2} />
        </div>
        <div>
          <Label>Jaké téma má web obsahovat?</Label>
          <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="např. pronájem stavebních strojů" />
        </div>
        <div>
          <Label>Podle jakých výrazů chcete být vyhledáváni?</Label>
          <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="klíčová slova oddělená čárkou" />
        </div>

        <Button onClick={handleAudit} disabled={isLoading || !url.trim()} className="w-full">
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzuji…</> : <><FileSearch className="w-4 h-4 mr-2" /> Spustit audit</>}
        </Button>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            {statusMsg && <p className="text-xs text-muted-foreground">{statusMsg}</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="glass rounded-xl p-4 mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {!result && !isLoading && !error && (
        <div className="glass rounded-xl p-8 text-center">
          <FileSearch className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Zadej URL a vyplň konzultační formulář pro přesnější doporučení.</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && report && (
        <>
          {/* Header with context */}
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Výsledek auditu</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyText(JSON.stringify(result, null, 2), "Report")}>
                  <Copy className="w-4 h-4 mr-1" /> Kopírovat
                </Button>
                <Button size="sm" variant="outline" onClick={exportJson}>
                  <Download className="w-4 h-4 mr-1" /> Export JSON
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{result.base_url}</p>

            {/* Context: goals, theme, keywords */}
            {(result.goals || result.theme || result.keywords) && (
              <div className="grid sm:grid-cols-3 gap-3">
                {result.goals && (
                  <div className="p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Cíl</span>
                    </div>
                    <p className="text-sm text-foreground">{result.goals}</p>
                  </div>
                )}
                {result.theme && (
                  <div className="p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Téma webu</span>
                    </div>
                    <p className="text-sm text-foreground">{result.theme}</p>
                  </div>
                )}
                {result.keywords && (
                  <div className="p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Klíčová slova</span>
                    </div>
                    <p className="text-sm text-foreground">
                      {Array.isArray(result.keywords) ? result.keywords.join(", ") : result.keywords}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="issues" className="glass rounded-xl p-6">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="issues">Problémy ({report.issues?.length || 0})</TabsTrigger>
              <TabsTrigger value="quickwins">Quick Wins</TabsTrigger>
              <TabsTrigger value="recommendations">Doporučení</TabsTrigger>
              <TabsTrigger value="contentplan">Obsahový plán</TabsTrigger>
              <TabsTrigger value="fixes">Navržené úpravy</TabsTrigger>
            </TabsList>

            {/* Issues */}
            <TabsContent value="issues" className="space-y-3">
              {report.issues?.length ? report.issues.map((issue, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/50">
                  <div className="flex items-start gap-3">
                    <SeverityIcon severity={issue.severity} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColors[issue.severity]} variant="secondary">{severityLabel[issue.severity] || issue.severity}</Badge>
                      </div>
                      {issue.current_state && (
                        <p className="text-xs text-muted-foreground mb-1">Aktuální stav: {issue.current_state}</p>
                      )}
                      <p className="text-foreground text-sm">{issue.message}</p>
                      {issue.urls && issue.urls.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {issue.urls.map((u, j) => (
                            <a key={j} href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                              {new URL(u).pathname || "/"} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                      {issue.suggestion && (
                        <p className="text-sm text-primary mt-2">💡 {issue.suggestion}</p>
                      )}
                      {issue.suggested_text && (
                        <div className="mt-2 p-2 rounded bg-muted/30 flex items-center justify-between gap-2">
                          <p className="text-sm text-foreground font-mono">{issue.suggested_text}</p>
                          <Button size="sm" variant="ghost" onClick={() => copyText(issue.suggested_text!, "Text")}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm">Žádné problémy nenalezeny.</p>}
            </TabsContent>

            {/* Quick Wins */}
            <TabsContent value="quickwins" className="space-y-2">
              {report.quick_wins?.length ? report.quick_wins.map((win, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/20">
                  <ListChecks className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-foreground text-sm">{win}</p>
                </div>
              )) : <p className="text-muted-foreground text-sm">Žádné quick wins.</p>}
            </TabsContent>

            {/* Recommendations */}
            <TabsContent value="recommendations" className="space-y-2">
              {report.recommendations?.length ? report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/20">
                  <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-foreground text-sm">{rec}</p>
                </div>
              )) : <p className="text-muted-foreground text-sm">Žádná doporučení.</p>}
            </TabsContent>

            {/* Content Plan */}
            <TabsContent value="contentplan" className="space-y-3">
              {report.content_plan?.length ? report.content_plan.map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/50">
                  <h4 className="text-foreground font-medium mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{item.intent}</p>
                  {item.outline_h2?.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-foreground space-y-0.5 mb-2">
                      {item.outline_h2.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                  )}
                  {item.cta && (
                    <p className="text-sm text-primary">CTA: {item.cta}</p>
                  )}
                </div>
              )) : <p className="text-muted-foreground text-sm">Žádný obsahový plán.</p>}
            </TabsContent>

            {/* Suggested Fixes */}
            <TabsContent value="fixes" className="space-y-3">
              {report.suggested_fixes?.length ? report.suggested_fixes.map((fix, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-2">
                  <a href={fix.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    {fix.url} <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-destructive/5 border border-destructive/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Před – Title</p>
                      <p className="text-sm text-foreground">{fix.current_title || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-2 mb-1 font-medium">Před – Meta Description</p>
                      <p className="text-sm text-foreground">{fix.current_meta_description || "—"}</p>
                    </div>
                    <div className="p-3 rounded bg-primary/5 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Po – Title</p>
                      <p className="text-sm text-foreground font-medium">{fix.suggested_title || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-2 mb-1 font-medium">Po – Meta Description</p>
                      <p className="text-sm text-foreground">{fix.suggested_meta_description || "—"}</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => copyText(`${fix.suggested_title}\n${fix.suggested_meta_description}`, "Návrh")}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Zkopírovat
                      </Button>
                    </div>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm">Žádné navržené úpravy.</p>}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
