import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import neobotIcon from "@/assets/neobot-icon.png";
import { syncWorkspaceProfileFromOnboarding } from "@/lib/neobot";

interface OnboardingData {
  brandName: string;
  brandLogoFile: File | null;
  brandLogoPreview: string | null;
  business: string;
  businessStage: string | null;
  idealCustomer: string;
  customerProblem: string | null;
  customerProblemOther: string;
  uniqueValue: string;
  marketingGoal: string[];
  marketingBlocker: string;
  activeChannels: string[];
  priorityChannel: string | null;
  contentFrequency: string | null;
  contentStruggle: string | null;
  brandKeywords: string;
  inspirationBrands: string;
  neobotExpectation: string | null;
}

const TOTAL_STEPS = 16;

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<OnboardingData>({
    brandName: "",
    brandLogoFile: null,
    brandLogoPreview: null,
    business: "",
    businessStage: null,
    idealCustomer: "",
    customerProblem: null,
    customerProblemOther: "",
    uniqueValue: "",
    marketingGoal: [],
    marketingBlocker: "",
    activeChannels: [],
    priorityChannel: null,
    contentFrequency: null,
    contentStruggle: null,
    brandKeywords: "",
    inspirationBrands: "",
    neobotExpectation: null,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/prihlasit');
      }
    };
    checkAuth();
  }, [navigate]);

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const nextStep = () => {
    setStep(step + 1);
  };

  const handleSingleSelect = (field: keyof OnboardingData, value: string) => {
    setData({ ...data, [field]: value });
    nextStep();
  };

  const toggleMultiSelect = (field: 'marketingGoal' | 'activeChannels', value: string) => {
    const current = data[field];
    if (current.includes(value)) {
      setData({ ...data, [field]: current.filter(v => v !== value) });
    } else {
      setData({ ...data, [field]: [...current, value] });
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setData({ ...data, brandLogoFile: file, brandLogoPreview: previewUrl });
    }
  };

  const removeLogo = () => {
    if (data.brandLogoPreview) {
      URL.revokeObjectURL(data.brandLogoPreview);
    }
    setData({ ...data, brandLogoFile: null, brandLogoPreview: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFinalStep = async () => {
    setIsTransitioning(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      let brandLogoUrl: string | null = null;

      // Upload logo if provided
      if (data.brandLogoFile) {
        setIsUploadingLogo(true);
        const fileExt = data.brandLogoFile.name.split('.').pop();
        const fileName = `${session.user.id}/brand-logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('brand-logos')
          .upload(fileName, data.brandLogoFile, { upsert: true });

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          // Continue without logo - it's optional
        } else {
          const { data: urlData } = supabase.storage
            .from('brand-logos')
            .getPublicUrl(fileName);
          brandLogoUrl = urlData.publicUrl;
        }
        setIsUploadingLogo(false);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          brand_name: data.brandName,
          brand_logo_url: brandLogoUrl,
          business: data.business,
          business_stage: data.businessStage,
          ideal_customer: data.idealCustomer,
          customer_problem: data.customerProblem,
          customer_problem_other: data.customerProblemOther,
          unique_value: data.uniqueValue,
          marketing_goal: data.marketingGoal,
          marketing_blocker: data.marketingBlocker,
          active_channels: data.activeChannels,
          priority_channel: data.priorityChannel,
          content_frequency: data.contentFrequency,
          content_struggle: data.contentStruggle,
          brand_keywords: data.brandKeywords,
          inspiration_brands: data.inspirationBrands,
          neobot_expectation: data.neobotExpectation,
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          variant: "destructive",
          title: "Chyba",
          description: "Nepodařilo se uložit data.",
        });
        setIsTransitioning(false);
        return;
      }

      // Sync firemní profil (včetně loga) to backend so all content (text, design) is tailored to this client
      syncWorkspaceProfileFromOnboarding(data, brandLogoUrl).catch((err) => {
        console.warn("Sync workspace profile:", err);
      });
    }

    setTimeout(() => {
      navigate('/app/tvorba', { state: { generateFirst: true } });
    }, 2000);
  };

  const businessStageOptions = [
    { value: "starting", label: "Začínám" },
    { value: "selling-no-system", label: "Už prodávám, ale bez systému" },
    { value: "growing", label: "Fungující byznys, chci růst" },
    { value: "scaling", label: "Škáluji / deleguji marketing" },
  ];

  const customerProblemOptions = [
    { value: "dont-know-what", label: "Neví, co koupit" },
    { value: "hesitating", label: "Hledá řešení, ale váhá" },
    { value: "better-alternative", label: "Chce lepší alternativu" },
    { value: "price-trust", label: "Řeší cenu nebo důvěru" },
    { value: "other", label: "Jiný problém" },
  ];

  const marketingGoalOptions = [
    { value: "new-customers", label: "Získat nové zákazníky" },
    { value: "increase-sales", label: "Zvýšit prodeje" },
    { value: "build-brand", label: "Vybudovat značku" },
    { value: "clarify-strategy", label: "Ujasnit si strategii" },
    { value: "save-time", label: "Šetřit čas" },
    { value: "combination", label: "Kombinace více cílů" },
  ];

  const channelOptions = [
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" },
    { value: "web", label: "Web / blog" },
    { value: "email", label: "E-mail / newsletter" },
    { value: "ads", label: "Placená reklama" },
    { value: "none", label: "Zatím nikde" },
  ];

  const frequencyOptions = [
    { value: "daily", label: "Denně" },
    { value: "few-times-week", label: "Několikrát týdně" },
    { value: "weekly", label: "Jednou týdně" },
    { value: "rarely", label: "Občas / nepravidelně" },
    { value: "never", label: "Zatím nepublikuji" },
  ];

  const contentStruggleOptions = [
    { value: "no-ideas", label: "Nevím, co psát" },
    { value: "no-time", label: "Nemám čas" },
    { value: "inconsistent", label: "Nedržím pravidelnost" },
    { value: "no-results", label: "Obsah nefunguje" },
    { value: "no-style", label: "Neumím napsat dobře" },
    { value: "all", label: "Kombinace všeho" },
  ];

  const neobotExpectationOptions = [
    { value: "content-creation", label: "Pomoc s tvorbou obsahu" },
    { value: "strategy", label: "Nastavení strategie" },
    { value: "planning", label: "Plánování a pravidelnost" },
    { value: "brand-voice", label: "Sjednocení tónu značky" },
    { value: "all", label: "Všechno výše" },
  ];

  // Transition screen
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-glow" />
        </div>

        <div className="relative text-center animate-fade-up">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Připravuji tvůj profil
          </h1>
          <p className="text-muted-foreground text-lg">
            Díky za tvoje odpovědi – teď už tě znám mnohem líp…
          </p>
        </div>
      </div>
    );
  }

  const renderTextStep = (
    title: string,
    subtitle: string,
    field: keyof OnboardingData,
    placeholder: string,
    isTextarea: boolean = false,
    optional: boolean = false
  ) => (
    <>
      <div className="text-center mb-8 animate-fade-up">
        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-base">
            {subtitle}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay">
        {isTextarea ? (
          <Textarea
            placeholder={placeholder}
            value={data[field] as string}
            onChange={(e) => setData({ ...data, [field]: e.target.value })}
            className="bg-background/50 border-border/50 focus:border-primary/50 text-base mb-6 min-h-[120px]"
          />
        ) : (
          <Input
            type="text"
            placeholder={placeholder}
            value={data[field] as string}
            onChange={(e) => setData({ ...data, [field]: e.target.value })}
            className="bg-background/50 border-border/50 focus:border-primary/50 h-12 text-base mb-6"
          />
        )}

        <Button
          onClick={nextStep}
          disabled={!optional && !(data[field] as string).trim()}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          Pokračovat
        </Button>
      </div>
    </>
  );

  const renderSingleSelectStep = (
    title: string,
    subtitle: string,
    field: keyof OnboardingData,
    options: { value: string; label: string }[]
  ) => (
    <>
      <div className="text-center mb-8 animate-fade-up">
        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-base">
            {subtitle}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay">
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <Button
              key={option.value}
              onClick={() => handleSingleSelect(field, option.value)}
              variant="outline"
              className="w-full h-auto min-h-[52px] py-3 text-base font-medium justify-start gap-4 bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all text-left whitespace-normal"
            >
              <img src={neobotIcon} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </>
  );

  const renderMultiSelectStep = (
    title: string,
    subtitle: string,
    field: 'marketingGoal' | 'activeChannels',
    options: { value: string; label: string }[]
  ) => (
    <>
      <div className="text-center mb-8 animate-fade-up">
        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-base">
            {subtitle}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay">
        <div className="flex flex-col gap-3 mb-6">
          {options.map((option) => {
            const isSelected = data[field].includes(option.value);
            return (
              <Button
                key={option.value}
                onClick={() => toggleMultiSelect(field, option.value)}
                variant="outline"
                className={`w-full h-auto min-h-[52px] py-3 text-base font-medium justify-start gap-4 transition-all text-left whitespace-normal ${
                  isSelected 
                    ? "bg-primary/20 border-primary/50 text-foreground" 
                    : "bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/10"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                }`}>
                  {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                </div>
                <span>{option.label}</span>
              </Button>
            );
          })}
        </div>

        <Button
          onClick={nextStep}
          disabled={data[field].length === 0}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          Pokračovat
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-glow" />
      </div>

      <div className="relative w-full max-w-lg px-4">
        {/* Back button */}
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="absolute -top-2 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/50 bg-primary/5 text-primary font-medium text-sm transition-all duration-300 hover:bg-primary/15 hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)] cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zpět</span>
          </button>
        )}

        <div className="flex justify-center mb-6 animate-fade-up pt-8">
          <img src={neobotIcon} alt="NeoBot" className="w-16 h-16 object-contain" />
        </div>

        {/* Step 1: Business description */}
        {step === 1 && (
          <>
            <div className="text-center mb-8 animate-fade-up">
              <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
                Ahoj, jsem NeoBot
              </h1>
              <p className="text-muted-foreground text-base">
                Pojďme se lépe poznat – odpověz mi na pár otázek, abych ti mohl opravdu pomoct.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay">
              <label className="block text-foreground font-medium mb-4 text-center text-lg">
                S čím podnikáš nebo co tvoříš?
              </label>
              
              <Textarea
                placeholder="E-shop s ručně vyráběnými produkty, osobní značka na Instagramu, lokální kavárna…"
                value={data.business}
                onChange={(e) => setData({ ...data, business: e.target.value })}
                className="bg-background/50 border-border/50 focus:border-primary/50 text-base mb-6 min-h-[100px]"
              />

              <Button
                onClick={nextStep}
                disabled={!data.business.trim()}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                Pokračovat
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Business stage */}
        {step === 2 && renderSingleSelectStep(
          "V jaké fázi se tvé podnikání aktuálně nachází?",
          "",
          "businessStage",
          businessStageOptions
        )}

        {/* Step 3: Ideal customer */}
        {step === 3 && renderTextStep(
          "Kdo je tvůj ideální zákazník?",
          "Popiš mi ho – věk, pohlaví, B2B nebo B2C, lokální nebo online…",
          "idealCustomer",
          "Ženy 25–45 let, které hledají originální dárky online…",
          true
        )}

        {/* Step 4: Customer problem */}
        {step === 4 && renderSingleSelectStep(
          "Jaký hlavní problém tvůj zákazník řeší?",
          "",
          "customerProblem",
          customerProblemOptions
        )}

        {/* Step 5: Customer problem other (if selected) */}
        {step === 5 && data.customerProblem === "other" && renderTextStep(
          "Jaký jiný problém tvůj zákazník řeší?",
          "",
          "customerProblemOther",
          "Popiš mi to vlastními slovy…",
          true
        )}

        {/* Step 5 or 6: Unique value */}
        {step === 5 && data.customerProblem !== "other" && renderTextStep(
          "Proč by si měl zákazník vybrat právě tebe?",
          "I neurčitá odpověď je v pořádku – můžeme na tom zapracovat.",
          "uniqueValue",
          "Ruční výroba, osobní přístup, rychlé dodání…",
          true,
          true
        )}

        {step === 6 && data.customerProblem === "other" && renderTextStep(
          "Proč by si měl zákazník vybrat právě tebe?",
          "I neurčitá odpověď je v pořádku – můžeme na tom zapracovat.",
          "uniqueValue",
          "Ruční výroba, osobní přístup, rychlé dodání…",
          true,
          true
        )}

        {/* Step 6 or 7: Marketing goal */}
        {step === (data.customerProblem === "other" ? 7 : 6) && renderMultiSelectStep(
          "Jaký je tvůj hlavní cíl v marketingu právě teď?",
          "Můžeš vybrat více možností.",
          "marketingGoal",
          marketingGoalOptions
        )}

        {/* Step 7 or 8: Marketing blocker */}
        {step === (data.customerProblem === "other" ? 8 : 7) && renderTextStep(
          "Co ti dnes v marketingu nejvíc nefunguje nebo tě brzdí?",
          "",
          "marketingBlocker",
          "Nemám čas, nevím co psát, nevidím výsledky…",
          true
        )}

        {/* Step 8 or 9: Active channels */}
        {step === (data.customerProblem === "other" ? 9 : 8) && renderMultiSelectStep(
          "Na jakých kanálech aktuálně působíš?",
          "Označ všechny, které používáš.",
          "activeChannels",
          channelOptions
        )}

        {/* Step 9 or 10: Priority channel */}
        {step === (data.customerProblem === "other" ? 10 : 9) && renderSingleSelectStep(
          "Který kanál je pro tebe teď nejdůležitější?",
          "Na který se chceš nejvíc zaměřit?",
          "priorityChannel",
          channelOptions.filter(c => c.value !== "none")
        )}

        {/* Step 10 or 11: Content frequency */}
        {step === (data.customerProblem === "other" ? 11 : 10) && renderSingleSelectStep(
          "Jak často teď publikuješ obsah?",
          "",
          "contentFrequency",
          frequencyOptions
        )}

        {/* Step 11 or 12: Content struggle */}
        {step === (data.customerProblem === "other" ? 12 : 11) && renderSingleSelectStep(
          "Co ti dělá v tvorbě obsahu největší problém?",
          "",
          "contentStruggle",
          contentStruggleOptions
        )}

        {/* Step 12 or 13: Brand keywords */}
        {step === (data.customerProblem === "other" ? 13 : 12) && renderTextStep(
          "Jak by měla tvá značka působit?",
          "Napiš 3–5 slov, která vystihují tón tvé komunikace.",
          "brandKeywords",
          "Přátelská, profesionální, hravá, důvěryhodná…",
          false,
          true
        )}

        {/* Step 13 or 14: Inspiration brands */}
        {step === (data.customerProblem === "other" ? 14 : 13) && renderTextStep(
          "Jsou značky nebo účty, které tě inspirují?",
          "Pomůže mi to pochopit tvůj styl.",
          "inspirationBrands",
          "IKEA, Notino, Rohlík, nebo konkrétní Instagram účty…",
          false,
          true
        )}

        {/* Step 14 or 15: NeoBot expectation */}
        {step === (data.customerProblem === "other" ? 15 : 14) && (
          <>
            <div className="text-center mb-8 animate-fade-up">
              <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
                Poslední otázka!
              </h1>
              <p className="text-muted-foreground text-base">
                Co od NeoBota očekáváš nejvíc?
              </p>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay">
              <div className="flex flex-col gap-3">
                {neobotExpectationOptions.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => {
                      setData({ ...data, neobotExpectation: option.value });
                      handleFinalStep();
                    }}
                    variant="outline"
                    className="w-full h-auto min-h-[52px] py-3 text-base font-medium justify-start gap-4 bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all text-left whitespace-normal"
                  >
                    <img src={neobotIcon} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    <span>{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step indicator - simplified progress bar */}
        <div className="mt-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Krok {step} z {data.customerProblem === "other" ? TOTAL_STEPS : TOTAL_STEPS - 1}</span>
            <span>{Math.round((step / (data.customerProblem === "other" ? TOTAL_STEPS : TOTAL_STEPS - 1)) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${(step / (data.customerProblem === "other" ? TOTAL_STEPS : TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
