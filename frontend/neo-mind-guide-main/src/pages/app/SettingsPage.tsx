import { useOutletContext, useNavigate } from "react-router-dom";
import { User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/components/app/AppLayout";

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  web: "Webové stránky",
  email: "E-mailový marketing",
  ads: "Reklamní platformy",
};

const goalLabels: Record<string, string> = {
  customers: "Získání nových zákazníků",
  sales: "Zvýšení prodejů",
  brand: "Budování značky",
  followers: "Získání sledujících",
  time: "Úspora času",
};

const styleLabels: Record<string, string> = {
  professional: "Profesionální a věcný",
  friendly: "Přátelský a osobní",
  sales: "Prodejní a přesvědčivý",
  educational: "Edukační a informativní",
  creative: "Kreativní a originální",
};

const contentTypeLabels: Record<string, string> = {
  social: "Příspěvky na sociální sítě",
  web: "Texty na web nebo blog",
  newsletter: "Newsletter nebo e-mail",
  ads: "Reklamní texty",
};

export default function SettingsPage() {
  const { profile } = useOutletContext<{ profile: UserProfile | null }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleResetOnboarding = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: false })
      .eq('id', session.user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se resetovat onboarding.",
      });
      return;
    }

    toast({ title: "Onboarding resetován" });
    navigate('/onboarding');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Nastavení</h1>
        <p className="text-muted-foreground">Spravuj svůj profil a preference.</p>
      </div>

      {/* Profile settings */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Profil z onboardingu</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Jméno</span>
              <p className="text-foreground font-medium">{profile?.name || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Podnikání</span>
              <p className="text-foreground font-medium">{profile?.business || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Typ obsahu</span>
              <p className="text-foreground font-medium">{contentTypeLabels[profile?.content_type || ""] || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Platforma</span>
              <p className="text-foreground font-medium">{platformLabels[profile?.platform || ""] || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Komunikační styl</span>
              <p className="text-foreground font-medium">{styleLabels[profile?.communication_style || ""] || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Hlavní cíl</span>
              <p className="text-foreground font-medium">{goalLabels[profile?.goal || ""] || "—"}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button
              variant="outline"
              onClick={handleResetOnboarding}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Znovu projít onboarding
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Toto resetuje tvůj profil a přesměruje tě na onboarding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
