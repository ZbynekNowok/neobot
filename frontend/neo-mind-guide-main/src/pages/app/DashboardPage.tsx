import { useState, useEffect, useRef } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Calendar, ArrowRight, PenTool, Target, Sparkles,
  CheckCircle2, Clock, Loader2, Search, FileSearch, Send, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";
import { syncWorkspaceProfileFromSupabaseProfile } from "@/lib/neobot";
import neobotIcon from "@/assets/neobot-icon.png";

interface TodayTask {
  task: string;
  channel: string;
  format: string;
  goal: string;
  status: "planned" | "done";
}

interface UpcomingTask {
  date: string;
  task: string;
  channel: string;
  format: string;
}

export default function DashboardPage() {
  const { profile, refreshProfile } = useOutletContext<{ profile: UserProfile | null; refreshProfile?: () => Promise<void> }>();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  /** Po nahrání nového loga měníme toto, aby prohlížeč načetl nový obrázek (stejná URL = cache). */
  const [logoCacheBuster, setLogoCacheBuster] = useState(0);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiError, setApiError] = useState<string | null>(null);

  // Recent history
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  useEffect(() => {
    loadTodayTasks();
    checkApiHealth();
    loadRecentHistory();
  }, []);

  const checkApiHealth = async () => {
    const directHealthUrl = import.meta.env.VITE_API_HEALTH_URL;
    try {
      if (directHealthUrl) {
        const url = directHealthUrl.startsWith("http") ? directHealthUrl : `${window.location.origin}${directHealthUrl}`;
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        await apiGet("/health");
      }
      setApiStatus("online");
    } catch (err: any) {
      setApiStatus("offline");
      setApiError(err?.message || "Nedostupné");
    }
  };

  const loadRecentHistory = () => {
    const history = JSON.parse(localStorage.getItem("neobot_history_v1") || "[]");
    setRecentArticles(history.filter((h: any) => h.type === "seo-generator").slice(0, 3));
    setRecentAudits(history.filter((h: any) => h.type === "seo-audit").slice(0, 3));
  };

  const loadTodayTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      const { data, error } = await supabase
        .from("content_plans").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).single();
      if (error && error.code !== "PGRST116") console.error("Error loading plan:", error);
      if (data) {
        setHasPlan(true);
        const tasks = data.tasks as any[];
        const today = new Date().toISOString().split("T")[0];
        setTodayTasks(tasks.filter(t => t.date === today).map(t => ({ task: t.task, channel: t.channel, format: t.format, goal: t.goal, status: t.status || "planned" })));
        setUpcomingTasks(tasks.filter(t => new Date(t.date) > new Date(today)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3).map(t => ({ date: t.date, task: t.task, channel: t.channel, format: t.format })));
      }
    } catch (e) { console.error("Failed to load tasks:", e); }
    finally { setIsLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
    return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  const handleTaskClick = (task: TodayTask) => {
    sessionStorage.setItem("neobot_task_context", JSON.stringify({ type: "text", task: task.task, channel: task.channel, format: task.format, goal: task.goal }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const hasTasksToDo = todayTasks.length > 0 && todayTasks.some((t) => t.status !== "done");
  const tasksBoxGreen = !hasTasksToDo;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* API Status – malý indikátor nahoře */}
      <div className="flex justify-end gap-2 mb-4" title={apiError || ""}>
        <div className={`w-2.5 h-2.5 rounded-full ${apiStatus === "online" ? "bg-green-500" : apiStatus === "offline" ? "bg-destructive" : "bg-muted-foreground animate-pulse"}`} />
        <span className="text-xs text-muted-foreground">{apiStatus === "online" ? "API Online" : apiStatus === "offline" ? "API Offline" : "Checking…"}</span>
      </div>

      {/* Dva boxy vedle sebe: 1) Logo + firemní název  2) Úkoly na dnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Box 1: Logo přes celé okno, tlačítko vpravo nahoře */}
        <div className="glass rounded-xl p-4 min-h-[260px] relative overflow-hidden">
          <Link
            to="/app/strategie"
            className="absolute top-3 right-3 z-10 shrink-0"
          >
            <Button size="sm" className="gap-2 shadow-sm bg-green-600 hover:bg-green-700 text-white border-0">
              <Target className="w-4 h-4" />
              Uprav profil
            </Button>
          </Link>
          <input
            id="dashboard-logo-upload"
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Vybrat soubor s logem"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                toast.error("Pro nahrání loga se přihlaste.");
                return;
              }
              setIsUploadingLogo(true);
              try {
                const ext = file.name.split(".").pop()?.toLowerCase() || "png";
                const path = `${session.user.id}/brand-logo.${ext}`;
                const { error } = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true });
                if (error) {
                  console.error("Logo upload error:", error);
                  toast.error(`Storage: ${error.message}`);
                  return;
                }
                const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
                const newLogoUrl = urlData.publicUrl;
                let { data: updatedRow, error: updateError } = await supabase
                  .from("profiles")
                  .update({ brand_logo_url: newLogoUrl })
                  .eq("id", session.user.id)
                  .select("brand_logo_url")
                  .maybeSingle();
                if (!updateError && !updatedRow) {
                  const { data: upserted, error: upsertErr } = await supabase
                    .from("profiles")
                    .upsert({ id: session.user.id, name: session.user.user_metadata?.name ?? null, brand_logo_url: newLogoUrl }, { onConflict: "id" })
                    .select("brand_logo_url")
                    .single();
                  updateError = upsertErr;
                  updatedRow = upserted;
                }
                if (updateError) {
                  console.error("Profile update error:", updateError);
                  toast.error(`Profil: ${updateError.message}`);
                  return;
                }
                const nextProfile = profile ? { ...profile, brand_logo_url: newLogoUrl } : null;
                await syncWorkspaceProfileFromSupabaseProfile(nextProfile);
                await refreshProfile?.({ brand_logo_url: newLogoUrl });
                setLogoCacheBuster(Date.now());
                toast.success("Logo nahráno a uloženo");
              } catch (err: any) {
                console.error("Logo upload exception:", err);
                toast.error(err?.message || "Něco se pokazilo");
              } finally {
                setIsUploadingLogo(false);
                if (logoInputRef.current) logoInputRef.current.value = "";
              }
            }}
          />
          <label
            htmlFor="dashboard-logo-upload"
            className={`absolute inset-0 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:border-primary/50 hover:bg-muted/70 transition-all flex items-center justify-center overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-inset group ${isUploadingLogo ? "pointer-events-none" : ""}`}
          >
            {isUploadingLogo ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : profile?.brand_logo_url ? (
              <>
                <img
                  key={`${profile.brand_logo_url}-${logoCacheBuster}`}
                  src={profile.brand_logo_url + (logoCacheBuster ? `?v=${logoCacheBuster}` : "")}
                  alt="Firemní logo"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <span className="text-xs font-medium text-white text-center px-2">Klikni pro změnu loga</span>
                </span>
              </>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-1" />
                <span className="text-sm text-muted-foreground block">Klikni a nahraj logo</span>
              </div>
            )}
          </label>
        </div>

        {/* Box 2: Úkoly na dnešní den – červený když jsou úkoly, zelený když ne */}
        <div
          className={`rounded-xl p-6 min-h-[260px] flex flex-col ${
            tasksBoxGreen
              ? "bg-green-500/15 border-2 border-green-500/40"
              : "bg-red-500/15 border-2 border-red-500/40"
          }`}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${tasksBoxGreen ? "text-green-600" : "text-red-600"}`} />
            Úkoly na dnešní den
          </h2>
          {todayTasks.length > 0 ? (
            <div className="space-y-2 flex-1">
              {todayTasks.map((task, idx) => (
                <Link
                  key={idx}
                  to="/app/tvorba"
                  onClick={() => handleTaskClick(task)}
                  className={`block rounded-lg p-3 transition-all ${
                    task.status === "done"
                      ? "bg-muted/50 opacity-70"
                      : "bg-background/60 hover:bg-background/80 border border-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {task.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">{task.channel} • {task.format}</span>
                      </div>
                      <p className="text-foreground font-medium text-sm">{task.task}</p>
                      {task.goal && <p className="text-xs text-muted-foreground mt-0.5">{task.goal}</p>}
                    </div>
                    {task.status !== "done" && (
                      <Button size="sm" variant="outline" className="shrink-0 text-xs">
                        Vytvořit <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : hasPlan ? (
            <div className="flex-1 flex flex-col justify-center text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="text-foreground font-medium text-sm">Na dnes nemáš žádný úkol</p>
              <p className="text-xs text-muted-foreground mt-0.5">V pohodě, odpočiň si nebo tvoř dle plánu</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center text-center py-2">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-foreground font-medium text-sm mb-1">Nemáš obsahový plán</p>
              <p className="text-xs text-muted-foreground mb-3">Vytvoř si plán a NeoBot ti naplánuje úkoly</p>
              <Link to="/app/plan" className="inline-flex justify-center">
                <Button size="sm"><Calendar className="w-4 h-4 mr-2" />Vytvořit plán</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent history */}
      {(recentArticles.length > 0 || recentAudits.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Poslední výstupy</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentArticles.length > 0 && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Search className="w-4 h-4" /> Články</h3>
                {recentArticles.map((a: any, i: number) => (
                  <div key={i} className="text-sm text-foreground mb-2 truncate">{a.result?.title || a.keyword}</div>
                ))}
              </div>
            )}
            {recentAudits.length > 0 && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><FileSearch className="w-4 h-4" /> Audity</h3>
                {recentAudits.map((a: any, i: number) => (
                  <div key={i} className="text-sm text-foreground mb-2 truncate">{a.url} – Score: {a.result?.score}</div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Calendar className="w-5 h-5 text-accent" />Nadcházející obsah</h2>
            <Link to="/app/plan" className="text-sm text-primary hover:underline">Zobrazit kalendář</Link>
          </div>
          <div className="grid gap-3">
            {upcomingTasks.map((task, idx) => (
              <div key={idx} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary">{formatDate(task.date)}</span>
                    <span className="text-xs text-muted-foreground">{task.channel} • {task.format}</span>
                  </div>
                  <p className="text-foreground text-sm">{task.task}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Rychlé akce</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { to: "/app/seo/generator", icon: Search, title: "Generate Article", desc: "SEO optimalizovaný článek", color: "primary" },
            { to: "/app/seo/audit", icon: FileSearch, title: "Run Audit", desc: "Analyzuj URL pro SEO", color: "accent" },
            { to: "/app/publish", icon: Send, title: "Publish Center", desc: "Spravuj publikování", color: "primary" },
            { to: "/app/tvorba", icon: PenTool, title: "Vytvořit obsah", desc: "Texty, obrázky, videa", color: "primary" },
            { to: "/app/strategie", icon: Target, title: "Strategie", desc: "Nastavit kontext značky", color: "accent" },
            { to: "/app/plan", icon: Calendar, title: "Plánovač", desc: "Obsahový kalendář", color: "primary" },
          ].map(item => (
            <Link key={item.to} to={item.to} className={`glass rounded-xl p-5 hover:border-${item.color}/50 hover:bg-${item.color}/5 transition-all group`}>
              <div className={`w-10 h-10 rounded-lg bg-${item.color}/10 flex items-center justify-center mb-3 group-hover:bg-${item.color}/20 transition-colors`}>
                <item.icon className={`w-5 h-5 text-${item.color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
              <div className={`flex items-center text-sm text-${item.color} font-medium`}>Otevřít <ArrowRight className="w-4 h-4 ml-1" /></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
