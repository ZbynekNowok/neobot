import { useState, useEffect } from "react";
import { z } from "zod";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Sparkles, Zap, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Prihlasit = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        // Defer profile fetch / redirects to avoid auth callback deadlocks
        setTimeout(() => {
          void handlePostAuthRedirect(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void handlePostAuthRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePostAuthRedirect = async (userId: string) => {
    // Ensure profile exists (avoids onboarding/update failures)
    await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      navigate("/app");
    } else {
      navigate("/onboarding");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const emailResult = z.string().trim().email().safeParse(email);
    const passwordResult = (isLoginMode
      ? z.string().min(1)
      : z.string().min(8)
    ).safeParse(password);

    if (!emailResult.success || !passwordResult.success) {
      toast({
        variant: "destructive",
        title: "Zkontroluj údaje",
        description: !emailResult.success
          ? "Zadej platný e-mail."
          : "Heslo musí mít alespoň 8 znaků.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        // Login existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password: passwordResult.data,
        });

        if (error) {
          toast({
            variant: "destructive",
            title: "Chyba přihlášení",
            description:
              error.message === "Invalid login credentials"
                ? "Nesprávný e-mail nebo heslo"
                : error.message,
          });
          return;
        }

        toast({
          title: "Přihlášení úspěšné!",
          description: "Vítej zpět!",
        });

        const userId = data.user?.id;
        if (userId) {
          await handlePostAuthRedirect(userId);
        }
      } else {
        // Register new user
        const { data, error } = await supabase.auth.signUp({
          email: emailResult.data,
          password: passwordResult.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name || undefined,
            },
          },
        });

        if (error) {
          toast({
            variant: "destructive",
            title: "Chyba registrace",
            description:
              error.message === "User already registered"
                ? "Tento e-mail je již zaregistrován"
                : error.message,
          });
          return;
        }

        // Ensure profile exists (doesn't overwrite existing)
        if (data.user?.id) {
          await supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, name: name || null },
              { onConflict: "id", ignoreDuplicates: true }
            );
          await handlePostAuthRedirect(data.user.id);
        }

        toast({
          title: "Registrace úspěšná!",
          description: "Přesměrováváme tě do onboardingu...",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Něco se pokazilo",
        description: "Zkus to prosím znovu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      text: "Vytvoř svůj první marketingový obsah",
    },
    {
      icon: Target,
      text: "Naplánuj strategii na míru tvému byznysu",
    },
    {
      icon: Zap,
      text: "Ušetři hodiny práce s AI asistentem",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-glow" />
      </div>

      <main className="relative pt-24 pb-16 min-h-screen flex items-center">
        <div className="container px-4">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-up">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                <span className="text-gradient">
                  {isLoginMode ? "Vítej zpět" : "Tvůj AI marketingový"}
                </span>
                <br />
                <span className="text-foreground">
                  {isLoginMode ? "v NeoBotu" : "partner je tu"}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                {isLoginMode 
                  ? "Přihlas se ke svému účtu" 
                  : "Během 5 minut budeš mít první výsledky"}
              </p>
            </div>

            {/* Benefits - only show in registration mode */}
            {!isLoginMode && (
              <div className="space-y-3 mb-8 animate-fade-up-delay flex flex-col items-center">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-foreground/90 w-full max-w-xs"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <benefit.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">{benefit.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Registration/Login Form */}
            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-up-delay-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLoginMode && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground/80">
                      Jméno <span className="text-muted-foreground text-sm">(volitelné)</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jak ti máme říkat?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background/50 border-border/50 focus:border-primary/50 h-12"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tvuj@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border/50 focus:border-primary/50 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80">
                    Heslo
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLoginMode ? "Tvoje heslo" : "Minimálně 8 znaků"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLoginMode ? 1 : 8}
                    className="bg-background/50 border-border/50 focus:border-primary/50 h-12"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {isLoginMode ? "Přihlašuji..." : "Registruji..."}
                    </span>
                  ) : (
                    isLoginMode ? "Přihlásit se" : "Začít zdarma"
                  )}
                </Button>
              </form>

              {/* Trust text - only show in registration mode */}
              {!isLoginMode && (
                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Bez platební karty. Zrušíš kdykoliv.</span>
                  </div>
                </div>
              )}

              {/* Toggle login/register */}
              <div className="mt-4 text-center">
                <p className="text-muted-foreground text-sm">
                  {isLoginMode ? "Nemáš ještě účet?" : "Už máš účet?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {isLoginMode ? "Zaregistruj se" : "Přihlas se"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Prihlasit;
