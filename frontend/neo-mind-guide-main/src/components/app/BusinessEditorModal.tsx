import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/components/app/AppLayout";
import { Loader2, Save } from "lucide-react";

type EditorSection = "business" | "audience" | "goals" | "channels" | "style";

interface BusinessEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  section?: EditorSection;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
}

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
  { value: "combination", label: "Kombinace více cílů" },
];

const frequencyOptions = [
  { value: "daily", label: "Denně" },
  { value: "few-times-week", label: "Několikrát týdně" },
  { value: "weekly", label: "Jednou týdně" },
  { value: "few-times-month", label: "Několikrát měsíčně" },
  { value: "rarely", label: "Zřídka / nepravidelně" },
];

export function BusinessEditorModal({
  open,
  onOpenChange,
  profile,
  section = "business",
  onProfileUpdated,
}: BusinessEditorModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<EditorSection>(section);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    business: "",
    business_stage: "",
    ideal_customer: "",
    customer_problem: "",
    unique_value: "",
    marketing_goal: [] as string[],
    marketing_blocker: "",
    active_channels: [] as string[],
    priority_channel: "",
    content_frequency: "",
    brand_keywords: "",
    inspiration_brands: "",
  });

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        business: profile.business || "",
        business_stage: profile.business_stage || "",
        ideal_customer: profile.ideal_customer || "",
        customer_problem: profile.customer_problem || "",
        unique_value: profile.unique_value || "",
        marketing_goal: profile.marketing_goal || [],
        marketing_blocker: profile.marketing_blocker || "",
        active_channels: profile.active_channels || [],
        priority_channel: profile.priority_channel || "",
        content_frequency: profile.content_frequency || "",
        brand_keywords: profile.brand_keywords || "",
        inspiration_brands: profile.inspiration_brands || "",
      });
    }
  }, [profile, open]);

  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  const handleChannelToggle = (channel: string) => {
    setFormData((prev) => {
      const channels = prev.active_channels.includes(channel)
        ? prev.active_channels.filter((c) => c !== channel)
        : [...prev.active_channels, channel];
      
      // If we uncheck the priority channel, reset it
      const priority = channels.includes(prev.priority_channel) 
        ? prev.priority_channel 
        : "";
      
      return { ...prev, active_channels: channels, priority_channel: priority };
    });
  };

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => {
      const goals = prev.marketing_goal.includes(goal)
        ? prev.marketing_goal.filter((g) => g !== goal)
        : [...prev.marketing_goal, goal];
      return { ...prev, marketing_goal: goals };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Chyba", description: "Nejsi přihlášen", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name || null,
          business: formData.business || null,
          business_stage: formData.business_stage || null,
          ideal_customer: formData.ideal_customer || null,
          customer_problem: formData.customer_problem || null,
          unique_value: formData.unique_value || null,
          marketing_goal: formData.marketing_goal.length > 0 ? formData.marketing_goal : null,
          marketing_blocker: formData.marketing_blocker || null,
          active_channels: formData.active_channels.length > 0 ? formData.active_channels : null,
          priority_channel: formData.priority_channel || null,
          content_frequency: formData.content_frequency || null,
          brand_keywords: formData.brand_keywords || null,
          inspiration_brands: formData.inspiration_brands || null,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // Return updated profile
      const updatedProfile: UserProfile = {
        ...profile,
        ...formData,
      };

      onProfileUpdated(updatedProfile);
      toast({ title: "Uloženo", description: "Tvůj profil byl aktualizován." });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Chyba", description: "Nepodařilo se uložit změny.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTabs = [
    { id: "business" as const, label: "Podnikání" },
    { id: "audience" as const, label: "Cílovka" },
    { id: "goals" as const, label: "Cíle" },
    { id: "channels" as const, label: "Kanály" },
    { id: "style" as const, label: "Styl" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editor podnikání</DialogTitle>
          <DialogDescription>
            Uprav informace o svém podnikání. NeoBot je okamžitě použije při tvorbě obsahu.
          </DialogDescription>
        </DialogHeader>

        {/* Section Tabs */}
        <div className="flex gap-1 border-b border-border pb-2 overflow-x-auto">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeSection === "business" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Jméno</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Tvoje jméno"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business">Čemu se věnuješ?</Label>
                <Textarea
                  id="business"
                  value={formData.business}
                  onChange={(e) => setFormData((prev) => ({ ...prev, business: e.target.value }))}
                  placeholder="Popiš své podnikání, obor, co nabízíš..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_stage">Fáze podnikání</Label>
                <Select
                  value={formData.business_stage}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, business_stage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber fázi" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessStageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unique_value">Proč si vybrat právě tebe?</Label>
                <Textarea
                  id="unique_value"
                  value={formData.unique_value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unique_value: e.target.value }))}
                  placeholder="Co tě odlišuje od konkurence?"
                  rows={2}
                />
              </div>
            </>
          )}

          {activeSection === "audience" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ideal_customer">Kdo je tvůj ideální zákazník?</Label>
                <Textarea
                  id="ideal_customer"
                  value={formData.ideal_customer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ideal_customer: e.target.value }))}
                  placeholder="Popiš svého ideálního zákazníka..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_problem">Jaký hlavní problém řeší?</Label>
                <Textarea
                  id="customer_problem"
                  value={formData.customer_problem}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_problem: e.target.value }))}
                  placeholder="Jaký problém nebo potřebu zákazníci mají?"
                  rows={3}
                />
              </div>
            </>
          )}

          {activeSection === "goals" && (
            <>
              <div className="space-y-2">
                <Label>Jaké jsou tvé hlavní cíle?</Label>
                <p className="text-sm text-muted-foreground">Můžeš vybrat více možností</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {goalOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.marketing_goal.includes(option.value)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleGoalToggle(option.value)}
                    >
                      <Checkbox
                        checked={formData.marketing_goal.includes(option.value)}
                        onCheckedChange={() => handleGoalToggle(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketing_blocker">Co tě v marketingu nejvíc brzdí?</Label>
                <Textarea
                  id="marketing_blocker"
                  value={formData.marketing_blocker}
                  onChange={(e) => setFormData((prev) => ({ ...prev, marketing_blocker: e.target.value }))}
                  placeholder="Např. nemám čas, nevím co psát, chybí mi strategie..."
                  rows={2}
                />
              </div>
            </>
          )}

          {activeSection === "channels" && (
            <>
              <div className="space-y-2">
                <Label>Na jakých kanálech působíš?</Label>
                <p className="text-sm text-muted-foreground">Vyber všechny, kde jsi aktivní</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {channelOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.active_channels.includes(option.value)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleChannelToggle(option.value)}
                    >
                      <Checkbox
                        checked={formData.active_channels.includes(option.value)}
                        onCheckedChange={() => handleChannelToggle(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formData.active_channels.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="priority_channel">Který kanál je prioritní?</Label>
                  <Select
                    value={formData.priority_channel}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, priority_channel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyber hlavní kanál" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.active_channels.map((channel) => {
                        const option = channelOptions.find((c) => c.value === channel);
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
                <Label htmlFor="content_frequency">Jak často tvoříš obsah?</Label>
                <Select
                  value={formData.content_frequency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, content_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyber frekvenci" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {activeSection === "style" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="brand_keywords">Klíčová slova tvé značky</Label>
                <Textarea
                  id="brand_keywords"
                  value={formData.brand_keywords}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand_keywords: e.target.value }))}
                  placeholder="Např. autentický, profesionální, přátelský, inovativní..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspiration_brands">Inspirativní značky</Label>
                <Textarea
                  id="inspiration_brands"
                  value={formData.inspiration_brands}
                  onChange={(e) => setFormData((prev) => ({ ...prev, inspiration_brands: e.target.value }))}
                  placeholder="Značky, jejichž komunikací se inspiruješ..."
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Uložit změny
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
