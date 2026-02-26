import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Image, 
  Video, 
  ArrowRight,
  Headphones,
  FileStack,
  Clock,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/app/AppLayout";
import neobotIcon from "@/assets/neobot-icon.png";
import TextNeoBotWorkspace from "@/components/app/TextNeoBotWorkspace";
import ImageNeoBotWorkspace from "@/components/app/ImageNeoBotWorkspace";
import VideoNeoBotWorkspace from "@/components/app/VideoNeoBotWorkspace";

interface NeoBotRole {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  gradient: string;
  bgGlow: string;
}

const neobotRoles: NeoBotRole[] = [
  {
    id: "text",
    title: "Textový NeoBot",
    shortDesc: "Příspěvky, e-maily, texty na web",
    icon: FileText,
    gradient: "from-primary to-primary/70",
    bgGlow: "bg-primary/20"
  },
  {
    id: "image",
    title: "Obrázkový NeoBot",
    shortDesc: "Grafika, vizuály, bannery",
    icon: Image,
    gradient: "from-accent to-accent/70",
    bgGlow: "bg-accent/20"
  },
  {
    id: "video",
    title: "Video NeoBot",
    shortDesc: "Scénáře, Reels, Shorts",
    icon: Video,
    gradient: "from-primary via-accent to-primary",
    bgGlow: "bg-gradient-to-br from-primary/20 to-accent/20"
  },
  {
    id: "transform",
    title: "Úpravy textu",
    shortDesc: "Přeformulovat, zkrátit, přeložit",
    icon: Wand2,
    gradient: "from-accent via-primary to-accent",
    bgGlow: "bg-gradient-to-br from-accent/20 to-primary/20"
  }
];

export default function ContentCreationPage() {
  const { profile } = useOutletContext<{ profile: UserProfile | null }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // Check for workspace param from calendar navigation
  useEffect(() => {
    const workspace = searchParams.get("workspace");
    if (workspace) {
      // Map workspace param to role id
      const workspaceMap: Record<string, string> = {
        "text": "text",
        "image": "image",
        "video": "video",
        "transform": "transform"
      };
      const roleId = workspaceMap[workspace];
      if (roleId) {
        setActiveRole(roleId);
      }
    }
  }, [searchParams]);

  const handleRoleSelect = (roleId: string) => {
    // Navigate to workspace, preserving planId/itemId if present
    const params = new URLSearchParams();
    const planId = searchParams.get("planId");
    const itemId = searchParams.get("itemId");
    if (planId) params.append("planId", planId);
    if (itemId) params.append("itemId", itemId);
    const queryString = params.toString();
    
    navigate(`/app/tvorba?workspace=${roleId}${queryString ? '&' + queryString : ''}`);
  };

  const handleBackToRoles = () => {
    setActiveRole(null);
  };

  // Text NeoBot - dedicated workspace
  if (activeRole === "text") {
    return <TextNeoBotWorkspace profile={profile} onBack={handleBackToRoles} />;
  }

  // Image NeoBot - dedicated workspace
  if (activeRole === "image") {
    return <ImageNeoBotWorkspace profile={profile} onBack={handleBackToRoles} />;
  }

  // Video NeoBot - dedicated workspace
  if (activeRole === "video") {
    return <VideoNeoBotWorkspace profile={profile} onBack={handleBackToRoles} />;
  }

  // Transform - redirect to text workspace (user can select transform category)
  if (activeRole === "transform") {
    return <TextNeoBotWorkspace profile={profile} onBack={handleBackToRoles} />;
  }

  // Role selection view
  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <img src={neobotIcon} alt="NeoBot" className="w-12 h-12" />
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Tvorba obsahu
          </h1>
          <p className="text-muted-foreground">
            Vyber si NeoBota podle toho, co potřebuješ vytvořit
          </p>
        </div>
      </div>

      {/* NeoBot Role Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {neobotRoles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            className="group relative p-4 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all duration-300 text-left overflow-hidden"
          >
            {/* Background glow */}
            <div className={`absolute inset-0 ${role.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="relative flex flex-col h-full">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                <role.icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <h2 className="font-display text-base font-bold text-foreground mb-1">
                {role.title}
              </h2>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                {role.shortDesc}
              </p>
              
              {/* CTA */}
              <Button
                variant="outline"
                size="sm"
                className="mt-auto w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
              >
                Začít
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </button>
        ))}
      </div>

      {/* Info Section */}
      <div className="glass rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-foreground mb-3">Jak to funguje</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-primary font-bold">1</span>
            </div>
            <p className="text-muted-foreground">Vyber typ obsahu a platformu</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-primary font-bold">2</span>
            </div>
            <p className="text-muted-foreground">Popiš, o čem má obsah být</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-primary font-bold">3</span>
            </div>
            <p className="text-muted-foreground">NeoBot vytvoří finální výstup</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="glass rounded-xl p-6 border border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Brzy přidáme</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm">
            <Headphones className="w-4 h-4" />
            <span>Audio NeoBot</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm">
            <FileStack className="w-4 h-4" />
            <span>Dokumentový NeoBot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
