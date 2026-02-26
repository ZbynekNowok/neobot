import { 
  LayoutDashboard, 
  PenTool, 
  Target, 
  Calendar, 
  History, 
  Settings, 
  LogOut,
  Search,
  FileSearch,
  Send,
  Link2,
  Clock,
  Megaphone,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import neobotLogo from "@/assets/neobot-logo.png";
import neobotIcon from "@/assets/neobot-icon.png";

const mainMenuItems = [
  { title: "Firemní profil", url: "/app", icon: LayoutDashboard },
];

const contentMenuItems = [
  { title: "Strategie", url: "/app/strategie", icon: Target },
  { title: "Plánovač obsahu", url: "/app/plan", icon: Calendar },
  { title: "Tvorba obsahu", url: "/app/tvorba", icon: PenTool },
  
  { title: "Historie výstupů", url: "/app/historie", icon: History },
];

const seoMenuItems = [
  { title: "SEO Generator", url: "/app/seo/generator", icon: Search },
  { title: "SEO Audit", url: "/app/seo/audit", icon: FileSearch },
  { title: "SEO Historie", url: "/app/seo/historie", icon: Clock },
];

const publishMenuItems = [
  { title: "Publish Center", url: "/app/publish", icon: Send },
  { title: "Connections", url: "/app/publish/connections", icon: Link2 },
];

const adsMenuItems = [
  { title: "AI Ads Studio", url: "/app/ads", icon: Megaphone },
];

const settingsMenuItems = [
  { title: "Nastavení", url: "/app/nastaveni", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const renderMenuItem = (item: typeof mainMenuItems[0]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === "/app"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          activeClassName="bg-primary/10 text-primary font-medium"
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderGroup = (label: string, items: typeof mainMenuItems) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <div className="p-4 flex items-center justify-center">
        <img 
          src={collapsed ? neobotIcon : neobotLogo} 
          alt="NeoBot" 
          className={collapsed ? "h-10 w-10 object-contain" : "h-12 w-auto"}
        />
      </div>

      <SidebarContent>
        {/* Firemní profil (hlavní přehled) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {renderGroup("Obsah", contentMenuItems)}

        <SidebarSeparator />

        {renderGroup("SEO", seoMenuItems)}

        <SidebarSeparator />

        {renderGroup("Publish", publishMenuItems)}

        <SidebarSeparator />

        {renderGroup("Reklama", adsMenuItems)}

        <SidebarSeparator />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsMenuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Odhlásit se</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
