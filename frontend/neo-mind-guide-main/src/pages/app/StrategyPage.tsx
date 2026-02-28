import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserProfile } from "@/components/app/AppLayout";
import { 
  Building2, 
  Users, 
  Target, 
  MessageSquare, 
  Palette,
  Package,
  Edit3,
  Save,
  Check,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import neobotIcon from "@/assets/neobot-icon.png";
import { syncWorkspaceProfileFromSupabaseProfile } from "@/lib/neobot";
import { Upload, X } from "lucide-react";
import { useRef } from "react";

// Options
const channelOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "web", label: "Web / blog" },
  { value: "email", label: "E-mail" },
  { value: "ads", label: "Reklama" },
];

const businessStageOptions = [
  { value: "starting", label: "Začínám" },
  { value: "selling-no-system", label: "Už prodávám, ale bez systému" },
  { value: "growing", label: "Fungující byznys, chci růst" },
  { value: "scaling", label: "Škáluji / deleguji marketing" },
];

const goalOptions = [
  { value: "new-customers", label: "Získat nové zákazníky" },
  { value: "increase-sales", label: "Zvýšit prodeje" },
  { value: "build-brand", label: "Vybudovat značku" },
  { value: "clarify-strategy", label: "Ujasnit si strategii" },
  { value: "save-time", label: "Šetřit čas" },
];

interface StrategySectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
  savedState?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

function StrategySection({ 
  id, 
  title, 
  icon: Icon, 
  description, 
  children, 
  savedState,
  onSave,
  isSaving 
}: StrategySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="glass rounded-xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  {savedState && (
                    <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      Uloženo
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-2 border-t border-border/50">
            <div className="space-y-4">
              {children}
              
              {onSave && (
                <Button onClick={onSave} disabled={isSaving} className="mt-4">
                  {isSaving ? (
                    <>Ukládám...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Uložit změny
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function StrategyPage() {
  const { profile: initialProfile, refreshProfile } = useOutletContext<{ profile: UserProfile | null; refreshProfile?: () => Promise<void> }>();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Držet profil v syncu s kontextem (např. po nahrání loga na Dashboard), aby uložení nepřepsalo nové logo starou hodnotou
  useEffect(() => {
    setProfile(initialProfile ?? null);
  }, [initialProfile]);

  // Form states for each section
  const [brandForm, setBrandForm] = useState({
    brand_name: "",
    business: "",
    ideal_customer: "",
    communication_style: "",
    brand_keywords: "",
    unique_value: "",
    brand_logo_url: "" as string | null,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoCacheBuster, setLogoCacheBuster] = useState(0);

  const [goalsForm, setGoalsForm] = useState({
    marketing_goal: [] as string[],
    business_stage: "",
    marketing_blocker: "",
  });

  const [channelsForm, setChannelsForm] = useState({
    active_channels: [] as string[],
    priority_channel: "",
    content_frequency: "",
  });

  const [contentStrategyForm, setContentStrategyForm] = useState({
    content_type: "",
    content_struggle: "",
  });

  const [productsForm, setProductsForm] = useState({
    customer_problem: "",
    inspiration_brands: "",
  });

  // Initialize forms from profile
  useEffect(() => {
    if (profile) {
      setBrandForm({
        brand_name: profile.brand_name || "",
        business: profile.business || "",
        ideal_customer: profile.ideal_customer || "",
        communication_style: profile.communication_style || "",
        brand_keywords: profile.brand_keywords || "",
        unique_value: profile.unique_value || "",
        brand_logo_url: profile.brand_logo_url || null,
      });
      setGoalsForm({
        marketing_goal: profile.marketing_goal || [],
        business_stage: profile.business_stage || "",
        marketing_blocker: profile.marketing_blocker || "",
      });
      setChannelsForm({
        active_channels: profile.active_channels || [],
        priority_channel: profile.priority_channel || "",
        content_frequency: profile.content_frequency || "",
      });
      setContentStrategyForm({
        content_type: profile.content_type || "",
        content_struggle: profile.content_struggle || "",
      });
      setProductsForm({
        customer_problem: profile.customer_problem || "",
        inspiration_brands: profile.inspiration_brands || "",
      });
    }
  }, [profile]);

  const handleSaveSection = async (section: string, data: Record<string, any>) => {
    setIsSaving(section);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Pro uložení se musíte přihlásit");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", session.user.id);

      if (error) throw error;

      const nextProfile = profile ? { ...profile, ...data } : null;
      setProfile(nextProfile);
      if (nextProfile) {
        syncWorkspaceProfileFromSupabaseProfile(nextProfile).catch(() => {});
      }
      await refreshProfile?.();
      toast.success("Uloženo");
    } catch (e) {
      console.error("Failed to save:", e);
      toast.error("Nepodařilo se uložit");
    } finally {
      setIsSaving(null);
    }
  };

  const handleGoalToggle = (goal: string) => {
    setGoalsForm(prev => ({
      ...prev,
      marketing_goal: prev.marketing_goal.includes(goal)
        ? prev.marketing_goal.filter(g => g !== goal)
        : [...prev.marketing_goal, goal]
    }));
  };

  const handleChannelToggle = (channel: string) => {
    setChannelsForm(prev => {
      const channels = prev.active_channels.includes(channel)
        ? prev.active_channels.filter(c => c !== channel)
        : [...prev.active_channels, channel];
      
      const priority = channels.includes(prev.priority_channel) 
        ? prev.priority_channel 
        : "";
      
      return { ...prev, active_channels: channels, priority_channel: priority };
    });
  };

  // Check if section has data
  const hasBrandData = !!(profile?.brand_name || profile?.business);
  const hasGoalsData = !!(profile?.marketing_goal?.length || profile?.business_stage);
  const hasChannelsData = !!(profile?.active_channels?.length);
  const hasContentData = !!(profile?.content_type);
  const hasProductsData = !!(profile?.customer_problem);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img src={neobotIcon} alt="NeoBot" className="w-12 h-12" />
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Strategie
          </h1>
          <p className="text-muted-foreground">
            Nastav kontext pro AI. Data jsou trvale uložena a používána při tvorbě obsahu.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass rounded-xl p-4 mb-6 border-l-4 border-l-primary">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> Čím více informací vyplníš, tím přesnější a relevantnější obsah NeoBot vytvoří.
        </p>
      </div>

      {/* Strategy Sections */}
      <div className="space-y-4">
        {/* Brand Profile */}
        <StrategySection
          id="brand"
          title="Profil značky"
          icon={Building2}
          description="Název, obor, cílová skupina, tón komunikace"
          savedState={hasBrandData}
          onSave={() => handleSaveSection("brand", brandForm)}
          isSaving={isSaving === "brand"}
        >
          <div className="grid gap-4">
            {/* Firemní logo – klikni na okno a nahraj (čtverec i obdélník, responzivní) */}
            <div className="space-y-2">
              <Label>Firemní logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    toast.error("Pro nahrání loga se přihlaste.");
                    return;
                  }
                  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
                  const path = `${session.user.id}/brand-logo.${ext}`;
                  const { error } = await supabase.storage.from("brand-logos").upload(path, file, { upsert: true });
                  if (error) {
                    console.error("Logo upload error:", error);
                    toast.error(error.message || "Nepodařilo se nahrát logo. Zkontrolujte bucket „brand-logos“ v Supabase.");
                    return;
                  }
                  const { data: urlData } = supabase.storage.from("brand-logos").getPublicUrl(path);
                  const newLogoUrl = urlData.publicUrl;
                  setBrandForm(prev => ({ ...prev, brand_logo_url: newLogoUrl }));
                  try {
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
                    if (updateError) throw updateError;
                    const nextProfile = profile ? { ...profile, brand_logo_url: newLogoUrl } : null;
                    setProfile(nextProfile);
                    await syncWorkspaceProfileFromSupabaseProfile(nextProfile);
                    await refreshProfile?.({ brand_logo_url: newLogoUrl });
                    setLogoCacheBuster((v) => v + 1);
                    toast.success("Logo nahráno a uloženo");
                  } catch (err) {
                    console.error("Profile update error:", err);
                    toast.error("Logo se nahrálo, ale nepodařilo se uložit do profilu. Zkus znovu nebo klikni Uložit.");
                  }
                  if (logoInputRef.current) logoInputRef.current.value = "";
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => logoInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logoInputRef.current?.click(); } }}
                className="relative w-full max-w-[320px] min-h-[160px] sm:min-h-[200px] rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer flex items-center justify-center overflow-hidden group"
                aria-label="Nahrát nebo změnit firemní logo"
              >
                {brandForm.brand_logo_url ? (
                  <>
                    <img
                      src={brandForm.brand_logo_url + (logoCacheBuster ? `?v=${logoCacheBuster}` : "")}
                      alt="Firemní logo"
                      className="max-w-full max-h-[180px] sm:max-h-[220px] w-auto h-auto object-contain p-4"
                    />
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setBrandForm(prev => ({ ...prev, brand_logo_url: null }));
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                          try {
                            const { error } = await supabase.from("profiles").update({ brand_logo_url: null }).eq("id", session.user.id);
                            if (!error) {
                              setProfile(prev => prev ? { ...prev, brand_logo_url: null } : null);
                              syncWorkspaceProfileFromSupabaseProfile(profile ? { ...profile, brand_logo_url: null } : null).catch(() => {});
                              await refreshProfile?.({ brand_logo_url: null });
                              toast.success("Logo odstraněno");
                            } else toast.error("Nepodařilo se odstranit logo");
                          } catch {
                            toast.error("Nepodařilo se odstranit logo");
                          }
                        }
                      }}
                      className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground p-1.5 opacity-80 hover:opacity-100 shadow"
                      title="Odstranit logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 py-1">
                      Klikni pro změnu
                    </span>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Klikni a nahraj logo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG nebo SVG • čtverec i obdélník</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Zobrazí se v profilu a na vygenerovaných grafikách. Po nahrání se logo hned uloží.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Název značky</Label>
                <Input
                  value={brandForm.brand_name}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, brand_name: e.target.value }))}
                  placeholder="Název tvé značky"
                />
              </div>
              <div className="space-y-2">
                <Label>Tón komunikace</Label>
                <Input
                  value={brandForm.communication_style}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, communication_style: e.target.value }))}
                  placeholder="Např. přátelský, profesionální..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Čemu se věnuješ?</Label>
              <Textarea
                value={brandForm.business}
                onChange={(e) => setBrandForm(prev => ({ ...prev, business: e.target.value }))}
                placeholder="Popiš své podnikání, obor, co nabízíš..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Ideální zákazník</Label>
              <Textarea
                value={brandForm.ideal_customer}
                onChange={(e) => setBrandForm(prev => ({ ...prev, ideal_customer: e.target.value }))}
                placeholder="Kdo je tvůj ideální zákazník?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Klíčová slova značky</Label>
              <Input
                value={brandForm.brand_keywords}
                onChange={(e) => setBrandForm(prev => ({ ...prev, brand_keywords: e.target.value }))}
                placeholder="Např. autentický, inovativní, spolehlivý..."
              />
            </div>
            <div className="space-y-2">
              <Label>Co značka NENÍ / Co nechceš</Label>
              <Textarea
                value={brandForm.unique_value}
                onChange={(e) => setBrandForm(prev => ({ ...prev, unique_value: e.target.value }))}
                placeholder="Co tě odlišuje od konkurence, čemu se vyhýbáš..."
                rows={2}
              />
            </div>
          </div>
        </StrategySection>

        {/* Marketing Goals */}
        <StrategySection
          id="goals"
          title="Marketingové cíle"
          icon={Target}
          description="Hlavní cíle, krátkodobé priority, co netlačit"
          savedState={hasGoalsData}
          onSave={() => handleSaveSection("goals", goalsForm)}
          isSaving={isSaving === "goals"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hlavní cíle (vyber více)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {goalOptions.map(option => (
                  <div
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      goalsForm.marketing_goal.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleGoalToggle(option.value)}
                  >
                    <Checkbox checked={goalsForm.marketing_goal.includes(option.value)} />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fáze podnikání</Label>
              <Select
                value={goalsForm.business_stage}
                onValueChange={(value) => setGoalsForm(prev => ({ ...prev, business_stage: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyber fázi" />
                </SelectTrigger>
                <SelectContent>
                  {businessStageOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Co teď netlačit / Hlavní překážka</Label>
              <Textarea
                value={goalsForm.marketing_blocker}
                onChange={(e) => setGoalsForm(prev => ({ ...prev, marketing_blocker: e.target.value }))}
                placeholder="Co tě v marketingu nejvíc brzdí nebo čemu se teď nechceš věnovat..."
                rows={2}
              />
            </div>
          </div>
        </StrategySection>

        {/* Channels & Platforms */}
        <StrategySection
          id="channels"
          title="Kanály & platformy"
          icon={MessageSquare}
          description="Kde působíš, co se kde smí/nesmí"
          savedState={hasChannelsData}
          onSave={() => handleSaveSection("channels", channelsForm)}
          isSaving={isSaving === "channels"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aktivní kanály</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {channelOptions.map(option => (
                  <div
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      channelsForm.active_channels.includes(option.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleChannelToggle(option.value)}
                  >
                    <Checkbox checked={channelsForm.active_channels.includes(option.value)} />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {channelsForm.active_channels.length > 0 && (
              <div className="space-y-2">
                <Label>Prioritní kanál</Label>
                <Select
                  value={channelsForm.priority_channel}
                  onValueChange={(value) => setChannelsForm(prev => ({ ...prev, priority_channel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber hlavní kanál" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelsForm.active_channels.map(channel => {
                      const option = channelOptions.find(c => c.value === channel);
                      return (
                        <SelectItem key={channel} value={channel}>
                          {option?.label || channel}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Frekvence obsahu</Label>
              <Input
                value={channelsForm.content_frequency}
                onChange={(e) => setChannelsForm(prev => ({ ...prev, content_frequency: e.target.value }))}
                placeholder="Např. 3x týdně, denně, 1x měsíčně..."
              />
            </div>
          </div>
        </StrategySection>

        {/* Content Strategy */}
        <StrategySection
          id="content"
          title="Strategie obsahu"
          icon={Palette}
          description="Poměr edukace/prodeje, emoce vs. racionalita"
          savedState={hasContentData}
          onSave={() => handleSaveSection("content", contentStrategyForm)}
          isSaving={isSaving === "content"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Typ obsahu / Zaměření</Label>
              <Textarea
                value={contentStrategyForm.content_type}
                onChange={(e) => setContentStrategyForm(prev => ({ ...prev, content_type: e.target.value }))}
                placeholder="Např. 70% edukace, 20% inspirace, 10% prodej. Spíše emocionální komunikace..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>S čím bojuješ v tvorbě obsahu?</Label>
              <Textarea
                value={contentStrategyForm.content_struggle}
                onChange={(e) => setContentStrategyForm(prev => ({ ...prev, content_struggle: e.target.value }))}
                placeholder="Např. nevím co psát, chybí mi nápady, nemám čas..."
                rows={2}
              />
            </div>
          </div>
        </StrategySection>

        {/* Products & Campaigns */}
        <StrategySection
          id="products"
          title="Produktové pilíře"
          icon={Package}
          description="Hlavní produkty, sezónní témata, kampaně"
          savedState={hasProductsData}
          onSave={() => handleSaveSection("products", productsForm)}
          isSaving={isSaving === "products"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jaký problém zákazníci řeší?</Label>
              <Textarea
                value={productsForm.customer_problem}
                onChange={(e) => setProductsForm(prev => ({ ...prev, customer_problem: e.target.value }))}
                placeholder="Hlavní bolest nebo potřeba, kterou tvůj produkt/služba řeší..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Inspirativní značky / Konkurence</Label>
              <Textarea
                value={productsForm.inspiration_brands}
                onChange={(e) => setProductsForm(prev => ({ ...prev, inspiration_brands: e.target.value }))}
                placeholder="Značky, jejichž komunikací se inspiruješ nebo sledovat konkurenci..."
                rows={2}
              />
            </div>
          </div>
        </StrategySection>
      </div>
    </div>
  );
}
