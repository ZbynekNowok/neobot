import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Loader2 } from "lucide-react";

export interface UserProfile {
  name: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
  business: string | null;
  content_type: string | null;
  platform: string | null;
  communication_style: string | null;
  goal: string | null;
  ideal_customer: string | null;
  marketing_blocker: string | null;
  marketing_goal: string[] | null;
  priority_channel: string | null;
  active_channels: string[] | null;
  business_stage: string | null;
  customer_problem: string | null;
  unique_value: string | null;
  content_frequency: string | null;
  content_struggle: string | null;
  brand_keywords: string | null;
  inspiration_brands: string | null;
  neobot_expectation: string | null;
}

export function AppLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, brand_name, brand_logo_url, business, content_type, platform, communication_style, goal, ideal_customer, marketing_blocker, marketing_goal, priority_channel, active_channels, business_stage, customer_problem, unique_value, content_frequency, content_struggle, brand_keywords, inspiration_brands, neobot_expectation, onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profileData) setProfile(profileData);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/prihlasit');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, brand_name, brand_logo_url, business, content_type, platform, communication_style, goal, ideal_customer, marketing_blocker, marketing_goal, priority_channel, active_channels, business_stage, customer_problem, unique_value, content_frequency, content_struggle, brand_keywords, inspiration_brands, neobot_expectation, onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileData && !profileData.onboarding_completed) {
        navigate('/onboarding');
        return;
      }

      if (profileData) {
        setProfile(profileData);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-[128px]" />
        </div>

        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-xs px-2 py-1 rounded-md bg-green-600/10 text-green-400 border border-green-600/20 font-medium">
              Production
            </span>
            {profile?.name && (
              <span className="text-sm text-muted-foreground">
                {profile.name}
              </span>
            )}
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet context={{ profile, refreshProfile }} />
          </main>

          {/* Footer */}
          <footer className="h-10 border-t border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4">
            <span className="text-xs text-muted-foreground">
              NeoBot v1.0 — AI Marketing Engine
            </span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
