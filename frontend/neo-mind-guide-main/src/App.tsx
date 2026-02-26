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
            <Route path="seo/generator" element={<SeoGeneratorPage />} />
            <Route path="seo/audit" element={<SeoAuditPage />} />
            <Route path="seo/historie" element={<SeoHistoryPage />} />
            <Route path="publish" element={<PublishCenterPage />} />
            <Route path="publish/connections" element={<ConnectionsPage />} />
            <Route path="ads" element={<AdsStudioPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
