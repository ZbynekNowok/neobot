import { useState } from "react";
import { Send, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";

interface PublishAction {
  id: string;
  channel: string;
  content: string;
  assets: string[];
  status: "draft" | "approved" | "processing" | "completed" | "failed" | "rejected";
  result?: string;
  remoteUrl?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  approved: { label: "Approved", className: "bg-primary text-primary-foreground" },
  processing: { label: "Processing", className: "border-orange-500 text-orange-400 bg-transparent" },
  completed: { label: "Completed", className: "bg-green-600 text-white" },
  failed: { label: "Failed", className: "bg-destructive text-destructive-foreground" },
  rejected: { label: "Rejected", className: "bg-muted text-muted-foreground" },
};

export default function PublishCenterPage() {
  const { toast } = useToast();
  const [channel, setChannel] = useState("web");
  const [content, setContent] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<PublishAction[]>(() => {
    return JSON.parse(localStorage.getItem("neobot_publish_actions") || "[]");
  });

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsLoading(true);

    const newAction: PublishAction = {
      id: crypto.randomUUID(),
      channel,
      content,
      assets: assetUrl ? [assetUrl] : [],
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    try {
      const data = await apiPost("/publish", { channel, content, assets: newAction.assets });
      newAction.status = "completed";
      newAction.result = data?.message || "Published";
      newAction.remoteUrl = data?.remoteUrl;
      toast({ title: "Publikováno", description: data?.message || "Obsah odeslán" });
    } catch (err: any) {
      // If endpoint not ready, mark as draft
      newAction.status = "draft";
      toast({ title: "Uloženo jako draft", description: "Publish endpoint zatím není dostupný. Akce uložena lokálně." });
    } finally {
      const updated = [newAction, ...actions];
      setActions(updated);
      localStorage.setItem("neobot_publish_actions", JSON.stringify(updated));
      setContent("");
      setAssetUrl("");
      setIsLoading(false);
    }
  };

  const updateStatus = (id: string, status: PublishAction["status"]) => {
    const updated = actions.map(a => a.id === id ? { ...a, status } : a);
    setActions(updated);
    localStorage.setItem("neobot_publish_actions", JSON.stringify(updated));
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Publish Center</h1>
        <p className="text-muted-foreground">Spravuj a publikuj obsah na propojené platformy.</p>
      </div>

      {/* New publish form */}
      <div className="glass rounded-xl p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><Plus className="w-4 h-4" /> Nová publikace</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Kanál</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Asset URL (volitelně)</Label>
            <Input value={assetUrl} onChange={e => setAssetUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label>Obsah</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Text k publikování…" rows={4} />
        </div>
        <Button onClick={handlePublish} disabled={isLoading || !content.trim()}>
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Odesílám…</> : <><Send className="w-4 h-4 mr-2" /> Publikovat</>}
        </Button>
      </div>

      {/* Actions table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold text-foreground">Publish Actions</h2>
        </div>
        {actions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Send className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Zatím žádné publish akce</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-left">
                  <th className="p-3">Datum</th>
                  <th className="p-3">Kanál</th>
                  <th className="p-3">Obsah</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Akce</th>
                </tr>
              </thead>
              <tbody>
                {actions.map(action => (
                  <tr key={action.id} className="border-b border-border/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(action.createdAt).toLocaleDateString("cs")}</td>
                    <td className="p-3 capitalize">{action.channel}</td>
                    <td className="p-3 max-w-xs truncate">{action.content}</td>
                    <td className="p-3">
                      <Badge className={statusConfig[action.status]?.className}>{statusConfig[action.status]?.label}</Badge>
                    </td>
                    <td className="p-3 space-x-1">
                      {action.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(action.id, "approved")} className="text-xs">Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(action.id, "rejected")} className="text-xs">Reject</Button>
                        </>
                      )}
                      {action.status === "completed" && action.remoteUrl && (
                        <a href={action.remoteUrl} target="_blank" rel="noopener" className="text-primary text-xs hover:underline">Open draft</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
