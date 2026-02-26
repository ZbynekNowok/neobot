import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/components/app/AppLayout";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`;

export default function PlannerPage() {
  const { profile } = useOutletContext<{ profile: UserProfile | null }>();
  const { toast } = useToast();
  const [contentPlan, setContentPlan] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const generatePlan = async () => {
    if (!profile) return;
    setIsLoading(true);
    setContentPlan("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ profile, type: "content_plan" }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to generate plan");
      }

      let content = "";
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              content += delta;
              setContentPlan(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setContentPlan(content);
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se vygenerovat plán.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Plánovač obsahu</h1>
          <p className="text-muted-foreground">Týdenní obsahový plán pro tvůj marketing.</p>
        </div>
        {contentPlan && (
          <Button
            variant="outline"
            onClick={generatePlan}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Nový plán
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!contentPlan && !isLoading && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Calendar className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Obsahový plán</h2>
          <p className="text-muted-foreground mb-6">
            Vygeneruj si týdenní plán obsahu na míru tvému podnikání.
          </p>
          <Button
            size="lg"
            onClick={generatePlan}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Vytvořit plán
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !contentPlan && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Připravuji obsahový plán…</p>
        </div>
      )}

      {/* Generated plan */}
      {contentPlan && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Tvůj týdenní plán</span>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {contentPlan}
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 mt-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generuji…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
