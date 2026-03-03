import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Funkce from "./pages/Funkce";
import Cenik from "./pages/Cenik";
import Navody from "./pages/Navody";
import Novinky from "./pages/Novinky";
import ONas from "./pages/ONas";
import Prihlasit from "./pages/Prihlasit";
import Start from "./pages/Start";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/app/AppLayout";
import DashboardPage from "./pages/app/DashboardPage";
import ContentCreationPage from "./pages/app/ContentCreationPage";
import StrategyPage from "./pages/app/StrategyPage";
import ContentPlanPage from "./pages/app/ContentPlanPage";
import HistoryPage from "./pages/app/HistoryPage";
import SettingsPage from "./pages/app/SettingsPage";
import SeoGeneratorPage from "./pages/app/SeoGeneratorPage";
import SeoAuditPage from "./pages/app/SeoAuditPage";
import SeoHistoryPage from "./pages/app/SeoHistoryPage";
import PublishCenterPage from "./pages/app/PublishCenterPage";
import ConnectionsPage from "./pages/app/ConnectionsPage";
import AdsStudioPage from "./pages/app/AdsStudioPage";
import CampaignsPage from "./pages/app/CampaignsPage";
import IntelligencePage from "./pages/app/IntelligencePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/funkce" element={<Funkce />} />
          <Route path="/cenik" element={<Cenik />} />
          <Route path="/navody" element={<Navody />} />
          <Route path="/novinky" element={<Novinky />} />
          <Route path="/o-nas" element={<ONas />} />
          <Route path="/prihlasit" element={<Prihlasit />} />
          <Route path="/start" element={<Start />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/admin" element={<Admin />} />
          {/* App routes with sidebar layout */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="strategie" element={<StrategyPage />} />
            <Route path="plan" element={<ContentPlanPage />} />
            <Route path="tvorba" element={<ContentCreationPage />} />
            <Route path="historie" element={<HistoryPage />} />
            <Route path="nastaveni" element={<SettingsPage />} />
            <Route path="kampane" element={<CampaignsPage />} />
            <Route path="inteligence" element={<IntelligencePage />} />
            <Route path="seo/generator" element={<SeoGeneratorPage />} />
            <Route path="seo/audit" element={<SeoAuditPage />} />
            <Route path="seo/historie" element={<SeoHistoryPage />} />
            <Route path="publish" element={<PublishCenterPage />} />
            <Route path="publish/connections" element={<ConnectionsPage />} />
            {/* Reklamní studio – původní route (all-in-one) kvůli zpětné kompatibilitě */}
            <Route path="ads" element={<AdsStudioPage view="all" />} />
            {/* Nové routy pro Ads Studio */}
            <Route path="ads-studio" element={<AdsStudioPage view="hub" />} />
            <Route path="ads-studio/generate" element={<AdsStudioPage view="generate" />} />
            <Route path="ads-studio/history" element={<AdsStudioPage view="history" />} />
            <Route path="ads-studio/video" element={<AdsStudioPage view="video" />} />
            <Route path="ads-studio/images" element={<AdsStudioPage view="images" />} />
            <Route path="ads-studio/product-scenes" element={<AdsStudioPage view="product-scenes" />} />
            <Route path="ads-studio/skore-reklamy" element={<AdsStudioPage view="score" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
