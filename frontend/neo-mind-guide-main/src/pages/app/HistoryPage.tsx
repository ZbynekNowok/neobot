import { useState, useEffect } from "react";
import { History, Eye, Image, Loader2, FileText, Video, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NEOBOT_API_BASE, neobotFetch } from "@/lib/neobot";

interface OutputItem {
  id: string;
  type: string;
  input: any;
  output: any;
  created_at: string;
}

type Category = "text" | "image" | "video" | "transform";

const CATEGORY_MAP: Record<string, Category> = {
  content_generate: "text",
  image_background: "image",
  marketing_flyer: "image",
  design_render: "image",
  social_card_draft: "image",
  video_script: "video",
  video_generate: "video",
  text_transform: "transform",
  text_rewrite: "transform",
};

const TYPE_LABELS: Record<string, string> = {
  content_generate: "Text",
  image_background: "Obrázek",
  marketing_flyer: "Leták",
  design_render: "Grafika",
  social_card_draft: "Grafika s textem",
  video_script: "Video skript",
  video_generate: "Video",
  text_transform: "Úprava",
  text_rewrite: "Přepis",
};

function typeIcon(type: string) {
  const cat = CATEGORY_MAP[type];
  if (cat === "image") return <Image className="w-5 h-5 text-primary" />;
  if (cat === "video") return <Video className="w-5 h-5 text-accent" />;
  if (cat === "transform") return <Pencil className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-primary" />;
}

function preview(item: OutputItem): string {
  if (item.output?.text) return item.output.text.slice(0, 120);
  if (item.input?.prompt) return item.input.prompt.slice(0, 120);
  if (item.input?.copy?.headline) return item.input.copy.headline;
  return TYPE_LABELS[item.type] || "Výstup";
}

function imageUrl(item: OutputItem): string | null {
  const cat = CATEGORY_MAP[item.type];
  if (cat === "image" && item.output?.imageUrl) {
    const url = item.output.imageUrl as string;
    return url.startsWith("http") ? url : `${NEOBOT_API_BASE}${url}`;
  }
  return null;
}

function categorize(items: OutputItem[]): Record<Category, OutputItem[]> {
  const result: Record<Category, OutputItem[]> = { text: [], image: [], video: [], transform: [] };
  for (const item of items) {
    const cat = CATEGORY_MAP[item.type];
    if (cat) result[cat].push(item);
    // Skip SEO and unknown types
  }
  return result;
}

const TABS: { value: Category; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Textové", icon: <FileText className="w-4 h-4" /> },
  { value: "image", label: "Obrázkové", icon: <Image className="w-4 h-4" /> },
  { value: "video", label: "Video", icon: <Video className="w-4 h-4" /> },
  { value: "transform", label: "Úpravy textu", icon: <Pencil className="w-4 h-4" /> },
];

function ItemList({ items, onSelect }: { items: OutputItem[]; onSelect: (i: OutputItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">V této kategorii zatím nemáš žádné výstupy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const img = imageUrl(item);
        return (
          <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4">
            {img ? (
              <img src={img} alt="Náhled" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                {typeIcon(item.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {TYPE_LABELS[item.type] || item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString("cs")}
                </span>
              </div>
              <p className="text-foreground text-sm truncate">{preview(item)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onSelect(item)}>
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OutputItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await neobotFetch("/api/outputs?limit=50");
        if (!data?.ok) throw new Error(data?.message || data?.error || "Nepodařilo se načíst historii.");
        const sorted = (data.items as OutputItem[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setItems(sorted);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = categorize(items);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Historie výstupů</h1>
        <p className="text-muted-foreground">Přehled tvého vygenerovaného obsahu.</p>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Načítám historii…</p>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Chyba</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : (
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {grouped[tab.value].length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {grouped[tab.value].length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <ItemList items={grouped[tab.value]} onSelect={setSelected} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {TYPE_LABELS[selected?.type || ""] || selected?.type} – {new Date(selected?.created_at || "").toLocaleString("cs")}
            </DialogTitle>
          </DialogHeader>
          {selected && imageUrl(selected) && (
            <img src={imageUrl(selected)!} alt="Výstup" className="w-full rounded-lg mb-4" />
          )}
          {selected?.output?.text && (
            <div className="p-4 rounded-lg bg-muted/30 text-foreground whitespace-pre-wrap leading-relaxed mb-4">
              {selected.output.text}
              {selected.output.hashtags?.length > 0 && (
                <p className="mt-3 text-primary">{selected.output.hashtags.join(" ")}</p>
              )}
            </div>
          )}
          <pre className="text-xs bg-muted/30 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(selected?.output, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
