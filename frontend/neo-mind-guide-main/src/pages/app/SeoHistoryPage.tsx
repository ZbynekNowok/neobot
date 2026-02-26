import { useState, useEffect } from "react";
import { History, Eye, Search, FileSearch, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { neobotFetch } from "@/lib/neobot";

/* ── Types ── */
interface SeoArticle {
  job_id: string;
  topic: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface SeoArticleDetail {
  content: string;
  slug: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface AuditItem {
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

interface AuditIssue {
  current_state?: string;
  message?: string;
  urls?: string[];
  suggestion?: string;
  suggested_text?: string;
}

interface SuggestedFix {
  url?: string;
  current_title?: string;
  current_meta_description?: string;
  suggested_title?: string;
  suggested_meta_description?: string;
}

interface ContentPlanItem {
  title?: string;
  intent?: string;
  outline_h2?: string[];
  cta?: string;
}

interface AuditReport {
  goals?: string;
  theme?: string;
  keywords?: string | string[];
  issues?: AuditIssue[];
  quick_wins?: string[];
  recommendations?: string[];
  content_plan?: ContentPlanItem[];
  suggested_fixes?: SuggestedFix[];
  message?: string;
}

interface AuditDetail {
  report: AuditReport;
  status?: string;
}

const AUDIT_TYPE_LABELS: Record<string, string> = {
  quick: "Rychlý",
  standard: "Standardní",
  full: "Kompletní",
};

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "secondary" : status === "failed" ? "destructive" : "outline";
  const label = status === "completed" ? "Dokončeno" : status === "failed" ? "Chyba" : status === "processing" ? "Zpracovává se" : status;
  return <Badge variant={variant as any} className="text-xs">{label}</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Zkopírováno" : "Kopírovat"}
    </Button>
  );
}

/* ── Articles Tab ── */
function ArticlesTab() {
  const [items, setItems] = useState<SeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SeoArticle | null>(null);
  const [detail, setDetail] = useState<SeoArticleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await neobotFetch("/api/seo/history?limit=50");
        const list = (Array.isArray(data) ? data : data?.items || data?.jobs || []) as SeoArticle[];
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItems(list);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (item: SeoArticle) => {
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await neobotFetch(`/api/seo/result/${item.job_id}`);
      setDetail({
        content: data.content || data.text || "",
        slug: data.slug || "",
        title: data.title,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <LoadingState text="Načítám SEO články…" />;
  if (error) return <ErrorState text={error} />;
  if (items.length === 0) return <EmptyState text="Zatím nemáš žádné SEO články." />;

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.job_id} className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => item.status === "completed" && handleSelect(item)}>
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">{item.topic}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={item.status} />
                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("cs")}</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" disabled={item.status !== "completed"}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>SEO článek – {selected?.topic}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <LoadingState text="Načítám článek…" />
          ) : detail ? (
            <div className="space-y-4">
              {detail.title && <h3 className="text-lg font-semibold text-foreground">{detail.title}</h3>}
              {detail.slug && (
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <span className="text-xs text-muted-foreground">Slug</span>
                  <p className="text-foreground text-sm font-mono">{detail.slug}</p>
                </div>
              )}
              {detail.metaTitle && (
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <span className="text-xs text-muted-foreground">Meta Title</span>
                  <p className="text-foreground text-sm">{detail.metaTitle}</p>
                </div>
              )}
              {detail.metaDescription && (
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <span className="text-xs text-muted-foreground">Meta Description</span>
                  <p className="text-foreground text-sm">{detail.metaDescription}</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-muted/20 border border-border/50 max-h-96 overflow-auto">
                <div className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">{detail.content}</div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nepodařilo se načíst detail článku.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Audits Tab ── */
function AuditsTab() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditItem | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await neobotFetch("/api/seo/audit/list?limit=20");
        const list = (Array.isArray(data) ? data : data?.items || data?.jobs || []) as AuditItem[];
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItems(list);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (item: AuditItem) => {
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await neobotFetch(`/api/seo/audit/result/${item.job_id}`);
      setDetail({ report: data.report || data, status: data.status });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <LoadingState text="Načítám SEO audity…" />;
  if (error) return <ErrorState text={error} />;
  if (items.length === 0) return <EmptyState text="Zatím nemáš žádné SEO audity." />;

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.job_id} className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => (item.status === "completed" || item.status === "blocked_by_robots") && handleSelect(item)}>
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <FileSearch className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">{item.base_url}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{AUDIT_TYPE_LABELS[item.audit_type || "standard"] || item.audit_type}</Badge>
                <StatusBadge status={item.status} />
                {item.goals_text && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.goals_text}</span>}
                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("cs")}</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" disabled={item.status !== "completed" && item.status !== "blocked_by_robots"}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setDetail(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Výsledek auditu – {selected?.base_url}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <LoadingState text="Načítám report…" />
          ) : detail ? (
            <AuditReportView report={detail.report} />
          ) : (
            <p className="text-muted-foreground text-sm">Nepodařilo se načíst report.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Audit Report View ── */
function AuditReportView({ report }: { report: AuditReport }) {
  return (
    <div className="space-y-6">
      {/* Context header */}
      {(report.goals || report.theme || report.keywords) && (
        <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-2">
          {report.goals && <p className="text-sm"><span className="font-medium text-foreground">Cíl:</span> <span className="text-muted-foreground">{report.goals}</span></p>}
          {report.theme && <p className="text-sm"><span className="font-medium text-foreground">Téma webu:</span> <span className="text-muted-foreground">{report.theme}</span></p>}
          {report.keywords && (
            <p className="text-sm"><span className="font-medium text-foreground">Klíčová slova:</span> <span className="text-muted-foreground">{Array.isArray(report.keywords) ? report.keywords.join(", ") : report.keywords}</span></p>
          )}
        </div>
      )}

      {report.message && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">{report.message}</p>
        </div>
      )}

      {/* Issues */}
      {report.issues && report.issues.length > 0 && (
        <Section title="Problémy">
          {report.issues.map((issue, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-2">
              {issue.current_state && <p className="text-sm"><span className="font-medium">Aktuální stav:</span> {issue.current_state}</p>}
              {issue.message && <p className="text-sm text-foreground">{issue.message}</p>}
              {issue.urls && issue.urls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {issue.urls.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />{new URL(url).pathname || url}
                    </a>
                  ))}
                </div>
              )}
              {issue.suggestion && <p className="text-sm text-muted-foreground italic">💡 {issue.suggestion}</p>}
              {issue.suggested_text && (
                <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
                  <p className="text-sm flex-1 font-mono">{issue.suggested_text}</p>
                  <CopyButton text={issue.suggested_text} />
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Quick Wins */}
      {report.quick_wins && report.quick_wins.length > 0 && (
        <Section title="Rychlé výhry">
          <ul className="space-y-2">
            {report.quick_wins.map((w, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>{w}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Section title="Doporučení">
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>{r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Content Plan */}
      {report.content_plan && report.content_plan.length > 0 && (
        <Section title="Obsahový plán">
          <div className="space-y-3">
            {report.content_plan.map((cp, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
                {cp.title && <p className="text-sm font-medium text-foreground">{cp.title}</p>}
                {cp.intent && <p className="text-xs text-muted-foreground">Záměr: {cp.intent}</p>}
                {cp.outline_h2 && cp.outline_h2.length > 0 && (
                  <p className="text-xs text-muted-foreground">Osnova: {cp.outline_h2.join(" • ")}</p>
                )}
                {cp.cta && <p className="text-xs text-primary">CTA: {cp.cta}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Suggested Fixes */}
      {report.suggested_fixes && report.suggested_fixes.length > 0 && (
        <Section title="Navržené úpravy titulků a popisů">
          <div className="space-y-4">
            {report.suggested_fixes.map((fix, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                {fix.url && (
                  <a href={fix.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />{fix.url}
                  </a>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Před</p>
                    <p className="text-sm"><span className="font-medium">Title:</span> {fix.current_title || <span className="italic text-muted-foreground">chybí</span>}</p>
                    <p className="text-sm"><span className="font-medium">Description:</span> {fix.current_meta_description || <span className="italic text-muted-foreground">chybí</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">Po</p>
                    <p className="text-sm"><span className="font-medium">Title:</span> {fix.suggested_title}</p>
                    <p className="text-sm"><span className="font-medium">Description:</span> {fix.suggested_meta_description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Shared small components ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorState({ text }: { text: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <History className="w-12 h-12 mx-auto mb-3 text-destructive" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

/* ── Main Page ── */
export default function SeoHistoryPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">SEO Historie</h1>
        <p className="text-muted-foreground">Přehled tvých SEO článků a auditů.</p>
      </div>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>SEO články</span>
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <FileSearch className="w-4 h-4" />
            <span>SEO audity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <ArticlesTab />
        </TabsContent>
        <TabsContent value="audits">
          <AuditsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
