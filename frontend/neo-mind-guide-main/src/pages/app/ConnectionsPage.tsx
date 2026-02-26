import { Link2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ConnectionsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Connections
        </h1>
        <p className="text-muted-foreground">
          Propoj platformy pro automatické publikování obsahu.
        </p>
      </div>

      {/* WordPress Card */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
              <span className="text-xl font-bold text-muted-foreground">W</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">WordPress</h3>
              <p className="text-sm text-muted-foreground">Publikuj články přímo na svůj WordPress web</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <X className="w-3 h-3" />
            Nepřipojeno
          </Badge>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Připoj své API endpointy pro WordPress integraci. Tato stránka je připravena pro napojení.
          </p>
        </div>
      </div>
    </div>
  );
}
